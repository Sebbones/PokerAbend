import {test,expect,login,selectGame} from './release-helpers.js';
async function start(page,app,id){
 await login(page,app);await selectGame(page,id);await page.locator('#host-form button[type=submit]').click();
 await page.evaluate(()=>send('sit'));await page.evaluate(()=>send('addBot'));await page.evaluate(()=>send('start'));
 await page.evaluate(()=>window.gameRulesReady);await page.evaluate(()=>I18n.select('en'));
}
test('Release regression: Kniffel score labels and kept dice switch from German to English in the running game',async({page,app})=>{
 await start(page,app,'kniffel');await expect(page.locator('.kn-sheet')).toContainText('Ones');await expect(page.locator('.kn-sheet')).toContainText('Upper total');await expect(page.locator('.kn-sheet')).not.toContainText('Einser');
 await page.locator('[data-g=roll]').click();await expect(page.locator('[data-g=keep]').first()).toBeVisible();await page.locator('[data-g=keep]').first().click();await expect(page.locator('.kn-slot.kept small').first()).toHaveText('kept');
 await expect(page.locator('#kg-dock')).toContainText('Tap dice to keep');await expect(page.locator('[data-g=roll]')).toContainText('Roll again');
 await page.evaluate(()=>I18n.select('de'));await expect(page.locator('.kn-sheet')).toContainText('Einser');await expect(page.locator('.kn-slot.kept small').first()).toHaveText('bleibt');
});
test('Release regression: Connect Four colours and move instructions switch language without changing the position',async({page,app})=>{
 await start(page,app,'viergewinnt');const before=await page.evaluate(()=>lastState.g.board);await expect(page.locator('#game-root')).toContainText('Red');await expect(page.locator('#kg-dock')).toContainText('Tap a column');
 await page.evaluate(()=>I18n.select('de'));await expect(page.locator('#game-root')).toContainText('Rot');expect(await page.evaluate(()=>lastState.g.board)).toEqual(before);
});
test('Release regression: paused local puzzles keep Rules and Resume reachable by pointer',async({page,app})=>{
 test.setTimeout(60000);await login(page,app);
 for(const id of ['block-puzzle','solitaire','mahjong-solitaire','match-3']){
  await page.evaluate(id=>{location.hash='#solo/'+id;},id);await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible();await page.locator('[data-setup] button[type=submit]').click();
  await page.locator('.sp-common [data-action=pause]').click();await expect(page.locator('.sp-paused')).toBeVisible();
  await page.locator('.sp-details').first().locator('summary').click({timeout:2500});await expect(page.locator('.sp-details').first()).toHaveAttribute('open','');
  await page.locator('.sp-paused [data-action=pause]').click();await expect(page.locator('.sp-paused')).toHaveCount(0);
 }
});
test('Release regression: the unranked notice does not cover the UNO table heading',async({page,app})=>{
 await start(page,app,'farbenchaos');
 const boxes=await page.evaluate(()=>{const notice=document.querySelector('#game-root .rank-chip').getBoundingClientRect(),heading=document.querySelector('#game-root .cw-table-head').getBoundingClientRect();return {bottom:notice.bottom,top:heading.top};});
 expect(boxes.bottom).toBeLessThanOrEqual(boxes.top);
});
test('Release regression: enlarged phone boards retain horizontal position when selecting and editing cells',async({page,app})=>{
 await page.setViewportSize({width:390,height:844});await login(page,app);
 for(const id of ['sudoku','block-puzzle']){
  await page.evaluate(id=>{location.hash='#solo/'+id;},id);await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible();if(id==='block-puzzle')await page.locator('[name=difficulty]').selectOption('hard');await page.locator('[data-setup] button[type=submit]').click();
  const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('poker:singleplayer:'+id)).state,id),cell=id==='sudoku'?saved.givens.findIndex((v,i)=>!v&&i%9>=7):7;
  const scroll=page.locator(id==='sudoku'?'.sp-board-wrap':'.solo-scroll').first();await scroll.evaluate(el=>{el.scrollLeft=el.scrollWidth;});
  expect(await scroll.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);if(id==='block-puzzle')await page.locator('[data-piece="0"]').click();
  await page.locator(`[data-cell="${cell}"]`).click({timeout:3000});if(id==='sudoku')await page.keyboard.press('1');
  expect(await scroll.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
