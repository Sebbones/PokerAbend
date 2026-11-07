// Block-Puzzle: drei angebotene Formen auf ein Raster setzen, volle Reihen und Spalten verschwinden. Formen werden nicht gedreht.
import {base,validBase,restoreBase,playable,clock,integer} from './puzzle-base.js';
import {next} from './random.js';
export const DIFFICULTIES={easy:{size:10,pool:'small'},normal:{size:10,pool:'normal'},hard:{size:8,pool:'all'}};
export const HISTORY=30;
// Eigene Formenliste (# = Feld). Reihenfolge ist Teil des gespeicherten Standes: nur am Ende ergänzen.
const SHAPE_ROWS=[['#'],['##'],['#','#'],['###'],['#','#','#'],['##','#.'],['##','.#'],['#.','##'],['.#','##'],['##','##'],['####'],['#','#','#','#'],['###','#..'],['###','..#'],['#..','###'],['..#','###'],['##','##','#.'],['###','###'],['##','##','##'],['#####'],['#','#','#','#','#'],['###','###','###'],['.#.','###'],['#.','##','#.']];
export const SHAPES=SHAPE_ROWS.map(rows=>rows.flatMap((line,r)=>[...line].flatMap((ch,c)=>ch==='#'?[[r,c]]:[])));
const POOLS={small:SHAPES.map((s,i)=>s.length<=4?i:-1).filter(i=>i>=0),normal:SHAPES.map((s,i)=>s.length<=5&&i!==19&&i!==20?i:-1).filter(i=>i>=0),all:SHAPES.map((_,i)=>i)};
export const size=s=>DIFFICULTIES[s.difficulty].size;
export const cellsOf=id=>SHAPES[id];
export const extent=id=>({rows:Math.max(...SHAPES[id].map(c=>c[0]))+1,cols:Math.max(...SHAPES[id].map(c=>c[1]))+1});
function deal(s){const pool=POOLS[DIFFICULTIES[s.difficulty].pool];s.pieces=[0,1,2].map(()=>{const r=next(s.seed);s.seed=r.seed;return pool[Math.floor(r.value*pool.length)];});}
export function create({difficulty='normal',seed=1}={}){const b=base(difficulty,seed),n=DIFFICULTIES[b.difficulty].size,s={...b,grid:Array(n*n).fill(0),pieces:[],score:0,combo:0,placed:0,history:[],lastCleared:[]};deal(s);s.started=true;return s;}
export function canPlace(s,id,row,col){const n=size(s);return integer(id,0,SHAPES.length-1)&&SHAPES[id].every(([r,c])=>{const y=row+r,x=col+c;return y>=0&&x>=0&&y<n&&x<n&&!s.grid[y*n+x];});}
export const fitsAnywhere=(s,id)=>{const n=size(s);for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(canPlace(s,id,r,c))return true;return false;};
const snapshot=s=>({grid:[...s.grid],pieces:[...s.pieces],score:s.score,combo:s.combo,placed:s.placed,seed:s.seed});
export function place(s,piece,row,col){
  if(!playable(s)||!integer(piece,0,2)||s.pieces[piece]===null||!canPlace(s,s.pieces[piece],row,col))return false;
  s.history.push(snapshot(s));if(s.history.length>HISTORY)s.history.shift();
  const n=size(s),shape=SHAPES[s.pieces[piece]];for(const [r,c] of shape)s.grid[(row+r)*n+col+c]=1;
  const full=[];for(let i=0;i<n;i++){if(Array.from({length:n},(_,c)=>s.grid[i*n+c]).every(Boolean))full.push(['r',i]);if(Array.from({length:n},(_,r)=>s.grid[r*n+i]).every(Boolean))full.push(['c',i]);}
  const clear=new Set();for(const [k,i] of full)for(let j=0;j<n;j++)clear.add(k==='r'?i*n+j:j*n+i);
  for(const i of clear)s.grid[i]=0;
  s.lastCleared=[...clear];s.score+=shape.length+(full.length?10*full.length*full.length+5*s.combo:0);s.combo=full.length?s.combo+1:0;s.placed++;
  s.pieces[piece]=null;if(s.pieces.every(p=>p===null))deal(s);
  if(!s.pieces.some(p=>p!==null&&fitsAnywhere(s,p)))s.status='lost';
  return true;
}
export function undo(s){if(s.status==='lost'&&!s.history.length||!s.history.length||s.paused)return false;Object.assign(s,s.history.pop());s.status='playing';s.lastCleared=[];return true;}
export function hint(s){if(!playable(s))return null;const n=size(s);let best=null;
  s.pieces.forEach((id,piece)=>{if(id===null)return;for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(canPlace(s,id,r,c)){const t=structuredClone(s);place(t,piece,r,c);const score=t.score-s.score;if(!best||score>best.score)best={piece,row:r,col:c,score};}});
  return best&&{piece:best.piece,row:best.row,col:best.col};}
export const tick=(s,ms)=>{clock(s,ms);return false;};
const validSnap=(x,n)=>x&&Array.isArray(x.grid)&&x.grid.length===n*n&&x.grid.every(v=>v===0||v===1)&&Array.isArray(x.pieces)&&x.pieces.length===3&&x.pieces.every(p=>p===null||integer(p,0,SHAPES.length-1))&&integer(x.score,0,1e9)&&integer(x.combo,0,1e6)&&integer(x.placed,0,1e6)&&integer(x.seed,0,4294967295);
export function restore(x){
  if(!validBase(x))return null;const n=DIFFICULTIES[x.difficulty].size;
  if(!validSnap(x,n)||!Array.isArray(x.history)||x.history.length>HISTORY||!x.history.every(h=>validSnap(h,n))||!Array.isArray(x.lastCleared)||!x.lastCleared.every(v=>integer(v,0,n*n-1)))return null;
  if(x.status==='won'||(x.status==='lost')!==!x.pieces.some(p=>p!==null&&(()=>{const t={difficulty:x.difficulty,grid:x.grid};return fitsAnywhere(t,p);})()))return null;
  return {...restoreBase(x),grid:[...x.grid],pieces:[...x.pieces],score:x.score,combo:x.combo,placed:x.placed,history:x.history.map(h=>({...h,grid:[...h.grid],pieces:[...h.pieces]})),lastCleared:[...x.lastCleared]};
}
