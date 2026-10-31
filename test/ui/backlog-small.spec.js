import {test,expect,login,selectGame} from './helpers.js';
import {inferNext} from '../../games/zahlenreihe/room.js';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
test.use({createLimit:'100'});
async function emit(page,event,data={}){const r=await page.evaluate(({event,data})=>send(event,data),{event,data});expect(r.ok,`${event}: ${r.error}`).toBe(true);return r;}
async function table(page,browser,app,info,id,settings={}){
  if(page.url()==='about:blank')await login(page,app,'Anna');else{await page.goto(app.url);await expect(page.locator('#hub')).toBeVisible();}await selectGame(page,id);await page.locator('#host-form button[type=submit]').click();await expect(page.locator('#kg')).toBeVisible();await emit(page,'sit');await emit(page,'settings',{turnTime:0,...settings});
  const code=await page.evaluate(()=>lastState.code),contexts=[],pages=[page],errors=[];
  const add=async(name,sit=true)=>{const context=await browser.newContext({...info.project.use,viewport:page.viewportSize(),reducedMotion:'reduce'});contexts.push(context);const peer=await context.newPage();peer.on('pageerror',(e)=>errors.push(e.message));await login(peer,app,name);await peer.evaluate(({code,sit})=>joinAndEnter(code,sit?'sit':'watch'),{code,sit});await expect.poll(()=>peer.evaluate(()=>lastState?.code)).toBe(code);if(sit)pages.push(peer);return peer;};
  await add('Ben');if(id==='story-chaos')await add('Carla');await emit(page,'start');await expect.poll(()=>page.evaluate(()=>lastState.phase)).toBe('playing');
  return {pages,add,close:async()=>{for(const context of contexts)await context.close();expect(errors).toEqual([]);}};
}
async function shot(page,info,name){const out=resolve('artifacts/backlog-small',info.project.name);mkdirSync(out,{recursive:true});await page.screenshot({path:resolve(out,name+'.png'),fullPage:true});}

test('Risk Dice: real rolls, explicit banking, synchronized opponent, pause, language and reconnect',async({page,browser,app},info)=>{
  test.setTimeout(70000);const room=await table(page,browser,app,info,'risiko-wuerfeln',{target:50});
  try{
    await expect(page.locator('[data-g=risk-bank]')).toBeDisabled();let actor=page;
    for(let n=0;n<20;n++){
      const turn=await page.evaluate(()=>lastState.turnId);for(const peer of room.pages)if(await peer.evaluate(()=>lastState.you.id)===turn)actor=peer;
      await actor.locator('[data-g=risk-roll]').click();await expect.poll(()=>actor.evaluate(()=>lastState.g.pot>0||lastState.turnId!==lastState.you.id)).toBe(true);if(await actor.evaluate(()=>lastState.g.pot>0))break;
    }
    const before=await actor.evaluate(()=>({id:lastState.you.id,pot:lastState.g.pot,banked:lastState.g.banked[lastState.you.id]}));expect(before.pot).toBeGreaterThan(0);await actor.locator('[data-g=risk-bank]').click();await expect.poll(()=>page.evaluate((id)=>lastState.g.banked[id],before.id)).toBe(before.banked+before.pot);await expect.poll(()=>room.pages[1].evaluate((id)=>lastState.g.banked[id],before.id)).toBe(before.banked+before.pot);
    await emit(page,'gamePause',{paused:true});await expect(room.pages[1].locator('#game-pause-banner')).toBeVisible();const next=(await page.evaluate(()=>lastState.turnId))===(await page.evaluate(()=>lastState.you.id))?page:room.pages[1];await expect(next.locator('[data-g=risk-roll]')).toBeDisabled();await emit(page,'gamePause',{paused:false});
    await page.reload();await expect(page.locator('.risk-table')).toBeVisible();expect(await page.evaluate((id)=>lastState.g.banked[id],before.id)).toBe(before.banked+before.pot);await page.evaluate(()=>I18n.select('en'));await expect(page.locator('.bg-heading h2')).toHaveText('Risk or bank your points.');await shot(page,info,'risk-playing');
  }finally{await room.close();}
});

test('Story Chaos: three distinct views, retained draft, private chain, escaped text and shared final story',async({page,browser,app},info)=>{
  test.setTimeout(80000);const room=await table(page,browser,app,info,'story-chaos',{cycles:1});
  try{
    const [a,b,c]=room.pages,watcher=await room.add('Robin',false),first='<b>SECRET_ORANGE</b> kam mit einem Koffer.',second='SECRET_VIOLET verriet das geheime Ziel.';
    await a.locator('#story-sentence').fill(first);await a.evaluate(()=>current.onState(structuredClone(lastState)));await expect(a.locator('#story-sentence')).toHaveValue(first);await a.locator('#story-form button').click();await expect(b.locator('.story-previous')).toContainText(first);await expect(c.locator('body')).not.toContainText('SECRET_ORANGE');await expect(watcher.locator('body')).not.toContainText('SECRET_ORANGE');expect(await b.locator('.story-previous b').count()).toBe(0);
    await b.locator('#story-sentence').fill(second);await b.locator('#story-form button').click();await expect(c.locator('.story-previous')).toContainText(second);await expect(a.locator('body')).not.toContainText('SECRET_VIOLET');await shot(c,info,'story-private');
    await emit(a,'gamePause',{paused:true});await expect(c.locator('#story-sentence')).toBeDisabled();await c.reload();await expect(c.locator('#game-pause-banner')).toBeVisible();await emit(a,'gamePause',{paused:false});await c.locator('#story-sentence').fill('Am Ende waren alle wieder zu Hause.');await c.locator('#story-form button').click();
    for(const peer of [a,b,c,watcher]){await expect.poll(()=>peer.evaluate(()=>lastState.phase)).toBe('over');await expect(peer.locator('.story-table .story-complete')).toContainText('SECRET_ORANGE');await expect(peer.locator('.story-table .story-complete')).toContainText('SECRET_VIOLET');}
    await a.locator('[data-kit=closeResult]').click();await a.evaluate(()=>I18n.select('en'));await expect(a.locator('.bg-heading h2')).toHaveText('Time to read it together.');await shot(a,info,'story-final');
  }finally{await room.close();}
});

test('Number Sequence: actual public pattern, draft and pause, private final answers, spectator and authoritative scoring',async({page,browser,app},info)=>{
  test.setTimeout(70000);const room=await table(page,browser,app,info,'zahlenreihe',{rounds:1,writeSecs:120});
  try{
    const [a,b]=room.pages,watcher=await room.add('Robin',false),g=await a.evaluate(()=>lastState.g),answer=inferNext(g.series,g.holes);await expect(watcher.locator('form[data-pk]')).toHaveCount(0);await a.locator('#pk-in').fill(answer.join(' '));await a.evaluate(()=>current.onState(structuredClone(lastState)));await expect(a.locator('#pk-in')).toHaveValue(answer.join(' '));
    await emit(a,'gamePause',{paused:true});await expect(a.locator('#pk-in')).toBeDisabled();await emit(a,'gamePause',{paused:false});await expect(a.locator('#pk-in')).toHaveValue(answer.join(' '));await a.evaluate(()=>I18n.select('en'));await expect(a.locator('.sequence-question h2')).toHaveText('Which numbers are missing?');await expect(a.locator('#pk-in')).toHaveValue(answer.join(' '));await a.locator('.pk-send').click();await expect(a.locator('.pk-mine')).toContainText('Answer submitted');expect(await b.evaluate(()=>lastState.g.mine)).toBeNull();expect(await b.evaluate(()=>lastState.g.reveal)).toBeNull();await a.reload();await expect(a.locator('.pk-mine')).toContainText('Answer submitted');
    const wrong=[...answer];wrong[0]++;await b.locator('#pk-in').fill(wrong.join(' '));await b.locator('.pk-send').click();await expect(a.locator('.sequence-reveal')).toContainText('Solution');const reveal=await a.evaluate(()=>lastState.g.reveal),id=await a.evaluate(()=>lastState.you.id);expect(reveal.answer).toEqual(answer);expect(reveal.guesses.find((x)=>x.id===id).pts).toBe(150);await expect(watcher.locator('.sequence-reveal')).toBeVisible();await shot(a,info,'sequence-reveal');await a.locator('[data-g=pk-next]').click();await expect.poll(()=>a.evaluate(()=>lastState.phase)).toBe('over');
  }finally{await room.close();}
});

test('Small backlog package: all three tables fit six viewports with reachable action docks',async({page,browser,app},info)=>{
  test.skip(info.project.name!=='desktop','The complete viewport matrix runs once.');test.setTimeout(150000);
  for(const id of ['risiko-wuerfeln','story-chaos','zahlenreihe']){
    const room=await table(page,browser,app,info,id,{cycles:1,writeSecs:120});
    try{for(const [width,height] of [[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]]){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id}: ${width}`).toBe(true);const dock=await page.locator('#kg-dock').boundingBox();expect(dock.y).toBeGreaterThanOrEqual(0);expect(dock.y+dock.height).toBeLessThanOrEqual(height+1);await shot(page,info,`${id}-${width}x${height}`);}}
    finally{await emit(page,'closeTable');await room.close();await expect(page.locator('#hub')).toBeVisible();}
  }
});
