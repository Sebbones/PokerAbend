import {randomInt,randomUUID} from 'node:crypto';
import {TurnRoom} from '../../server/turn-room.js';
import {Position,chess960Fen,opposite} from './rules.js';
import {strategy,fallback} from './bot.js';
import {performance} from 'node:perf_hooks';
export const TIMES={'none':[0,0],'3+2':[180000,2000],'5+3':[300000,3000],'10+0':[600000,0],'15+10':[900000,10000]};
export class Room extends TurnRoom {
  static OPTIONS=[{key:'clock',label:'Bedenkzeit',type:'select',values:Object.keys(TIMES).map(value=>({value,label:value==='none'?'Ohne Uhr':value}))}];
  defaultSettings(){return {clock:'none'};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:2,winPoints:1});this.pos=new Position();this.revision=0;this.history=[];this.times={w:0,b:0};this.tickAt=0;this.offer=null;this.key=null;this.repetitions=new Map();}
  get currentId(){return this.phase==='playing'?this.order[this.pos.turn==='w'?0:1]:null;}
  setupRound(){this.pos=new Position(this.variant==='chess960'?chess960Fen(randomInt(960)):undefined);this.key=randomUUID();this.revision++;this.offer=null;this.history=[{san:null,board:this.pos.board(),fen:this.pos.fen()}];this.repetitions=new Map([[this.pos.key(),1]]);this.times={w:TIMES[this.settings.clock][0],b:TIMES[this.settings.clock][0]};this.tickAt=this.clock.now();this.last=null;}
  onTurnStart(){}
  remaining(){const out={...this.times};if(this.phase==='playing'&&this.settings.clock!=='none')out[this.pos.turn]=Math.max(0,out[this.pos.turn]-(this.clock.now()-this.tickAt));return out;}
  checkClock(){if(this.phase==='playing'&&this.settings.clock!=='none'&&this.remaining()[this.pos.turn]<=0){const winner=opposite(this.pos.turn);this.end(this.pos.canMate(winner)?winner:null,'time');return true;}return false;}
  checkContext(id,d){this.requireTurn(id);if(d?.key!==this.key||d?.revision!==this.revision)throw Error('Dieser Schachzug ist nicht mehr aktuell');}
  move(id,d){this.checkContext(id,d);if(this.checkClock())return;const allowed=this.pos.legal().find(m=>m.from===d.from&&m.to===d.to&&(m.promotion||null)===(d.promotion||null)&&(m.castle||null)===(d.castle||null));if(!allowed)throw Error('Dieser Schachzug ist nicht erlaubt');const c=this.pos.turn;this.times=this.remaining();if(this.settings.clock!=='none')this.times[c]+=TIMES[this.settings.clock][1];const san=this.pos.playLegal(allowed);this.tickAt=this.clock.now();this.offer=null;this.last={from:allowed.from,to:allowed.to,castle:allowed.castle||null};this.revision++;this.turn=this.pos.turn==='w'?0:1;this.history.push({san,board:this.pos.board(),fen:this.pos.fen()});this.act(id,san);const key=this.pos.key(),count=(this.repetitions.get(key)||0)+1;this.repetitions.set(key,count);const result=this.pos.outcome(count);if(result)this.end(result.winner,result.reason);}
  end(colour,reason){this.times=this.remaining();this.reason=reason;this.clock.clearTimeout(this.turnTimer);this.turnTimer=null;this.deadline=null;const winners=colour?[this.order[colour==='w'?0:1]]:[];this.finishRound(winners,colour?`${this.name(winners[0])} gewinnt · ${reason}`:`Remis · ${reason}`,Object.fromEntries(this.order.map(id=>[id,winners.includes(id)?1:0])));}
  participant(id){if(this.gamePaused)throw Error('Das Spiel ist angehalten');if(this.phase!=='playing'||!this.order.includes(id))throw Error('Nur Mitspieler können das entscheiden');if(this.checkClock())throw Error('Die Bedenkzeit ist abgelaufen');}
  offerDraw(id){this.participant(id);if(this.offer===id)throw Error('Remis ist bereits angeboten');this.offer=id;this.act(id,'bietet Remis an');}
  answerDraw(id,accept){this.participant(id);if(!this.offer||this.offer===id||typeof accept!=='boolean')throw Error('Kein fremdes Remisangebot');if(accept)this.end(null,'agreement');else{this.offer=null;this.act(id,'lehnt Remis ab');}}
  resign(id){this.participant(id);this.end(id===this.order[0]?'b':'w','resignation');}
  afterChange(){if(this.gamePaused)return;this.syncTimer();}
  syncTimer(){this.clock.clearTimeout(this.turnTimer);this.turnTimer=null;this.deadline=null;if(this.phase!=='playing'||this.settings.clock==='none')return;const ms=this.remaining()[this.pos.turn];this.deadline=this.clock.now()+ms;this.turnTimer=this.clock.setTimeout(()=>{this.checkClock();this.onChange('state');},ms);this.turnTimer.unref?.();}
  onTimeout(id){if(!this.checkClock()&&this.phase==='playing')this.botStep(id);}
  botDue(){if(this.phase!=='playing')return null;return this.players.get(this.currentId)?.bot?this.currentId:null;}
  botStep(id,rng=Math.random){const o={game:'schach',id,g:this.gameView(id)},stop={},deadline=performance.now()+10,c={rng,pick:list=>list[Math.floor(rng()*list.length)],result:fallback(o),check(){if(performance.now()>=deadline)throw stop;},best(a){this.result=a;}};try{strategy(o,'medium',c);}catch(e){if(e!==stop)throw e;}this.move(id,c.result.args[0]);}
  publicPlayer(p){return {colour:p.id===this.order[0]?'w':p.id===this.order[1]?'b':null};}
  gameView(id){return {key:this.key,revision:this.revision,position:this.pos.data(),board:this.pos.board(),legal:this.currentId===id?this.pos.legal():[],check:this.pos.chess.isCheck(),last:this.last,history:this.history,clocks:this.remaining(),clockMode:this.settings.clock,clockStamp:this.clock.now(),running:this.phase==='playing'?this.pos.turn:null,offer:this.offer,reason:this.reason||null};}
  onDropOut(p){if(this.phase==='playing')this.end(p.id===this.order[0]?'b':'w','resignation');}
  dropOut(p,message){if(!this.order.includes(p.id))return;if(message)this.say(message);this.onDropOut(p);this.order=this.order.filter(id=>id!==p.id);}
  onAbort(){this.clock.clearTimeout(this.turnTimer);this.history=[];this.offer=null;}
  static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
