import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {partyEvents} from '../party-room.js';
import {numberLine} from '../art-kit.js';
export default turnGame(Room,{
  id:'zahlenreihe',name:'Zahlenreihe',category:'party',minPlayers:2,maxPlayers:10,duration:10,players:'2–10 Spieler',
  description:'Erkennt die Regel und ergänzt die fehlenden Zahlen. Richtige Antworten zählen; die schnellste erhält einen Bonus.',
  art:numberLine(),createFields:[],
  events:{next:partyEvents.next,guess:(room,p,{text,question,round,roundKey})=>room.guess(p.id,text,question,round,roundKey)},
});
