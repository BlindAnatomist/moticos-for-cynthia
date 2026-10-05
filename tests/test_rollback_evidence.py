import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import sys
import os
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import contentAddressedEvidence as content
import preserveEvidence as bounded
import preserveRollbackEvidence as rollback
import packEvidenceDiagnosis as diagnosis
import restoreCollageEvidence as restore

class RollbackEvidenceTests(unittest.TestCase):
    def test_full_rollback_fidelity_and_native_paths_restore(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source';source.mkdir()
            files={'rollback-test-results/case/original-postcard.png':bytes(range(256))*4096,
                   'rollback-test-results/case/attachments/postcard.png':bytes(range(256))*4096,
                   'rollback-test-results/case/save.json':b'{"raw":"  exact\\n"}\n',
                   'rollback-test-results/case/observations.jsonl':b'{"event":"begin"}\n',
                   'rollback-test-results/case/failure-diagnosis/failure-state.json':b'{"status":"timedOut"}\n',
                   'rollback-test-results/case/failure-diagnosis/failure-view.png':b'full failure image',
                   'preflight-results/browser.log':b'failure context'}
            for name,data in files.items():
                target=source/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
            proof=content.pack(source,root/'package');self.assertTrue(proof['complete']);self.assertGreaterEqual(proof['duplicateBytes'],1024*1024)
            restored=content.restore(root/'package/parts',root/'restored');self.assertEqual(restored['logicalFiles'],len(files))
            self.assertEqual({str(p.relative_to(root/'restored')):p.read_bytes() for p in (root/'restored').rglob('*') if p.is_file()},files)
            salvage=diagnosis.make_archive(source,root/'diagnosis.zip');self.assertFalse(salvage['completeRawEvidence'])
            self.assertIn('rollback-test-results/case/failure-diagnosis/failure-view.png',salvage['includedFiles'])
            self.assertIn('rollback-test-results/case/observations.jsonl',salvage['includedFiles'])
            part=root/'package/parts/part-000.bin';part.write_bytes(part.read_bytes()+b'tampered')
            with self.assertRaises(AssertionError):content.restore(root/'package/parts',root/'tampered')
    def test_326_mib_inclusive_ceiling_and_two_complete_parts(self):
        mib=1024*1024
        self.assertEqual(rollback.BOUNDS['preflight'],(32*mib,1))
        self.assertEqual(content.PART_LIMIT,45*mib);self.assertEqual(content.TOTAL_LIMIT,90*mib);self.assertEqual(diagnosis.LIMIT,8*mib)
        self.assertEqual(32*mib+3*(content.TOTAL_LIMIT+diagnosis.LIMIT),341835776)
        with self.assertRaises(AssertionError):rollback.validate_budget({'parts':[{'bytes':32*mib}]},1,'preflight')
    def test_preflight_restore_includes_the_complete_build(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);old=Path.cwd();os.chdir(root)
            try:
                target=root/'preflight-results/build/dist-rollback/assets';target.mkdir(parents=True);(target/'test.webp').write_bytes(b'exact accepted art')
                self.assertEqual(rollback.main(['preflight']),0)
                proof=restore.restore(root/'bounded-evidence/parts',root/'restored');self.assertTrue(proof['complete']);self.assertEqual((root/'restored/preflight-results/build/dist-rollback/assets/test.webp').read_bytes(),b'exact accepted art')
            finally:os.chdir(old)
if __name__=='__main__':unittest.main()
