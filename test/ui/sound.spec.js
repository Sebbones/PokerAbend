import { test, expect, login, selectGame } from './helpers.js';
const api = (page, method, path, body) => page.evaluate(async ({method,path,body}) => {
  const res=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'spieleabend'},body:body?JSON.stringify(body):undefined});
  return {status:res.status,json:await res.json()};
},{method,path,body});
async function openSound(page,app){await login(page,app);await page.evaluate(()=>location.hash='#einstellungen/ton');await expect(page.locator('#set-ton')).toBeVisible();await expect(page.locator('#set-status')).toContainText('Spieler-ID');}
async function level(page,key,value){await page.locator(`[data-sound-level="${key}"]`).fill(String(value));}

test('EXP-F1 mixer: levels, per-game mute, reset and player-ID device sync',async({page,app,browser},info)=>{
  await openSound(page,app);
  await expect(page.getByRole('slider',{name:'Atmosphäre',exact:true})).toHaveValue('0');
  await level(page,'master',40);await level(page,'effects',65);await level(page,'atmosphere',20);await level(page,'speech',30);
  await page.locator('[data-sound-game]').selectOption('maumau');await page.locator('[data-sound-mute]').check();
  const expected={enabled:true,master:.4,effects:.65,atmosphere:.2,speech:.3,mutedGames:['maumau']};
  const muted = await page.evaluate(async()=>{
    window.__soundLog=[];await Sound.use('standard');
    await Sound.play('card',{game:'maumau'});await Sound.play('piece',{game:'schach'});
    return __soundLog.map(e=>e.game);
  });
  expect(muted).toEqual(['schach']);
  for(const key of ['master','effects']){
    await level(page,key,0);await page.evaluate(async()=>{window.__soundLog=[];await Sound.play('piece',{game:'schach'});});
    expect(await page.evaluate(()=>__soundLog)).toEqual([]);
    await level(page,key,key==='master'?40:65);
  }

  await expect.poll(async()=> (await api(page,'GET','/api/me/settings')).json.settings.sound).toEqual(expected);
  await page.reload();await expect(page.locator('[data-sound-level="master"]')).toHaveValue('40');
  await page.locator('[data-sound-game]').selectOption('maumau');await expect(page.locator('[data-sound-mute]')).toBeChecked();
  await page.locator('[data-sound-game]').selectOption('schach');await expect(page.locator('[data-sound-mute]')).not.toBeChecked();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('#set-ton').screenshot({path:info.outputPath('sound-mixer.png')});
  const code=(await api(page,'POST','/api/identity/link/create')).json.code;
  const context=await browser.newContext({...info.project.use,viewport:page.viewportSize()}),second=await context.newPage();
  try{
    await login(second,app,'Zweitgerät');expect((await api(second,'POST','/api/identity/link/redeem',{code})).status).toBe(200);
    await second.reload();await second.evaluate(()=>location.hash='#einstellungen/ton');
    await expect(second.locator('[data-sound-level="master"]')).toHaveValue('40');
    expect((await api(second,'GET','/api/me/settings')).json.settings.sound).toEqual(expected);
    await second.locator('[data-set-reset="sound"]').click();
    await expect.poll(async()=> (await api(second,'GET','/api/me/settings')).json.settings.sound.atmosphere).toBe(0);
    await expect(second.locator('[data-sound-level="master"]')).toHaveValue('100');
    expect((await api(second,'GET','/api/me/settings')).json.settings.sound.mutedGames).toEqual([]);
  }finally{await context.close();}
});

test('EXP-F1 logging: palette loading, muted channels and a real Mau-Mau turn',async({page,app,browser},info)=>{
  await page.addInitScript(()=>window.__soundLog=[]);
  await login(page,app);await selectGame(page,'maumau');await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('#kg')).toBeVisible();await page.evaluate(()=>send('sit'));
  const code=await page.evaluate(()=>lastState.code),context=await browser.newContext({...info.project.use,viewport:page.viewportSize()}),other=await context.newPage();
  try{
    await other.addInitScript(()=>window.__soundLog=[]);await login(other,app,'Ben');await other.evaluate(code=>joinAndEnter(code,'sit'),code);
    await expect.poll(()=>page.evaluate(()=>lastState.players.filter(p=>p.seated).length)).toBe(2);
    expect((await page.evaluate(()=>send('start'))).ok).toBe(true);
    await expect.poll(()=>page.evaluate(()=>lastState.phase)).toBe('playing');await expect.poll(()=>other.evaluate(()=>lastState.phase)).toBe('playing');
    const actor=await page.evaluate(()=>lastState.turnId===lastState.you.id)?page:other;
    await actor.evaluate(async()=>{await Sound.use('standard');window.__soundLog=[];});
    const before=await actor.evaluate(()=>lastState.g.hand.length);
    await actor.locator('[data-g="draw"]').click();
    await expect.poll(()=>actor.evaluate(()=>lastState.g.hand.length)).toBeGreaterThan(before);
    await expect.poll(()=>actor.evaluate(()=>__soundLog.some(e=>e.game==='maumau'&&e.channel==='effects'))).toBe(true);
    // All log-only operations below must avoid constructing even a silent AudioContext.
    const result=await actor.evaluate(async()=>{
      let contexts=0;const original=window.AudioContext;window.AudioContext=class{constructor(){contexts++;throw Error('unexpected audio');}};
      try{
        window.__soundLog=[];await Sound.use('casino');await Sound.play('chip');
        const chip=__soundLog.at(-1);await Sound.ambient('room');const ambientOff=__soundLog.length===1;
        prefs.sound=false;savePrefs();await Sound.play('win');const muted=__soundLog.length===1;
        prefs.sound=true;savePrefs();await Sound.use('standard');return {chip,ambientOff,muted,contexts};
      }finally{window.AudioContext=original;}
    });
    expect(result.chip).toMatchObject({event:'chip',palette:'casino',game:'maumau'});expect(result.ambientOff).toBe(true);expect(result.muted).toBe(true);expect(result.contexts).toBe(0);
  }finally{await context.close();}
});

test('EXP-F1 Web Audio: real synthesis, six-voice limit, release and ambient stop',async({page,app})=>{
  await login(page,app);await page.getByRole('link',{name:'Einstellungen',exact:true}).first().click();
  const result=await page.evaluate(async()=>{
    const {createSoundEngine}=await import('/sound/engine.js');
    const ctx=new AudioContext();await ctx.resume();
    const engine=createSoundEngine({contextFactory:()=>ctx,settings:()=>({enabled:true,master:1,effects:1,atmosphere:.1}),game:()=> 'maumau'});
    window.__testSound=engine;
    const results=[];
    for(const p of ['standard','casino','holz','kneipe','party']){await engine.use(p);for(const e of ['select','confirm','deny','turn','win','lose','card','dice'])results.push(engine.play(e));}
    const cap=engine.voiceCount;engine.ambient('room');const ambient=engine.voiceCount;engine.ambient(null);
    return {results,cap,ambient,state:ctx.state};
  });
  expect(result.state).toBe('running');expect(result.results.every(Boolean)).toBe(true);expect(result.cap).toBeLessThanOrEqual(6);expect(result.ambient).toBeLessThanOrEqual(6);
  await expect.poll(()=>page.evaluate(()=>__testSound.voiceCount)).toBe(0);
  await page.evaluate(async()=>{await __testSound.dispose();delete window.__testSound;});
});
