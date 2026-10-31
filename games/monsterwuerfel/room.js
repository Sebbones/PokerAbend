import {randomUUID} from 'node:crypto';
import {TurnRoom} from '../../server/turn-room.js';
import {die} from '../../server/random.js';
import {keptDice} from '../backlog-dice.js';
export class Room extends TurnRoom {
  static OPTIONS=[{key:'monsters',label:'Anzahl Monster',type:'number',min:1,max:8},{key:'turnTime',label:'Zeit pro Entscheidung in Sekunden (0 = ohne)',type:'number',min:0,max:300}];
  defaultSettings(){return {monsters:3,turnTime:45};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:1,maxPlayers:6,scoreLabel:'Punkte'});this.roll=die;this.dice=[];this.rolls=0;this.revision=0;this.index=0;this.hp=0;this.maxHp=0;this.monster=null;this.contributions={};this.last=null;}
  setupRound(){this.roundKey=randomUUID();this.revision=0;this.index=0;this.maxHp=12+2*this.order.length;this.hp=this.maxHp;this.contributions=Object.fromEntries(this.order.map((id)=>[id,0]));this.last=null;this.spawnMonster();}
  spawnMonster(){const hp=6+2*this.index+Math.max(0,this.order.length-3);this.monster={number:this.index+1,hp,maxHp:hp,attack:2+this.index};}
  onTurnStart(){this.dice=[];this.rolls=0;this.revision++;}
  check(id,revision,roundKey){this.requireTurn(id);if(revision!==this.revision||roundKey!==this.roundKey)throw Error('Dieser Würfelzug ist nicht mehr aktuell');}
  throwDice(id,keep,revision,roundKey){this.check(id,revision,roundKey);if(this.rolls>=3)throw Error('Alle drei Würfe sind verbraucht');const next=keptDice(this.dice,keep,this.roll);this.dice=next;this.rolls++;this.revision++;this.act(id,`Wurf ${this.rolls}/3`);}
  resolve(id,revision,roundKey){
    this.check(id,revision,roundKey);if(!this.dice.length)throw Error('Erst würfeln');
    const attack=this.dice.filter((n)=>n<=2).length,guard=this.dice.filter((n)=>n===3||n===4).length,heal=this.dice.filter((n)=>n>=5).length;
    const damage=attack>=2?attack*2:attack,restored=Math.min(heal*2,this.maxHp-this.hp);this.hp+=restored;this.monster.hp=Math.max(0,this.monster.hp-damage);this.contributions[id]=(this.contributions[id]||0)+damage;
    const defeated=this.monster.hp===0,counter=defeated?0:Math.max(0,this.monster.attack-guard);this.hp=Math.max(0,this.hp-counter);this.revision++;
    this.last={id,dice:[...this.dice],damage,guard,heal:restored,counter,defeated,monster:this.monster.number};this.act(id,`${damage} Schaden · ${restored} Heilung · ${counter} Gegenschaden`);
    if(this.hp===0)return this.finishRound([],'Die Gruppe ist besiegt. Beim nächsten Mal klappt es!');
    if(defeated){this.index++;if(this.index>=this.settings.monsters)return this.finishRound([...this.order],'Alle Monster besiegt – die Gruppe gewinnt!',Object.fromEntries(this.order.map((p)=>[p,100])));this.spawnMonster();}
    this.next();
  }
  onTimeout(id){if(this.dice.length)this.resolve(id,this.revision,this.roundKey);else this.throwDice(id,[],this.revision,this.roundKey);}
  botStep(id){
    if(!this.dice.length)return this.throwDice(id,[],this.revision,this.roundKey);
    const heal=this.hp<=this.maxHp/2,keep=this.dice.map((n,i)=>(heal?n>=5:n<=2)?i:-1).filter((i)=>i>=0);
    if(this.rolls>=3||keep.length>=2)return this.resolve(id,this.revision,this.roundKey);
    this.throwDice(id,keep,this.revision,this.roundKey);
  }
  publicPlayer(p){return {damage:this.contributions[p.id]||0};}
  gameView(){return {roundKey:this.roundKey,revision:this.revision,dice:[...this.dice],rolls:this.rolls,hp:this.hp,maxHp:this.maxHp,monster:this.monster?{...this.monster}:null,of:this.settings.monsters,last:this.last?{...this.last,dice:[...this.last.dice]}:null};}
  onAbort(){this.dice=[];this.rolls=0;this.monster=null;this.hp=0;this.last=null;}
  static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
