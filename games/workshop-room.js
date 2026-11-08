// Only lifecycle/transport is shared. Rules remain in the three game folders.
import {ExpeditionRoom} from './expedition-room.js';
export class WorkshopRoom extends ExpeditionRoom {
 setupRound(){this.startedAt=this.clock.now()+3000;super.setupRound();this.updateDeadline();}
 get phaseEnd(){return this.settings.playSecs*1000;}
 updateDeadline(){this.deadline=this.startedAt+this.phaseEnd;}
 syncTime(){this.elapsed=Math.max(this.elapsed,this.clock.now()-this.startedAt);}
 guard(id,data){const p=super.guard(id,data);this.syncTime();if(this.elapsed>=this.phaseEnd)throw Error('Die Zeit ist abgelaufen');return p;}
 bodyView(p){return {...super.bodyView(p),height:p.height||0,bag:p.bag||0,stealReady:p.stealReady||0,shieldUntil:p.shieldUntil||0,...(p.facing?{facing:{...p.facing}}:{})};}
 resolve(){const best=Math.max(0,...Object.values(this.points));this.finish(best>0?this.roster.filter(id=>this.points[id]===best):[],'Die höchste Punktzahl gewinnt.');}
 input(id,d={}){if(!this.canSteer()&&(d.x||d.y))throw Error('In dieser Phase ist keine Bewegung möglich');super.input(id,d);}
 canSteer(){return true;}
}
