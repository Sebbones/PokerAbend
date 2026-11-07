import test from 'node:test';
import assert from 'node:assert/strict';
import * as sdk from '../public/singleplayer/sudoku-logic.js';
import * as n from '../public/singleplayer/2048-logic.js';
import * as td from '../public/singleplayer/wellenwacht-logic.js';
import * as saves from '../public/singleplayer/storage.js';
import {GAMES,PLAYABLE_GAMES,singleplayerGameList,gameEvents,PLANNED} from '../games/index.js';
import {resolvedRoadmap} from '../games/roadmap.js';

test('single player is a separate catalog; only registered multiplayer games provide room events and programs',()=>{
  assert.ok(Object.keys(GAMES).length>=58);assert.equal(Object.keys(PLAYABLE_GAMES).length,Object.keys(GAMES).length+singleplayerGameList().length);
  assert.deepEqual(singleplayerGameList().map((g)=>g.id).sort(),['2048','block-puzzle','mahjong-solitaire','match-3','memory','minesweeper','nonogramm','snake','sokoban','solitaire','sudoku','wellenwacht']);
  for(const g of singleplayerGameList()){assert.equal(g.local,true);assert.equal(g.minPlayers,1);assert.equal(g.maxPlayers,1);assert.equal(GAMES[g.id],undefined);assert.equal(g.create,undefined);assert.ok(g.art.includes('<svg'));}
  assert.ok(!gameEvents().some((e)=>e.startsWith('singleplayer')));
  const planned=PLANNED.filter((p)=>p.paeckchen==='solo-zukunft');assert.equal(planned.length,0,'alle neun Solo-Pakete sind umgesetzt');
  for(const p of planned){assert.equal(p.status,'planned');assert.ok(!PLAYABLE_GAMES[p.id]);for(const k of ['features','dependencies','acceptance'])assert.ok(p[k].length);}
  for(const id of ['puzzle-panik','wortjagd'])assert.ok(PLANNED.some((p)=>p.id===id));
  assert.equal(typeof GAMES.minenlauf.create,'function');assert.equal(GAMES.minenlauf.bauart,'B');
  assert.ok(!singleplayerGameList().some(g=>g.id==='minenlauf'));assert.equal(GAMES.minesweeper,undefined);
  const roadmap=resolvedRoadmap();assert.equal(roadmap.find((e)=>e.id==='einzelspieler-zukunft').punkte.length,9);
  assert.equal(roadmap.find((e)=>e.id==='einzelspieler-zukunft').punkte.filter(p=>p.erledigt).length,9);
  assert.ok(roadmap.find((e)=>e.id==='einzelspieler-start').punkte.every((p)=>p.erledigt&&p.spiel.local));
});
for(const difficulty of Object.keys(sdk.DIFFICULTIES))test(`Sudoku ${difficulty}: 24 seeds generate unique, consistent and reproducible puzzles`,()=>{
  for(let seed=1;seed<=24;seed++){const p=sdk.generate(seed,difficulty),r=sdk.solve(p.givens);assert.equal(r.count,1);assert.deepEqual(r.solution,p.solution);assert.equal(sdk.conflicts(p.solution).length,0);assert.ok(p.givens.filter(Boolean).length>=sdk.DIFFICULTIES[difficulty]);assert.ok(p.givens.filter(Boolean).length<50);if(seed===1)assert.deepEqual(p,sdk.generate(seed,difficulty));}
});
test('Sudoku candidates, fixed clues, notes, undo/redo, hint, pause and completion',()=>{
  const s=sdk.create({seed:7}),i=s.selected,v=s.solution[i];s.selected=s.givens.findIndex(Boolean);const before=structuredClone(s);assert.equal(sdk.input(s,3),false);assert.deepEqual(s,before);
  s.selected=i;s.pencil=true;assert.ok(sdk.input(s,v));assert.equal(s.notes[i],1<<(v-1));assert.equal(s.values[i],0);sdk.undo(s);assert.equal(s.notes[i],0);sdk.undo(s,true);assert.equal(s.notes[i],1<<(v-1));
  s.pencil=false;sdk.input(s,v);assert.equal(s.notes[i],0);sdk.undo(s);assert.equal(s.values[i],0);sdk.undo(s,true);assert.equal(s.values[i],v);
  s.paused=true;assert.equal(sdk.hint(s),false);assert.equal(sdk.input(s,1),false);assert.equal(sdk.undo(s),false);s.paused=false;
  sdk.fillNotes(s);s.values.forEach((v,i)=>{if(!v)assert.equal(s.notes[i],sdk.candidates(s.values,i));});
  while(s.status==='playing')sdk.hint(s);assert.equal(s.status,'won');assert.deepEqual(s.values,s.solution);assert.equal(sdk.solve(Array(81).fill(0)).count,2);
});
test('Sudoku restores safely, forces pause, rejects impossible/ambiguous puzzles and forged history',()=>{
  const s=sdk.create();sdk.hint(s);assert.equal(sdk.restore(s).paused,true);assert.deepEqual(sdk.restore(s).values,s.values);
  for(const bad of [{...s,givens:Array(81).fill(0)},{...s,notes:Array(81).fill(512)},{...s,elapsedMs:Infinity},{...s,undo:[{values:Array(81).fill(0),notes:s.notes}]}])assert.equal(sdk.restore(bad),null);
  const altered=structuredClone(s);altered.undo[0].poison=true;assert.equal(sdk.restore(altered).undo[0].poison,undefined);
});
test('2048 merges each tile exactly once in every direction',()=>{
  for(const [input,output,gain] of [[[2,2,2,2],[4,4,0,0],8],[[2,2,4,0],[4,4,0,0],4],[[4,4,8,8],[8,16,0,0],24],[[2,0,2,2],[4,2,0,0],4],[[4,2,4,2],[4,2,4,2],0]]){assert.deepEqual(n.mergeLine(input).line,output);assert.equal(n.mergeLine(input).gain,gain);}
  for(const dir of ['left','right','up','down']){const s=n.create();s.board=Array(16).fill(2);const r=n.move(s,dir);assert.ok(r.changed);assert.equal(s.score,32);assert.equal(s.board.filter((v)=>v===4).length,8);assert.equal(s.board.filter(Boolean).length,9);}
});
test('2048 invalid moves never spawn or change RNG; undo, win/continue, loss and save',()=>{
  const s=n.create();s.board=[2,4,8,16,...Array(12).fill(0)];const original=structuredClone(s);assert.equal(n.move(s,'left').changed,false);assert.deepEqual(s,original);
  assert.ok(n.move(s,'down').changed);assert.equal(s.undo.length,1);n.undo(s);assert.deepEqual(s,original);
  s.board=[1024,1024,...Array(14).fill(0)];n.move(s,'left');assert.equal(s.status,'won');assert.equal(s.score,2048);assert.ok(n.continueGame(s));assert.equal(s.status,'playing');
  s.board=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];n.move(s,'left');assert.equal(s.status,'lost');assert.equal(n.restore(s).paused,true);
  const bad=structuredClone(s);bad.board[0]=3;assert.equal(n.restore(bad),null);
  const poison=structuredClone(s);poison.undo=[{...original,undo:['bad'],paused:false}];const restored=n.restore(poison);restored.paused=false;n.undo(restored);assert.deepEqual(restored.undo,[]);assert.equal(restored.paused,false);
});
test('local saves are versioned, bounded and recover safely from bad data or denied storage',()=>{
  const data=new Map(),storage={getItem:(k)=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(saves.load(storage,'2048',n.restore).status,'empty');assert.ok(saves.save(storage,'2048',n.create()));assert.equal(saves.load(storage,'2048',n.restore).state.paused,true);
  data.set(saves.key('2048'),'broken');assert.equal(saves.load(storage,'2048',n.restore).status,'corrupt');
  data.set(saves.key('2048'),JSON.stringify({version:999,id:'2048',updatedAt:0,state:{}}));assert.equal(saves.load(storage,'2048',n.restore).status,'version');
  data.set(saves.key('2048'),'x'.repeat(250001));assert.equal(saves.load(storage,'2048',n.restore).status,'corrupt');
  const denied={getItem(){throw Error();},setItem(){throw Error();}};assert.equal(saves.load(denied,'sudoku',sdk.restore).status,'unavailable');assert.equal(saves.save(denied,'sudoku',sdk.create()),false);assert.throws(()=>saves.key('poker'));
});
test('Wellenwacht placements charge only valid builds, reroute and prohibit blocking or occupied enemy cells',()=>{
  for(const map of Object.keys(td.MAPS)){const s=td.create({map});const old=td.route(s),at=old[2];assert.ok(td.buy(s,at,'bolt').ok);assert.equal(s.coins,td.DIFFICULTIES.normal.money-45);const route=td.route(s);assert.ok(route.length>=old.length);assert.notDeepEqual(route,old);assert.ok(!route.includes(at));assert.equal(route.at(-1),td.MAPS[map].goal);
    const coins=s.coins;for(const bad of [at,td.MAPS[map].goal,...td.MAPS[map].starts,...td.MAPS[map].walls,-1,126]){assert.equal(td.buy(s,bad,'bolt').ok,false);assert.equal(s.coins,coins);}
    s.enemies=[{cell:old[3],next:old[4]}];assert.equal(td.placement(s,old[3],'bolt'),'enemy');assert.equal(td.placement(s,old[4],'bolt'),'enemy');
  }
  const s=td.create();s.coins=100000;const goal=td.MAPS.meadow.goal;
  for(const at of td.adjacent(goal).slice(0,-1))assert.ok(td.buy(s,at,'bolt').ok);
  const before=structuredClone(s);assert.equal(td.buy(s,td.adjacent(goal).at(-1),'bolt').error,'blocked');assert.deepEqual(s,before);
});
test('Wellenwacht upgrades, refunds, damage, slowing, splash, chains and wave completion',()=>{
  for(const kind of Object.keys(td.TOWERS)){
    const s=td.create();s.coins=1000;assert.ok(td.buy(s,3+3*14,kind).ok);const t=s.towers[0],initial=td.towerStats(t);assert.ok(td.upgrade(s,t.cell));assert.ok(td.upgrade(s,t.cell));assert.equal(t.level,3);assert.ok(td.towerStats(t).damage>initial.damage);assert.equal(td.upgrade(s,t.cell),false);
    const expected=s.coins+td.sellValue(t);assert.ok(td.sell(s,t.cell));assert.equal(s.coins,expected);
    td.buy(s,3+3*14,kind);td.startWave(s);s.queue=[];s.enemies=Array.from({length:3},(_,i)=>({id:i+1,kind:'crawler',cell:3+4*14,next:null,progress:0,hp:15,maxHp:15,slowUntil:0}));s.nextId=4;td.advance(s,.05);assert.ok(s.enemies.length<3||s.enemies.some((e)=>e.hp<15));if(kind==='frost')assert.ok(s.enemies.some((e)=>e.slowUntil>0));
    if(kind==='cannon')assert.equal(s.kills,3);if(kind==='arc')assert.ok(s.enemies.every((e)=>e.hp<15));
  }
});
test('Wellenwacht fixed steps are frame-rate independent, pause freezes, 2x doubles time and unguarded waves lose',()=>{
  const a=td.create(),b=td.create(),fast=td.create();for(const s of [a,b,fast])td.startWave(s);
  for(let i=0;i<100;i++)td.advance(a,.1);for(let i=0;i<600;i++)td.advance(b,1/60);assert.deepEqual(a,b);
  fast.speed=2;for(let i=0;i<50;i++)td.advance(fast,.1);const comparison={...a,speed:2};assert.deepEqual(fast,comparison);
  a.paused=true;const before=structuredClone(a);td.advance(a,2);assert.deepEqual(a,before);
  const loss=td.create({difficulty:'hard'});while(loss.status==='playing'){if(!loss.active)td.startWave(loss);td.advance(loss,30);}assert.equal(loss.status,'lost');assert.equal(loss.lives,0);
});
test('Wellenwacht full twelve-wave victory, save mid-wave, resume, restart and corrupt data',()=>{
  const s=td.create({difficulty:'easy'});s.coins=100000;
  for(let x=1;x<13;x++)for(const y of [3,5]){const at=x+y*14;if(td.buy(s,at,'arc').ok){td.upgrade(s,at);td.upgrade(s,at);}}
  td.startWave(s);td.advance(s,2);const restored=td.restore(s);assert.ok(restored);assert.equal(restored.paused,true);assert.deepEqual(restored.enemies,s.enemies);restored.paused=false;
  while(restored.status==='playing'){if(!restored.active)td.startWave(restored);td.advance(restored,30);}assert.equal(restored.status,'won');assert.equal(restored.wave,12);assert.ok(restored.lives>0);
  assert.equal(td.restore(restored).status,'won');assert.equal(td.create().wave,0);assert.equal(td.create().towers.length,0);
  for(const bad of [{...s,map:'bad'},{...s,coins:-1},{...s,towers:[...s.towers,s.towers[0]]},{...s,queue:['bad']},{...s,enemies:[{...s.enemies[0],next:125}]}])assert.equal(td.restore(bad),null);
});

test('Wellenwacht can be won on both maps and all three difficulties using only normal starting money and rewards',()=>{
  for(const map of Object.keys(td.MAPS))for(const difficulty of Object.keys(td.DIFFICULTIES)){
    const s=td.create({map,difficulty}),cells=[44,47,64,67,72,75,92,39,20,23,26,102,105,108,81,11,109];
    while(s.status==='playing'){
      for(const at of cells)if(s.towers.length<10)td.buy(s,at,'bolt');
      for(let level=1;level<3;level++)for(const tower of s.towers)if(tower.level===level)td.upgrade(s,tower.cell);
      assert.ok(td.startWave(s));while(s.active)td.advance(s,30);
    }
    assert.equal(s.status,'won',`${map}/${difficulty}`);assert.equal(s.wave,12);assert.ok(s.coins>=0);
  }
});
