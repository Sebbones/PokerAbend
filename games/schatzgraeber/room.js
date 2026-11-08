import {WorkshopRoom} from '../workshop-room.js';import {COLS,ROWS,TILE,DIG_MS,STUN_MS,tileAt,center,layout,reveal,move,bounce,near} from './logic.js';
export class Room extends WorkshopRoom {
 static KIND='dig';static OPTIONS=[{key:'playSecs',label:'Spielzeit in Sekunden',type:'number',min:20,max:180}];
 defaultSettings(){return {playSecs:90};}
 setup(){this.field=layout(this.bodies.length,this.rng);this.dug=new Map();this.bodies.forEach((p,i)=>{const a=i/this.bodies.length*Math.PI*2;Object.assign(p,{x:450+Math.cos(a)*300,y:300+Math.sin(a)*190,bag:0,facing:{x:-Math.cos(a),y:-Math.sin(a)},digUntil:0,digCell:-1,stunUntil:0});});}
 get left(){return this.field?[...this.field.treasure].filter(i=>!this.dug.has(i)).length:0;}
 validateCommand(p,d){if(d.action!=='dig')throw Error('Ungültige Aktion');if(this.elapsed<p.stunUntil)throw Error('Du bist noch benommen');if(p.digCell>=0)throw Error('Du gräbst bereits');if(this.dug.has(tileAt(p)))throw Error('Hier wurde schon gegraben');}
 perform(p){p.digCell=tileAt(p);p.digUntil=this.elapsed+DIG_MS;}
 score(){for(const p of this.bodies)this.points[p.id]=p.bag;}
 finishDig(p){const i=p.digCell;p.digCell=-1;if(this.dug.has(i))return;const r=reveal(this.field,i);this.dug.set(i,r);if(r.k==='treasure')p.bag++;else if(r.k==='bomb'){bounce(p);p.stunUntil=this.elapsed+STUN_MS;}}
 advance(){this.syncTime();if(this.elapsed>=this.phaseEnd)return this.resolve();move(this.bodies,p=>this.liveInput(p),this.elapsed);for(const p of this.bodies)if(p.digCell>=0&&this.elapsed>=p.digUntil)this.finishDig(p);this.score();if(this.left===0)this.resolve();}
 bodyView(p){return {...super.bodyView(p),digUntil:p.digUntil||0,digCell:p.digCell??-1,stunUntil:p.stunUntil||0};}
 worldView(){return {mode:'dig',cols:COLS,rows:ROWS,tile:TILE,dug:[...(this.dug?.values()||[])].map(d=>({...d})),treasuresLeft:this.left,treasuresTotal:this.field?.treasure.size||0};}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p||this.elapsed<0||this.elapsed>=this.phaseEnd)return;const v=this.gameView(id),me=v.bodies.find(b=>b.id===id);if(me.digCell>=0||this.elapsed<me.stunUntil)return;const known=new Map(v.dug.map(d=>[d.i,d])),open=Array.from({length:COLS*ROWS},(_,i)=>i).filter(i=>!known.has(i));if(!open.length)return;
  const score=i=>{let luck=0,risk=0;for(const n of near(i)){const d=known.get(n);if(!d||d.k!=='empty')continue;const unknown=near(n).filter(m=>!known.has(m)).length||1;luck+=d.t/unknown;risk+=d.b/unknown;}const c=center(i);return Math.hypot(c.x-me.x,c.y-me.y)/TILE-3*luck+5*risk;};
  const target=open.sort((a,b)=>score(a)-score(b))[0],c=center(target),dx=c.x-me.x,dy=c.y-me.y;
  if(Math.hypot(dx,dy)<=22&&tileAt(me)===target){this.setInput(p,0,0);try{this.validateCommand(p,{action:'dig'});this.perform(p);}catch{/* neuer Versuch im nächsten Schritt */}return;}
  const s=(n)=>Math.abs(n)>10?Math.sign(n):0;this.setInput(p,s(dx),s(dy));}
}
