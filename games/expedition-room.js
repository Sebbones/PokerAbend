// Shared lifecycle only: rules live in the four game folders. Reuse the existing
// fixed-step clock, input sequencing, reconnect and realtime frame transport.
import {randomInt,randomBytes} from 'node:crypto';
import {RealtimeRoom,ARENA,STEP_MS,COUNTDOWN_MS,INPUT_TTL} from './realtime-room.js';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class ExpeditionRoom extends RealtimeRoom {
 constructor(...args){super(...args);this.rng=()=>randomInt(0x100000000)/0x100000000;this.personalFrames=true;this.commands=new Map();this.cells=new Map();this.stage=1;this.stageStarted=0;}
 setupRound(){
  this.stopLoop();this.runId=randomBytes(12).toString('hex');this.tickNo=0;this.elapsed=-COUNTDOWN_MS;this.inputs.clear();this.commands.clear();this.cells.clear();this.roster=[...this.order];this.points=Object.fromEntries(this.roster.map(id=>[id,0]));this.stage=1;this.stageStarted=0;this.advanceAt=null;
  this.bodies=this.roster.map(id=>({id,x:0,y:0,alive:true,finished:false,heat:0,keys:0,errors:0,blockedUntil:0,moveAt:0}));this.setup();this.deadline=this.clock.now()+COUNTDOWN_MS+this.settings.playSecs*1000;
 }
 setup(){}
 input(id,data={}){if(this.gamePaused)throw Error('Das Spiel ist angehalten');if(data.jump!==undefined&&data.jump!==false)throw Error('Ungültige Bewegung');super.input(id,data);}
 guard(id,data={}){
  if(this.gamePaused)throw Error('Das Spiel ist angehalten');
  if(this.phase!=='playing'||data.runId!==this.runId||data.round!==this.roundNo)throw Error('Diese Eingabe gehört nicht zur laufenden Runde');
  const p=this.bodies.find(p=>p.id===id);if(!this.order.includes(id)||!p?.alive)throw Error('Du schaust gerade zu');
  if(this.elapsed<0||this.advanceAt!==null||p.finished)throw Error('In dieser Phase ist keine Aktion möglich');
  if(!Number.isSafeInteger(data.seq)||data.seq<1||data.seq>1e9||data.seq<=(this.commands.get(id)||0))throw Error('Diese Eingabe ist bereits veraltet');
  return p;
 }
 command(id,data={}){const p=this.guard(id,data);this.validateCommand(p,data);this.commands.set(id,data.seq);this.perform(p,data);}
 validateCommand(){throw Error('Ungültige Aktion');}
 perform(){}
 liveInput(p){const d=this.inputs.get(p.id),person=this.players.get(p.id);return p.alive&&!p.finished&&person?.connected&&!person.kicked&&d&&(this.tickNo-d.at)*STEP_MS<=INPUT_TTL?d:null;}
 step(){if(this.phase!=='playing'||this.gamePaused)return;this.tickNo++;this.elapsed+=STEP_MS;if(this.elapsed<0)return;
  if(this.tickNo%4===0&&[...this.players.values()].some(p=>!p.bot&&p.connected&&!p.kicked))for(const p of this.bodies)if(p.alive&&!p.finished&&this.players.get(p.id)?.bot)this.botStep(p.id);
  this.advance();
 }
 advance(){}
 finish(winners,text){if(this.phase!=='playing')return;this.stopLoop();this.deadline=null;this.finishRound(winners,text,{...this.points});}
 bodyView(p){return {id:p.id,x:p.x,y:p.y,alive:p.alive,finished:p.finished,heat:Math.round(p.heat),keys:p.keys,errors:p.errors,blockedUntil:p.blockedUntil,points:this.points[p.id]||0,...(p.finishMs!==undefined?{finishMs:p.finishMs}:{}),...(p.readyAt!==undefined?{readyAt:p.readyAt,facing:{...p.facing},pushAt:p.pushAt}:{}),...(p.cell!==undefined?{cell:p.cell}:{})};}
 worldView(){return {};}
 frame(viewerId=null){return {game:this.game,runId:this.runId,round:this.roundNo,tick:this.tickNo,elapsed:this.elapsed,duration:this.stageStarted+this.settings.playSecs*1000,kind:this.kind,arena:{...ARENA},jumping:false,stage:this.stage,stages:this.settings.rounds||1,advanceAt:this.advanceAt,bodies:this.bodies.map(p=>this.bodyView(p)),...this.worldView(viewerId)};}
 gameView(id){return {...this.frame(id),inputSeq:this.inputs.get(id)?.seq||0,commandSeq:this.commands.get(id)||0};}
 publicPlayer(p){const body=this.bodies.find(b=>b.id===p.id);return {pts:this.points[p.id]||0,eliminated:body?.alive===false};}
 next(){throw Error('Die Echtzeitrunde endet durch ihre Regeln oder die Uhr');}
 dropOut(){this.stopLoop();this.deadline=null;this.finishRound([],'Partie wegen Aussteigen abgebrochen – keine Wertung',{});}
 onAbort(){super.onAbort();this.commands.clear();this.cells.clear();this.advanceAt=null;}
}
export const expeditionEvents={steer:(r,p,d)=>{r.input(p.id,d);return {frameOnly:true};},expeditionAction:(r,p,d)=>{r.command(p.id,d);return {frameOnly:true};}};
