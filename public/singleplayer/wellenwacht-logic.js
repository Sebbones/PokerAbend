// Fixed-step simulation. Reverse breadth-first search is shortest-path finding on this unit-cost grid.
import {integer} from './random.js';
export const WIDTH=14,HEIGHT=9,STEP=.05,WAVES=12;
const cell=(x,y)=>y*WIDTH+x;
export const MAPS={
  meadow:{name:['Kupferwiesen','Copper meadows'],starts:[cell(0,4)],goal:cell(13,4),walls:[cell(4,1),cell(4,2),cell(4,6),cell(4,7),cell(9,2),cell(9,3),cell(9,5),cell(9,6)]},
  delta:{name:['Zwillingsdelta','Twin delta'],starts:[cell(0,1),cell(0,7)],goal:cell(13,4),walls:[cell(3,3),cell(3,4),cell(3,5),cell(7,0),cell(7,1),cell(7,7),cell(7,8),cell(10,3),cell(10,5)]},
};
export const TOWERS={
  bolt:{name:['Nadelwerk','Needlework'],cost:45,range:3,damage:10,interval:.6,color:'#f5c56b'},
  cannon:{name:['Glutkessel','Ember cannon'],cost:80,range:3.2,damage:28,interval:1.35,splash:1.2,color:'#f69b72'},
  frost:{name:['Raureif','Rime spire'],cost:65,range:2.8,damage:5,interval:.85,slow:.5,color:'#7ddde3'},
  arc:{name:['Funkenmast','Spark mast'],cost:100,range:3.1,damage:19,interval:1,chain:3,color:'#bbadff'},
};
export const ENEMIES={
  crawler:{name:['Kriecher','Crawler'],hp:38,speed:1.05,reward:7,color:'#dbb76b'},
  sprinter:{name:['Flitzer','Sprinter'],hp:25,speed:1.85,reward:7,color:'#86d4b5'},
  armored:{name:['Panzerling','Armoured beetle'],hp:100,speed:.65,reward:14,color:'#e69382'},
  swarm:{name:['Schwärmer','Swarm mote'],hp:17,speed:1.4,reward:4,color:'#b5a0e5'},
};
export const DIFFICULTIES={easy:{hp:.8,lives:20,money:210},normal:{hp:1,lives:15,money:180},hard:{hp:1.25,lives:10,money:165}};
export const adjacent=(i)=>[i-WIDTH,i+1,i+WIDTH,i-1].filter((j)=>j>=0&&j<WIDTH*HEIGHT&&Math.abs(j%WIDTH-i%WIDTH)+Math.abs(Math.floor(j/WIDTH)-Math.floor(i/WIDTH))===1);
export function distances(map,towers=[]){
  const m=MAPS[map];if(!m)return [];
  const blocked=new Set([...m.walls,...towers.map((t)=>t.cell)]),d=Array(WIDTH*HEIGHT).fill(-1),queue=[m.goal];d[m.goal]=0;
  for(let head=0;head<queue.length;head++)for(const n of adjacent(queue[head]))if(d[n]<0&&!blocked.has(n)){d[n]=d[queue[head]]+1;queue.push(n);}
  return d;
}
export function route(s,start=MAPS[s.map].starts[0]){
  const d=distances(s.map,s.towers),out=[start];if(d[start]<0)return [];
  while(d[out.at(-1)]>0){const n=adjacent(out.at(-1)).find((n)=>d[n]===d[out.at(-1)]-1);if(n===undefined||out.length>WIDTH*HEIGHT)return [];out.push(n);}return out;
}
export function create({map='meadow',difficulty='normal',seed=1}={}){
  if(!Object.hasOwn(MAPS,map))map='meadow';if(!Object.hasOwn(DIFFICULTIES,difficulty))difficulty='normal';
  return {id:`ww-${seed>>>0}`,map,difficulty,coins:DIFFICULTIES[difficulty].money,lives:DIFFICULTIES[difficulty].lives,wave:0,status:'playing',paused:false,speed:1,time:0,carry:0,nextId:1,towers:[],enemies:[],queue:[],spawnIn:0,active:false,kills:0,shots:[],selected:-1};
}
export const position=(e)=>{const p=e.next===null?0:e.progress;return {x:e.cell%WIDTH+(e.next===null?0:e.next%WIDTH-e.cell%WIDTH)*p+.5,y:Math.floor(e.cell/WIDTH)+(e.next===null?0:Math.floor(e.next/WIDTH)-Math.floor(e.cell/WIDTH))*p+.5};};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const upgradeCost=(t)=>Math.round(TOWERS[t.kind].cost*(t.level===1?.8:1.2));
export const investment=(t)=>TOWERS[t.kind].cost+(t.level>=2?Math.round(TOWERS[t.kind].cost*.8):0)+(t.level>=3?Math.round(TOWERS[t.kind].cost*1.2):0);
export const sellValue=(t)=>Math.floor(investment(t)*.65);
export const towerStats=(t)=>{const k=TOWERS[t.kind];return {...k,range:k.range+(t.level-1)*.3,damage:k.damage*(1+(t.level-1)*.65),interval:k.interval/(1+(t.level-1)*.12)};};
export function placement(s,at,kind){
  if(s.paused||s.status!=='playing')return 'inactive';
  const m=MAPS[s.map];if(!Object.hasOwn(TOWERS,kind)||!integer(at,0,WIDTH*HEIGHT-1)||m.walls.includes(at)||m.starts.includes(at)||m.goal===at||s.towers.some((t)=>t.cell===at))return 'occupied';
  if(s.enemies.some((e)=>e.cell===at||e.next===at))return 'enemy';
  if(s.coins<TOWERS[kind].cost)return 'money';
  const d=distances(s.map,[...s.towers,{cell:at}]);
  if([...m.starts,...s.enemies.flatMap((e)=>[e.cell,...(e.next===null?[]:[e.next])])].some((i)=>d[i]<0))return 'blocked';return null;
}
export function buy(s,at,kind){const error=placement(s,at,kind);if(error)return {ok:false,error};s.coins-=TOWERS[kind].cost;s.towers.push({cell:at,kind,level:1,cooldown:0});return {ok:true};}
export function upgrade(s,at){const t=s.towers.find((t)=>t.cell===at);if(s.paused||s.status!=='playing'||!t||t.level>=3||s.coins<upgradeCost(t))return false;s.coins-=upgradeCost(t);t.level++;return true;}
export function sell(s,at){const t=s.towers.find((t)=>t.cell===at);if(s.paused||s.status!=='playing'||!t)return false;s.coins+=sellValue(t);s.towers=s.towers.filter((x)=>x!==t);return true;}
export function waveQueue(wave){const kinds=['crawler','sprinter','swarm','armored'];return Array.from({length:6+wave*2},(_,i)=>wave<2?'crawler':kinds[(i+wave)%Math.min(4,wave)]);}
export function startWave(s){if(s.paused||s.status!=='playing'||s.active||s.wave>=WAVES)return false;s.wave++;s.queue=waveQueue(s.wave);s.spawnIn=0;s.active=true;return true;}
function tick(s,dt){
  s.time+=dt;s.shots=s.shots.filter((p)=>(p.ttl-=dt)>0);
  if(s.queue.length){s.spawnIn-=dt;if(s.spawnIn<=0){const kind=s.queue.shift(),k=ENEMIES[kind],m=MAPS[s.map],hp=k.hp*(1+(s.wave-1)*.17)*DIFFICULTIES[s.difficulty].hp;s.enemies.push({id:s.nextId++,kind,cell:m.starts[(s.nextId-2)%m.starts.length],next:null,progress:0,hp,maxHp:hp,slowUntil:0});s.spawnIn+=Math.max(.35,.85-s.wave*.025);}}
  const d=distances(s.map,s.towers);
  for(const t of s.towers){t.cooldown=Math.max(0,t.cooldown-dt);if(t.cooldown>1e-9)continue;const k=towerStats(t),origin={x:t.cell%WIDTH+.5,y:Math.floor(t.cell/WIDTH)+.5};
    const targets=s.enemies.filter((e)=>e.hp>0&&distance(origin,position(e))<=k.range).sort((a,b)=>(d[a.cell]-a.progress)-(d[b.cell]-b.progress)||a.id-b.id);
    if(!targets.length)continue;const first=targets[0],p=position(first);let hits=[first];
    if(k.splash)hits=s.enemies.filter((e)=>e.hp>0&&distance(p,position(e))<=k.splash);
    if(k.chain){for(const e of targets.slice(1))if(hits.length<k.chain&&distance(position(hits.at(-1)),position(e))<=2.4)hits.push(e);}
    hits.forEach((e,i)=>{e.hp-=k.damage*(k.chain?(.7**i):1);if(k.slow)e.slowUntil=s.time+1.6;s.shots.push({from:origin,to:position(e),kind:t.kind,ttl:.18});});t.cooldown=k.interval;
  }
  const alive=[];
  for(const e of s.enemies){if(e.hp<=0){s.coins+=ENEMIES[e.kind].reward;s.kills++;continue;}
    let travel=dt*ENEMIES[e.kind].speed*(e.slowUntil>s.time?.5:1),escaped=false;
    // A tick cannot traverse more than one edge with current speeds; the bound also guards malformed future data.
    for(let n=0;n<WIDTH*HEIGHT&&travel>0;n++){
      if(e.cell===MAPS[s.map].goal){escaped=true;break;}
      if(e.next===null){e.next=adjacent(e.cell).find((i)=>d[i]===d[e.cell]-1)??null;if(e.next===null)break;}
      const step=Math.min(travel,1-e.progress);e.progress+=step;travel-=step;
      if(e.progress>=1-1e-9){e.cell=e.next;e.next=null;e.progress=0;if(e.cell===MAPS[s.map].goal){escaped=true;break;}}
    }
    if(escaped)s.lives--;else alive.push(e);
  }
  s.enemies=alive;s.shots=s.shots.slice(-256);
  if(s.lives<=0){s.lives=0;s.status='lost';s.active=false;s.queue=[];s.shots=[];}
  else if(!s.queue.length&&!s.enemies.length){s.active=false;s.coins+=40+6*s.wave;if(s.wave>=WAVES)s.status='won';}
}
// realSeconds is capped by the renderer when a frame stalls; pure callers may advance arbitrary spans.
export function advance(s,realSeconds){
  if(s.paused||s.status!=='playing'||!s.active||!Number.isFinite(realSeconds)||realSeconds<=0)return 0;
  s.carry+=Math.min(realSeconds,30)*s.speed;let ticks=0;
  while(s.carry+1e-9>=STEP&&s.active&&s.status==='playing'){s.carry=Math.max(0,s.carry-STEP);tick(s,STEP);ticks++;}
  if(!s.active||s.carry<1e-9)s.carry=0;return ticks;
}
export function restore(x){
  try {
    const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
    if(!x||!Object.hasOwn(MAPS,x.map)||!Object.hasOwn(DIFFICULTIES,x.difficulty)||!integer(x.wave,0,WAVES)||!integer(x.coins,0,1e8)||!integer(x.lives,0,DIFFICULTIES[x.difficulty].lives)||!['playing','won','lost'].includes(x.status)||![1,2].includes(x.speed)||!finite(x.time,0,1e9)||!finite(x.carry,0,STEP)||!integer(x.nextId,1,1e7)||!integer(x.kills,0,10000)||typeof x.active!=='boolean'||!finite(x.spawnIn,-STEP,2))return null;
    if(!Array.isArray(x.towers)||x.towers.length>WIDTH*HEIGHT||!Array.isArray(x.enemies)||x.enemies.length>100||!Array.isArray(x.queue)||x.queue.length>30||!x.queue.every((v)=>Object.hasOwn(ENEMIES,v)))return null;
    const m=MAPS[x.map],used=new Set(m.walls.concat(m.starts,m.goal)),towers=[];
    for(const t of x.towers){if(!t||!Object.hasOwn(TOWERS,t.kind)||!integer(t.cell,0,WIDTH*HEIGHT-1)||used.has(t.cell)||!integer(t.level,1,3)||!finite(t.cooldown,0,2))return null;used.add(t.cell);towers.push({kind:t.kind,cell:t.cell,level:t.level,cooldown:t.cooldown});}
    const d=distances(x.map,towers);if(m.starts.some((i)=>d[i]<0))return null;
    const ids=new Set(),enemies=[];
    for(const e of x.enemies){if(!e||!Object.hasOwn(ENEMIES,e.kind)||!integer(e.id,1,x.nextId-1)||ids.has(e.id)||!integer(e.cell,0,WIDTH*HEIGHT-1)||d[e.cell]<0||used.has(e.cell)&&!m.starts.includes(e.cell)||!(e.next===null||adjacent(e.cell).includes(e.next)&&d[e.next]>=0)||!finite(e.progress,0,1)||e.next===null&&e.progress!==0||!finite(e.hp,.00001,10000)||!finite(e.maxHp,e.hp,10000)||!finite(e.slowUntil,0,x.time+2))return null;ids.add(e.id);enemies.push({id:e.id,kind:e.kind,cell:e.cell,next:e.next,progress:e.progress,hp:e.hp,maxHp:e.maxHp,slowUntil:e.slowUntil});}
    if(x.active&&(x.wave===0||!enemies.length&&!x.queue.length)||!x.active&&(enemies.length||x.queue.length)&&x.status!=='lost'||x.status!=='playing'&&x.active||x.status==='won'&&(x.wave!==WAVES||x.lives===0)||x.status==='lost'&&x.lives!==0||x.status==='playing'&&(x.lives===0||x.wave===WAVES&&!x.active))return null;
    return {id:typeof x.id==='string'?x.id.slice(0,60):'ww-restored',map:x.map,difficulty:x.difficulty,coins:x.coins,lives:x.lives,wave:x.wave,status:x.status,paused:true,speed:x.speed,time:x.time,carry:x.carry,nextId:x.nextId,towers,enemies,queue:[...x.queue],spawnIn:x.spawnIn,active:x.active,kills:x.kills,shots:[],selected:integer(x.selected,-1,WIDTH*HEIGHT-1)?x.selected:-1};
  }catch{return null;}
}
