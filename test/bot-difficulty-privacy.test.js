import test from 'node:test';import assert from 'node:assert/strict';
import {BOT_PILOTS} from '../games/bot-levels.js';import {botObservation} from '../server/bot-observation.js';import {chooseBotAction,seededRandom} from '../games/bot-strategies/index.js';import {nextBot} from '../server/bots.js';import {botFixture} from './bot-difficulty-harness.js';

for(const game of BOT_PILOTS)test(`V2-16 ${game}: hidden hands/decks/roles cannot change a seat's observation or decision`,()=>{
  const f=botFixture(game,game==='hearts'?['hard','easy','hard','easy']:['hard','easy'],872),{r}=f;
  try{const id=nextBot(r),before=botObservation(r,id),decision=chooseBotAction(before,'hard',{rng:seededRandom(42),budgetMs:100,maxNodes:80}).action;
    for(const key of ['hands','racks'])if(r[key])for(const other of Object.keys(r[key]))if(other!==id&&Array.isArray(r[key][other]))r[key][other].reverse();
    for(const key of ['deck','bag','chance','community'])if(Array.isArray(r[key]))r[key].reverse();
    if(r.chosen)for(const other of Object.keys(r.chosen))if(other!==id)r.chosen[other]=999;
    if(r.table){const own=r.players.get(id).seat;for(const seat of r.table.hand.seats)if(seat!==own)Object.defineProperty(r.table.hand.players[seat],'cards',{get(){throw Error('Foreign hole cards were read');}});Object.defineProperty(r.table.hand,'deck',{get(){throw Error('Real deck was read');}});}
    r.roles={secret:'hidden role sentinel'};const after=botObservation(r,id);assert.deepEqual(after,before);assert.ok(!JSON.stringify(after).includes('hidden role sentinel'));
    assert.deepEqual(chooseBotAction(after,'hard',{rng:seededRandom(42),budgetMs:100,maxNodes:80}).action,decision);
  }finally{r.dispose();}
});
