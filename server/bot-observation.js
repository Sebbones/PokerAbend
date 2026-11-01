import {botLevels} from '../games/bot-levels.js';

// Only a seat's own cards and explicit public fields cross the worker boundary.
// Never serialize Room, decks, other racks/hands, identities, tokens or roles.
export function botObservation(room,id){
  if(botLevels(room.game,room.variant,room.settings).length===1)return null;
  const out={game:room.game,id,variant:room.variant||'classic',foe:room.order?.find(p=>p!==id)||null};
  const g=room.gameView(id);
  if(room.game==='viergewinnt')out.g={board:[...g.board]};
  else if(room.game==='reversi')out.g={board:[...g.board],legal:[...g.legal]};
  else if(room.game==='backgammon')out.g=g;
  else return null;
  return structuredClone(out);
}
const METHODS={viergewinnt:['drop'],reversi:['place'],backgammon:['throwDice','confirmTurn','move','answerDouble']};
export function applyBotAction(room,id,action){if(!action||!METHODS[room.game]?.includes(action.method)||!Array.isArray(action.args))throw Error('Ungültige Computeraktion');return room[action.method](id,...action.args);}
