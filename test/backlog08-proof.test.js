// BACKLOG-08 Nachweise: vier verifizierte Spiele, echter Feature-Commit, Screenshot- und Quellhashes.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {GAMES,PLANNED} from '../games/index.js';import {BOTS} from '../games/bots.js';import {resolvedRoadmap} from '../games/roadmap.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(read(p)),hash=data=>createHash('sha256').update(data).digest('hex'),lf=p=>hash(read(p).toString('utf8').replaceAll('\r\n','\n'));
const ids=['geschenkfaenger','rhythmus-rausch','stillgestanden','bomben-duell'];

test('BACKLOG-08 proof: exactly four verified games, real feature commit and the original 41-item denominator',()=>{
  const b=json('docs/backlog/plan.json'),p=b.packages.find(p=>p.id==='BACKLOG-08'),r=resolvedRoadmap().find(r=>r.id==='spaetere-spiele');
  assert.deepEqual(p.games,ids);assert.equal(p.status,'verified');assert.equal(b.total_count,41);assert.equal(b.games.length,41);assert.equal(r.punkte.length,41);
  assert.equal(b.completed_count,b.games.filter(g=>['done','verified'].includes(g.status)).length);assert.equal(b.remaining_count,41-b.completed_count);
  assert.match(p.implementation_commit,/^[a-f0-9]{40}$/);assert.ok(p.test_results.every(t=>t.failed===0||/Startfrist|load|Last/i.test(t.note||'')));
  for(const id of ids){
    const g=b.games.find(g=>g.id===id),e=json(`games/${id}/evidence.json`);
    assert.equal(g.status,'verified');assert.equal(g.package_id,p.id);assert.equal(g.implementation_commit,p.implementation_commit);assert.equal(e.implementation_commit,p.implementation_commit);
    assert.ok(GAMES[id]);assert.equal(typeof BOTS[id],'function');assert.ok(!PLANNED.some(g=>g.id===id));assert.ok(r.punkte.find(x=>x.id===id).erledigt);
  }
});
test('BACKLOG-08 proof: original screenshots, six sizes and source hashes support exactly these four worlds',()=>{
  const b=json('docs/backlog/plan.json'),p=b.packages.find(p=>p.id==='BACKLOG-08'),v=json('docs/design/game-visual-roadmap.json');let count=0;
  for(const id of ids){
    const e=json(`games/${id}/evidence.json`),g=b.games.find(g=>g.id===id),d=v.packages.find(x=>x.game_id===id);
    assert.equal(d.visual_status,'done');assert.equal(d.implementation_commit,e.implementation_commit);assert.deepEqual(g.screenshots,e.screenshots.map(s=>s.path));assert.deepEqual(d.screenshots,g.screenshots);
    for(const size of ['1920x1080','1440x900','768x1024','390x844','360x800','900x450'])assert.ok(e.screenshots.some(s=>s.path.endsWith('-'+size+'.png')),id+'/'+size);
    for(const s of e.screenshots){assert.ok(s.path.startsWith(`docs/backlog/screenshots/backlog08/${id}/`));assert.equal(hash(read(s.path)),s.sha256,s.path);}
    for(const s of e.source_audit)assert.equal(lf(s.path),s.sha256,s.path);
    count+=e.screenshots.length;
  }
  assert.equal(count,p.permanent_screenshots);assert.ok(count>=60);
  for(const s of p.shared_source_audit)assert.equal(lf(s.path),s.sha256,s.path);
});
