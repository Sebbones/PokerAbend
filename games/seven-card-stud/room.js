import {PokerVariantRoom} from '../omaha-hi-lo/poker-room.js';
import {StudTable} from './table.js';
import {bestHand} from '../poker/engine/cards.js';
export class Room extends PokerVariantRoom {
  static MAX_PLAYERS=7;
  static OPTIONS=[{key:'startStack',label:'Startchips',type:'number',min:100,max:1000000},{key:'ante',label:'Ante je Spieler',type:'number',min:1,max:10000},{key:'bringIn',label:'Bring-in',type:'number',min:1,max:10000},{key:'smallBet',label:'Kleine Wette (3rd/4th)',type:'number',min:2,max:10000},{key:'bigBet',label:'Große Wette (5th–7th)',type:'number',min:4,max:20000},{key:'turnTime',label:'Zeit pro Entscheidung (0 = ohne)',type:'number',min:0,max:300}];
  static botRules={stud:true,evaluate:(hole,board)=>bestHand([...hole,...board])};
  defaultSettings(){return {...super.defaultSettings(),ante:1,bringIn:2,smallBet:10,bigBet:20,smallBlind:0,bigBlind:10};}
  clampSettings(input,base){const s=super.clampSettings(input,base);s.bigBet=Math.max(s.bigBet,s.smallBet);s.bringIn=Math.min(s.bringIn,s.smallBet);s.smallBlind=0;s.bigBlind=s.smallBet;return s;}
  createTable(){return new StudTable(this.settings);}
}
