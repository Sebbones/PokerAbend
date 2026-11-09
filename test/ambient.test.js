// EXP-F5: Atmosphäre – synthetische Szenen, Welt-Zuordnung, Mixer/Pause/Tab-Verhalten der Engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENES, SCENE_RATE, SCENE_SECONDS, TARGET_RMS, PEAK_LIMIT, renderScene } from '../public/sound/ambient/scenes.js';
import { WORLD_AMBIENT, worldAmbient } from '../public/sound/ambient/worlds.js';
import { createSoundEngine, loadPalette, MIXER_DEFAULTS } from '../public/sound/engine.js';

const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

test('Atmosphäre: jede Szene ist deterministisch, gleich laut, begrenzt und ohne Naht in der Schleife', () => {
  assert.deepEqual(SCENES, ['room', 'kamin', 'kneipe', 'salon', 'meer', 'stadtregen', 'wald-nacht', 'jahrmarkt']);
  for (const name of SCENES) {
    const a = renderScene(name), b = renderScene(name);
    assert.equal(a.length, SCENE_RATE * SCENE_SECONDS, name);
    assert.deepEqual(a, b, `${name} ist deterministisch`);
    assert.ok(a.every(Number.isFinite), `${name} ohne NaN`);
    assert.ok(Math.abs(rms(a) - TARGET_RMS) < TARGET_RMS * 0.1, `${name} Lautheit ${rms(a)}`);
    assert.ok(a.every((v) => Math.abs(v) <= PEAK_LIMIT), `${name} Spitzenwert`);
    // Kein Knacks an der Schleifenstelle: Der Sprung letzter → erster Wert ist nicht größer als typische Sprünge im Inneren.
    const diffs = Array.from({ length: a.length - 1 }, (_, i) => Math.abs(a[i + 1] - a[i])).sort((x, y) => x - y);
    assert.ok(Math.abs(a[0] - a.at(-1)) <= diffs[Math.floor(diffs.length * 0.999)], `${name} Schleifennaht`);
    const w = Math.round(0.05 * SCENE_RATE), around = Float32Array.from([...a.slice(-w), ...a.slice(0, w)]);
    assert.ok(rms(around) < rms(a) * 2.5, `${name} keine Lautheitsspitze an der Naht`);
  }
  assert.throws(() => renderScene('../oops'));
});

test('Atmosphäre: jedes Mehrspieler-Spiel hat eine gültige Welt, Einzelspieler bleiben still', () => {
  const exp = JSON.parse(readFileSync('docs/design/game-experience-roadmap.json', 'utf8'));
  const vis = Object.fromEntries(JSON.parse(readFileSync('docs/design/game-visual-roadmap.json', 'utf8')).packages.map((p) => [p.game_id, p.category]));
  for (const p of exp.packages) {
    if (vis[p.game_id] === 'einzelspieler') assert.equal(worldAmbient(p.game_id), null, p.game_id);
    else assert.ok(SCENES.includes(worldAmbient(p.game_id)), `${p.game_id} ohne Atmosphäre`);
  }
  for (const scene of Object.values(WORLD_AMBIENT)) assert.ok(SCENES.includes(scene) && scene !== 'room');
  assert.equal(worldAmbient('constructor'), null); assert.equal(worldAmbient(null), null);
});

test('Atmosphäre: Paletten bringen ihre Welt mit, Lobby-Klänge liegen im Zeitbudget', async () => {
  assert.equal((await loadPalette('casino')).ambient, 'salon'); assert.equal((await loadPalette('holz')).ambient, 'kamin');
  assert.equal((await loadPalette('kneipe')).ambient, 'kneipe'); assert.equal((await loadPalette('party')).ambient, 'jahrmarkt');
  const { events } = await loadPalette('standard');
  for (const name of ['seat', 'stand']) for (const n of events[name]) assert.ok((n.at || 0) + n.ms <= 600, name);
});

test('Atmosphäre: standardmäßig aus, Welt-Standard pro Spiel, eigene Wahl schlägt die Palette', async () => {
  let sound = { ...MIXER_DEFAULTS }, game = 'schach';
  const host = { __soundLog: [] };
  const engine = createSoundEngine({ host, game: () => game, settings: () => sound, contextFactory: () => { throw Error('kein Kontext im Testmodus'); } });
  assert.equal(MIXER_DEFAULTS.atmosphere, 0);
  assert.equal(engine.ambientScene, 'kamin');
  engine.refresh(); assert.equal(host.__soundLog.length, 0, 'Atmosphäre 0 % → nichts');
  game = 'werwolf'; engine.refresh(); assert.equal(engine.ambientScene, 'wald-nacht');
  sound = { ...sound, atmosphere: 0.5 };
  await engine.use('party'); assert.equal(engine.ambientScene, 'jahrmarkt', 'ohne eigene Wahl gilt die Palette');
  assert.deepEqual(host.__soundLog.at(-1), { event: 'ambient', palette: 'party', game: 'werwolf', channel: 'atmosphere', name: 'jahrmarkt' });
  engine.ambient('meer'); await engine.use('casino'); assert.equal(engine.ambientScene, 'meer', 'eigene Wahl bleibt');
  game = 'sudoku'; engine.refresh(); assert.equal(engine.ambientScene, null, 'Einzelspieler ohne Atmosphäre');
  await engine.dispose();
});

function fakeAudio() {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } });
  return { currentTime: 0, sampleRate: 48000, state: 'running', destination: {}, createGain: node, createOscillator: node, createBufferSource: node, createBiquadFilter: node,
    createBuffer: (_c, len, rate) => ({ length: len, sampleRate: rate, copyToChannel(data) { this.data = data; }, getChannelData: () => new Float32Array(len) }), close: async () => {} };
}
test('Atmosphäre: Spielpause und Tab im Hintergrund halten an, danach läuft nur die Atmosphäre weiter', () => {
  let paused = false; const events = {};
  const host = { document: { hidden: false, addEventListener: (n, fn) => { events[n] = fn; }, removeEventListener() {} } };
  const engine = createSoundEngine({ host, game: () => 'skat', paused: () => paused, settings: () => ({ ...MIXER_DEFAULTS, atmosphere: 0.4 }), contextFactory: fakeAudio });
  engine.refresh(); assert.equal(engine.ambientPlaying, true); assert.equal(engine.voiceCount, 1);
  paused = true; engine.refresh(); assert.equal(engine.ambientPlaying, false, 'Pause stoppt');
  paused = false; engine.refresh(); assert.equal(engine.ambientPlaying, true, 'Weiter startet neu');
  engine.play('card'); assert.equal(engine.voiceCount, 2);
  host.document.hidden = true; events.visibilitychange(); assert.equal(engine.voiceCount, 0);
  host.document.hidden = false; events.visibilitychange(); assert.equal(engine.voiceCount, 1); assert.equal(engine.ambientPlaying, true);
  engine.ambient(null); assert.equal(engine.ambientPlaying, false);
  engine.dispose();
});
