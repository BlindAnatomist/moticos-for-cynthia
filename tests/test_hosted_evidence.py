"""No-browser hosted evidence regression; all generated data is a test fixture."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import preserveCollageLiveEvidence as hosted

class HostedEvidenceTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
  self.root=Path(self.temp.name);self.source=self.root/'source';self.source.mkdir()
 def put(self,path,data):
  target=self.source/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 def test_exact_roundtrip_for_duplicate_images_exports_full_trace_and_reports(self):
  files={'batch-test-results/review/postcard.png':b'original PNG\x00\xff'*300,
   'batch-test-results/one/attachments/postcard-copy.png':b'original PNG\x00\xff'*300,
   'batch-test-results/one/trace.zip':b'complete unchanged failure trace',
   'batch-test-results/one/test-failed-1.png':b'exact failing page image',
   'batch-test-results/results.json':b'{"failed":1}','preflight-results/pins.json':b'pinned build'}
  for path,data in files.items():self.put(path,data)
  flags=self.root/'outputs';proof=hosted.pack(self.source,self.root/'package',str(flags))
  self.assertEqual(proof['logicalFiles'],6);self.assertEqual(proof['uniquePayloads'],5);self.assertEqual(proof['partCount'],1)
  self.assertLessEqual(proof['uploadUpperBound'],30*1024*1024)
  self.assertIn('part_000=true',flags.read_text());self.assertIn('part_001=false',flags.read_text())
  restored=self.root/'restored';self.assertTrue(hosted.restore(self.root/'package/parts',restored)['complete'])
  actual={p.relative_to(restored).as_posix():p.read_bytes() for p in restored.rglob('*') if p.is_file()};self.assertEqual(actual,files)
  (restored/'batch-test-results/review/postcard.png').write_bytes(b'edited one restored copy')
  self.assertEqual((restored/'batch-test-results/one/attachments/postcard-copy.png').read_bytes(),files['batch-test-results/review/postcard.png'])
 def test_overflow_has_no_success_manifest_or_true_upload_flag(self):
  self.put('batch-test-results/trace.zip',bytes(range(256))*100)
  flags=self.root/'outputs'
  with mock.patch.object(hosted,'CHUNK',8):
   with self.assertRaises(hosted.evidence.EvidenceError):hosted.pack(self.source,self.root/'package',str(flags))
  self.assertFalse((self.root/'package/parts/manifest.json').exists());self.assertNotIn('=true',flags.read_text())
  self.assertEqual((self.source/'batch-test-results/trace.zip').read_bytes(),bytes(range(256))*100)
 def test_rejects_any_second_part(self):
  with self.assertRaises(hosted.evidence.EvidenceError):hosted.check_budget({'part_count':2,'parts':[{'bytes':1},{'bytes':1}]},100)
 def test_manifest_and_upload_overhead_count_against_30_mib(self):
  with self.assertRaises(hosted.evidence.EvidenceError):hosted.check_budget({'part_count':1,'parts':[{'bytes':hosted.LIMIT}]},1)
 def test_source_symlinks_rejected(self):
  self.put('batch-test-results/a',b'a');(self.source/'batch-test-results/link').symlink_to(self.source)
  with self.assertRaises(hosted.evidence.EvidenceError):hosted.pack(self.source,self.root/'package')
 def test_corrupt_part_is_rejected_before_restoring(self):
  self.put('batch-test-results/a',b'a');hosted.pack(self.source,self.root/'package');(self.root/'package/parts/part-000.bin').write_bytes(b'wrong')
  with self.assertRaises(AssertionError):hosted.restore(self.root/'package/parts',self.root/'restored')
  self.assertFalse((self.root/'restored').exists())
 def test_existing_output_parts_never_overwritten(self):
  self.put('batch-test-results/a',b'a');hosted.pack(self.source,self.root/'package')
  with self.assertRaises(hosted.evidence.EvidenceError):hosted.pack(self.source,self.root/'package')
 def test_empty_file_kept_and_missing_trees_do_not_imply_browser_success(self):
  self.put('preflight-results/empty.log',b'');proof=hosted.pack(self.source,self.root/'package');self.assertEqual(proof['logicalFiles'],1)
  hosted.restore(self.root/'package/parts',self.root/'restored');self.assertEqual((self.root/'restored/preflight-results/empty.log').read_bytes(),b'')
if __name__=='__main__':unittest.main()
