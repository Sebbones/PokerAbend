import {test,expect,login,selectGame} from './helpers.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const before=process.env.CARD_UX_STAGE==='before';
const emit=async(page,event,data={})=>{const r=await page.evaluate(({event,data})=>send(event,data),{event,data});expect(r.ok,`${event}: ${r.error}`).toBe(true);return r;};
async function table(page,browser,app,info,game,variant='classic'){
  await login(page,app,'Anna');await selectGame(page,game);await page.locator('#host-variant').selectOption(variant);await page.locator('#host-form button[type=submit]').click();await expect(page.locator('#kg')).toBeVisible();await emit(page,'sit');await emit(page,'settings',{turnTime:0,startAction:false});
  const code=await page.evaluate(()=>lastState.code),context=await browser.newContext({...info.project.use,viewport:page.viewportSize(),reducedMotion:'reduce'}),guest=await context.newPage();
  await login(guest,app,'Sebastian');await guest.evaluate((code)=>joinAndEnter(code,'sit'),code);await expect.poll(()=>guest.evaluate(()=>lastState?.you?.inRound||lastState?.you?.playing)).toBe(true);await emit(page,'start');await expect.poll(()=>page.evaluate(()=>lastState.phase)).toBe('playing');await expect.poll(()=>guest.evaluate(()=>lastState.phase)).toBe('playing');return {guest,context};
}
for(const game of ['farbenchaos','stapelrennen','zehnetappen'])test(`Before card interaction audit ${game}`,async({page,browser,app},info)=>{
  test.skip(!before,'Explicit before-capture run only.');test.setTimeout(60000);
  const {guest,context}=await table(page,browser,app,info,game),out=resolve('artifacts/card-ux/before',info.project.name,game);mkdirSync(out,{recursive:true});
  try{
    await page.screenshot({path:resolve(out,'playing.png'),fullPage:true});await guest.screenshot({path:resolve(out,'opponent.png'),fullPage:true});
    expect(await guest.evaluate(()=>lastState.g.hand)).not.toEqual(await page.evaluate(()=>lastState.g.hand));
    const initial=await page.evaluate(()=>({hand:lastState.g.hand,playable:lastState.g.playable,step:lastState.g.step}));
    if(game==='farbenchaos'){
      const value=initial.playable.find((c)=>!['W','F','B','C','Q','X','T'].includes(c[0]));
      if(value)await page.locator(`.kg-hand [data-card="${value}"]`).first().click();
    }else if(game==='stapelrennen')await page.locator('.kg-hand [data-kind=hand]').first().click();
    else {await page.locator('[data-g=draw-deck]').click();await expect.poll(()=>page.evaluate(()=>lastState.g.step)).toBe('play');await page.locator('.ze-hand .kc').first().click();}
    await page.screenshot({path:resolve(out,'after-first-card-tap.png'),fullPage:true});
    const observed=await page.evaluate(()=>({hand:lastState.g.hand,step:lastState.g.step,selected:document.querySelectorAll('.kg-hand .sel,.kg-hand .ze-sel,.kg-hand .peek').length,pressed:document.querySelectorAll('.kg-hand [aria-pressed=true]').length,enabledBuilds:document.querySelectorAll('.st-build:not(:disabled)').length,overlap:document.querySelector('.kg-hand')?.classList.contains('overlap')}));
    writeFileSync(resolve(out,'observations.json'),JSON.stringify({game,project:info.project.name,initial,observed},null,2));
    await emit(page,'gamePause',{paused:true});await expect(guest.locator('#game-pause-banner')).toBeVisible();await page.reload();await expect(page.locator('#game-pause-banner')).toBeVisible();
  }finally{await context.close();}
});

for(const game of ['farbenchaos','stapelrennen','zehnetappen'])test(`Card interaction ${game}: select, clear, state and real action`,async({page,browser,app},info)=>{
  test.skip(before,'After-implementation checks.');test.setTimeout(60000);const {guest,context}=await table(page,browser,app,info,game);
  try{
    await expect(page.locator('.cix-turn strong')).toHaveText('DU BIST DRAN');await expect(guest.locator('.cix-turn strong')).toHaveText('Anna ist dran');
    const initial=await page.evaluate(()=>JSON.stringify(lastState.g.hand));
    const card=page.locator('.kg-hand [data-card-key]').first();const key=await card.getAttribute('data-card-key');await card.click();await expect(page.locator(`.kg-hand [data-card-key="${key}"]`)).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>JSON.stringify(lastState.g.hand))).toBe(initial);
    await page.locator(`.kg-hand [data-card-key="${key}"]`).click();await expect(page.locator(`.kg-hand [data-card-key="${key}"]`)).toHaveAttribute('aria-pressed','false');
    if(game==='farbenchaos'){
      const playable=await page.evaluate(()=>lastState.g.playable.find((c)=>/^\d/.test(c)));
      if(playable){await page.locator(`.kg-hand [data-card="${playable}"]`).first().click();await expect(page.locator('[data-g=play-selected]')).toHaveCount(2);await page.locator('.kg-acts [data-g=play-selected]').click();await expect.poll(()=>page.evaluate(()=>JSON.stringify(lastState.g.hand))).not.toBe(initial);}
      else{await page.locator('[data-g=draw]').click();await expect.poll(()=>page.evaluate(()=>JSON.stringify(lastState.g.hand))).not.toBe(initial);if(await page.locator('[data-g=pass]').isVisible())await page.locator('[data-g=pass]').click();}
    }else if(game==='stapelrennen'){
      await card.click();const chosen=await card.getAttribute('aria-label');const needs=await page.locator('.st-build.can .st-need').allTextContents();if(chosen!=='Joker')expect(needs.every((n)=>n===chosen)).toBe(true);
      await page.locator('.st-mine [data-g=drop]').first().click();await expect.poll(()=>page.evaluate(()=>lastState.turnId)).not.toBe(await page.evaluate(()=>lastState.you.id));
    }else{await page.locator('[data-g=draw-deck]').click();await expect.poll(()=>page.evaluate(()=>lastState.g.step)).toBe('play');await page.locator('[data-g=mode-discard]').click();await page.locator('.kg-hand [data-card-key]').first().click();await page.locator('[data-g=discard]').click();await expect.poll(()=>page.evaluate(()=>lastState.turnId)).not.toBe(await page.evaluate(()=>lastState.you.id));}
    await expect.poll(()=>guest.locator('.cix-turn strong').textContent()).toBe('DU BIST DRAN');
  }finally{await context.close();}
});
