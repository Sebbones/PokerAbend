import {BOTS} from '../games/bots.js';
import {effectiveBotLevel,WORKER_MEDIUM_GAMES} from '../games/bot-levels.js';
import {chooseBotAction} from '../games/bot-strategies/index.js';
import {botObservation,applyBotAction} from './bot-observation.js';
// Same policy as the worker runner, synchronously callable by deterministic
// simulations. Production runs Easy/Hard in bounded workers, never this helper.
export function stepBot(room,id,options={}){
  const level=effectiveBotLevel(room,room.players.get(id)),rng=options.rng||Math.random;
  if(level==='medium'&&!WORKER_MEDIUM_GAMES.includes(room.game))return BOTS[room.game](room,id,rng);
  const result=chooseBotAction(botObservation(room,id),level,{...options,rng});
  return applyBotAction(room,id,result.action);
}
