import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock
import zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import packEvidenceDiagnosis as diagnosis

class DiagnosisEvidenceTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.base=Path(self.temp.name);self.source=self.base/'source';self.source.mkdir()
 def put(self,name,data):
  p=self.source/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 def test_retains_exact_failing_page_screenshots_and_reports(self):
  files={'batch-test-results/results.json':b'{"failed":1}','batch-test-results/progress/browser-events.jsonl':b'{"event":"end","status":"failed"}',
    'batch-test-results/failed/test-failed-1.png':b'\x89PNG\x00exact original one','batch-test-results/failed/test-failed-2.png':b'\x89PNG\x00exact original two',
    'batch-test-results/failed/error-context.md':b'warning was absent','batch-test-results/failed/trace.zip':b'huge trace separate from primary diagnosis'}
  for name,data in files.items():self.put(name,data)
  proof=diagnosis.make_archive(self.source,self.base/'diagnosis.zip');self.assertEqual(proof['includedFailureScreenshots'],2);self.assertFalse(proof['completeRawEvidence'])
  with zipfile.ZipFile(self.base/'diagnosis.zip') as archive:
   for name,data in files.items():
    if not name.endswith('trace.zip'):self.assertEqual(archive.read(name),data)
   inventory=json.loads(archive.read('diagnosis-inventory.json'));self.assertFalse(inventory['completeRawEvidence']);self.assertEqual(len(inventory['sourceFiles']),6)
 def test_oversized_image_is_explicitly_omitted_without_losing_report(self):
  self.put('batch-test-results/results.json',b'{"failed":1}');self.put('batch-test-results/failed/test-failed-1.png',os.urandom(20000))
  with mock.patch.object(diagnosis,'LIMIT',10000):proof=diagnosis.make_archive(self.source,self.base/'diagnosis.zip')
  self.assertEqual(proof['includedFailureScreenshots'],0)
  with zipfile.ZipFile(self.base/'diagnosis.zip') as archive:
   self.assertEqual(archive.read('batch-test-results/results.json'),b'{"failed":1}')
   inventory=json.loads(archive.read('diagnosis-inventory.json'));self.assertIn('batch-test-results/failed/test-failed-1.png',[x['path'] for x in inventory['notIncluded']])
 def test_failure_image_precedes_optional_large_browser_log(self):
  self.put('batch-test-results/results.json',b'{"failed":1}');self.put('batch-test-results/failed/test-failed-1.png',os.urandom(10000));self.put('preflight-results/browser.log',os.urandom(30000))
  with mock.patch.object(diagnosis,'LIMIT',20000):proof=diagnosis.make_archive(self.source,self.base/'diagnosis.zip')
  self.assertEqual(proof['includedFailureScreenshots'],1);self.assertNotIn('preflight-results/browser.log',proof['includedFiles'])
 def test_full_package_failure_cannot_make_diagnosis_green(self):
  self.put('batch-test-results/results.json',b'{"expected":12}')
  proof=diagnosis.make_archive(self.source,self.base/'diagnosis.zip');self.assertFalse(proof['completeRawEvidence']);self.assertTrue(proof['diagnosticOnly'])
 def test_source_symlinks_rejected(self):
  self.put('batch-test-results/a',b'raw');(self.source/'batch-test-results/link').symlink_to(self.source)
  with self.assertRaises(diagnosis.evidence.EvidenceError):diagnosis.make_archive(self.source,self.base/'diagnosis.zip')
 def test_existing_output_not_overwritten(self):
  self.put('batch-test-results/a',b'raw');out=self.base/'diagnosis.zip';out.write_bytes(b'keep')
  with self.assertRaises(diagnosis.evidence.EvidenceError):diagnosis.make_archive(self.source,out)
  self.assertEqual(out.read_bytes(),b'keep')
if __name__=='__main__':unittest.main()
