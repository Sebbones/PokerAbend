import {PokerVariantRoom,CHIP_OPTIONS} from './poker-room.js';
import {omahaScore} from '../poker/engine/cards.js';
import {HiLoTable,lowBest} from './table.js';
export class Room extends PokerVariantRoom {
  static OPTIONS=CHIP_OPTIONS;
  static botRules={holeCards:4,hiLo:true,evaluate:(hole,board)=>({score:[omahaScore(hole,board)],low:lowBest(hole,board)})};
  defaultSettings(){return {...super.defaultSettings(),potLimit:true};}
  createTable(){return new HiLoTable(this.settings);}
  gameView(id){return {...super.gameView(id),viewerId:id};}
}
