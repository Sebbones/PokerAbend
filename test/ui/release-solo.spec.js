// Fresh games only: no save injection, altered RNG or fabricated end screens.
import {test,expect,login} from './release-helpers.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import * as nonogram from '../../public/singleplayer/nonogramm-logic.js';
import * as block from '../../public/singleplayer/blockpuzzle-logic.js';
import * as sol from '../../public/singleplayer/solitaire-logic.js';
import * as mahjong from '../../public/singleplayer/mahjong-logic.js';
import * as match from '../../public/singleplayer/match3-logic.js';
test.describe.configure({mode:'parallel'});
test.skip(process.env.RELEASE_AUDIT !== '1','Long fresh-game release audit; enable explicitly with RELEASE_AUDIT=1.');
const ids=['sudoku','2048','wellenwacht','snake','memory','minesweeper','nonogramm','sokoban','block-puzzle','solitaire','mahjong-solitaire','match-3'].filter(id=>!process.env.RELEASE_GAMES||process.env.RELEASE_GAMES.split(',').includes(id));
const saved=(p,id)=>p.evaluate(id=>JSON.parse(localStorage.getItem('poker:singleplayer:'+id))?.state,id);
async function measure(p){return p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('[data-solo] button:not(:disabled),[data-solo] summary,[data-solo] select')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const b=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,60),width:Math.round(b.width),height:Math.round(b.height),cls:e.className};}).filter(b=>b.width<44||b.height<44)}));}
const tap=async(p,selector,options)=>{const target=p.locator(selector).first();await (p._releaseTouch?target.tap(options):target.click(options));};
async function start(p,difficulty){if(difficulty&&await p.locator('[name=difficulty]').count())await p.locator('[name=difficulty]').selectOption(difficulty);await tap(p,'[data-setup] button[type=submit]');}
async function solitaireMove(p,s,h){
 if(h.draw)return tap(p,'[data-sol=stock]');
 const from=h.from.k==='waste'?'[data-sol=waste]':`[data-sol=tab][data-col="${h.from.col}"][data-index="${h.from.index}"]`;
 await tap(p,from,{position:{x:8,y:6}});
 if(h.to.k==='found')await tap(p,`[data-sol=found][data-suit="${sol.SUITS.indexOf(sol.cardsAt(s,h.from)[0][1])}"]`);
 else await p.locator(`[data-sol=tab][data-col="${h.to.col}"],[data-sol=col][data-col="${h.to.col}"]`).last().click({position:{x:8,y:6}});
}
async function finish(p,id){
 if(id==='snake'){await expect(p.locator('.sp-result')).toBeVisible({timeout:15000});return;}
 if(id==='sudoku'){
  const s=await saved(p,id);for(let i=0;i<81;i++)if(!s.givens[i]){await tap(p,`[data-cell="${i}"]`);await tap(p,`[data-action=digit-${s.solution[i]}]`);}return;
 }
 if(id==='memory'){
  const s=await saved(p,id);for(const value of new Set(s.cards))for(const i of s.cards.flatMap((v,i)=>v===value?[i]:[]))await tap(p,`[data-cell="${i}"]`);return;
 }
 if(id==='minesweeper'){
  await tap(p,'[data-cell="0"]');const s=await saved(p,id);expect(s.mines).not.toContain(0);
  for(let i=0;i<s.opened.length;i++){const t=await saved(p,id);if(t.status!=='playing')break;if(!t.opened[i]&&!s.mines.includes(i))await tap(p,`[data-cell="${i}"]`);}return;
 }
 if(id==='nonogramm'){const s=await saved(p,id),level=nonogram.LEVELS.find(l=>l.id===s.level);for(const [i,v]of level.solution.entries())if(v)await tap(p,`[data-cell="${i}"]`);return;}
 if(id==='sokoban'){await tap(p,'[data-dir=right]');await tap(p,'[data-dir=up]');return;}
 if(id==='2048'){
  const dirs=['left','down','right','up'];for(let n=0;n<3000;n++){if((await saved(p,id)).status!=='playing')return;await tap(p,`[data-dir="${dirs[n%4]}"]`);}throw Error('2048 move budget exhausted');
 }
 if(id==='wellenwacht'){
  await tap(p,'[data-action=speed]');
  for(let i=0;i<600;i++){const s=await saved(p,id);if(s.status!=='playing')return;if(!s.active)await tap(p,'[data-action=wave]');await p.waitForTimeout(300);}throw Error('Defense time budget exhausted');
 }
 if(id==='block-puzzle'){
  for(let step=0;step<500;step++){
   const s=await saved(p,id);if(s.status!=='playing')return;let h;
   outer:for(let piece=0;piece<3;piece++)if(s.pieces[piece]!==null)for(let r=0;r<block.size(s);r++)for(let c=0;c<block.size(s);c++)if(block.canPlace(s,s.pieces[piece],r,c)){h={piece,r,c};break outer;}
   expect(h).toBeTruthy();await tap(p,`[data-piece="${h.piece}"]`);const cell=`[data-cell="${h.r*block.size(s)+h.c}"]`;
   await tap(p,cell);if((await saved(p,id)).placed===s.placed)await tap(p,cell);
  }throw Error('Block-puzzle move budget exhausted');
 }
 if(id==='mahjong-solitaire'){
  const s=await saved(p,id),order=mahjong.solution({difficulty:s.difficulty,seed:s.seed});for(const pair of order)for(const i of pair)await tap(p,`[data-tile="${i}"]`);return;
 }
 if(id==='match-3'){
  for(let i=0;i<30;i++){const s=await saved(p,id);if(s.status!=='playing')return;const pair=match.validSwaps(s.grid)[0];expect(pair).toBeTruthy();for(const cell of pair)await tap(p,`[data-cell="${cell}"]`);}throw Error('Match-3 move budget exhausted');
 }
 if(id==='solitaire'){
  for(let deal=0;deal<12;deal++){
   const seen=new Set();for(let n=0;n<450;n++){
    const s=await saved(p,id);if(s.status==='won')return;
    const preview=structuredClone(s);if(sol.canAutoFinish(s))sol.autoFinish(preview);
    if(preview.status==='won'){
      // The real UI starts its end-game animation automatically. Do not race
      // it by waiting for an Auto-place button that may already have vanished.
      await expect(p.locator('.sp-result')).toBeVisible({timeout:15000});return;
    }
    const key=JSON.stringify([s.tableau,s.stock,s.waste,s.foundations]);if(seen.has(key))break;seen.add(key);
    const h=sol.hint(s);if(!h)break;await solitaireMove(p,s,h);
   }
   if(deal<11){await tap(p,'.sp-common [data-action=new]');await start(p,'easy');}
  }throw Error('No winning Solitaire deal found in twelve genuine deals; no artificial ending used');
 }
}
for(const id of ids)test(`Release solo ${id}: fresh game to natural end, pause, reload, English and phone layout`,async({page,app},info)=>{
 test.setTimeout(300000);const dir=`artifacts/release-2026-11-08/${info.project.name}/${id}`;mkdirSync(dir,{recursive:true});
 page._releaseTouch=info.project.name==='mobil';
 const r={id,project:info.project.name,checks:{},errors:[],samples:[]};page.on('pageerror',e=>r.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')r.errors.push(m.text());});
 try{
  await login(page,app);await page.evaluate(id=>{location.hash='#solo/'+id;},id);await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible();
  await start(page,id==='block-puzzle'?'hard':id==='wellenwacht'?'hard':'easy');r.checks.started=true;
  await tap(page,'.sp-common [data-action=pause]');const before=await saved(page,id);await page.waitForTimeout(250);expect(await saved(page,id)).toEqual(before);r.checks.pause=true;
  await page.reload();await expect(page.locator('.sp-paused')).toBeVisible();const after=await saved(page,id);expect(after.paused).toBe(true);r.checks.reconnect=true;
  await page.evaluate(()=>I18n.select('en'));await tap(page,'.sp-paused [data-action=pause]');r.englishText=await page.locator('[data-solo]').innerText();
  r.samples.push({stage:'playing',...await measure(page)});await page.screenshot({path:dir+'/playing.png',fullPage:true});
  if(info.project.name==='mobil')expect(r.samples.at(-1).small,'All measured solo controls and board cells are at least 44px').toEqual([]);
  await page.locator('.sp-details').first().locator('summary').click();r.rulesText=await page.locator('.sp-details').first().innerText();r.checks.rulesVisible=!!r.rulesText;await page.locator('.sp-details').first().locator('summary').click();
  await finish(page,id);await expect(page.locator('.sp-result')).toBeVisible();r.checks.ended=(await saved(page,id)).status!=='playing';r.checks.resultVisible=true;
  r.resultText=await page.locator('[data-solo]').innerText();r.samples.push({stage:'result',...await measure(page)});await page.screenshot({path:dir+'/result.png',fullPage:true});
  expect(r.errors).toEqual([]);expect(r.samples.every(s=>!s.overflow)).toBe(true);
 }catch(e){r.failure=e.message;r.failureState=await saved(page,id).catch(()=>null);await page.screenshot({path:dir+'/failure.png',fullPage:true}).catch(()=>{});throw e;}finally{writeFileSync(dir+'/report.json',JSON.stringify(r,null,2));}
});
