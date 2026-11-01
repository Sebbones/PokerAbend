import {newDeck,score7,omahaScore} from '../poker/engine/cards.js';
import {pokerWagerDecision} from '../bots.js';
import {choosePass,chooseCard} from '../hearts/rules.js';
import {rowPoints} from '../sechs-nimmt/room.js';

export function poker(o,level,c){
  const g=o.g,L=g.legal,act=a=>c.action('act',[a]);
  // Recreational, loose play: calls too much, overbets occasionally, but checks for free.
  if(level==='easy')return act(L.canRaise&&c.rng()<.12?{type:'raise',amount:L.maxTo}:L.canCheck?{type:'check'}:{type:c.rng()<.9?'call':'fold'});
  const unseen=newDeck().filter(x=>!g.own.includes(x)&&!g.board.includes(x)),omaha=o.game==='omaha';
  const rank=(hole,board)=>omaha?omahaScore(hole,board):score7([...hole,...board]);let wins=0;
  const policy=(equity)=>{const a=pokerWagerDecision(L,g.pot,equity,c.rng);if(L.canRaise&&c.rng()<.025)return {type:'raise',amount:L.minTo};return a;};
  for(let n=1;n<=160;n++){
    c.check();const deck=[...unseen],draw=()=>deck.splice(Math.floor(c.rng()*deck.length),1)[0],board=[...g.board];while(board.length<5)board.push(draw());
    const mine=rank(g.own,board);let ties=1,lost=false;
    for(let i=0;i<g.opponents;i++){c.check();const other=rank(Array.from({length:omaha?4:2},draw),board);if(other>mine)lost=true;else if(other===mine)ties++;}
    if(!lost)wins+=1/ties;
    // Publish usable decisions early, then refine. No real deck or opponent hand is consulted.
    if(n===8||n%16===0)c.best(act(policy(wins/n)));
  }return c.result;
}

export function uno(o,level,c){
  const g=o.g;
  if(g.forgot)return c.action(g.forgot===o.id?'lateCall':'catchForgot',[]);
  if(!g.playable.length)return c.action(g.drawn?'pass':'draw',[]);
  const colors=['r','y','g','b'],count=color=>g.hand.filter(x=>x[1]===color).length;
  const target=[...g.others].sort((a,b)=>a.cards-b.cards)[0],danger=target?.cards<=2;
  const value=card=>count(card[1])*5+(/\d/.test(card[0])?Number(card[0]):20)+(danger&&'SRDF'.includes(card[0])?70:0)-(card[1]==='w'&&g.hand.length>2?90:0);
  const card=level==='easy'?c.pick(g.playable):[...g.playable].sort((a,b)=>value(b)-value(a))[0];
  const wish=level==='easy'?c.pick(colors):colors.sort((a,b)=>count(b)-count(a))[0];
  return c.action('play',[card,card[1]==='w'?wish:null,true,target?.id]);
}

export function hearts(o,level,c){const g=o.g;
  if(g.stage==='pass'){const hand=[...g.hand],cards=level==='hard'?choosePass(hand):Array.from({length:3},()=>hand.splice(Math.floor(c.rng()*hand.length),1)[0]);return c.action('pass',[cards,g.dealKey]);}
  return c.action('play',[level==='hard'?chooseCard(g):c.pick(g.legal),g.revision,g.dealKey]);
}

export function six(o,level,c){const g=o.g;
  if(g.stage==='row')return c.action('takeRow',[level==='easy'?c.pick(g.allowed):[...g.allowed].sort((a,b)=>rowPoints(g.rows[a])-rowPoints(g.rows[b]))[0]]);
  if(level==='easy')return c.action('choose',[c.pick(g.hand)]);
  const cost=card=>{const rows=g.rows.filter(r=>r.at(-1)<card).sort((a,b)=>b.at(-1)-a.at(-1));if(!rows.length)return Math.min(...g.rows.map(rowPoints))+2;const row=rows[0],gap=card-row.at(-1);return row.length===5?rowPoints(row)+3:(gap-1)*(row.length+1)/20;};
  return c.action('choose',[[...g.hand].sort((a,b)=>cost(a)-cost(b)||a-b)[0]]);
}
