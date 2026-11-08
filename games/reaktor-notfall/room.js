import {randomInt,randomUUID} from 'node:crypto';
import {PartyRoom} from '../party-room.js';
import {makeTask,text,consistent,solutions} from './logic.js';
// Reaktor-Notfall: gemeinsame Aufgabe, private Hinweise je Person. Lösung und fremde Hinweise bleiben bis zur Auflösung serverseitig.
export class Room extends PartyRoom {
 static OPTIONS=[{key:'rounds',label:'Anzahl Aufgaben',type:'number',min:1,max:8},{key:'heatSecs',label:'Zeit bis zur Überhitzung in Sekunden',type:'number',min:60,max:900},{key:'penaltySecs',label:'Strafsekunden bei falschem Code',type:'number',min:5,max:60},{key:'revealSecs',label:'Zeit für die Auflösung in Sekunden',type:'number',min:3,max:30}];
 defaultSettings(){return {rounds:4,heatSecs:240,penaltySecs:20,revealSecs:8,spectators:false,target:0};}
 constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:8});this.rng=()=>randomInt(0x100000000)/0x100000000;this.proposals=new Map();this.solved=false;this.failed=false;this.mistakes=0;this.botSeen=new Map();}
 get unit(){return 'Störfall';}
 canAnswer(id){return this.phase==='playing'&&this.order.includes(id)&&!!this.players.get(id)&&!this.players.get(id).kicked;}
 catalog(){return [];}
 pickQuestions(n){return Array.from({length:n},(_,i)=>makeTask(i,this.order.length,this.rng));}
 setupRound(){this.runKey=randomUUID();this.failed=false;this.mistakes=0;this.solvedCount=0;this.heatLeft=Number(this.settings.heatSecs)*1000;this.writeStart=this.clock.now();super.setupRound();}
 remaining(){return this.stage==='write'?Math.max(0,this.heatLeft-(this.clock.now()-this.writeStart)):Math.max(0,this.heatLeft);}
 stageSecs(stage){return stage==='write'?Math.max(.001,this.remaining()/1000):Number(this.settings.revealSecs)||0;}
 startQuestion(){this.questionKey=randomUUID();this.proposals=new Map();this.solved=false;this.writeStart=this.clock.now();this.botSeen=new Map();}
 handOf(id){const i=this.order.indexOf(id);return i<0||!this.cur?[]:(this.cur.hands[i]||[]).map(k=>this.cur.clues[k]);}
 waiting(stage){return stage==='write'&&!this.solved?[...this.order]:[];}
 isReady(id){return this.proposals.has(id);}
 revealTime(){return Number(this.settings.revealSecs)||0;}
 next(id){if(this.gamePaused)throw Error('Das Spiel ist angehalten');if(this.stage!=='reveal')throw Error('Die Anlage lässt sich nicht überspringen');return super.next(id);}
 propose(id,{key,question,code}={}){
  if(this.gamePaused)throw Error('Das Spiel ist angehalten');
  if(this.phase!=='playing'||this.stage!=='write'||this.solved)throw Error('Gerade wird kein Code eingetragen');
  if(!this.order.includes(id))throw Error('Du spielst in dieser Partie nicht mit');
  if(key!==this.runKey||question!==this.questionKey)throw Error('Diese Aufgabe ist nicht mehr aktuell');
  if(typeof code!=='string'||!new RegExp(`^\\d{${this.cur.len}}$`).test(code))throw Error(`Bitte genau ${this.cur.len} Ziffern eintragen`);
  this.proposals.set(id,code);this.act(id,'hat einen Code eingetragen');this.evaluate();
 }
 evaluate(){
  const live=this.order.filter(id=>this.active(id));
  if(!live.length||live.some(id=>!this.proposals.has(id)))return;
  const first=this.proposals.get(live[0]);if(live.some(id=>this.proposals.get(id)!==first))return;
  if(first===this.cur.solution){this.heatLeft=this.remaining();this.solved=true;this.solvedCount++;for(const id of this.order)this.addPoints(id,100);this.advance();return;}
  this.mistakes++;this.proposals.clear();this.sub++;this.heatLeft=this.remaining()-Number(this.settings.penaltySecs)*1000;this.writeStart=this.clock.now();this.say(`Falscher gemeinsamer Code – ${this.settings.penaltySecs} Strafsekunden`,'warn');
  if(this.heatLeft<=0){this.heatLeft=0;this.advance();}
 }
 closeStage(stage){if(stage==='write'&&!this.solved)this.failed=true;}
 enter(stage){if(stage==='reveal'&&this.failed)this.say('Die Anlage ist überhitzt','warn');}
 targetReached(){return this.failed;}
 stageView(id){
  const mine=this.handOf(id).map(c=>text(c)),reveal=this.stage==='reveal';
  const shared=this.order.filter(b=>this.players.get(b)?.bot).flatMap(b=>this.handOf(b).map(c=>({by:b,clue:{...c},text:text(c)})));
  return {key:this.runKey,question:this.questionKey,len:this.cur.len,mine,shared,proposals:Object.fromEntries([...this.proposals].map(([k,v])=>[k,v])),mistakes:this.mistakes,penaltySecs:Number(this.settings.penaltySecs),heatMs:this.remaining(),heatTotal:Number(this.settings.heatSecs)*1000,tasks:this.total,solvedCount:this.solvedCount||0,
   ...(reveal?{result:{solved:this.solved,code:this.cur.solution,clues:this.cur.hands.flatMap((h,i)=>h.map(k=>({by:this.order[i]??null,text:text(this.cur.clues[k])})))}}:{})};
 }
 finishGame(reason=''){
  this.stage=null;this.cur=null;this.clock.clearTimeout(this.turnTimer);this.turnTimer=null;this.deadline=null;this.timerKey=null;
  const ids=this.roundPlayers||this.order,win=!this.failed&&!reason;
  this.finishRound(win?ids.filter(id=>this.players.has(id)):[],reason||(win?'Alle Aufgaben gelöst – die Anlage ist stabil':'Die Anlage ist überhitzt – niemand gewinnt'),{...this.gamePts});
 }
 botDue(){
  if(this.phase!=='playing'||this.stage!=='write'||this.solved)return null;
  return this.order.find(id=>this.players.get(id)?.bot&&this.botSeen.get(id)!==this.signature(id))||null;
 }
 signature(id){return this.sub+':'+JSON.stringify([...this.proposals].filter(([k])=>k!==id).sort());}
 botStep(id){
  if(this.stage!=='write'||this.solved||!this.order.includes(id))return;
  this.botSeen.set(id,this.signature(id));
  const view=this.gameView(id),known=view.shared.map(s=>s.clue),own=view.proposals[id];
  const options=solutions(view.len,known,Infinity),ok=code=>consistent(view.len,known,code);
  const adopt=Object.entries(view.proposals).filter(([k])=>k!==id).map(([,v])=>v).find(ok);
  const code=options.length===1?options[0]:adopt??(own&&ok(own)?own:null);
  if(code&&code!==own)this.propose(id,{key:view.key,question:view.question,code});
 }
 fallback(id){this.botStep(id);}
 onAbort(){super.onAbort();this.proposals=new Map();this.solved=false;this.failed=false;this.runKey=null;this.questionKey=null;this.botSeen=new Map();}
 static restore(data,onChange){return PartyRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
