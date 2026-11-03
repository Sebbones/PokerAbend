import {Position} from './rules.js';
const VALUES={p:100,n:320,b:330,r:500,q:900,k:0};
function evaluate(pos){let value=0;for(const row of pos.chess.board())for(const p of row)if(p){const x='abcdefgh'.indexOf(p.square[0]),y=Number(p.square[1])-1,advance=p.color==='w'?y:7-y;const bonus=p.type==='p'?advance*7:p.type==='n'||p.type==='b'?14-4*(Math.abs(x-3.5)+Math.abs(y-3.5)):0;value+=(p.color===pos.turn?1:-1)*(VALUES[p.type]+bonus);}return value;}
const command=(g,m)=>({method:'move',args:[{from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{}),...(m.castle?{castle:m.castle}:{}),revision:g.revision,key:g.key}]});
export const fallback=o=>command(o.g,o.g.legal[0]);
export function strategy(o,level,c){
  const pos=Position.from(o.g.position),legal=o.g.legal;
  if(level==='easy'&&c.rng()<.55)return command(o.g,c.pick(legal));
  const sort=moves=>moves.sort((a,b)=>(VALUES[b.captured]||0)+(b.promotion?800:0)-(VALUES[a.captured]||0)-(a.promotion?800:0));
  function search(p,depth,alpha,beta,ply){c.check();if(!depth)return p.chess.isCheckmate()?-100000+ply:evaluate(p);const moves=p.legal();if(!moves.length)return p.chess.isCheck()?-100000+ply:0;if(p.chess.isInsufficientMaterial())return 0;if(!depth)return evaluate(p);let best=-Infinity;for(const move of sort(moves)){const next=p.clone();next.playLegal(move);const v=-search(next,depth-1,-beta,-alpha,ply+1);best=Math.max(best,v);alpha=Math.max(alpha,v);if(alpha>=beta)break;}return best;}
  const limit=level==='hard'?7:level==='medium'?4:1;
  for(let depth=1;depth<=limit;depth++){let score=-Infinity,best=legal[0];for(const move of sort([...legal])){c.check();const next=pos.clone();next.playLegal(move);const value=-search(next,depth-1,-Infinity,Infinity,1);if(value>score){score=value;best=move;}if(depth===1)c.best(command(o.g,best));}c.best(command(o.g,best));if(score>=99900)break;}
  return c.result;
}
