import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import contentAddressedEvidence as cas

class ContentAddressedTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.base=Path(self.temp.name);self.source=self.base/'source';self.source.mkdir()
    def put(self,name,data):
        p=self.source/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
    def test_restores_all_paths_and_bytes_with_duplicate_png_export_and_trace(self):
        files={'batch-test-results/review/p.png':b'png-exact\x00\xff'*100,
               'batch-test-results/test/attachments/copy.png':b'png-exact\x00\xff'*100,
               'batch-test-results/test/trace.zip':b'full unmodified trace',
               'batch-test-results/results.json':b'{"failed":1}',
               'preflight-results/build-proof.json':b'proof'}
        for path,data in files.items():self.put(path,data)
        proof=cas.pack(self.source,self.base/'package');self.assertEqual(proof['logicalFiles'],5);self.assertEqual(proof['uniquePayloads'],4)
        result=cas.restore(self.base/'package/parts',self.base/'restored');self.assertTrue(result['complete'])
        restored={p.relative_to(self.base/'restored').as_posix():p.read_bytes() for p in (self.base/'restored').rglob('*') if p.is_file()}
        self.assertEqual(restored,files)
        (self.base/'restored/batch-test-results/review/p.png').write_bytes(b'changed one copy')
        self.assertEqual((self.base/'restored/batch-test-results/test/attachments/copy.png').read_bytes(),files['batch-test-results/test/attachments/copy.png'])
    def test_rejects_source_symlink(self):
        self.put('batch-test-results/a',b'a');(self.source/'batch-test-results/link').symlink_to(self.source)
        with self.assertRaises(cas.bounded.EvidenceError):cas.pack(self.source,self.base/'package')
    def test_rejects_source_overlap(self):
        self.put('batch-test-results/a',b'a')
        with self.assertRaises(cas.bounded.EvidenceError):cas.pack(self.source,self.source/'batch-test-results/package')
    def test_rejects_existing_restore(self):
        self.put('batch-test-results/a',b'a');cas.pack(self.source,self.base/'package');(self.base/'restored').mkdir()
        with self.assertRaises(cas.bounded.EvidenceError):cas.restore(self.base/'package/parts',self.base/'restored')
    def test_corrupt_chunk_is_rejected(self):
        self.put('batch-test-results/a',b'a');cas.pack(self.source,self.base/'package');(self.base/'package/parts/part-000.bin').write_bytes(b'wrong')
        with self.assertRaises(AssertionError):cas.restore(self.base/'package/parts',self.base/'restored')
        self.assertFalse((self.base/'restored').exists())
    def test_unsafe_logical_paths_rejected(self):
        for name in ['../escape','/tmp/escape','src/private','batch-test-results/../escape','batch-test-results//a']:
            with self.subTest(name=name):
                with self.assertRaises(cas.bounded.EvidenceError):cas.safe_path(name)
    def test_overflow_remains_incomplete_not_success(self):
        self.put('batch-test-results/a',b'a')
        with mock.patch.object(cas.bounded,'preserve',side_effect=cas.bounded.EvidenceError('Archive needs 5 parts; limit is 2')):
            with self.assertRaises(cas.bounded.EvidenceError):cas.pack(self.source,self.base/'package')
        self.assertFalse((self.base/'package/proof.json').exists())
        self.assertEqual((self.source/'batch-test-results/a').read_bytes(),b'a')
    def test_empty_file_and_unavailable_roots_remain_explicit(self):
        self.put('preflight-results/empty.log',b'')
        stage=self.base/'stage';stage.mkdir();index=cas.build_payload(self.source,stage)
        self.assertEqual(index['missing_directories'],['batch-test-results','test-results'])
        self.assertEqual(index['logicalFiles'],1);self.assertEqual(index['rawBytes'],0)
        self.assertEqual(index['source_members'][0]['sha256'],hashlib.sha256(b'').hexdigest())

    def test_failure_route_preserves_all_generated_diagnostic_trace_and_image_bytes(self):
        import io, zipfile
        trace=io.BytesIO()
        with zipfile.ZipFile(trace,'w') as archive:archive.writestr('test.trace','{"type":"before","apiName":"locator.tap"}\n')
        files={
            'batch-test-results/case/trace.zip':trace.getvalue(),
            'batch-test-results/progress/webkit-iphone-large-collections.jsonl':b'{"event":"image-start","image":9}\n',
            'batch-test-results/case/failure-diagnosis/failure-state.json':b'{"observations":[{"name":"after-image","value":{"modal":true}}]}',
            'batch-test-results/case/failure-diagnosis/failure-view.png':b'exact raster fixture',
            'batch-test-results/case/test-failed-1.png':b'exact raster fixture',
            'batch-test-results/.playwright-artifacts-0/traces/raw.trace':b'raw action trace bytes',
        }
        for path,data in files.items():self.put(path,data)
        proof=cas.pack(self.source,self.base/'package');self.assertEqual(proof['logicalFiles'],len(files))
        cas.restore(self.base/'package/parts',self.base/'restored')
        self.assertEqual({p.relative_to(self.base/'restored').as_posix():p.read_bytes() for p in (self.base/'restored').rglob('*') if p.is_file()},files)

if __name__=='__main__':unittest.main()
