import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hash=text=>createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex');
// Preserve the old visual evidence without pretending its screenshots show the
// release corrections. Check both independently pinned source versions.
export function releaseSource(path){
 const audit=JSON.parse(read('test/fixtures/release-2026-11-08/source-audit.json'));
 const row=audit.sources.find(s=>s.path===path);
 if(!row)return read(path);
 assert.equal(hash(read(path)),row.current_sha256,'Release source changed without re-verification: '+path);
 const old=read(row.archive);assert.equal(hash(old),row.baseline_sha256,'Historical visual source: '+path);return old;
}
