import {randomInt,randomUUID} from 'node:crypto';
import {PartyRoom} from '../party-room.js';import {die} from '../../server/random.js';
export class Room extends PartyRoom {
  static OPTIONS=[{key:'rounds',label:'Anzahl Würfelpakete',type:'number',min:1,max:20},{key:'writeSecs',label:'Zeit pro Gebot in Sekunden',type:'number',min:5,max:120},{key:'chips',label:'Startchips pro Spieler',type:'number',min:5,max:100}];
  defaultSettings(){return {rounds:6,writeSecs:25,chips:20,target:0,spectators:false};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:3,maxPlayers:8});this.coins={};this.bids={};this.reveal=null;this.roll=die;}
  get flow(){return ['write','reveal'];}
  setupRound(){this.roundKey=randomUUID();this.coins=Object.fromEntries(this.order.map((id)=>[id,this.settings.chips]));super.setupRound();}
  pickQuestions(n){return Array.from({length:n},(_,i)=>({id:`package-${i}`,count:randomInt(2,6)}));}
  startQuestion(){this.bids={};this.reveal=null;}
  waiting(){return this.order.filter((id)=>this.bids[id]===undefined);}
  isReady(id){return this.bids[id]!==undefined;}
  canAnswer(id){return this.phase==='playing'&&this.order.includes(id);}
  bid(id,amount,question,roundKey){
    if(this.gamePaused)throw Error('Das Spiel ist angehalten');if(this.phase!=='playing'||this.stage!=='write')throw Error('Gerade wird nicht geboten');
    if(!this.order.includes(id))throw Error('Du spielst in dieser Partie nicht mit');
    if(question!==this.q+1||roundKey!==this.roundKey)throw Error('Dieses Würfelpaket ist nicht mehr aktuell');
    if(this.deadline&&this.clock.now()>=this.deadline)throw Error('Die Zeit ist abgelaufen');
    if(this.bids[id]!==undefined)throw Error('Dein Gebot wurde bereits abgegeben');
    if(!Number.isInteger(amount)||amount<0||amount>this.coins[id])throw Error('Das Gebot muss zwischen null und deinen verfügbaren Chips liegen');
    this.bids[id]=amount;this.act(id,'✓ geboten');this.checkDone();
  }
  enter(stage){
    if(stage!=='reveal')return;const bids=this.order.map((id)=>({id,amount:this.bids[id]??0})),highest=Math.max(0,...bids.map((b)=>b.amount)),best=bids.filter((b)=>b.amount===highest);
    const winner=highest>0&&best.length===1?best[0].id:null,dice=winner?Array.from({length:this.cur.count},()=>this.roll()):[];if(dice.some((n)=>!Number.isInteger(n)||n<1||n>6))throw Error('Ungültiger Würfelwurf');
    const points=dice.reduce((n,x)=>n+x,0);if(winner){this.coins[winner]-=highest;this.addPoints(winner,points);}
    this.reveal={bids,winner,dice,points,paid:winner?highest:0,tied:highest>0&&best.length>1};this.say(winner?`${this.name(winner)} kauft ${this.cur.count} Würfel für ${highest} Chips und würfelt ${points} Punkte`:'Kein Verkauf – alle Chips bleiben erhalten','win');
  }
  next(id){if(this.gamePaused)throw Error('Das Spiel ist angehalten');super.next(id);}
  publicPlayer(p){return {...super.publicPlayer(p),chips:this.coins[p.id]??this.settings.chips};}
  stageView(id){return {roundKey:this.roundKey,count:this.cur.count,mine:this.bids[id]??null,chips:this.coins[id]??0,reveal:this.stage==='reveal'?this.reveal:null};}
  botStep(id,rng=Math.random){if(this.stage!=='write'||this.bids[id]!==undefined)return;const view=this.gameView(id),left=this.total-this.q,average=view.chips/Math.max(1,left),bid=Math.max(0,Math.min(view.chips,Math.round(average*(view.count/3)+(rng()-.5)*3)));this.bid(id,bid,this.q+1,this.roundKey);}
  fallback(id){this.botStep(id);}
  onAbort(){super.onAbort();this.coins={};this.bids={};this.reveal=null;}
  static restore(data,onChange){return PartyRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
