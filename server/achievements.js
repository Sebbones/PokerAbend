// Erfolge folgen derselben Namenszuordnung und denselben bestätigten Ergebnissen wie die Bestenliste.
import { cleanName } from './security.js';

const badge = (id, title, description, group, metric, target, icon, tier = 'bronze') => ({ id, title, description, group, metric, target, icon, tier });
export const ACHIEVEMENTS = [
  badge('debüt', 'Mit dabei', 'Spiele deine erste gewertete Partie.', 'mitspielen', 'played', 1, 'play'),
  badge('stammgast', 'Stammgast', 'Spiele 10 gewertete Partien.', 'mitspielen', 'played', 10, 'play', 'silver'),
  badge('dauerbrenner', 'Dauerbrenner', 'Spiele 50 gewertete Partien.', 'mitspielen', 'played', 50, 'play', 'gold'),
  badge('veteran', 'Veteran', 'Spiele 100 gewertete Partien.', 'mitspielen', 'played', 100, 'play', 'gold'),
  badge('wiederkehrer', 'Immer wieder dabei', 'Spiele in drei verschiedenen Kalendermonaten.', 'mitspielen', 'activeMonths', 3, 'calendar', 'silver'),
  badge('erster-sieg', 'Erster Sieg', 'Gewinne deine erste gewertete Partie.', 'gewinnen', 'wins', 1, 'trophy'),
  badge('zehn-siege', 'Auf Erfolgskurs', 'Gewinne 10 gewertete Partien.', 'gewinnen', 'wins', 10, 'trophy', 'silver'),
  badge('siegessammler', 'Siegessammler', 'Gewinne 50 gewertete Partien.', 'gewinnen', 'wins', 50, 'trophy', 'gold'),
  badge('vielseitiger-sieger', 'Vielseitiger Sieger', 'Gewinne in fünf verschiedenen Spielen.', 'gewinnen', 'winningGames', 5, 'trophy', 'gold'),
  badge('karten-sieg', 'Gutes Blatt', 'Gewinne ein Kartenspiel.', 'gewinnen', 'kartenWins', 1, 'cards'),
  badge('wuerfel-sieg', 'Würfelglück', 'Gewinne ein Würfelspiel.', 'gewinnen', 'wuerfelWins', 1, 'dice'),
  badge('brett-sieg', 'Am Zug', 'Gewinne ein Brettspiel.', 'gewinnen', 'brettWins', 1, 'board'),
  badge('party-sieg', 'Party-Star', 'Gewinne ein Partyspiel.', 'gewinnen', 'partyWins', 1, 'party'),
  badge('neugierig', 'Neugierig', 'Probiere fünf verschiedene Spiele aus.', 'entdecken', 'distinctGames', 5, 'compass'),
  badge('entdecker', 'Entdecker', 'Probiere 10 verschiedene Spiele aus.', 'entdecken', 'distinctGames', 10, 'compass', 'silver'),
  badge('spielekenner', 'Spielekenner', 'Probiere 25 verschiedene Spiele aus.', 'entdecken', 'distinctGames', 25, 'compass', 'gold'),
  badge('allrounder', 'Allrounder', 'Spiele in allen vier Kategorien: Karten, Würfel, Brett und Party.', 'entdecken', 'categories', 4, 'compass', 'gold'),
];
const count = (v) => Number.isSafeInteger(v) && v > 0 ? v : 0;
export function achievementProgress(profile, games) {
  const catalog = new Map(games.map((g) => [g.id, g])), categories = new Set(), months = new Set();
  const stats = { played: 0, wins: 0, distinctGames: 0, winningGames: 0, categories: 0, activeMonths: 0, kartenWins: 0, wuerfelWins: 0, brettWins: 0, partyWins: 0 };
  for (const g of profile.games) {
    const game = catalog.get(g.id), played = count(g.played), wins = Math.min(played, count(g.wins));
    if (!game || !played) continue;
    stats.played = Math.min(Number.MAX_SAFE_INTEGER, stats.played + played); stats.wins = Math.min(Number.MAX_SAFE_INTEGER, stats.wins + wins);
    stats.distinctGames++; if (wins) stats.winningGames++;
    if (['karten', 'wuerfel', 'brett', 'party'].includes(game.category)) { categories.add(game.category); stats[game.category + 'Wins'] += wins; }
    for (const m of g.months) if (/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) months.add(m);
  }
  stats.categories = categories.size; stats.activeMonths = months.size;
  const badges = ACHIEVEMENTS.map((b) => ({ ...b, value: stats[b.metric], progress: Math.min(b.target, stats[b.metric]), unlocked: stats[b.metric] >= b.target }));
  return { name: profile.name, recorded: stats.played > 0, stats, badges, unlocked: badges.filter((b) => b.unlocked).length, total: badges.length };
}
export function createAchievements({ leaderboard, games }) {
  return {
    // Nach Name: alle Gleichnamigen zusammen. Für genau ein Konto: detailFor.
    detail(name = '') {
      if (typeof name !== 'string' || name.length > 16) throw Object.assign(new Error('Bitte einen Spielernamen mit höchstens 16 Zeichen angeben'), { status: 400 });
      return achievementProgress(leaderboard.profile(cleanName(name)), games);
    },
    detailFor(accountId, name = '') {
      return achievementProgress(leaderboard.profile({ accountId, name: cleanName(String(name)) }), games);
    },
    players(query = '') { return leaderboard.names(typeof query === 'string' ? cleanName(query) : '').slice(0, 20); },
  };
}
