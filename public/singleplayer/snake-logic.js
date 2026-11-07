import {base,validBase,restoreBase,playable,clock,integer,indices} from './puzzle-base.js';
import {next} from './random.js';
export const DIFFICULTIES={easy:240,normal:160,hard:100},SIZE=16;
export const DIRECTIONS={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const opposite=(a,b)=>{const x=DIRECTIONS[a],y=DIRECTIONS[b];return x[0]===-y[0]&&x[1]===-y[1];};
export const interval=s=>Math.max(55,DIFFICULTIES[s.difficulty]-Math.floor(s.score/50)*8);
function food(s){const free=Array.from({length:SIZE*SIZE},(_,i)=>i).filter(i=>!s.body.includes(i));if(!free.length){s.food=null;s.status='won';return;}const r=next(s.seed);s.seed=r.seed;s.food=free[Math.floor(r.value*free.length)];}
export function create({difficulty='normal',seed=1}={}){const s={...base(difficulty,seed),body:[8*SIZE+7,8*SIZE+6,8*SIZE+5],direction:'right',queue:[],food:null,score:0,accumulator:0};food(s);s.started=true;return s;}
export function turn(s,direction){if(!playable(s)||!Object.hasOwn(DIRECTIONS,direction)||s.queue.length>=2)return false;const previous=s.queue.at(-1)||s.direction;if(direction===previous||opposite(direction,previous))return false;s.queue.push(direction);return true;}
export function step(s){if(!playable(s))return false;if(s.queue.length)s.direction=s.queue.shift();const [dx,dy]=DIRECTIONS[s.direction],head=s.body[0],x=head%SIZE+dx,y=Math.floor(head/SIZE)+dy,to=y*SIZE+x,grow=to===s.food;
 if(x<0||y<0||x>=SIZE||y>=SIZE||s.body.slice(0,grow?s.body.length:-1).includes(to)){s.status='lost';s.accumulator=0;return true;}
 s.body.unshift(to);if(grow){s.score+=10;food(s);if(s.status==='won')s.accumulator=0;}else s.body.pop();return true;}
export function tick(s,ms){let dt=clock(s,ms);if(!dt)return false;s.accumulator+=dt;let changed=false;while(playable(s)&&s.accumulator>=interval(s)){s.accumulator-=interval(s);changed=step(s)||changed;}return changed;}
export function restore(x){if(!validBase(x)||!indices(x.body,SIZE*SIZE)||x.body.length<3||!Object.hasOwn(DIRECTIONS,x.direction)||!Array.isArray(x.queue)||x.queue.length>2||!integer(x.score,0,2530)||x.score!==(x.body.length-3)*10||!Number.isFinite(x.accumulator)||x.accumulator<0||x.accumulator>=interval(x)||!x.started)return null;
 for(let i=1;i<x.body.length;i++)if(Math.abs(x.body[i]%SIZE-x.body[i-1]%SIZE)+Math.abs(Math.floor(x.body[i]/SIZE)-Math.floor(x.body[i-1]/SIZE))!==1)return null;
 let d=x.direction;for(const q of x.queue){if(!Object.hasOwn(DIRECTIONS,q)||q===d||opposite(d,q))return null;d=q;}
 if(x.status!=='lost'){const [dx,dy]=DIRECTIONS[x.direction];if(x.body[0]%SIZE-x.body[1]%SIZE!==dx||Math.floor(x.body[0]/SIZE)-Math.floor(x.body[1]/SIZE)!==dy)return null;}
 if(x.status==='won'?x.body.length!==SIZE*SIZE||x.food!==null:!integer(x.food,0,SIZE*SIZE-1)||x.body.includes(x.food)||x.body.length===SIZE*SIZE)return null;
 return {...restoreBase(x),body:[...x.body],direction:x.direction,queue:[...x.queue],food:x.food,score:x.score,accumulator:x.accumulator};}
