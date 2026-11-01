import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {cardsChip} from '../art-kit.js';
import {POKER_EVENTS} from '../omaha-hi-lo/poker-room.js';
export default turnGame(Room,{id:'seven-card-stud',name:'Seven Card Stud',category:'karten',minPlayers:2,maxPlayers:7,players:'2–7 Spieler',duration:35,description:'Limit-Poker: Ante, Bring-in, offene Karten und eine verdeckte siebte Karte bis zum Showdown.',art:cardsChip({kind:'bars'},{kind:'dot'},'#937254'),createFields:[{key:'startStack',label:'Startchips',type:'number',min:100,step:100,value:10000},{key:'smallBet',label:'Kleine Wette',type:'number',min:2,value:10},{key:'bigBet',label:'Große Wette',type:'number',min:4,value:20}],events:POKER_EVENTS});
