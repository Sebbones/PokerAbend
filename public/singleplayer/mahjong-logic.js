// Mahjong-Solitär mit eigenen Steinmotiven: gleiche, freie Steine paarweise entfernen. Layouts sind garantiert lösbar,
// weil die Belegung rückwärts erzeugt wird (immer zwei gerade freie Plätze bekommen ein Paar).
import {base,validBase,restoreBase,playable,clock,integer} from './puzzle-base.js';
import {next,rng,shuffle} from './random.js';
export const DIFFICULTIES={easy:{layout:'pyramide',kinds:12},normal:{layout:'bruecke',kinds:18},hard:{layout:'turm',kinds:18}};
export const KINDS=18;
export const LAYOUT_NAMES={pyramide:['Pyramide','Pyramid'],bruecke:['Brücke','Bridge'],turm:['Turm','Tower']};
const block=(z,x0,y0,cols,rows)=>Array.from({length:cols*rows},(_,i)=>[z,x0+2*(i%cols),y0+2*Math.floor(i/cols)]);
// Ein Stein belegt 2×2 Einheiten; [Ebene, x, y]. Alle Ebenen liegen auf demselben Raster.
export const LAYOUTS={
  pyramide:[...block(0,0,0,6,4),...block(1,2,2,4,2),...block(2,4,2,2,2)],
  bruecke:[...block(0,0,0,8,5),...block(1,2,2,6,3),...block(2,4,4,4,1)],
  turm:[...block(0,0,0,10,6),...block(1,4,2,6,4),...block(2,6,4,4,2),...block(3,8,4,2,2)],
};
export const layout=s=>LAYOUTS[DIFFICULTIES[s.difficulty].layout];
const overlap=(a,b)=>Math.abs(a[1]-b[1])<2&&Math.abs(a[2]-b[2])<2;
// Frei = nichts liegt darauf und links oder rechts ist kein Stein auf derselben Ebene
export function freeIn(pos,alive,i){
  const p=pos[i];
  for(const j of alive)if(j!==i&&pos[j][0]===p[0]+1&&overlap(p,pos[j]))return false;
  let left=false,right=false;
  for(const j of alive){const q=pos[j];if(j===i||q[0]!==p[0]||Math.abs(q[2]-p[2])>=2)continue;if(q[1]===p[1]-2)left=true;if(q[1]===p[1]+2)right=true;}
  return !left||!right;
}
export const aliveOf=s=>s.tiles.flatMap((k,i)=>k===null?[]:[i]);
export const free=(s,i)=>s.tiles[i]!==null&&freeIn(layout(s),aliveOf(s),i);
export function freeTiles(s){const pos=layout(s),alive=aliveOf(s);return alive.filter(i=>freeIn(pos,alive,i));}
export function pairs(s){const f=freeTiles(s),out=[];for(let a=0;a<f.length;a++)for(let b=a+1;b<f.length;b++)if(s.tiles[f[a]]===s.tiles[f[b]])out.push([f[a],f[b]]);return out;}
// Belegt die Plätze rückwärts lösbar: kinds = Liste der Paar-Motive (eine Zahl je Paar)
function assignOnce(pos,positions,pairKinds,random){
  const left=new Set(positions),tiles=Array(pos.length).fill(null),order=[];
  for(const kind of pairKinds){
    const alive=[...left],open=alive.filter(i=>freeIn(pos,alive,i));
    const options=[];for(let a=0;a<open.length;a++)for(let b=a+1;b<open.length;b++)options.push([open[a],open[b]]);
    // Nur Paare, nach denen noch mindestens zwei Steine frei sind (oder nichts übrig ist) – sonst käme die Rückwärts-Belegung in eine Sackgasse
    const good=shuffle(options,random).find(([x,y])=>{const rest=alive.filter(i=>i!==x&&i!==y);return !rest.length||rest.filter(i=>freeIn(pos,rest,i)).length>=2;});
    if(!good)return null;
    for(const i of good){tiles[i]=kind;left.delete(i);}
    order.push([...good]);
  }
  return {tiles,order};
}
function assign(pos,positions,pairKinds,random){
  for(let attempt=0;attempt<200;attempt++){const result=assignOnce(pos,positions,pairKinds,random);if(result)return result;}
  throw new Error('Kein lösbares Layout gefunden');
}
const pairKindsFor=(count,kinds,random)=>shuffle(Array.from({length:count},(_,i)=>i%kinds),random);
// Für Tests: die Abbaureihenfolge, mit der das Layout erzeugt wurde (ein Beweis für Lösbarkeit)
export function solution({difficulty='normal',seed=1}={}){const b=base(difficulty,seed),spec=DIFFICULTIES[b.difficulty],pos=LAYOUTS[spec.layout],random=rng(seed);return assign(pos,pos.map((_,i)=>i),pairKindsFor(pos.length/2,spec.kinds,random),random).order;}
export function create({difficulty='normal',seed=1}={}){
  const b=base(difficulty,seed),spec=DIFFICULTIES[b.difficulty],pos=LAYOUTS[spec.layout],random=rng(seed);
  const {tiles}=assign(pos,pos.map((_,i)=>i),pairKindsFor(pos.length/2,spec.kinds,random),random);
  return {...b,tiles,selected:null,history:[],hints:0,shuffles:0,removed:0,notice:'',started:true};
}
// Nach jedem Zug: Sackgasse → neu mischen (bleibt lösbar)
export function shuffleRemaining(s){
  const pos=layout(s),alive=aliveOf(s),counts=new Map();alive.forEach(i=>counts.set(s.tiles[i],(counts.get(s.tiles[i])||0)+1));
  const pairKinds=[...counts].flatMap(([k,n])=>Array(n/2).fill(k)),random=rng(s.seed^0x9e3779b9);
  const r=next(s.seed);s.seed=r.seed;
  let tiles;try{({tiles}=assign(pos,alive,shuffle(pairKinds,random),random));}catch{return false;} // die übrige Form lässt sich nicht mehr abbauen
  s.tiles=s.tiles.map((_,i)=>alive.includes(i)?tiles[i]:null);s.selected=null;s.shuffles++;return true;
}
function settle(s){
  if(!aliveOf(s).length){s.status='won';return;}
  if(!pairs(s).length){if(shuffleRemaining(s))s.notice='shuffled';else{s.status='lost';s.selected=null;}}
}
export function select(s,i){
  if(!playable(s)||!integer(i,0,s.tiles.length-1)||!free(s,i))return false;
  s.notice='';
  if(s.selected===null){s.selected=i;return true;}
  if(s.selected===i){s.selected=null;return true;}
  if(s.tiles[s.selected]!==s.tiles[i]){s.selected=i;return true;}
  s.history.push([s.selected,i,s.tiles[i],s.seed]);
  s.tiles[s.selected]=null;s.tiles[i]=null;s.selected=null;s.removed++;settle(s);return true;
}
export function undo(s){
  if(s.paused||!s.history.length)return false;
  const [a,b,kind]=s.history.pop();s.tiles[a]=kind;s.tiles[b]=kind;s.selected=null;s.removed--;s.status='playing';s.notice='';return true;
}
// Tipp: das Paar, das die meisten weiteren Steine freigibt
export function hint(s){
  if(!playable(s))return null;
  const options=pairs(s);if(!options.length)return null;
  const pos=layout(s),alive=aliveOf(s);let best=null;
  for(const [a,b] of options){const rest=alive.filter(i=>i!==a&&i!==b),gain=rest.filter(i=>freeIn(pos,rest,i)).length;if(!best||gain>best.gain)best={pair:[a,b],gain};}
  s.hints++;s.notice='';return best.pair;
}
export const tick=(s,ms)=>{clock(s,ms);return false;};
export function restore(x){
  if(!validBase(x))return null;const spec=DIFFICULTIES[x.difficulty],n=LAYOUTS[spec.layout].length;
  if(!Array.isArray(x.tiles)||x.tiles.length!==n||!x.tiles.every(k=>k===null||integer(k,0,spec.kinds-1)))return null;
  const counts=new Map();for(const k of x.tiles)if(k!==null)counts.set(k,(counts.get(k)||0)+1);
  if([...counts.values()].some(c=>c%2))return null;
  if(!integer(x.removed,0,n/2)||x.removed!==(n-x.tiles.filter(k=>k!==null).length)/2||!integer(x.hints,0,1e6)||!integer(x.shuffles,0,1e6))return null;
  if(!Array.isArray(x.history)||x.history.length>n/2||!x.history.every(h=>Array.isArray(h)&&h.length===4&&integer(h[0],0,n-1)&&integer(h[1],0,n-1)&&h[0]!==h[1]&&integer(h[2],0,spec.kinds-1)&&integer(h[3],0,4294967295)&&x.tiles[h[0]]===null&&x.tiles[h[1]]===null))return null;
  if(x.selected!==null&&(!integer(x.selected,0,n-1)||x.tiles[x.selected]===null))return null;
  const left=x.tiles.some(k=>k!==null);
  if((x.status==='won')===left||x.status==='lost'&&!left)return null;
  const state={...restoreBase(x),tiles:[...x.tiles],selected:x.selected,history:x.history.map(h=>[...h]),hints:x.hints,shuffles:x.shuffles,removed:x.removed,notice:''};
  if(left&&(state.status==='playing')===!pairs(state).length)return null;
  return state;
}
