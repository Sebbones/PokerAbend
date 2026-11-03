import test from 'node:test';import assert from 'node:assert/strict';
import {Room} from './room.js';import {deal} from './cards.js';import {decide} from './bot.js';
import {seededRandom} from '../bot-strategies/index.js';
import {botObservation,applyBotAction} from '../../server/bot-observation.js';
import {chooseBotAction} from '../bot-strategies/index.js';
function setup(t,count=3,settings={}){const r=new Room('BLAST',{turnTime:0,...settings},()=>{});r.game='exploding-deck';const rng=seededRandom(992);r.randomInt=n=>Math.floor(rng()*n);const ids=Array.from({length:count},(_,i)=>{const p=r.addPlayer('P'+i,null);r.sit(p.id);return p.id;});r.start(ids[0]);t.after(()=>r.dispose());return {r,ids};}
const data=r=>({key:r.key,revision:r.revision});
function card(r,id,kind){for(const list of [r.deck,...Object.values(r.hands)]){const at=list.findIndex(c=>c.kind===kind);if(at>=0){const [c]=list.splice(at,1);r.hands[id].push(c);return c;}}throw Error('No '+kind);}
function topBomb(r){const i=r.deck.findIndex(c=>c.kind==='bomb');assert.ok(i>=0);r.deck.unshift(r.deck.splice(i,1)[0]);}
function resolve(r){while(r.pending){const p=r.pending,id=[...r.alive].find(id=>!p.passed.has(id));r.passReaction(id,{key:r.key,actionId:p.id,chain:p.nopeCount});}}
function play(r,id,kind,extra={}){const c=card(r,id,kind);r.playCard(id,{...data(r),cards:[c.id],...extra});return c;}
const inventory=r=>[...r.deck,...Object.values(r.hands).flat(),...r.discard,...(r.bomb?[r.bomb.card]:[])];

test('Exploding-Deck worker: hidden hand/deck changes leave observation and seeded strategy unchanged; fallback action legal at zero budget',t=>{
  const {r,ids:[id,other]}=setup(t),o=botObservation(r,id);r.deck.reverse();r.hands[other].reverse();r.forecasts[other]=[{id:'SECRET',kind:'bomb'}];assert.deepEqual(botObservation(r,id),o);
  for(const level of ['easy','medium','hard'])assert.deepEqual(chooseBotAction(o,level,{rng:seededRandom(5)}).action,chooseBotAction(botObservation(r,id),level,{rng:seededRandom(5)}).action);
  const a=chooseBotAction(o,'hard',{budgetMs:0}).action;applyBotAction(r,id,a);assert.ok(r.revision>o.g.revision);
});

test('Exploding-Deck: 2–5 single / 2–10 double, seven cards incl guaranteed defuse, bombs = players minus one and unique physical cards',()=>{
  for(const doubled of [false,true])for(let n=2;n<=(doubled?10:5);n++){const d=deal(n,doubled,x=>x-1),all=[...d.deck,...d.hands.flat()];assert.ok(d.hands.every(h=>h.length===7&&h.filter(c=>c.kind==='defuse').length===1));assert.equal(all.filter(c=>c.kind==='bomb').length,n-1);assert.equal(all.filter(c=>c.kind==='defuse').length,6*(doubled?2:1));assert.equal(new Set(all.map(c=>c.id)).size,all.length);assert.equal(all.length,52*(doubled?2:1)+n-1);}
  assert.throws(()=>deal(6));assert.throws(()=>deal(11,true));
});
test('Exploding-Deck: attack chains transfer remaining obligation; skip consumes one turn and draw consumes the next',t=>{
  const {r,ids}=setup(t);play(r,ids[0],'attack');resolve(r);assert.equal(r.actor,ids[1]);assert.equal(r.turnsLeft,2);play(r,ids[1],'attack');resolve(r);assert.equal(r.actor,ids[2]);assert.equal(r.turnsLeft,4);play(r,ids[2],'skip');resolve(r);assert.equal(r.actor,ids[2]);assert.equal(r.turnsLeft,3);const safe=r.deck.findIndex(c=>c.kind!=='bomb');r.deck.unshift(r.deck.splice(safe,1)[0]);r.drawCard(ids[2],data(r));assert.equal(r.actor,ids[2]);assert.equal(r.turnsLeft,2);
});
test('Exploding-Deck: odd/even Nope chains, original action restored, old pass rejected; defuse/bomb cannot be Noped',t=>{
  const {r,ids}=setup(t);play(r,ids[0],'skip');let p=r.pending;const a=card(r,ids[1],'nope');r.nope(ids[1],{key:r.key,actionId:p.id,card:a.id});assert.equal(p.nopeCount,1);assert.throws(()=>r.passReaction(ids[2],{key:r.key,actionId:p.id,chain:0}));const b=card(r,ids[2],'nope');r.nope(ids[2],{key:r.key,actionId:p.id,card:b.id});resolve(r);assert.equal(r.actor,ids[1]);
  play(r,ids[1],'skip');p=r.pending;const c=card(r,ids[0],'nope');r.nope(ids[0],{key:r.key,actionId:p.id,card:c.id});resolve(r);assert.equal(r.actor,ids[1]);
  topBomb(r);r.drawCard(ids[1],data(r));assert.equal(r.stage,'insert');const no=card(r,ids[2],'nope');assert.throws(()=>r.nope(ids[2],{key:r.key,actionId:p.id,card:no.id}));
});
test('Exploding-Deck: five-second reaction window rejects late No and uses pause-aware time',t=>{
  let now=Date.now();t.mock.method(Date,'now',()=>now);const {r,ids}=setup(t);play(r,ids[0],'future');const p=r.pending,no=card(r,ids[1],'nope');r.setGamePaused(ids[0],true);now+=20000;assert.equal(r.clock.now()<p.deadline,true);assert.throws(()=>r.nope(ids[1],{key:r.key,actionId:p.id,card:no.id}));r.setGamePaused(ids[0],false);now+=5001;assert.throws(()=>r.nope(ids[1],{key:r.key,actionId:p.id,card:no.id}));r.onTimeout(r.currentId);assert.equal(r.pending,null);assert.equal(r.forecasts[ids[0]].length,3);
});
test('Exploding-Deck: future is own-only, shuffle invalidates it; observer JSON never contains hidden hands, peek or insertion position',t=>{
  const {r,ids}=setup(t);play(r,ids[0],'future');resolve(r);r.forecasts[ids[0]][0].id='PRIVATE_FUTURE_MARKER';r.hands[ids[0]].find(c=>c.kind!=='defuse').id='PRIVATE_HAND_MARKER';const spectator=r.addPlayer('Observer',null);for(const id of [ids[1],spectator.id]){const json=JSON.stringify(r.view(id));assert.ok(!json.includes('PRIVATE_FUTURE_MARKER'));assert.ok(!json.includes('PRIVATE_HAND_MARKER'));assert.equal(r.gameView(id).future?.length||0,0);}
  play(r,ids[0],'shuffle');resolve(r);assert.deepEqual(r.forecasts,{});topBomb(r);r.drawCard(ids[0],data(r));assert.equal(r.gameView(ids[1]).canInsert,false);assert.ok(!JSON.stringify(r.view(ids[1])).includes('"index"'));r.insertBomb(ids[0],{...data(r),index:2});assert.ok(!JSON.stringify(r.view(ids[1])).includes('"index"'));
});
test('Exploding-Deck: favor card chosen by its owner; pair random theft and triple requests do not reveal a foreign hand',t=>{
  const {r,ids}=setup(t);play(r,ids[0],'favor',{target:ids[1]});resolve(r);assert.equal(r.currentId,ids[1]);const given=r.hands[ids[1]][0];r.giveCard(ids[1],{...data(r),card:given.id});assert.ok(r.hands[ids[0]].includes(given));
  const before=r.hands[ids[1]].length,pair=[card(r,ids[0],'cat0'),card(r,ids[0],'cat0')];r.playCard(ids[0],{...data(r),cards:pair.map(c=>c.id),target:ids[1]});resolve(r);assert.equal(r.hands[ids[1]].length,before-1);
  const defuse=card(r,ids[1],'defuse'),triple=[card(r,ids[0],'cat1'),card(r,ids[0],'cat1'),card(r,ids[0],'cat1')];r.playCard(ids[0],{...data(r),cards:triple.map(c=>c.id),target:ids[1],request:'defuse'});resolve(r);assert.ok(r.hands[ids[0]].some(c=>c.kind==='defuse'));assert.ok(!r.hands[ids[1]].includes(defuse));
});
test('Exploding-Deck: defuse consumed, secret reinsertion and elimination conserve every card; final survivor wins',t=>{
  const {r,ids}=setup(t,2),count=inventory(r).length;topBomb(r);r.drawCard(ids[0],data(r));assert.equal(r.stage,'insert');assert.equal(inventory(r).length,count);r.insertBomb(ids[0],{...data(r),index:0});const d=r.hands[ids[1]].filter(c=>c.kind==='defuse');r.hands[ids[1]]=r.hands[ids[1]].filter(c=>c.kind!=='defuse');r.discard.push(...d);r.drawCard(ids[1],data(r));assert.equal(r.phase,'over');assert.deepEqual(r.result.winners,[ids[0]]);assert.equal(inventory(r).length,count);assert.equal(new Set(inventory(r).map(c=>c.id)).size,count);
});
test('Exploding-Deck: invalid/foreign/stale/paused actions are atomic; snapshot retains double-deck settings and bot level',t=>{
  const {r,ids}=setup(t,6,{doubleDeck:true});const before=JSON.stringify(r.gameView(ids[0]));assert.throws(()=>r.playCard(ids[1],{...data(r),cards:[r.hands[ids[0]][0].id]}));assert.throws(()=>r.drawCard(ids[0],{key:r.key,revision:-1}));r.setGamePaused(ids[0],true);assert.throws(()=>r.drawCard(ids[0],data(r)));r.setGamePaused(ids[0],false);assert.equal(JSON.stringify(r.gameView(ids[0])),before);r.players.get(ids[1]).bot=true;r.players.get(ids[1]).botDifficulty='hard';const copy=Room.restore(JSON.parse(JSON.stringify(r.snapshot())),()=>{});t.after(()=>copy.dispose());assert.equal(copy.settings.doubleDeck,true);assert.equal(copy.players.get(ids[1]).botDifficulty,'hard');
});
test('Exploding-Deck bots: 80 complete games, every player count, all levels, card conservation and only own/public observations',()=>{
  for(let n=0;n<80;n++){const count=2+n%9,r=new Room('SIM',{doubleDeck:count>5,turnTime:0},()=>{}),rng=seededRandom(5100+n);r.randomInt=k=>Math.floor(rng()*k);const ids=Array.from({length:count},(_,i)=>{const p=r.addPlayer('Bot '+i,null,{bot:true});p.bot=true;p.connected=true;r.sit(p.id);return p.id;});r.start(ids[0]);const size=inventory(r).length;try{let moves=0;while(r.phase==='playing'&&moves++<12000){const id=r.botDue();assert.ok(id);const view=r.gameView(id),action=decide(view,id,['easy','medium','hard'][(n+moves)%3],rng);r[action.method](id,...action.args);assert.equal(inventory(r).length,size);assert.equal(new Set(inventory(r).map(c=>c.id)).size,size);}assert.equal(r.phase,'over',`game ${n}, stage ${r.stage}`);}finally{r.dispose();}}
});
