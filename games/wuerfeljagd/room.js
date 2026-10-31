import {randomInt,randomUUID} from 'node:crypto';import {PartyRoom} from '../party-room.js';import {die} from '../../server/random.js';import {keptDice,sameDice,matchingDice} from '../backlog-dice.js';
export const ROLL_GAP=500;
export class Room extends PartyRoom {
  static OPTIONS=[{key:'rounds',label:'Anzahl Zielkombinationen',type:'number',min:1,max:20},{key:'writeSecs',label:'Zeit pro Kombination in Sekunden',type:'number',min:10,max:120},{key:'attempts',label:'Würfe pro Kombination',type:'number',min:3,max:10}];
  defaultSettings(){return {rounds:5,writeSecs:25,attempts:6,target:0,spectators:false};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:8});this.hunts={};this.reveal=null;this.roll=die;}
  get flow(){return ['write','reveal'];}
  setupRound(){this.roundKey=randomUUID();super.setupRound();}
  pickQuestions(n){return Array.from({length:n},(_,i)=>{const a=randomInt(1,7),b=a%6+1,c=(a+1)%6+1;return {id:`hunt-${i}`,target:i<2?[a,b,c]:i<n-1?[a,a,b]:[a,a,a]};});}
  startQuestion(){this.hunts=Object.fromEntries(this.order.map((id)=>[id,{dice:[],rolls:0,revision:0,nextAt:0,matched:false,finished:false}]));this.reveal=null;}
  waiting(){return this.order.filter((id)=>!this.hunts[id]?.finished);}
  isReady(id){return !!this.hunts[id]?.finished;}
  canAnswer(id){return this.phase==='playing'&&this.order.includes(id);}
  throwDice(id,keep,revision,question,roundKey){
    if(this.gamePaused)throw Error('Das Spiel ist angehalten');if(this.phase!=='playing'||this.stage!=='write')throw Error('Gerade wird nicht gejagt');
    if(!this.order.includes(id))throw Error('Du spielst in dieser Partie nicht mit');const h=this.hunts[id],now=this.clock.now();
    if(question!==this.q+1||roundKey!==this.roundKey||revision!==h.revision)throw Error('Dieser Würfelzug ist nicht mehr aktuell');
    if(h.finished)throw Error('Du bist für diese Kombination fertig');if(this.deadline&&now>=this.deadline)throw Error('Die Zeit ist abgelaufen');if(now<h.nextAt)throw Error('Kurz warten, dann erneut würfeln');
    const next=keptDice(h.dice,keep,this.roll);h.dice=next;h.rolls++;h.revision++;h.nextAt=now+ROLL_GAP;h.matched=sameDice(next,this.cur.target);h.finished=h.matched||h.rolls>=this.settings.attempts;
    this.act(id,h.matched?'✓ Kombination erreicht':`Wurf ${h.rolls}/${this.settings.attempts}`);this.checkDone();
  }
  enter(stage){if(stage!=='reveal')return;const results=this.order.map((id)=>{const h=this.hunts[id],pts=h.matched?100:0;this.addPoints(id,pts);return {id,dice:[...h.dice],rolls:h.rolls,matched:h.matched,pts};});this.reveal={target:[...this.cur.target],results};this.say(`${results.filter((p)=>p.matched).length} Spieler erreichen die Zielkombination`,'win');}
  next(id){if(this.gamePaused)throw Error('Das Spiel ist angehalten');super.next(id);}
  stageView(id){const h=this.hunts[id];return {roundKey:this.roundKey,target:[...this.cur.target],attempts:this.settings.attempts,mine:h?{...h,dice:[...h.dice]}:null,reveal:this.stage==='reveal'?this.reveal:null};}
  // Share the runner's decision slots fairly instead of exhausting one bot first.
  botDue(){if(this.phase!=='playing'||this.stage!=='write')return null;return this.order.filter((id)=>this.players.get(id)?.bot&&!this.hunts[id].finished).sort((a,b)=>this.hunts[a].rolls-this.hunts[b].rolls)[0]||null;}
  botStep(id){const view=this.gameView(id),h=view.mine;if(this.stage!=='write'||!h||h.finished||this.clock.now()<h.nextAt)return;this.throwDice(id,matchingDice(h.dice,view.target),h.revision,this.q+1,this.roundKey);}
  fallback(id){this.botStep(id);}
  static restore(data,onChange){return PartyRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
