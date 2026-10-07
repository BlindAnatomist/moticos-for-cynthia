import hashlib,json,os,sys,tempfile,unittest
from pathlib import Path
from unittest import mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import expansion160Evidence as e
class Expansion160EvidenceTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.base=Path(self.temp.name);self.source=self.base/'source';self.source.mkdir();self.files={'preflight-results/build/a.js':b'exact source\0\xff'*100,'preflight-results/build/a-copy.js':b'exact source\0\xff'*100,'preflight-results/unit.log':b'complete log'}
  for name,data in self.files.items():self.put(name,data)
 def put(self,name,data):
  p=self.source/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 def pack(self,kind='preflight'):return e.pack(self.source,self.base/'package',kind)
 def manifest(self):return json.loads((self.base/'package/parts/manifest.json').read_text())
 def write_manifest(self,m):(self.base/'package/parts/manifest.json').write_text(json.dumps(m))
 def rejected(self):
  with self.assertRaises((e.bounded.EvidenceError,KeyError,FileNotFoundError)):e.restore(self.base/'package/parts',self.base/'restored')
  self.assertFalse((self.base/'restored').exists())
 def test_exact_round_trip_duplicates_and_zero_byte_files(self):
  self.files['preflight-results/empty']=b'';self.put('preflight-results/empty',b'');proof=self.pack();self.assertEqual(proof['logicalFiles'],4);self.assertEqual(proof['uniquePayloads'],3);self.assertTrue(proof['complete']);self.assertLess(proof['uploadUpperBound'],e.PART_LIMIT);result=e.restore(self.base/'package/parts',self.base/'restored');self.assertTrue(result['complete']);actual={p.relative_to(self.base/'restored').as_posix():p.read_bytes() for p in (self.base/'restored').rglob('*') if p.is_file()};self.assertEqual(actual,self.files)
 def test_browser_trace_failure_and_hidden_files_survive(self):
  (self.source/'preflight-results/build').rename(self.source/'preflight-results/metadata')
  self.put('expansion160-test-results/.last-run.json',b'{"status":"timedout"}');self.put('expansion160-test-results/a/trace.zip',os.urandom(300));self.put('expansion160-test-results/a/failure-diagnosis/failure-state.json',b'{"unavailable":"timeout"}');self.pack('browser');result=e.restore(self.base/'package/parts',self.base/'restored');self.assertEqual(result['logicalFiles'],6);self.assertTrue((self.base/'restored/expansion160-test-results/.last-run.json').is_file())
 def test_browser_rejects_accidental_build_duplication(self):
  with self.assertRaisesRegex(e.bounded.EvidenceError,'must not duplicate'):self.pack('browser')
 def test_recovery_preserves_exact_git_and_master_bytes(self):
  self.put('recovery-payload/source.bundle',b'exact git bundle fixture');self.put('recovery-payload/art/master.png',b'exact master fixture');proof=self.pack('recovery');self.assertEqual(proof['logicalFiles'],2);result=e.restore(self.base/'package/parts',self.base/'restored');self.assertEqual(result['kind'],'recovery');self.assertEqual((self.base/'restored/recovery-payload/source.bundle').read_bytes(),b'exact git bundle fixture')
 def test_symlink_source_rejected(self):
  (self.source/'preflight-results/link').symlink_to(self.source)
  with self.assertRaises(e.bounded.EvidenceError):self.pack()
 def test_source_root_symlink_rejected(self):
  link=self.base/'link';link.symlink_to(self.source)
  with self.assertRaises(e.bounded.EvidenceError):e.pack(link,self.base/'package','preflight')
 def test_overlap_rejected(self):
  with self.assertRaises(e.bounded.EvidenceError):e.pack(self.source,self.source/'preflight-results/package','preflight')
 def test_existing_output_rejected(self):
  (self.base/'package').mkdir()
  with self.assertRaises(e.bounded.EvidenceError):self.pack()
 def test_unknown_kind_rejected(self):
  with self.assertRaises(e.bounded.EvidenceError):self.pack('unknown')
 def test_duplicate_json_key_rejected(self):
  self.pack();p=self.base/'package/parts/manifest.json';p.write_text(p.read_text().replace('{','{\"kind\":\"preflight\",',1));self.rejected()
 def test_extra_manifest_field_rejected(self):
  self.pack();m=self.manifest();m['unexpected']='silent extra';self.write_manifest(m);self.rejected()
 def test_corrupt_part_rejected(self):
  self.pack();(self.base/'package/parts/part-000.bin').write_bytes(b'corrupt');self.rejected()
 def test_missing_part_rejected(self):
  self.pack();(self.base/'package/parts/part-000.bin').unlink();self.rejected()
 def test_extra_part_rejected(self):
  self.pack();(self.base/'package/parts/part-001.bin').write_bytes(b'extra');self.rejected()
 def test_symlink_part_rejected(self):
  self.pack();p=self.base/'package/parts/part-000.bin';saved=self.base/'saved';p.rename(saved);p.symlink_to(saved);self.rejected()
 def test_symlink_manifest_rejected(self):
  self.pack();p=self.base/'package/parts/manifest.json';saved=self.base/'saved';p.rename(saved);p.symlink_to(saved);self.rejected()
 def test_invalid_manifest_bounds_and_identity(self):
  self.pack();original=self.manifest()
  for key,value in [('encoding','wrong'),('kind','unknown'),('part_count',0),('part_count',True),('chunk_bytes',24*e.MIB),('max_parts',7),('archive_format','zip'),('mode','split')]:
   with self.subTest(key=key,value=value):m=dict(original);m[key]=value;self.write_manifest(m);self.rejected()
 def test_unsafe_part_name_rejected(self):
  self.pack();m=self.manifest();m['parts'][0]['filename']='../escape';self.write_manifest(m);self.rejected()
 def test_archive_digest_rejected(self):
  self.pack();m=self.manifest();m['archive']['sha256']='0'*64;self.write_manifest(m);self.rejected()
 def test_archive_member_missing_or_duplicate_rejected(self):
  self.pack();m=self.manifest();m['source_members'].append(m['source_members'][0]);self.write_manifest(m);self.rejected()
 def test_unsafe_archive_path_rejected(self):
  self.pack();m=self.manifest();m['source_members'][0]['path']='../escape';self.write_manifest(m);self.rejected()
 def test_existing_restore_is_never_overwritten(self):
  self.pack();(self.base/'restored').mkdir()
  with self.assertRaises(e.bounded.EvidenceError):e.restore(self.base/'package/parts',self.base/'restored')
 def test_bad_logical_paths_rejected(self):
  for p in ['../x','/tmp/x','preflight-results/../x','preflight-results//x','src/x','preflight-results','./preflight-results/x']:
   with self.subTest(path=p):
    with self.assertRaises(e.bounded.EvidenceError):e.safe_path(p,('preflight-results',))
 def test_failed_package_leaves_flags_false_and_originals_intact(self):
  flags=self.base/'flags';flags.write_text('part_000=true\n')
  with mock.patch.object(e.bounded,'preserve',side_effect=e.bounded.EvidenceError('overflow')):
   with self.assertRaises(e.bounded.EvidenceError):e.pack(self.source,self.base/'package','preflight',str(flags))
  self.assertTrue(flags.read_text().endswith('part_count=0\n'));self.assertFalse((self.base/'package/proof.json').exists());self.assertEqual((self.source/'preflight-results/build/a.js').read_bytes(),self.files['preflight-results/build/a.js'])
 def test_missing_roots_are_explicit(self):
  (self.source/'preflight-results/build').rename(self.source/'preflight-results/metadata')
  stage=self.base/'stage';index=e.build_payload(self.source,stage,'browser');self.assertEqual(index['missing_directories'],['expansion160-test-results','test-results'])
 def test_output_flags_cannot_overlap_source(self):
  with self.assertRaises(e.bounded.EvidenceError):e.pack(self.source,self.base/'package','preflight',str(self.source/'preflight-results/flags'))
if __name__=='__main__':unittest.main()
