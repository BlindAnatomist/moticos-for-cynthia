#!/usr/bin/env python3
"""Verify ordered chunks and every raw tar member before restoring evidence."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import tarfile
import tempfile
import sys

sha = lambda data: hashlib.sha256(data).hexdigest()

def restore(parts, output):
    parts, output = Path(parts), Path(output)
    assert not parts.is_symlink() and parts.is_dir()
    assert not output.exists(), "Restore destination must be new"
    manifest = json.loads((parts / "manifest.json").read_text())
    assert manifest["schema_version"] == 1 and manifest["archive_format"] == "tar.gz"
    assert manifest["part_count"] == len(manifest["parts"]) and 1 <= manifest["part_count"] <= 2
    assert 0 < manifest["archive"]["bytes"] <= 98 * 1024 * 1024
    with tempfile.TemporaryDirectory(prefix="moticos-evidence-restore-") as temp:
        archive = Path(temp) / "complete.tar.gz"
        digest, count = hashlib.sha256(), 0
        with archive.open("wb") as destination:
            for index, record in enumerate(manifest["parts"]):
                assert record["filename"] == f"part-{index:03d}.bin"
                part = parts / record["filename"]
                assert not part.is_symlink() and part.is_file()
                data = part.read_bytes()
                assert len(data) == record["bytes"] and sha(data) == record["sha256"]
                destination.write(data); digest.update(data); count += len(data)
        assert count == manifest["archive"]["bytes"] and digest.hexdigest() == manifest["archive"]["sha256"]
        expected = {record["path"]: record for record in manifest["source_members"]}
        assert len(expected) == len(manifest["source_members"])
        stage = Path(temp) / "restored"
        stage.mkdir()
        with tarfile.open(archive, "r:gz") as bundle:
            seen = set()
            for member in bundle:
                name = PurePosixPath(member.name)
                assert member.isfile() and not name.is_absolute() and ".." not in name.parts
                assert str(name) == member.name, "Noncanonical archive path"
                assert name.parts and name.parts[0] in ("preflight-results", "test-results", "batch-test-results")
                assert member.name in expected and member.name not in seen
                record = expected[member.name]
                assert member.size == record["bytes"]
                data = bundle.extractfile(member).read()
                assert len(data) == record["bytes"] and sha(data) == record["sha256"]
                target = stage / member.name
                target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
                seen.add(member.name)
            assert seen == set(expected), "Archive omits raw evidence"
        shutil.copytree(stage, output)
    return {"archiveSha256": manifest["archive"]["sha256"], "rawFiles": len(expected), "complete": True}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parts", required=True); parser.add_argument("--out", required=True)
    args = parser.parse_args()
    print(json.dumps(restore(args.parts, args.out), sort_keys=True))
if __name__ == "__main__":
    main()
