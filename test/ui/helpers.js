import { test as base, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const password = 'BlockA-Testpasswort';

// Jeder Test erhält einen eigenen Server, freien Port und temporäre Spieldaten.
// Passwortschutz und Rate-Limits laufen dabei unverändert mit.
export const test = base.extend({
  ticketAdminPassword: ['', { option: true }],
  adminPassword: ['', { option: true }],
  // Dateien (Name → JSON-Inhalt), die vor dem Serverstart im Datenordner liegen sollen (z. B. eine vorbefüllte Bestenliste)
  seedFiles: [{}, { option: true }],
  createLimit: ['6', { option: true }],
  app: async ({ ticketAdminPassword, adminPassword, createLimit, seedFiles }, use) => {
    const dataDir = mkdtempSync(join(tmpdir(), 'spieleabend-ui-'));
    for (const [name, content] of Object.entries(seedFiles)) writeFileSync(join(dataDir, name), JSON.stringify(content));
    const child = spawn(process.execPath, ['--input-type=module', '-e', `
      const { http } = await import('./server/index.js');
      const ready = () => console.log('TEST_READY:' + http.address().port);
      if (http.listening) ready(); else http.once('listening', ready);
    `], {
      cwd: root,
      env: { ...process.env, PORT: '0', DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: password, TICKET_ADMIN_PASSWORD: ticketAdminPassword, ADMIN_PASSWORD: adminPassword, CREATE_LIMIT: createLimit },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stderr.on('data', (d) => { output += d; });
    try {
      const url = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Testserver startet nicht: ' + output)), 45000); // auf ausgelasteten Rechnern braucht der Start länger
        child.once('error', (e) => { clearTimeout(timer); reject(e); });
        child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Testserver beendet (${code}): ${output}`)); });
        child.stdout.on('data', (d) => {
          output += d;
          const match = output.match(/TEST_READY:(\d+)/);
          if (match) { clearTimeout(timer); resolve('http://localhost:' + match[1]); }
        });
      });
      await use({ url, password, ticketAdminPassword, adminPassword });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const stopped = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await stopped;
      }
    }
  },
  page: async ({ page, app }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await use(page);
    // Keep the isolated server alive until the page is closed. Otherwise a
    // late presence/background request races app teardown and reports a false
    // ERR_CONNECTION_REFUSED in the browser-error assertion.
    if(!page.isClosed())await page.close();
    expect(errors, 'JavaScript- und Browserfehler').toEqual([]);
  },
});

export { expect };

export async function selectGame(page, id) {
  await page.evaluate(() => { location.hash = '#spiele'; });
  await page.locator(`[data-host="${id}"]`).first().click();
}

export async function login(page, app, name = 'Anna') {
  await page.addInitScript((name) => {
    if (!localStorage.getItem('poker:name')) {
      localStorage.setItem('poker:name', JSON.stringify(name));
      localStorage.setItem('poker:avatar', JSON.stringify('🦉'));
      localStorage.setItem('poker:prefs', JSON.stringify({ intros: false }));
    }
  }, name);
  // Die Einführung gehört nicht zum Lobby-Test; bei Bedarf wie ein Nutzer schließen.
  await page.addLocatorHandler(page.locator('#intro-dlg[open]'), async () => {
    await page.getByRole('button', { name: 'Überspringen', exact: true }).click();
  });
  await page.goto(app.url);
  await page.getByLabel('Passwort').fill(app.password);
  await page.getByRole('button', { name: 'Reinkommen' }).click();
  await expect(page.locator('#hub')).toBeVisible();
}

export async function screenshot(page, name) {
  const dir = join(root, 'artifacts', 'block-a');
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}-${page.viewportSize().width}.png`), fullPage: true });
}

// ---------- EXP-F6: additive experience assertions ----------
import { inspectPresentation } from '../helpers/presentation-audit.js';
import { MUST_HAVE_SECRETS } from '../helpers/leak-audit.js';
const viewRecords = new WeakMap(), liveViewRecords = new Set();

// Call before navigation for additional players created outside the base page fixture.
export function observeServerView(page) {
  if(viewRecords.has(page))return;
  const record={page,views:[]};viewRecords.set(page,record);liveViewRecords.add(record);
  page.on('websocket',socket=>{
    try{if(new URL(socket.url()).host!==new URL(page.url()).host)return;}catch{return;}
    socket.on('framereceived',({payload})=>{
      const raw=typeof payload==='string'?payload:payload.toString('utf8');
      if(!raw.startsWith('42'))return;
      try{
        const packet=JSON.parse(raw.slice(raw.indexOf('[')));
        if(packet[0]!=='state'||!packet[1]?.code||!packet[1]?.game)return;
        record.views.push(packet[1]);if(record.views.length>32)record.views.shift();
      }catch{/* non-state Socket.IO traffic is not an oracle */}
    });
  });
  page.once('close',()=>liveViewRecords.delete(record));
}
test.beforeEach(async({page})=>{observeServerView(page);});

/** Measure the action and newly started finite WAAPI work under 4x CDP CPU throttling. */
export async function expectSmoothMotion(page, action, { minFps, timeout=10000 } = {}) {
  if(typeof action!=='function')throw new TypeError('expectSmoothMotion needs an action function');
  const mobile=await page.evaluate(()=>matchMedia('(pointer: coarse)').matches);
  const budget=minFps??(mobile?60:45);
  if(!Number.isFinite(budget)||budget<=0)throw new TypeError('minFps must be positive');
  const session=await page.context().newCDPSession(page);
  let started=false;
  try{
    await session.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.evaluate(()=>{
      if(window.__experienceFps)throw Error('A motion measurement is already active');
      const before=new WeakSet(document.getAnimations()),state={times:[],animations:0,done:false,idle:0,stop:false,raf:0};
      state.promise=new Promise(resolve=>state.resolve=resolve);
      const tick=time=>{
        state.times.push(time);
        const fresh=document.getAnimations().filter(a=>!before.has(a)&&Number.isFinite(a.effect?.getComputedTiming().endTime)&&a.playState!=='finished'&&a.playState!=='idle');
        state.animations=Math.max(state.animations,fresh.length);
        state.idle=state.done&&!fresh.length?state.idle+1:0;
        if(state.stop||state.idle>=2){state.resolve();return;}
        state.raf=requestAnimationFrame(tick);
      };
      window.__experienceFps=state;state.raf=requestAnimationFrame(tick);
    });started=true;
    // Start at a frame boundary so protocol round trips do not add an unsampled warmup.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    await action();
    const result=await page.evaluate(async timeout=>{
      const state=window.__experienceFps;state.done=true;
      let timer;
      try{await Promise.race([state.promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Motion did not settle within '+timeout+' ms')),timeout);})]);}
      finally{clearTimeout(timer);}
      const intervals=state.times.length-1,duration=state.times.at(-1)-state.times[0];
      return {frames:state.times.length,duration,rawFps:intervals*1000/duration,animations:state.animations,cpuThrottle:4};
    },timeout);
    const fps=Math.round(result.rawFps*100)/100;
    const message=`Motion: ${fps} FPS (raw ${result.rawFps.toFixed(4)}), budget ${budget}, ${result.frames} frames / ${result.duration.toFixed(1)} ms, 4x CPU, ${result.animations} new animations`;
    expect(result.frames,message+'; action must span at least eight frames').toBeGreaterThanOrEqual(8);
    expect(result.duration,message+'; action is too short for a useful sample').toBeGreaterThanOrEqual(200);
    expect(fps,message).toBeGreaterThanOrEqual(budget);
    return {...result,fps,minFps:budget};
  }finally{
    if(started)await page.evaluate(()=>{const state=window.__experienceFps;if(state){state.stop=true;cancelAnimationFrame(state.raf);state.resolve();delete window.__experienceFps;}}).catch(()=>{});
    await session.send('Emulation.setCPUThrottlingRate',{rate:1}).catch(()=>{});
    await session.detach().catch(()=>{});
  }
}

/** EXP-F1 logging must be enabled BEFORE the sound-producing action. */
export async function expectSound(page,event,{timeout=2500,since=0}={}) {
  const matcher=typeof event==='string'?{event}:event;
  if(!matcher?.event)throw new TypeError('expectSound needs an event name');
  expect(await page.evaluate(()=>Array.isArray(window.__soundLog)),'Enable window.__soundLog = [] before the action').toBe(true);
  let found;
  await expect.poll(async()=>{
    const log=await page.evaluate(()=>window.__soundLog);
    found=log.slice(since).find(entry=>entry&&Object.entries(matcher).every(([key,value])=>entry[key]===value));
    return !!found;
  },{timeout,message:`Expected sound ${JSON.stringify(matcher)} in __soundLog since index ${since}`}).toBe(true);
  return found;
}

/** Compare DOM and animation targets with runner-captured server views, never browser-mutated lastState. */
export async function expectNoLeak(page,{serverView,peers,scope='#game-root',action,requireSecrets}={}) {
  const recorder=async()=>page.evaluate(scope=>{
    if(window.__experienceLeakCapture)throw Error('A leak capture is already active');
    const roots=[...document.querySelectorAll(scope)];if(!roots.length)throw Error('No presentation root for '+scope);
    const state={samples:[],overflow:false,observer:null,original:Element.prototype.animate};
    const sample=(node,kind='dom',frames=[])=>{
      if(!(node instanceof Element)||['SCRIPT','STYLE','LINK','META'].includes(node.tagName))return;
      if(!roots.some(root=>root===node||root.contains(node)))return;
      if(state.samples.length>=12000){state.overflow=true;return;}
      const attributes=Object.fromEntries([...node.attributes].filter(a=>a.name.startsWith('data-')||['src','href','style','aria-label','alt','title'].includes(a.name)).map(a=>[a.name,a.value]));
      const path=node.dataset.viewPath;
      const value=node.dataset.viewValue??attributes['data-card']??attributes['data-die-value'];
      state.samples.push({kind,tag:node.tagName,path,value,text:node.children.length?'':node.textContent,attributes,frames,dice:node.matches('[data-die-value],[data-dice-value],[data-dice-values],.die,.dice')});
    };
    const scan=(root,kind='dom')=>{sample(root,kind);for(const node of root.querySelectorAll('*'))sample(node,kind);};
    for(const root of roots)scan(root);
    for(const animation of document.getAnimations()){
      const target=animation.effect?.target;
      if(target instanceof Element)sample(target,'animation',animation.effect.getKeyframes().flatMap(frame=>Object.values(frame).filter(v=>typeof v==='string')));
    }
    if(typeof state.original==='function')Element.prototype.animate=function(frames,options){
      scan(this,'animation');sample(this,'animation',Array.isArray(frames)?frames.flatMap(frame=>Object.values(frame).filter(v=>typeof v==='string')):Object.values(frames||{}).flat().filter(v=>typeof v==='string'));
      return state.original.call(this,frames,options);
    };
    state.observer=new MutationObserver(records=>{
      for(const record of records){
        const node=record.target.nodeType===1?record.target:record.target.parentElement;if(node)scan(node);
        if(record.oldValue!==null&&state.samples.length<12000)state.samples.push({kind:'dom',tag:node?.tagName||'text',text:record.type==='characterData'?record.oldValue:'',attributes:record.type==='attributes'?{[record.attributeName]:record.oldValue}:{},frames:[],dice:!!node?.matches?.('[data-die-value],[data-dice-value],.die,.dice')});
        for(const added of record.addedNodes||[])if(added.nodeType===1)scan(added);
      }
    });
    for(const root of roots)state.observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,characterDataOldValue:true});
    state.finish=()=>{state.observer.disconnect();Element.prototype.animate=state.original;for(const root of roots)scan(root);return {samples:state.samples,overflow:state.overflow};};
    window.__experienceLeakCapture=state;
  },scope);
  await recorder();
  let capture;
  try{if(action)await action();capture=await page.evaluate(()=>window.__experienceLeakCapture.finish());}
  finally{await page.evaluate(()=>{const state=window.__experienceLeakCapture;if(state){state.observer.disconnect();Element.prototype.animate=state.original;delete window.__experienceLeakCapture;}}).catch(()=>{});}
  expect(capture.overflow,'Presentation capture exceeded 12,000 samples; narrow the scope').toBe(false);
  const view=serverView??viewRecords.get(page)?.views.at(-1);
  expect(!!view,'No captured server view; observeServerView(page) before joining the room or supply a fixture serverView').toBe(true);
  const others=peers??[...liveViewRecords].filter(record=>record.page!==page&&!record.page.isClosed()).map(record=>record.views.at(-1));
  const result=inspectPresentation(view,others,capture.samples);
  if(requireSecrets??MUST_HAVE_SECRETS.includes(view.game)){
    expect(result.compared,'Private game needs another runner-captured player view; observeServerView(peer) before navigation').toBeGreaterThan(0);
    expect(result.privateValues,'No differential private values were exercised; use a view before reveal').toBeGreaterThan(0);
  }
  expect(result.samples,'No DOM/animation samples inspected').toBeGreaterThan(0);
  expect(result.problems,`Presentation leaks for ${view.game}: ${JSON.stringify(result.problems)}`).toEqual([]);
  return result;
}
