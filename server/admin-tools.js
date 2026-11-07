// Moderation für /admin (V2-17): Rückblicke, Bestenlisten, Ergebnisse, Spieler und Tickets.
// Alles läuft über Game-IDs bzw. öffentliche Daten; interne Konto-IDs verlassen den Server nie.
// Die Funktionen werfen Fehler mit status, admin.js protokolliert jede Änderung.
import { GAME_ID } from './account-store.js';

const fail = (status, message) => Object.assign(new Error(message), { status });

export function createAdminTools({ reviews, leaderboard, accounts, mergeAccounts, changed = () => {} }) {
  const gameIdOf = (owner) => (owner ? accounts.get(owner)?.gameId || '' : '');
  const needReviews = () => { if (!reviews) throw fail(503, 'Das Rückblick-Archiv ist nicht lesbar'); return reviews; };
  const periods = ['week', 'month', 'all'];
  return {
    reviews: {
      list: () => ({ items: needReviews().adminList({ limit: 200 }) }),
      get: (id) => needReviews().adminGet(id),
      hide(id, hidden) {
        if (typeof hidden !== 'boolean') throw fail(400, 'Bitte ausblenden oder einblenden angeben');
        const info = needReviews().setHidden(id, hidden);
        if (!info) throw fail(404, 'Diesen Rückblick gibt es nicht');
        return info;
      },
    },
    leaderboard(game = 'all', period = 'all') {
      if (typeof game !== 'string' || game.length > 40 || !periods.includes(period)) throw fail(400, 'Ungültige Auswahl');
      const rows = leaderboard.rankedTable(game, period, false, { withOwner: true }).slice(0, 100).map(({ owner, ...row }) => ({ ...row, name: accounts.get(owner)?.name || row.name, gameId: gameIdOf(owner) }));
      return { game, period, rows, summary: leaderboard.rankedSummary(game, period) };
    },
    rounds: {
      list({ game = 'all', hidden = false, limit = 50 } = {}) {
        if (typeof game !== 'string' || game.length > 40) throw fail(400, 'Ungültiges Spiel');
        return { items: leaderboard.adminRounds({ game, hiddenOnly: hidden === true, limit }).map((r) => ({ ...r, players: r.players.map(({ account, ...p }) => ({ ...p, gameId: gameIdOf(account) })) })) };
      },
      hide(id, hidden) {
        if (typeof hidden !== 'boolean') throw fail(400, 'Bitte ausblenden oder einblenden angeben');
        const info = leaderboard.setRoundHidden(id, hidden);
        if (!info) throw fail(404, 'Diese Runde gibt es nicht');
        changed();
        return info;
      },
    },
    players: {
      search: (q) => ({ items: accounts.search(typeof q === 'string' ? q.slice(0, 40) : '') }),
      // Wie beim Geräte-Verbinden: alles von „from“ gehört danach „to“. Das Konto „from“ zeigt auf „to“ (Eintrag bleibt im Konto-Protokoll).
      merge(fromGameId, toGameId) {
        if (typeof fromGameId !== 'string' || typeof toGameId !== 'string' || !GAME_ID.test(fromGameId) || !GAME_ID.test(toGameId)) throw fail(400, 'Bitte zwei gültige Game-IDs angeben');
        if (fromGameId === toGameId) throw fail(400, 'Das ist dieselbe Person');
        const from = accounts.byGameId(fromGameId), to = accounts.byGameId(toGameId);
        if (!from || !to) throw fail(404, 'Eine der beiden Game-IDs gibt es nicht');
        accounts.merge(from.id, to.id);
        leaderboard.merge(from.id, to.id, to.name);
        mergeAccounts(from.id, to.id, { fromGameId, toGameId });
        accounts.audit('Spieler per Admin zusammengeführt', `${fromGameId} → ${toGameId}`);
        changed();
        return { from: fromGameId, to: toGameId, name: to.name };
      },
    },
  };
}
