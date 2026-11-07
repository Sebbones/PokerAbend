import {strategy as stichmeister,fallback as stichFallback} from '../stichmeister/bot.js';
import {strategy as labyrinth,fallback as mazeFallback} from '../labyrinth-brett/bot.js';
import {strategy as schatzinsel,fallback as islandFallback} from '../schatzinsel/bot.js';
import {performance} from 'node:perf_hooks';
import {connectFour,reversi,backgammon} from './boards.js';
import {poker,uno,hearts,six} from './cards.js';
import {kniffel} from './dice.js';
import {monopoly,scrabble} from './economy.js';
import {strategy as schach,fallback as schachFallback} from '../schach/bot.js';
import {strategy as explodingDeck,fallback as explodingFallback} from '../exploding-deck/bot.js';
import {strategy as luegenbaron,fallback as bluffFallback} from '../luegenbaron/bot.js';
import {strategy as skat,fallback as skatFallback} from '../skat/bot.js';
import {strategy as doppelkopf,fallback as dkFallback} from '../doppelkopf/bot.js';
import {strategy as gebietskampf,fallback as gebietFallback} from '../gebietskampf/bot.js';
import {WORKER_MEDIUM_GAMES} from '../bot-levels.js';
const STRATEGIES={gebietskampf,stichmeister,'labyrinth-brett':labyrinth,schatzinsel,doppelkopf,skat,schach,'exploding-deck':explodingDeck,luegenbaron,viergewinnt:connectFour,reversi,backgammon,poker,omaha:poker,farbenchaos:uno,hearts,'sechs-nimmt':six,kniffel,monopoly,scrabble};
export const BOT_BUDGET_MS=35;
export function seededRandom(seed){let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
export function fallbackAction(o){const g=o.g;if(o.game==='gebietskampf')return gebietFallback(o);if(o.game==='stichmeister')return stichFallback(o);if(o.game==='labyrinth-brett')return mazeFallback(o);if(o.game==='schatzinsel')return islandFallback(o);if(o.game==='doppelkopf')return dkFallback(o);if(o.game==='skat')return skatFallback(o);if(o.game==='luegenbaron')return bluffFallback(o);if(o.game==='exploding-deck')return explodingFallback(o);if(o.game==='schach')return schachFallback(o);const action=(method,args)=>({method,args});if(o.game==='scrabble')return action(g.stage==='review'?'review':g.stage==='vote'?'vote':'pass',[{key:g.key,revision:g.revision,challenge:false,accept:true}]);if(o.game==='monopoly')return action('onTimeout',[]);if(o.game==='kniffel')return g.rolls?action('score',[Object.keys(g.options)[0]]):action('throwDice',[[]]);if(o.game==='poker'||o.game==='omaha')return action('act',[{type:g.legal.canCheck?'check':'fold'}]);if(o.game==='farbenchaos')return g.forgot?action(g.forgot===o.id?'lateCall':'catchForgot',[]):g.playable.length?action('play',[g.playable[0],'r',true,g.others[0]?.id]):action(g.drawn?'pass':'draw',[]);if(o.game==='hearts')return g.stage==='pass'?action('pass',[g.hand.slice(0,3),g.dealKey]):action('play',[g.legal[0],g.revision,g.dealKey]);if(o.game==='sechs-nimmt')return g.stage==='row'?action('takeRow',[g.allowed[0]]):action('choose',[g.hand[0]]);if(o.game==='viergewinnt'){let c=0;while(g.board[c]!==null&&c<7)c++;return action('drop',[c]);}if(o.game==='reversi')return action('place',[g.legal[0]]);if(o.game==='backgammon'){const extra=[g.revision,g.roundKey];if(g.pending)return action('answerDouble',[true,...extra]);if(g.stage==='roll')return action('throwDice',extra);const m=g.legal[0];return m?action('move',[m.from,m.to,m.die,...extra]):action('confirmTurn',extra);}return null;}
export function chooseBotAction(observation,level,{rng=Math.random,budgetMs=BOT_BUDGET_MS,maxNodes=40000,now=()=>performance.now(),onBest=()=>{}}={}){
  if((!['easy','hard'].includes(level)&&!(level==='medium'&&WORKER_MEDIUM_GAMES.includes(observation?.game)))||!STRATEGIES[observation?.game])throw Error('Keine mehrstufige Strategie für dieses Spiel');
  const deadline=now()+Math.max(0,Math.min(100,budgetMs)),stop={},ctx={rng,result:fallbackAction(observation),nodes:0,action:(method,args)=>({method,args}),pick:list=>list[Math.min(list.length-1,Math.floor(rng()*list.length))]};
  ctx.best=action=>{ctx.result=action;onBest(action);};ctx.check=()=>{if(++ctx.nodes>maxNodes||now()>=deadline)throw stop;};
  try{ctx.check();const result=STRATEGIES[observation.game](observation,level,ctx);if(result)ctx.best(result);}catch(error){if(error!==stop)throw error;}
  return {action:ctx.result,nodes:ctx.nodes};
}
