import {randomUUID,randomInt} from 'node:crypto';
import {PartyRoom} from '../party-room.js';
import {TurnRoom} from '../../server/turn-room.js';
import {shuffle} from '../../server/random.js';
import {RULES,expected,normalAnswer} from './rules.js';
export class Room extends PartyRoom {
 static OPTIONS=[{key:'rounds',label:'Anzahl Runden',type:'number',min:1,max:9},{key:'writeSecs',label:'Zeit zum Antworten in Sekunden',type:'number',min:10,max:120},{key:'revealSecs',label:'Zeit für die Auflösung in Sekunden',type:'number',min:3,max:30}];
 defaultSettings(){return {rounds:6,writeSecs:25,revealSecs:8,spectators:false,target:0};}
 constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:3,maxPlayers:12});this.answers=new Map();this.activeRules=[];this.task=null;}
 catalog(){return Array.from({length:9},(_,i)=>({id:'task-'+i}));}
 setupRound(){this.runKey=randomUUID();this.ruleDeck=shuffle(RULES.map(r=>r.id));super.setupRound();}
 startQuestion(){this.questionKey=randomUUID();this.task={number:randomInt(1,10),dots:randomInt(1,7),color:['red','blue','gold'][randomInt(3)],shape:['circle','square','star'][randomInt(3)]};this.activeRules=this.ruleDeck.slice(0,this.q);this.answers=new Map();this.outcome=null;}
 waiting(stage){return stage==='write'?this.order.filter(id=>!this.answers.has(id)):[];}
 isReady(id){return this.answers.has(id);}
 submit(id,{key,question,answer}={}){
  if(this.gamePaused)throw Error('Das Spiel ist angehalten');
  if(this.phase!=='playing'||this.stage!=='write'||!this.order.includes(id))throw Error('Nur Mitspieler antworten in der Schreibphase');
  if(key!==this.runKey||question!==this.questionKey)throw Error('Diese Aufgabe ist nicht mehr aktuell');
  if(this.answers.has(id))throw Error('Deine Antwort ist bereits abgegeben');
  if(typeof answer!=='string'||answer.length>128||!normalAnswer(answer)||/[\u0000-\u001f\u007f]/.test(answer))throw Error('Bitte eine kurze Antwort eingeben');
  this.answers.set(id,normalAnswer(answer));this.act(id,'hat seine Antwort verdeckt abgegeben');this.checkDone();
 }
 closeStage(stage){if(stage!=='write')return;const right=[expected(this.task,this.activeRules,'de'),expected(this.task,this.activeRules,'en')];this.outcome=this.order.map(id=>({id,answer:this.answers.get(id)||null,correct:right.includes(this.answers.get(id))}));for(const row of this.outcome)if(row.correct)this.addPoints(row.id,100);}
 revealTime(){return this.settings.revealSecs;}
 next(id){if(this.gamePaused)throw Error('Das Spiel ist angehalten');return super.next(id);}
 stageView(id){return {key:this.runKey,question:this.questionKey,task:{...this.task},rules:this.activeRules.map(id=>({...RULES.find(r=>r.id===id)})),own:this.answers.get(id)||null,...(this.stage==='reveal'?{expected:{de:expected(this.task,this.activeRules,'de'),en:expected(this.task,this.activeRules,'en')},results:this.outcome.map(r=>({...r}))}:{})};}
 fallback(id){if(this.stage==='write'&&this.order.includes(id)&&!this.answers.has(id))this.submit(id,{key:this.runKey,question:this.questionKey,answer:expected(this.task,this.activeRules)});}
 botStep(id){this.fallback(id);}
 onAbort(){super.onAbort();this.answers.clear();this.task=null;this.activeRules=[];this.runKey=null;this.questionKey=null;}
 static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
