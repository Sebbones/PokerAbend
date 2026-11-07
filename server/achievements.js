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
export function achievementCatalog(games) {
  return [...ACHIEVEMENTS, ...games.flatMap(g => [
    { ...badge(`spiel-${g.id}-start`, `${g.name}: Einstieg`, `Beende eine qualifizierte Partie ${g.name}.`, 'spiele', 'played', 1, g.category === 'karten' ? 'cards' : g.category === 'wuerfel' ? 'dice' : g.category === 'brett' ? 'board' : 'party'), game:g.id, source:'ranked' },
    { ...badge(`spiel-${g.id}-routine`, `${g.name}: Am Ball`, `Beende zehn qualifizierte Partien ${g.name}.`, 'spiele', 'played', 10, 'play', 'silver'), game:g.id, source:'ranked' },
    { ...badge(`spiel-${g.id}-meister`, `${g.name}: Meisterklasse`, `Gewinne zehn qualifizierte Partien ${g.name}.`, 'spiele', 'wins', 10, 'trophy', 'gold'), game:g.id, source:'ranked', rarity:'rare' },
  ]),
  { ...badge('abend-komplett', 'Bis zum letzten Spiel', 'Beende alle Stationen eines qualifizierten Abend-Modus.', 'meilensteine', 'completedEvenings', 1, 'party', 'silver'), source:'ranked' },
  { ...badge('gepruefter-entdecker', 'Überall zu Hause', 'Spiele zehn verschiedene Spiele in qualifizierten Partien.', 'meilensteine', 'rankedDistinctGames', 10, 'compass', 'gold'), source:'ranked' },
  { ...badge('tischlegende', 'Tischlegende', 'Gewinne 100 qualifizierte Partien.', 'meilensteine', 'rankedWins', 100, 'trophy', 'platinum'), source:'ranked', rarity:'legendary' },
  { ...badge('verborgener-erfolg', 'Perfekte Serie', 'Gewinne fünf qualifizierte Partien in Folge.', 'meilensteine', 'longestStreak', 5, 'trophy', 'gold'), source:'ranked', rarity:'rare', secret:true },
  ];
}
export function achievementProgress(profile, games, qualified = {}) {
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
  const ranked = new Map((qualified.games || []).filter(g=>catalog.has(g.id)).map(g=>[g.id,g]));
  Object.assign(stats, { rankedPlayed:0, rankedWins:0, rankedDistinctGames:ranked.size, longestStreak:count(qualified.longestStreak), completedEvenings:count(qualified.completedEvenings) });
  for (const g of ranked.values()) { stats.rankedPlayed += count(g.played); stats.rankedWins += Math.min(count(g.played),count(g.wins)); }
  const badges = achievementCatalog(games).map(b => {
    const value = b.game ? count(ranked.get(b.game)?.[b.metric]) : count(stats[b.metric]);
    if (b.secret && value < b.target) return { id:b.id, title:'Verborgener Erfolg', description:'Wird beim Freischalten sichtbar.', group:b.group, tier:'gold', icon:'compass', secret:true, concealed:true, source:b.source, rarity:'rare', value:0, progress:0, target:1, unlocked:false };
    return { ...b, rarity:b.rarity || 'common', value, progress:Math.min(b.target,value), unlocked:value>=b.target };
  });
  return { name: profile.name, recorded: stats.played > 0, stats, badges, unlocked: badges.filter((b) => b.unlocked).length, total: badges.length };
}
export function createAchievements({ leaderboard, games, accounts = null }) {
  const includeAccount = (viewer) => id => {
    if (!accounts) return true;
    if (viewer && accounts.resolve(viewer) && accounts.resolve(viewer) === accounts.resolve(id)) return true;
    const privacy = accounts.privacyOf(id); return !!accounts.get(id) && !privacy.hidden && privacy.showAchievements && privacy.showStats;
  };
  const service = {
    // Nach Name: alle Gleichnamigen zusammen. Für genau ein Konto: detailFor.
    detail(name = '', { viewer = null } = {}) {
      if (typeof name !== 'string' || name.length > 16) throw Object.assign(new Error('Bitte einen Spielernamen mit höchstens 16 Zeichen angeben'), { status: 400 });
      return achievementProgress(leaderboard.profile(cleanName(name), { includeAccount:includeAccount(viewer) }), games);
    },
    detailFor(accountId, name = '') {
      return achievementProgress(leaderboard.profile({ accountId, name: cleanName(String(name)) }), games, leaderboard.achievementProfile?.(accountId,games.map(g=>g.id)));
    },
    players(query = '', viewer = null) { return leaderboard.names(typeof query === 'string' ? cleanName(query) : '', { includeAccount:includeAccount(viewer) }).slice(0, 20); },
    reconcile(accountId, name = '') {
      const detail = service.detailFor(accountId,name);
      const fresh = accounts?.recordAchievements(accountId,detail.badges.filter(b=>b.unlocked).map(b=>b.id)) || [];
      return { detail, fresh:detail.badges.filter(b=>fresh.includes(b.id)) };
    },
    backfill() {
      let added = 0;
      for (const id of leaderboard.achievementAccounts?.() || []) if (accounts?.get(id)) added += service.reconcile(id, accounts.get(id).name).fresh.length;
      return added;
    },
  };
  return service;
}
