import { test, expect, login } from './helpers.js';
import { writeFileSync } from 'node:fs';
async function open(page, app) {
  await login(page, app);
  await page.goto(app.url + '/motion/test-motion.html');
  await expect.poll(() => page.evaluate(() => !!window.motionDemo)).toBe(true);
}
const running = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);

test('EXP-F2: all nine primitives reach their endpoints and only animate transform/opacity', async ({ page, app }, info) => {
  await open(page, app);
  const results = await page.evaluate(async () => {
    const { motion, run, root, socket } = motionDemo, records = [], original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) { records.push({ frames, options }); return original.call(this, frames, options); };
    const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const outcomes = {};
    try {
      for (const name of Object.keys(motionDemo.actions)) {
        socket.emit('state', { revision: motion.version + 1 });
        outcomes[name] = (await run(name, { duration: 80 })).status;
        if (['flyTo', 'walk'].includes(name)) outcomes[name + 'Position'] = { piece: center(document.querySelector('#piece')), target: center(document.querySelector('#target')) };
        if (name === 'flip') outcomes.card = document.querySelector('#card').textContent;
        if (name === 'roll') outcomes.die = document.querySelector('#die').dataset.motionValue;
        if (name === 'stack') outcomes.stackPositions = [...root.querySelectorAll('.chip')].map(center);
      }
    } finally { Element.prototype.animate = original; }
    return { outcomes, records, animations: document.getAnimations().length, queue: motion.queue.length };
  });
  for (const name of ['flyTo','flip','deal','roll','walk','stack','shake','pulse','celebrate']) expect(results.outcomes[name], name).toBe('completed');
  for (const name of ['flyToPosition', 'walkPosition']) for (let axis=0;axis<2;axis++) expect(Math.abs(results.outcomes[name].piece[axis]-results.outcomes[name].target[axis])).toBeLessThan(1);
  expect(results.outcomes.card).toBe('A♠'); expect(results.outcomes.die).toBe('4');
  results.outcomes.stackPositions.forEach((p,i) => { expect(p[0]).toBeCloseTo(results.outcomes.stackPositions[0][0], 1); expect(p[1]).toBeCloseTo(results.outcomes.stackPositions[0][1]-i*5, 1); });
  expect(results.records.length).toBeGreaterThanOrEqual(13);
  for (const { frames } of results.records) for (const frame of frames) for (const key of Object.keys(frame)) expect(['transform','opacity','offset']).toContain(key);
  expect(results.animations).toBe(0); expect(results.queue).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#table').screenshot({ path: info.outputPath('motion-endpoints.png') });
});

test('EXP-F2: a new state cancels active and queued motion synchronously, without stale writes', async ({ page, app }) => {
  await open(page, app);
  const result = await page.evaluate(async () => {
    const { motion, run, socket } = motionDemo;
    const old = [run('pulse',{duration:1500}),run('flip',{duration:1500}),run('roll',{duration:1500})];
    const before = { active: !!motion.active, queued: motion.queue.length };
    socket.emit('state',{revision:2,card:'K♥',die:6});
    const immediately = {card:document.querySelector('#card').textContent,die:document.querySelector('#die').textContent,active:!!motion.active,queue:motion.queue.length,animations:document.getAnimations().length};
    const settled = await Promise.all(old);
    return { before, immediately, settled, card:document.querySelector('#card').textContent,die:document.querySelector('#die').textContent };
  });
  expect(result.before).toEqual({active:true,queued:2});
  expect(result.immediately).toEqual({card:'K♥',die:'6',active:false,queue:0,animations:0});
  expect(result.settled.every(r=>r.status==='finished')).toBe(true);
  expect(result.card).toBe('K♥'); expect(result.die).toBe('6');
});

test('EXP-F2: queues are isolated per table and old version tokens are ignored', async ({ page, app }) => {
  await open(page, app);
  const result = await page.evaluate(async () => {
    const { motion, other, socket }=motionDemo, oldVersion=motion.version;
    const a=motion.pulse(document.querySelector('#piece'),{duration:800});
    const b=other.pulse(document.querySelector('#other-piece'),{duration:800});
    socket.emit('state',{revision:2,card:'10♦',die:3});
    const independent=!!other.active;
    const stale=await motion.flip(document.querySelector('#card'),{value:'OLD',confirmed:true,version:oldVersion});
    await Promise.all([a,b]);
    const current=motion.version;socket.emit('disconnect');
    const disconnected=await motion.flip(document.querySelector('#card'),{value:'OLD',confirmed:true,version:current});
    return {independent,stale:stale.status,disconnected:disconnected.status,card:document.querySelector('#card').textContent};
  });
  expect(result).toEqual({independent:true,stale:'stale',disconnected:'stale',card:'10♦'});
});

for(const [button,card,die] of [['pause','D♦','2'],['watch','9♣','3'],['reconnect','7♠','5']]) test(`EXP-F2: ${button} immediately installs a complete view`,async({page,app})=>{
  await open(page,app);
  await page.evaluate(()=>{motionDemo.run('walk',{duration:1800});motionDemo.run('flip',{duration:1800});});
  expect(await running(page)).toBeGreaterThan(0);
  await page.locator('#'+button).click();
  await expect(page.locator('#card')).toHaveText(card);await expect(page.locator('#die')).toHaveText(die);
  expect(await running(page)).toBe(0);
  expect(await page.evaluate(()=>motionDemo.motion.queue.length)).toBe(0);
  if(button!=='reconnect')expect(await page.evaluate(async()=> (await motionDemo.run('pulse')).status)).toBe('instant');
});

test('EXP-F2: unconfirmed flip/roll never reveal a value; initial state and reload have no half states',async({page,app})=>{
  await open(page,app);
  const result=await page.evaluate(async()=>{
    const {motion}=motionDemo,card=document.querySelector('#card'),die=document.querySelector('#die');
    const waiting=await Promise.all([motion.flip(card,{value:'SECRET'}),motion.roll({el:die,value:6,confirmed:false}),motion.roll({el:die,value:9,confirmed:true})]);
    const hidden={card:card.textContent,die:die.textContent,attributes:[card.dataset.motionValue,die.dataset.motionValue],animations:document.getAnimations().length};
    const {createTableMotion}=await import('/motion/motion.js'),initial=createTableMotion({root:motionDemo.root});
    initial.update({card:'Q♠',die:2},state=>{initial.flip(card,{value:state.card,confirmed:true});initial.roll({el:die,value:state.die,confirmed:true});});
    const hydrated={card:card.textContent,die:die.textContent,animations:document.getAnimations().length};initial.dispose();
    motionDemo.run('pulse',{duration:2000});return {waiting:waiting.map(r=>r.status),hidden,hydrated};
  });
  expect(result.waiting).toEqual(['waiting','waiting','waiting']);
  expect(result.hidden).toEqual({card:'?',die:'?',attributes:[undefined,undefined],animations:0});
  expect(result.hydrated).toEqual({card:'Q♠',die:'2',animations:0});
  await page.reload();await expect.poll(()=>page.evaluate(()=>!!window.motionDemo)).toBe(true);
  expect(await running(page)).toBe(0);await expect(page.locator('#card')).toHaveText('?');
  expect(await page.locator('#piece').evaluate(el=>el.style.transform)).toBe('');
});

test('EXP-F2: existing reduce-motion setting caps every group at 150 ms with no stagger',async({page,app})=>{
  await login(page,app);await page.evaluate(()=>location.hash='#einstellungen/anzeige');
  await page.locator('[data-set="display.calm"]').check();
  await page.goto(app.url+'/motion/test-motion.html');await expect.poll(()=>page.evaluate(()=>!!window.motionDemo)).toBe(true);
  await expect(page.locator('#reduced')).toBeChecked();
  const timings=await page.evaluate(async()=>{
    const records=[],original=Element.prototype.animate;
    Element.prototype.animate=function(frames,timing){records.push(timing);return original.call(this,frames,timing);};
    try{for(const name of Object.keys(motionDemo.actions))await motionDemo.run(name,{duration:1000});}finally{Element.prototype.animate=original;}
    return records;
  });
  expect(timings.length).toBeGreaterThanOrEqual(13);
  for(const timing of timings){expect(timing.duration).toBeLessThanOrEqual(150);expect(timing.delay).toBe(0);}
  expect(await running(page)).toBe(0);
});

test('EXP-F2: OS reduction and changing the setting finish running and queued work',async({page,app})=>{
  await open(page,app);
  await page.evaluate(()=>{motionDemo.run('pulse',{duration:2000});motionDemo.run('flip',{duration:2000});});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>running(page)).toBe(0);await expect(page.locator('#card')).toHaveText('A♠');
  const timings=await page.evaluate(async()=>{
    const p=motionDemo.run('deal',{duration:1000});const times=document.getAnimations().map(a=>a.effect.getTiming());await p;return times;
  });
  expect(timings).toHaveLength(3);for(const timing of timings){expect(timing.duration).toBeLessThanOrEqual(150);expect(timing.delay).toBe(0);}
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{motionDemo.run('walk',{duration:2000});motionDemo.run('roll',{duration:2000});});
  await page.locator('#reduced').check();expect(await running(page)).toBe(0);await expect(page.locator('#die')).toHaveText('4');
});

test('EXP-F2: finishing, detached elements, disposal and missing WAAPI leave complete endpoints',async({page,app})=>{
  await open(page,app);
  const result=await page.evaluate(async()=>{
    const {motion,run}=motionDemo;
    const p=run('flip',{duration:2000});const q=run('roll',{duration:2000});window.dispatchEvent(new Event('pagehide'));await Promise.all([p,q]);
    const hidden=[document.querySelector('#card').textContent,document.querySelector('#die').textContent];
    const original=Element.prototype.animate;Element.prototype.animate=undefined;
    try{await run('flyTo');}finally{Element.prototype.animate=original;}
    const rect=document.querySelector('#piece').getBoundingClientRect(),target=document.querySelector('#target').getBoundingClientRect();
    const detached=document.createElement('div');await motion.pulse(detached);
    motion.dispose();motionDemo.socket.emit('state',{revision:999,card:'STALE',die:6});
    return {card:document.querySelector('#card').textContent,hidden,dx:Math.abs(rect.left+rect.width/2-target.left-target.width/2),animations:document.getAnimations().length,stale:(await run('flip')).status};
  });
  expect(result.card).toBe('A♠');expect(result.hidden).toEqual(['A♠','4']);expect(result.dx).toBeLessThan(1);expect(result.animations).toBe(0);expect(result.stale).toBe('stale');
});

test('EXP-F2: rAF frame rate during motion meets the mobile/desktop budget',async({page,app},info)=>{
  await open(page,app);
  const session=await page.context().newCDPSession(page),desktop=info.project.name==='desktop';
  if(desktop)await session.send('Emulation.setCPUThrottlingRate',{rate:4});
  try{
    const sample=await page.evaluate(async()=>{
      const frames=[];let live=true;
      const frame=t=>{frames.push(t);if(live)requestAnimationFrame(frame);};
      await new Promise(resolve=>requestAnimationFrame(resolve));requestAnimationFrame(frame);
      const pending=motionDemo.run('walk',{duration:1600});const animated=document.getAnimations().length;
      await pending;live=false;
      return {frames:frames.length,fps:(frames.length-1)*1000/(frames.at(-1)-frames[0]),animated};
    });
    expect(sample.animated).toBeGreaterThan(0);expect(sample.frames).toBeGreaterThan(50);
    expect(sample.fps,JSON.stringify(sample)).toBeGreaterThanOrEqual(desktop?45:55);
    const report={...sample,cpuThrottle:desktop?4:1,project:info.project.name};
    writeFileSync(info.outputPath('motion-fps.json'),JSON.stringify(report,null,2)+'\n');
    await info.attach('motion-fps',{body:JSON.stringify(report),contentType:'application/json'});
  }finally{if(desktop)await session.send('Emulation.setCPUThrottlingRate',{rate:1});await session.detach();}
});
