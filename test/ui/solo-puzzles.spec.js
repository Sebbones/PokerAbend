// Solo-Paket B im Browser: Block-Puzzle, Solitär, Mahjong-Solitär, Match-3 – Spielen, Speichern, Pause, Neuladen, Touch/Tastatur, Englisch, Ränder.
import {test,expect,login} from './helpers.js';
import {mkdirSync} from 'node:fs';
import * as bp from '../../public/singleplayer/blockpuzzle-logic.js';
import * as sol from '../../public/singleplayer/solitaire-logic.js';
import * as mj from '../../public/singleplayer/mahjong-logic.js';
import * as m3 from '../../public/singleplayer/match3-logic.js';

const key=id=>'poker:singleplayer:'+id;
const saved=(page,id)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k))?.state,key(id));
const stats=(page,id)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k+':stats')||'{}'),key(id));
async function shot(page,info,name){const dir=process.env.SOLO_PUZZLE_CAPTURE==='1'?'docs/solo-games/puzzle-screenshots':'artifacts/solo-puzzle-screenshots';mkdirSync(dir,{recursive:true});await page.screenshot({path:`${dir}/${name}-${info.project.name}.png`,fullPage:true});}
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
async function route(page,id){await page.evaluate(id=>{location.hash='#solo/'+id;},id);await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible();}
async function start(page,difficulty='easy',level){await page.locator('[name=difficulty]').selectOption(difficulty);if(level)await page.locator('[name=level]').selectOption(level);await page.locator('[data-setup] button[type=submit]').click();}
// Einen Spielstand ablegen, wie ihn das Spiel selbst speichern würde (wird pausiert fortgesetzt)
async function inject(page,id,state){
  // Erst pausieren: Beim Neuladen schreibt ein laufendes Spiel sonst seinen Stand über den eingelegten
  const running=page.locator('.sp-common [data-action=pause]:not([disabled])');if(!(await page.locator('.sp-paused').count())&&await running.count())await running.click();
  await page.evaluate(([k,id,state])=>localStorage.setItem(k,JSON.stringify({version:1,id,updatedAt:Date.now(),state})),[key(id),id,state]);}
async function resume(page){await page.locator('.sp-paused [data-action=pause]').click();}
async function english(page,info,id,text){await page.evaluate(()=>I18n.select('en'));await page.locator('.sp-details').first().locator('summary').click();await expect(page.locator('.sp-details').first()).toContainText(text);await shot(page,info,id+'-english');expect(await overflow(page)).toBe(true);}
async function pauseReload(page,id,info){
  await page.locator('.sp-common [data-action=pause]').click();await expect(page.locator('.sp-paused')).toBeVisible();
  const before=await saved(page,id);await page.waitForTimeout(250);expect(await saved(page,id)).toEqual(before);
  await shot(page,info,id+'-paused');await page.reload();await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible();await expect(page.locator('.sp-paused')).toBeVisible();
  const after=await saved(page,id);expect(after.elapsedMs).toBe(before.elapsedMs);expect(after.paused).toBe(true);
}
async function sizes(page,info,id,selector){
  if(info.project.name!=='desktop')return;
  for(const [width,height] of [[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]]){
    await page.setViewportSize({width,height});expect(await overflow(page)).toBe(true);
    // On phones the release layout enlarges boards to 44 px targets inside a horizontal scroller
    // (see release-regressions.spec.js). Then the scroller has to fit, not the wider board inside it.
    const board=page.locator(selector).first(),scroller=board.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," solo-scroll ") or contains(concat(" ",normalize-space(@class)," ")," sp-board-wrap ")][1]');
    const scrolls=await scroller.count()&&await scroller.evaluate(el=>el.scrollWidth>el.clientWidth+1);
    const box=await (scrolls?scroller:board).boundingBox();expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.x+box.width,`${id} ${width}x${height}`).toBeLessThanOrEqual(width+1);
    await shot(page,info,`${id}-${width}x${height}`);
  }
}
test.use({createLimit:'100'});

test('Block-Puzzle: Form wählen, Vorschau, Setzen, Rückgängig, Tipp, Pause, Neuladen, Ende und Englisch',async({page,app},info)=>{
  test.setTimeout(90000);await login(page,app);await route(page,'block-puzzle');await shot(page,info,'block-puzzle-start');
  await start(page,'normal');await expect(page.locator('.bp-cell')).toHaveCount(100);await expect(page.locator('.bp-piece[data-piece]')).toHaveCount(3);
  await page.keyboard.press('h');                                     // Tipp wählt Form und zeigt die Stelle
  const hinted=page.locator('.bp-cell.hint');await expect(hinted.first()).toBeVisible();
  const target=await page.locator('.bp-cell.preview, .bp-cell.hint').first().getAttribute('data-cell');
  await expect(page.locator('.bp-piece.selected')).toHaveCount(1);
  await page.locator(`.bp-cell[data-cell="${target}"]`).click();
  await expect.poll(async()=>(await saved(page,'block-puzzle')).placed).toBe(1);
  const s1=await saved(page,'block-puzzle');expect(s1.grid.some(v=>v===1)).toBe(true);expect(s1.score).toBeGreaterThan(0);await expect(page.locator('[data-best]')).toContainText(String(s1.score));
  await page.keyboard.press('z');await expect.poll(async()=>(await saved(page,'block-puzzle')).placed).toBe(0);
  // Vorschau: ein Feld antippen/anfahren zeigt die Form, erst dasselbe Feld nochmals setzt (Touch) bzw. der Klick (Maus)
  const p0=page.locator('.bp-piece[data-piece="0"]'),was=await p0.getAttribute('aria-pressed');await p0.click();expect(await p0.getAttribute('aria-pressed')).not.toBe(was);await p0.click();expect(await p0.getAttribute('aria-pressed')).toBe(was);
  await page.keyboard.press('Escape');
  await shot(page,info,'block-puzzle-playing');
  await pauseReload(page,'block-puzzle',info);
  await resume(page);await expect(page.locator('.bp-board')).toBeVisible();
  // Ein Stand ohne möglichen Zug zeigt das Ende mit Rückgängig
  const lost=await saved(page,'block-puzzle');const n=10;lost.grid=Array(n*n).fill(1);lost.grid[0]=0;lost.pieces=[9,9,9];lost.status='lost';lost.paused=true;lost.history=[{grid:Array(100).fill(0),pieces:[0,1,2],score:0,combo:0,placed:0,seed:1}];
  await inject(page,'block-puzzle',lost);await page.reload();await expect(page.locator('.sp-result')).toContainText('voll');await expect(page.locator('.sp-result [data-action=undo]')).toBeVisible();await shot(page,info,'block-puzzle-result');
  await sizes(page,info,'block-puzzle','.bp-board');
  await english(page,info,'block-puzzle','Choose one of the three shapes');
});

test('Solitär: ziehen, Zug 3, Tipp, Doppelklick auf das Fundament, Rückgängig, automatisches Ablegen, Neuladen und Englisch',async({page,app},info)=>{
  test.setTimeout(90000);await login(page,app);await route(page,'solitaire');
  await start(page,'normal');await expect(page.locator('.sol-cols .sol-col')).toHaveCount(7);await expect(page.locator('.sol-col [data-sol=tab]')).toHaveCount(7);
  await page.locator('[data-sol=stock]').click();
  await expect.poll(async()=>(await saved(page,'solitaire')).waste.length).toBe(3);                // mittel: drei Karten
  await page.locator('[data-action=undo]').click();await expect.poll(async()=>(await saved(page,'solitaire')).waste.length).toBe(0);
  // mehrere Tipp-Züge über die echte Oberfläche ausführen
  for(let i=0;i<8;i++){
    const s=await saved(page,'solitaire'),h=sol.hint(s);if(!h)break;
    if(h.draw){await page.locator('[data-sol=stock]').click();continue;}
    const from=h.from.k==='waste'?'[data-sol=waste]':h.from.k==='found'?`[data-sol=found][data-suit="${h.from.suit}"]`:`[data-sol=tab][data-col="${h.from.col}"][data-index="${h.from.index}"]`;
    await page.locator(from).first().click({position:{x:8,y:6}});   // sichtbarer Streifen der Karte (die unteren Karten werden überdeckt)
    const to=h.to.k==='found'?'[data-sol=found]':`[data-sol=tab][data-col="${h.to.col}"], [data-sol=col][data-col="${h.to.col}"]`;
    if(h.to.k==='found'){const card=sol.cardsAt(s,h.from)[0],suit=sol.SUITS.indexOf(card[1]);await page.locator(`[data-sol=found][data-suit="${suit}"]`).click();}
    else await page.locator(to).last().click();
  }
  expect((await saved(page,'solitaire')).moves).toBeGreaterThan(0);await shot(page,info,'solitaire-playing');
  // Doppelklick: Ass oben auf einer Reihe geht direkt auf das Fundament
  const fresh=sol.create({difficulty:'easy',seed:1});fresh.tableau=[[{c:'Kd',up:true}],[{c:'Qc',up:true}],[{c:'As',up:true}],[],[],[],[]];fresh.stock=fresh.stock.filter(c=>!['Kd','Qc','As'].includes(c)).slice(0,0);
  const rest=sol.deck().filter(c=>!['Kd','Qc','As'].includes(c));fresh.stock=rest;fresh.waste=[];fresh.paused=true;
  await inject(page,'solitaire',fresh);await page.reload();await resume(page);
  await page.locator('[data-sol=tab][data-col="2"]').dblclick({position:{x:8,y:6}});
  await expect.poll(async()=>(await saved(page,'solitaire')).foundations[3].length).toBe(1);
  await page.locator('[data-action=undo]').click();await expect.poll(async()=>(await saved(page,'solitaire')).foundations[3].length).toBe(0);
  // Automatisch ablegen am Ende
  const end=sol.create({difficulty:'easy',seed:2});end.stock=[];end.waste=[];end.history=[];end.moves=5;
  end.foundations=[Array.from('A23456789TJQ',r=>r+'c'),Array.from('A23456789TJQ',r=>r+'d'),Array.from('A23456789TJQ',r=>r+'h'),Array.from('A23456789TJQ',r=>r+'s')];
  end.tableau=[[{c:'Kc',up:true}],[{c:'Kd',up:true}],[{c:'Kh',up:true}],[{c:'Ks',up:true}],[],[],[]];end.paused=true;
  await inject(page,'solitaire',end);await page.reload();await resume(page);
  await expect(page.locator('[data-action=auto]')).toBeVisible();await page.locator('[data-action=auto]').click();
  await expect(page.locator('.sp-result')).toContainText('Geschafft',{timeout:10000});await shot(page,info,'solitaire-result');
  expect((await saved(page,'solitaire')).status).toBe('won');expect((await stats(page,'solitaire')).records.easy.moves).toBeGreaterThan(0);
  await start0(page);
  await sizes(page,info,'solitaire','.sol-board');
  await english(page,info,'solitaire','Klondike');
});
async function start0(page){await page.locator('.sp-common [data-action=new]').click();await start(page,'easy');await expect(page.locator('.sol-board')).toBeVisible();await pauseReloadSimple(page);}
async function pauseReloadSimple(page){await page.locator('.sp-common [data-action=pause]').click();await page.reload();await expect(page.locator('.sp-paused')).toBeVisible();await resume(page);await expect(page.locator('.sol-board')).toBeVisible();}

test('Mahjong-Solitär: Motive, Tipp, Paare entfernen, Rückgängig, Sieg mit Bestzeit, Neuladen und Englisch',async({page,app},info)=>{
  test.setTimeout(90000);await login(page,app);await route(page,'mahjong-solitaire');
  await start(page,'easy');await expect(page.locator('.mj-tile')).toHaveCount(36);await expect(page.locator('.mj-tile svg').first()).toBeVisible();
  expect(await page.locator('.mj-tile.free').count()).toBeGreaterThan(1);expect(await page.locator('.mj-tile.blocked').count()).toBeGreaterThan(0);
  await page.keyboard.press('h');await expect(page.locator('.mj-tile.hint')).toHaveCount(2);
  const pair=await page.locator('.mj-tile.hint').evaluateAll(els=>els.map(e=>e.dataset.tile));
  for(const t of pair)await page.locator(`.mj-tile[data-tile="${t}"]`).click();
  await expect(page.locator('.mj-tile')).toHaveCount(34);expect((await saved(page,'mahjong-solitaire')).removed).toBe(1);expect((await saved(page,'mahjong-solitaire')).hints).toBe(1);
  await page.locator('[data-action=undo]').click();await expect(page.locator('.mj-tile')).toHaveCount(36);
  await page.locator('.mj-tile.free').first().focus();await page.keyboard.press('Enter');await expect(page.locator('.mj-tile.selected')).toHaveCount(1);
  await shot(page,info,'mahjong-solitaire-playing');
  await pauseReload(page,'mahjong-solitaire',info);
  // letztes Paar: Sieg und Bestzeit (ohne Tipp)
  const end=mj.create({difficulty:'easy',seed:3}),order=mj.solution({difficulty:'easy',seed:3});
  for(const [a,b] of order.slice(0,-1)){mj.select(end,a);mj.select(end,b);}
  end.hints=0;end.paused=true;end.elapsedMs=65000;await inject(page,'mahjong-solitaire',end);await page.reload();await resume(page);
  const [a,b]=order.at(-1);await page.locator(`.mj-tile[data-tile="${a}"]`).click();await page.locator(`.mj-tile[data-tile="${b}"]`).click();
  await expect(page.locator('.sp-result')).toContainText('Geschafft');await shot(page,info,'mahjong-solitaire-result');
  expect((await stats(page,'mahjong-solitaire')).records.easy.timeMs).toBeGreaterThanOrEqual(65000);
  await page.locator('.sp-common [data-action=new]').click();await start(page,'hard');await expect(page.locator('.mj-tile')).toHaveCount(96);
  await sizes(page,info,'mahjong-solitaire','.mj-board');
  await english(page,info,'mahjong-solitaire','Remove pairs of identical tiles');
});

test('Match-3: Level, Tausch per Tippen und Wischen, ungültiger Tausch kostet nichts, Tipp, Sieg, Neuladen und Englisch',async({page,app},info)=>{
  test.setTimeout(90000);await login(page,app);await route(page,'match-3');
  await start(page,'easy','e1');await expect(page.locator('.m3-cell')).toHaveCount(64);await expect(page.locator('.m3-cell svg').first()).toBeVisible();
  const s0=await saved(page,'match-3');expect(s0.movesLeft).toBe(22);
  // ungültiger Tausch
  const valid=m3.validSwaps(s0.grid),bad=[...Array(63).keys()].find(i=>i%8<7&&!valid.some(([a,b])=>a===i&&b===i+1));
  await page.locator(`.m3-cell[data-cell="${bad}"]`).click();await page.locator(`.m3-cell[data-cell="${bad+1}"]`).click();
  await expect(page.locator('.sp-note')).toContainText('keinen Zug');expect((await saved(page,'match-3')).movesLeft).toBe(22);
  // gültiger Tausch über den Tipp
  await page.keyboard.press('h');await expect(page.locator('.m3-cell.hint')).toHaveCount(2);
  const pair=await page.locator('.m3-cell.hint').evaluateAll(els=>els.map(e=>Number(e.dataset.cell)));
  await page.locator(`.m3-cell[data-cell="${pair[0]}"]`).click();await page.locator(`.m3-cell[data-cell="${pair[1]}"]`).click();
  await expect.poll(async()=>(await saved(page,'match-3')).movesLeft).toBe(21);expect((await saved(page,'match-3')).score).toBeGreaterThan(0);
  await expect(page.locator('.m3-bar span')).toBeVisible();await shot(page,info,'match-3-playing');
  // Wischen (Zeiger gedrückt, bewegt, losgelassen)
  const now=await saved(page,'match-3'),swaps=m3.validSwaps(now.grid),[a,b]=swaps.find(([x,y])=>y===x+1)||swaps[0],horizontal=b===a+1;
  const box=await page.locator(`.m3-cell[data-cell="${a}"]`).boundingBox(),dx=horizontal?box.width:0,dy=horizontal?0:box.height;
  await page.locator(`.m3-cell[data-cell="${a}"]`).dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',clientX:box.x+box.width/2,clientY:box.y+box.height/2,bubbles:true});
  await page.locator(`.m3-cell[data-cell="${a}"]`).dispatchEvent('pointerup',{pointerId:7,pointerType:'touch',clientX:box.x+box.width/2+dx*1.2,clientY:box.y+box.height/2+dy*1.2,bubbles:true});
  await expect.poll(async()=>(await saved(page,'match-3')).movesLeft).toBe(20);
  await pauseReload(page,'match-3',info);
  // Sieg: ein Zug fehlt bis zum Ziel
  const win=m3.create({difficulty:'easy',level:'e1',seed:4});win.score=m3.levelOf(win).target-10;win.paused=true;await inject(page,'match-3',win);await page.reload();await resume(page);
  const [x,y]=m3.validSwaps(win.grid)[0];await page.locator(`.m3-cell[data-cell="${x}"]`).click();await page.locator(`.m3-cell[data-cell="${y}"]`).click();
  await expect(page.locator('.sp-result')).toContainText('Geschafft');await expect(page.locator('.sp-result [data-action=next]')).toBeVisible();await shot(page,info,'match-3-result');
  expect((await stats(page,'match-3')).records['easy:e1'].cleared).toBe(true);
  await page.locator('.sp-common [data-action=new]').click();await start(page,'hard','h2');await expect(page.locator('.sp-metrics')).toContainText('Dschungelpfad');
  await sizes(page,info,'match-3','.m3-board');
  await english(page,info,'match-3','Swap two neighbouring plants');
});

test('Alle vier: Katalog, Pausieren beim Verlassen, defekte Spielstände bleiben erhalten',async({page,app})=>{
  await login(page,app);
  await page.evaluate(()=>{location.hash='#spiele/einzelspieler';});
  for(const id of ['block-puzzle','solitaire','mahjong-solitaire','match-3'])await expect(page.locator(`[data-solo-start="${id}"], [data-game-open="${id}"]`).first()).toBeVisible();
  for(const id of ['block-puzzle','solitaire','mahjong-solitaire','match-3']){
    await page.evaluate(([k])=>localStorage.setItem(k,'{"kaputt":'),[key(id)]);
    await route(page,id);await expect(page.locator('.sp-setup .error')).toContainText('beschädigt');
    expect(await page.evaluate(([k])=>localStorage.getItem(k),[key(id)])).toBe('{"kaputt":');
    expect(await overflow(page)).toBe(true);
    await page.evaluate(()=>{location.hash='#spiele/einzelspieler';});
  }
});
