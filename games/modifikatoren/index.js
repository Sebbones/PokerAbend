import { randomInt } from 'node:crypto';
import { drawChaos, CHAOS_RULES } from '../chaos-modus/index.js';

export const SUPPORTED_GAMES = ['schaetzmeister', 'schlagfertig', 'werhatdasgesagt'];
export const RULE_OPTIONS = [
  { key: 'modifierRule', label: 'Modifikator', type: 'select', values: [
    { value: 'off', label: 'Aus' }, { value: 'double', label: 'Doppelte Punkte' },
    { value: 'reverse', label: 'Umgekehrte Wertung' }, { value: 'pressure', label: 'Zeitdruck' },
    { value: 'random', label: 'Zufälliger Modifikator' },
  ] },
  { key: 'chaosMode', label: 'Chaos-Modus (zufällige Zusatzregeln)', type: 'bool' },
  { key: 'modifierScope', label: 'Zusatzregeln gelten', type: 'select', values: [
    { value: 'once', label: 'Für eine Partie' }, { value: 'session', label: 'Bis ausgeschaltet' },
  ] },
];
const DEFAULTS = { modifierRule: 'off', chaosMode: false, modifierScope: 'session' };
function settings(input = {}, base = DEFAULTS) {
  const out = { ...base };
  for (const o of RULE_OPTIONS) if (Object.hasOwn(input, o.key)) {
    const value = input[o.key];
    if (o.type === 'bool' ? typeof value !== 'boolean' : !o.values.some((v) => v.value === value)) throw new Error(`Ungültige Einstellung: ${o.label}`);
    out[o.key] = value;
  }
  return Object.fromEntries(RULE_OPTIONS.map((o) => [o.key, out[o.key]]));
}
const enabled = (s) => s.chaosMode || s.modifierRule !== 'off';
function choose(s, previous) {
  if (s.chaosMode) return drawChaos(previous);
  if (s.modifierRule === 'random') {
    const choices = ['double', 'reverse', 'pressure'].filter((r) => r !== previous);
    return choices[randomInt(choices.length)];
  }
  return s.modifierRule;
}
const validPreview = (s, rule) => s.chaosMode ? CHAOS_RULES.includes(rule) : s.modifierRule === 'random' ? ['double', 'reverse', 'pressure'].includes(rule) : rule === s.modifierRule;

function attach(room, input, saved) {
  Object.assign(room.settings, settings(input));
  room.rulePreview = validPreview(room.settings, saved?.preview) ? saved.preview : choose(room.settings);
  room.activeRule = null;
  const clamp = room.clampSettings.bind(room), start = room.start.bind(room), finish = room.finishRound.bind(room);
  const stageSecs = room.stageSecs.bind(room), view = room.view.bind(room), snapshot = room.snapshot.bind(room);
  room.clampSettings = (input, base) => ({ ...clamp(input, base), ...settings(input, base) });
  const update = room.updateSettings.bind(room);
  room.updateSettings = (id, input) => {
    const before = JSON.stringify(RULE_OPTIONS.map((o) => room.settings[o.key]));
    update(id, input);
    if (before !== JSON.stringify(RULE_OPTIONS.map((o) => room.settings[o.key]))) room.rulePreview = choose(room.settings, room.rulePreview);
  };
  room.start = (id) => {
    // Do not let rejected/duplicate start messages change a running rule.
    room.requireHost(id);
    if (room.busy) return start(id);
    const previous = room.activeRule;
    room.activeRule = room.rulePreview;
    try { return start(id); } catch (e) { room.activeRule = previous; throw e; }
  };
  room.stageSecs = (stage) => {
    const n = stageSecs(stage);
    return stage !== 'reveal' && room.activeRule?.includes('pressure') && n > 0 ? Math.max(5, Math.ceil(n / 2)) : n;
  };
  room.finishRound = (winners, text, points = {}) => {
    const rule = room.activeRule || 'off', ids = room.roundPlayers || room.order;
    let adjusted = { ...points };
    if (rule.startsWith('double')) { adjusted = Object.fromEntries(Object.entries(points).map(([id, n]) => [id, n * 2])); text = 'Doppelte Punkte'; }
    if (rule.startsWith('reverse')) {
      const ceiling = Math.max(0, ...ids.map((id) => points[id] || 0));
      adjusted = Object.fromEntries(ids.map((id) => [id, ceiling - (points[id] || 0)]));
      const best = Math.max(0, ...Object.values(adjusted));
      winners = ceiling > 0 ? ids.filter((id) => adjusted[id] === best) : [];
      text = 'Umgekehrte Wertung';
    }
    // Prepare the NEXT public rule before the completion snapshot is persisted.
    room.lastRule = rule;
    if (room.settings.modifierScope === 'once') Object.assign(room.settings, { modifierRule: 'off', chaosMode: false });
    room.rulePreview = choose(room.settings, room.rulePreview);
    return finish(winners, text, adjusted);
  };
  room.view = (id) => ({ ...view(id), partyRules: {
    supported: true, rule: room.busy ? room.activeRule : room.rulePreview,
    nextRule: room.rulePreview, lastRule: room.lastRule || null,
    scope: room.settings.modifierScope, chaos: room.settings.chaosMode,
    // Question breakdowns remain the original scores; final results include the rule.
    rawQuestionScores: true,
  } });
  room.snapshot = () => ({ ...snapshot(), partyRules: { preview: room.rulePreview } });
  room.hasPartyRules = () => enabled(room.settings) || (room.busy && room.activeRule !== 'off');
  return room;
}

// Decorate only the explicitly supported modules. Their answer/view logic is unchanged.
export function withModifiers(game) {
  if (!SUPPORTED_GAMES.includes(game.id)) return game;
  const options = [...game.options, ...RULE_OPTIONS];
  return { ...game, options,
    variants: game.variants?.map((v) => ({ ...v, options: [...v.options, ...RULE_OPTIONS] })),
    create: (code, input = {}, onChange) => attach(game.create(code, input, onChange), input),
    restore: (data, onChange) => attach(game.restore(data, onChange), data.settings, data.partyRules),
  };
}
