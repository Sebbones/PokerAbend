// Reaktor-Notfall: Aufgaben mit eindeutiger Lösung. Hinweise sind wahre Aussagen über die Reglerstellung.
export const LETTERS='ABCDE';
export const digitsOf=(n,len)=>Array.from({length:len},(_,i)=>Math.floor(n/10**(len-1-i))%10);
export const holds=(c,d)=>{switch(c.k){
 case'parity':return d[c.a]%2===c.v;
 case'cmp':return d[c.a]>d[c.b];
 case'sum2':return d[c.a]+d[c.b]===c.v;
 case'max':return d[c.a]<=c.v;
 case'min':return d[c.a]>=c.v;
 case'diff':return Math.abs(d[c.a]-d[c.b])===c.v;
 case'mult3':return d[c.a]%3===0;
 case'total':return d.reduce((s,n)=>s+n,0)===c.v;
 default:return false;}};
export function text(c){const A=LETTERS[c.a],B=LETTERS[c.b];switch(c.k){
 case'parity':return c.v===0?[`Regler ${A} steht auf einer geraden Ziffer.`,`Regulator ${A} is on an even digit.`]:[`Regler ${A} steht auf einer ungeraden Ziffer.`,`Regulator ${A} is on an odd digit.`];
 case'cmp':return [`Regler ${A} steht höher als Regler ${B}.`,`Regulator ${A} is set higher than regulator ${B}.`];
 case'sum2':return [`Regler ${A} und Regler ${B} ergeben zusammen ${c.v}.`,`Regulators ${A} and ${B} add up to ${c.v}.`];
 case'max':return [`Regler ${A} steht auf höchstens ${c.v}.`,`Regulator ${A} is at most ${c.v}.`];
 case'min':return [`Regler ${A} steht auf mindestens ${c.v}.`,`Regulator ${A} is at least ${c.v}.`];
 case'diff':return [`Regler ${A} und Regler ${B} unterscheiden sich um genau ${c.v}.`,`Regulators ${A} and ${B} differ by exactly ${c.v}.`];
 case'mult3':return [`Regler ${A} steht auf 0, 3, 6 oder 9.`,`Regulator ${A} is on 0, 3, 6 or 9.`];
 case'total':return [`Alle Regler zusammen ergeben ${c.v}.`,`All regulators together add up to ${c.v}.`];
 default:return ['',''];}}
export const sizeFor=index=>index<2?3:4;
export function randomClue(sol,rng){
 const n=sol.length,pick=k=>Math.floor(rng()*k),a=pick(n);let b=pick(n-1);if(b>=a)b++;
 switch(pick(8)){
  case 0:return {k:'parity',a,v:sol[a]%2};
  case 1:return sol[a]===sol[b]?randomClue(sol,rng):sol[a]>sol[b]?{k:'cmp',a,b}:{k:'cmp',a:b,b:a};
  case 2:return {k:'sum2',a,b,v:sol[a]+sol[b]};
  case 3:return {k:'max',a,v:Math.min(9,sol[a]+pick(4))};
  case 4:return {k:'min',a,v:Math.max(0,sol[a]-pick(4))};
  case 5:return {k:'diff',a,b,v:Math.abs(sol[a]-sol[b])};
  case 6:return sol[a]%3===0?{k:'mult3',a}:randomClue(sol,rng);
  default:return n>=3?{k:'total',v:sol.reduce((s,x)=>s+x,0)}:randomClue(sol,rng);}
}
export function solutions(len,clues,limit=2){const out=[],max=10**len;for(let i=0;i<max&&out.length<limit;i++){const d=digitsOf(i,len);if(clues.every(c=>holds(c,d)))out.push(d.join(''));}return out;}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function makeTask(index,players,rng=Math.random){
 const len=sizeFor(index);
 for(let attempt=0;attempt<200;attempt++){
  const sol=Array.from({length:len},()=>Math.floor(rng()*10));let clues=[],cand=Array.from({length:10**len},(_,i)=>i);
  while(cand.length>1&&clues.length<16){const c=randomClue(sol,rng);if(clues.some(x=>same(x,c)))continue;const next=cand.filter(i=>holds(c,digitsOf(i,len)));if(next.length<cand.length){clues.push(c);cand=next;}}
  if(cand.length!==1)continue;
  for(let i=clues.length-1;i>=0;i--){const rest=clues.filter((_,j)=>j!==i);if(solutions(len,rest).length===1)clues=rest;}
  for(let guard=0;clues.length<players&&guard<200;guard++){const c=randomClue(sol,rng);if(!clues.some(x=>same(x,c)))clues.push(c);}
  if(clues.length<players)continue;
  const order=clues.map((_,i)=>i).sort(()=>rng()-.5),hands=Array.from({length:players},()=>[]);order.forEach((ci,k)=>hands[k%players].push(ci));
  if(hands.some(h=>solutions(len,h.map(i=>clues[i])).length===1))continue;
  return {len,solution:sol.join(''),clues,hands};
 }
 throw Error('Keine Aufgabe erzeugt');
}
export const consistent=(len,clues,code)=>{const d=code.split('').map(Number);return code.length===len&&clues.every(c=>holds(c,d));};
