import test from 'node:test';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {Position,chess960Fen,perft} from './rules.js';import {Room} from './room.js';
import {chooseBotAction,seededRandom} from '../bot-strategies/index.js';
import {createDecisionService} from '../../server/bot-decisions.js';

const play=(p,from,to,promotion)=>p.play({from,to,promotion});
function room(t,settings={}){const r=new Room('CHESS',settings,()=>{});r.game='schach';const a=r.addPlayer('Ada',null),b=r.addPlayer('Ben',null),watcher=r.addPlayer('Watcher',null);r.sit(a.id);r.sit(b.id);r.start(a.id);t.after(()=>r.dispose());return {r,a,b,watcher,move:(from,to,promotion,castle)=>r.move(r.currentId,{from,to,promotion,castle,key:r.key,revision:r.revision})};}

test('Schach perft: standard start depths 1–4 = 20 / 400 / 8902 / 197281',()=>{const p=new Position();for(const [d,n]of [[1,20],[2,400],[3,8902],[4,197281]])assert.equal(perft(p,d),n);});
for(const [label,fen,counts]of [
  ['Kiwipete','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',[48,2039,97862]],
  ['rook/pawn endgame','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',[14,191,2812]],
  ['promotion/castling position','r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',[6,264,9467]]
])test(`Schach perft: known ${label}, depths 1–3`,()=>{const p=new Position(fen);for(let d=1;d<=3;d++)assert.equal(perft(p,d),counts[d-1]);});

test('Schach: every one of 960 unique valid back ranks, opposite-colour bishops, king between rooks; index 518 is classic',()=>{const seen=new Set();for(let n=0;n<960;n++){const fen=chess960Fen(n),row=fen.split('/')[0],p=new Position(fen);seen.add(row);assert.equal(row.split('').filter(x=>x==='b').length,2);const bishops=[...row].flatMap((x,i)=>x==='b'?[i]:[]),rooks=[...row].flatMap((x,i)=>x==='r'?[i]:[]);assert.notEqual(bishops[0]%2,bishops[1]%2);assert.ok(rooks[0]<row.indexOf('k')&&row.indexOf('k')<rooks[1]);assert.ok(p.legal().length>=18);}assert.equal(seen.size,960);assert.ok(chess960Fen(518).startsWith('rnbqkbnr/'));});
test('Schach: both normal castles, no castling through check, moved/captured rook loses rights',()=>{
  const fen='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',p=new Position(fen);assert.equal(p.castles().length,2);const m=p.castles().find(m=>m.castle==='k');assert.equal(p.play(m),'O-O');assert.equal(p.chess.get('g1').type,'k');assert.equal(p.chess.get('f1').type,'r');
  const q=new Position('r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1');assert.deepEqual(q.castles().map(m=>m.castle),['q']);
  const moved=new Position(fen);play(moved,'a1','a2');play(moved,'h8','h7');play(moved,'a2','a1');assert.equal(moved.rights.w.q,undefined);
  const captured=new Position(fen);play(captured,'a1','a8');assert.equal(captured.rights.b.q,undefined);
});
test('Schach960: king/rook swap, stationary king, stationary rook, crossing and discovered rook attack',()=>{
  for(const [fen,side,king,rook]of [
    ['4k3/8/8/8/8/8/8/5KR1 w G - 0 1','k','g1','f1'],
    ['4k3/8/8/8/8/8/8/6KR w H - 0 1','k','g1','f1'],
    ['4k3/8/8/8/8/8/8/4KR2 w F - 0 1','k','g1','f1'],
    ['4k3/8/8/8/8/8/8/RK6 w A - 0 1','q','c1','d1'],
    ['4k3/8/8/8/8/8/8/2KR4 w D - 0 1','k','g1','f1']
  ]){const p=new Position(fen),m=p.castles().find(m=>m.castle===side);assert.ok(m,fen);p.play(m);assert.equal(p.chess.get(king).type,'k');assert.equal(p.chess.get(rook).type,'r');assert.equal(Object.keys(p.rights.w).length,0);}
  const exposed=new Position('4k3/8/8/8/8/8/8/rRK5 w B - 0 1');assert.equal(exposed.castles().length,0);
});
test('Schach: en passant only immediately, pinned en passant rejected; all four promotions require an explicit choice',()=>{
  const p=new Position();for(const [a,b]of [['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5']])play(p,a,b);assert.ok(p.legal().some(m=>m.from==='e5'&&m.to==='d6'));play(p,'a2','a3');play(p,'a6','a5');assert.ok(!p.legal().some(m=>m.from==='e5'&&m.to==='d6'));
  const pinned=new Position('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert.ok(!pinned.legal().some(m=>m.from==='e5'&&m.to==='d6'));
  for(const role of ['q','r','b','n']){const promotion=new Position('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.throws(()=>play(promotion,'a7','a8'));play(promotion,'a7','a8',role);assert.equal(promotion.chess.get('a8').type,role);}
});
test('Schach: mate, stalemate, fifty moves, threefold, insufficient material and timeout mating material',()=>{
  const mate=new Position();for(const [a,b]of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']])play(mate,a,b);assert.equal(mate.outcome().reason,'checkmate');
  assert.equal(new Position('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').outcome().reason,'stalemate');
  assert.equal(new Position('7k/8/8/8/8/8/6R1/7K w - - 100 51').outcome().reason,'fifty');
  assert.equal(new Position().outcome(3).reason,'repetition');assert.equal(new Position('7k/8/8/8/8/8/8/7K w - - 0 1').outcome().reason,'material');
  for(const fen of ['7k/8/8/8/8/8/6N1/7K w - - 0 1','7k/8/8/8/8/8/6B1/7K w - - 0 1'])assert.equal(new Position(fen).canMate('w'),false);
  assert.equal(new Position('6rk/8/8/8/8/8/6N1/7K w - - 0 1').canMate('w'),true);
  assert.equal(new Position('6qk/8/8/8/8/8/6N1/7K w - - 0 1').canMate('w'),false);
});
test('Schach room: legal moves and SAN, host pause, spectator/stale move rejection, draw offer and resignation',t=>{
  const {r,a,b,watcher,move}=room(t);const before=JSON.stringify(r.pos.data());assert.throws(()=>r.move(watcher.id,{from:'e2',to:'e4',key:r.key,revision:r.revision}));assert.equal(JSON.stringify(r.pos.data()),before);
  r.setGamePaused(a.id,true);assert.throws(()=>move('e2','e4'));r.setGamePaused(a.id,false);move('e2','e4');assert.equal(r.history[1].san,'e4');assert.throws(()=>r.move(b.id,{from:'e7',to:'e5',key:r.key,revision:0}));
  r.offerDraw(a.id);assert.throws(()=>r.answerDraw(a.id,true));r.answerDraw(b.id,false);r.offerDraw(b.id);r.answerDraw(a.id,true);assert.deepEqual(r.result.winners,[]);
  r.start(a.id);r.resign(r.order[0]);assert.deepEqual(r.result.winners,[r.order[1]]);
});
test('Schach room: exact increment, pause-aware server clock, flag loss and insufficient-material flag draw',t=>{
  let now=Date.now();t.mock.method(Date,'now',()=>now);const f=room(t,{clock:'3+2'}),r=f.r;const tick=r.tickAt;now=tick+1500;f.move('e2','e4');assert.equal(r.times.w,180500);now+=500;r.setGamePaused(f.a.id,true);const paused=r.remaining().b;assert.equal(paused,179500);now+=60000;assert.equal(r.remaining().b,paused);r.setGamePaused(f.a.id,false);
  now+=180000;assert.equal(r.checkClock(),true);assert.deepEqual(r.result.winners,[r.order[0]]);
  const g=room(t,{clock:'3+2'});g.r.pos=new Position('7k/8/8/8/8/8/8/6RK w - - 0 1');g.r.times.w=0;g.r.tickAt=g.r.clock.now();assert.equal(g.r.checkClock(),true);assert.deepEqual(g.r.result.winners,[]);
});
test('Schach room: repetition includes castling rights and SAN history is public, snapshot preserves seats/settings/bot preferences',t=>{
  const {r,move,a}=room(t);for(let n=0;n<2;n++)for(const [x,y]of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']])move(x,y);assert.equal(r.reason,'repetition');assert.equal(r.history.length,9);r.players.get(a.id).bot=true;r.players.get(a.id).botDifficulty='hard';const s=r.snapshot(),copy=Room.restore(JSON.parse(JSON.stringify(s)),()=>{});t.after(()=>copy.dispose());assert.equal(copy.players.get(a.id).botDifficulty,'hard');assert.equal(copy.settings.clock,'none');
});
test('Schach bot: all levels use legal public-position actions, zero budgets return a legal move, real worker wall budget',async t=>{
  const {r}=room(t),id=r.currentId,o={game:'schach',id,g:r.gameView(id)};for(const level of ['easy','medium','hard']){const a=chooseBotAction(o,level,{rng:seededRandom(7),budgetMs:0,maxNodes:0}).action;assert.ok(r.pos.legal().some(m=>m.from===a.args[0].from&&m.to===a.args[0].to));}
  const service=createDecisionService();t.after(()=>service.close());const start=performance.now(),a=await service.decide(o,'hard',{seed:7});assert.ok(performance.now()-start<1000);r.move(id,a.args[0]);
});

test('Schach bots: 20 complete classic/Chess960 games across all three levels without illegal moves or stranded turns',()=>{
  const levels=['easy','medium','hard'];let plies=0;
  for(let n=0;n<20;n++){const rng=seededRandom(73000+n),r=new Room('SIM',{variant:n%2?'chess960':'classic'},()=>{});r.game='schach';const ids=['Ada','Ben'].map(name=>{const p=r.addPlayer(name,null);r.sit(p.id);return p.id;});r.start(ids[0]);
    try{let moves=0;while(r.phase==='playing'&&moves++<1000){const id=r.currentId,o={game:'schach',id,g:r.gameView(id)},a=chooseBotAction(o,levels[(moves+n)%3],{rng,budgetMs:5,maxNodes:16}).action;r.move(id,a.args[0]);assert.equal(r.pos.chess.board().flat().filter(p=>p?.type==='k').length,2);}assert.equal(r.phase,'over',`game ${n}, ${moves} plies`);assert.ok(r.result);plies+=moves;}finally{r.dispose();}
  }
  console.log(`Schach: 20 complete games, ${plies} legal plies`);
});
