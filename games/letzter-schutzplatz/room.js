import {PartyArenaRoom} from '../party-arena-room.js';
export class Room extends PartyArenaRoom {static KIND='shelter';static OPTIONS=[...PartyArenaRoom.OPTIONS,{key:'warningSecs',label:'Frist pro Gefahrenphase in Sekunden',type:'number',min:3,max:15}];}
