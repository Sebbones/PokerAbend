import {base,validBase,restoreBase,playable,clock,array,integer} from './puzzle-base.js';
export const DIFFICULTIES={easy:5,normal:10,hard:15};
const expand=(rows,scale)=>rows.flatMap(row=>Array(scale).fill([...row].map(v=>v.repeat(scale)).join(''))).map(row=>[...row].map(Number)).flat();
export const LEVELS=[
 ['gem','easy',['Raute','Diamond'],['00100','01110','11111','01110','00100']],
 ['heart','easy',['Herz','Heart'],['01010','11111','11111','01110','00100']],
 ['house','normal',['Giebelhaus','Gabled house'],['00100','01110','11111','10101','11111']],
 ['flag','normal',['Wimpel','Pennant'],['11110','10000','11100','10000','10000']],
 ['tree','hard',['Tanne','Fir tree'],['00100','01110','11111','00100','01110']],
 ['castle','hard',['Pixelburg','Pixel castle'],['10101','11111','01110','01010','11111']],
].map(([id,difficulty,name,rows])=>({id,difficulty,name,size:DIFFICULTIES[difficulty],solution:expand(rows,DIFFICULTIES[difficulty]/5)}));
export function runs(line){const out=[];let n=0;for(const v of [...line,0]){if(v)n++;else if(n){out.push(n);n=0;}}return out.length?out:[0];}
export function clues(solution,n){return {rows:Array.from({length:n},(_,y)=>runs(solution.slice(y*n,(y+1)*n))),columns:Array.from({length:n},(_,x)=>runs(Array.from({length:n},(_,y)=>solution[y*n+x])))};}
export function patterns(n,clue){if(clue.length===1&&clue[0]===0)return [0];const out=[];function add(k,start,mask){if(k===clue.length){out.push(mask);return;}const remaining=clue.slice(k+1).reduce((a,b)=>a+b,0)+clue.length-k-1;for(let i=start;i<=n-clue[k]-remaining;i++)add(k+1,i+clue[k]+1,mask|((1<<clue[k])-1)<<i);}add(0,0,0);return out;}
// Independent row/column constraint solver. The budget is also applied to external inputs.
export function solve(input,limit=2,budget=30000){const n=input?.rows?.length;if(!integer(n,1,15)||!array(input.columns,n,c=>Array.isArray(c))||![...input.rows,...input.columns].every(c=>Array.isArray(c)&&c.length&&c.every(v=>integer(v,0,n))&&(c[0]===0?c.length===1:c.every(v=>v>0))))return {count:0,solution:null,exhausted:false};
 const full=(1<<n)-1;let count=0,solution=null,nodes=0,exhausted=false;
 function search(rows,cols){if(count>=limit)return;if(++nodes>budget){exhausted=true;return;}let changed=true;while(changed){changed=false;if(rows.some(x=>!x.length)||cols.some(x=>!x.length))return;
   for(let y=0;y<n;y++){const yes=rows[y].reduce((a,b)=>a&b,full),no=full^rows[y].reduce((a,b)=>a|b,0);for(let x=0;x<n;x++){if(!((yes|no)&(1<<x)))continue;const next=cols[x].filter(v=>!!(v&(1<<y))===!!(yes&(1<<x)));if(next.length!==cols[x].length){cols[x]=next;changed=true;}}}
   for(let x=0;x<n;x++){if(!cols[x].length)return;const yes=cols[x].reduce((a,b)=>a&b,full),no=full^cols[x].reduce((a,b)=>a|b,0);for(let y=0;y<n;y++){if(!((yes|no)&(1<<y)))continue;const next=rows[y].filter(v=>!!(v&(1<<x))===!!(yes&(1<<y)));if(next.length!==rows[y].length){rows[y]=next;changed=true;}}}
 }
 if(rows.some(x=>!x.length)||cols.some(x=>!x.length))return;let axis=-1,index=-1,best=Infinity;for(const [a,list]of [rows,cols].entries())for(let i=0;i<n;i++)if(list[i].length>1&&list[i].length<best){axis=a;index=i;best=list[i].length;}
 if(axis<0){count++;solution=rows.flatMap(row=>Array.from({length:n},(_,i)=>(row[0]>>i)&1));return;}
 for(const choice of (axis===0?rows:cols)[index]){const a=rows.map(r=>[...r]),b=cols.map(c=>[...c]);(axis===0?a:b)[index]=[choice];search(a,b);if(count>=limit||exhausted)return;}}
 search(input.rows.map(c=>patterns(n,c)),input.columns.map(c=>patterns(n,c)));return {count,solution,exhausted};}
export function level(s){return LEVELS.find(l=>l.id===s.level);}
export const complete=(s,cells=s.cells)=>cells.every((v,i)=>(v===1)===!!level(s).solution[i]);
export function create({difficulty='normal',level:id,seed=1}={}){const b=base(difficulty,seed),l=LEVELS.find(l=>l.id===id&&l.difficulty===b.difficulty)||LEVELS.find(l=>l.difficulty===b.difficulty);return {...b,level:l.id,cells:Array(l.size*l.size).fill(0),selected:0,hints:0,undo:[]};}
export function mark(s,i,value=1){if(!playable(s)||!integer(i,0,s.cells.length-1)||![1,-1].includes(value))return false;s.undo.push([...s.cells]);if(s.undo.length>100)s.undo.shift();s.cells[i]=s.cells[i]===value?0:value;s.selected=i;s.started=true;if(complete(s))s.status='won';return true;}
export function hint(s){if(!playable(s))return false;const l=level(s),i=s.cells.findIndex((v,i)=>(v===1)!==!!l.solution[i]);if(i<0)return false;mark(s,i,l.solution[i]?1:-1);s.hints++;return true;}
export function undo(s){if(!s.undo.length||s.paused&&s.status==='playing')return false;s.cells=s.undo.pop();s.status='playing';s.paused=false;return true;}
export function tick(s,ms){clock(s,ms);return false;}
export function restore(x){if(!validBase(x)||x.status==='lost')return null;const l=level(x),n=l?.size**2;if(!l||l.difficulty!==x.difficulty||!array(x.cells,n,v=>[-1,0,1].includes(v))||!integer(x.selected,0,n-1)||!integer(x.hints,0,1e9)||!Array.isArray(x.undo)||x.undo.length>100||!x.undo.every(a=>array(a,n,v=>[-1,0,1].includes(v)))||(x.status==='won')!==complete(x)||!x.started&&(x.elapsedMs||x.hints||x.undo.length||x.cells.some(Boolean)))return null;
 return {...restoreBase(x),level:l.id,cells:[...x.cells],selected:x.selected,hints:x.hints,undo:x.undo.map(a=>[...a])};}
