import {landing,winLine} from '../viergewinnt/room.js';
import {legalMoves as reversiMoves,flips} from '../reversi/room.js';
import {applyMove,positionValue,pipCount,singleMoves,legalMoves} from '../backgammon/rules.js';
const ORDER=[3,2,4,1,5,0,6];
const WINDOWS=[];
for(let r=0;r<6;r++)for(let c=0;c<7;c++)for(const [dr,dc]of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[0,1,2,3].map(k=>[r+k*dr,c+k*dc]);if(cells.every(([r,c])=>r>=0&&r<6&&c>=0&&c<7))WINDOWS.push(cells.map(([r,c])=>r*7+c));}
function fourRate(board,me,foe){let score=0;for(const w of WINDOWS){let a=0,b=0;for(const p of w){if(board[p]===me)a++;else if(board[p]===foe)b++;}if(a&&!b)score+=[0,1,8,60,100000][a];else if(b&&!a)score-=[0,1,8,60,100000][b];}for(let r=0;r<6;r++)if(board[r*7+3]===me)score+=3;return score;}
export function connectFour(o,level,ctx){const {g,id,foe}=o,b=[...g.board],moves=ORDER.filter(c=>landing(b,c)>=0);let best=moves[0];
  if(level==='easy'){const c=ctx.pick(moves);return ctx.action('drop',[c]);}
  function search(me,other,depth,alpha,beta){ctx.check();if(!depth)return fourRate(b,me,other);let value=-Infinity,any=false;for(const c of ORDER){const r=landing(b,c);if(r<0)continue;any=true;b[r*7+c]=me;let v;try{v=winLine(b,r,c,me)?100000+depth:-search(other,me,depth-1,-beta,-alpha);}finally{b[r*7+c]=null;}value=Math.max(value,v);alpha=Math.max(alpha,v);if(alpha>=beta)break;}return any?value:0;}
  for(let depth=1;depth<=8;depth++){let score=-Infinity,candidate=best;for(const c of moves){ctx.check();const r=landing(b,c);b[r*7+c]=id;let value;try{value=winLine(b,r,c,id)?1000000:-search(foe,id,depth-1,-Infinity,Infinity);}finally{b[r*7+c]=null;}if(value>score){score=value;candidate=c;}if(depth===1||value>=1000000)ctx.best(ctx.action('drop',[candidate]));}best=candidate;ctx.best(ctx.action('drop',[best]));if(score>=1000000)break;}
  return ctx.action('drop',[best]);
}
const CORNERS=[0,7,56,63],NEAR={0:[1,8,9],7:[6,14,15],56:[48,49,57],63:[54,55,62]};
function revRate(b,me,foe){let score=0;for(let p=0;p<64;p++){if(!b[p])continue;const s=b[p]===me?1:-1;score+=s*(CORNERS.includes(p)?130:3);for(const corner of CORNERS)if(!b[corner]&&NEAR[corner].includes(p))score-=s*40;}return score+(reversiMoves(b,me).length-reversiMoves(b,foe).length)*9;}
function revApply(board,cell,me){const b=[...board];for(const p of flips(board,cell,me))b[p]=me;b[cell]=me;return b;}
export function reversi(o,level,ctx){const {id,foe,g}=o,moves=g.legal;if(level==='easy')return ctx.action('place',[ctx.pick(moves)]);
  const ordered=(b,me)=>reversiMoves(b,me).sort((a,b)=>Number(CORNERS.includes(b))-Number(CORNERS.includes(a)));
  function search(b,me,other,depth,alpha,beta){ctx.check();const ms=ordered(b,me);if(!ms.length){if(!reversiMoves(b,other).length)return (b.filter(x=>x===me).length-b.filter(x=>x===other).length)*10000;return -search(b,other,me,Math.max(0,depth-1),-beta,-alpha);}if(!depth)return revRate(b,me,other);let best=-Infinity;for(const p of ms){const v=-search(revApply(b,p,me),other,me,depth-1,-beta,-alpha);best=Math.max(best,v);alpha=Math.max(alpha,v);if(alpha>=beta)break;}return best;}
  let best=moves[0];for(let depth=1;depth<=6;depth++){let value=-Infinity,candidate=best;for(const p of ordered(g.board,id)){const v=-search(revApply(g.board,p,id),foe,id,depth-1,-Infinity,Infinity);if(v>value){value=v;candidate=p;}if(depth===1)ctx.best(ctx.action('place',[candidate]));}best=candidate;ctx.best(ctx.action('place',[best]));}return ctx.action('place',[best]);
}
function backRate(b,c){const enemy=1-c,s=c===0?1:-1;let value=positionValue(b,c)-positionValue(b,enemy)*.45;for(let p=0;p<24;p++)if(b.points[p]===s){let attacks=0;for(let die=1;die<=6;die++)if(singleMoves(b,enemy,die).some(m=>m.to===p))attacks++;value-=attacks*3;}return value;}
export function backgammon(o,level,ctx){const g=o.g,extra=[g.revision,g.roundKey],color=g.colors.indexOf(o.id);if(g.pending)return ctx.action('answerDouble',[level==='easy'?ctx.rng()>.15:pipCount(g.board,1-g.pending.color)<=pipCount(g.board,g.pending.color)*1.3+12,...extra]);if(g.stage==='roll')return ctx.action('throwDice',extra);if(!g.legal.length)return ctx.action('confirmTurn',extra);
  const command=m=>ctx.action('move',[m.from,m.to,m.die,...extra]);if(level==='easy')return command(ctx.pick(g.legal));
  let top=-Infinity;for(const m of g.legal){ctx.check();const board=applyMove(g.board,color,m),dice=[...g.dice];dice.splice(dice.indexOf(m.die),1);let score=backRate(board,color);if(dice.length){let continuation=-Infinity;for(const next of legalMoves(board,color,dice)){ctx.check();continuation=Math.max(continuation,backRate(applyMove(board,color,next),color));}if(continuation!==-Infinity)score=continuation;}
    if(score>top){top=score;ctx.best(command(m));}}
  return ctx.result;
}
