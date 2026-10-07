import assert from 'node:assert/strict';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {digest} from './verifyExpansion160Coverage.mjs';
const lock=JSON.parse(readFileSync('package-lock.json','utf8')),installed=JSON.parse(readFileSync('node_modules/.package-lock.json','utf8')),project=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(lock.lockfileVersion,3);assert.equal(installed.lockfileVersion,3);
for(const key of ['dependencies','devDependencies'])assert.deepEqual(project[key],lock.packages[''][key],`Package/lock ${key} differ`);
const verified=[];
for(const [path,record] of Object.entries(installed.packages)){
 const expected=lock.packages[path];assert(expected,`Unpinned installed dependency: ${path}`);
 for(const field of ['version','integrity','resolved'])assert.equal(record[field],expected[field],`${path}: installed ${field} differs from lock`);
 const pkg=JSON.parse(readFileSync(join(path,'package.json'),'utf8'));assert.equal(pkg.version,expected.version,`${path}: actual package version differs`);
 verified.push({path,version:pkg.version,integrity:expected.integrity??null});
}
for(const [path,record] of Object.entries(lock.packages))if(path&&!record.optional)assert(existsSync(join(path,'package.json')),`Missing nonoptional dependency: ${path}`);
const result={status:'passed',nodeVersion:process.version,lockSha256:digest(readFileSync('package-lock.json')),installedLockSha256:digest(readFileSync('node_modules/.package-lock.json')),verifiedPackages:verified.length,packages:verified,limit:'Installed metadata and package versions match the exact lock. This is not fresh registry-download or package-content integrity verification.'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
