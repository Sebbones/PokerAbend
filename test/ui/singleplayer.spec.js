import {test,expect,login} from './helpers.js';
import {mkdirSync} from 'node:fs';
import {create as sudoku} from '../../public/singleplayer/sudoku-logic.js';
import {create as number} from '../../public/singleplayer/2048-logic.js';
import {create as defense} from '../../public/singleplayer/wellenwacht-logic.js';

const path=process.env.SOLO_CAPTURE_EVIDENCE==='1'?'docs/solo-games/screenshots':'artifacts/solo-screenshots';
mkdirSync(path,{recursive:true});
async function shot(page,testInfo,name){mkdirSync(path,{recursive:true});await page.screenshot({path:`${path}/${name}-${testInfo.project.name}.png`,fullPage:true});}
async function route(page,id){await page.evaluate((id)=>{location.hash='#solo/'+id;},id);await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible();}
async function start(page){await page.locator('[data-setup] button[type=submit]').click();}
async function saved(page,id){return page.evaluate((id)=>JSON.parse(localStorage.getItem('poker:singleplayer:'+id))?.state,id);}
async function seed(page,id,state){await page.evaluate(()=>{location.hash='#spiele/einzelspieler';});await expect(page.locator('[data-solo-start]')).toHaveCount(3);await page.evaluate(({id,state})=>{localStorage.setItem('poker:singleplayer:'+id,JSON.stringify({version:1,id,updatedAt:Date.now(),state}));},{id,state});await page.reload();await route(page,id);}

test('single-player library separates 3 local games from all 49 room games',async({page,app},info)=>{
  await login(page,app);const catalog=await page.request.get(app.url+'/me').then((r)=>r.json());expect(catalog.games).toHaveLength(49);expect(catalog.singleplayerGames).toHaveLength(3);
  await page.locator('.category-tabs a[href="#spiele/einzelspieler"]').click();await expect(page.locator('[data-solo-start]')).toHaveCount(3);await expect(page.locator('#games-body [data-host]')).toHaveCount(0);
  await expect(page.locator('.library-count')).toContainText('3');await expect(page.locator('.library-head [data-create-table]')).toHaveCount(0);await expect(page.locator('[data-id=sudoku] .gr-desc')).toBeVisible();
  for(const id of ['sudoku','2048','wellenwacht']){const reply=await page.evaluate((game)=>new Promise((resolve)=>socket.emit('create',{game,name:'Anna'},resolve)),id);expect(reply.ok).toBe(false);}
  await shot(page,info,'library');await page.locator('[data-solo-start="2048"]').click();await expect(page.locator('[data-setup]')).toBeVisible();await shot(page,info,'2048-start');await start(page);await expect(page.locator('.number-tile.filled')).toHaveCount(2);
  const before=await saved(page,'2048');await page.locator('[data-dir="down"]').click();await page.locator('.sp-common [data-action=pause]').click();const paused=await saved(page,'2048');expect(paused.paused).toBe(true);await page.locator('.number-grid').press('ArrowLeft',{force:true});expect((await saved(page,'2048')).board).toEqual(paused.board);
  await page.locator('.sp-paused [data-action=pause]').click();await shot(page,info,'2048-playing');await page.locator('.sp-heading a').click();await expect(page.locator('[data-solo-start="2048"]')).toHaveText('Fortsetzen');await page.locator('[data-solo-start="2048"]').click();expect((await saved(page,'2048')).board).not.toEqual([]);expect(before.undo).toEqual([]);
  await page.evaluate(()=>{location.hash='#bestenliste';});await expect(page.locator('#hub-main')).not.toContainText('Wellenwacht');
  const rankings=await page.request.get(app.url+'/api/leaderboard?game=2048').then((r)=>r.json());expect(rankings.game).toBe('poker');expect(rankings.games.some((g)=>['sudoku','2048','wellenwacht'].includes(g.id))).toBe(false);expect(rankings.rows).toEqual([]);
});

test('Sudoku notes, undo/redo, hints, errors, pause, language and browser restore',async({page,app},info)=>{
  await login(page,app);await route(page,'sudoku');await page.locator('[name=difficulty]').selectOption('hard');await shot(page,info,'sudoku-start');await start(page);await expect(page.locator('.sdk-cell')).toHaveCount(81);
  const first=await saved(page,'sudoku'),i=first.selected;await page.locator('[data-action=pencil]').click();await page.locator('[data-action=digit-1]').click();expect((await saved(page,'sudoku')).notes[i]).toBe(1);
  await page.locator('[data-action=undo]').click();expect((await saved(page,'sudoku')).notes[i]).toBe(0);await page.locator('[data-action=redo]').click();expect((await saved(page,'sudoku')).notes[i]).toBe(1);
  await page.locator('[data-action=hint]').click();expect((await saved(page,'sudoku')).values[i]).toBe(first.solution[i]);await page.locator('[data-errors]').check();await shot(page,info,'sudoku-playing');
  await page.locator('.sp-common [data-action=pause]').click();const paused=await saved(page,'sudoku');await page.waitForTimeout(350);expect((await saved(page,'sudoku')).elapsedMs).toBe(paused.elapsedMs);
  await page.locator('#hub-language [data-language]').selectOption('en');await expect(page.locator('.sp-paused h2')).toHaveText('Game paused');await expect(page.locator('.sp-heading a')).toContainText('Single player');await page.locator('.sp-paused [data-action=pause]').click();await page.reload();await expect(page.locator('.sp-paused')).toBeVisible();expect((await saved(page,'sudoku')).values).toEqual(paused.values);
  await page.locator('.sp-paused [data-action=pause]').click();await expect(page.locator('.sdk-grid')).not.toHaveAttribute('inert','');await page.locator('[data-action=new]').first().click();await expect(page.locator('[data-setup]')).toBeVisible();await page.locator('[data-action=cancel-new]').click();expect((await saved(page,'sudoku')).values).toEqual(paused.values);
});

test('Sudoku completes and keyboard input respects given cells',async({page,app},info)=>{
  await login(page,app);await route(page,'sudoku');const s=sudoku({seed:5});s.values=[...s.solution];s.values[s.selected]=0;await seed(page,'sudoku',s);await page.locator('.sp-paused [data-action=pause]').click();await page.locator(`[data-cell="${s.selected}"]`).press(String(s.solution[s.selected]));await expect(page.locator('.sp-result h2')).toHaveText('Sudoku gelöst!');await shot(page,info,'sudoku-won');
});

test('2048 wins, continues, undoes, swipes and detects a lost board',async({page,app},info)=>{
  await login(page,app);await route(page,'2048');const s=number();s.board=[1024,1024,...Array(14).fill(0)];await seed(page,'2048',s);await page.locator('.sp-paused [data-action=pause]').click();await page.locator('.number-grid').press('ArrowLeft');await expect(page.locator('.sp-result h2')).toHaveText('2048 erreicht!');await shot(page,info,'2048-won');await page.locator('[data-action=continue]').click();await page.locator('[data-action=undo]').click();expect((await saved(page,'2048')).board).toEqual(s.board);
  await page.locator('.number-grid').evaluate((grid)=>{grid.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:200,clientY:100,pointerId:1}));grid.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:80,clientY:100,pointerId:1}));});await expect(page.locator('.sp-result h2')).toHaveText('2048 erreicht!');
  const lost=number();lost.board=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];lost.undo=[number()];await seed(page,'2048',lost);await expect(page.locator('.sp-result h2')).toHaveText('Keine Züge mehr');await shot(page,info,'2048-lost');await page.locator('[data-action=undo]').click();await expect(page.locator('.sp-result')).toHaveCount(0);expect((await saved(page,'2048')).paused).toBe(false);
});

test('Wellenwacht builds, upgrades, sells, starts waves and restores a paused simulation',async({page,app},info)=>{
  await login(page,app);await route(page,'wellenwacht');await shot(page,info,'wellenwacht-start');await start(page);await page.locator('[data-cell="58"]').click();await page.locator('[data-action=build]').click();expect((await saved(page,'wellenwacht')).towers[0].cell).toBe(58);
  await page.locator('[data-action=upgrade]').click();await page.locator('[data-action=upgrade]').click();expect((await saved(page,'wellenwacht')).towers[0].level).toBe(3);await expect(page.locator('[data-action=upgrade]')).toBeDisabled();await page.locator('[data-action=sell]').click();expect((await saved(page,'wellenwacht')).towers).toHaveLength(0);
  await page.locator('[data-action=build]').click();await page.locator('[data-action=wave]').click();await page.waitForTimeout(1200);await page.locator('[data-action=speed]').click();expect((await saved(page,'wellenwacht')).speed).toBe(2);await shot(page,info,'wellenwacht-playing');
  await page.locator('.sp-common [data-action=pause]').click();const paused=await saved(page,'wellenwacht');expect(paused.enemies.length).toBeGreaterThan(0);await page.waitForTimeout(300);expect((await saved(page,'wellenwacht')).time).toBe(paused.time);await page.reload();await expect(page.locator('.sp-paused')).toBeVisible();await page.locator('.sp-paused [data-action=pause]').click();expect((await saved(page,'wellenwacht')).towers).toEqual(paused.towers);
  await page.locator('.sp-heading a').click();const leaving=await saved(page,'wellenwacht');expect(leaving.paused).toBe(true);await page.waitForTimeout(300);expect((await saved(page,'wellenwacht')).time).toBe(leaving.time);
});

test('Wellenwacht second map, mobile zoom and end states',async({page,app},info)=>{
  await login(page,app);await route(page,'wellenwacht');await page.locator('[name=map]').selectOption('delta');await page.locator('[name=difficulty]').selectOption('easy');await start(page);await page.locator('[data-zoom]').check();await expect(page.locator('.ww-board')).toHaveClass(/zoom/);
  if(info.project.name==='mobil'){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.locator('.ww-scroll').evaluate((el)=>{el.scrollLeft=200;});await page.locator('[data-cell="67"]').click();expect(await page.locator('.ww-scroll').evaluate((el)=>el.scrollLeft)).toBeGreaterThan(0);}
  await page.locator('[data-zoom]').uncheck();await shot(page,info,'wellenwacht-delta');
  const win=defense({map:'delta'});win.wave=12;win.status='won';await seed(page,'wellenwacht',win);await expect(page.locator('.sp-result h2')).toHaveText('Basis gerettet!');await shot(page,info,'wellenwacht-won');
  const loss=defense();loss.lives=0;loss.status='lost';await seed(page,'wellenwacht',loss);await expect(page.locator('.sp-result h2')).toHaveText('Basis gefallen');await shot(page,info,'wellenwacht-lost');
});

test('corrupt and unsupported saves do not crash or silently overwrite existing data',async({page,app})=>{
  await login(page,app);await route(page,'2048');for(const raw of ['{bad',JSON.stringify({version:99,id:'2048',updatedAt:0,state:{}})]){await page.evaluate((raw)=>localStorage.setItem('poker:singleplayer:2048',raw),raw);await page.reload();await expect(page.locator('.sp-setup .error')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('poker:singleplayer:2048'))).toBe(raw);}
  await start(page);await expect(page.locator('.number-grid')).toBeVisible();expect((await saved(page,'2048')).board).toHaveLength(16);
});

test('direct solo entry works without a profile or Discord and has no horizontal page overflow',async({page,app})=>{
  await page.goto(app.url+'/#solo/sudoku');await page.getByLabel('Passwort').fill(app.password);await page.getByRole('button',{name:'Reinkommen'}).click();await expect(page.locator('[data-solo=sudoku]')).toBeVisible();await expect(page.locator('#profile-dlg')).not.toBeVisible();await start(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('new roadmap packages are planned, translated and linked to their individual GitHub issues',async({page,app})=>{
  await login(page,app);await page.locator('#hub-language select').selectOption('en');await page.evaluate(()=>{location.hash='#roadmap';});await page.locator('[data-roadmap-stage=spaeter] > summary').click();
  const section=page.locator('article[aria-labelledby=roadmap-einzelspieler-zukunft]');await expect(section).toContainText('More single-player games');await expect(section.locator('[data-plan]')).toHaveCount(9);
  await section.locator('[data-plan=minesweeper]').click();await expect(page.locator('#host-dlg')).toContainText('Clear a minefield using logic and flags.');await expect(page.locator('#host-dlg')).toContainText('Neighbour counts reveal hidden mines.');await expect(page.locator('#host-dlg')).toContainText('Acceptance criteria');await expect(page.locator('#host-dlg')).toContainText('Separate from Minenlauf');await expect(page.locator('#host-dlg a[href="https://github.com/TTLPSCWA/PokerAbend/issues/7"]')).toBeVisible();await expect(page.locator('#host-dlg [data-host]')).toHaveCount(0);
});

test('blocked browser storage still allows local play and reduced motion prevents tile animations',async({page,app})=>{
  await login(page,app);await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}});});await route(page,'2048');await expect(page.locator('.sp-setup .error')).toContainText('Browserspeicher ist gesperrt');await start(page);await page.locator('[data-dir=left]').click();await expect(page.locator('[data-save]')).toContainText('Speichern nicht verfügbar');expect(await page.locator('.number-grid').evaluate((grid)=>grid.getAnimations({subtree:true}).length)).toBe(0);await page.locator('.sp-heading a').click();await expect(page.locator('[data-solo-start]')).toHaveCount(3);
});

test('local games stay responsive across six viewports and keep settings across language changes',async({page,app},info)=>{
  test.skip(info.project.name!=='desktop','Viewport matrix is shared by both projects.');test.setTimeout(120000);await login(page,app);
  for(const [width,height] of [[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]]){
    await page.setViewportSize({width,height});for(const id of ['sudoku','2048','wellenwacht']){await route(page,id);if(await page.locator('[data-setup]').isVisible())await start(page);if(await page.locator('.sp-paused').isVisible())await page.locator('.sp-paused [data-action=pause]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} at ${width}`).toBe(true);await page.screenshot({path:`${path}/${id}-${width}x${height}.png`,fullPage:true});}
  }
  await route(page,'wellenwacht');await page.locator('[data-zoom]').check();await page.locator('.sp-common [data-action=new]').click();await page.locator('[name=map]').selectOption('delta');await page.locator('[name=difficulty]').selectOption('hard');await page.locator('#hub-language select').selectOption('en');await expect(page.locator('[name=map]')).toHaveValue('delta');await expect(page.locator('[name=difficulty]')).toHaveValue('hard');await start(page);await expect(page.locator('[data-zoom]')).toBeChecked();
});
