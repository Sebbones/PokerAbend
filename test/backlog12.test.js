import test from 'node:test';import assert from 'node:assert/strict';
import {GAMES,PLANNED} from '../games/index.js';import {BOTS} from '../games/bots.js';import {RealtimeRoom} from '../games/realtime-room.js';import {PartyRoom} from '../games/party-room.js';import {seeded} from '../games/minenlauf/logic.js';
import {COLS,ROWS,TILE,layout,reveal,near,center,tileAt} from '../games/schatzgraeber/logic.js';
import {breakPlank} from '../games/brueckenroulette/room.js';
import {makeTask,solutions,holds,digitsOf,text} from '../games/reaktor-notfall/logic.js';
const ids=['schatzgraeber','brueckenroulette','reaktor-notfall'];
// Realtime (Schatzgräber): Person 0 ist Host; Zuschauer sitzt nicht.
function realtime(n=2,settings={}){const r=GAMES.schatzgraeber.create('TEST',{playSecs:20,...settings},()=>{});r.game='schatzgraeber';r.rng=seeded(31);const people=Array.from({length:n},(_,i)=>{const p=r.addPlayer('Player '+i);p.connected=true;r.sit(p.id);return p.id;});const watcher=r.addPlayer('Watcher');watcher.connected=true;r.start(people[0]);return {r,people,watcher:watcher.id};}
const cmd=(r,id,action,extra={})=>r.command(id,{runId:r.runId,round:r.roundNo,course:r.stage,seq:(r.commands.get(id)||0)+1,action,...extra});
const steer=(r,id,data={})=>r.input(id,{runId:r.runId,round:r.roundNo,seq:(r.inputs.get(id)?.seq||0)+1,x:0,y:0,...data});
// Party (Brückenroulette, Reaktor-Notfall): ein nicht sitzender Host, n Sitzende (optional Bots).
function party(id,n,settings={},bots=false,seed=11){const r=GAMES[id].create('TEST',{rounds:3,...settings},()=>{});r.game=id;r.rng=seeded(seed);const host=r.addPlayer('Host');host.connected=true;const people=[];for(let i=0;i<n;i++){const p=r.addPlayer('Player '+i,null,{bot:bots});p.bot=bots;p.connected=true;r.sit(p.id);people.push(p.id);}r.start(host.id);return {r,host:host.id,people};}
const pick=(r,id,plank)=>r.choose(id,{key:r.runKey,question:r.questionKey,plank});
const code=(r,id,value)=>r.propose(id,{key:r.runKey,question:r.questionKey,code:value});

test('BACKLOG-12 scope: exactly the three approved games are playable with bots; no other planned entry was pulled in',()=>{
 for(const id of ids){assert.ok(!PLANNED.some(p=>p.id===id));assert.equal(typeof BOTS[id],'function');}
 assert.deepEqual(PLANNED.map(p=>p.id),[]);
 for(const id of ['survival-abend','chaos-modus','modifikatoren','party-brett'])assert.equal(GAMES[id],undefined,'Party features remain options/programs, not games');
 const {r}=realtime();assert.ok(r instanceof RealtimeRoom);assert.equal(r.personalFrames,true);r.dispose();
 for(const id of ids.slice(1)){const {r}=party(id,GAMES[id].minPlayers);assert.ok(r instanceof PartyRoom);r.dispose();}
 assert.deepEqual(ids.map(id=>[GAMES[id].minPlayers,GAMES[id].maxPlayers]),[[2,8],[3,8],[2,8]]);
});
test('Treasure Diggers: layout is deterministic, disjoint, in range and scales with the player count',()=>{
 for(let n=2;n<=8;n++){const a=layout(n,seeded(n)),b=layout(n,seeded(n));assert.deepEqual([...a.treasure],[...b.treasure]);assert.equal(a.treasure.size,Math.min(36,8+3*n));assert.equal(a.bomb.size,Math.min(14,6+n));for(const t of a.treasure){assert.ok(t>=0&&t<COLS*ROWS);assert.ok(!a.bomb.has(t));}}
 const f={treasure:new Set([1,13]),bomb:new Set([12])};assert.deepEqual(reveal(f,0),{i:0,k:'empty',t:2,b:1});assert.equal(near(0).length,3);assert.equal(near(13).length,8);
});
test('Treasure Diggers: dig stands still 0.7 s, then reveals; treasure scores once, repeat and parallel digs are refused or wasted',()=>{
 const {r,people:[a,b]}=realtime();try{r.elapsed=0;r.field={treasure:new Set([tileAt({x:450,y:300})]),bomb:new Set()};const p=r.bodies[0],q=r.bodies[1];Object.assign(p,{x:450,y:300});Object.assign(q,{x:455,y:305});
  cmd(r,a,'dig',{score:99,tile:5,found:'treasure'});assert.equal(p.digUntil,700);assert.throws(()=>cmd(r,a,'dig'),/gräbst/);
  cmd(r,b,'dig');steer(r,a,{x:1});r.step();assert.equal(p.x,450);for(let i=0;i<14;i++)r.step();
  assert.equal(r.dug.size,1);assert.equal(p.bag,1);assert.equal(q.bag,0);assert.equal(r.points[a],1);assert.equal(r.points[b],0);assert.equal(r.left,0);assert.equal(r.phase,'over');assert.deepEqual(r.result.winners,[a]);
 }finally{r.dispose();}
 const {r:s,people:[c]}=realtime();try{s.elapsed=0;s.field={treasure:new Set([200]),bomb:new Set()};Object.assign(s.bodies[0],{x:450,y:300});cmd(s,c,'dig');for(let i=0;i<14;i++)s.step();assert.throws(()=>cmd(s,c,'dig'),/schon gegraben/);assert.equal(s.dug.get(tileAt({x:450,y:300})).k,'empty');}finally{s.dispose();}
});
test('Treasure Diggers: bombs throw back, stun for 1.5 s and never score; empty tiles publish neighbour counts only',()=>{
 const {r,people:[a]}=realtime();try{r.elapsed=0;const i=tileAt({x:450,y:300});r.field={treasure:new Set([i+1,i-1]),bomb:new Set([i])};const p=r.bodies[0];Object.assign(p,{x:450,y:300,facing:{x:1,y:0}});cmd(r,a,'dig');for(let k=0;k<14;k++)r.step();
  assert.equal(r.dug.get(i).k,'bomb');assert.equal(p.bag,0);assert.equal(p.x,355);assert.ok(p.stunUntil>r.elapsed);assert.throws(()=>cmd(r,a,'dig'),/benommen/);const x=p.x;steer(r,a,{x:1});r.step();assert.equal(p.x,x);
  r.elapsed=p.stunUntil;Object.assign(p,{x:center(i+COLS).x,y:center(i+COLS).y});cmd(r,a,'dig');for(let k=0;k<14;k++)r.step();const hint=r.dug.get(i+COLS);assert.deepEqual([hint.k,hint.t,hint.b],['empty',2,1]);
 }finally{r.dispose();}
});
test('Treasure Diggers: no view, packet or bot decision reveals an undug tile; mutating the hidden field changes nothing public',()=>{
 const {r,people:[a,b],watcher}=realtime(3);try{r.elapsed=0;const before=[a,b,watcher,null].map(id=>JSON.stringify(r.gameView(id)));r.field=layout(3,seeded(99));const after=[a,b,watcher,null].map(id=>JSON.stringify(r.gameView(id)));assert.deepEqual(after,before);
  for(const s of after){assert.ok(!s.includes('"field"'));assert.ok(!s.includes('"treasure":['));assert.ok(!s.includes('"seed"'));assert.ok(!s.includes('"rng"'));}
  const reqs=[];r.perform=p=>reqs.push(p.id);Object.assign(r.bodies[0],{x:center(10).x,y:center(10).y});r.botStep(a);const first=JSON.stringify([r.inputs.get(a),reqs]);r.field=layout(3,seeded(3));r.inputs.delete(a);reqs.length=0;r.botStep(a);assert.equal(JSON.stringify([r.inputs.get(a),reqs]),first);
 }finally{r.dispose();}
});
test('Treasure Diggers referee: spectators, stale nonces, malformed or forged commands and paused rooms are rejected; clock decides the end',()=>{
 const {r,people:[a,b],watcher}=realtime();try{r.elapsed=0;assert.throws(()=>cmd(r,watcher,'dig'));assert.throws(()=>cmd(r,a,'bogus'));assert.throws(()=>cmd(r,a,'dig',{runId:'old'}));assert.throws(()=>cmd(r,a,'dig',{seq:0}));for(const d of [{x:.5},{jump:true},{seq:0},{round:0}])assert.throws(()=>steer(r,a,d));
  assert.throws(()=>r.setGamePaused(b,true));r.setGamePaused(a,true);const tick=r.tickNo;r.step();assert.equal(r.tickNo,tick);assert.throws(()=>cmd(r,a,'dig'));r.setGamePaused(a,false);
  r.clock.now=()=>r.startedAt+r.phaseEnd+1;assert.throws(()=>cmd(r,a,'dig'),/Zeit/);
 }finally{r.dispose();}
 const {r:q,people:[c]}=realtime();try{q.stand(c);assert.equal(q.phase,'over');assert.deepEqual(q.result.points,{});const clone=GAMES.schatzgraeber.restore(q.snapshot(),()=>{});assert.equal(clone.phase,'lobby');clone.dispose();}finally{q.dispose();}
});
test('Treasure Diggers: 60 complete bot games, 2-8 players, treasure conservation at every tick and finite results',()=>{
 for(let n=0;n<60;n++){const count=2+n%7,{r,people}=realtime(count,{playSecs:20});try{let tick=0;while(r.phase==='playing'&&tick++<1500){if(r.elapsed>=0&&tick%4===0)for(const p of people)r.botStep(p);r.step();const found=r.bodies.reduce((s,p)=>s+p.bag,0);assert.equal(found+r.left,r.field.treasure.size);assert.ok(r.bodies.every(p=>Number.isFinite(p.x)&&p.x>=18&&p.x<=882&&p.y>=18&&p.y<=582));}
  assert.equal(r.phase,'over');assert.ok(r.result.winners.every(id=>people.includes(id)));assert.ok(Object.values(r.result.points).every(v=>Number.isInteger(v)&&v>=0));}finally{r.dispose();}}
});
test('Bridge Roulette: plank rule is exact — fullest or emptiest occupied plank breaks, ties use server randomness, empty planks never break',()=>{
 assert.equal(breakPlank([3,1,0],false,()=>.9),0);assert.equal(breakPlank([3,1,0],true,()=>.9),1);assert.equal(breakPlank([0,0,4],true,()=>.1),2);
 const seen=new Set();for(let i=0;i<60;i++)seen.add(breakPlank([2,2,1],false,seeded(i)));assert.deepEqual([...seen].sort(),[0,1]);
 const hits=[0,0,0];for(let i=0;i<300;i++)hits[breakPlank([1,1,1],false,seeded(i*7+1))]++;assert.ok(hits.every(n=>n>40),hits.join());assert.equal(breakPlank([0,0,0],false,()=>0),null);
});
test('Bridge Roulette: choices are final and private until the reveal; stale, malformed and spectator choices are rejected',()=>{
 const {r,host,people:[a,b,c]}=party('brueckenroulette',3,{rounds:2});try{
  assert.throws(()=>pick(r,host,0));assert.throws(()=>r.choose(a,{key:'old',question:r.questionKey,plank:0}));for(const plank of [-1,3,1.5,'1',null])assert.throws(()=>pick(r,a,plank));
  pick(r,a,2);assert.throws(()=>pick(r,a,1),/endgültig/);assert.equal(r.gameView(a).own,2);for(const id of [b,host,null]){const v=r.gameView(id),s=JSON.stringify(v);assert.equal(v.own??null,null);assert.ok(!('outcome'in v));assert.ok(!s.includes('"rows"'));assert.ok(!s.includes('"plank"'));}
  r.setGamePaused(host,true);assert.throws(()=>pick(r,b,0));r.setGamePaused(host,false);
  pick(r,b,2);pick(r,c,1);assert.equal(r.stage,'reveal');const o=r.gameView(host).outcome;assert.equal(o.broken,2);assert.deepEqual(o.counts,[0,1,2]);assert.deepEqual(o.rows.map(x=>x.lost),[true,true,false]);assert.equal(r.lost[a],1);assert.equal(r.gamePts[c],1);
 }finally{r.dispose();}
});
test('Bridge Roulette: timeouts assign server planks, four planks and emptiest rule work, winners have the fewest lost points, ties share',()=>{
 let {r,host,people:[a,b,c]}=party('brueckenroulette',3,{rounds:2,fourPlanks:true,emptiest:true});try{assert.equal(r.gameView(a).planks,4);pick(r,a,3);pick(r,b,3);pick(r,c,0);assert.equal(r.outcome.broken,0);assert.equal(r.lost[c],1);r.next(host);r.advance();assert.equal(r.stage,'reveal');assert.ok(r.outcome.rows.every(x=>x.auto));assert.ok(r.outcome.rows.every(x=>x.plank>=0&&x.plank<4));r.next(host);assert.equal(r.phase,'over');const lost=Object.values(r.lost);assert.equal(lost.reduce((s,n)=>s+n,0)>=2,true);const fewest=Math.min(...lost);assert.deepEqual(new Set(r.result.winners),new Set([a,b,c].filter(id=>r.lost[id]===fewest)));}finally{r.dispose();}
});
test('Bridge Roulette: 80 complete bot games for 3-8 players keep exact loss accounting, bounded rounds and valid winners',()=>{
 for(let n=0;n<80;n++){const count=3+n%6,rounds=1+n%8,{r,host,people}=party('brueckenroulette',count,{rounds,fourPlanks:n%3===0,emptiest:n%4===0},true,n);try{let guard=0;while(r.phase==='playing'&&guard++<400){if(r.stage==='reveal')r.next(host);else{const id=r.botDue();assert.ok(id);r.botStep(id);}}
  assert.equal(r.phase,'over');assert.ok(r.result.winners.length>=1&&r.result.winners.every(id=>people.includes(id)));for(const id of people)assert.equal(r.lost[id]+r.gamePts[id],rounds);const total=people.reduce((s,id)=>s+r.lost[id],0);assert.ok(total>=rounds);}finally{r.dispose();}}
});
test('Reactor Emergency: 700 generated tasks are unique, truthful, fully dealt and never solvable by one player alone',()=>{
 let seen=new Set();for(let seed=0;seed<100;seed++)for(let players=2;players<=8;players++){const index=seed%6,rng=seeded(seed*31+players),t=makeTask(index,players,rng);
  assert.equal(t.len,index<2?3:4);assert.deepEqual(solutions(t.len,t.clues),[t.solution]);const d=t.solution.split('').map(Number);assert.ok(t.clues.every(c=>holds(c,d)));
  assert.equal(t.hands.length,players);assert.ok(t.hands.every(h=>h.length>=1));assert.deepEqual(t.hands.flat().sort((a,b)=>a-b),t.clues.map((_,i)=>i));for(const h of t.hands)assert.ok(solutions(t.len,h.map(i=>t.clues[i])).length>1);seen.add(t.solution);for(const c of t.clues)assert.ok(text(c).every(s=>s.length>10));}
 assert.ok(seen.size>150);assert.deepEqual(digitsOf(407,4),[0,4,0,7]);
});
test('Reactor Emergency: private hands, public proposals, no solution before the reveal; spectators see no clues',()=>{
 const {r,host,people:[a,b]}=party('reaktor-notfall',2,{rounds:2});try{const va=r.gameView(a),vb=r.gameView(b),vh=r.gameView(host);const hand=(id)=>r.handOf(id).map(c=>text(c)[0]);
  assert.ok(va.mine.length>=1&&vb.mine.length>=1);assert.deepEqual(vh.mine,[]);assert.ok(!('result'in vh)&&!('result'in va)&&!('result'in vb));
  for(const [me,other,view] of [[a,b,va],[b,a,vb]]){const s=JSON.stringify(view);for(const line of hand(other))assert.ok(!s.includes(line)||hand(me).includes(line),line);assert.ok(!('result'in view));assert.ok(!s.includes('"solution"'));}
  code(r,a,'0'.repeat(r.cur.len));assert.deepEqual(r.gameView(host).proposals,{[a]:'0'.repeat(r.cur.len)});assert.deepEqual(r.gameView(b).proposals,r.gameView(a).proposals);assert.equal(r.gameView(host).shared.length,0);
 }finally{r.dispose();}
});
test('Reactor Emergency: disagreement is free, a wrong shared code costs the penalty and clears proposals, the right code scores 100 for everyone',()=>{
 const {r,host,people:[a,b]}=party('reaktor-notfall',2,{rounds:2,penaltySecs:20,heatSecs:240});try{
  const len=r.cur.len,solution=r.cur.solution,wrong=solution.replace(/\d$/,d=>String((Number(d)+1)%10)),other=solution.replace(/^\d/,d=>String((Number(d)+2)%10));
  assert.throws(()=>code(r,a,'12'));assert.throws(()=>code(r,a,'abc'+'1'.repeat(len)));assert.throws(()=>r.propose(a,{key:'old',question:r.questionKey,code:solution}));assert.throws(()=>code(r,host,solution));
  const heat=r.remaining();code(r,a,wrong);code(r,b,other);assert.equal(r.mistakes,0);assert.equal(r.stage,'write');assert.equal(Object.keys(r.gameView(host).proposals).length,2);
  code(r,b,wrong);assert.equal(r.mistakes,1);assert.equal(r.proposals.size,0);assert.ok(r.remaining()<=heat-20000+50);assert.equal(r.stage,'write');
  code(r,a,solution);assert.equal(r.stage,'write');code(r,b,solution);assert.equal(r.stage,'reveal');assert.equal(r.gamePts[a],100);assert.equal(r.gamePts[b],100);const res=r.gameView(host).result;assert.equal(res.code,solution);assert.equal(res.solved,true);assert.equal(res.clues.length,r.cur.clues.length);
  assert.throws(()=>code(r,a,solution));r.next(host);assert.equal(r.q,1);assert.equal(r.stage,'write');
  const second=r.cur.solution;code(r,a,second);code(r,b,second);r.next(host);assert.equal(r.phase,'over');assert.deepEqual(new Set(r.result.winners),new Set([a,b]));assert.deepEqual(r.result.points,{[a]:200,[b]:200});
 }finally{r.dispose();}
});
test('Reactor Emergency: the host cannot skip an unsolved reactor; the overheating clock ends the game with no winner but keeps earned points',()=>{
 const {r,host,people:[a,b]}=party('reaktor-notfall',2,{rounds:3});try{assert.throws(()=>r.next(host),/überspringen/);const s=r.cur.solution;code(r,a,s);code(r,b,s);assert.equal(r.stage,'reveal');r.next(host);assert.equal(r.q,1);
  r.heatLeft=0;r.writeStart=r.clock.now();r.advance();assert.equal(r.stage,'reveal');assert.equal(r.gameView(host).result.solved,false);r.next(host);assert.equal(r.phase,'over');assert.deepEqual(r.result.winners,[]);assert.deepEqual(r.result.points,{[a]:100,[b]:100});
 }finally{r.dispose();}
 const {r:q,host:h,people:[c,d]}=party('reaktor-notfall',2,{rounds:2,penaltySecs:60,heatSecs:60});try{const s=q.cur.solution,wrong=s.replace(/\d$/,x=>String((Number(x)+1)%10));code(q,c,wrong);code(q,d,wrong);assert.equal(q.stage,'reveal');assert.equal(q.failed,true);q.next(h);assert.equal(q.phase,'over');assert.deepEqual(q.result.winners,[]);}finally{q.dispose();}
});
test('Reactor Emergency: bots read their clues aloud, deduce the unique code and adopt a human proposal; 40 all-bot-plus-oracle games finish',()=>{
 for(let n=0;n<40;n++){const count=2+n%7,{r,host,people}=party('reaktor-notfall',count,{rounds:1+n%3},true,n);try{let guard=0;while(r.phase==='playing'&&guard++<400){if(r.stage==='reveal'){r.next(host);continue;}const id=r.botDue();assert.ok(id,'bots stuck '+n);r.botStep(id);}
  assert.equal(r.phase,'over');assert.equal(r.result.winners.length,count);assert.ok(Object.values(r.result.points).every(v=>v>=100&&v%100===0));assert.equal(r.failed,false);}finally{r.dispose();}}
 const {r}=party('reaktor-notfall',3,{rounds:1},true);try{const shared=r.gameView(null).shared;assert.ok(shared.length>=3);assert.ok(shared.every(x=>r.order.includes(x.by)&&x.clue&&x.text.length===2));assert.ok(!('result'in r.gameView(null)));}finally{r.dispose();}
});
test('Party games: leaving the table never fabricates a winner and rooms restore safely',()=>{
 for(const id of ids.slice(1)){const {r,people:[a]}=party(id,GAMES[id].minPlayers);try{r.stand(a);if(r.phase==='over')assert.deepEqual(r.result.winners,[]);const clone=GAMES[id].restore(r.snapshot(),()=>{});assert.ok(['lobby','playing','over'].includes(clone.phase));clone.dispose();}finally{r.dispose();}}
});
