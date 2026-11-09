import {test,expect,login,selectGame} from './helpers.js';
import {writeFileSync} from 'node:fs';
async function demo(page,app,level,options={}){
 await login(page,app);await page.addInitScript(()=>window.__soundLog=[]);
 await page.evaluate(()=>window.__soundLog=[]);
 await page.evaluate(async({level,options})=>{
  const root=document.createElement('section');root.id='stage-test';root.style.maxWidth='520px';root.style.margin='16px auto';document.querySelector('#hub-main').prepend(root);
  const state={code:'TEST-'+level,game:'demo',roundNo:1,you:{id:options.spectator?'watch':'a'},players:[{id:'a',name:'Anna',score:24},{id:'b',name:'Ben',score:12},{id:'c',name:'Cara',score:7}],result:{players:['a','b','c'],winners:['a'],points:{a:level===1?24.5:24,b:12,c:7}},gamePaused:!!options.paused};
  if(level===3)state.partyProgram={id:'evening-test',status:'done',config:{mode:'abend',name:'Freitag am Tisch'},winners:['Anna'],standings:[{id:'a',name:'Anna',points:6},{id:'b',name:'Ben',points:3},{id:'c',name:'Cara',points:2}],results:[{points:{a:3,b:2,c:1}},{points:{a:3,b:1,c:1}}]};
  window.stageState=state;await window.configureWinnerWorld('demo',{shape:'leaf',colors:['#c47446','#3b806a'],palette:'casino',winEvent:'confirm'});
  await window.showWinnerStage(root,state,{level,fresh:true});
 },{level,options});
 await expect(page.locator('#stage-test')).toHaveAttribute('data-winner-level',String(level));
}
for(const level of [1,2,3])test(`EXP-F4 stage ${level}: authoritative scores, podium/trophy, world palette`,async({page,app},info)=>{
 await demo(page,app,level);
 await expect(page.locator('.winner-actual').first()).toHaveText(level===3?'6':level===1?'24.5':'24');
 await expect.poll(()=>page.locator('.winner-visual').first().textContent()).toBe(level===3?'6':level===1?'24.5':'24');
 if(level>=2){await expect(page.locator('.winner-podium')).toBeVisible();await expect.poll(()=>page.evaluate(()=>__soundLog.some(e=>e.event==='confirm'&&e.palette==='casino'))).toBe(true);}
 if(level===3){await expect(page.locator('.winner-trophy svg')).toBeVisible();await expect(page.locator('.winner-summary')).toContainText('2');await expect(page.locator('.winner-best')).toContainText('Anna: 3');}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('#stage-test').screenshot({path:info.outputPath('stage-'+level+'.png')});
});
test('EXP-F4 reduction, pause, watching and repeated render never replay celebration',async({page,app})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await demo(page,app,2);
 await expect(page.locator('.winner-visual').first()).toHaveText('24');await expect(page.locator('.winner-paper')).toHaveCount(0);expect(await page.evaluate(()=>__soundLog)).toEqual([]);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(async()=>{await showWinnerStage(document.querySelector('#stage-test'),stageState,{level:2,fresh:true});});
 await expect(page.locator('.winner-paper')).toHaveCount(0);
 for(const kind of ['paused','spectator']){
  await page.evaluate(async(kind)=>{const s=structuredClone(stageState);s.code=kind;s.gamePaused=kind==='paused';s.you.id=kind==='spectator'?'watch':'a';await showWinnerStage(document.querySelector('#stage-test'),s,{level:2,fresh:true});},kind);
  await expect(page.locator('.winner-paper')).toHaveCount(0);await expect(page.locator('.winner-visual').first()).toHaveText('24');
 }
 expect(await page.evaluate(()=>__soundLog)).toEqual([]);
});
test('EXP-F4 newer result finishes counters and confetti before installing final state',async({page,app})=>{
 await demo(page,app,2);
 await page.evaluate(async()=>{finishWinnerStages();const s=structuredClone(stageState);s.roundNo=2;s.result.points.a=99;await showWinnerStage(document.querySelector('#stage-test'),s,{level:1,fresh:false});});
 await expect(page.locator('.winner-visual').first()).toHaveText('99');await expect(page.locator('.winner-paper')).toHaveCount(0);
 expect(await page.locator('#stage-test').evaluate(root=>root.getAnimations({subtree:true}).length)).toBe(0);
});
for(const endLevel of [2,3])test(`EXP-F4 real kit game ends with stage ${endLevel}, reload keeps final scores and no replay`,async({page,app,browser},info)=>{
 await login(page,app);await selectGame(page,'viergewinnt');await page.locator('#host-form button[type=submit]').click();await page.evaluate(()=>send('sit'));
 const code=await page.evaluate(()=>lastState.code),context=await browser.newContext({...info.project.use,viewport:page.viewportSize()}),other=await context.newPage();
 try{
  await login(other,app,'Ben');await other.evaluate(code=>joinAndEnter(code,'sit'),code);await expect.poll(()=>page.evaluate(()=>lastState.players.filter(p=>p.seated).length)).toBe(2);if(endLevel===3){expect((await page.evaluate(()=>send('programSave',{name:'Testabend',mode:'abend',entries:[{game:'viergewinnt'}]}))).ok).toBe(true);expect((await page.evaluate(()=>send('programStart'))).ok).toBe(true);}else expect((await page.evaluate(()=>send('start'))).ok).toBe(true);
  await expect.poll(()=>page.evaluate(()=>lastState.phase)).toBe('playing');
  for(let i=0;i<7;i++){const actor=await page.evaluate(()=>lastState.turnId===lastState.you.id)?page:other;const before=await page.evaluate(()=>lastState.turnId);await expect.poll(()=>actor.evaluate(()=>lastState.turnId===lastState.you.id)).toBe(true);expect((await actor.evaluate(col=>send('drop',{col}),i%2===0?0:1)).ok).toBe(true);await expect.poll(()=>page.evaluate(before=>lastState.phase==='over'||lastState.turnId!==before,before)).toBe(true);}
  await expect(page.locator(`.kg-over [data-winner-level="${endLevel}"]`)).toBeVisible();
  await page.reload();await expect(page.locator(`.kg-over [data-winner-level="${endLevel}"]`)).toBeVisible();await expect(page.locator('.winner-paper')).toHaveCount(0);
  await expect(page.locator('.kg-over-acts [data-kit="closeResult"]')).toBeVisible();if(endLevel===3)await expect(page.locator('.kg-over .winner-best')).toBeVisible();
 }finally{await context.close();}
});
test('EXP-F4 poker helper handles a real confirmed hand end',async({page,app,browser},info)=>{
 await login(page,app);await selectGame(page,'poker');await page.locator('#host-form button[type=submit]').click();await page.locator('[data-sit]').first().click();
 const code=await page.evaluate(()=>lastState.code),context=await browser.newContext({...info.project.use,viewport:page.viewportSize()}),other=await context.newPage();
 try{await login(other,app,'Ben');await other.evaluate(code=>joinAndEnter(code,'watch'),code);await other.locator('[data-sit]').first().click();await expect.poll(()=>page.evaluate(()=>lastState.seats.filter(Boolean).length)).toBe(2);expect((await page.evaluate(()=>send('start'))).ok).toBe(true);await expect.poll(()=>page.evaluate(()=>!!lastState.hand&&!lastState.hand.done)).toBe(true);
 const actor=await page.evaluate(()=>lastState.hand.toAct===lastState.you.seat)?page:other;expect((await actor.evaluate(()=>send('action',{type:'fold'}))).ok).toBe(true);await expect(page.locator('#game > [data-winner-level="1"]')).toBeVisible();
 }finally{await context.close();}
});
test('EXP-F4 confetti rAF budget, desktop with 4x CPU',async({page,app},info)=>{
 await login(page,app);const cdp=await page.context().newCDPSession(page),desktop=info.project.name==='desktop';if(desktop)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 try{const data=await page.evaluate(async()=>{
  const {mountStage}=await import('/motion/celebrate.js');const root=document.createElement('section');root.style.width='300px';document.querySelector('#hub-main').prepend(root);const times=[];let running=true;const tick=t=>{times.push(t);if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
  mountStage(root,{key:'fps',game:'demo',level:2,rows:[{name:'Anna',points:125,winner:true},{name:'Ben',points:15}],best:[],spectator:false,paused:false},{fresh:true});const particles=root.querySelectorAll('.winner-paper').length;
  await new Promise(resolve=>setTimeout(resolve,1200));running=false;return {fps:(times.length-1)*1000/(times.at(-1)-times[0]),frames:times.length,particles};
 });expect(data.particles).toBe(24);expect(data.frames).toBeGreaterThan(40);expect(data.fps).toBeGreaterThanOrEqual(desktop?45:55);writeFileSync(info.outputPath('celebrate-fps.json'),JSON.stringify({...data,cpuThrottle:desktop?4:1},null,2)+'\n');}
 finally{if(desktop)await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await cdp.detach();}
});

test('EXP-F4 disconnect suppresses catch-up celebration and hiding the stage ends pending work',async({page,app})=>{
 await demo(page,app,2);
 await page.evaluate(()=>socket.disconnect());
 await page.evaluate(async()=>{const s=structuredClone(stageState);s.code='after-disconnect';s.roundNo=9;await showWinnerStage(document.querySelector('#stage-test'),s,{level:2,fresh:true});});
 await expect(page.locator('.winner-paper')).toHaveCount(0);await expect(page.locator('.winner-visual').first()).toHaveText('24');
 const particles=await page.evaluate(async()=>{const m=await import('/motion/celebrate.js');const s=structuredClone(stageState);s.code='hide-active';const root=document.querySelector('#stage-test');m.mountStage(root,m.resultModel(s,{level:2}),{fresh:true});const count=root.querySelectorAll('.winner-paper').length;root.hidden=true;return count;});
 expect(particles).toBe(24);
 expect(await page.locator('#stage-test').evaluate(root=>root.getAnimations({subtree:true}).length)).toBe(0);
});
