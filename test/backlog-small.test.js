import test from 'node:test';
import assert from 'node:assert/strict';
import {GAMES,PLANNED} from '../games/index.js';
import {resolvedRoadmap} from '../games/roadmap.js';
import {BOTS} from '../games/bots.js';
import {makeQuestion,inferNext,parseGuess} from '../games/zahlenreihe/room.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const write=(r,...args)=>r.write(...args,r.roundKey);
const guess=(r,...args)=>r.guess(...args,r.roundKey);
function table(t,game,settings={},count){const r=GAMES[game].create('SMALL',settings,()=>{});r.game=game;t.after(()=>r.dispose());const people=Array.from({length:count||GAMES[game].minPlayers},(_,i)=>{const p=r.addPlayer('Person '+i,null);p.connected=true;r.sit(p.id);return p;});const watcher=r.addPlayer('Robin',null);watcher.connected=true;r.start(people[0].id);return {r,ids:people.map((p)=>p.id),watcher:watcher.id};}

test('Small backlog package: three real games leave the backlog and keep the 41-item progress honest',()=>{
  const ids=['risiko-wuerfeln','story-chaos','zahlenreihe'],section=resolvedRoadmap().find((s)=>s.id==='spaetere-spiele');
  assert.equal(section.punkte.length,41);for(const id of ids)assert.ok(section.punkte.find((p)=>p.id===id)?.erledigt);
  for(const id of ids){assert.ok(GAMES[id]?.events);assert.ok(!PLANNED.some((p)=>p.id===id));assert.equal(typeof BOTS[id],'function');}
  const progress=JSON.parse(readFileSync(new URL('../docs/backlog/plan.json',import.meta.url),'utf8'));assert.equal(progress.total_count,41);assert.equal(progress.completed_count,section.punkte.filter((p)=>p.erledigt).length);assert.equal(progress.remaining_count,41-progress.completed_count);assert.equal(new Set(progress.games.map((g)=>g.id)).size,41);
  for(const g of progress.games){if(g.status==='planned'){assert.equal(GAMES[g.id],undefined);assert.equal(g.implementation_commit,null);assert.deepEqual(g.test_results,[]);assert.deepEqual(g.screenshots,[]);}else{assert.ok(GAMES[g.id]);assert.ok(['verified','done'].includes(g.status));if(g.status==='done'){assert.match(g.implementation_commit,/^[a-f0-9]{40}$/);assert.ok(g.test_results.length);}}}
  const manifest=JSON.parse(readFileSync(new URL('../docs/backlog/screenshots.json',import.meta.url),'utf8'));assert.equal(manifest.screenshots.length,26);for(const p of manifest.screenshots)assert.equal(createHash('sha256').update(readFileSync(new URL('../'+p.path,import.meta.url))).digest('hex'),p.sha256,p.path);
});
test('Risk Dice: a one loses only the unsecured points; banking commits once and switches the turn',t=>{
  const {r,ids:[a,b]}=table(t,'risiko-wuerfeln',{target:20});let throws=[6,5,1];r.roll=()=>throws.shift();
  assert.throws(()=>r.bank(a),/Erst/);r.throwDice(a);r.throwDice(a);assert.equal(r.pot,11);assert.equal(r.banked[a],0);r.bank(a);assert.equal(r.banked[a],11);assert.equal(r.currentId,b);assert.throws(()=>r.bank(a),/nicht dran/);
  r.throwDice(b);assert.equal(r.banked[a],11);assert.equal(r.banked[b],0);assert.equal(r.pot,0);assert.equal(r.currentId,a);assert.equal(r.lastBust.id,b);
});
test('Risk Dice: secure scoring, spectator/turn/pause checks, timeout and no mutable view references',t=>{
  const {r,ids:[a,b],watcher}=table(t,'risiko-wuerfeln',{target:20});r.roll=()=>5;
  assert.throws(()=>r.throwDice(watcher),/nicht dran/);assert.throws(()=>r.throwDice(b),/nicht dran/);
  r.setGamePaused(a,true);assert.throws(()=>r.throwDice(a),/angehalten/);r.setGamePaused(a,false);
  r.onTimeout(a);assert.equal(r.pot,5);const view=r.view(a);view.g.banked[a]=9999;assert.equal(r.banked[a],0);r.onTimeout(a);assert.equal(r.banked[a],5);
  r.banked[b]=15;r.throwDice(b);r.bank(b);assert.equal(r.phase,'over');assert.deepEqual(r.result.winners,[b]);assert.equal(r.result.points[b],20);assert.throws(()=>r.bank(b),/keine Runde/);
});
test('Story Chaos: only the active player gets the previous sentence; host, spectators and logs cannot read the chain',t=>{
  const {r,ids:[a,b,c],watcher}=table(t,'story-chaos',{cycles:1});write(r,a,'GEHEIM_ALPHA',0,1);
  assert.equal(r.view(b).g.previous.text,'GEHEIM_ALPHA');
  for(const id of [c,watcher])assert.ok(!JSON.stringify(r.view(id)).includes('GEHEIM_ALPHA'));
  assert.equal(r.view(a).g.story,null);assert.equal(r.view(a).g.previous,null);assert.ok(!JSON.stringify(r.log).includes('GEHEIM_ALPHA'));assert.ok(!JSON.stringify(r.moves).includes('GEHEIM_ALPHA'));
  write(r,b,'GEHEIM_BETA',1,1);assert.ok(!JSON.stringify(r.view(a)).includes('GEHEIM_BETA'));assert.equal(r.view(c).g.previous.text,'GEHEIM_BETA');
  write(r,c,'ENDE_GAMMA',2,1);assert.equal(r.phase,'over');for(const id of [a,b,c,watcher])assert.deepEqual(r.view(id).g.story.map((s)=>s.text),['GEHEIM_ALPHA','GEHEIM_BETA','ENDE_GAMMA']);assert.deepEqual(r.result.winners,[]);
});
test('Story Chaos: stale steps/rounds, invalid input, paused submissions and repeated sends do not mutate the story',t=>{
  const {r,ids:[a,b],watcher}=table(t,'story-chaos',{cycles:2});
  for(const args of [[watcher,'x',0,1],[b,'x',0,1],[a,'x',9,1],[a,'x',0,8],[a,' '.repeat(3),0,1],[a,'x'.repeat(241),0,1],[a,{},0,1]])assert.throws(()=>write(r,...args));assert.equal(r.sentences.length,0);
  r.setGamePaused(a,true);assert.throws(()=>write(r,a,'Pause',0,1),/angehalten/);r.setGamePaused(a,false);
  write(r,a,'<script>alert(1)</script>',0,1);assert.equal(r.sentences[0].text,'<script>alert(1)</script>');assert.throws(()=>write(r,a,'double',0,1),/nicht dran/);
  r.onTimeout(b);assert.equal(r.sentences[1].automatic,true);assert.equal(r.view(b).g.own.length,1);
  const oldKey=r.roundKey;r.abortRound(a);assert.equal(r.phase,'lobby');assert.equal(r.sentences.length,0);r.start(a);assert.throws(()=>r.write(a,'alter Entwurf',0,r.roundNo,oldKey),/aktuell/);assert.equal(r.sentences.length,0);
});
test('Story Chaos: dropping the writer advances and adjusts quotas; a lone player is never awarded a fake story win',t=>{
  const {r,ids:[a,b,c,d]}=table(t,'story-chaos',{cycles:1},4);write(r,a,'Anfang',0,1);r.stand(b);assert.equal(r.currentId,c);assert.equal(r.total,3);write(r,c,'Mitte',1,1);assert.equal(r.currentId,d);r.botStep(d,()=>0);assert.equal(r.phase,'over');assert.equal(r.sentences.length,3);
  const second=table(t,'story-chaos',{cycles:1});second.r.stand(second.ids[0]);second.r.stand(second.ids[1]);assert.equal(second.r.phase,'over');assert.deepEqual(second.r.result.winners,[]);assert.deepEqual(second.r.result.points,{});
});
test('Number sequence: generator and public-only solver cover the five rule families and both hole counts',()=>{
  for(const holes of [false,true])for(let family=0;family<4;family++)for(let seed=1;seed<=25;seed++){
    let call=0;const rng=(max)=>{const n=call++===0?family:seed;return n%max;};const q=makeQuestion(5,holes,rng);assert.equal(q.series.length,6);assert.equal(q.answer.length,holes?2:1);assert.deepEqual(inferNext(q.series,q.answer.length),q.answer);assert.ok([...q.series,...q.answer].every((n)=>Number.isSafeInteger(n)&&n>=0&&n<=1000000));assert.ok(q.explanation&&q.explanationEn);
  }
  assert.deepEqual(inferNext([3,6,9,12,15,18],2),[21,24]);assert.deepEqual(inferNext([1,2,3,5,8,13],2),[21,34]);
  for(const input of ['',null,{},'NaN','Infinity','1e3','1.5','999999999','1 2'])assert.equal(parseGuess(input,1),null);
  assert.deepEqual(parseGuess('-2; 5',2),[-2,5]);assert.deepEqual(parseGuess('42',1),[42]);
});
test('Number sequence: answers are final and private; scoring and fastest ties use server arrival only',t=>{
  t.mock.timers.enable({apis:['Date'],now:100000});
  const {r,ids:[a,b],watcher}=table(t,'zahlenreihe',{rounds:1,spectators:true});const answer=r.cur.answer.join(' ');
  assert.equal(r.view(a).g.reveal,null);assert.ok(!('answer' in r.view(watcher).g));assert.throws(()=>guess(r,a,answer,8,1),/aktuell/);
  guess(r,a,answer,1,1);assert.throws(()=>guess(r,a,'1',1,1),/bereits/);assert.equal(r.view(b).g.mine,null);assert.equal(r.view(b).g.reveal,null);assert.equal(r.stage,'write');
  guess(r,watcher,answer,1,1);guess(r,b,answer,1,1);assert.equal(r.stage,'reveal');const result=r.reveal.guesses;assert.equal(result.find((g)=>g.id===watcher).pts,0);assert.equal(result.find((g)=>g.id===a).pts,150);assert.equal(result.find((g)=>g.id===b).pts,150);
  r.next(a);assert.equal(r.phase,'over');assert.deepEqual(r.result.winners,[a,b]);
});
test('Number sequence: pause time does not consume a speed bonus and expired/stale input cannot answer a later question',t=>{
  t.mock.timers.enable({apis:['setTimeout','Date'],now:100000});const {r,ids:[a,b]}=table(t,'zahlenreihe',{rounds:2,writeSecs:20,speedBonus:false});
  t.mock.timers.tick(500);r.setGamePaused(a,true);t.mock.timers.tick(10000);assert.throws(()=>guess(r,a,'1',1,1),/angehalten/);r.setGamePaused(a,false);t.mock.timers.tick(500);
  guess(r,a,r.cur.answer.join(' '),1,1);assert.equal(r.answers[a].at,1000);guess(r,b,r.cur.answer.join(' '),1,1);assert.ok(r.reveal.guesses.every((g)=>g.pts===100));r.next(a);assert.equal(r.q,1);assert.throws(()=>guess(r,a,'1',1,1),/aktuell/);
  const oldKey=r.roundKey;r.abortRound(a);r.start(a);assert.throws(()=>r.guess(a,r.cur.answer.join(' '),1,r.roundNo,oldKey),/aktuell/);
  r.next(a);assert.equal(r.stage,'reveal');assert.deepEqual(r.reveal.missing,[a,b]);r.next(a);r.next(a);r.next(a);assert.equal(r.phase,'over');
});
test('Small backlog package: deterministic bot simulations finish without inventing points or exposing hidden story text',t=>{
  for(const game of ['risiko-wuerfeln','story-chaos','zahlenreihe'])for(let trial=0;trial<30;trial++){
    const {r,ids}=table(t,game,{target:20,cycles:1,rounds:2});let k=0;
    if(game==='risiko-wuerfeln'){let n=0;r.roll=()=>[2,5,6,1,4,3][n++%6];}
    while(r.phase==='playing'&&k++<300){if(game==='zahlenreihe'){if(r.stage==='reveal')r.next(ids[0]);else for(const id of [...r.order])if(!r.answers[id])r.botStep(id,()=>.2);}else BOTS[game](r,r.currentId,()=>.2);}
    assert.equal(r.phase,'over',game);assert.ok(r.result);r.dispose();
  }
});
