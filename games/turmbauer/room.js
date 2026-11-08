import {WorkshopRoom} from '../workshop-room.js';import {sequence,tower,moving,drop,MAX_LEVELS} from './logic.js';
export class Room extends WorkshopRoom {
 static KIND='tower';static OPTIONS=[{key:'playSecs',label:'Spielzeit in Sekunden',type:'number',min:10,max:120}];
 constructor(...args){super(...args);this.opts.maxPlayers=10;}
 defaultSettings(){return {playSecs:60};}
 setup(){this.profiles=sequence(this.rng);for(const p of this.bodies)this.cells.set(p.id,tower());}
 canSteer(){return false;}
 validateCommand(p,d){if(d.action!=='drop')throw Error('Ungültige Aktion');const state=this.cells.get(p.id);if(!moving(state,this.profiles,this.elapsed))throw Error('Bitte kurz warten');}
 perform(p){const state=this.cells.get(p.id);drop(state,this.profiles,this.elapsed);p.height=state.height;this.points[p.id]=state.height;if(state.failed||state.height===MAX_LEVELS){p.finished=true;p.alive=!state.failed;}}
 advance(){this.syncTime();if(this.elapsed>=this.phaseEnd||this.bodies.every(p=>p.finished))this.resolve();}
 worldView(id){const state=this.cells.get(id);return {mode:'stack',tower:state?{height:state.height,failed:state.failed,blocks:state.blocks.slice(-14).map(b=>({...b})),moving:moving(state,this.profiles,this.elapsed)}:null};}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p?.alive||p.finished||this.elapsed<0||this.elapsed>=this.phaseEnd)return;const own=this.gameView(id).tower;if(!own.moving)return;const top=own.blocks.at(-1);if(Math.abs(own.moving.x-top.x)<12)this.perform(p);}
}
