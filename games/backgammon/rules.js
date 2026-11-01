// White (0) moves 24 -> 1, black (1) moves 1 -> 24. Bar=-1, off=24.
export function initialBoard(){const points=Array(24).fill(0);for(const [p,n] of [[23,2],[12,5],[7,3],[5,5],[0,-2],[11,-5],[16,-3],[18,-5]])points[p]=n;return {points,bar:[0,0],off:[0,0]};}
export const cloneBoard=b=>({points:[...b.points],bar:[...b.bar],off:[...b.off]});
const sign=c=>c===0?1:-1;
export const distance=(p,c)=>c===0?p+1:24-p;
export const pipCount=(b,c)=>25*b.bar[c]+b.points.reduce((n,x,p)=>n+(x*sign(c)>0?Math.abs(x)*distance(p,c):0),0);
export function singleMoves(b,c,die){
  if(!Number.isInteger(die)||die<1||die>6)throw Error('Ungültiger Würfel');
  const s=sign(c),home=b.bar[c]===0&&!b.points.some((n,p)=>n*s>0&&distance(p,c)>6),sources=b.bar[c]?[-1]:b.points.flatMap((n,p)=>n*s>0?[p]:[]),out=[];
  for(const from of sources){const dest=from===-1?(c===0?24-die:die-1):from+(c===0?-die:die);
    if(dest>=0&&dest<24){if(b.points[dest]*s>=-1)out.push({from,to:dest,die});}
    else if(from!==-1&&home&&(distance(from,c)===die||(distance(from,c)<die&&!b.points.some((n,p)=>n*s>0&&distance(p,c)>distance(from,c)))))out.push({from,to:24,die});
  }return out;
}
export function applyMove(b,c,m){const next=cloneBoard(b),s=sign(c);if(m.from===-1)next.bar[c]--;else next.points[m.from]-=s;if(m.to===24)next.off[c]++;else{if(next.points[m.to]===-s){next.bar[1-c]++;next.points[m.to]=0;}next.points[m.to]+=s;}return next;}
export function legalMoves(b,c,dice){
  const memo=new Map(),key=(state,ds)=>`${state.points.join(',')}/${state.bar}/${state.off}/${[...ds].sort()}`;
  function length(state,ds){const k=key(state,ds);if(memo.has(k))return memo.get(k);let best=0;for(const d of new Set(ds))for(const m of singleMoves(state,c,d)){const rest=[...ds];rest.splice(rest.indexOf(d),1);best=Math.max(best,1+length(applyMove(state,c,m),rest));}memo.set(k,best);return best;}
  const max=length(b,dice);if(!max)return [];
  let moves=[];for(const d of new Set(dice))for(const m of singleMoves(b,c,d)){const rest=[...dice];rest.splice(rest.indexOf(d),1);if(1+length(applyMove(b,c,m),rest)===max)moves.push(m);}
  if(max===1&&dice.length===2&&dice[0]!==dice[1]){const high=Math.max(...moves.map(m=>m.die));moves=moves.filter(m=>m.die===high);}return moves;
}
export function winMultiplier(b,winner){const loser=1-winner;if(b.off[loser]>0)return 1;return b.bar[loser]||b.points.some((n,p)=>n*sign(loser)>0&&distance(p,winner)<=6)?3:2;}
export function positionValue(b,c){const s=sign(c),contact=b.points.some((n,p)=>n*s<0&&distance(p,c)>6);return b.off[c]*120-pipCount(b,c)+b.bar[1-c]*24-b.bar[c]*32+b.points.reduce((v,n)=>v+(n*s>=2?5:n===s&&contact?-7:0),0);}
