// Test-only player automation. Real server, real rules, real clocks/RNG and
// existing bot strategies. No state injection, forced winner or platform patch.
import { nextBot } from '../server/bots.js';
import { stepBot } from '../server/bot-play.js';
import { BOTS } from '../games/bots.js';
const { http, rooms } = await import('../server/index.js');
const enabled = new Map(), reports = new Map();
const done = (r) => r.table ? !!r.table.hand?.done : r.phase === 'over'
  || (['hearts','skat','doppelkopf'].includes(r.game) && r.stage === 'deal-over')
  || (r.game === 'backgammon' && r.stage === 'between');

function actor(r) {
  if (r.table) return r.table.seats[r.table.hand?.toAct]?.id || null;
  if (r.game === 'schiffe' && r.step === 'place') return r.order.find((id) => !r.ready.has(id));
  if (r.game === 'blackjack' && ['bet','insure'].includes(r.step)) return r.order.find((id) => !r.decided.has(id));
  if (r.game === 'sechs-nimmt' && r.stage === 'pick') return r.order.find((id) => r.chosen[id] === undefined);
  if (r.game === 'hearts' && r.stage === 'pass') return r.order.find((id) => !r.passes[id]);
  if (r.game === 'schatzinsel' && r.stage === 'hide') return r.order.find((id) => !r.hidden[id]);
  if (r.game === 'staedtehandel') {
    if (r.s?.stage === 'discard') return Object.keys(r.s.discard)[0];
    if (r.s?.stage === 'main' && r.s.offer) return Object.entries(r.s.offer.res).find(([,v]) => v === null)?.[0] || r.s.offer.from;
    return r.s?.cur;
  }
  if (r.game === 'werwolf') {
    if (r.stage === 'night') {
      if (r.step === 'amor') return r.living('amor').find(() => !r.amorPick);
      if (r.step === 'wolves') return r.wolves().find(id => r.wolfVotes[id] === undefined);
      if (r.step === 'seer') return r.living('seher').find(id => !r.seen.some(x => x.day === r.day && x.by === id));
      if (r.step === 'witch') return r.living('hexe').find(() => !r.witchDone);
    }
    if (r.stage === 'vote') return [...r.alive].find(id => !(id in r.votes));
    if (r.stage === 'hunter') return r.hunter;
  }
  if (r.game === 'scrabble' && r.pending) return r.order.find((id) => id !== r.pending.id && (r.stage === 'review' ? !r.pending.approvals.includes(id) : !Object.hasOwn(r.pending.votes, id)));
  const due = nextBot(r);
  if (due) return due;
  const waiting = r.waiting?.(r.stage);
  if (Array.isArray(waiting) && waiting.length && r.stage !== 'reveal') return waiting.find((id) => r.order.includes(id));
  return r.currentId;
}
setInterval(() => {
  for (const [code, active] of enabled) {
    const r = rooms.get(code), report = reports.get(code);
    if (!active || !r || r.gamePaused || done(r) || (!r.table && r.phase !== 'playing') || !BOTS[r.game]) continue;
    try {
      const id = actor(r);
      if (id) { stepBot(r, id); report.moves++; }
      else if (r.stage === 'reveal' && typeof r.advance === 'function' && Array.isArray(r.flow)) { r.next(r.hostId); report.advances++; }
      else if (r.runId && typeof r.botStep === 'function' && report.ticks++ % 5 === 0) {
        // Native real-time bots run in the referee's own loop. Drive the human
        // seat with the identical legal input policy, without advancing time.
        for (const person of r.players.values()) if (!person.bot && r.order.includes(person.id)) r.botStep(person.id);
      }
      r.afterChange?.();
      if (id || r.stage === 'reveal' || report.ticks % 5 === 0) r.onChange('state');
    } catch (e) {
      report.errors.push({ message: e.message, stack: e.stack, stage: r.stage || r.step || r.s?.stage, actor: r.currentId ? 'turn' : 'simultaneous' });
      enabled.set(code, false);
      r.onChange('state');
    }
  }
}, 40).unref();
process.on('message', ({ request, code, drive }) => {
  if (typeof drive === 'boolean') {
    if (!reports.has(code)) reports.set(code, { moves: 0, advances: 0, ticks: 0, errors: [] });
    enabled.set(code, drive);
  }
  const r = rooms.get(code);
  process.send?.({ request, report: reports.get(code), phase: r?.phase, done: r && done(r) });
});
const ready = () => process.send?.({ ready: true, port: http.address().port });
if (http.listening) ready(); else http.once('listening', ready);
