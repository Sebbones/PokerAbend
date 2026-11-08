import { test, expect, login, selectGame } from './release-helpers.js';
import { GAMES } from '../../games/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { rules as correctedRules } from '../../public/games/release-rules.js';
test.describe.configure({mode:'parallel'});
test.skip(process.env.RELEASE_AUDIT !== '1','Long full-round release audit; enable explicitly with RELEASE_AUDIT=1.');
const selected = process.env.RELEASE_GAMES?.split(',');
const ids = Object.keys(GAMES).filter((id) => !selected || selected.includes(id));
const humanOnly = new Set(['wer-bin-ich','kritzelpost','bildunterschrift','malen-raten']);
const emit = async (p,event,data={}) => { const r = await p.evaluate(([e,d])=>send(e,d),[event,data]); expect(r?.ok,`${event}: ${r?.error}`).toBe(true); return r; };
const state = (p) => p.evaluate(() => lastState);
const finished = (s) => s.hand ? s.hand.done : s.phase === 'over' || (['hearts','skat','doppelkopf'].includes(s.game) && s.g?.stage === 'deal-over') || (s.game === 'backgammon' && s.g?.stage === 'between');
async function humanRound(id, peers) {
  const host=peers[0];
  for(let step=0;step<100;step++){
    const s=await state(host);if(finished(s))return;
    if(id==='wer-bin-ich'){
      if(s.g.stage==='words'){
        for(const p of peers){const v=await state(p);if(!v.g.myDraft)await emit(p,'wbWord',{text:'Release cat'});}
      }else if(s.g.sub==='ask'){
        const actor=peers.find((p)=>p._releaseId===s.turnId),other=peers.find((p)=>p!==actor);
        const visible=(await state(other)).g.words[s.turnId];expect(typeof visible).toBe('string');
        expect((await state(actor)).g.words[s.turnId]).toBeNull();await emit(actor,'wbGuess',{text:visible});
      }else if(s.g.sub==='gvote'){
        for(const p of peers){const v=await state(p);if(v.g.gv&&v.g.gv.by!==v.you.id&&v.g.gv.mine===null)await emit(p,'wbVote',{ok:true});}
      }
    }else if(s.g.stage==='reveal')await emit(host,'next');
    else{
      for(const p of peers){
        const v=await state(p),g=v.g;if(v.phase!=='playing')continue;
        if(g.stage==='vote'&&g.canVote&&g.myVote===null){const a=g.answers.find(a=>!a.mine);if(a)await emit(p,'vote',{key:g.key,choice:a.i});}
        else if(g.stage==='write'&&g.draw&&!g.ready){
          await emit(p,'drawing',{key:g.key,strokes:[{color:'#172b25',size:8,points:[[100,100],[800,800],[100,800]]}],done:id!=='malen-raten'});
          if(id==='malen-raten'){
            for(const q of peers.filter(q=>q!==p)){const x=await state(q);if(x.g.canWrite)await emit(q,'answer',{key:x.g.key,text:g.prompt});}
          }
        }else if(g.stage==='write'&&g.canWrite&&!g.ready&&id!=='malen-raten')await emit(p,'answer',{key:g.key,text:'A release test picture'});
      }
    }
    await host.waitForTimeout(100);
  }
  throw Error('Multi-context round did not finish');
}
function fastSettings(game) {
  const settings = {};
  for (const o of game.options || []) if (o.type === 'number') {
    if (['rounds','cycles','lives','health','target','handSize','stockSize','playSecs','writeSecs','voteSecs','nightSecs','daySecs','revealSecs','buildSecs','heatSecs','challengeTime','voteTime','matchPoints','pointsToWin'].includes(o.key)) settings[o.key] = Math.max(o.min, o.key === 'target' ? 50 : o.min);
    if (o.key === 'turnTime') settings[o.key] = 0;
  }
  if (game.id === 'scrabble') settings.challenge = false;
  if (['poker','omaha','omaha-hi-lo','short-deck','five-card-draw','seven-card-stud'].includes(game.id)) Object.assign(settings,{autoNext:false,turnTime:0,startStack:500,smallBlind:10,bigBlind:20});
  return settings;
}
async function measure(page) {
  return page.evaluate(() => {
    const root=document.querySelector('#game-root'), visible=(e)=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const small=[...root.querySelectorAll('button,input[type=checkbox],select')].filter(e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true').map(e=>{const b=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,60),width:Math.round(b.width),height:Math.round(b.height),cls:e.className};}).filter(b=>b.width<44||b.height<44);
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,small};
  });
}
for (const id of ids) test(`Release ${id}: legal full round, rules, English, targets, pause and reconnect`,async({page,app,browser},info)=>{
  test.setTimeout(240000);
  const report={id,project:info.project.name,checks:{},notes:[],errors:[],samples:[]},contexts=[],peers=[page];
  const dir=`artifacts/release-2026-11-08/${info.project.name}/${id}`;mkdirSync(dir,{recursive:true});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  try {
    await login(page,app);await selectGame(page,id);await page.locator('#host-form button[type=submit]').click();
    await expect.poll(()=>page.evaluate(()=>lastState?.game)).toBe(id);
    const game=GAMES[id],code=(await state(page)).code,settings=fastSettings(game);
    await emit(page,'settings',settings);report.settings=(await state(page)).settings;
    await emit(page,'sit',['poker','omaha'].includes(game.id)?{seat:0}:{});
    for(let i=1;i<Math.max(game.minPlayers,2);i++){
      if(humanOnly.has(id)){
        const context=await browser.newContext({...info.project.use});contexts.push(context);const other=await context.newPage();
        other.on('pageerror',e=>report.errors.push(e.message));await login(other,app,'Player '+i);await other.evaluate(code=>joinAndEnter(code,'sit'),code);peers.push(other);
      } else await emit(page,'addBot');
    }
    await emit(page,'start');report.checks.started=true;
    const initial=await state(page);report.samples.push({stage:'playing',...await measure(page)});
    await emit(page,'gamePause',{paused:true});
    const paused=await state(page);await page.waitForTimeout(250);const after=await state(page);
    report.checks.pause=after.gamePaused===true&&after.roundNo===paused.roundNo&&after.turnId===paused.turnId;
    const identity=paused.you.id;await page.reload();
    await expect.poll(()=>page.evaluate(()=>lastState?.you?.id)).toBe(identity);
    report.checks.reconnect=(await state(page)).gamePaused===true;
    await emit(page,'gamePause',{paused:false});
    await page.evaluate(()=>I18n.select('en'));
    await page.evaluate(()=>window.gameRulesReady);
    await page.waitForTimeout(300);
    report.samples.push({stage:'english',...await measure(page)});
    report.englishText=await page.locator('#game-root').innerText();
    // Existing help/Rules entry points; no source mutation or injected renderer.
    const help=page.locator('#kg [data-kit=help], [data-help]');
    if(await help.count()){
      await help.first().click();const more=page.locator('[data-help-more]');if(await more.count())await more.click();
      const rules=page.locator('#kg-panel-body, #help-dlg[open]');report.rulesText=await rules.first().innerText();report.checks.rulesVisible=!!report.rulesText.trim();
      report.samples.push({stage:'rules',...await measure(page)});
      const close=page.locator('#kg-panel .icon-btn[data-kit=close], #help-dlg[open] [data-help-close]');if(await close.count())await close.first().click();
      else if(await page.locator('#help-dlg[open]').count())await page.keyboard.press('Escape');
    } else {
      const button=page.locator('[data-panel=rules]');if(await button.count()) { await button.first().click(); report.rulesText=await page.locator('body').innerText();report.checks.rulesVisible=true; const close=page.locator('[data-close-panel]');if(await close.count())await close.first().click(); }
    }
    await page.screenshot({path:dir+'/playing.png',fullPage:true});
    expect(report.checks.rulesVisible,'The actual Rules tab opens').toBe(true);
    if(correctedRules[id]){
      for(const paragraph of correctedRules[id])expect(report.rulesText).toContain(paragraph);
      report.checks.correctedEnglishRules=true;
    }
    if(info.project.name==='mobil'){
      const chrome=await page.locator('#game-root .home-btn,#game-root .nav-btn,#game-root .help-btn').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};}));
      expect(chrome.every(r=>r.width>=44&&r.height>=44),'Game navigation touch targets are at least 44px').toBe(true);
      report.checks.chrome44=true;
    }
    if(humanOnly.has(id)){for(const p of peers)p._releaseId=(await state(p)).you.id;await humanRound(id,peers);}
    else await app.control(code,true);
    const end=Date.now()+180000;
    while(Date.now()<end){
      const s=await state(page),drive=await app.control(code);
      if(drive.report?.errors.length)throw Error('Automation action: '+JSON.stringify(drive.report.errors));
      if(finished(s)){report.checks.ended=true;report.result=s.result||s.hand?.result;break;}
      await page.waitForTimeout(250);
    }
    await app.control(code,false);
    report.driver=(await app.control(code)).report;
    expect(report.checks.ended,'A natural game/round end, not a turn limit or abort').toBe(true);
    report.samples.push({stage:'result',...await measure(page)});
    report.resultText=await page.locator('#game-root').innerText();
    report.checks.resultVisible=!!await page.locator('.kg-over,.p-result,.showdown,.result-box,.hr-ledger,.bgm-last,.sk-summary,.dk-summary').count()||!!report.resultText.match(/winner|wins|game over|result|finished|showdown|tie|round over|deal scored|game scored|gewinnt|teilen sich/i);
    expect(report.checks.resultVisible,'A visible result or awards display').toBe(true);
    if((await state(page)).phase==='over'&&await page.locator('#kg-over-title').count())expect(await page.locator('#kg-over-title').innerText()).not.toMatch(/gewinnt|Punkte|beendet/);
    await page.screenshot({path:dir+'/result.png',fullPage:true});
    expect(report.errors).toEqual([]);expect(report.checks.pause).toBe(true);expect(report.checks.reconnect).toBe(true);
    expect(report.samples.every(s=>!s.overflow),'No horizontal overflow').toBe(true);
    if(info.project.name==='mobil')expect(report.samples.flatMap(s=>s.small),'All measured enabled phone controls are at least 44px').toEqual([]);
  } catch(e){report.failure=e.message;throw e;}
  finally {await Promise.all(contexts.map(c=>c.close()));writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));}
});
