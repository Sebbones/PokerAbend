// Warm wooden board and piece transients.
export default { id: 'holz', events: {
  select: [{ kind: 'tock', freq: 620, ms: 65, vol: 0.045 }],
  confirm: [{ kind: 'plop', freq: 480, ms: 100, vol: 0.06 }],
  deny: [{ kind: 'tock', freq: 170, ms: 130, vol: 0.05 }],
  turn: [{ kind: 'tock', freq: 520, ms: 100, vol: 0.05 }, { kind: 'tock', freq: 780, ms: 120, vol: 0.04, at: 130 }],
  win: [{ kind: 'chord', freqs: [392, 494, 587], ms: 850, vol: 0.025 }],
  lose: [{ kind: 'chord', freqs: [220, 262, 330], ms: 700, vol: 0.02 }],
  piece: [{ kind: 'tock', freq: 380, ms: 75, vol: 0.07 }],
  capture: [{ kind: 'tock', freq: 440, ms: 80, vol: 0.06 }, { kind: 'tock', freq: 290, ms: 90, vol: 0.06, at: 85 }],
  card: [{ kind: 'noise', freq: 1800, ms: 65, vol: 0.18 }],
  deal: [{ kind: 'noise', freq: 1400, ms: 90, vol: 0.16 }],
  chip: [{ kind: 'tock', freq: 680, ms: 55, vol: 0.05 }],
  dice: [0, 65, 120].map(at => ({ kind: 'noise', freq: 1300, ms: 35, vol: 0.25, q: 5, at })),
} };
