import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundEngine, loadPalette, PALETTES, REQUIRED_EVENTS, MIXER_DEFAULTS } from '../public/sound/engine.js';
import { SETTINGS_DEFAULTS, patchProblem, sanitizeSettings, mergeSettings } from '../server/settings.js';
import { createAccountStore } from '../server/account-store.js';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

for (const id of PALETTES) test(`Sound: ${id} has all required and game events within the duration budget`, async () => {
  const p = await loadPalette(id); assert.equal(p.id, id);
  for (const event of [...REQUIRED_EVENTS, 'card', 'deal', 'chip', 'dice', 'piece', 'capture']) assert.ok(p.events[event]?.length, `${id}.${event}`);
  for (const [event, notes] of Object.entries(p.events)) for (const n of notes) {
    assert.ok(['tone', 'noise', 'bell', 'bass', 'chord', 'plop', 'tock'].includes(n.kind));
    assert.ok(n.ms > 0 && Number.isFinite(n.vol) && n.vol > 0);
    if (!['win', 'lose', 'highlight'].includes(event)) assert.ok((n.at || 0) + (n.jitter || 0) + n.ms <= 600, `${id}.${event}`);
  }
});

test('Sound: standard reproduces every original core SFX parameter and schedule', async () => {
  const { events } = await loadPalette('standard');
  const tone = (freq, ms, vol, type = 'sine', at = 0) => ({ kind: 'tone', freq, ms, vol, type, at });
  const noise = (ms, freq, vol, type = 'bandpass', q = 1, at = 0) => ({ kind: 'noise', ms, freq, vol, type, q, at });
  const original = {
    card: [noise(60,2600,.35)], draw: [noise(100,1600,.22,'bandpass',.7)],
    shuffle: [0,45,90,135,180,225].map(at=>noise(40,3200,.2,'bandpass',1,at)),
    dice: [0,55,95,150,185].map((at,i)=>({...noise(25,1800+i*300,.5,'bandpass',4,at),jitter:20})),
    call: [tone(660,110,.07,'square'),tone(990,170,.07,'square',110)], catch:[tone(180,220,.08,'sawtooth')],
    hit: [tone(420,90,.07,'triangle'),tone(210,160,.07,'triangle',90)], skip:[tone(520,90,.05),tone(390,120,.05,'sine',90)],
    drum: [noise(220,300,.6,'lowpass')], chips:[tone(2200,40,.03,'triangle'),tone(1800,50,.025,'triangle',50)],
    splash:[noise(280,700,.5,'lowpass'),noise(180,1400,.15,'bandpass',1,60)],
    done:[523,659,784].map((f,i)=>tone(f,140,.05,'sine',i*90)), win:[523,659,784,1047].map((f,i)=>tone(f,200,.055,'sine',i*110)),
    end:[tone(440,160,.045),tone(330,220,.045,'sine',160)],
  };
  for (const [event, notes] of Object.entries(original)) assert.deepEqual(events[event], notes, event);
});

function fakeAudio() {
  const made = [], param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const node = () => { const n = { gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;} }; made.push(n); return n; };
  return { made, currentTime:0, sampleRate:1000, state:'running', destination:{}, createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,
    createBuffer:(_channels,len)=>({getChannelData:()=>new Float32Array(len)}),close:async()=>{} };
}
test('Sound: lazy context, six voices including ambient, synthesis and cleanup', async () => {
  const ctx=fakeAudio(); let created=0, sound={...MIXER_DEFAULTS,atmosphere:.2};
  const engine=createSoundEngine({settings:()=>sound,host:{},contextFactory:()=>{created++;return ctx;}});
  assert.equal(created,0);
  engine.play('shuffle');assert.equal(engine.voiceCount,6);
  engine.play('card');assert.equal(engine.voiceCount,6);
  assert.ok(ctx.made.some(n=>n.stopped&&n.disconnected),'oldest voice is released');
  engine.ambient('room');assert.equal(engine.voiceCount,6);
  for(const id of PALETTES){await engine.use(id);for(const event of REQUIRED_EVENTS)engine.play(event);assert.ok(engine.voiceCount<=6);}
  sound={...sound,enabled:false};engine.refresh();assert.equal(engine.voiceCount,0);
  const before=ctx.made.length;assert.equal(engine.play('win'),false);assert.equal(ctx.made.length,before);
  await engine.dispose();assert.equal(engine.voiceCount,0);assert.equal(created,1);
});
test('Sound: logging replaces synthesis; master/effects/game mute and ambient default apply', async () => {
  let sound={...MIXER_DEFAULTS}, game='maumau', contexts=0;
  const host={__soundLog:[]};const engine=createSoundEngine({host,settings:()=>sound,game:()=>game,contextFactory:()=>{contexts++;throw Error('must not run');}});
  engine.play('card');assert.deepEqual(host.__soundLog,[{event:'card',palette:'standard',game:'maumau',channel:'effects'}]);
  assert.equal(engine.ambient('room'),false);
  for(const patch of [{master:0},{effects:0},{enabled:false},{mutedGames:['maumau']}]){sound={...MIXER_DEFAULTS,...patch};assert.equal(engine.play('card'),false);}
  sound={...MIXER_DEFAULTS,atmosphere:.2};engine.ambient('room');assert.equal(host.__soundLog.at(-1).channel,'atmosphere');
  sound={...sound,mutedGames:['maumau']};assert.equal(engine.ambient('room'),false);
  game='schach';await engine.use('holz');engine.play('piece');assert.equal(host.__soundLog.at(-1).palette,'holz');
  await assert.rejects(engine.use('../oops'));assert.equal(engine.play('unknown'),false);assert.equal(contexts,0);
  await engine.dispose();
});
test('Sound: game changes and visibility stop live voices; zero atmosphere creates no context', () => {
  let game='maumau', sound={...MIXER_DEFAULTS};const events={};const ctx=fakeAudio();let contexts=0;
  const host={document:{hidden:false,addEventListener:(name,fn)=>events[name]=fn,removeEventListener(){} }};
  const engine=createSoundEngine({host,game:()=>game,settings:()=>sound,contextFactory:()=>{contexts++;return ctx;}});
  engine.ambient('room');assert.equal(contexts,0);engine.play('card');assert.equal(engine.voiceCount,1);
  game='schach';engine.refresh();assert.equal(engine.voiceCount,0);
  sound={...sound,atmosphere:.2};engine.ambient('room');assert.equal(engine.voiceCount,1);
  host.document.hidden=true;events.visibilitychange();assert.equal(engine.voiceCount,0);
  host.document.hidden=false;events.visibilitychange();assert.equal(engine.voiceCount,0,'no backlog after returning');engine.dispose();
});
test('Sound: mixer validates numbers/game IDs and persists per player across restart and merge', () => {
  assert.deepEqual(SETTINGS_DEFAULTS.sound,MIXER_DEFAULTS);
  const patch={sound:{master:.4,effects:.7,atmosphere:.2,speech:.5,mutedGames:['maumau','schach','maumau']}};
  assert.equal(patchProblem(patch),'');assert.deepEqual(mergeSettings({},patch).sound.mutedGames,['maumau','schach']);
  for(const value of [-1,2,NaN,Infinity,'0.5',null])assert.notEqual(patchProblem({sound:{master:value}}),'');
  for(const value of [['../x'],['<script>'],Array(201).fill('maumau'),'maumau'])assert.notEqual(patchProblem({sound:{mutedGames:value}}),'');
  assert.equal(sanitizeSettings({sound:{enabled:false}}).sound.atmosphere,0);
  const dir=mkdtempSync(join(tmpdir(),'sound-settings-')), a='a'.repeat(32),b='b'.repeat(32);
  let store=createAccountStore(dir);store.ensure(a);store.ensure(b);store.setSettings(a,patch);store.save();
  store=createAccountStore(dir);assert.equal(store.settingsOf(a).settings.sound.master,.4);assert.equal(store.settingsOf(b).settings.sound.master,1);
  store.merge(b,a);assert.equal(store.settingsOf(b).settings.sound.master,.4);store.resetSettings(a);assert.deepEqual(store.settingsOf(a).settings.sound,MIXER_DEFAULTS);
});

test('Sound: a play following use waits for the palette; a game change discards pending sounds', async () => {
  const host={__soundLog:[]};let game='maumau';
  const engine=createSoundEngine({host,game:()=>game});
  const selected=engine.use('casino');const played=engine.play('chip');await selected;assert.equal(await played,true);
  assert.equal(host.__soundLog.at(-1).palette,'casino');
  const pending=engine.use('party');const old=engine.play('win');game='schach';engine.refresh();await pending;assert.equal(await old,false);
  assert.equal(engine.palette,'standard');assert.equal(host.__soundLog.length,1);await engine.dispose();
});
