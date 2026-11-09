import {test,expect,login,selectGame,expectSmoothMotion,expectSound,expectNoLeak,observeServerView} from './helpers.js';
import {setup} from '../helpers/leak-audit.js';
import {GAMES} from '../../games/index.js';
import {writeFileSync} from 'node:fs';

test('EXP-F6 expectSmoothMotion: actual motion, default device budget, 4x CPU',async({page,app},info)=>{
 await login(page,app);await page.goto(app.url+'/motion/test-motion.html');await expect.poll(()=>page.evaluate(()=>!!window.motionDemo)).toBe(true);
 const result=await expectSmoothMotion(page,()=>page.evaluate(()=>motionDemo.run('walk',{duration:1800})));
 expect(result.cpuThrottle).toBe(4);expect(result.minFps).toBe(info.project.name==='mobil'?60:45);expect(result.animations).toBeGreaterThan(0);
 writeFileSync(info.outputPath('experience-fps.json'),JSON.stringify(result,null,2)+'\n');
});
test('EXP-F6 expectSmoothMotion: rejects below budget and restores CPU and recorder after failures',async({page,app})=>{
 await login(page,app);await page.goto(app.url+'/motion/test-motion.html');await expect.poll(()=>page.evaluate(()=>!!window.motionDemo)).toBe(true);
 const context=page.context(),original=context.newCDPSession.bind(context),rates=[];
 context.newCDPSession=async target=>{const session=await original(target),send=session.send.bind(session);session.send=async(method,params)=>{if(method==='Emulation.setCPUThrottlingRate')rates.push(params.rate);return send(method,params);};return session;};
 try{
  await expect(expectSmoothMotion(page,()=>page.evaluate(()=>motionDemo.run('pulse',{duration:700})),{minFps:1000})).rejects.toThrow(/Motion: .*FPS.*budget 1000.*4x CPU/);
  expect(await page.evaluate(()=>window.__experienceFps===undefined)).toBe(true);
  await expect(expectSmoothMotion(page,async()=>{throw Error('action-marker');})).rejects.toThrow('action-marker');
  expect(rates).toEqual([4,1,4,1]);
 }finally{context.newCDPSession=original;}
});
test('EXP-F6 expectSound: real engine log, palette matcher and missing event counterexample',async({page,app})=>{
 await login(page,app);await page.evaluate(async()=>{window.__soundLog=[];await Sound.use('holz');await Sound.play('confirm');});
 const entry=await expectSound(page,{event:'confirm',palette:'holz'});expect(entry.channel).toBe('effects');
 await expect(expectSound(page,'win',{timeout:150})).rejects.toThrow(/Expected sound/);
 await page.evaluate(()=>{delete window.__soundLog;});await expect(expectSound(page,'confirm')).rejects.toThrow(/Enable window.__soundLog/);
});
test('EXP-F6 expectNoLeak: real player views, transient animation and tampered browser state',async({page,app,browser},info)=>{
 await login(page,app);await selectGame(page,'maumau');await page.locator('#host-form button[type=submit]').click();await page.evaluate(()=>send('sit'));
 const code=await page.evaluate(()=>lastState.code),context=await browser.newContext({...info.project.use,viewport:page.viewportSize()}),other=await context.newPage();observeServerView(other);
 try{
  await login(other,app,'Ben');await other.evaluate(code=>joinAndEnter(code,'sit'),code);await expect.poll(()=>page.evaluate(()=>lastState.players.filter(p=>p.seated).length)).toBe(2);
  expect((await page.evaluate(()=>send('start'))).ok).toBe(true);await expect.poll(()=>page.evaluate(()=>lastState.phase)).toBe('playing');await expect.poll(()=>other.evaluate(()=>lastState.phase)).toBe('playing');
  const report=await expectNoLeak(page);expect(report.compared).toBeGreaterThan(0);expect(report.privateValues).toBeGreaterThan(0);
  const own=await page.evaluate(()=>[...lastState.g.hand,lastState.g.top]),hidden=(await other.evaluate(()=>lastState.g.hand)).find(card=>!own.includes(card));expect(hidden).toBeTruthy();
  await expect(expectNoLeak(page,{action:()=>page.evaluate(card=>{
    const el=document.createElement('span');el.dataset.card=card;document.querySelector('#game-root').append(el);el.animate([{opacity:0},{opacity:1}],{duration:1000});el.remove();
  },hidden)})).rejects.toThrow(/animation/);
  await expect(expectNoLeak(page,{action:()=>page.evaluate(card=>{
    window.originalHand=[...lastState.g.hand];lastState.g.hand.push(card);const el=document.createElement('span');el.id='injected-card';el.dataset.card=card;document.querySelector('#game-root').append(el);
  },hidden)})).rejects.toThrow(/Presentation leaks/);
  await page.evaluate(()=>{lastState.g.hand=window.originalHand;delete window.originalHand;document.querySelector('#injected-card').remove();});
  await expectNoLeak(page);
 }finally{await context.close();}
});
test('EXP-F6 expectNoLeak: V2-09 dice fixture, bound hidden slot and no numeric-score false positive',async({page,app})=>{
 const env=setup(GAMES.maexchen);let serverView,peer;
 try{env.r.start(env.r.hostId);const dice=[3,6];env.r.roll=()=>dice.shift();env.r.throwDice(env.r.currentId);const owner=env.r.currentId;serverView=env.r.view(env.ids.find(id=>id!==owner));peer=env.r.view(owner);}finally{env.r.dispose();}
 await login(page,app);await page.evaluate(()=>{const el=document.createElement('div');el.id='leak-test';el.innerHTML='<span>6</span><span class="die" data-view-path=".g.cup" data-view-value="">??</span>';document.querySelector('#hub-main').append(el);});
 const options={serverView,peers:[peer],scope:'#leak-test'};await expectNoLeak(page,options);
 await expect(expectNoLeak(page,{...options,action:()=>page.evaluate(()=>{const die=document.querySelector('.die');die.dataset.dieValue='6';die.dataset.viewValue='6';})})).rejects.toThrow(/Presentation leaks/);
 await page.evaluate(()=>{const die=document.querySelector('.die');delete die.dataset.dieValue;die.dataset.viewValue='';});await expectNoLeak(page,options);
});
test('EXP-F6 assertions reject missing server data and empty presentation roots',async({page,app})=>{
 await login(page,app);
 await expect(expectNoLeak(page,{scope:'#missing-root'})).rejects.toThrow(/No presentation root/);
 await expect(expectNoLeak(page,{scope:'#hub-main'})).rejects.toThrow(/No captured server view/);
});
