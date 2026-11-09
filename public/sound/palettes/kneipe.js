// Dry dice on the counter, cup thumps and a small bar bell.
export default { id: 'kneipe', ambient: 'kneipe', events: {
  select: [{ kind: 'tock', freq: 430, ms: 70, vol: 0.05 }],
  confirm: [{ kind: 'bell', freq: 820, ms: 220, vol: 0.04, ratio: 2.4 }],
  deny: [{ kind: 'bass', freq: 95, ms: 160, vol: 0.07 }],
  turn: [{ kind: 'tock', freq: 350, ms: 95, vol: 0.055 }, { kind: 'bell', freq: 700, ms: 180, vol: 0.03, at: 110 }],
  win: [{ kind: 'chord', freqs: [330, 415, 494], ms: 800, vol: 0.03 }],
  lose: [{ kind: 'bass', freq: 130, ms: 650, vol: 0.05 }],
  dice: [0, 50, 105, 160].map((at, i) => ({ kind: 'noise', freq: 1500 + i * 220, ms: 30, vol: 0.35, q: 4, at })),
  cup: [{ kind: 'bass', freq: 160, ms: 120, vol: 0.08 }],
  piece: [{ kind: 'tock', freq: 320, ms: 90, vol: 0.06 }],
  capture: [{ kind: 'plop', freq: 230, ms: 150, vol: 0.07 }],
  card: [{ kind: 'noise', freq: 2000, ms: 60, vol: 0.22 }],
  deal: [{ kind: 'noise', freq: 1500, ms: 90, vol: 0.2 }],
  chip: [{ kind: 'tock', freq: 580, ms: 65, vol: 0.05 }],
} };
