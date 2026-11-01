import {performance} from 'node:perf_hooks';
import {connectFour,reversi,backgammon} from './boards.js';
const STRATEGIES={viergewinnt:connectFour,reversi,backgammon};
export const BOT_BUDGET_MS=35;
export function seededRandom(seed){let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
export function fallbackAction(o){const g=o.g,action=(method,args)=>({method,args});if(o.game==='viergewinnt'){let c=0;while(g.board[c]!==null&&c<7)c++;return action('drop',[c]);}if(o.game==='reversi')return action('place',[g.legal[0]]);if(o.game==='backgammon'){const extra=[g.revision,g.roundKey];if(g.pending)return action('answerDouble',[true,...extra]);if(g.stage==='roll')return action('throwDice',extra);const m=g.legal[0];return m?action('move',[m.from,m.to,m.die,...extra]):action('confirmTurn',extra);}return null;}
export function chooseBotAction(observation,level,{rng=Math.random,budgetMs=BOT_BUDGET_MS,maxNodes=40000,now=()=>performance.now(),onBest=()=>{}}={}){
  if(!['easy','hard'].includes(level)||!STRATEGIES[observation?.game])throw Error('Keine mehrstufige Strategie für dieses Spiel');
  const deadline=now()+Math.max(0,Math.min(100,budgetMs)),stop={},ctx={rng,result:fallbackAction(observation),nodes:0,action:(method,args)=>({method,args}),pick:list=>list[Math.min(list.length-1,Math.floor(rng()*list.length))]};
  ctx.best=action=>{ctx.result=action;onBest(action);};ctx.check=()=>{if(++ctx.nodes>maxNodes||now()>=deadline)throw stop;};
  try{ctx.check();const result=STRATEGIES[observation.game](observation,level,ctx);if(result)ctx.best(result);}catch(error){if(error!==stop)throw error;}
  return {action:ctx.result,nodes:ctx.nodes};
}
