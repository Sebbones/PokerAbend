import {Room as ChipRoom} from '../five-card-draw/room.js';
import {variantDecision} from './bot.js';

// Reuse the existing chip account, sit/rebuy, settlement, abort and snapshot paths.
// No account IDs, cookies, global profile names or identity assumptions belong here.
export class PokerVariantRoom extends ChipRoom {
  constructor(code,settings,onChange){super(code,settings,onChange);this.opts.maxPlayers=this.constructor.MAX_PLAYERS||9;}
  gameView(id){const g=super.gameView(id),t=this.drawTable,h=t?.hand;return {...g,viewerId:id,board:h?[...h.board]:[],pots:h?structuredClone(h.done?h.result.pots:t.potsDisplay()):[],openCards:h?Object.fromEntries(h.seats.map(i=>[t.seats[i].id,t.exposedCards?t.exposedCards(i):[]])):{},bringIn:h?.bringIn??null,smallBet:this.settings.smallBet,bigBet:this.settings.bigBet};}
  botStep(id,rng=Math.random){const view=this.gameView(id),action=variantDecision(view,{players:this.order.map(p=>({id:p,folded:!!this.drawTable.hand.players[this.seat(p)]?.folded}))},this.constructor.botRules,rng);if(action)this.wager(id,action.type,action.amount,this.revision,this.handKey);}
  resultText(h){return h.result.showdown?'Showdown – Pots und Gewinnhände sind abgerechnet':'Alle anderen haben gefoldet';}
}
export const CHIP_OPTIONS=ChipRoom.OPTIONS.filter(o=>['startStack','smallBlind','bigBlind','turnTime'].includes(o.key));
export const CHIP_FIELDS=[{key:'startStack',label:'Startchips',type:'number',min:100,step:100,value:10000},{key:'smallBlind',label:'Small Blind',type:'number',min:1,value:50},{key:'bigBlind',label:'Big Blind',type:'number',min:2,value:100}];
export const POKER_EVENTS={action:(r,p,d)=>r.wager(p.id,d.type,d.amount,d.revision,d.handKey),rebuy:(r,p)=>r.rebuy(p.id)};
