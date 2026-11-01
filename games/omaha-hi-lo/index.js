import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {cardsChip} from '../art-kit.js';
import {CHIP_FIELDS,POKER_EVENTS} from './poker-room.js';
export default turnGame(Room,{id:'omaha-hi-lo',name:'Omaha Hi/Lo',category:'karten',minPlayers:2,maxPlayers:9,players:'2–9 Spieler',duration:35,description:'Pot-Limit Omaha mit vier Handkarten: High und Low 8-or-better teilen jeden Pot.',art:cardsChip({kind:'diamond'},{kind:'bars'},'#7caea5'),createFields:CHIP_FIELDS,events:POKER_EVENTS});
