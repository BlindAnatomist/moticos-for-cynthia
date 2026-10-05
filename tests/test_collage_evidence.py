"""Focused collage packaging/reconstruction tests; no browsers or network."""
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import preserveCollageEvidence as collage
import restoreCollageEvidence as restore

class CollageEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.previous = Path.cwd()
        os.chdir(self.root)
        self.addCleanup(os.chdir, self.previous)

    def fixture(self, file, data):
        path = self.root / file
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def test_full_profile_archive_preserves_every_raw_tree_and_reconstructs(self):
        files = {'preflight-results/failed.log': b'failed, not omitted',
                 'batch-test-results/review/phone.png': b'all pixels\x00\xff',
                 'batch-test-results/results.json': b'{"unfinished":true}',
                 'batch-test-results/failed/trace.zip': b'full trace',
                 'test-results/geometry/phone.json': b'geometry'}
        for file, data in files.items(): self.fixture(file, data)
        self.assertEqual(collage.main(['browser']), 0)
        proof = restore.restore('bounded-evidence/parts', 'restored')
        self.assertTrue(proof['complete'])
        for file, data in files.items(): self.assertEqual((self.root/'restored'/file).read_bytes(), data)

    def test_preflight_includes_build_under_the_single_budget(self):
        self.fixture('preflight-results/build/dist-batch/assets/art.webp', b'exact webp')
        self.fixture('preflight-results/build-proof.json', b'proof')
        self.assertEqual(collage.main(['preflight']), 0)
        manifest=json.loads(Path('bounded-evidence/parts/manifest.json').read_text())
        self.assertEqual(manifest['part_count'], 1)
        self.assertEqual(restore.restore('bounded-evidence/parts','restored')['rawFiles'],2)

    def test_approved_total_ceiling_is_310_mib(self):
        preflight, pcount=collage.BOUNDS['preflight']; profile, count=collage.BOUNDS['browser']
        self.assertEqual(preflight*pcount+3*profile*count, 310*1024*1024)
        self.assertLess(profile,50*1024*1024)

    def test_metadata_and_zip_overhead_are_inside_each_budget(self):
        limit=49*1024*1024
        good={'parts':[{'bytes':limit-65536},{'bytes':limit-65536}]}
        self.assertLessEqual(collage.validate_budget(good,10000,'browser'),98*1024*1024)
        with self.assertRaises(AssertionError):collage.validate_budget(good,65536,'browser')
        with self.assertRaises(AssertionError):collage.validate_budget({'parts':[{'bytes':1}]*3},100,'browser')

    def test_changed_chunk_is_rejected_before_restoration(self):
        self.fixture('preflight-results/log.txt', b'unchanged')
        self.assertEqual(collage.main(['preflight']),0)
        Path('bounded-evidence/parts/part-000.bin').write_bytes(b'wrong')
        with self.assertRaises(AssertionError):restore.restore('bounded-evidence/parts','restored')
        self.assertFalse(Path('restored').exists())

    def test_member_sha_mismatch_is_rejected(self):
        self.fixture('preflight-results/log.txt', b'unchanged')
        self.assertEqual(collage.main(['preflight']),0)
        path=Path('bounded-evidence/parts/manifest.json');manifest=json.loads(path.read_text())
        manifest['source_members'][0]['sha256']='0'*64;path.write_text(json.dumps(manifest))
        with self.assertRaises(AssertionError):restore.restore('bounded-evidence/parts','restored')
        self.assertFalse(Path('restored').exists())

    def test_raw_evidence_symlink_is_not_followed(self):
        self.fixture('batch-test-results/a',b'evidence')
        Path('batch-test-results/link').symlink_to(self.root)
        self.assertEqual(collage.main(['browser']),1)

    def test_ordered_two_part_restoration_and_second_part_corruption(self):
        self.fixture('preflight-results/random.bin', os.urandom(2500))
        Path('bounded-evidence').mkdir()
        args = collage.evidence.parser().parse_args(['pack', '--archive', 'bounded-evidence/browser-evidence.tar.gz',
            '--out', 'bounded-evidence/parts', '--root', '.', '--include', 'preflight-results',
            '--chunk-bytes', '2000', '--max-parts', '2'])
        manifest = collage.evidence.preserve(args)
        self.assertEqual(manifest['part_count'], 2)
        self.assertTrue(restore.restore('bounded-evidence/parts', 'restored')['complete'])
        self.assertEqual(Path('restored/preflight-results/random.bin').read_bytes(), Path('preflight-results/random.bin').read_bytes())
        Path('bounded-evidence/parts/part-001.bin').write_bytes(b'changed second part')
        with self.assertRaises(AssertionError): restore.restore('bounded-evidence/parts', 'bad-restore')
        self.assertFalse(Path('bad-restore').exists())

    def test_archive_traversal_is_rejected_even_with_matching_archive_hashes(self):
        payload = b'forbidden path'
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w:gz') as tar:
            info = tarfile.TarInfo('../escape'); info.size = len(payload)
            tar.addfile(info, io.BytesIO(payload))
        archive = buf.getvalue()
        self.fixture('parts/part-000.bin', archive)
        manifest = {'schema_version': 1, 'archive_format': 'tar.gz', 'part_count': 1,
            'archive': {'bytes': len(archive), 'sha256': hashlib.sha256(archive).hexdigest()},
            'parts': [{'filename': 'part-000.bin', 'bytes': len(archive), 'sha256': hashlib.sha256(archive).hexdigest()}],
            'source_members': [{'path': '../escape', 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}]}
        self.fixture('parts/manifest.json', json.dumps(manifest).encode())
        with self.assertRaises(AssertionError): restore.restore('parts', 'restored')
        self.assertFalse(Path('restored').exists())
        self.assertFalse(Path('escape').exists())

    def test_restore_refuses_existing_destination(self):
        self.fixture('preflight-results/log.txt',b'x');self.assertEqual(collage.main(['preflight']),0)
        Path('restored').mkdir()
        with self.assertRaises(AssertionError):restore.restore('bounded-evidence/parts','restored')

if __name__ == '__main__':unittest.main()
