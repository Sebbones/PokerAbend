import {botLevels} from '../games/bot-levels.js';

// Only a seat's own cards and explicit public fields cross the worker boundary.
// Never serialize Room, decks, other racks/hands, identities, tokens or roles.
export function botObservation(room,id){
  if(botLevels(room.game,room.variant,room.settings).length===1)return null;
  const out={game:room.game,id,variant:room.variant||'classic',foe:room.order?.find(p=>p!==id)||null,epoch:{round:room.roundNo,move:room.moveNo,hand:room.table?.handNo}};
  if(room.table){const t=room.table,h=t.hand,seat=room.players.get(id).seat;out.g={own:[...h.players[seat].cards],board:[...h.board],legal:t.legal(seat),pot:h.seats.reduce((n,i)=>n+h.players[i].total,0),opponents:h.seats.filter(i=>i!==seat&&!h.players[i].folded).length};return structuredClone(out);}
  const g=room.gameView(id);
  if(room.game==='viergewinnt')out.g={board:[...g.board]};
  else if(room.game==='reversi')out.g={board:[...g.board],legal:[...g.legal]};
  else if(room.game==='backgammon')out.g=g;
  else if(room.game==='farbenchaos')out.g={...g,others:room.order.filter(p=>p!==id).map(p=>({id:p,cards:room.publicPlayer(room.players.get(p)).cards}))};
  else if(room.game==='hearts'||room.game==='sechs-nimmt')out.g=g;
  else if(room.game==='kniffel')out.g={dice:g.dice,rolls:g.rolls,sheet:{...g.sheets[id]},options:g.options,joker:!!room.settings.joker};
  else if(room.game==='scrabble')out.g=g;
  else if(room.game==='schach')out.g={key:g.key,revision:g.revision,position:g.position,legal:g.legal};
  else if(room.game==='exploding-deck')out.g={key:g.key,revision:g.revision,stage:g.stage,actor:g.actor,alive:g.alive,turnsLeft:g.turnsLeft,underAttack:g.underAttack,deckCount:g.deckCount,hand:g.hand,future:g.future,people:g.people,pending:g.pending,canInsert:g.canInsert,canGive:g.canGive};
  else if(room.game==='luegenbaron')out.g={key:g.key,q:g.q,stage:g.stage,questionId:g.questionId,type:g.type,prompt:g.prompt,promptEn:g.promptEn,mine:g.mine,options:g.options};
  else if(room.game==='monopoly')out.g={people:Object.fromEntries(Object.entries(g.people).map(([p,q])=>[p,{money:q.money,position:q.position,jail:q.jail,out:q.out,freeCount:q.free.length}])),owned:g.owned,possible:g.possible,step:g.step,debt:g.debt,auction:g.auction,trade:g.trade,turnNo:g.turnNo,traded:room.traded[id]===g.turnNo};
  else return null;
  return structuredClone(out);
}
const METHODS={luegenbaron:['answer','vote'],'exploding-deck':['playCard','drawCard','insertBomb','giveCard','nope','passReaction'],schach:['move'],monopoly:['onTimeout','bid','passAuction','respondTrade','buy','leaveJail','throwDice','manage','proposeTrade','endTurn'],scrabble:['pass','place','review','vote'],kniffel:['throwDice','score'],viergewinnt:['drop'],reversi:['place'],backgammon:['throwDice','confirmTurn','move','answerDouble'],poker:['act'],omaha:['act'],farbenchaos:['play','draw','pass','lateCall','catchForgot'],hearts:['pass','play'],'sechs-nimmt':['choose','takeRow']};
export function applyBotAction(room,id,action){if(!action||!METHODS[room.game]?.includes(action.method)||!Array.isArray(action.args))throw Error('Ungültige Computeraktion');if(room.game==='monopoly'&&action.method==='proposeTrade')room.traded[id]=room.turnNo;return room[action.method](id,...action.args);}
