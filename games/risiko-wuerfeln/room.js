import {TurnRoom} from '../../server/turn-room.js';
import {die} from '../../server/random.js';

// A single die: 2–6 add to this turn, 1 loses only the unsecured points.
export class Room extends TurnRoom {
  static OPTIONS=[
    {key:'target',label:'Zielpunktzahl',type:'number',min:20,max:500},
    {key:'turnTime',label:'Zeit pro Entscheidung in Sekunden (0 = ohne)',type:'number',min:0,max:300},
  ];
  defaultSettings(){return {target:100,turnTime:45};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:8,scoreLabel:'Punkte'});this.roll=die;this.banked={};this.pot=0;this.lastRoll=null;this.lastBust=null;}
  setupRound(){this.banked=Object.fromEntries(this.order.map((id)=>[id,0]));this.lastBust=null;}
  onTurnStart(){this.pot=0;this.lastRoll=null;}
  throwDice(id){
    this.requireTurn(id);const face=this.roll();
    if(!Number.isInteger(face)||face<1||face>6)throw Error('Ungültiger Würfelwurf');
    this.lastRoll=face;
    if(face===1){this.lastBust={id,points:this.pot};this.act(id,`Niete · ${this.pot} Zugpunkte verloren`);this.say(`${this.name(id)} würfelt eine 1 und verliert ${this.pot} ungesicherte Punkte`);this.next();}
    else{this.pot+=face;this.lastBust=null;this.act(id,`würfelt ${face} · Zug ${this.pot}`);}
  }
  bank(id){
    this.requireTurn(id);if(this.pot<=0)throw Error('Erst Punkte erwürfeln');
    this.banked[id]+=this.pot;this.act(id,`sichert ${this.pot} Punkte`);this.say(`${this.name(id)} sichert ${this.pot} Punkte (gesamt ${this.banked[id]})`);
    if(this.banked[id]>=this.settings.target){this.pot=0;this.finishRound([id],`${this.name(id)} erreicht ${this.banked[id]} Punkte und gewinnt`,{...this.banked});}
    else this.next();
  }
  onTimeout(id){if(this.pot>0)this.bank(id);else this.throwDice(id);}
  botStep(id){if(this.pot>=15||this.pot>0&&this.banked[id]+this.pot>=this.settings.target)this.bank(id);else this.throwDice(id);}
  publicPlayer(p){return {banked:this.banked[p.id]||0};}
  gameView(){return {pot:this.pot,banked:{...this.banked},target:this.settings.target,lastRoll:this.lastRoll,lastBust:this.lastBust};}
  onAbort(){this.banked={};this.pot=0;this.lastRoll=null;this.lastBust=null;}
  static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
