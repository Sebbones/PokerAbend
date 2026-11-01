import {randomUUID} from 'node:crypto';
import {TurnRoom} from '../../server/turn-room.js';
import {shuffle} from '../poker/engine/cards.js';
import {newBag,emptyBoard,evaluateMove,endScores,PREMIUMS} from './rules.js';
import {choosePlacement} from './bot.js';

export class Room extends TurnRoom {
  static OPTIONS=[{key:'challenge',label:'Anzweifeln erlauben',type:'bool'},{key:'failedPenalty',label:'Erfolgloses Anzweifeln: −5 Punkte',type:'bool'},{key:'challengeTime',label:'Anzweifel-Fenster in Sekunden',type:'number',min:5,max:60},{key:'voteTime',label:'Abstimmung in Sekunden',type:'number',min:5,max:90},{key:'turnTime',label:'Zeit pro Zug (0 = ohne)',type:'number',min:0,max:300}];
  defaultSettings(){return {challenge:true,failedPenalty:false,challengeTime:12,voteTime:20,turnTime:90};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:4});this.board=emptyBoard();this.racks={};this.bag=[];this.points={};this.revision=0;this.stage='place';this.pending=null;this.reviewTimer=null;this.reviewDeadline=null;}
  setupRound(){this.key=randomUUID();this.revision++;this.board=emptyBoard();this.bag=newBag();this.racks=Object.fromEntries(this.order.map(id=>[id,this.bag.splice(-7)]));this.points=Object.fromEntries(this.order.map(id=>[id,0]));this.passes=0;this.stage='place';this.pending=null;this.lastMove=null;}
  get currentId(){return this.phase==='playing'&&this.stage==='place'?this.order[this.turn]:null;}
  onTurnStart(){}
  check(id,d,turn=true){if(turn)this.requireTurn(id);else if(this.gamePaused||this.phase!=='playing'||!this.order.includes(id))throw Error('Du kannst gerade nicht abstimmen');if(d?.key!==this.key||d?.revision!==this.revision)throw Error('Dieser Spielzug ist nicht mehr aktuell');}
  preview(id,d){this.check(id,d);const m=evaluateMove(this.board,this.racks[id],d.placements);return {reply:{preview:{words:m.words,points:m.points,bonus:m.bonus,revision:this.revision}}};}
  place(id,d){this.check(id,d);const move=evaluateMove(this.board,this.racks[id],d.placements);this.pending={id,move,approvals:[],votes:{},challenger:null};this.revision++;if(!this.settings.challenge)return this.resolve(true);this.stage='review';this.setReviewTimer(this.settings.challengeTime);this.act(id,`legt ${move.words.map(w=>w.word).join(' / ')} · Vorschau ${move.points}`);}
  review(id,d){this.check(id,d,false);if(this.stage!=='review'||id===this.pending?.id)throw Error('Nur die anderen Spieler prüfen den Zug');if(typeof d.challenge!=='boolean')throw Error('Prüfung bestätigen oder anzweifeln');if(this.pending.approvals.includes(id))throw Error('Deine Prüfung ist bereits abgegeben');if(d.challenge){this.pending.challenger=id;this.pending.votes={};this.stage='vote';this.revision++;this.setReviewTimer(this.settings.voteTime);this.act(id,'zweifelt die neu gebildeten Wörter an');}else{this.pending.approvals.push(id);this.revision++;if(this.order.filter(p=>p!==this.pending.id).every(p=>this.pending.approvals.includes(p)))this.resolve(true);}}
  vote(id,d){this.check(id,d,false);if(this.stage!=='vote'||id===this.pending?.id||typeof d.accept!=='boolean'||Object.hasOwn(this.pending.votes,id))throw Error('Stimme einmal über fremde Wörter ab');this.pending.votes[id]=d.accept;this.revision++;if(Object.keys(this.pending.votes).length===this.order.length-1)this.finishVote();}
  finishVote(){const rejected=Object.values(this.pending.votes).filter(v=>!v).length;this.resolve(rejected<=(this.order.length-1)/2);}
  setReviewTimer(seconds){this.clock.clearTimeout(this.reviewTimer);this.reviewDeadline=this.clock.now()+seconds*1000;this.reviewTimer=this.clock.setTimeout(()=>{if(this.phase!=='playing'||!this.pending)return;if(this.stage==='vote')this.finishVote();else this.resolve(true);this.afterChange();this.onChange('state');},seconds*1000);this.reviewTimer.unref?.();}
  resolve(accepted){const p=this.pending;if(!p)return;this.clock.clearTimeout(this.reviewTimer);this.reviewTimer=null;this.reviewDeadline=null;
    if(accepted){this.board=p.move.board;this.racks[p.id]=this.racks[p.id].filter(t=>!p.move.used.includes(t.id));this.points[p.id]+=p.move.points;if(p.challenger&&this.settings.failedPenalty)this.points[p.challenger]-=5;while(this.racks[p.id].length<7&&this.bag.length)this.racks[p.id].push(this.bag.pop());this.passes=0;this.lastMove={id:p.id,words:p.move.words,points:p.move.points,accepted:true};}
    else{this.passes++;this.lastMove={id:p.id,words:p.move.words,points:0,accepted:false};}
    const finisher=accepted&&!this.bag.length&&!this.racks[p.id].length?p.id:null;this.pending=null;this.stage='place';this.revision++;this.act(p.id,accepted?'Wörter angenommen':'Wörter abgelehnt – Zug verfallen');if(finisher||this.passes>=6)return this.end(finisher);this.next();
  }
  pass(id,d){this.check(id,d);this.passes++;this.revision++;this.act(id,'passt');if(this.passes>=6)return this.end();this.next();}
  exchange(id,d){this.check(id,d);if(this.bag.length<7)throw Error('Tauschen nur mit mindestens sieben Steinen im Beutel');if(!Array.isArray(d.ids)||!d.ids.length||d.ids.length>7||new Set(d.ids).size!==d.ids.length||d.ids.some(x=>!this.racks[id].some(t=>t.id===x)))throw Error('Eigene Steine zum Tauschen wählen');const old=this.racks[id].filter(t=>d.ids.includes(t.id)),kept=this.racks[id].filter(t=>!d.ids.includes(t.id));this.racks[id]=[...kept,...this.bag.splice(-old.length)];this.bag=shuffle([...this.bag,...old]);this.passes=0;this.revision++;this.act(id,`tauscht ${old.length} Steine`);this.next();}
  end(finisher=null){const scores=endScores(this.points,this.racks,finisher),max=Math.max(...Object.values(scores));this.points=scores;this.stage='done';this.finishRound(this.order.filter(id=>scores[id]===max),finisher?'Beutel und Bank leer – Reststeine abgerechnet':'Sechsmal gepasst – Reststeine abgerechnet',scores);}
  timerActive(){return this.stage==='place';}
  botDue(){if(this.phase!=='playing')return null;if(this.pending)return this.order.find(id=>id!==this.pending.id&&this.players.get(id)?.bot&&(this.stage==='review'?!this.pending.approvals.includes(id):!Object.hasOwn(this.pending.votes,id)))||null;return this.players.get(this.currentId)?.bot?this.currentId:null;}
  botStep(id){const d={key:this.key,revision:this.revision};if(this.stage==='review')return this.review(id,{...d,challenge:false});if(this.stage==='vote')return this.vote(id,{...d,accept:true});const move=choosePlacement(this.gameView(id));if(move)this.place(id,{...d,placements:move.placements});else this.pass(id,d);}
  onTimeout(id){if(id)this.pass(id,{key:this.key,revision:this.revision});}
  publicPlayer(p){return {tiles:this.racks[p.id]?.length||0,gamePoints:this.points[p.id]||0};}
  gameView(id){const p=this.pending;return {key:this.key,revision:this.revision,stage:this.stage,board:structuredClone(this.board),premiums:PREMIUMS,rack:this.racks[id]?structuredClone(this.racks[id]):null,bagCount:this.bag.length,passes:this.passes,reviewDeadline:this.reviewDeadline,pending:p?{id:p.id,words:p.move.words,points:p.move.points,placements:p.move.placements,challenger:p.challenger,reviewed:p.approvals.includes(id),voted:Object.hasOwn(p.votes,id),votes:Object.keys(p.votes).length}:null,lastMove:structuredClone(this.lastMove||null)};}
  onDropOut(){this.onAbort();this.finishRound([],'Partie wegen Aussteigen abgebrochen – keine Wertung');}
  onAbort(){this.clock.clearTimeout(this.reviewTimer);this.reviewTimer=null;this.reviewDeadline=null;this.pending=null;this.board=emptyBoard();this.racks={};this.bag=[];this.points={};this.stage='place';this.revision++;}
  dispose(){this.clock.clearTimeout(this.reviewTimer);super.dispose();}
  static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
