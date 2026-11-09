// Own synthetic brass, chips and felt; no recordings.
export default { id: 'casino', events: {
  select: [{ kind: 'bell', freq: 1600, ms: 90, vol: 0.025, ratio: 2.6, index: 1.5 }],
  confirm: [{ kind: 'bell', freq: 980, ms: 260, vol: 0.04 }],
  deny: [{ kind: 'bass', freq: 110, ms: 180, vol: 0.06 }],
  turn: [{ kind: 'bell', freq: 740, ms: 220, vol: 0.035 }, { kind: 'bell', freq: 988, ms: 240, vol: 0.03, at: 140 }],
  win: [{ kind: 'chord', freqs: [523, 659, 784], ms: 760, vol: 0.025 }],
  lose: [{ kind: 'chord', freqs: [330, 392, 440], ms: 650, vol: 0.02 }],
  card: [{ kind: 'noise', freq: 2200, ms: 55, vol: 0.2, q: 0.7 }],
  deal: [{ kind: 'noise', freq: 1600, ms: 85, vol: 0.18 }],
  chip: [{ kind: 'bell', freq: 2100, ms: 110, vol: 0.025, ratio: 3.1 }],
  dice: [{ kind: 'noise', freq: 2500, ms: 65, vol: 0.2, q: 4 }],
  piece: [{ kind: 'tock', freq: 420, ms: 80, vol: 0.05 }],
  capture: [{ kind: 'bass', freq: 140, ms: 140, vol: 0.06 }],
} };
