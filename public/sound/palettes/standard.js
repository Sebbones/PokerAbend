// EXP-F1: the original core.js SFX, with unchanged synthesis parameters and timing.
const tone = (freq, ms, vol, type = 'sine', at = 0) => ({ kind: 'tone', freq, ms, vol, type, at });
const noise = (sec, freq, vol, type = 'bandpass', q = 1, at = 0) => ({ kind: 'noise', ms: sec * 1000, freq, vol, type, q, at });
const events = {
  card: [noise(0.06, 2600, 0.35)],
  draw: [noise(0.1, 1600, 0.22, 'bandpass', 0.7)],
  shuffle: [0, 45, 90, 135, 180, 225].map(at => noise(0.04, 3200, 0.2, 'bandpass', 1, at)),
  dice: [0, 55, 95, 150, 185].map((at, i) => ({ ...noise(0.025, 1800 + i * 300, 0.5, 'bandpass', 4, at), jitter: 20 })),
  call: [tone(660, 110, 0.07, 'square'), tone(990, 170, 0.07, 'square', 110)],
  catch: [tone(180, 220, 0.08, 'sawtooth')],
  hit: [tone(420, 90, 0.07, 'triangle'), tone(210, 160, 0.07, 'triangle', 90)],
  skip: [tone(520, 90, 0.05), tone(390, 120, 0.05, 'sine', 90)],
  drum: [noise(0.22, 300, 0.6, 'lowpass')],
  chips: [tone(2200, 40, 0.03, 'triangle'), tone(1800, 50, 0.025, 'triangle', 50)],
  splash: [noise(0.28, 700, 0.5, 'lowpass'), noise(0.18, 1400, 0.15, 'bandpass', 1, 60)],
  done: [523, 659, 784].map((f, i) => tone(f, 140, 0.05, 'sine', i * 90)),
  win: [523, 659, 784, 1047].map((f, i) => tone(f, 200, 0.055, 'sine', i * 110)),
  end: [tone(440, 160, 0.045), tone(330, 220, 0.045, 'sine', 160)],
  select: [tone(660, 70, 0.04)],
  confirm: [tone(660, 100, 0.05), tone(880, 120, 0.05, 'sine', 100)],
  deny: [tone(180, 180, 0.05, 'triangle')],
  turn: [tone(740, 140, 0.06), tone(988, 160, 0.05, 'sine', 140)],
};
events.lose = events.end;
events.deal = events.draw;
events.chip = events.chips;
events.piece = [tone(420, 65, 0.05, 'triangle')];
events.capture = events.hit;
// EXP-F5 Lobby-Leben: Stuhl rücken beim Hinsetzen, kurzes Aufstehen beim Gehen.
events.seat = [{ kind: 'noise', ms: 260, freq: 380, vol: 0.12, type: 'bandpass', q: 2.5 }, { kind: 'tock', freq: 150, ms: 90, vol: 0.05, at: 210 }];
events.stand = [{ kind: 'tock', freq: 210, ms: 70, vol: 0.045 }, { kind: 'noise', ms: 200, freq: 520, vol: 0.09, type: 'bandpass', q: 2, at: 40 }];
export default { id: 'standard', events };
