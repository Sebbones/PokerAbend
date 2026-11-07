import {base,validBase,restoreBase,playable,clock,array,indices,integer} from './puzzle-base.js';
import {rng,shuffle} from './random.js';
export const DIFFICULTIES={easy:{size:8,mines:10},normal:{size:12,mines:22},hard:{size:16,mines:45}};
export function neighbours(i,n){const out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=i%n+dx,y=Math.floor(i/n)+dy;if((dx||dy)&&x>=0&&y>=0&&x<n&&y<n)out.push(y*n+x);}return out;}
export function layout(seed,difficulty,first){const {size,mines}=DIFFICULTIES[difficulty],safe=new Set([first,...neighbours(first,size)]);return shuffle(Array.from({length:size*size},(_,i)=>i).filter(i=>!safe.has(i)),rng(seed)).slice(0,mines).sort((a,b)=>a-b);}
export function create({difficulty='normal',seed=1}={}){const s=base(difficulty,seed),n=DIFFICULTIES[s.difficulty].size**2;return {...s,mines:[],opened:Array(n).fill(false),flags:Array(n).fill(false),first:-1,exploded:-1,selected:0};}
export const count=(s,i)=>neighbours(i,DIFFICULTIES[s.difficulty].size).filter(j=>s.mines.includes(j)).length;
export function flag(s,i){if(!playable(s)||!integer(i,0,s.flags.length-1)||s.opened[i]||!s.flags[i]&&s.flags.filter(Boolean).length>=DIFFICULTIES[s.difficulty].mines)return false;s.flags[i]=!s.flags[i];s.selected=i;return true;}
export function reveal(s,i){if(!playable(s)||!integer(i,0,s.opened.length-1)||s.opened[i]||s.flags[i])return false;s.selected=i;if(!s.started){s.first=i;s.mines=layout(s.seed,s.difficulty,i);s.started=true;}if(s.mines.includes(i)){s.opened[i]=true;s.exploded=i;s.status='lost';return true;}
 const n=DIFFICULTIES[s.difficulty].size,queue=[i],seen=new Set(queue);for(let at=0;at<queue.length;at++){const j=queue[at];if(s.flags[j]||s.mines.includes(j))continue;s.opened[j]=true;if(!count(s,j))for(const k of neighbours(j,n))if(!seen.has(k)){seen.add(k);queue.push(k);}}
 if(s.opened.filter(Boolean).length===n*n-s.mines.length)s.status='won';return true;}
export function tick(s,ms){clock(s,ms);return false;}
export function restore(x){if(!validBase(x))return null;const {size,mines}=DIFFICULTIES[x.difficulty],n=size*size;if(!array(x.opened,n,v=>typeof v==='boolean')||!array(x.flags,n,v=>typeof v==='boolean')||x.flags.filter(Boolean).length>mines||x.flags.some((v,i)=>v&&x.opened[i])||!indices(x.mines,n)||!integer(x.first,-1,n-1)||!integer(x.exploded,-1,n-1)||!integer(x.selected,0,n-1))return null;
 if(!x.started){if(x.first!==-1||x.mines.length||x.opened.some(Boolean)||x.status!=='playing'||x.exploded!==-1||x.elapsedMs)return null;}
 else{if(x.first<0||JSON.stringify(x.mines)!==JSON.stringify(layout(x.seed,x.difficulty,x.first))||!x.opened[x.first])return null;const hits=x.mines.filter(i=>x.opened[i]),won=x.opened.filter(Boolean).length===n-mines;if(x.status==='lost'?hits.length!==1||hits[0]!==x.exploded:hits.length||x.exploded!==-1||(x.status==='won')!==won)return null;}
 return {...restoreBase(x),mines:[...x.mines],opened:[...x.opened],flags:[...x.flags],first:x.first,exploded:x.exploded,selected:x.selected};}
