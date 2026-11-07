import {base,validBase,restoreBase,playable,clock,indices,integer} from './puzzle-base.js';
export const DIFFICULTIES={easy:1,normal:3,hard:4};
export const DIRECTIONS={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const designs=[
 ['first','easy',['Die erste Lieferung','First delivery'],['#######','#  .  #','#  $  #','# @   #','#######']],
 ['corner','easy',['Zwei Stellplätze','Two bays'],['#######','#     #','# .$. #','#  $  #','#  @  #','#######']],
 ['courtyard','normal',['Innenhof','Courtyard'],['########','#  . . #','#      #','#  $$  #','#  $ . #','# @    #','#      #','########']],
 ['wings','normal',['Zwei Flügel','Two wings'],['#########','# . # . #','#   #   #','# $   $ #','#   $   #','# . # @ #','#   #   #','#########']],
 ['pillars','hard',['Säulenhalle','Pillar hall'],['#########','#.  #  .#','# $ # $ #','#   #   #','### @ ###','#   #   #','# $ # $ #','#.  #  .#','#########']],
 ['workshop','hard',['Vier Werkbänke','Four workbenches'],['#########','#  .#.  #','# $ # $ #','#   #   #','### @ ###','#   #   #','# $ # $ #','#  .#.  #','#########']],
];
export function parse(rows){const width=rows[0]?.length,height=rows.length;if(!integer(width,3,20)||!integer(height,3,20)||!rows.every(r=>r.length===width&&/^[# .$@*+]+$/.test(r)))throw Error('Invalid warehouse');let player=-1;const walls=[],goals=[],crates=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const at=y*width+x,c=rows[y][x];if((x===0||y===0||x===width-1||y===height-1)&&c!=='#')throw Error('Open boundary');if(c==='#')walls.push(at);if('.+*'.includes(c))goals.push(at);if('$*'.includes(c))crates.push(at);if('@+'.includes(c)){if(player>=0)throw Error('Two workers');player=at;}}
 if(player<0||!goals.length||goals.length!==crates.length)throw Error('Missing worker/crate/goal');return {width,height,walls,goals,crates,player};}
export const LEVELS=designs.map(([id,difficulty,name,rows])=>({id,difficulty,name,...parse(rows)}));
export const level=s=>LEVELS.find(l=>l.id===s.level);
export function destination(l,i,direction){const d=DIRECTIONS[direction];if(!d)return -1;const x=i%l.width+d[0],y=Math.floor(i/l.width)+d[1];return x<0||y<0||x>=l.width||y>=l.height?-1:y*l.width+x;}
export function legal(l,player,crates,dir){const to=destination(l,player,dir);if(to<0||l.walls.includes(to))return null;const next=[...crates],at=next.indexOf(to);if(at>=0){const beyond=destination(l,to,dir);if(beyond<0||l.walls.includes(beyond)||next.includes(beyond))return null;next[at]=beyond;}return {player:to,crates:next.sort((a,b)=>a-b),push:at>=0};}
export const complete=(s)=>s.crates.every(i=>level(s).goals.includes(i));
export function create({difficulty='normal',level:id,seed=1}={}){const b=base(difficulty,seed),l=LEVELS.find(l=>l.id===id&&l.difficulty===b.difficulty)||LEVELS.find(l=>l.difficulty===b.difficulty);return {...b,level:l.id,player:l.player,crates:[...l.crates].sort((a,b)=>a-b),moves:0,pushes:0,undo:[]};}
const snapshot=s=>({player:s.player,crates:[...s.crates],moves:s.moves,pushes:s.pushes});
export function move(s,dir){if(!playable(s))return false;const next=legal(level(s),s.player,s.crates,dir);if(!next)return false;s.undo.push(snapshot(s));if(s.undo.length>100)s.undo.shift();s.player=next.player;s.crates=next.crates;s.moves++;s.pushes+=Number(next.push);s.started=true;if(complete(s))s.status='won';return true;}
export function undo(s){if(!s.undo.length||s.paused&&s.status==='playing')return false;Object.assign(s,s.undo.pop(),{status:'playing',paused:false});return true;}
export function tick(s,ms){clock(s,ms);return false;}
export function restore(x){if(!validBase(x)||x.status==='lost')return null;const l=level(x);if(!l||l.difficulty!==x.difficulty||!Array.isArray(x.undo)||x.undo.length>100)return null;
 const valid=a=>a&&integer(a.player,0,l.width*l.height-1)&&!l.walls.includes(a.player)&&indices(a.crates,l.width*l.height)&&a.crates.length===l.goals.length&&!a.crates.includes(a.player)&&!a.crates.some(i=>l.walls.includes(i))&&integer(a.moves,0,1e9)&&integer(a.pushes,0,a.moves);
 if(!valid(x)||!x.undo.every(valid)||(x.status==='won')!==complete(x)||!x.started&&(x.elapsedMs||x.moves||x.undo.length||x.player!==l.player||JSON.stringify(x.crates)!==JSON.stringify([...l.crates].sort((a,b)=>a-b))))return null;
 const chain=[...x.undo,x];for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i];if(!Object.keys(DIRECTIONS).some(d=>{const n=legal(l,a.player,a.crates,d);return n&&n.player===b.player&&JSON.stringify(n.crates)===JSON.stringify(b.crates)&&a.moves+1===b.moves&&a.pushes+Number(n.push)===b.pushes;}))return null;}
 return {...restoreBase(x),level:l.id,...snapshot(x),undo:x.undo.map(snapshot)};}
// Independent push-state BFS used by tests, never run on the UI thread.
export function solve(l,budget=100000){const initial={player:l.player,crates:[...l.crates].sort((a,b)=>a-b),path:[]},queue=[initial],seen=new Set();let visited=0;
 for(let head=0;head<queue.length;head++){if(++visited>budget)return {solution:null,exhausted:true,visited};const s=queue[head];if(s.crates.every(i=>l.goals.includes(i)))return {solution:s.path,exhausted:false,visited};
 const walks=new Map([[s.player,[]]]),reachable=[s.player];for(let j=0;j<reachable.length;j++)for(const d of Object.keys(DIRECTIONS)){const at=destination(l,reachable[j],d);if(at<0||l.walls.includes(at)||s.crates.includes(at)||walks.has(at))continue;walks.set(at,[...walks.get(reachable[j]),d]);reachable.push(at);}
 const key=[Math.min(...reachable),...s.crates].join(',');if(seen.has(key))continue;seen.add(key);
 for(const box of s.crates)for(const [dir,[dx,dy]]of Object.entries(DIRECTIONS)){const behind=destination(l,box,Object.keys(DIRECTIONS).find(d=>DIRECTIONS[d][0]===-dx&&DIRECTIONS[d][1]===-dy));if(!walks.has(behind))continue;const next=legal(l,behind,s.crates,dir);if(next?.push)queue.push({player:next.player,crates:next.crates,path:[...s.path,...walks.get(behind),dir]});}}
 return {solution:null,exhausted:false,visited};}
