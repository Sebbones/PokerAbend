import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {glyph} from '../art-kit.js';
export default turnGame(Room,{id:'scrabble',name:'Scrabble',category:'brett',minPlayers:2,maxPlayers:4,players:'2–4 Spieler',duration:60,description:'Wörter auf Holzsteinen: 15×15 Felder, deutsche Buchstaben und gemeinsame Wortprüfung.',art:glyph('letters','#997047'),createFields:[],events:{scrabblePreview:(r,p,d)=>r.preview(p.id,d),scrabblePlace:(r,p,d)=>r.place(p.id,d),scrabblePass:(r,p,d)=>r.pass(p.id,d),scrabbleExchange:(r,p,d)=>r.exchange(p.id,d),scrabbleReview:(r,p,d)=>r.review(p.id,d),scrabbleVote:(r,p,d)=>r.vote(p.id,d)}});
