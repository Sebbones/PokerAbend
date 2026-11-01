import {Table} from '../poker/engine/table.js';
import {newDeck,shuffle,eval5,bestHand,combinations,compareScores,describe} from '../poker/engine/cards.js';
export const shortDeck=()=>newDeck().filter(c=>'6789TJQKA'.includes(c[0]));
export function shortEval5(cards,tripsBeatStraight=true){
  let normal=eval5(cards);
  if(new Set(cards.map(c=>c[0])).size===5&&cards.every(c=>'A6789'.includes(c[0]))){const flush=cards.every(c=>c[1]===cards[0][1]);normal=[flush?8:4,9];}
  const [cat,...tie]=normal;
  const mapped=cat===5?6:cat===6?5:tripsBeatStraight&&cat===3?4:tripsBeatStraight&&cat===4?3:cat;
  return {score:[mapped,...tie],name:describe(normal),category:mapped,cards:[...cards]};
}
export function shortBest(cards,tripsBeatStraight=true){if(cards.length<5)return bestHand(cards);let best=null;for(const combo of combinations(cards,5)){const e=shortEval5(combo,tripsBeatStraight);if(!best||compareScores(e.score,best.score)>0)best=e;}return best;}
export class ShortDeckTable extends Table {
  constructor({mode='ante',ante=10,tripsBeatStraight=true,...options}={}){super(options);this.mode=mode;this.ante=ante;this.tripsBeatStraight=tripsBeatStraight;this.burned=[];}
  createDeck(){return shuffle(shortDeck(),this.rng);}
  startHand(){this.burned=[];return super.startHand();}
  postForcedBets(sb,bb){this.postAntes(this.ante);if(this.mode==='ante-blinds')super.postForcedBets(sb,bb);else{this.hand.currentBet=0;this.hand.raises=0;this.hand.lastAggressor=-1;}}
  firstToAct(sb,bb){return this.mode==='ante'?this.nextActor(this.hand.button):super.firstToAct(sb,bb);}
  evaluate(hole,board){return shortBest([...hole,...board],this.tripsBeatStraight);}
  burnCard(){const card=super.burnCard();this.burned.push(card);return card;}
}
