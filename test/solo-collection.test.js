import test from 'node:test';import assert from 'node:assert/strict';
import * as snake from '../public/singleplayer/snake-logic.js';import * as memory from '../public/singleplayer/memory-logic.js';import * as mines from '../public/singleplayer/minesweeper-logic.js';import * as nonogram from '../public/singleplayer/nonogramm-logic.js';import * as soko from '../public/singleplayer/sokoban-logic.js';import * as storage from '../public/singleplayer/storage.js';
const engines={snake,memory,minesweeper:mines,nonogramm:nonogram,sokoban:soko};
test('Snake: deterministic food, buffered legal turns, fixed-step equivalence and vacating tail',()=>{
 const a=snake.create({seed:48}),b=snake.create({seed:48});assert.deepEqual(a,b);assert.equal(snake.turn(a,'left'),false);assert.ok(snake.turn(a,'up'));assert.equal(snake.turn(a,'down'),false);assert.ok(snake.turn(a,'left'));assert.equal(snake.turn(a,'down'),false);snake.tick(a,160);assert.equal(a.direction,'up');snake.tick(a,160);assert.equal(a.direction,'left');
 const c=snake.create({seed:8}),d=structuredClone(c);for(let i=0;i<4;i++)snake.tick(c,40);snake.tick(d,160);assert.deepEqual(c,d);
 const tail=snake.create();Object.assign(tail,{body:[17,18,34,33],direction:'down',food:100,score:10});snake.step(tail);assert.equal(tail.status,'playing');assert.deepEqual(tail.body,[33,17,18,34]);
});
test('Snake: growth conserves cells, collisions, win on a full grid and pause',()=>{
 const s=snake.create();s.food=s.body[0]+1;snake.tick(s,160);assert.equal(s.score,10);assert.equal(s.body.length,4);assert.ok(!s.body.includes(s.food));
 s.paused=true;const before=structuredClone(s);snake.tick(s,1000);assert.equal(snake.turn(s,'up'),false);assert.deepEqual(s,before);s.paused=false;s.body=[15,14,13];s.score=0;s.direction='right';snake.step(s);assert.equal(s.status,'lost');assert.ok(snake.restore(s));
 const full=snake.create(),cycle=Array.from({length:16},(_,x)=>x);for(let y=1;y<16;y++)for(let x=0;x<15;x++)cycle.push(y*16+(y%2?15-x:x+1));for(let y=15;y>0;y--)cycle.push(y*16);full.body=cycle.slice(0,-1);full.food=cycle.at(-1);full.direction='down';full.score=(full.body.length-3)*10;snake.step(full);assert.equal(full.status,'won');assert.equal(full.body.length,256);assert.equal(full.food,null);assert.ok(snake.restore(full));
});
test('Memory: each original motif occurs twice; mismatch blocks third card and pauses/reloads safely',()=>{
 for(const difficulty of Object.keys(memory.DIFFICULTIES)){const s=memory.create({difficulty,seed:15});for(let i=0;i<s.cards.length/2;i++)assert.equal(s.cards.filter(v=>v===i).length,2);assert.deepEqual(s,memory.create({difficulty,seed:15}));
 const j=s.cards.findIndex(v=>v!==s.cards[0]);memory.flip(s,0);memory.flip(s,j);const before=structuredClone(s);assert.equal(memory.flip(s,s.cards.findIndex((_,i)=>i!==0&&i!==j)),false);assert.deepEqual(s,before);s.paused=true;memory.tick(s,1000);assert.equal(s.pendingMs,850);const r=memory.restore(s);assert.ok(r);r.paused=false;memory.tick(r,849);assert.equal(r.opened.length,2);memory.tick(r,1);assert.deepEqual(r.opened,[]);}
});
test('Memory: full normal games complete, moves count only pairs and matching remains visible',()=>{
 for(let seed=0;seed<40;seed++){const s=memory.create({difficulty:['easy','normal','hard'][seed%3],seed});for(let v=0;v<s.cards.length/2;v++)for(const i of s.cards.flatMap((x,i)=>x===v?[i]:[]))assert.ok(memory.flip(s,i));assert.equal(s.status,'won');assert.equal(s.moves,s.cards.length/2);assert.equal(s.matched.every(Boolean),true);assert.ok(memory.restore(s));}
});
test('Minesweeper: every possible first click on 24 seeded fields is safe, zero and reproducible; exact mine counts',()=>{
 for(const difficulty of Object.keys(mines.DIFFICULTIES))for(let seed=1;seed<=8;seed++){const n=mines.DIFFICULTIES[difficulty].size;for(let i=0;i<n*n;i++){const s=mines.create({difficulty,seed});mines.reveal(s,i);assert.ok(!s.mines.includes(i));assert.equal(mines.count(s,i),0);assert.equal(s.mines.length,mines.DIFFICULTIES[difficulty].mines);assert.ok(s.opened[i]);assert.deepEqual(s.mines,mines.layout(seed,difficulty,i));}}
});
test('Minesweeper: flags do not start the clock, iterative flood fill, win, loss, pause and restore invariants',()=>{
 const s=mines.create({seed:4});mines.flag(s,0);assert.equal(s.started,false);assert.equal(mines.reveal(s,0),false);mines.flag(s,0);mines.reveal(s,0);assert.ok(s.opened.filter(Boolean).length>1);assert.ok(mines.restore(s));
 s.paused=true;const before=structuredClone(s);assert.equal(mines.flag(s,14),false);assert.equal(mines.reveal(s,12),false);mines.tick(s,500);assert.deepEqual(s,before);s.paused=false;
 const lost=structuredClone(s);mines.reveal(lost,lost.mines[0]);assert.equal(lost.status,'lost');assert.ok(mines.restore(lost));for(let i=0;i<s.opened.length;i++)if(!s.mines.includes(i))mines.reveal(s,i);assert.equal(s.status,'won');assert.ok(mines.restore(s));
 const bad=structuredClone(lost);bad.mines[0]=bad.first;assert.equal(mines.restore(bad),null);
});
test('Nonogram: all six original 5/10/15 puzzles have exactly one independently computed solution',()=>{
 assert.equal(nonogram.LEVELS.length,6);for(const l of nonogram.LEVELS){const hints=nonogram.clues(l.solution,l.size),solved=nonogram.solve(hints);assert.equal(solved.exhausted,false,l.id);assert.equal(solved.count,1,l.id);assert.deepEqual(solved.solution,l.solution,l.id);}assert.deepEqual(nonogram.runs([0,1,1,0,1]),[2,1]);assert.deepEqual(nonogram.runs([0,0]),[0]);
 assert.equal(nonogram.solve({rows:[[1],[1]],columns:[[1],[1]]}).count,2);assert.equal(nonogram.solve({rows:[[2],[0]],columns:[[0],[0]]}).count,0);
});
test('Nonogram: marks, exact undo, retained assistance count, pause and completion for every published level',()=>{
 for(const l of nonogram.LEVELS){const s=nonogram.create({difficulty:l.difficulty,level:l.id});nonogram.mark(s,0,-1);assert.equal(s.cells[0],-1);nonogram.undo(s);assert.equal(s.cells[0],0);nonogram.hint(s);assert.equal(s.hints,1);nonogram.undo(s);assert.equal(s.hints,1);s.paused=true;assert.equal(nonogram.hint(s),false);assert.equal(nonogram.mark(s,0),false);s.paused=false;for(let i=0;i<l.solution.length;i++)if(l.solution[i])nonogram.mark(s,i);assert.equal(s.status,'won');assert.ok(nonogram.restore(s));nonogram.undo(s);assert.equal(s.status,'playing');}
});
test('Sokoban: independent push-state BFS solves every original warehouse; all moves and complete reverse undo replay legally',()=>{
 for(const l of soko.LEVELS){const result=soko.solve(l);assert.equal(result.exhausted,false,l.id);assert.ok(result.solution?.length,l.id);const s=soko.create({difficulty:l.difficulty,level:l.id}),initial=structuredClone(s);for(const move of result.solution){assert.ok(soko.move(s,move),l.id);assert.ok(soko.restore(s),l.id+' valid move');}assert.equal(s.status,'won',l.id);for(let i=0;i<result.solution.length;i++)assert.ok(soko.undo(s));assert.equal(s.moves,0);assert.equal(s.pushes,0);assert.equal(s.player,initial.player);assert.deepEqual(s.crates,initial.crates);}
});
test('Sokoban: walls/double crates, pause, restart, valid geometry and forged history rejection',()=>{
 const s=soko.create({difficulty:'easy'});assert.equal(soko.move(s,'down'),false);s.paused=true;const before=structuredClone(s);assert.equal(soko.move(s,'right'),false);assert.deepEqual(s,before);s.paused=false;soko.move(s,'right');const r=soko.restore(s);assert.equal(r.paused,true);r.undo[0].crates[0]=0;assert.equal(soko.restore(r),null);
 const l=soko.LEVELS[0];assert.equal(soko.legal(l,10,[11,12],'right'),null);assert.throws(()=>soko.parse(['###','#@@','###']));
});
for(const [id,engine]of Object.entries(engines))test(`${id}: strict bounded restore and corrupt/unknown-version saves never overwrite the original bytes`,()=>{
 const s=engine.create({seed:31}),r=engine.restore(s);assert.ok(r);assert.equal(r.paused,true);assert.equal(r.poison,undefined);
 for(const bad of [{...s,elapsedMs:Infinity},{...s,elapsedMs:-1},{...s,difficulty:'forged'},{...s,status:'unknown'},{...s,seed:-3}])assert.equal(engine.restore(bad),null);
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},key=storage.key(id);
 for(const raw of ['broken',JSON.stringify({version:888,id,updatedAt:0,state:s}),JSON.stringify({version:1,id,updatedAt:0,state:{...s,status:'unknown'}}),'x'.repeat(250001)]){data.set(key,raw);assert.ok(['corrupt','version'].includes(storage.load(store,id,engine.restore).status));assert.equal(data.get(key),raw);}
 assert.ok(storage.save(store,id,s));assert.ok(storage.load(store,id,engine.restore).state);
 const denied={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(storage.load(denied,id,engine.restore).status,'unavailable');assert.equal(storage.save(denied,id,s),false);
});
