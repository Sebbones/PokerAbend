import {randomUUID} from 'node:crypto';import {TurnRoom} from '../../server/turn-room.js';import {shuffle} from '../poker/engine/cards.js';import {newDeck,legal,winner,score} from './rules.js';import {decide,fallback} from './bot.js';
export class Room extends TurnRoom{
 static OPTIONS=[{key:'rounds',label:'Blätter pro Partie',type:'number',min:1,max:20},{key:'maxCards',label:'Maximale Handgröße',type:'number',min:1,max:8},{key:'trumpMode',label:'Trumpfvereinbarung',type:'select',values:[{value:'reveal',label:'Aufgedeckte Karte'},{value:'none',label:'Ohne Trumpf'}]},{key:'turnTime',label:'Zeit pro Entscheidung in Sekunden (0 = ohne)',type:'number',min:0,max:300}];
 defaultSettings(){return {rounds:8,maxCards:8,trumpMode:'reveal',turnTime:45};}
 constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:3,maxPlayers:6});this.hands={};this.stage=null;this.revision=0;this.deckFactory=()=>shuffle(newDeck());}
 get currentId(){return this.phase==='playing'&&['bid','play'].includes(this.stage)?this.order[this.turn]:null;}
 setupRound(){this.key=randomUUID();this.dealNo=0;this.totals=Object.fromEntries(this.order.map(id=>[id,0]));this.lastDeal=null;this.beginDeal();}
 beginDeal(){this.dealNo++;this.revision++;this.stage='bid';this.turn=(this.dealNo-1)%this.order.length;this.leader=this.turn;this.bids={};this.taken=Object.fromEntries(this.order.map(id=>[id,0]));this.hands=Object.fromEntries(this.order.map(id=>[id,[]]));this.played=[];this.trick=[];this.lastTrick=null;
  const max=Math.min(this.settings.maxCards,Math.floor((this.settings.trumpMode==='reveal'?51:52)/this.order.length));this.handSize=1+(this.dealNo-1)%max;const deck=this.deckFactory();if(deck.length!==52||new Set(deck).size!==52||deck.some(c=>!newDeck().includes(c)))throw Error('Ungültiges Blatt');
  for(let i=0;i<this.handSize*this.order.length;i++)this.hands[this.order[i%this.order.length]].push(deck.shift());this.trump=this.settings.trumpMode==='reveal'?deck.shift():null;this.stock=deck;
 }
 guard(id,d,stage){this.requireTurn(id);if(d?.key!==this.key||d.revision!==this.revision)throw Error('Dieser Spielstand ist nicht mehr aktuell');if(this.stage!==stage)throw Error('Diese Aktion gehört nicht zu dieser Phase');}
 bid(id,d){this.guard(id,d,'bid');if(!Number.isInteger(d.amount)||d.amount<0||d.amount>this.handSize)throw Error('Ansage muss zwischen null und Handgröße liegen');this.bids[id]=d.amount;this.revision++;this.act(id,`sagt ${d.amount} Stiche an`);if(Object.keys(this.bids).length===this.order.length){this.stage='play';this.turn=this.leader;}else this.next();}
 play(id,d){this.guard(id,d,'play');if(!legal(this.hands[id],this.trick).includes(d.card))throw Error('Eigene Karte wählen und Farbe bedienen');this.hands[id].splice(this.hands[id].indexOf(d.card),1);this.trick.push({id,card:d.card});this.played.push(d.card);this.revision++;this.act(id,`spielt ${d.card}`);
  if(this.trick.length<this.order.length){this.next();return;}const won=winner(this.trick,this.trump?.[1]);this.taken[won]++;this.lastTrick={winner:won,cards:this.trick.map(p=>({...p}))};this.trick=[];this.turn=this.order.indexOf(won);
  if(!this.hands[id].length){const points=Object.fromEntries(this.order.map(p=>[p,score(this.bids[p],this.taken[p])]));for(const p of this.order)this.totals[p]+=points[p];this.lastDeal={no:this.dealNo,bids:{...this.bids},taken:{...this.taken},points};this.stage='deal-over';if(this.dealNo===this.settings.rounds){const top=Math.max(...Object.values(this.totals));this.finishRound(this.order.filter(p=>this.totals[p]===top),'Stichmeister: höchste Gesamtpunktzahl gewinnt',{...this.totals});}}
 }
 nextDeal(id,d){this.requireHost(id);if(this.gamePaused||this.phase!=='playing'||this.stage!=='deal-over'||d?.key!==this.key||d.revision!==this.revision)throw Error('Dieses Blatt kann noch nicht gewechselt werden');this.beginDeal();this.act(id,'Nächstes Blatt');}
 botStep(id,rng=Math.random){const a=decide(this.gameView(id),id,this.players.get(id)?.botDifficulty||'medium',rng);return this[a.method](id,...a.args);}
 onTimeout(id){if(id){const a=fallback({g:this.gameView(id),id});this[a.method](id,...a.args);}}
 onDropOut(){this.hands={};this.stage=null;this.finishRound([],'Partie wegen Aussteigen abgebrochen – keine Wertung');}
 publicPlayer(p){return {cards:this.hands[p.id]?.length||0,prediction:this.bids?.[p.id]??null,tricks:this.taken?.[p.id]||0,matchPoints:this.totals?.[p.id]||0};}
 gameView(id){return {key:this.key,revision:this.revision,stage:this.stage,dealNo:this.dealNo,rounds:this.settings.rounds,handSize:this.handSize,players:this.order.length,hand:this.hands[id]?[...this.hands[id]]:null,trump:this.trump,bids:{...this.bids},taken:{...this.taken},totals:{...this.totals},trick:this.trick.map(p=>({...p})),played:[...this.played],lastTrick:this.lastTrick?structuredClone(this.lastTrick):null,lastDeal:this.lastDeal?structuredClone(this.lastDeal):null,legal:this.currentId===id&&this.stage==='play'?legal(this.hands[id],this.trick):[]};}
 onAbort(){this.hands={};this.trick=[];this.played=[];this.stage=null;this.key=null;}
 static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
