import {Table} from '../poker/engine/table.js';
import {RANKS,bestHand,compareScores} from '../poker/engine/cards.js';
const STREETS=['third','fourth','fifth','sixth','seventh'];
const value=c=>RANKS.indexOf(c[0])+2;
// Exposed hands contain at most four cards. Straights/flushes cannot start action.
export function exposedRank(cards){const counts=new Map();for(const c of cards)counts.set(value(c),(counts.get(value(c))||0)+1);const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),kind=groups[0]?.[1]||0,cat=kind===4?7:kind===3?3:kind===2&&groups[1]?.[1]===2?2:kind===2?1:0;return [cat,...groups.map(x=>x[0])];}
export function lowestDoor(players){return Object.keys(players).map(Number).sort((a,b)=>{const x=players[a].cards[2],y=players[b].cards[2];return value(x)-value(y)||'cdhs'.indexOf(x[1])-'cdhs'.indexOf(y[1]);})[0];}

export class StudTable extends Table {
  constructor({ante=1,bringIn=2,smallBet=10,bigBet=20,...options}={}){super({...options,smallBlind:0,bigBlind:smallBet});this.ante=ante;this.bringIn=bringIn;this.smallBet=smallBet;this.bigBet=bigBet;}
  startHand(){
    if(this.hand&&!this.hand.done)throw Error('Es läuft schon eine Hand');const seats=this.eligibleSeats();if(seats.length<2||seats.length>7)throw Error('Stud braucht 2 bis 7 Spieler mit Chips');
    this.button0=this.button;this.button=this.button<0?seats[0]:this.nextFrom(this.button,seats);const deck=this.riggedDeck?[...this.riggedDeck]:this.createDeck();this.riggedDeck=null;
    const players=Object.fromEntries(seats.map(seat=>[seat,{seat,cards:[],folded:false,allIn:false,bet:0,total:0,acted:false,actedAt:-1,lastAction:null}]));
    this.hand={prevButton:this.button0,no:++this.handNo,deck,board:[],burned:[],street:'third',button:this.button,sb:-1,bb:-1,headsUp:seats.length===2,seats,players,currentBet:0,lastRaise:this.smallBet,fullRaises:0,raises:0,toAct:-1,lastAggressor:-1,done:false,result:null,shown:new Set(),bringInPending:false};
    const h=this.hand;for(let n=0;n<3;n++)for(const i of this.clockwise(seats))players[i].cards.push(deck.pop());this.log({type:'hand',no:h.no});this.postAntes(this.ante);
    const low=lowestDoor(players);h.bringIn=this.canAct(low)?low:this.nextActor(low);h.bringInPending=h.bringIn>=0;h.toAct=h.bringIn;this.afterAction();return h;
  }
  clockwise(seats){const result=[];let at=this.hand.button;for(let n=0;n<seats.length;n++){at=this.nextFrom(at,seats);result.push(at);}return result;}
  exposedCards(seat){return this.hand?.players[seat]?.cards.slice(2,6)||[];}
  evaluate(hole,board){return bestHand([...hole,...board]);}
  completeBoard(){} // Seventh street is private or one explicit common card.
  wagerUnit(){return ['third','fourth'].includes(this.hand.street)?this.smallBet:this.bigBet;}
  legal(seat){
    const h=this.hand;if(!h||h.done||h.toAct!==seat)return null;const p=h.players[seat],stack=this.seats[seat].stack;
    if(h.bringInPending)return {bringInRequired:true,bringInAmount:Math.min(this.bringIn,stack),canComplete:stack>=this.smallBet,completeTo:this.smallBet,canCheck:false,toCall:0,canRaise:false,limit:true,bet:p.bet,stackTo:p.bet+stack};
    const L=super.legal(seat),unit=this.wagerUnit(),want=h.currentBet<unit?unit:h.currentBet+unit,maxTo=Math.min(want,L.stackTo),reopened=!p.acted||p.actedAt<h.fullRaises;
    return {...L,limit:true,minTo:maxTo,maxTo,canRaise:maxTo>h.currentBet&&h.seats.some(i=>i!==seat&&this.canAct(i))&&reopened&&h.fullRaises<4};
  }
  act(seat,action){
    const h=this.hand;if(h?.bringInPending){if(h.toAct!==seat||!this.canAct(seat)||!['bringIn','complete'].includes(action.type))throw Error('Zuerst Bring-in oder volle kleine Wette setzen');const L=this.legal(seat);if(action.type==='complete'&&!L.canComplete)throw Error('Nicht genug Chips für die volle Wette');const full=action.type==='complete',amount=full?this.smallBet:L.bringInAmount;this.put(seat,amount);const p=h.players[seat];h.currentBet=p.bet;h.raises=full?1:0;h.fullRaises=full?1:0;h.lastRaise=this.smallBet;h.lastAggressor=seat;p.acted=true;p.actedAt=h.fullRaises;p.lastAction=full?'Complete':'Bring-in';h.bringInPending=false;this.log({type:full?'complete':'bring-in',seat,amount});this.advance(seat);return h;}
    // Completing a partial bring-in opens a full small bet, not bring-in + bet.
    if(h&&!h.done&&h.currentBet>0&&h.currentBet<this.wagerUnit()&&['raise','allin'].includes(action.type))h.lastRaise=this.wagerUnit()-h.currentBet;
    try{return super.act(seat,action);}finally{if(this.hand&&!this.hand.done)this.hand.lastRaise=this.wagerUnit();}
  }
  afterAction(){if(this.hand?.bringInPending&&this.canAct(this.hand.bringIn)){this.hand.toAct=this.hand.bringIn;return;}super.afterAction();}
  forceFold(seat){const h=this.hand;if(!h?.bringInPending)return super.forceFold(seat);if(!this.inHand(seat))return;h.players[seat].folded=true;h.players[seat].lastAction='Fold';if(h.bringIn===seat){h.bringIn=this.nextActor(seat);h.bringInPending=h.bringIn>=0;h.toAct=h.bringIn;}if(this.live().length===1)this.finish();else this.afterAction();}
  firstExposed(){const seats=this.clockwise(this.live());let best=seats[0];for(const i of seats)if(compareScores(exposedRank(this.exposedCards(i)),exposedRank(this.exposedCards(best)))>0)best=i;return this.canAct(best)?best:this.nextActor(best);}
  burnCard(){const c=super.burnCard();this.hand.burned.push(c);return c;}
  nextStreet(){
    const h=this.hand;if(h.street==='seventh')return this.finish();this.refundUncalled();
    for(const i of h.seats){const p=h.players[i];p.bet=0;p.acted=false;p.actedAt=-1;if(!p.folded&&!p.allIn)p.lastAction=null;}
    h.street=STREETS[STREETS.indexOf(h.street)+1];h.currentBet=0;h.lastRaise=this.wagerUnit();h.fullRaises=0;h.raises=0;h.lastAggressor=-1;h.bringInPending=false;this.burnCard();
    const live=this.clockwise(this.live());if(h.deck.length<live.length){if(h.street!=='seventh'||h.deck.length<1)throw Error('Nicht genug Karten für Stud');h.board.push(h.deck.pop());h.commonSeventh=true;}else for(const i of live)h.players[i].cards.push(h.deck.pop());
    this.log({type:'street',street:h.street,board:[...h.board]});h.toAct=this.firstExposed();this.afterAction();
  }
}
