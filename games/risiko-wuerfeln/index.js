import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {dice} from '../art-kit.js';
export default turnGame(Room,{
  id:'risiko-wuerfeln',name:'Risiko-Würfeln',category:'wuerfel',minPlayers:2,maxPlayers:8,duration:10,players:'2–8 Spieler',
  description:'Würfle weiter oder sichere deine Punkte. Eine Eins kostet den Zuggewinn; wer zuerst das Ziel erreicht, gewinnt.',
  art:dice([{x:9,y:18,n:1},{x:25,y:28,n:3},{x:37,y:13,n:5}]),createFields:[],
  events:{roll:(room,p)=>room.throwDice(p.id),bank:(room,p)=>room.bank(p.id)},
});
