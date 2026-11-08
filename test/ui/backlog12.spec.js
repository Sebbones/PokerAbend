import {test,expect,login,selectGame} from './helpers.js';import {mkdirSync} from 'node:fs';import {holds,digitsOf} from '../../games/reaktor-notfall/logic.js';
const ids=['schatzgraeber','brueckenroulette','reaktor-notfall'];
const emit=async(p,e,d={})=>{const r=await p.evaluate(([e,d])=>send(e,d),[e,d]);expect(r.ok,r.error).toBe(true);return r;};
const frame=p=>p.evaluate(()=>!window.wsFrame||lastState.g.runId!==wsFrame.runId||lastState.g.tick>=wsFrame.tick?lastState.g:wsFrame);
async function capture(p,info,id,name){const dir=`artifacts/backlog12-ui/${id}`;mkdirSync(dir,{recursive:true});await p.screenshot({path:`${dir}/${info.project.name}-${name}.png`,fullPage:true});}
async function wire(p){await p.evaluate(()=>{window.wsFrame=lastState.g;window.wsPackets=[];socket.on('arena',g=>{wsFrame=g;wsPackets.push(g);if(wsPackets.length>150)wsPackets.shift();});});}
async function hold(p,dir,touch){if(!touch){const key={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'}[dir];await p.keyboard.down(key);return()=>p.keyboard.up(key);}const stick=p.locator('[data-ws-stick]'),b=await stick.boundingBox(),off={left:[-32,0],right:[32,0],up:[0,-32],down:[0,32]}[dir],cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2+off[0],y:b.y+b.height/2+off[1]}]});return async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();};}
// Deutsche Hinweistexte zurück in prüfbare Aussagen verwandeln – so löst der Test wie eine Person, nicht über Serverwissen.
const L='ABCDE',idx=s=>L.indexOf(s);
function parse(textDe){let m;
 if(m=textDe.match(/^Regler (\w) steht auf einer (geraden|ungeraden) Ziffer\.$/))return {k:'parity',a:idx(m[1]),v:m[2]==='geraden'?0:1};
 if(m=textDe.match(/^Regler (\w) steht höher als Regler (\w)\.$/))return {k:'cmp',a:idx(m[1]),b:idx(m[2])};
 if(m=textDe.match(/^Regler (\w) und Regler (\w) ergeben zusammen (\d+)\.$/))return {k:'sum2',a:idx(m[1]),b:idx(m[2]),v:+m[3]};
 if(m=textDe.match(/^Regler (\w) steht auf höchstens (\d+)\.$/))return {k:'max',a:idx(m[1]),v:+m[2]};
 if(m=textDe.match(/^Regler (\w) steht auf mindestens (\d+)\.$/))return {k:'min',a:idx(m[1]),v:+m[2]};
 if(m=textDe.match(/^Regler (\w) und Regler (\w) unterscheiden sich um genau (\d+)\.$/))return {k:'diff',a:idx(m[1]),b:idx(m[2]),v:+m[3]};
 if(m=textDe.match(/^Regler (\w) steht auf 0, 3, 6 oder 9\.$/))return {k:'mult3',a:idx(m[1])};
 if(m=textDe.match(/^Alle Regler zusammen ergeben (\d+)\.$/))return {k:'total',v:+m[1]};
 throw Error('Unbekannter Hinweis: '+textDe);}
const solve=(len,clues)=>{const out=[];for(let i=0;i<10**len;i++){const d=digitsOf(i,len);if(clues.every(c=>holds(c,d)))out.push(d.join(''));}return out;};
async function enterCode(p,codeValue){await p.locator('#pk-in').fill(codeValue);await p.locator('.pk-send').click();}
for(const id of ids)test(`BACKLOG-12 ${id}: own scene, DE/EN, real touch/keyboard, private views, pause/reload and normal result`,async({page,app,browser},info)=>{
 test.setTimeout(240000);const touch=info.project.name==='mobil';await login(page,app);await selectGame(page,id);await page.locator('#host-form button[type=submit]').click();
 if(id==='schatzgraeber')await expect(page.locator('.ws-lobby svg')).toBeVisible();else await expect(page.locator(id==='brueckenroulette'?'.br-lobby svg':'.rn-lobby svg')).toBeVisible();
 await capture(page,info,id,'lobby');
 await emit(page,'settings',id==='schatzgraeber'?{playSecs:20}:id==='brueckenroulette'?{rounds:2,writeSecs:30,revealSecs:3}:{rounds:2,heatSecs:180,penaltySecs:10,revealSecs:3});
 await emit(page,'sit');await emit(page,'addBot');
 const code=await page.evaluate(()=>lastState.code),gc=await browser.newContext({viewport:page.viewportSize()}),wc=await browser.newContext({viewport:page.viewportSize()});
 try{
  const guest=await gc.newPage(),watch=await wc.newPage();await login(guest,app,'Ben');await guest.evaluate(code=>joinAndEnter(code,'sit'),code);await login(watch,app,'Observer');await watch.evaluate(code=>joinAndEnter(code,'watch'),code);
  if(id==='schatzgraeber')for(const p of [page,guest,watch])await wire(p);
  await page.locator('#kg [data-kit=help]').click();await page.locator('[data-help-more]').click();await expect(page.locator('.kg-rules')).toContainText(id==='schatzgraeber'?'Server':id==='brueckenroulette'?'Planke':'Reglerstellung');await page.locator('#kg-panel .icon-btn[data-kit=close]').click();
  await page.evaluate(()=>I18n.select('en'));await page.locator('#kg [data-kit=help]').click();await page.locator('[data-help-more]').click();await expect(page.locator('.kg-rules')).toContainText(id==='schatzgraeber'?'server':id==='brueckenroulette'?'plank':'regulator');await capture(page,info,id,'english-rules');await page.locator('#kg-panel .icon-btn[data-kit=close]').click();
  await emit(page,'start');
  // ---------- spielbezogene Abläufe ----------
  if(id==='schatzgraeber'){
   await expect.poll(()=>page.evaluate(()=>wsFrame?.elapsed??-3000),{timeout:12000}).toBeGreaterThanOrEqual(0);await page.bringToFront();
   const you=await page.evaluate(()=>lastState.you.id),before=(await frame(page)).bodies.find(p=>p.id===you).x,release=await hold(page,'left',touch);try{await expect.poll(async()=>(await frame(page)).bodies.find(p=>p.id===you).x).toBeLessThan(before-15);}finally{await release();}
   if(touch)await page.locator('[data-g=ws-dig]').tap();else await page.keyboard.press('Space');
   await expect.poll(async()=>(await frame(page)).bodies.find(p=>p.id===you).digCell,{timeout:3000}).toBeGreaterThanOrEqual(0);
   await expect.poll(async()=>(await frame(page)).dug.length,{timeout:5000}).toBeGreaterThan(0);
   await expect.poll(async()=>(await frame(guest)).dug.length).toBeGreaterThan(0);await expect(page.locator('#rt-state')).toContainText(/Treasures|Schätze/);
  }
  if(id==='brueckenroulette'){
   await expect(page.locator('.br-bridge')).toBeVisible();await expect(page.locator('.br-pick')).toHaveCount(3);
   if(touch)await page.locator('.br-pick').nth(1).tap();else await page.locator('.br-pick').nth(1).click();
   await expect.poll(()=>page.evaluate(()=>lastState.g.own)).toBe(1);await expect(page.locator('.br-mine')).toHaveCount(1);
   expect(await guest.evaluate(()=>lastState.g.own)).toBe(null);expect(await watch.evaluate(()=>JSON.stringify(lastState.g).includes('"rows"'))).toBe(false);await capture(page,info,id,'chosen');await guest.locator('.br-pick').first().click();
  }
  if(id==='reaktor-notfall'){
   await expect(page.locator('.rn-dials')).toBeVisible();const mine=await page.evaluate(()=>lastState.g.mine.map(m=>m[0])),theirs=await guest.evaluate(()=>lastState.g.mine.map(m=>m[0]));
   expect(mine.length).toBeGreaterThan(0);await expect(page.locator('.rn-clues li')).toHaveCount(mine.length);const text=await page.locator('.rn-board').innerText();for(const c of theirs)if(!mine.includes(c))expect(text).not.toContain(c);
   expect(await watch.evaluate(()=>lastState.g.mine.length)).toBe(0);expect(await watch.evaluate(()=>JSON.stringify(lastState.g).includes('"result"'))).toBe(false);
  }
  await capture(page,info,id,'playing');
  // ---------- Pause, Berechtigung, Neuladen ----------
  const denied=await guest.evaluate(()=>send('gamePause',{paused:true}));expect(denied.ok).toBe(false);await emit(page,'gamePause',{paused:true});const saved=await page.evaluate(()=>({id:lastState.you.id,own:lastState.g.own,props:lastState.g.proposals,dug:lastState.g.dug,bodies:lastState.g.bodies}));
  await capture(page,info,id,'paused');await capture(watch,info,id,'spectator');await page.reload();await expect.poll(()=>page.evaluate(()=>lastState?.gamePaused)).toBe(true);expect(await page.evaluate(()=>lastState.you.id)).toBe(saved.id);expect(await page.evaluate(()=>lastState.g.own)).toEqual(saved.own);if(id==='schatzgraeber')expect(await page.evaluate(()=>lastState.g.dug)).toEqual(saved.dug);await capture(page,info,id,'reconnect');
  for(const [width,height]of (touch?[[390,844],[360,800]]:[[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]])){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} ${width}`).toBe(true);await capture(page,info,id,`layout-${width}x${height}`);}
  await page.setViewportSize(touch?{width:390,height:844}:{width:1440,height:900});if(id==='schatzgraeber')await wire(page);await emit(page,'gamePause',{paused:false});
  // ---------- bis zum regulären Ende ----------
  if(id==='brueckenroulette'){
   await expect.poll(()=>page.evaluate(()=>lastState.g.stage),{timeout:30000}).toBe('reveal');await expect(page.locator('.br-broken')).toHaveCount(1);await capture(page,info,id,'reveal');
   await expect.poll(()=>page.evaluate(()=>`${lastState.g.q}:${lastState.g.stage}`),{timeout:20000}).toBe('2:write');
   for(const p of [page,guest]){await p.locator('.br-pick').first().click();}
  }
  if(id==='reaktor-notfall'){
   const solveTask=async()=>{await expect.poll(()=>page.evaluate(()=>lastState.g.stage)).toBe('write');const [a,b]=[page,guest],gather=async p=>p.evaluate(()=>({len:lastState.g.len,mine:lastState.g.mine.map(m=>m[0]),shared:lastState.g.shared.map(s=>s.text[0])})),A=await gather(a),B=await gather(b);const clues=[...A.mine,...B.mine,...A.shared].map(parse);const options=solve(A.len,clues);expect(options.length).toBe(1);return {options,len:A.len,botOptions:solve(A.len,A.shared.map(parse))};};
   let task=await solveTask();const wrong=task.botOptions.find(o=>o!==task.options[0]);
   if(wrong){await enterCode(page,wrong);await expect(page.locator('.rn-proposals')).toContainText(wrong);await enterCode(guest,wrong);
    await expect.poll(()=>page.evaluate(()=>lastState.g.mistakes),{timeout:8000}).toBe(1);await capture(page,info,id,'penalty');
    for(const p of [page,guest])await expect(p.locator('.pk-input')).toBeVisible();}
   await enterCode(page,task.options[0]);await expect(page.locator('.rn-proposals')).toContainText(task.options[0]);await enterCode(guest,task.options[0]);
   await expect.poll(()=>page.evaluate(()=>lastState.g.stage),{timeout:10000}).toBe('reveal');await expect(page.locator('.rn-ok')).toBeVisible();await capture(page,info,id,'reveal');
   await expect.poll(()=>page.evaluate(()=>`${lastState.g.q}:${lastState.g.stage}`),{timeout:20000}).toBe('2:write');
   task=await solveTask();await enterCode(page,task.options[0]);await enterCode(guest,task.options[0]);
  }
  await expect.poll(()=>page.evaluate(()=>lastState.phase),{timeout:id==='schatzgraeber'?40000:60000}).toBe('over');await expect(page.locator('.kg-over,.pk-final').first()).toBeVisible();
  if(id==='reaktor-notfall')expect(await page.evaluate(()=>lastState.result.winners.length)).toBe(3);
  expect(await page.evaluate(()=>Object.values(lastState.result.points).every(Number.isFinite))).toBe(true);await capture(page,info,id,'result');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(id==='schatzgraeber'){await expect(page.locator('#kg-over-title')).toHaveText('The highest score wins.');expect(await watch.evaluate(()=>wsPackets.every(g=>!JSON.stringify(g).includes('"field"')&&g.dug.every(d=>['treasure','bomb','empty'].includes(d.k))&&g.bodies.reduce((s,p)=>s+p.bag,0)+g.treasuresLeft===g.treasuresTotal))).toBe(true);}
 }finally{await gc.close();await wc.close();}
});
