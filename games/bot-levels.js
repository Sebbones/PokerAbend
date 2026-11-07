// Public capability metadata, independent of accounts, names or strategy internals.
export const BOT_LEVELS=Object.freeze(['easy','medium','hard']);
export const BOT_PILOTS=Object.freeze(['viergewinnt','reversi','backgammon','poker','omaha','farbenchaos','hearts','sechs-nimmt','kniffel','monopoly','scrabble']);
// New game registration, separate from the historical V2-16 pilot evidence.
export const WORKER_MEDIUM_GAMES=Object.freeze(['schach','exploding-deck','luegenbaron','skat','doppelkopf','stichmeister','labyrinth-brett','schatzinsel','gebietskampf']);
export function botLevels(game,variant='classic',settings={}){
  const classic=!variant||variant==='classic';
  const supported=BOT_PILOTS.includes(game)&&(game==='poker'||game==='omaha'||classic)&&(game!=='monopoly'||!settings.board||settings.board==='default');
  return supported||game==='schach'&&(classic||variant==='chess960')||['exploding-deck','luegenbaron','skat','doppelkopf','stichmeister','labyrinth-brett','schatzinsel','gebietskampf'].includes(game)?[...BOT_LEVELS]:['medium'];
}
export const savedBotLevel=p=>BOT_LEVELS.includes(p?.botDifficulty)?p.botDifficulty:'medium';
export const effectiveBotLevel=(room,p)=>botLevels(room.game,room.variant,room.settings).includes(savedBotLevel(p))?savedBotLevel(p):'medium';
export const botMetadata=(room,p)=>({id:p.id,name:p.name,difficulty:effectiveBotLevel(room,p)});
