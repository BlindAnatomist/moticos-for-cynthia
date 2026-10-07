import json,sys,tempfile,unittest,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import packExpansion160Diagnosis as diagnosis
class CurrentDiagnosis(unittest.TestCase):
 def test_preserves_failure_report_as_diagnosis_only(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);source=root/'source';(source/'expansion160-test-results').mkdir(parents=True);raw=b'{"errors":["fixture failure"]}\n';(source/'expansion160-test-results/results.json').write_bytes(raw)
   output=root/'out.zip';proof=diagnosis.make_archive(source,output)
   self.assertFalse(proof['completeRawEvidence']);self.assertLessEqual(proof['uploadUpperBound'],8*1024*1024)
   with zipfile.ZipFile(output) as z:self.assertEqual(z.read('expansion160-test-results/results.json'),raw);self.assertFalse(json.loads(z.read('diagnosis-inventory.json'))['completeRawEvidence'])
 def test_refuses_stale_output(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);output=root/'out.zip';output.write_bytes(b'keep')
   with self.assertRaises(diagnosis.evidence.EvidenceError):diagnosis.make_archive(root,output)
   self.assertEqual(output.read_bytes(),b'keep')
if __name__=='__main__':unittest.main()

class CurrentSourceModes(unittest.TestCase):
 def test_source_pack_rejects_executable_bit_instead_of_normalizing_it(self):
  import expansion160Evidence as transport
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);source=root/'input';file=source/'preflight-results/source/script.sh';file.parent.mkdir(parents=True);file.write_bytes(b'echo fixture\n');file.chmod(0o755)
   with self.assertRaises(transport.bounded.EvidenceError):transport.pack(source,root/'parts','preflight')
 def test_source_mode_roundtrip_is_explicit_and_exact(self):
  import expansion160Evidence as transport
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);source=root/'input';file=source/'preflight-results/source/script.sh';file.parent.mkdir(parents=True);file.write_bytes(b'echo fixture\n');file.chmod(0o644)
   transport.pack(source,root/'parts','preflight');transport.restore(root/'parts/parts',root/'restored');self.assertEqual((root/'restored/preflight-results/source/script.sh').stat().st_mode&0o777,0o644)
