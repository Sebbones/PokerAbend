import {ExpeditionRoom,distance,clamp} from '../expedition-room.js';
export class Room extends ExpeditionRoom {
 static KIND='push';static OPTIONS=[...ExpeditionRoom.OPTIONS,{key:'ice',label:'Eis-Plattform (rutschig)',type:'bool'},{key:'growingPush',label:'Stoß-Kraft wächst mit der Zeit',type:'bool'}];
 defaultSettings(){return {playSecs:60,ice:false,growingPush:false};}
 setup(){this.platform={x:450,y:300,radius:260};this.bodies.forEach((p,i)=>{const a=i/this.bodies.length*Math.PI*2;Object.assign(p,{x:450+Math.cos(a)*150,y:300+Math.sin(a)*150,vx:0,vy:0,facing:{x:-Math.cos(a),y:-Math.sin(a)},readyAt:0,pushAt:-10000});});}
 validateCommand(_p,d){if(d.action!=='push')throw Error('Ungültige Aktion');}
 perform(p){this.push(p);}
 push(p){if(!p.alive||this.elapsed<p.readyAt)return false;p.readyAt=this.elapsed+1100;p.pushAt=this.elapsed;const force=360*(this.settings.growingPush?1+this.elapsed/(this.settings.playSecs*1000):1);for(const q of this.bodies)if(q!==p&&q.alive){const d=distance(p,q);if(d<=84&&((q.x-p.x)*p.facing.x+(q.y-p.y)*p.facing.y)>=d*.25){q.vx+=p.facing.x*force;q.vy+=p.facing.y*force;}}return true;}
 advance(){this.platform.radius=Math.max(65,260-195*this.elapsed/(this.settings.playSecs*1000));for(const p of this.bodies){if(!p.alive)continue;const d=this.liveInput(p),norm=Math.hypot(d?.x||0,d?.y||0)||1;if(d&&(d.x||d.y))p.facing={x:d.x/norm,y:d.y/norm};const glide=this.settings.ice?.94:.78;p.vx=clamp(p.vx,-900,900);p.vy=clamp(p.vy,-900,900);p.x+=((d?.x||0)/norm*190+p.vx)*.05;p.y+=((d?.y||0)/norm*190+p.vy)*.05;p.vx*=glide;p.vy*=glide;}
  // Resolve overlaps symmetrically; nobody receives a roster-order advantage.
  for(let i=0;i<this.bodies.length;i++)for(let j=i+1;j<this.bodies.length;j++){const a=this.bodies[i],b=this.bodies[j];if(!a.alive||!b.alive)continue;const d=distance(a,b);if(d<36){const dx=d?(b.x-a.x)/d:1,dy=d?(b.y-a.y)/d:0,pad=(36-d)/2;a.x-=dx*pad;a.y-=dy*pad;b.x+=dx*pad;b.y+=dy*pad;}}
  for(const p of this.bodies)if(p.alive&&distance(p,this.platform)>this.platform.radius){p.alive=false;this.inputs.delete(p.id);}const alive=this.bodies.filter(p=>p.alive);if(alive.length<=1||this.elapsed>=this.settings.playSecs*1000){const winners=alive.length===1?[alive[0].id]:[];for(const id of winners)this.points[id]=100;this.finish(winners,winners.length?'Die letzte Person auf der Plattform gewinnt.':'Keine alleinige letzte Person – unentschieden.');}
 }
 worldView(){return {platform:{...this.platform},ice:!!this.settings.ice,growingPush:!!this.settings.growingPush};}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p?.alive)return;const v=this.gameView(id),others=v.bodies.filter(q=>q.alive&&q.id!==id).sort((a,b)=>distance(a,p)-distance(b,p)),edge=distance(p,v.platform)>v.platform.radius-65,target=edge?v.platform:others[0]||v.platform;const x=Math.sign(target.x-p.x),y=Math.sign(target.y-p.y);this.setInput(p,x,y);if(!edge&&others[0]&&distance(p,others[0])<83){const norm=Math.hypot(x,y)||1;p.facing={x:x/norm,y:y/norm};this.push(p);}}
}
