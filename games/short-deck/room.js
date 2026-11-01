import {PokerVariantRoom,CHIP_OPTIONS} from '../omaha-hi-lo/poker-room.js';
import {ShortDeckTable,shortDeck,shortBest} from './table.js';
export class Room extends PokerVariantRoom {
  static OPTIONS=[...CHIP_OPTIONS,{key:'mode',label:'Grundeinsatz',type:'select',values:[{value:'ante',label:'Nur Ante'},{value:'ante-blinds',label:'Ante und Blinds'}]},{key:'ante',label:'Ante je Spieler',type:'number',min:1,max:10000},{key:'tripsBeatStraight',label:'Drilling schlägt Straße',type:'bool'}];
  defaultSettings(){return {...super.defaultSettings(),mode:'ante',ante:10,tripsBeatStraight:true};}
  createTable(){return new ShortDeckTable(this.settings);}
  botStep(id,rng=Math.random){this.botRules={holeCards:2,deck:shortDeck,evaluate:(hole,board)=>shortBest([...hole,...board],this.settings.tripsBeatStraight)};return super.botStep(id,rng);}
  get botRules(){return this._botRules;}set botRules(value){this._botRules=value;}
}
