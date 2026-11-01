import {test,expect,login,selectGame} from './helpers.js';
import {mkdirSync} from 'node:fs';
async function capture(page,info,name){let path=info.outputPath(name+'.png');if(process.env.BOT_LEVEL_CAPTURE==='1'){const dir='docs/roadmap/screenshots/v2-16';mkdirSync(dir,{recursive:true});path=`${dir}/${info.project.name}-${name}.png`;}const controls=page.getByRole('region',{name:'Computer-Mitspieler'});await controls.scrollIntoViewIfNeeded();await controls.screenshot({path});}

test('V2-16: Host-Stufen, Reconnect, Rundensperre und ehrlicher Ein-Stufen-Hinweis',async({page,app,browser},info)=>{
  await login(page,app);await selectGame(page,'viergewinnt');await page.locator('#host-form button[type=submit]').click();
  const menu=page.locator('[data-kit-panel="host"]').first();await menu.click();
  const controls=page.getByRole('region',{name:'Computer-Mitspieler'});
  await controls.locator('[data-add-bot-level]').selectOption('hard');await controls.locator('[data-add-bot]').click();
  await expect(controls.locator('[data-bot-level]').first()).toHaveValue('hard');
  await controls.locator('[data-add-bot-level]').selectOption('easy');await controls.locator('[data-add-bot]').click();
  await expect(controls.locator('[data-bot-level]').nth(1)).toHaveValue('easy');
  await controls.locator('[data-bot-level]').first().selectOption('medium');await expect(controls.locator('[data-bot-level]').first()).toHaveValue('medium');
  await controls.locator('[data-bot-level]').first().selectOption('hard');await expect(controls.locator('[data-bot-level]').first()).toHaveValue('hard');
  await page.reload();await menu.click();await expect(controls.locator('[data-bot-level]').nth(1)).toHaveValue('easy');
  await expect(controls.locator('[data-bot-level]').first()).toHaveValue('hard');
  await capture(page,info,'host-levels');
  const code=new URL(page.url()).searchParams.get('t'),id=await controls.locator('[data-bot-level]').first().getAttribute('data-bot-level');
  const context=await browser.newContext();try{
    const guest=await context.newPage();await login(guest,app,'Gast');
    const joined=await guest.evaluate(code=>new Promise(resolve=>socket.emit('join',{code,name:'Gast'},resolve)),code);expect(joined.ok).toBe(true);
    const denied=await guest.evaluate(id=>new Promise(resolve=>socket.emit('setBotDifficulty',{id,difficulty:'hard'},resolve)),id);expect(denied.ok).toBe(false);expect(denied.error).toContain('Host');
  }finally{await context.close();}
  await page.locator('#kg-panel [data-kit="start"]').click();await expect(controls.locator('[data-bot-level]').first()).toBeDisabled();
  const denied=await page.evaluate(id=>new Promise(resolve=>socket.emit('setBotDifficulty',{id,difficulty:'hard'},resolve)),id);expect(denied.ok).toBe(false);expect(denied.error).toContain('zwischen');
  await expect(page.locator('.bot-difficulty-badge').first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>new Promise(resolve=>{
    socket.emit('history',{},r=>resolve(r.entries.some(e=>/Bot .*wirft|Bot .*legt/.test(e.text))));
  }))).toBe(true);
  await page.screenshot({path:info.outputPath('bot-levels.png'),fullPage:true});
});

test('V2-16: Nicht unterstützte Spiele bieten ausdrücklich nur Mittel an',async({page,app},info)=>{
  await login(page,app);await selectGame(page,'schocken');await page.locator('#host-form button[type=submit]').click();await page.locator('[data-kit-panel="host"]').first().click();
  const controls=page.getByRole('region',{name:'Computer-Mitspieler'});await expect(controls.locator('[data-bot-single]')).toHaveText('Nur eine Stufe verfügbar');
  await expect(controls.locator('[data-add-bot-level]')).toBeDisabled();await expect(controls.locator('[data-add-bot-level] option')).toHaveCount(1);
  const denied=await page.evaluate(()=>new Promise(resolve=>socket.emit('addBot',{difficulty:'hard'},resolve)));expect(denied.ok).toBe(false);expect(denied.error).toContain('Nur eine Stufe');
  await capture(page,info,'single-level');
});
