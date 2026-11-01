import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {glyph} from '../art-kit.js';
import {BACKGAMMON_RULES} from './rule-summary.js';
export default turnGame(Room,{id:'backgammon',name:'Backgammon',rules:BACKGAMMON_RULES,category:'brett',minPlayers:2,maxPlayers:2,players:'2 Spieler',duration:25,description:'Steine über ein Holzbrett ins Heimfeld führen: Bar, Pasch, Gammon und Matches mit Verdopplungswürfel.',art:glyph('dice'),createFields:[],events:{roll:(r,p,d)=>r.throwDice(p.id,d.revision,d.roundKey),move:(r,p,d)=>r.move(p.id,d.from,d.to,d.die,d.revision,d.roundKey),undo:(r,p,d)=>r.undo(p.id,d.revision,d.roundKey),confirm:(r,p,d)=>r.confirmTurn(p.id,d.revision,d.roundKey),double:(r,p,d)=>r.offerDouble(p.id,d.revision,d.roundKey),cubeAnswer:(r,p,d)=>r.answerDouble(p.id,d.accept,d.revision,d.roundKey),nextGame:(r,p)=>r.nextGame(p.id)}});
