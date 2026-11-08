import {ChallengeRoom} from '../challenge-room.js';import {makeZone,zoneAt,tickBand} from './logic.js';
export class Room extends ChallengeRoom {
 static KIND='band';
 static OPTIONS=[{key:'playSecs',label:'Spielzeit in Sekunden',type:'number',min:10,max:120},{key:'smaller',label:'Zielzone wird kleiner',type:'bool'}];
 defaultSettings(){return {playSecs:45,smaller:false};}
 setup(){this.zone=makeZone(this.rng);for(const p of this.bodies)this.cells.set(p.id,{tension:0,time:0,broken:false});}
 check(){throw Error('Dieses Spiel verwendet nur Richtungseingaben');}
 update(p){const s=this.cells.get(p.id),v=this.liveInput(p);tickBand(s,!!v&&(v.x>0||v.y>0),zoneAt(this.zone,this.elapsed,this.settings.smaller));this.points[p.id]=s.time;if(s.broken){p.broken=true;p.finished=true;}}
 worldView(id){const s=this.cells.get(id);return {zone:this.zone?zoneAt(this.zone,this.elapsed,this.settings.smaller):{low:0,high:0},band:s?{...s}:null};}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p||p.finished)return;const v=this.gameView(id);this.setInput(p,v.band.tension<(v.zone.low+v.zone.high)/2?1:0,0);}
}
