import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {cardsChip} from '../art-kit.js';
import {CHIP_FIELDS,POKER_EVENTS} from '../omaha-hi-lo/poker-room.js';
export default turnGame(Room,{id:'short-deck',name:'Short Deck Poker',category:'karten',minPlayers:2,maxPlayers:9,players:'2–9 Spieler',duration:25,description:'36 Karten von 6 bis Ass. Flush schlägt Full House; Drilling vor Straße ist umschaltbar.',art:cardsChip({kind:'diamond'},{kind:'heart'},'#b8494b'),createFields:CHIP_FIELDS,events:POKER_EVENTS});
