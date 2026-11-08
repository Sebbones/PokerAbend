import {randomInt,randomUUID} from 'node:crypto';
import {PartyRoom} from '../party-room.js';
// Brückenroulette: Wahlen bleiben bis zur Auflösung serverseitig; gebrochen wird nach Zählung der Server-Wahlen.
export const planks=settings=>settings.fourPlanks?4:3;
export function breakPlank(counts,emptiest,rng){
 const used=counts.map((n,i)=>[n,i]).filter(([n])=>n>0);
 if(!used.length)return null;
 const target=emptiest?Math.min(...used.map(([n])=>n)):Math.max(...used.map(([n])=>n)),tied=used.filter(([n])=>n===target).map(([,i])=>i);
 return tied[Math.floor(rng()*tied.length)];
}
export class Room extends PartyRoom {
 static OPTIONS=[{key:'rounds',label:'Anzahl Brücken (Runden)',type:'number',min:1,max:12},{key:'writeSecs',label:'Zeit zum Wählen in Sekunden',type:'number',min:5,max:120},{key:'revealSecs',label:'Zeit für die Auflösung in Sekunden',type:'number',min:3,max:30},{key:'fourPlanks',label:'Vier Planken statt drei',type:'bool'},{key:'emptiest',label:'Die leerste besetzte Planke bricht',type:'bool'}];
 defaultSettings(){return {rounds:8,writeSecs:20,revealSecs:7,fourPlanks:false,emptiest:false,spectators:false,target:0};}
 constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:3,maxPlayers:8});this.rng=()=>randomInt(0x100000000)/0x100000000;this.choices=new Map();this.lost={};this.outcome=null;}
 get unit(){return 'Brücke';}
 canAnswer(id){return this.phase==='playing'&&this.order.includes(id)&&!!this.players.get(id)&&!this.players.get(id).kicked;}
 catalog(){return Array.from({length:12},(_,i)=>({id:'bridge-'+i}));}
 setupRound(){this.runKey=randomUUID();this.lost=Object.fromEntries(this.order.map(id=>[id,0]));super.setupRound();}
 startQuestion(){this.questionKey=randomUUID();this.choices=new Map();this.outcome=null;}
 waiting(stage){return stage==='write'?this.order.filter(id=>!this.choices.has(id)):[];}
 isReady(id){return this.choices.has(id);}
 revealTime(){return this.settings.revealSecs;}
 next(id){if(this.gamePaused)throw Error('Das Spiel ist angehalten');return super.next(id);}
 choose(id,{key,question,plank}={}){
  if(this.gamePaused)throw Error('Das Spiel ist angehalten');
  if(this.phase!=='playing'||this.stage!=='write')throw Error('Gerade wird keine Planke gewählt');
  if(!this.order.includes(id))throw Error('Du spielst in dieser Partie nicht mit');
  if(key!==this.runKey||question!==this.questionKey)throw Error('Diese Brücke ist nicht mehr aktuell');
  if(!Number.isInteger(plank)||plank<0||plank>=planks(this.settings))throw Error('Diese Planke gibt es nicht');
  if(this.choices.has(id))throw Error('Deine Wahl ist bereits endgültig');
  this.choices.set(id,{plank,auto:false});this.act(id,'hat eine Planke gewählt');this.checkDone();
 }
 closeStage(stage){
  if(stage!=='write'||this.outcome)return;
  const n=planks(this.settings);
  for(const id of this.order)if(!this.choices.has(id))this.choices.set(id,{plank:Math.floor(this.rng()*n),auto:true});
  const counts=Array.from({length:n},()=>0);for(const id of this.order)counts[this.choices.get(id).plank]++;
  const broken=breakPlank(counts,!!this.settings.emptiest,this.rng);
  const rows=this.order.map(id=>{const c=this.choices.get(id),lost=c.plank===broken;if(lost)this.lost[id]++;else this.addPoints(id,1);return {id,plank:c.plank,auto:c.auto,lost};});
  this.outcome={planks:n,counts,broken,rows};
 }
 stageView(id){return {key:this.runKey,question:this.questionKey,planks:planks(this.settings),emptiest:!!this.settings.emptiest,own:this.choices.has(id)?this.choices.get(id).plank:null,lost:{...this.lost},...(this.stage==='reveal'&&this.outcome?{outcome:{...this.outcome,counts:[...this.outcome.counts],rows:this.outcome.rows.map(r=>({...r}))}}:{})};}
 finishGame(reason=''){
  this.stage=null;this.cur=null;this.clock.clearTimeout(this.turnTimer);this.turnTimer=null;this.deadline=null;this.timerKey=null;
  const ids=this.roundPlayers||this.order,fewest=Math.min(...ids.map(id=>this.lost[id]??0)),winners=reason?[]:ids.filter(id=>(this.lost[id]??0)===fewest&&this.players.has(id));
  const names=winners.map(id=>this.name(id)).join(' und ');
  this.finishRound(winners,reason||`${names} ${winners.length>1?'teilen sich den Sieg':'gewinnt'} mit ${fewest} verlorenen Punkten`,{...this.gamePts});
 }
 botStep(id,rng=this.rng){if(this.stage!=='write'||this.choices.has(id)||!this.order.includes(id))return;this.choose(id,{key:this.runKey,question:this.questionKey,plank:Math.floor(rng()*planks(this.settings))});}
 fallback(id){this.botStep(id);}
 publicPlayer(p){return {...super.publicPlayer(p),lost:this.lost[p.id]??0};}
 onAbort(){super.onAbort();this.choices=new Map();this.outcome=null;this.lost={};this.runKey=null;this.questionKey=null;}
 static restore(data,onChange){return PartyRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
