import {BOARD,PROPERTIES,group} from '../monopoly/room.js';
import {choosePlacement} from '../scrabble/bot.js';import {WORDS} from '../scrabble/words.js';
const SHORT_WORDS=WORDS.filter(w=>w.length<=3);
export function scrabble(o,level,c){const g=o.g,d={key:g.key,revision:g.revision};
  if(g.stage==='review')return c.action('review',[{...d,challenge:false}]);if(g.stage==='vote')return c.action('vote',[{...d,accept:true}]);
  choosePlacement(g,{words:level==='easy'?SHORT_WORDS:WORDS,check:c.check,onBest:move=>c.best(c.action('place',[{...d,placements:move.placements}]))});return c.result;
}
export function monopoly(o,level,c){const g=o.g,id=o.id,p=g.people[id],hard=level==='hard';
  const value=i=>{const f=BOARD[i],members=f.color?group(i):PROPERTIES.filter(x=>BOARD[x].type===f.type),mine=members.filter(x=>g.owned[x].owner===id).length;return f.price*(1+(hard?mine/members.length*.7:0)+(hard&&mine===members.length-1?1.3:0))-(g.owned[i].mortgage?f.price*.5:0);};
  const reserve=hard?140:300;
  if(g.debt)return c.action('onTimeout',[]);
  if(g.auction){const max=Math.min(p.money-reserve,value(g.auction.field)*(hard?1:.35));return g.auction.bid+10<=max?c.action('bid',[g.auction.bid+10]):c.action('passAuction',[]);}
  if(g.trade){const t=g.trade,v=side=>side.money+side.properties.reduce((s,i)=>s+value(i),0)+side.free*35,fee=t.give.properties.reduce((s,i)=>s+(g.owned[i].mortgage?Math.ceil(BOARD[i].price/20):0),0);return c.action('respondTrade',[hard&&v(t.give)>=v(t.take)+fee&&p.money+t.give.money-t.take.money>=fee]);}
  if(g.step==='buy')return c.action('buy',[p.money>=BOARD[p.position].price+(hard?70:reserve)&&(hard||c.rng()<.4)]);
  if(g.step==='jail'){if(p.freeCount)return c.action('leaveJail',['card']);if(hard&&p.money>350)return c.action('leaveJail',['pay']);return c.action('throwDice',[]);}
  if(hard){
    const build=g.possible.filter(a=>a.build&&p.money>BOARD[a.field].build+reserve).sort((a,b)=>BOARD[b.field].rents[g.owned[b.field].level+1]/BOARD[b.field].build-BOARD[a.field].rents[g.owned[a.field].level+1]/BOARD[a.field].build)[0];if(build)return c.action('manage',[build.field,'build']);
    const redeem=g.possible.find(a=>a.unmortgage&&p.money>BOARD[a.field].price*.55+reserve);if(redeem)return c.action('manage',[redeem.field,'unmortgage']);
    if(!g.traded){const wanted=PROPERTIES.find(i=>BOARD[i].color&&g.owned[i].owner&&g.owned[i].owner!==id&&!g.owned[i].mortgage&&group(i).filter(x=>g.owned[x].owner===id).length===group(i).length-1&&!group(i).some(x=>g.owned[x].level)&&p.money>BOARD[i].price*2.4+reserve);if(wanted!==undefined)return c.action('proposeTrade',[g.owned[wanted].owner,{money:Math.floor(BOARD[wanted].price*2.4)},{properties:[wanted]}]);}
  }
  return c.action(g.step==='roll'?'throwDice':'endTurn',[]);
}
