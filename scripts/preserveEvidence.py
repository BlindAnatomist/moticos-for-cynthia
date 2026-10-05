#!/usr/bin/env python3
"""Preserve complete browser evidence in bounded, independently uploadable parts.

Each upload should contain ONE part-NNN.bin plus manifest.json, never the source
archive or the entire parts directory. Concatenating the parts in manifest order
recreates the exact archive. This program does not upload or delete evidence.
"""

import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import sys
import tarfile
import tempfile


CHUNK_BYTES = 200 * 1024 * 1024
MAX_PARTS = 16
UPLOAD_LIMIT_BYTES = 250 * 1024 * 1024
UPLOAD_OVERHEAD_BYTES = 1024 * 1024
READ_BYTES = 1024 * 1024
SAFE_DIRECTORIES = (
    "test-results", "playwright-report", "preflight-results", "preflight-report",
)


class EvidenceError(Exception):
    """An input or publication gate failed; there is no successful package."""


def _within(path, parent):
    return path == parent or parent in path.parents


def _signature(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def _open_regular(path):
    """Do not follow a final-component symlink, even if it changes after lstat."""
    if not stat.S_ISREG(path.lstat().st_mode):
        raise EvidenceError(f"Not a regular file (symlinks are forbidden): {path}")
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    stream = os.fdopen(fd, "rb")
    if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
        stream.close()
        raise EvidenceError(f"Not a regular file: {path}")
    return stream


def _hash_stream(stream):
    digest = hashlib.sha256()
    size = 0
    while True:
        block = stream.read(READ_BYTES)
        if not block:
            return size, digest.hexdigest()
        digest.update(block)
        size += len(block)


def _atomic_outputs(path, part_count):
    """Replace atomically, retaining unrelated step outputs and failing closed.

    All reserved flags are written on both failure initialization and success, so
    a previous invocation's true flags cannot authorize stale artifact uploads.
    GitHub reads this command file by path after the step completes.
    """
    if path is None:
        return
    previous = b""
    mode = 0o600
    if path.exists() or path.is_symlink():
        with _open_regular(path) as stream:
            previous = stream.read()
            mode = stat.S_IMODE(os.fstat(stream.fileno()).st_mode)
    if previous and not previous.endswith(b"\n"):
        previous += b"\n"
    fields = "".join(
        f"part_{index:03d}={'true' if index < part_count else 'false'}\n"
        for index in range(MAX_PARTS)
    ) + f"part_count={part_count}\n"
    fd, temporary_name = tempfile.mkstemp(prefix=".evidence-outputs-", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as stream:
            os.fchmod(stream.fileno(), mode)
            stream.write(previous)
            stream.write(fields.encode("ascii"))
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _initialize_outputs(args):
    """Reset stale flags before path checks, unless the reset could damage input.

    An unsafe/unwritable output destination cannot safely be reset. Workflows must
    additionally require this step's outcome == 'success' before uploading.
    """
    if not args.github_output:
        return None
    outputs = Path(args.github_output).absolute()
    if outputs.is_symlink():
        raise EvidenceError("GITHUB_OUTPUT must not be a symlink")
    outputs = outputs.resolve()
    archive, out = Path(args.archive).resolve(), Path(args.out).resolve()
    if outputs == archive or _within(outputs, out):
        raise EvidenceError("GITHUB_OUTPUT must be outside the archive and parts")
    if args.mode == "pack":
        root = Path(args.root).resolve()
        for name in SAFE_DIRECTORIES:
            if _within(outputs, (root / name).resolve()):
                raise EvidenceError("Generated files must be outside all included source trees")
    _atomic_outputs(outputs, 0)
    return outputs


def _checked_locations(args):
    archive = Path(args.archive).absolute()
    out = Path(args.out).absolute()
    if archive.is_symlink() or out.is_symlink():
        raise EvidenceError("Archive and output paths must not be symlinks")
    archive = archive.resolve()
    out = out.resolve()
    if _within(archive, out):
        raise EvidenceError("Keep the source archive outside the parts directory")
    if not archive.parent.is_dir() or not out.parent.is_dir():
        raise EvidenceError("Archive and parts parent directories must already exist")
    return archive, out


def _checked_source_layout(root, includes, archive, out, outputs):
    if not includes or len(includes) != len(set(includes)):
        raise EvidenceError("Specify at least one --include, without duplicates")
    if any(name not in SAFE_DIRECTORIES for name in includes):
        raise EvidenceError("--include must name an exact allowlisted evidence directory")
    if root.is_symlink() or not root.is_dir():
        raise EvidenceError("--root must be a real directory, not a symlink")
    root = root.resolve()
    for name in includes:
        directory = root / name
        for generated in (archive, out, outputs):
            if generated is not None and _within(generated, directory):
                raise EvidenceError("Generated files must be outside all included source trees")
    return root


def _source_members(root, includes):
    members, missing = [], []

    def visit(directory):
        # Inspect only requested evidence trees. Never follow directory symlinks.
        with os.scandir(directory) as entries:
            entries = sorted(entries, key=lambda entry: entry.name)
        for entry in entries:
            path = Path(entry.path)
            info = entry.stat(follow_symlinks=False)
            if stat.S_ISLNK(info.st_mode):
                raise EvidenceError(f"Symlinks are forbidden in evidence: {path}")
            if stat.S_ISDIR(info.st_mode):
                visit(path)
            elif stat.S_ISREG(info.st_mode):
                relative = path.relative_to(root).as_posix()
                members.append((relative, path, _signature(info)))
            else:
                raise EvidenceError(f"Non-regular evidence entry is forbidden: {path}")

    for name in sorted(includes):
        directory = root / name
        if directory.is_symlink():
            raise EvidenceError(f"Symlinks are forbidden in evidence: {directory}")
        if not directory.exists():
            missing.append(name)
        elif not directory.is_dir():
            raise EvidenceError(f"Included evidence path is not a directory: {directory}")
        else:
            visit(directory)
    if not members:
        raise EvidenceError("No regular evidence files found in the requested directories")
    return sorted(members), missing


class _HashingReader:
    def __init__(self, stream):
        self.stream = stream
        self.digest = hashlib.sha256()
        self.size = 0

    def read(self, size=-1):
        block = self.stream.read(size)
        self.digest.update(block)
        self.size += len(block)
        return block


def _make_archive(temporary, archive, root, members):
    gzip = archive.name.endswith((".tar.gz", ".tgz"))
    if not gzip and not archive.name.endswith(".tar"):
        raise EvidenceError("Pack archive must end in .tar, .tar.gz, or .tgz")
    hashes = []
    options = {"compresslevel": 1} if gzip else {}
    with tarfile.open(temporary, "w:gz" if gzip else "w", **options) as bundle:
        for relative, path, expected_signature in members:
            # Recheck ancestors before opening; do not follow replaced directories.
            for parent in path.parents:
                if parent == root:
                    break
                if parent.is_symlink() or not parent.is_dir():
                    raise EvidenceError(f"Source directory changed while packing: {parent}")
            with _open_regular(path) as stream:
                info = os.fstat(stream.fileno())
                if _signature(info) != expected_signature:
                    raise EvidenceError(f"Source file changed before packing: {path}")
                header = tarfile.TarInfo(relative)
                header.size = info.st_size
                header.mode = stat.S_IMODE(info.st_mode)
                header.mtime = info.st_mtime
                header.uid, header.gid = info.st_uid, info.st_gid
                reader = _HashingReader(stream)
                bundle.addfile(header, reader)
                if (reader.size != info.st_size
                        or _signature(os.fstat(stream.fileno())) != expected_signature):
                    raise EvidenceError(f"Source file changed while packing: {path}")
                hashes.append({"path": relative, "bytes": reader.size,
                               "sha256": reader.digest.hexdigest()})
    return hashes, "tar.gz" if gzip else "tar"


def _split_verified(stream, stage, size, sha256, chunk_bytes, max_parts):
    if size == 0:
        raise EvidenceError("The source archive is empty")
    count = (size + chunk_bytes - 1) // chunk_bytes
    if count > max_parts:
        raise EvidenceError(f"Archive needs {count} parts; limit is {max_parts}")
    stream.seek(0)
    parts, reconstructed_hash = [], hashlib.sha256()
    remaining = size
    for index in range(count):
        name = f"part-{index:03d}.bin"
        part_size = min(chunk_bytes, remaining)
        part_hash = hashlib.sha256()
        left = part_size
        with (stage / name).open("xb") as destination:
            while left:
                block = stream.read(min(READ_BYTES, left))
                if not block:
                    raise EvidenceError("Archive became shorter while splitting")
                destination.write(block)
                part_hash.update(block)
                reconstructed_hash.update(block)
                left -= len(block)
        parts.append({"filename": name, "bytes": part_size,
                      "sha256": part_hash.hexdigest()})
        remaining -= part_size
    if stream.read(1) or reconstructed_hash.hexdigest() != sha256:
        raise EvidenceError("Archive changed while splitting")
    return parts


def preserve(args):
    outputs = _initialize_outputs(args)
    archive, out = _checked_locations(args)
    if args.mode == "pack":
        root = _checked_source_layout(Path(args.root), args.include, archive, out, outputs)
    if out.exists() and (not out.is_dir() or any(out.iterdir())):
        raise EvidenceError("Parts output must be absent or an empty directory")
    if not 1 <= args.chunk_bytes <= CHUNK_BYTES:
        raise EvidenceError(f"--chunk-bytes must be between 1 and {CHUNK_BYTES}")
    if not 1 <= args.max_parts <= MAX_PARTS:
        raise EvidenceError(f"--max-parts must be between 1 and {MAX_PARTS}")
    if args.mode == "split":
        if args.expected_bytes <= 0:
            raise EvidenceError("--expected-bytes must be positive")
        if not re.fullmatch(r"[0-9a-fA-F]{64}", args.expected_sha256):
            raise EvidenceError("--expected-sha256 must contain exactly 64 hexadecimal digits")
    elif archive.exists():
        raise EvidenceError("Pack archive already exists; use a fresh archive path")

    stage = None
    temporary_archive = None
    published = False
    try:
        manifest = {"schema_version": 1, "mode": args.mode,
                    "chunk_bytes": args.chunk_bytes, "max_parts": args.max_parts}
        source = archive
        if args.mode == "pack":
            members, missing = _source_members(root, args.include)
            fd, filename = tempfile.mkstemp(prefix=".evidence-archive-", dir=archive.parent)
            os.close(fd)
            temporary_archive = Path(filename)
            hashes, archive_format = _make_archive(temporary_archive, archive, root, members)
            manifest.update(source_members=hashes, included_directories=sorted(args.include),
                            missing_directories=missing, archive_format=archive_format)
            source = temporary_archive

        with _open_regular(source) as stream:
            before = _signature(os.fstat(stream.fileno()))
            size, sha256 = _hash_stream(stream)
            if _signature(os.fstat(stream.fileno())) != before:
                raise EvidenceError("Archive changed during verification")
            if args.mode == "split":
                if size != args.expected_bytes:
                    raise EvidenceError(f"Archive size mismatch: expected {args.expected_bytes}, got {size}")
                if sha256 != args.expected_sha256.lower():
                    raise EvidenceError(f"Archive SHA-256 mismatch: got {sha256}")
            # No parts are written until the entire input archive has been verified.
            stage = Path(tempfile.mkdtemp(prefix=".evidence-parts-", dir=out.parent))
            parts = _split_verified(stream, stage, size, sha256, args.chunk_bytes, args.max_parts)
            if _signature(os.fstat(stream.fileno())) != before:
                raise EvidenceError("Archive changed while splitting")
        manifest.update(archive={"filename": archive.name, "bytes": size, "sha256": sha256},
                        parts=parts, part_count=len(parts))
        encoded = (json.dumps(manifest, indent=2, ensure_ascii=True) + "\n").encode("utf-8")
        if max(part["bytes"] for part in parts) + len(encoded) + UPLOAD_OVERHEAD_BYTES >= UPLOAD_LIMIT_BYTES:
            raise EvidenceError("A part plus its manifest is too large for the upload limit")
        (stage / "manifest.json").write_bytes(encoded)
        if temporary_archive is not None:
            os.replace(temporary_archive, archive)
            temporary_archive = None
        # Rename publishes the manifest and all parts together, never partial success.
        os.replace(stage, out)
        stage = None
        published = True
        _atomic_outputs(outputs, len(parts))
        return manifest
    except BaseException:
        if published:
            shutil.rmtree(out)
            with contextlib.suppress(OSError):
                _atomic_outputs(outputs, 0)
        raise
    finally:
        if stage is not None:
            shutil.rmtree(stage)
        if temporary_archive is not None:
            temporary_archive.unlink(missing_ok=True)


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    modes = result.add_subparsers(dest="mode", required=True)
    for mode in ("split", "pack"):
        command = modes.add_parser(mode)
        command.add_argument("--archive", required=True)
        command.add_argument("--out", required=True)
        command.add_argument("--github-output", help="Optional GitHub step output command file")
        command.add_argument("--chunk-bytes", type=int, default=CHUNK_BYTES,
                             help="Test override; cannot exceed the 200 MiB production limit")
        command.add_argument("--max-parts", type=int, default=MAX_PARTS,
                             help="Optional lower limit; cannot exceed 16")
        if mode == "split":
            command.add_argument("--expected-bytes", required=True, type=int)
            command.add_argument("--expected-sha256", required=True)
        else:
            command.add_argument("--root", default=".")
            command.add_argument("--include", action="append", required=True,
                                 help="Repeat for each explicit allowlisted evidence directory")
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        manifest = preserve(args)
    except (EvidenceError, OSError, tarfile.TarError) as error:
        print(f"Evidence preservation failed: {error}", file=sys.stderr)
        return 1
    print(f"Preserved {manifest['archive']['bytes']} bytes in {manifest['part_count']} parts; "
          f"SHA-256 {manifest['archive']['sha256']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
