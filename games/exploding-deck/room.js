import {randomInt,randomUUID} from 'node:crypto';
import {TurnRoom} from '../../server/turn-room.js';
import {shuffle} from '../poker/engine/cards.js';
import {CARDS,deal} from './cards.js';
import {decide} from './bot.js';

export class Room extends TurnRoom {
  static OPTIONS=[{key:'doubleDeck',label:'Doppeltes Deck (bis zehn Spieler)',type:'bool'},{key:'reactionSecs',label:'Reaktionsfenster in Sekunden',type:'number',min:3,max:10},{key:'turnTime',label:'Zeit pro Entscheidung (0 = ohne)',type:'number',min:0,max:300}];
  defaultSettings(){return {doubleDeck:false,reactionSecs:5,turnTime:45};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:10,winPoints:1});this.hands={};this.deck=[];this.discard=[];this.alive=new Set();this.forecasts={};this.pending=null;this.bomb=null;this.gift=null;this.revision=0;this.randomInt=randomInt;this.stage=null;}
  validateStart(ids){if(ids.length>5&&!this.settings.doubleDeck)throw Error('Mehr als fünf Spieler brauchen das doppelte Deck');}
  setupRound(){const cards=deal(this.order.length,this.settings.doubleDeck,this.randomInt);this.key=randomUUID();this.hands=Object.fromEntries(this.order.map((id,i)=>[id,cards.hands[i]]));this.deck=cards.deck;this.discard=[];this.alive=new Set(this.order);this.forecasts={};this.pending=null;this.bomb=null;this.gift=null;this.stage='turn';this.turnsLeft=1;this.underAttack=false;this.revision++;this.act(null,'Die Werkstatt ist eröffnet');}
  get actor(){return this.order[this.turn]||null;}
  get currentId(){if(this.phase!=='playing')return null;if(this.gift)return this.gift.target;return this.actor;}
  onTurnStart(){}
  participant(id,key){if(this.gamePaused)throw Error('Das Spiel ist angehalten');if(this.phase!=='playing'||!this.alive.has(id))throw Error('Du spielst hier gerade nicht mit');if(key!==this.key)throw Error('Diese Partie ist nicht mehr aktuell');}
  check(id,d,stage){this.participant(id,d?.key);if(this.currentId!==id||this.stage!==stage)throw Error('Diese Entscheidung gehört dir gerade nicht');if(d.revision!==this.revision)throw Error('Dieser Spielstand ist nicht mehr aktuell');}
  owned(id,card){const found=this.hands[id]?.find(c=>c.id===card);if(!found)throw Error('Wähle eine eigene Karte');return found;}
  removeCards(id,ids){const taken=this.hands[id].filter(c=>ids.includes(c.id));this.hands[id]=this.hands[id].filter(c=>!ids.includes(c.id));this.discard.push(...taken);return taken;}
  nextActor(){let i=this.turn;do{i=(i+1)%this.order.length;}while(!this.alive.has(this.order[i]));this.turn=i;this.turnsLeft=1;this.underAttack=false;this.stage='turn';this.revision++;}
  finishTurn(){this.stage='turn';if(this.turnsLeft>1){this.turnsLeft--;this.revision++;}else this.nextActor();}
  targetFor(id,target){if(target===id||!this.alive.has(target)||!this.hands[target].length)throw Error('Wähle einen anderen Mitspieler mit Karten');}

  playCard(id,d){
    this.check(id,d,'turn');if(!Array.isArray(d.cards)||!d.cards.length||d.cards.length>3||new Set(d.cards).size!==d.cards.length)throw Error('Wähle eigene verschiedene Karten');
    const cards=d.cards.map(card=>this.owned(id,card)),kind=cards[0].kind,combo=d.cards.length;
    if(combo===1){if(!['attack','skip','future','shuffle','favor'].includes(kind))throw Error('Diese Karte wird hier nicht einzeln gespielt');if(kind==='favor')this.targetFor(id,d.target);}
    else{if(![2,3].includes(combo)||!kind.startsWith('cat')||cards.some(c=>c.kind!==kind))throw Error('Ein Paar oder Drilling braucht gleiche Sammelkarten');this.targetFor(id,d.target);if(combo===3&&(!Object.hasOwn(CARDS,d.request)||d.request==='bomb'))throw Error('Wähle eine verlangte Kartenart');}
    this.removeCards(id,d.cards);this.pending={id:randomUUID(),kind:combo===1?kind:combo===2?'pair':'triple',actor:id,target:d.target||null,request:combo===3?d.request:null,nopeCount:0,passed:new Set(),deadline:this.clock.now()+this.settings.reactionSecs*1000};this.stage='react';this.revision++;this.act(id,combo===1?`spielt ${CARDS[kind][0]}`:`spielt einen ${combo===2?'Zweier':'Dreier'}-Satz`);
  }
  nope(id,d){this.participant(id,d?.key);const p=this.pending;if(this.stage!=='react'||!p||p.id!==d.actionId||this.clock.now()>=p.deadline)throw Error('Das Reaktionsfenster ist beendet');const card=this.owned(id,d.card);if(card.kind!=='nope')throw Error('Nur Einspruch stoppt eine Aktion');this.removeCards(id,[card.id]);p.nopeCount++;p.passed.clear();p.deadline=this.clock.now()+this.settings.reactionSecs*1000;this.revision++;this.act(id,`Einspruch! · ${p.nopeCount%2?'Aktion gestoppt':'Aktion wieder gültig'}`);}
  passReaction(id,d){this.participant(id,d?.key);const p=this.pending;if(this.stage!=='react'||!p||p.id!==d.actionId||d.chain!==p.nopeCount)throw Error('Diese Reaktion ist nicht mehr aktuell');p.passed.add(id);if([...this.alive].every(x=>p.passed.has(x)))this.resolveAction();}
  resolveAction(){
    const p=this.pending;if(!p||this.stage!=='react')return;this.pending=null;this.stage='turn';this.revision++;
    if(p.nopeCount%2){this.act(null,'Die Aktion bleibt gestoppt');return;}
    if(p.kind==='attack'){const debt=(this.underAttack?this.turnsLeft:0)+2;this.nextActor();this.turnsLeft=debt;this.underAttack=true;this.act(p.actor,`Doppelschicht: ${debt} Züge für ${this.name(this.actor)}`);}
    else if(p.kind==='skip'){this.act(p.actor,'beendet einen Zug ohne Ziehen');this.finishTurn();}
    else if(p.kind==='future'){this.forecasts[p.actor]=this.deck.slice(0,3).map(c=>({...c}));this.act(p.actor,'prüft verdeckt die nächsten drei Kisten');}
    else if(p.kind==='shuffle'){shuffle(this.deck,this.randomInt);this.forecasts={};this.act(p.actor,'mischt den verdeckten Stapel');}
    else if(p.kind==='favor'){if(!this.alive.has(p.target)||!this.hands[p.target].length)return;this.gift={actor:p.actor,target:p.target};this.stage='gift';}
    else{const hand=this.hands[p.target];if(!this.alive.has(p.target)||!hand.length)return;const card=p.kind==='pair'?hand[this.randomInt(hand.length)]:hand.find(c=>c.kind===p.request);if(card){hand.splice(hand.indexOf(card),1);this.hands[p.actor].push(card);}this.act(p.actor,p.kind==='pair'?'nimmt eine zufällige verdeckte Karte':'verlangt eine Kartenart');}
  }
  giveCard(id,d){this.check(id,d,'gift');const card=this.owned(id,d.card),actor=this.gift.actor;this.hands[id].splice(this.hands[id].indexOf(card),1);this.hands[actor].push(card);this.gift=null;this.stage='turn';this.revision++;this.act(id,'gibt eine verdeckte Karte ab');}
  drawCard(id,d){
    this.check(id,d,'turn');if(!this.deck.length)throw Error('Der Stapel ist leer');const card=this.deck.shift();for(const cards of Object.values(this.forecasts))cards.shift();this.revision++;
    if(card.kind!=='bomb'){this.hands[id].push(card);this.act(id,'zieht eine verdeckte Karte');this.finishTurn();return;}
    const defuse=this.hands[id].find(c=>c.kind==='defuse');
    if(defuse){this.removeCards(id,[defuse.id]);this.bomb={owner:id,card};this.stage='insert';this.act(id,'entschärft eine Knallkiste');}
    else{this.discard.push(card,...this.hands[id]);this.hands[id]=[];this.alive.delete(id);delete this.forecasts[id];this.act(id,'Knall! Ausgeschieden.');if(this.alive.size===1)return this.finishRound([...this.alive],`${this.name([...this.alive][0])} bleibt in der Werkstatt`,Object.fromEntries([...this.alive].map(id=>[id,1])));this.nextActor();}
  }
  insertBomb(id,d){this.check(id,d,'insert');if(!this.bomb||this.bomb.owner!==id||!Number.isInteger(d.index)||d.index<0||d.index>this.deck.length)throw Error('Wähle eine gültige geheime Position');this.deck.splice(d.index,0,this.bomb.card);this.bomb=null;this.forecasts={};this.revision++;this.act(id,'legt die entschärfte Kiste verdeckt zurück');this.finishTurn();}

  afterChange(){if(!this.gamePaused)this.syncTimer();}
  syncTimer(){const key=this.phase==='playing'?`${this.roundNo}:${this.revision}:${this.stage}:${this.pending?.nopeCount||0}`:null;if(key===this.timerKey)return;this.clock.clearTimeout(this.turnTimer);this.turnTimer=null;this.timerKey=key;this.deadline=null;if(!key)return;const ms=this.pending?Math.max(0,this.pending.deadline-this.clock.now()):this.settings.turnTime*1000;if(!this.pending&&!this.settings.turnTime)return;this.deadline=this.clock.now()+ms;this.turnTimer=this.clock.setTimeout(()=>{if(this.timerKey!==key)return;this.onTimeout(this.currentId);this.afterChange();this.onChange('state');},ms);this.turnTimer.unref?.();}
  onTimeout(id){if(this.pending)return this.resolveAction();const d={key:this.key,revision:this.revision};if(this.stage==='insert')return this.insertBomb(id,{...d,index:this.randomInt(this.deck.length+1)});if(this.stage==='gift')return this.giveCard(id,{...d,card:this.hands[id][0].id});return this.drawCard(id,d);}
  botDue(){if(this.phase!=='playing')return null;if(this.pending)return [...this.alive].find(id=>this.players.get(id)?.bot&&!this.pending.passed.has(id))||null;return this.players.get(this.currentId)?.bot?this.currentId:null;}
  botStep(id,rng=Math.random){const action=decide(this.gameView(id),id,'medium',rng);return this[action.method](id,...action.args);}
  publicPlayer(p){return {cards:this.hands[p.id]?.length||0,eliminated:this.phase!=='lobby'&&this.order.includes(p.id)&&!this.alive.has(p.id)};}
  gameView(id){const mine=this.alive.has(id),p=this.pending;return {key:this.key,revision:this.revision,stage:this.stage,actor:this.actor,alive:[...this.alive],turnsLeft:this.turnsLeft,underAttack:this.underAttack,deckCount:this.deck.length,hand:mine?this.hands[id].map(c=>({...c})):null,discard:this.discard.map(c=>({...c})),future:mine?(this.forecasts[id]||[]).map(c=>({...c})):null,people:[...this.alive].map(p=>({id:p,cards:this.hands[p].length})),pending:p?{id:p.id,kind:p.kind,actor:p.actor,target:p.target,request:p.request,nopeCount:p.nopeCount,passed:p.passed.has(id)}:null,canInsert:mine&&this.bomb?.owner===id,canGive:mine&&this.gift?.target===id};}
  onAbort(){this.hands={};this.deck=[];this.discard=[];this.alive.clear();this.forecasts={};this.pending=null;this.bomb=null;this.gift=null;this.stage=null;}
  dropOut(p,message){if(!this.alive.has(p.id))return;if(message)this.say(message);const wasActor=p.id===this.actor;this.alive.delete(p.id);this.discard.push(...this.hands[p.id]);this.hands[p.id]=[];delete this.forecasts[p.id];if(this.bomb?.owner===p.id){this.deck.splice(this.randomInt(this.deck.length+1),0,this.bomb.card);this.bomb=null;this.forecasts={};}if(this.gift?.actor===p.id||this.gift?.target===p.id){this.gift=null;this.stage='turn';}if(this.pending?.actor===p.id||this.pending?.target===p.id){this.pending=null;this.stage='turn';}if(this.alive.size<2)return this.finishRound([...this.alive],'Die übrige Werkstatt gewinnt',Object.fromEntries([...this.alive].map(id=>[id,1])));if(wasActor)this.nextActor();this.revision++;}
  static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
