import {botLevels} from '../games/bot-levels.js';

// Only a seat's own cards and explicit public fields cross the worker boundary.
// Never serialize Room, decks, other racks/hands, identities, tokens or roles.
export function botObservation(room,id){
  if(botLevels(room.game,room.variant,room.settings).length===1)return null;
  const out={game:room.game,id,variant:room.variant||'classic',foe:room.order?.find(p=>p!==id)||null};
  if(room.table){const t=room.table,h=t.hand,seat=room.players.get(id).seat;out.g={own:[...h.players[seat].cards],board:[...h.board],legal:t.legal(seat),pot:h.seats.reduce((n,i)=>n+h.players[i].total,0),opponents:h.seats.filter(i=>i!==seat&&!h.players[i].folded).length};return structuredClone(out);}
  const g=room.gameView(id);
  if(room.game==='viergewinnt')out.g={board:[...g.board]};
  else if(room.game==='reversi')out.g={board:[...g.board],legal:[...g.legal]};
  else if(room.game==='backgammon')out.g=g;
  else if(room.game==='farbenchaos')out.g={...g,others:room.order.filter(p=>p!==id).map(p=>({id:p,cards:room.publicPlayer(room.players.get(p)).cards}))};
  else if(room.game==='hearts'||room.game==='sechs-nimmt')out.g=g;
  else return null;
  return structuredClone(out);
}
const METHODS={viergewinnt:['drop'],reversi:['place'],backgammon:['throwDice','confirmTurn','move','answerDouble'],poker:['act'],omaha:['act'],farbenchaos:['play','draw','pass','lateCall','catchForgot'],hearts:['pass','play'],'sechs-nimmt':['choose','takeRow']};
export function applyBotAction(room,id,action){if(!action||!METHODS[room.game]?.includes(action.method)||!Array.isArray(action.args))throw Error('Ungültige Computeraktion');return room[action.method](id,...action.args);}
