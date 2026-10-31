import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {glyph} from '../art-kit.js';
export default turnGame(Room,{
  id:'story-chaos',name:'Story-Chaos',category:'party',minPlayers:3,maxPlayers:12,duration:10,players:'3–12 Spieler',
  description:'Schreibt reihum eine gemeinsame Geschichte. Jeder sieht nur den letzten Satz; erst am Ende wird alles vorgelesen.',
  art:glyph('story'),createFields:[],
  events:{sentence:(room,p,{text,step,round,roundKey})=>room.write(p.id,text,step,round,roundKey)},
});
