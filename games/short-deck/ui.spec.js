import {pokerBrowserCases} from '../omaha-hi-lo/browser-cases.js';
import {test,expect,login,selectGame} from '../../test/ui/helpers.js';
import {emit} from '../omaha-hi-lo/browser-cases.js';
import {mkdirSync} from 'node:fs';
pokerBrowserCases('short-deck',{ante:10});
test('Short Deck: ante plus blinds and normal straight-over-trips house setting are visible',async({page,app},info)=>{
  await login(page,app);await selectGame(page,'short-deck');await page.locator('#host-form button[type=submit]').click();await emit(page,'settings',{mode:'ante-blinds',tripsBeatStraight:false,ante:10,smallBlind:5,bigBlind:10,turnTime:0});await emit(page,'sit');await emit(page,'addBot');await emit(page,'start');await emit(page,'gamePause',{paused:true});await expect(page.locator('.pw-heading')).toContainText('5/10');expect(await page.evaluate(()=>lastState.settings.tripsBeatStraight)).toBe(false);expect(await page.evaluate(()=>lastState.g.hand.every(c=>'6789TJQKA'.includes(c[0])))).toBe(true);const dir=process.env.CLASSIC_CAPTURE_EVIDENCE==='1'?'public/games/short-deck/evidence':'games/short-deck/_artifacts/screenshots';mkdirSync(dir,{recursive:true});await page.screenshot({path:`${dir}/house-${info.project.name}.png`,fullPage:true});
});
