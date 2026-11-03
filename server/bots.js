import { BOTS } from '../games/bots.js';
import {BOT_LEVELS,botLevels,effectiveBotLevel,WORKER_MEDIUM_GAMES} from '../games/bot-levels.js';
import {botObservation,applyBotAction} from './bot-observation.js';
import {createDecisionService} from './bot-decisions.js';

function validateLevel(room,difficulty){
  if(typeof difficulty!=='string'||!BOT_LEVELS.includes(difficulty))throw new Error('Ungültige Bot-Stufe');
  if(!botLevels(room.game,room.variant,room.settings).includes(difficulty))throw new Error('Nur eine Stufe verfügbar');
}
export function setBotDifficulty(room,hostId,id,difficulty){
  room.requireHost(hostId);
  if(room.busy)throw new Error('Bot-Stufen lassen sich nur zwischen zwei Runden ändern');
  const p=room.players.get(id);if(!p?.bot||p.kicked)throw new Error('Bot nicht gefunden');
  validateLevel(room,difficulty);p.botDifficulty=difficulty;
}
export function addBot(room, hostId, difficulty='medium') {
  room.requireHost(hostId);
  if (room.busy) throw new Error('Bots kommen nur zwischen zwei Runden dazu');
  if (!BOTS[room.game]) throw new Error('Für dieses Spiel gibt es noch keinen Bot');
  validateLevel(room,difficulty);
  const seats = room.table ? room.table.seats : room.seats;
  const max = room.table ? room.settings.maxPlayers : room.opts.maxPlayers;
  if (seats.filter(Boolean).length >= max) throw new Error('Der Tisch ist voll');
  let n = 1;
  while ([...room.players.values()].some((p) => p.name.toLowerCase() === `bot ${n}`)) n++;
  const p = room.addPlayer(`Bot ${n}`, '🦉', { bot: true });
  p.bot = true;
  p.botDifficulty = difficulty;
  p.connected = true;
  try {
    if (room.table) room.sit(p.id, seats.findIndex((s) => !s));
    else room.sit(p.id);
  } catch (error) {
    room.players.delete(p.id);
    throw error;
  }
  return p;
}

export function removeBot(room, hostId, id) {
  room.requireHost(hostId);
  if (room.busy) throw new Error('Bots lassen sich zwischen zwei Runden entfernen');
  if (!room.players.get(id)?.bot) throw new Error('Bot nicht gefunden');
  room.remove(id);
}

// Auch gleichzeitige Vorbereitungen erledigen: Flotte setzen, Einsatz und Versicherung.
export function nextBot(room) {
  if (room.gamePaused) return null;
  const isBot = (id) => room.players.get(id)?.bot && !room.players.get(id)?.kicked;
  if (room.table) {
    const h = room.table.hand;
    if (!h || h.done || room.frozen) return null;
    const id = room.table.seats[h.toAct]?.id;
    return isBot(id) ? id : null;
  }
  if (room.phase !== 'playing') return null;
  if (room.botDue) return room.botDue(); // Partyspiele: alle gleichzeitig, jeder Bot gibt seine Antwort ab
  if (room.game === 'schiffe' && room.step === 'place') return room.order.find((id) => isBot(id) && !room.ready.has(id)) || null;
  if (room.game === 'blackjack' && ['bet', 'insure'].includes(room.step)) return room.order.find((id) => isBot(id) && !room.decided.has(id)) || null;
  return isBot(room.currentId) ? room.currentId : null;
}

// Poker: ein Bot ohne Chips kauft zwischen zwei Händen nach, solange der Tisch das erlaubt (sonst bleibt er pleite sitzen)
export function brokeBot(room) {
  if (room.gamePaused) return null;
  if (!room.table || (room.table.hand && !room.table.hand.done)) return null;
  const r = room.settings.rebuy;
  if (r === 'off') return null;
  const s = room.table.seats.find((x) => x && x.stack === 0 && room.players.get(x.id)?.bot
    && (r === 'unlimited' || room.players.get(x.id).rebuys < Number(r)));
  return s ? s.id : null;
}

export function createBotRunner({ isCurrent, notify, delay = 800, decisions=createDecisionService() }) {
  const timers = new Map();
  const running = new Map();
  const failed = new WeakMap();
  const present = (room) => [...room.players.values()].some((p) => !p.bot && !p.kicked && p.connected);
  const stop = (room) => { clearTimeout(timers.get(room)); timers.delete(room); running.get(room)?.abort();running.delete(room); };
  // Ein fehlgeschlagener Zug sperrt nur genau diesen Spielstand, nicht die ganze Runde
  const stateKey = (room, id) => `${id}:${room.round}:${room.moveNo ?? ''}`;
  function sync(room) {
    if (!isCurrent(room) || !present(room) || !(nextBot(room) || brokeBot(room))) { stop(room); return; }
    if (timers.has(room) || running.has(room) || (nextBot(room) && failed.get(room) === stateKey(room, nextBot(room)))) return;
    const timer = setTimeout(async () => {
      timers.delete(room);
      if (!isCurrent(room) || !present(room)) return;
      const broke = brokeBot(room);
      if (broke) {
        try { room.rebuy(broke); } catch (error) { console.error('Bot-Nachkauf:', error.message); }
        notify(room);
        return;
      }
      const id = nextBot(room);
      if (!id) return;
      const controller=new AbortController();running.set(room,controller);
      try {
        const level=effectiveBotLevel(room,room.players.get(id));
        if(level==='medium'&&!WORKER_MEDIUM_GAMES.includes(room.game))BOTS[room.game](room, id, Math.random);
        else{
          const observation=botObservation(room,id),fingerprint=JSON.stringify(observation);
          const action=await decisions.decide(observation,level,{signal:controller.signal});
          if(running.get(room)!==controller||!isCurrent(room)||!present(room)||room.gamePaused||nextBot(room)!==id||JSON.stringify(botObservation(room,id))!==fingerprint)return;
          applyBotAction(room,id,action);
        }
        room.afterChange();
      } catch (error) {
        console.error(`Bot ${room.game}:`, error.message);
        // Ersatz: derselbe Zug wie bei abgelaufener Zeit
        try {
          if (!room.onTimeout) throw error;
          room.onTimeout(id);
          room.afterChange();
        } catch {
          failed.set(room, stateKey(room, id));
          room.say('Computerzug fehlgeschlagen. Der Host kann den Bot entfernen.', 'warn');
        }
      }finally{if(running.get(room)===controller){running.delete(room);queueMicrotask(()=>sync(room));}}
      notify(room);
      sync(room);
    }, delay);
    timers.set(room, timer);
    timer.unref?.();
  }
  return { sync, stop, close(){for(const room of new Set([...timers.keys(),...running.keys()]))stop(room);decisions.close();} };
}
