"""Local, standard-library-only checks; never runs browsers or GitHub Actions."""

import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "preserveEvidence.py"
SPEC = importlib.util.spec_from_file_location("preserveEvidence", SCRIPT)
evidence = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evidence)


def sha(data):
    return hashlib.sha256(data).hexdigest()


class PreserveEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.archive = self.root / "original.zip"
        self.out = self.root / "parts"
        self.outputs = self.root / "github-output"

    def split_args(self, data, **changes):
        self.archive.write_bytes(data)
        args = evidence.parser().parse_args([
            "split", "--archive", str(self.archive), "--out", str(self.out),
            "--expected-bytes", str(len(data)), "--expected-sha256", sha(data),
            "--github-output", str(self.outputs), "--chunk-bytes", "8",
        ])
        for key, value in changes.items():
            setattr(args, key, value)
        return args

    def pack_args(self, includes=None, **changes):
        includes = includes or list(evidence.SAFE_DIRECTORIES)
        cli = ["pack", "--archive", str(self.root / "browser-evidence.tar"),
               "--out", str(self.out), "--root", str(self.root),
               "--github-output", str(self.outputs), "--chunk-bytes", "4096"]
        for name in includes:
            cli += ["--include", name]
        args = evidence.parser().parse_args(cli)
        for key, value in changes.items():
            setattr(args, key, value)
        return args

    def fixture(self, relative, data):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path

    def read_outputs(self):
        return dict(line.split("=", 1) for line in self.outputs.read_text().splitlines())

    def assert_failed_closed(self):
        self.assertFalse((self.out / "manifest.json").exists())
        self.assertFalse(list(self.root.glob(".evidence-parts-*")))
        self.assertFalse(list(self.root.glob(".evidence-archive-*")))
        if self.outputs.exists():
            fields = self.read_outputs()
            self.assertEqual(fields["part_count"], "0")
            self.assertTrue(all(fields[f"part_{i:03d}"] == "false" for i in range(16)))

    def assert_manifest(self, returned):
        manifest = json.loads((self.out / "manifest.json").read_text())
        self.assertEqual(manifest, returned)
        reconstructed = b""
        for index, part in enumerate(manifest["parts"]):
            self.assertEqual(part["filename"], f"part-{index:03d}.bin")
            content = (self.out / part["filename"]).read_bytes()
            self.assertEqual(part["bytes"], len(content))
            self.assertEqual(part["sha256"], sha(content))
            self.assertLessEqual(len(content), manifest["chunk_bytes"])
            self.assertLess(
                len(content) + (self.out / "manifest.json").stat().st_size
                + evidence.UPLOAD_OVERHEAD_BYTES, evidence.UPLOAD_LIMIT_BYTES)
            reconstructed += content
        self.assertEqual(manifest["archive"]["bytes"], len(reconstructed))
        self.assertEqual(manifest["archive"]["sha256"], sha(reconstructed))
        self.assertEqual(manifest["part_count"], len(manifest["parts"]))
        self.assertEqual(self.read_outputs()["part_count"], str(manifest["part_count"]))
        for index in range(16):
            self.assertEqual(self.read_outputs()[f"part_{index:03d}"],
                             "true" if index < manifest["part_count"] else "false")
        return manifest, reconstructed

    def test_split_exact_boundary_reconstructs_identical_archive(self):
        original = bytes(range(16))
        result = evidence.preserve(self.split_args(original))
        manifest, rebuilt = self.assert_manifest(result)
        self.assertEqual(rebuilt, original)
        self.assertEqual([part["bytes"] for part in manifest["parts"]], [8, 8])
        self.assertEqual(self.archive.read_bytes(), original)
        self.assertFalse((self.out / self.archive.name).exists())

    def test_split_short_final_part_and_uppercase_digest(self):
        original = b"a\x00b\xffcdefghijklmno"
        result = evidence.preserve(self.split_args(original, expected_sha256=sha(original).upper()))
        manifest, rebuilt = self.assert_manifest(result)
        self.assertEqual(rebuilt, original)
        self.assertEqual([part["bytes"] for part in manifest["parts"]], [8, 8, 1])

    def test_default_bounds_fit_old_archive_in_four_parts(self):
        args = evidence.parser().parse_args([
            "split", "--archive", "old.zip", "--out", "parts",
            "--expected-bytes", "654533926", "--expected-sha256",
            "075aae2f23f379516eaae1eff75a88298280fe7452a715c7d0edd06454ffc750",
        ])
        self.assertEqual(args.chunk_bytes, 200 * 1024 * 1024)
        self.assertEqual(args.max_parts, 16)
        self.assertEqual((args.expected_bytes + args.chunk_bytes - 1) // args.chunk_bytes, 4)

    def test_split_sha_mismatch_writes_no_parts(self):
        args = self.split_args(b"some evidence", expected_sha256="0" * 64)
        with mock.patch.object(evidence, "_split_verified") as split:
            with self.assertRaisesRegex(evidence.EvidenceError, "SHA-256 mismatch"):
                evidence.preserve(args)
            split.assert_not_called()
        self.assert_failed_closed()

    def test_split_size_mismatch_writes_no_parts(self):
        args = self.split_args(b"some evidence", expected_bytes=999)
        with self.assertRaisesRegex(evidence.EvidenceError, "size mismatch"):
            evidence.preserve(args)
        self.assert_failed_closed()

    def test_split_empty_archive_fails_closed(self):
        with self.assertRaisesRegex(evidence.EvidenceError, "positive"):
            evidence.preserve(self.split_args(b""))
        self.assert_failed_closed()

    def test_split_limit_failure_fails_closed(self):
        with self.assertRaisesRegex(evidence.EvidenceError, "needs 3 parts; limit is 2"):
            evidence.preserve(self.split_args(b"a" * 17, max_parts=2))
        self.assert_failed_closed()

    def test_split_last_permitted_part_succeeds(self):
        result = evidence.preserve(self.split_args(b"b" * 128))
        manifest, rebuilt = self.assert_manifest(result)
        self.assertEqual(manifest["part_count"], 16)
        self.assertEqual(rebuilt, b"b" * 128)

    def test_split_rejects_malformed_hash(self):
        with self.assertRaisesRegex(evidence.EvidenceError, "64 hexadecimal"):
            evidence.preserve(self.split_args(b"data", expected_sha256="not-a-hash"))
        self.assert_failed_closed()

    def test_archive_change_after_initial_verification_fails_closed(self):
        args = self.split_args(b"a" * 16)
        split = evidence._split_verified

        def change_and_split(stream, *remaining):
            self.archive.write_bytes(b"b" * 16)
            return split(stream, *remaining)

        with mock.patch.object(evidence, "_split_verified", side_effect=change_and_split):
            with self.assertRaisesRegex(evidence.EvidenceError, "changed while splitting"):
                evidence.preserve(args)
        self.assert_failed_closed()

    def test_pack_preserves_every_member_and_ignores_unrelated_tree(self):
        originals = {
            "test-results/screenshots/phone.png": b"\x89PNG\r\n\x1a\n" + bytes(range(256)),
            "test-results/progress/empty.json": b"",
            "trial-test-results/review/ll3-export.png": b"canonical trial postcard fixture",
            "test-results/nested/trace.zip": b"PK\x03\x04\x00\xff\n",
            "playwright-report/index.html": b"<p>complete report</p>",
            "preflight-results/geometry/phone.json": b'{"width":390}',
            "preflight-report/nested/report.txt": b"Full preflight results\n",
        }
        for relative, original in originals.items():
            self.fixture(relative, original)
        outside = self.fixture("unrelated/private.txt", b"never scan or include me")
        (self.root / "unrelated" / "ignored-link").symlink_to(outside)
        args = self.pack_args()
        manifest, rebuilt = self.assert_manifest(evidence.preserve(args))
        self.assertEqual(rebuilt, Path(args.archive).read_bytes())
        self.assertEqual(manifest["archive_format"], "tar")
        self.assertEqual(manifest["missing_directories"], [])
        members = {item["path"]: item for item in manifest["source_members"]}
        self.assertEqual(set(members), set(originals))
        with tarfile.open(fileobj=io.BytesIO(rebuilt), mode="r:") as bundle:
            self.assertEqual(set(bundle.getnames()), set(originals))
            for name, original in originals.items():
                self.assertTrue(bundle.getmember(name).isfile())
                self.assertEqual(bundle.extractfile(name).read(), original)
                self.assertEqual(members[name]["bytes"], len(original))
                self.assertEqual(members[name]["sha256"], sha(original))

    def test_pack_gzip_is_lossless_and_missing_directories_are_recorded(self):
        original = b"all pixels preserved" * 1000
        self.fixture("test-results/screenshots/a.png", original)
        args = self.pack_args(archive=str(self.root / "browser-evidence.tar.gz"))
        manifest, rebuilt = self.assert_manifest(evidence.preserve(args))
        self.assertEqual(manifest["archive_format"], "tar.gz")
        self.assertEqual(rebuilt[:2], b"\x1f\x8b")
        self.assertEqual(set(manifest["missing_directories"]),
                         set(evidence.SAFE_DIRECTORIES) - {"test-results"})
        with tarfile.open(fileobj=io.BytesIO(rebuilt), mode="r:gz") as bundle:
            self.assertEqual(bundle.extractfile("test-results/screenshots/a.png").read(), original)

    def test_pack_no_inputs_fails_closed(self):
        for existing_empty_directory in (False, True):
            with self.subTest(existing_empty_directory=existing_empty_directory):
                if existing_empty_directory:
                    (self.root / "test-results").mkdir()
                with self.assertRaisesRegex(evidence.EvidenceError, "No regular evidence"):
                    evidence.preserve(self.pack_args())
                self.assert_failed_closed()

    def test_pack_single_empty_file_is_preserved(self):
        self.fixture("test-results/empty", b"")
        result = evidence.preserve(self.pack_args())
        manifest, rebuilt = self.assert_manifest(result)
        self.assertEqual(manifest["source_members"][0]["sha256"], sha(b""))
        with tarfile.open(fileobj=io.BytesIO(rebuilt)) as bundle:
            self.assertEqual(bundle.extractfile("test-results/empty").read(), b"")

    def test_pack_rejects_file_symlink(self):
        source = self.fixture("test-results/a.png", b"pixels")
        (source.parent / "link.png").symlink_to(source)
        with self.assertRaisesRegex(evidence.EvidenceError, "Symlinks are forbidden"):
            evidence.preserve(self.pack_args())
        self.assert_failed_closed()

    def test_pack_rejects_directory_symlink(self):
        self.fixture("test-results/a.png", b"pixels")
        (self.root / "test-results" / "outside").symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(evidence.EvidenceError, "Symlinks are forbidden"):
            evidence.preserve(self.pack_args())
        self.assert_failed_closed()

    def test_pack_rejects_top_level_broken_symlink(self):
        (self.root / "test-results").symlink_to(self.root / "nonexistent")
        with self.assertRaisesRegex(evidence.EvidenceError, "Symlinks are forbidden"):
            evidence.preserve(self.pack_args())
        self.assert_failed_closed()

    def test_pack_rejects_non_allowlisted_and_traversal_paths(self):
        for name in ("../test-results", "/test-results", "test-results/../src", "src", "./test-results"):
            with self.subTest(name=name):
                with self.assertRaisesRegex(evidence.EvidenceError, "exact allowlisted"):
                    evidence.preserve(self.pack_args(includes=[name]))
                self.assert_failed_closed()

    def test_pack_rejects_duplicate_include(self):
        with self.assertRaisesRegex(evidence.EvidenceError, "without duplicates"):
            evidence.preserve(self.pack_args(includes=["test-results", "test-results"]))
        self.assert_failed_closed()

    def test_pack_limit_failure_leaves_no_archive_or_manifest(self):
        self.fixture("test-results/a.png", b"pixels")
        args = self.pack_args(max_parts=1)
        with self.assertRaisesRegex(evidence.EvidenceError, "limit is 1"):
            evidence.preserve(args)
        self.assertFalse(Path(args.archive).exists())
        self.assert_failed_closed()

    def test_archive_must_be_outside_parts(self):
        self.out.mkdir()
        args = self.split_args(b"data", archive=str(self.out / "original.zip"))
        with self.assertRaisesRegex(evidence.EvidenceError, "outside the parts"):
            evidence.preserve(args)
        self.assert_failed_closed()

    def test_pack_generated_files_cannot_overlap_sources(self):
        source = self.fixture("test-results/a.png", b"pixels")
        for key, value in (("archive", self.root / "test-results" / "archive.tar"),
                           ("out", self.root / "test-results" / "parts"),
                           ("github_output", source)):
            with self.subTest(key=key):
                with self.assertRaisesRegex(evidence.EvidenceError, "outside all included"):
                    evidence.preserve(self.pack_args(**{key: str(value)}))
                self.assertEqual(source.read_bytes(), b"pixels")
                self.assert_failed_closed()

    def test_existing_nonempty_parts_directory_is_never_overwritten(self):
        self.out.mkdir()
        sentinel = self.out / "existing.txt"
        sentinel.write_text("preserve me")
        self.outputs.write_text("part_000=true\npart_count=1\n")
        with self.assertRaisesRegex(evidence.EvidenceError, "absent or an empty"):
            evidence.preserve(self.split_args(b"data"))
        self.assertEqual(sentinel.read_text(), "preserve me")
        self.assert_failed_closed()

    def test_existing_empty_parts_directory_can_be_published(self):
        self.out.mkdir()
        manifest, rebuilt = self.assert_manifest(evidence.preserve(self.split_args(b"data")))
        self.assertEqual(rebuilt, b"data")

    def test_failed_invocation_resets_previous_upload_flags(self):
        self.outputs.write_text("unrelated=keep\npart_000=true\npart_count=1\n")
        with self.assertRaisesRegex(evidence.EvidenceError, "SHA-256 mismatch"):
            evidence.preserve(self.split_args(b"data", expected_sha256="0" * 64))
        self.assertEqual(self.read_outputs()["unrelated"], "keep")
        self.assert_failed_closed()

    def test_path_validation_failure_resets_safe_previous_upload_flags(self):
        self.outputs.write_text("part_000=true\npart_count=1\n")
        args = self.split_args(b"data", out=str(self.root / "missing-parent" / "parts"))
        with self.assertRaisesRegex(evidence.EvidenceError, "parent directories must already exist"):
            evidence.preserve(args)
        self.assert_failed_closed()

    def test_unsafe_output_reset_preserves_source_archive(self):
        original = b"source archive must never be replaced by output flags"
        args = self.split_args(original, github_output=str(self.archive))
        with self.assertRaisesRegex(evidence.EvidenceError, "outside the archive and parts"):
            evidence.preserve(args)
        self.assertEqual(self.archive.read_bytes(), original)
        self.assert_failed_closed()

    def test_failed_output_publication_removes_successful_looking_package(self):
        args = self.split_args(b"evidence")
        write_outputs = evidence._atomic_outputs

        def fail_success(path, count):
            if count:
                raise OSError("simulated output write failure")
            return write_outputs(path, count)

        with mock.patch.object(evidence, "_atomic_outputs", side_effect=fail_success):
            with self.assertRaisesRegex(OSError, "simulated output"):
                evidence.preserve(args)
        self.assert_failed_closed()

    def test_failure_after_output_replace_resets_upload_flags(self):
        args = self.split_args(b"evidence")
        write_outputs = evidence._atomic_outputs

        def fail_after_success(path, count):
            write_outputs(path, count)
            if count:
                raise OSError("simulated error after output replacement")

        with mock.patch.object(evidence, "_atomic_outputs", side_effect=fail_after_success):
            with self.assertRaisesRegex(OSError, "after output replacement"):
                evidence.preserve(args)
        self.assert_failed_closed()

    def test_test_overrides_cannot_expand_production_bounds(self):
        for key, value in (("chunk_bytes", 0), ("chunk_bytes", evidence.CHUNK_BYTES + 1),
                           ("max_parts", 0), ("max_parts", 17)):
            with self.subTest(key=key, value=value):
                with self.assertRaises(evidence.EvidenceError):
                    evidence.preserve(self.split_args(b"data", **{key: value}))
                self.assert_failed_closed()

    def test_cli_split_contract_and_nonzero_failure(self):
        original = b"archive with exact known bytes"
        self.archive.write_bytes(original)
        command = [sys.executable, str(SCRIPT), "split", "--archive", str(self.archive),
                   "--out", str(self.out), "--expected-bytes", str(len(original)),
                   "--expected-sha256", sha(original), "--chunk-bytes", "8",
                   "--github-output", str(self.outputs)]
        result = subprocess.run(command, text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Preserved", result.stdout)
        manifest = json.loads((self.out / "manifest.json").read_text())
        self.assertEqual(self.assert_manifest(manifest)[1], original)
        missing_expectations = subprocess.run(command[:8], text=True, capture_output=True, check=False)
        self.assertNotEqual(missing_expectations.returncode, 0)
        self.assertIn("--expected-sha256", missing_expectations.stderr)

    def test_cli_pack_contract(self):
        self.fixture("test-results/screenshots/a.png", b"pixels\xff\x00")
        archive = self.root / "browser-evidence.tar.gz"
        command = [sys.executable, str(SCRIPT), "pack", "--archive", str(archive),
                   "--out", str(self.out), "--root", str(self.root),
                   "--github-output", str(self.outputs)]
        for name in evidence.SAFE_DIRECTORIES:
            command += ["--include", name]
        result = subprocess.run(command, text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.out / "manifest.json").read_text())
        self.assertEqual(self.assert_manifest(manifest)[1], archive.read_bytes())

    def test_fresh_runner_workflow_pack_paths(self):
        self.fixture("test-results/screenshots/phone.png", b"exact unmodified image\xff\x00")
        self.fixture("preflight-report/index.html", b"<p>preflight</p>")
        # Match the workflow's mkdir and relative path contract exactly. Other
        # browser output trees may legitimately be absent after a failed run.
        (self.root / "bounded-evidence").mkdir()
        self.out = self.root / "bounded-evidence" / "parts"
        command = [sys.executable, str(SCRIPT), "pack",
                   "--archive", "bounded-evidence/browser-evidence.tar.gz",
                   "--out", "bounded-evidence/parts", "--root", ".",
                   "--include", "test-results", "--include", "playwright-report",
                   "--include", "preflight-results", "--include", "preflight-report",
                   "--github-output", str(self.outputs)]
        result = subprocess.run(command, cwd=self.root, text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.out / "manifest.json").read_text())
        _, rebuilt = self.assert_manifest(manifest)
        self.assertEqual(rebuilt, (self.root / "bounded-evidence/browser-evidence.tar.gz").read_bytes())
        with tarfile.open(fileobj=io.BytesIO(rebuilt), mode="r:gz") as bundle:
            self.assertEqual(bundle.extractfile("test-results/screenshots/phone.png").read(),
                             b"exact unmodified image\xff\x00")
            self.assertEqual(bundle.extractfile("preflight-report/index.html").read(), b"<p>preflight</p>")

    def test_main_reports_validation_failure_without_success_message(self):
        self.archive.write_bytes(b"bad")
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            result = evidence.main([
                "split", "--archive", str(self.archive), "--out", str(self.out),
                "--expected-bytes", "3", "--expected-sha256", "0" * 64,
            ])
        self.assertEqual(result, 1)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("Evidence preservation failed", stderr.getvalue())
        self.assert_failed_closed()


if __name__ == "__main__":
    unittest.main()
