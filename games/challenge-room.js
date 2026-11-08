// Shared transport/lifecycle only. Every score and state change is authoritative.
import {ExpeditionRoom} from './expedition-room.js';
export class ChallengeRoom extends ExpeditionRoom {
 bodyView(p){return {...super.bodyView(p),moves:p.moves||0,broken:!!p.broken};}
 validateCommand(p,d){if(this.elapsed>=this.settings.playSecs*1000||this.deadline!==null&&this.clock.now()>=this.deadline)throw Error('Die Zeit ist abgelaufen');if(this.elapsed<(p.moveAt||0))throw Error('Bitte kurz warten');this.check(p,d);}
 perform(p,d){this.act(p,d);p.moveAt=this.elapsed+(this.actionGap||140);}
 advance(){for(const p of this.bodies){if(this.phase!=='playing')break;if(p.alive&&!p.finished)this.update(p);}if(this.phase==='playing'&&(this.elapsed>=this.settings.playSecs*1000||this.bodies.every(p=>p.finished)))this.resolve();}
 update(){}
 resolve(){const best=Math.max(0,...Object.values(this.points));this.finish(best>0?this.roster.filter(id=>this.points[id]===best):[],'Die höchste Punktzahl gewinnt.');}
 // Tap/word commands and fixed-step steering both use the same rule functions.
 trySteer(p){const v=this.liveInput(p);if(!v||this.elapsed<(p.moveAt||0)||!(v.x||v.y))return;this.direction(p,Math.abs(v.x)>=Math.abs(v.y)?Math.sign(v.x):0,Math.abs(v.x)>=Math.abs(v.y)?0:Math.sign(v.y));p.moveAt=this.elapsed+(this.actionGap||140);}
}
