import {UPPER,FIELDS,fieldValue} from '../kniffel/room.js';

// Unordered future rolls with their exact multinomial weights (at most 252).
// Cached shapes contain no game state, hands, player IDs or RNG outcomes.
const factorial=[1,1,2,6,24,120],outcomes=Array.from({length:6},(_,n)=>{
  const all=[];function visit(d,min){if(d.length===n){const counts=Array(7).fill(0);d.forEach(x=>counts[x]++);all.push({dice:[...d],weight:factorial[n]/counts.reduce((v,x)=>v*factorial[x],1)/6**n});return;}for(let f=min;f<=6;f++){d.push(f);visit(d,f);d.pop();}}visit([],1);return all;
});
function worth(field,value,sheet){const i=UPPER.indexOf(field);if(i>=0)return value*1.35-3*(i+1);return value-({chance:23,threeKind:17,fourKind:14,fullHouse:7,smallStraight:12,largeStraight:8,kniffel:2}[field]||0);}
function options(d,sheet,joker){const free=FIELDS.filter(f=>sheet[f]===null);if(joker&&d.every(x=>x===d[0])&&sheet.kniffel!==null){const up=UPPER[d[0]-1];if(sheet[up]===null)return {[up]:fieldValue(up,d)};const lower=free.filter(f=>!UPPER.includes(f));if(lower.length)return Object.fromEntries(lower.map(f=>[f,{fullHouse:25,smallStraight:30,largeStraight:40}[f]??fieldValue(f,d)]));return Object.fromEntries(free.map(f=>[f,0]));}return Object.fromEntries(free.map(f=>[f,fieldValue(f,d)]));}
export function kniffel(o,level,c){const g=o.g;
  if(!g.rolls)return c.action('throwDice',[[]]);
  const entries=Object.entries(g.options),best=entries.sort((a,b)=>worth(b[0],b[1],g.sheet)-worth(a[0],a[1],g.sheet))[0];
  const score=c.action('score',[best[0]]);c.best(score);
  if(level==='easy'){
    if(g.rolls<3){const face=c.pick(g.dice),keep=g.dice.flatMap((d,i)=>d===face?[i]:[]);if(keep.length<5)return c.action('throwDice',[keep]);}
    return c.rng()<.65?score:c.action('score',[c.pick(entries)[0]]);
  }
  if(g.rolls>=3)return score;
  let value=worth(best[0],best[1],g.sheet),seen=new Set();const cache=new Map();
  for(let mask=0;mask<31;mask++){
    c.check();const indices=g.dice.flatMap((_,i)=>mask&(1<<i)?[i]:[]),held=indices.map(i=>g.dice[i]),key=[...held].sort().join('');if(seen.has(key))continue;seen.add(key);let expected=0;
    for(const future of outcomes[5-held.length]){c.check();const dice=[...held,...future.dice].sort(),k=dice.join('');let v=cache.get(k);if(v===undefined){v=Math.max(...Object.entries(options(dice,g.sheet,g.joker)).map(([f,n])=>worth(f,n,g.sheet)));cache.set(k,v);}expected+=future.weight*v;}
    if(expected>value+.05){value=expected;c.best(c.action('throwDice',[indices]));}
  }return c.result;
}
