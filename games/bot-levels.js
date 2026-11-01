// Public capability metadata, independent of accounts, names or strategy internals.
export const BOT_LEVELS=Object.freeze(['easy','medium','hard']);
export const BOT_PILOTS=Object.freeze(['viergewinnt','reversi','backgammon']);
export function botLevels(game,variant='classic',settings={}){
  const classic=!variant||variant==='classic';
  const supported=BOT_PILOTS.includes(game)&&(game==='poker'||game==='omaha'||classic)&&(game!=='monopoly'||!settings.board||settings.board==='default');
  return supported?[...BOT_LEVELS]:['medium'];
}
export const savedBotLevel=p=>BOT_LEVELS.includes(p?.botDifficulty)?p.botDifficulty:'medium';
export const effectiveBotLevel=(room,p)=>botLevels(room.game,room.variant,room.settings).includes(savedBotLevel(p))?savedBotLevel(p):'medium';
export const botMetadata=(room,p)=>({id:p.id,name:p.name,difficulty:effectiveBotLevel(room,p)});
