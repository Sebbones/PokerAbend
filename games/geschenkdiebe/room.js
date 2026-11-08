import {WorkshopRoom} from '../workshop-room.js';import {moveBodies,collect,steal,distance} from './logic.js';
export class Room extends WorkshopRoom {
 static KIND='gifts';static OPTIONS=[{key:'playSecs',label:'Spielzeit in Sekunden',type:'number',min:10,max:120}];
 defaultSettings(){return {playSecs:60};}
 setup(){this.gifts=[];this.spawned=0;this.spawnAt=2000;this.bodies.forEach((p,i)=>{const angle=i/this.bodies.length*Math.PI*2;Object.assign(p,{x:450+Math.cos(angle)*260,y:300+Math.sin(angle)*180,bag:0,facing:{x:-Math.cos(angle),y:-Math.sin(angle)},stealReady:0,shieldUntil:0});});for(let i=0;i<18;i++)this.spawn();}
 spawn(){this.gifts.push({id:++this.spawned,x:45+this.rng()*810,y:45+this.rng()*510});}
 validateCommand(_p,d){if(d.action!=='steal')throw Error('Ungültige Aktion');}
 perform(p){steal(this.bodies,p,this.elapsed);this.score();}
 score(){for(const p of this.bodies)this.points[p.id]=p.bag;}
 advance(){this.syncTime();if(this.elapsed>=this.phaseEnd)return this.resolve();moveBodies(this.bodies,p=>this.liveInput(p));this.gifts=collect(this.bodies,this.gifts,this.rng);if(this.elapsed>=this.spawnAt){if(this.gifts.length<24)this.spawn();this.spawnAt=this.elapsed+2000;}this.score();}
 worldView(){return {mode:'run',gifts:(this.gifts||[]).map(g=>({...g})),spawned:this.spawned||0};}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p||this.elapsed<0||this.elapsed>=this.phaseEnd)return;const v=this.gameView(id),me=v.bodies.find(p=>p.id===id),loot=v.gifts.map(g=>({...g,value:1})),rivals=v.bodies.filter(q=>q.id!==id&&q.bag>0).map(q=>({...q,value:2})),target=[...loot,...rivals].sort((a,b)=>distance(a,me)/a.value-distance(b,me)/b.value)[0];if(!target){this.setInput(p,0,0);return;}const dx=target.x-me.x,dy=target.y-me.y,norm=Math.hypot(dx,dy)||1;this.setInput(p,Math.abs(dx)>8?Math.sign(dx):0,Math.abs(dy)>8?Math.sign(dy):0);p.facing={x:dx/norm,y:dy/norm};if(distance(target,me)<=65)this.perform(p);}
}
