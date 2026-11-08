// Ranked-Berechtigung (V2-03). Reine Funktion über Serverdaten: Bot-Flag und Konto am Spieler – nie Namen, nie Clientangaben.
// Gewertet wird nur, wenn alle Beteiligten registrierte Menschen sind (Discord verknüpft) und es mindestens zwei verschiedene Konten gibt.
// Rückgabe: '' = gewertet, sonst der Grund: 'bots' | 'gast' | 'zu-wenige'.
export const RANK_REASONS = ['bots', 'gast', 'zu-wenige', 'teilnehmer', 'aus'];

export function rankedReason(players, { isRegistered, resolve }) {
  const list = (players || []).filter(Boolean);
  if (list.some((p) => p.bot)) return 'bots';
  if (list.length < 2) return 'zu-wenige';
  if (list.some((p) => !p.accountId || !isRegistered(p.accountId))) return 'gast';
  if (new Set(list.map((p) => resolve(p.accountId))).size < 2) return 'zu-wenige';
  return '';
}

// Verbindet Räume (onChange 'roundStart' / 'roundAbort' / 'result') mit der Rundenablage der Bestenliste.
// Die Berechtigung wird beim Rundenstart eingefroren; jede eingefrorene Runde wird höchstens einmal verbucht.
// enabled: Feature-Flag „Ranked“ (V2-10). Aus = jede neue Runde zählt nicht (Grund 'aus'); bisherige Ergebnisse und die Namensstatistik bleiben unberührt.
export function createRanked({ accounts, leaderboard, lowWins = () => false, newId, enabled = () => true }) {
  const reasonOf = (room, ids) => !enabled() ? 'aus' : rankedReason((ids || []).map((id) => room.players.get(id)), { isRegistered: (id) => accounts.isRegistered(id), resolve: (id) => accounts.resolve(id) });
  return {
    freeze(room, ids) {
      const list = [...new Set((ids || []).filter((id) => room.players.has(id)))];
      room.rankedRound = { id: newId(), ids: list, reason: reasonOf(room, list), accounts: Object.fromEntries(list.map((id) => [id, room.players.get(id).accountId || null])) };
    },
    abort(room) { room.rankedRound = null; },
    // Anzeige für die Spieler: laufende Runde = eingefroren, sonst Vorschau auf die aktuell Sitzenden
    state(room) {
      const seated = Array.isArray(room.seats) ? room.seats : [...room.players.values()].filter((p) => p.seat !== null && p.seat !== undefined && !p.kicked).map((p) => p.id);
      const reason = room.rankedRound ? room.rankedRound.reason : reasonOf(room, seated);
      return { ranked: !reason, reason, frozen: !!room.rankedRound };
    },
    record(room, data) {
      const frozen = room.rankedRound; room.rankedRound = null;
      if (!frozen || !Array.isArray(data?.entries)) return false;
      const byName = new Map([...room.players.values()].map((p) => [p.name, p]));
      let reason = frozen.reason;
      const players = data.entries.map((e, i) => {
        const p = (data.ids?.[i] && room.players.get(data.ids[i])) || byName.get(e.name);
        if (!p || !frozen.ids.includes(p.id)) reason ||= 'teilnehmer';
        return { accountId: (p && frozen.accounts[p.id]) || null, name: e.name, bot: !!p?.bot, win: e.win, points: e.points };
      });
      const p = room.partyProgram;
      const program = p && ['running','between','done'].includes(p.status) && p.results?.some(r=>r.index===p.index && r.game===room.game) ? { id:p.id, mode:p.config.mode, index:p.index, total:p.plan.length } : null;
      return leaderboard.recordRound({ id: frozen.id, game: room.game, variant: room.variant || 'classic', ranked: !reason, reason, players, lowWins: !!lowWins(room), program });
    },
  };
}
