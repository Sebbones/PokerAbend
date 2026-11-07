// Match-3 mit eigenem Pflanzen-Symbolsatz: benachbarte Felder tauschen, Dreierreihen räumen, Nachrutschen und Kaskaden.
import {base,validBase,restoreBase,playable,clock,integer} from './puzzle-base.js';
import {next,rng} from './random.js';
export const SIZE=8,KINDS=6,MAX_CASCADE=40;
export const DIFFICULTIES={easy:{kinds:5},normal:{kinds:6},hard:{kinds:6}};
// Eigene Level: Zugvorrat und Zielpunkte
export const LEVELS=[
  {id:'e1',difficulty:'easy',name:['Frühbeet','Seedbed'],moves:22,target:700},{id:'e2',difficulty:'easy',name:['Kräutergarten','Herb garden'],moves:20,target:900},{id:'e3',difficulty:'easy',name:['Obstwiese','Orchard'],moves:18,target:1000},
  {id:'n1',difficulty:'normal',name:['Gewächshaus','Greenhouse'],moves:22,target:1200},{id:'n2',difficulty:'normal',name:['Waldrand','Forest edge'],moves:20,target:1400},{id:'n3',difficulty:'normal',name:['Terrassenbeet','Terrace bed'],moves:18,target:1500},
  {id:'h1',difficulty:'hard',name:['Hochmoor','High moor'],moves:20,target:1500},{id:'h2',difficulty:'hard',name:['Dschungelpfad','Jungle trail'],moves:18,target:1700},{id:'h3',difficulty:'hard',name:['Wildwuchs','Wild growth'],moves:16,target:1800},
];
export const levelOf=s=>LEVELS.find(l=>l.id===s.level)||LEVELS[0];
const at=(g,r,c)=>g[r*SIZE+c];
// Alle Felder, die zu einer Reihe/Spalte aus mindestens drei gleichen Symbolen gehören
export function matches(g){
  const out=new Set();
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE-2;c++){const k=at(g,r,c);if(k>=0&&k===at(g,r,c+1)&&k===at(g,r,c+2)){let e=c;while(e<SIZE&&at(g,r,e)===k)out.add(r*SIZE+e++);}}
  for(let c=0;c<SIZE;c++)for(let r=0;r<SIZE-2;r++){const k=at(g,r,c);if(k>=0&&k===at(g,r+1,c)&&k===at(g,r+2,c)){let e=r;while(e<SIZE&&at(g,e,c)===k)out.add(e++*SIZE+c);}}
  return out;
}
export const adjacent=(a,b)=>integer(a,0,63)&&integer(b,0,63)&&Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE))+Math.abs(a%SIZE-b%SIZE)===1;
const swapped=(g,a,b)=>{const t=[...g];[t[a],t[b]]=[t[b],t[a]];return t;};
export function validSwaps(g){const out=[];for(let i=0;i<SIZE*SIZE;i++)for(const j of [i+1,i+SIZE]){if(j>=SIZE*SIZE||j===i+1&&j%SIZE===0)continue;if(matches(swapped(g,i,j)).size)out.push([i,j]);}return out;}
function fill(s,random,kinds){
  for(let i=0;i<SIZE*SIZE;i++){let k;do{const r=next(s.seed);s.seed=r.seed;k=Math.floor(r.value*kinds);}while(i%SIZE>=2&&s.grid[i-1]===k&&s.grid[i-2]===k||i>=2*SIZE&&s.grid[i-SIZE]===k&&s.grid[i-2*SIZE]===k);s.grid[i]=k;}
}
// Neues Brett ohne fertige Reihen, aber mit mindestens einem möglichen Zug
function settleBoard(s,kinds){for(let tries=0;tries<200;tries++){s.grid=Array(SIZE*SIZE).fill(-1);fill(s,null,kinds);if(validSwaps(s.grid).length)return;}throw new Error('Kein spielbares Brett');}
export function create({difficulty='normal',level,seed=1}={}){
  const b=base(difficulty,seed),spec=DIFFICULTIES[b.difficulty],lv=LEVELS.find(l=>l.id===level&&l.difficulty===b.difficulty)||LEVELS.find(l=>l.difficulty===b.difficulty);
  const s={...b,level:lv.id,grid:[],score:0,movesLeft:lv.moves,moves:0,selected:null,hints:0,combo:0,notice:'',started:true};
  settleBoard(s,spec.kinds);return s;
}
function resolve(s){
  const kinds=DIFFICULTIES[s.difficulty].kinds;let chain=0,gained=0;
  for(let step=0;step<MAX_CASCADE;step++){
    const m=matches(s.grid);if(!m.size)break;chain++;
    gained+=m.size*10*chain+Math.max(0,m.size-3)*20;
    for(const i of m)s.grid[i]=-1;
    for(let c=0;c<SIZE;c++){const col=[];for(let r=SIZE-1;r>=0;r--)if(s.grid[r*SIZE+c]>=0)col.push(s.grid[r*SIZE+c]);
      for(let r=SIZE-1;r>=0;r--){const idx=r*SIZE+c;if(col.length)s.grid[idx]=col.shift();else{const q=next(s.seed);s.seed=q.seed;s.grid[idx]=Math.floor(q.value*kinds);}}}
  }
  s.score+=gained;s.combo=chain;return chain;
}
export function swap(s,a,b){
  if(!playable(s)||!adjacent(a,b))return false;
  s.selected=null;s.notice='';
  const trial=swapped(s.grid,a,b);if(!matches(trial).size){s.notice='invalid';return false;}
  s.grid=trial;s.moves++;s.movesLeft--;resolve(s);
  const lv=levelOf(s);
  if(s.score>=lv.target)s.status='won';
  else if(s.movesLeft<=0)s.status='lost';
  else if(!validSwaps(s.grid).length){settleBoard(s,DIFFICULTIES[s.difficulty].kinds);s.notice='shuffled';}
  return true;
}
// Antippen: erstes Feld merken, zweites benachbartes tauscht
export function select(s,i){
  if(!playable(s)||!integer(i,0,SIZE*SIZE-1))return false;
  if(s.selected===null){s.selected=i;return true;}
  if(s.selected===i){s.selected=null;return true;}
  if(adjacent(s.selected,i))return swap(s,s.selected,i)||true;
  s.selected=i;return true;
}
export function hint(s){if(!playable(s))return null;const options=validSwaps(s.grid);if(!options.length)return null;s.hints++;
  let best=options[0],size=0;for(const [a,b] of options){const n=matches(swapped(s.grid,a,b)).size;if(n>size){size=n;best=[a,b];}}return best;}
export const tick=(s,ms)=>{clock(s,ms);return false;};
export function restore(x){
  if(!validBase(x))return null;const spec=DIFFICULTIES[x.difficulty],lv=LEVELS.find(l=>l.id===x.level&&l.difficulty===x.difficulty);
  if(!lv||!Array.isArray(x.grid)||x.grid.length!==SIZE*SIZE||!x.grid.every(k=>integer(k,0,spec.kinds-1))||matches(x.grid).size)return null;
  if(!integer(x.score,0,1e9)||!integer(x.moves,0,lv.moves)||!integer(x.movesLeft,0,lv.moves)||x.moves+x.movesLeft!==lv.moves||!integer(x.hints,0,1e6)||!integer(x.combo,0,MAX_CASCADE))return null;
  if(x.selected!==null&&!integer(x.selected,0,SIZE*SIZE-1))return null;
  if((x.status==='won')!==x.score>=lv.target||x.status==='lost'&&(x.movesLeft>0||x.score>=lv.target))return null;
  if(x.status==='playing'&&(x.movesLeft<=0||!validSwaps(x.grid).length))return null;
  return {...restoreBase(x),level:x.level,grid:[...x.grid],score:x.score,moves:x.moves,movesLeft:x.movesLeft,selected:x.selected,hints:x.hints,combo:x.combo,notice:''};
}
export {rng};
