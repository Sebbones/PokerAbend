import {rng,shuffle,integer} from './random.js';
export const DIFFICULTIES={easy:42,medium:35,hard:29,expert:25};
const ALL=511;
export const box=(i)=>Math.floor(i/27)*3+Math.floor(i%9/3);
export const peers=(a,b)=>Math.floor(a/9)===Math.floor(b/9)||a%9===b%9||box(a)===box(b);
const validArray=(a)=>Array.isArray(a)&&a.length===81&&a.every((v)=>integer(v,0,9));
export function candidates(grid,index){
  if(!validArray(grid)||!integer(index,0,80)||grid[index])return 0;
  let used=0;for(let j=0;j<81;j++)if(peers(index,j)&&grid[j])used|=1<<(grid[j]-1);return ALL&~used;
}
export function conflicts(grid){
  if(!validArray(grid))return [];
  return grid.map((v,i)=>v&&grid.some((w,j)=>j!==i&&w===v&&peers(i,j))?i:-1).filter((i)=>i>=0);
}
export function solve(grid,limit=2){
  if(!validArray(grid)||conflicts(grid).length)return {count:0,solution:null};
  const a=[...grid],rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);let count=0,solution=null,nodes=0,aborted=false;
  for(let i=0;i<81;i++)if(a[i]){const bit=1<<(a[i]-1);rows[Math.floor(i/9)]|=bit;cols[i%9]|=bit;boxes[box(i)]|=bit;}
  function search(){
    if(++nodes>250000){aborted=true;return true;}
    let at=-1,mask=0,best=10;
    for(let i=0;i<81;i++)if(!a[i]){const m=ALL&~(rows[Math.floor(i/9)]|cols[i%9]|boxes[box(i)]),n=m.toString(2).replaceAll('0','').length;if(!n)return;if(n<best){best=n;at=i;mask=m;if(n===1)break;}}
    if(at<0){count++;solution||=[...a];return count>=limit;}
    const r=Math.floor(at/9),c=at%9,b=box(at);
    for(let bit=1;bit<=256;bit<<=1)if(mask&bit){a[at]=Math.log2(bit)+1;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;const stop=search();a[at]=0;rows[r]^=bit;cols[c]^=bit;boxes[b]^=bit;if(stop)return true;}
    return false;
  }
  search();return {count:aborted?0:count,solution:aborted?null:solution};
}
export function generate(seed,difficulty='medium'){
  if(!Object.hasOwn(DIFFICULTIES,difficulty))difficulty='medium';const random=rng(seed);
  const rows=shuffle([0,1,2],random).flatMap((b)=>shuffle([0,1,2],random).map((n)=>b*3+n));
  const cols=shuffle([0,1,2],random).flatMap((b)=>shuffle([0,1,2],random).map((n)=>b*3+n));
  const digits=shuffle([1,2,3,4,5,6,7,8,9],random);
  const solution=rows.flatMap((r)=>cols.map((c)=>digits[(r*3+Math.floor(r/3)+c)%9])),givens=[...solution];
  let left=81;
  for(const index of shuffle(Array.from({length:81},(_,i)=>i),random)){
    if(left<=DIFFICULTIES[difficulty])break;const old=givens[index];givens[index]=0;
    if(solve(givens,2).count===1)left--;else givens[index]=old;
  }
  return {givens,solution};
}
export function create({seed=1,difficulty='medium'}={}){
  if(!Object.hasOwn(DIFFICULTIES,difficulty))difficulty='medium';const puzzle=generate(seed,difficulty);
  return {id:`sdk-${seed>>>0}`,difficulty,seed:seed>>>0,...puzzle,values:[...puzzle.givens],notes:Array(81).fill(0),selected:puzzle.givens.indexOf(0),pencil:false,showErrors:false,hints:0,elapsedMs:0,paused:false,status:'playing',undo:[],redo:[]};
}
const snapshot=(s)=>({values:[...s.values],notes:[...s.notes]});
function remember(s){s.undo.push(snapshot(s));if(s.undo.length>100)s.undo.shift();s.redo=[];}
function finish(s){s.status=s.values.every((v,i)=>v===s.solution[i])?'won':'playing';}
export function input(s,n){
  if(s.paused||s.status!=='playing'||!integer(n,0,9)||!integer(s.selected,0,80)||s.givens[s.selected])return false;
  const i=s.selected;remember(s);
  if(s.pencil&&n){s.values[i]=0;s.notes[i]^=1<<(n-1);}else {s.values[i]=n;s.notes[i]=0;}
  finish(s);return true;
}
export function undo(s,redo=false){
  const from=redo?s.redo:s.undo,to=redo?s.undo:s.redo;if(!from.length||s.paused)return false;
  to.push(snapshot(s));if(to.length>100)to.shift();const a=from.pop();s.values=[...a.values];s.notes=[...a.notes];finish(s);return true;
}
export function hint(s){
  if(s.paused||s.status!=='playing')return false;let i=s.selected;
  if(s.givens[i]||s.values[i]===s.solution[i])i=s.values.findIndex((v,j)=>v!==s.solution[j]);
  if(i<0)return false;remember(s);s.selected=i;s.values[i]=s.solution[i];s.notes[i]=0;s.hints++;finish(s);return true;
}
export function fillNotes(s){if(s.paused||s.status!=='playing')return false;remember(s);s.notes=s.values.map((v,i)=>v?0:candidates(s.values,i));return true;}
export function restore(x){
  try {
    if(!x||!Object.hasOwn(DIFFICULTIES,x.difficulty)||!validArray(x.givens)||!validArray(x.values)||!validArray(x.solution)||conflicts(x.solution).length||x.solution.includes(0))return null;
    if(x.givens.some((v,i)=>v&&(v!==x.solution[i]||v!==x.values[i]))||solve(x.givens,2).count!==1)return null;
    const notes=(a)=>Array.isArray(a)&&a.length===81&&a.every((n)=>integer(n,0,511));
    if(!notes(x.notes)||!integer(x.selected,0,80)||!integer(x.hints,0,10000)||!Number.isFinite(x.elapsedMs)||x.elapsedMs<0||x.elapsedMs>1e12||!['playing','won'].includes(x.status))return null;
    const history=(a)=>Array.isArray(a)&&a.length<=100&&a.every((v)=>validArray(v.values)&&notes(v.notes)&&!x.givens.some((n,i)=>n&&n!==v.values[i]));
    if(!history(x.undo)||!history(x.redo))return null;
    const copy=(h)=>h.map((a)=>({values:[...a.values],notes:[...a.notes]}));
    const s={id:typeof x.id==='string'?x.id.slice(0,60):'sdk-restored',difficulty:x.difficulty,seed:x.seed>>>0,givens:[...x.givens],solution:[...x.solution],values:[...x.values],notes:[...x.notes],selected:x.selected,pencil:!!x.pencil,showErrors:!!x.showErrors,hints:x.hints,elapsedMs:x.elapsedMs,paused:true,status:x.status,undo:copy(x.undo),redo:copy(x.redo)};finish(s);return s;
  }catch{return null;}
}
