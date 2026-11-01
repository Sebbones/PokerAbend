import {Table} from '../poker/engine/table.js';
import {bestHand,shuffle} from '../poker/engine/cards.js';

// Betting, raise reopening, refunds, side pots, showdown payouts and odd chips
// all remain in the existing Table. This adapter changes only deal progression.
export class DrawTable extends Table {
  constructor({mode='blinds',ante=10,aceFour=false,...options}={}){super({...options,holeCards:5});this.mode=mode;this.ante=ante;this.aceFour=aceFour;this.discards=[];this.drawn=new Set();this.pendingDraws=[];}
  startHand(){
    this.discards=[];this.drawn=new Set();this.pendingDraws=[];
    if(this.mode==='blinds')return super.startHand();
    const [sb,bb]=[this.smallBlind,this.bigBlind];
    this.smallBlind=0;this.bigBlind=0;
    try{super.startHand();}finally{this.smallBlind=sb;this.bigBlind=bb;}
    const h=this.hand;
    this.postAntes(this.ante);
    h.currentBet=0;h.lastRaise=bb;h.raises=0;h.lastAggressor=-1;h.toAct=this.nextActor(h.button);this.afterAction();return h;
  }
  evaluate(cards){return bestHand(cards);}
  completeBoard(){} // A draw showdown has no community cards or burns.
  legal(seat){return this.hand?.street==='draw'?null:super.legal(seat);}
  resetBets(){const h=this.hand;this.refundUncalled();for(const i of h.seats){const p=h.players[i];p.bet=0;p.acted=false;p.actedAt=-1;if(!p.folded&&!p.allIn)p.lastAction=null;}h.currentBet=0;h.lastRaise=this.bigBlind;h.fullRaises=0;h.raises=0;h.lastAggressor=-1;}
  nextStreet(){
    const h=this.hand;
    if(h.street==='postdraw')return this.finish();
    if(h.street!=='preflop')throw Error('Ungültige Draw-Phase');
    this.resetBets();h.street='draw';this.pendingDraws=[];
    let at=h.button;for(let n=0;n<this.live().length;n++){at=this.nextFrom(at,this.live());this.pendingDraws.push(at);}
    this.advanceDraw();
  }
  advanceDraw(){const h=this.hand;this.pendingDraws=this.pendingDraws.filter(i=>!h.players[i].folded);if(this.pendingDraws.length){h.toAct=this.pendingDraws[0];return;}h.street='postdraw';h.toAct=this.nextActor(h.button);this.afterAction();}
  exchange(seat,cards){
    const h=this.hand,p=h?.players[seat];
    if(!h||h.done||h.street!=='draw'||h.toAct!==seat||this.drawn.has(seat))throw Error('Du bist nicht mit Tauschen dran');
    if(!Array.isArray(cards)||new Set(cards).size!==cards.length||cards.some(c=>typeof c!=='string'||!p.cards.includes(c)))throw Error('Nur eigene verschiedene Karten tauschen');
    const kept=p.cards.filter(c=>!cards.includes(c)),limit=this.aceFour&&kept.some(c=>c[0]==='A')?4:3;
    if(cards.length>limit)throw Error('Höchstens drei Karten tauschen – vier nur mit behaltenem Ass und Hausregel');
    // Never recycle the current player's just-discarded cards into their draw.
    const pool=[...h.deck],older=[...this.discards],replacement=[];
    for(let n=0;n<cards.length;n++){if(!pool.length){if(!older.length)throw Error('Nicht genug Tauschkarten');pool.push(...shuffle(older.splice(0),this.rng));}replacement.push(pool.pop());}
    const hand=[...p.cards];cards.forEach((c,n)=>{hand[hand.indexOf(c)]=replacement[n];});
    h.deck=pool;this.discards=[...older,...cards];p.cards=hand;p.lastAction=cards.length?`${cards.length} getauscht`:'Stand pat';this.drawn.add(seat);this.pendingDraws.shift();this.log({type:'draw',seat,count:cards.length});this.advanceDraw();return h;
  }
  forceFold(seat){if(this.hand?.street!=='draw')return super.forceFold(seat);if(!this.inHand(seat))return;this.hand.players[seat].folded=true;this.hand.players[seat].lastAction='Fold';this.log({type:'fold',seat});if(this.live().length===1)this.finish();else this.advanceDraw();}
}
