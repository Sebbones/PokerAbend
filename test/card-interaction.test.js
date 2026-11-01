import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GAMES} from '../games/index.js';
const source=readFileSync(new URL('../public/games/card-interaction.js',import.meta.url),'utf8');
function api(){const context=vm.createContext({window:{},I18n:{language:'de'},setTimeout,clearTimeout});vm.runInContext(source,context);return context.window.CardInteraction;}
const state=(hand)=>({code:'ABCDE',game:'farbenchaos',variant:'classic',roundNo:1,phase:'playing',turnId:'a',you:{id:'a'},players:[{id:'a',inRound:true}],g:{hand,playable:hand}});
test('Card references distinguish equal values and expire primitive indices when the authoritative hand changes',()=>{
  const c=api(),tracker=c.tracker(),s=state(['7r','7r','Ww']);const old=tracker.update(s).map((r)=>r.key);assert.equal(new Set(old).size,3);assert.notEqual(old[0],old[1]);
  assert.equal(tracker.update(structuredClone(s))[1].key,old[1]);tracker.update(state(['7r','Ww']));assert.equal(tracker.find(old[1]),undefined);assert.equal(tracker.find(old[0]),undefined);
  tracker.update({...s,code:'OTHER'});assert.equal(tracker.find(old[0]),undefined);assert.deepEqual(s.g.hand,['7r','7r','Ww']);
});
test('Physical UNO tokens and Phase-10 IDs retain their exact identity through reorder without exposing extra faces',()=>{
  const tracker=api().tracker();tracker.update(state(['7r@2','7r@8']));assert.notEqual(tracker.records[0].key,tracker.records[1].key);assert.equal(tracker.records[1].card,'7r@8');
  tracker.update(state([{id:3,c:'r',n:7},{id:4,c:'r',n:7}]));assert.equal(tracker.records[0].key,'id:3');tracker.update(state([{id:4,c:'r',n:7},{id:3,c:'r',n:7}]));assert.equal(tracker.find('id:3').index,1);
});
test('Action context preserves selection for readonly updates and changes for relevant authority, hand and source updates',()=>{
  const c=api(),s=state([1,2,0]);const k=c.context(s);assert.equal(c.context({...s,now:123,deadline:999,log:[],players:s.players.map((p)=>({...p,connected:false}))}),k);
  for(const changed of [{...s,turnId:'b'},{...s,roundNo:2},{...s,gamePaused:true},{...s,g:{...s.g,hand:[2,0]}},{...s,g:{...s.g,build:[{next:2}]}}])assert.notEqual(c.context(changed),k);
});
test('Action gate emits once, waits for actual acknowledgement, retains rejection and allows an explicit retry',async()=>{
  let resolve,calls=0;const gate=api().gate(()=>{calls++;return new Promise((r)=>{resolve=r;});},()=>{},()=>true);
  const pending=gate.run('play',{});assert.equal(gate.busy,true);assert.equal((await gate.run('play',{})).blocked,true);assert.equal(calls,1);
  resolve({ok:false,error:'Rejected by server'});assert.equal((await pending).ok,false);assert.equal(gate.busy,false);assert.equal(gate.error,'Rejected by server');
  const retry=gate.run('play',{});resolve({ok:true});assert.equal((await retry).ok,true);assert.equal(gate.error,'');assert.equal(calls,2);
});
test('Action gate blocks offline/paused input and ignores acknowledgements from invalidated connections',async()=>{
  let resolve,allowed=false,calls=0;const gate=api().gate(()=>{calls++;return new Promise((r)=>{resolve=r;});},()=>{},()=>allowed);
  assert.equal((await gate.run('draw',{})).blocked,true);assert.equal(calls,0);allowed=true;const pending=gate.run('draw',{});gate.invalidate();resolve({ok:true});assert.equal((await pending).stale,true);assert.equal(gate.busy,false);assert.equal(gate.error,'');
});
test('Unknown acknowledgements never unlock another submission before a deliberate resync',async()=>{
  let calls=0;const gate=api().gate(()=>{calls++;return new Promise(()=>{});},()=>{},()=>true,5);
  const result=await gate.run('play',{});assert.equal(result.uncertain,true);assert.equal(gate.busy,true);assert.equal(gate.uncertain,true);assert.equal((await gate.run('play',{})).blocked,true);assert.equal(calls,1);gate.invalidate();assert.equal(gate.busy,false);
});
test('Card UX roadmap covers every registered card game once and keeps all ten follow-ups planned',()=>{
  const plan=JSON.parse(readFileSync(new URL('../docs/design/card-interaction-roadmap.json',import.meta.url),'utf8'));
  const inventory=[...plan.packages,...(plan.post_baseline_games||[])];assert.equal(new Set(inventory.map(p=>p.game_id)).size,inventory.length);assert.deepEqual(inventory.map((p)=>p.game_id).sort(),Object.values(GAMES).filter((g)=>g.category==='karten').map((g)=>g.id).sort());assert.equal(new Set(plan.packages.map((p)=>p.id)).size,13);
  const future=plan.packages.filter((p)=>p.requires_separate_authorization);assert.equal(future.length,10);
  for(const p of future){assert.equal(p.status,'planned');assert.equal(p.implementation_commit,null);assert.equal(p.completed_at,null);assert.deepEqual(p.test_results,[]);assert.deepEqual(p.screenshots,[]);assert.ok(p.findings.length>=3&&p.proposal.length>=3&&p.acceptance_criteria.length>=3);assert.ok(p.effort_hours.min>0);}
  const pilots=plan.packages.filter((p)=>!p.requires_separate_authorization);assert.deepEqual(pilots.map((p)=>p.game_id).sort(),['farbenchaos','stapelrennen','zehnetappen']);
  for(const p of pilots){assert.ok(['in_progress','done'].includes(p.status));if(p.status==='done'){assert.match(p.implementation_commit,/^[a-f0-9]{40}$/);assert.match(p.completed_at,/^\d{4}-\d{2}-\d{2}$/);assert.ok(p.test_results.length&&p.screenshots.length);for(const source of p.source_audit){const text=readFileSync(new URL('../'+source.path,import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(createHash('sha256').update(text).digest('hex'),source.sha256,p.game_id);}}}
});
test('Card-game frontend sources match their original or explicitly approved shared-chip LF audits',()=>{
  const plan=JSON.parse(readFileSync(new URL('../docs/design/card-interaction-roadmap.json',import.meta.url),'utf8'));
  for(const p of plan.packages.filter((p)=>p.requires_separate_authorization))for(const source of p.source_audit){const text=readFileSync(new URL('../'+source.path,import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(createHash('sha256').update(text).digest('hex'),source.sha256,p.game_id);}
});
