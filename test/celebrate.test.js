import test from 'node:test';
import assert from 'node:assert/strict';
import {resultModel,pokerResultModel} from '../public/motion/celebrate.js';
const state=()=>({code:'TABLE',game:'demo',roundNo:2,players:[{id:'a',name:'Anna',score:14},{id:'b',name:'Ben',score:5}],you:{id:'a'},result:{players:['a','b'],winners:['a'],points:{a:8,b:-3}},secret:'never expose'});
test('EXP-F4 levels use public round/match/evening results without changing game state',()=>{
 const s=state(),before=JSON.stringify(s);assert.equal(resultModel(s).level,1);assert.equal(resultModel(s,{category:'brett'}).level,2);assert.equal(resultModel(s,{roundWord:'Partie'}).level,2);assert.equal(resultModel(s,{level:2}).level,2);
 const m=resultModel(s);assert.equal(m.ownWinner,true);assert.equal(m.spectator,false);assert.deepEqual(m.rows.map(r=>r.points),[8,-3]);assert.ok(!JSON.stringify(m).includes('never expose'));assert.equal(JSON.stringify(s),before);
});
test('EXP-F4 draws have no invented winner; watchers and paused views are marked',()=>{
 const s=state();s.result.winners=[];s.you.id='watcher';s.gamePaused=true;const m=resultModel(s);assert.ok(m.rows.every(r=>!r.winner));assert.equal(m.ownWinner,false);assert.equal(m.spectator,true);assert.equal(m.paused,true);
});
test('EXP-F4 evening standings and best values come only from published program data',()=>{
 const s=state();s.partyProgram={id:'evening',status:'done',config:{mode:'abend',name:'Unser Abend'},standings:[{id:'a',name:'Anna',points:4},{id:'b',name:'Ben',points:2}],winners:['Anna'],results:[{points:{a:2,b:1}},{points:{a:2,b:1}}]};
 const m=resultModel(s);assert.equal(m.level,3);assert.equal(m.count,2);assert.equal(m.rows[0].points,4);assert.deepEqual(m.best,[{name:'Anna',points:2},{name:'Ben',points:1}]);assert.equal(m.key,'TABLE:demo:evening');
});
test('EXP-F4 poker adapter reads only public pots and seats; split pots preserve winners',()=>{
 const m=pokerResultModel({code:'POKER',game:'poker',you:{seat:0},seats:[{name:'Anna',stack:120},{name:'Ben',stack:120}],hand:{no:3,done:true,result:{pots:[{amount:40,winners:[0,1]}]},cards:['secret']}});
 assert.equal(m.level,1);assert.deepEqual(m.rows.map(r=>r.points),[20,20]);assert.ok(m.rows.every(r=>r.winner));assert.ok(!JSON.stringify(m).includes('secret'));
});

test('EXP-F4 completed team programs show the server team winner rather than the last game winner',()=>{
 const s=state();s.partyProgram={id:'team',status:'done',config:{mode:'team'},standings:[{id:'a',team:'b'}],teams:[{id:'a',name:'Team 1',points:1},{id:'b',name:'Team 2',points:4}],winners:['Team 2']};
 const m=resultModel(s);assert.equal(m.level,2);assert.equal(m.ownWinner,true);assert.equal(m.rows.find(r=>r.id==='b').winner,true);assert.equal(m.rows.find(r=>r.id==='a').winner,false);assert.equal(m.key,'TABLE:demo:team');
});

test('EXP-F4 poker evening keeps player IDs and excludes seated non-participants from celebration',()=>{
 const s={code:'P',game:'poker',you:{id:'a',seat:0},seats:[{id:'a',name:'Anna',inHand:true},{id:'b',name:'Ben',inHand:true},{id:'watch',name:'Watcher',inHand:false}],hand:{no:1,done:true,result:{pots:[{amount:40,winners:[0]}]}},partyProgram:{id:'evening',status:'done',config:{mode:'abend'},standings:[{id:'a',name:'Anna',points:2},{id:'b',name:'Ben',points:1}],results:[],winners:['Anna']}};
 assert.equal(pokerResultModel(s).ownWinner,true);assert.equal(pokerResultModel(s).level,3);s.you={id:'watch',seat:2};assert.equal(pokerResultModel(s).spectator,true);
});
