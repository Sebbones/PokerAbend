// Bouncy plops, bright FM bells and a soft celebratory chord.
export default { id: 'party', ambient: 'jahrmarkt', events: {
  select: [{ kind: 'plop', freq: 720, ms: 85, vol: 0.045 }],
  confirm: [{ kind: 'plop', freq: 850, ms: 140, vol: 0.055 }],
  deny: [{ kind: 'plop', freq: 170, ms: 220, vol: 0.06 }],
  turn: [{ kind: 'bell', freq: 660, ms: 200, vol: 0.035 }, { kind: 'plop', freq: 990, ms: 160, vol: 0.04, at: 140 }],
  win: [{ kind: 'chord', freqs: [523, 784, 1047], ms: 900, vol: 0.025 }],
  lose: [{ kind: 'plop', freq: 240, ms: 650, vol: 0.045 }],
  highlight: [{ kind: 'chord', freqs: [659, 880, 1318], ms: 1000, vol: 0.025 }],
  card: [{ kind: 'noise', freq: 3000, ms: 45, vol: 0.25 }],
  deal: [{ kind: 'noise', freq: 2300, ms: 75, vol: 0.2 }],
  chip: [{ kind: 'bell', freq: 1800, ms: 130, vol: 0.025 }],
  dice: [0, 55, 100].map(at => ({ kind: 'tock', freq: 900, ms: 45, vol: 0.05, at })),
  piece: [{ kind: 'plop', freq: 500, ms: 95, vol: 0.06 }],
  capture: [{ kind: 'plop', freq: 280, ms: 170, vol: 0.07 }],
} };
