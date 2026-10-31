import {test,expect,emit,openTable,configure} from './card-ux-helpers.js';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const shot=async(page,info,name)=>{const dir=resolve('artifacts/card-ux/after',info.project.name);mkdirSync(dir,{recursive:true});await page.screenshot({path:resolve(dir,name+'.png'),fullPage:true});};
const hand=async(page)=>page.evaluate(()=>JSON.stringify(lastState.g.hand));
async function watchEmits(page){await page.evaluate(()=>{window.cixEmits=[];const original=socket.emit;socket.emit=function(event,data,...rest){if(['play','draw','discard','lay','hit','chooseColor','challenge'].includes(event))window.cixEmits.push({event,data:structuredClone(data)});return original.call(this,event,data,...rest);};});}

for(const variant of ['classic','flip','no-mercy','all-wild','halloween-ghosthunt'])test(`Card UX UNO ${variant}: exact selection, confirm, counts, pause and reconnect`,async({page,browser,app},info)=>{
  test.setTimeout(70000);const room=await openTable(page,browser,app,info,'farbenchaos',variant);
  try{
    await configure(page,app,room.code,{});await watchEmits(page);const initial=await hand(page),cards=page.locator('.kg-hand [data-card-key]');
    const first=cards.nth(0),second=cards.nth(1),key=await second.getAttribute('data-card-key');await second.focus();await second.press('Enter');await expect(second).toHaveAttribute('aria-pressed','true');await expect(first).toHaveAttribute('aria-pressed','false');expect(await hand(page)).toBe(initial);
    await page.evaluate(()=>{window.selectedCardNode=document.querySelector('.kg-hand [aria-pressed=true]');current.onState(structuredClone(lastState));});expect(await page.locator('.kg-hand [aria-pressed=true]').evaluate((n)=>n===window.selectedCardNode)).toBe(true);
    await page.locator('[data-kit=sort]').click();await expect(page.locator(`.kg-hand [data-card-key="${key}"]`)).toHaveAttribute('aria-pressed','true');expect(await hand(page)).toBe(initial);
    await page.evaluate(()=>I18n.select('en'));await expect(page.locator('.cix-turn strong')).toHaveText('YOUR TURN');await expect(page.locator('.cix-turn small').first()).toContainText('Card selected');await expect(page.locator(`.kg-hand [data-card-key="${key}"]`)).toHaveAttribute('aria-pressed','true');await page.evaluate(()=>I18n.select('de'));
    await shot(page,info,`uno-${variant}-selected`);await page.locator('.kg-acts [data-g=play-selected]').click();if(variant==='no-mercy')await page.locator('[data-g=target]').first().click();await expect.poll(()=>hand(page)).not.toBe(initial);await expect(page.locator('.kg-hand [aria-pressed=true]')).toHaveCount(0);
    const count=await page.evaluate(()=>lastState.players.find((p)=>p.id===lastState.you.id).cards);await expect(room.guests[0].locator('.cix-count [data-hand-count]').first()).toHaveText(String(count));
    await emit(page,'gamePause',{paused:true});await expect(room.guests[0].locator('#game-pause-banner')).toBeVisible();await shot(page,info,`uno-${variant}-paused`);await page.reload();await expect(page.locator('#game-pause-banner')).toBeVisible();expect(await page.locator('.kg-hand [aria-pressed=true]').count()).toBe(0);await emit(page,'gamePause',{paused:false});
    const watcher=await room.add('Robin',false);await expect(watcher.locator('.cix-turn strong')).toHaveText('Du schaust zu');expect(await watcher.evaluate(()=>lastState.g.hand)).toBeNull();await expect(watcher.locator('.kg-hand [data-card-key]')).toHaveCount(0);
  }finally{await room.close();}
});

async function playCode(page,code,{wish,target}={}){
  await page.locator(`.kg-hand [data-card^="${code}"]`).first().click();await page.locator('.kg-acts [data-g=play-selected]').click();
  if(target)await page.locator(`[data-g=target][data-target="${target}"]`).click();
  if(wish)await page.locator(`[data-g=wish][data-wish="${wish}"]`).click();
}
test('UNO Flip retains private faces, flips physically and confirms dark-side colours and a challenge',async({page,browser,app},info)=>{
  const room=await openTable(page,browser,app,info,'farbenchaos','flip');
  try{
    await configure(page,app,room.code,{top:'7r',hand:['Lr','7r','Ww','Ib','9y','3g','Rr']});await playCode(page,'Lr');await expect.poll(()=>page.evaluate(()=>lastState.g.side)).toBe(1);expect(await page.evaluate(()=>lastState.g.inactiveHands[lastState.you.id])).toBeUndefined();await expect(page.locator('.kg-hand .kc[data-face=light]')).toHaveCount(0);
    await configure(page,app,room.code,{side:1});await playCode(page,'Ww');await expect(page.locator('.kg-wishes')).toContainText('Lila');await page.evaluate(()=>I18n.select('en'));await expect(page.locator('.kg-wishes')).toContainText('Purple');await expect(page.locator('.cix-turn small').first()).toContainText('Which colour');await expect(page.locator('[data-kit=sort]')).toContainText('Sort: off');await expect(page.locator('.fc-current-colour')).toContainText('Teal');await shot(page,info,'uno-colour-choice-english');await page.evaluate(()=>I18n.select('de'));await page.locator('[data-g=wish][data-wish=v]').click();await expect.poll(()=>page.evaluate(()=>lastState.g.wish)).toBe('v');
    await configure(page,app,room.code,{side:0,hand:['Bw','7r','7r','Ib','9y','3g','Rr']});await playCode(page,'Bw',{wish:'r'});await expect(room.guests[0].locator('[data-g=acceptDraw]')).toBeVisible();await room.guests[0].locator('[data-g=acceptDraw]').click();await expect.poll(()=>room.guests[0].evaluate(()=>lastState.g.challenge)).toBeNull();await shot(page,info,'uno-flip-dark-and-challenge');
  }finally{await room.close();}
});
test('UNO No Mercy confirms penalties, roulette colours and publicly marked elimination',async({page,browser,app},info)=>{
  test.setTimeout(70000);const room=await openTable(page,browser,app,info,'farbenchaos','no-mercy',3);
  try{
    await configure(page,app,room.code,{hand:['Uw','Zw','7r','5g','Rr','Qw','Ag'],otherCounts:[24,7]});await playCode(page,'Uw',{wish:'r'});await expect.poll(()=>room.guests[0].evaluate(()=>lastState.g.pending)).toBe(6);await room.guests[0].locator('[data-g=draw]').click();await expect.poll(()=>page.evaluate(()=>lastState.players.find((p)=>p.name==='Sebastian').eliminated)).toBe(true);await expect(page.locator('.kp.eliminated')).toContainText('Ausgeschieden');await shot(page,info,'uno-no-mercy-eliminated');
    await configure(page,app,room.code,{hand:['Qw','Zw','7r','5g','Rr','Ag','9b']});await playCode(page,'Qw');const target=room.guests[0];await expect(target.locator('[data-g=chooseColor]')).toHaveCount(4);await target.evaluate(()=>I18n.select('en'));await expect(target.locator('[data-g=chooseColor][data-color=b]')).toHaveText('Blue');await target.locator('[data-g=chooseColor][data-color=b]').click();await expect.poll(()=>target.evaluate(()=>lastState.g.colorChoice)).toBeNull();
  }finally{await room.close();}
});
test('UNO All Wild uses explicit target choices for swapping and targeted draw',async({page,browser,app},info)=>{
  const room=await openTable(page,browser,app,info,'farbenchaos','all-wild');
  try{
    await configure(page,app,room.code,{});const target=await room.guests[0].evaluate(()=>lastState.you.id),initial=await hand(page);await page.locator('.kg-hand [data-card^=Xw]').click();await page.locator('.kg-acts [data-g=play-selected]').click();expect(await hand(page)).toBe(initial);await shot(page,info,'uno-all-wild-target');await page.locator(`[data-g=target][data-target="${target}"]`).click();await expect.poll(()=>hand(page)).not.toBe(initial);
    await configure(page,app,room.code,{});const count=await page.evaluate((id)=>lastState.players.find((p)=>p.id===id).cards,target);await playCode(page,'Tw',{target});await expect.poll(()=>page.evaluate((id)=>lastState.players.find((p)=>p.id===id).cards,target)).toBe(count+2);
  }finally{await room.close();}
});
for(const variant of ['classic','halloween-ghosthunt'])test(`UNO ${variant} last-card call remains an explicit choice with a visible opponent count`,async({page,browser,app},info)=>{
  const room=await openTable(page,browser,app,info,'farbenchaos',variant);
  try{
    await configure(page,app,room.code,{top:'7r',hand:['5r','9g'],settings:{unoCall:true,catchCall:true}});await page.locator('.kg-hand [data-card="5r"]').click();await page.locator('[data-g=call]').click();await expect(page.locator('[data-g=call]')).toHaveAttribute('aria-pressed','true');await page.locator('.kg-acts [data-g=play-selected]').click();await expect.poll(()=>page.evaluate(()=>lastState.g.hand.length)).toBe(1);await expect(room.guests[0].locator('.cix-count.last')).toContainText('UNO!');expect(await page.evaluate(()=>lastState.g.forgot)).toBeNull();await shot(room.guests[0],info,`uno-${variant}-last-card`);
  }finally{await room.close();}
});

test('UNO wild colour and target choices are explicit and a rejected action preserves the exact selection',async({page,browser,app},info)=>{
  const room=await openTable(page,browser,app,info,'farbenchaos');
  try{
    await configure(page,app,room.code,{});const initial=await hand(page);await page.locator('.kg-hand [data-card=Ww]').evaluate((n)=>{window.wildCardBeforeAck=n;});await page.locator('.kg-hand [data-card=Ww]').click();expect(await page.locator('.kg-hand [data-card=Ww]').evaluate((n)=>n===window.wildCardBeforeAck)).toBe(true);await expect(page.locator('.kg-wishes')).toHaveCount(0);await page.locator('.kg-acts [data-g=play-selected]').click();await expect(page.locator('.kg-wishes .wish')).toHaveCount(4);expect(await hand(page)).toBe(initial);
    await page.evaluate(()=>{window.cixPlayCount=0;const original=socket.emit;socket.emit=function(event,data,ack){if(event==='play'){window.cixPlayCount++;return original.call(this,event,{...data,card:'invalid-card'},(r)=>setTimeout(()=>ack(r),300));}return original.apply(this,arguments);};window.restoreCixEmit=()=>{socket.emit=original;};});
    await page.locator('.kg-wishes [data-wish=r]').click();await expect(page.locator('#kg-dock')).toHaveAttribute('aria-busy','true');await page.evaluate(()=>document.querySelector('.kg-wishes [data-wish=r]').dispatchEvent(new MouseEvent('click',{bubbles:true})));await expect(page.locator('.cix-error')).toBeVisible();expect(await page.evaluate(()=>window.cixPlayCount)).toBe(1);expect(await hand(page)).toBe(initial);await expect(page.locator('.kg-hand [data-card=Ww]')).toHaveAttribute('aria-pressed','true');
    expect(await page.locator('.kg-hand [data-card=Ww]').evaluate((n)=>n===window.wildCardBeforeAck)).toBe(true);await page.evaluate(()=>window.restoreCixEmit());await page.locator('.kg-wishes [data-wish=r]').click();await expect.poll(()=>hand(page)).not.toBe(initial);await expect.poll(()=>page.evaluate(()=>lastState.g.wish)).toBe('r');
  }finally{await room.close();}
});

for(const variant of ['classic','short','team'])test(`Card UX Skip-Bo ${variant}: exact destinations, source, sort and confirmed discard`,async({page,browser,app},info)=>{
  test.setTimeout(70000);const room=await openTable(page,browser,app,info,'stapelrennen',variant);
  try{
    await configure(page,app,room.code,{});await watchEmits(page);const initial=await hand(page);await page.locator('.kg-hand [data-i="2"]').click();await expect(page.locator('.st-build.can')).toHaveCount(1);await expect(page.locator('.st-build.can .st-need')).toHaveText('8');await page.evaluate(()=>I18n.select('en'));await expect(page.locator('.cix-turn small').first()).toContainText('end turn');await page.evaluate(()=>I18n.select('de'));await shot(page,info,`skip-${variant}-targets`);
    await page.locator('[data-kit=sort]').click();expect(await hand(page)).toBe(initial);await page.locator('.st-build.can').click();await expect.poll(()=>hand(page)).not.toBe(initial);expect(await page.evaluate(()=>window.cixEmits.at(-1).data.from.index)).toBe(2);
    if(variant==='team'){
      const partner=await page.evaluate(()=>lastState.g.partner);const before=await page.evaluate((id)=>lastState.players.find((p)=>p.id===id).stock,partner);await page.locator(`.st-partner [data-kind=stock][data-owner="${partner}"]`).click();await page.locator('.st-build.can').first().click();await expect.poll(()=>page.evaluate((id)=>lastState.players.find((p)=>p.id===id).stock,partner)).toBe(before-1);expect(await page.evaluate(()=>window.cixEmits.at(-1).data.from.owner)).toBe(partner);
    }
    await page.locator('.kg-hand [data-kind=hand]').first().click();await expect(page.locator('.cix-selection')).toContainText('beendet den Zug');await page.locator('.st-mine [data-g=drop]').first().click();await expect.poll(()=>page.evaluate(()=>lastState.turnId)).not.toBe(await page.evaluate(()=>lastState.you.id));await expect(page.locator('.kg-hand [draggable=true]')).toHaveCount(0);await expect(room.guests[0].locator('.cix-turn strong')).toHaveText('DU BIST DRAN');
  }finally{await room.close();}
});

test('Desktop drag highlights only valid Skip-Bo targets and never emits for an invalid drop',async({page,browser,app},info)=>{
  test.skip(info.project.name!=='desktop','Touch uses the equivalent select-then-target path.');const room=await openTable(page,browser,app,info,'stapelrennen');
  try{await configure(page,app,room.code,{});await watchEmits(page);const initial=await hand(page),src=page.locator('.kg-hand [data-i="2"]');await src.dragTo(page.locator('.st-build[data-i="0"]'),{force:true});expect(await hand(page)).toBe(initial);expect(await page.evaluate(()=>window.cixEmits.length)).toBe(0);await src.dragTo(page.locator('.st-build[data-i="2"]'),{force:true});await expect.poll(()=>hand(page)).not.toBe(initial);expect(await page.evaluate(()=>window.cixEmits.length)).toBe(1);}finally{await room.close();}
});

test('Skip-Bo desktop partner drag keeps the exact source owner',async({page,browser,app},info)=>{
  test.skip(info.project.name!=='desktop','Native drag is optional; partner tapping runs on all devices.');test.setTimeout(70000);const room=await openTable(page,browser,app,info,'stapelrennen','team');
  try{
    await configure(page,app,room.code,{});await watchEmits(page);const partner=await page.evaluate(()=>lastState.g.partner),before=await page.evaluate((id)=>lastState.players.find((p)=>p.id===id).stock,partner);
    const src=page.locator(`.st-partner [data-kind=stock][data-owner="${partner}"]`),target=page.locator('.st-build[data-i="0"]');
    // The partner area and shared piles can be separated by a scroll viewport. Keep the
    // actual mouse drag held while revealing the destination, rather than dragging from
    // coordinates made stale by dragTo's second scroll-into-view.
    await src.scrollIntoViewIfNeeded();const box=await src.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+12,box.y+box.height/2,{steps:4});
    await expect(src).toHaveClass(/cix-dragging/);await target.scrollIntoViewIfNeeded();const end=await target.boundingBox();await page.mouse.move(end.x+end.width/2,end.y+end.height/2,{steps:12});await page.mouse.up();
    await expect.poll(()=>page.evaluate((id)=>lastState.players.find((p)=>p.id===id).stock,partner)).toBe(before-1);expect(await page.evaluate(()=>window.cixEmits.at(-1).data.from.owner)).toBe(partner);
  }finally{await room.close();}
});

for(const variant of ['classic','short','team'])test(`Card UX Phase 10 ${variant}: deliberate groups, numbered stable IDs and explicit lay`,async({page,browser,app},info)=>{
  test.setTimeout(70000);const room=await openTable(page,browser,app,info,'zehnetappen',variant);
  try{
    await configure(page,app,room.code,{});await page.evaluate(()=>I18n.select('en'));await expect(page.locator('.cix-turn small').first()).toContainText('Select cards');await expect(page.locator('[data-g=lay]')).toHaveText('Lay phase');await expect(page.locator('.ze-slot').first()).toContainText('3 of a kind');await expect(page.locator('.ze-why').first()).toContainText('cards still needed');await shot(page,info,'phase-groups-english');await page.evaluate(()=>I18n.select('de'));const original=await hand(page),values=await page.evaluate(()=>lastState.g.hand);const select=async(c,n)=>{const id=values.find((x)=>x.c===c&&x.n===n).id;await page.locator(`.kg-hand [data-id="${id}"]`).click();};
    for(const c of ['r','g','b'])await select(c,7);await expect(page.locator('.ze-slot').first()).toContainText('3/3');await expect(page.locator('.cix-phase-order')).toHaveCount(3);await page.locator('.ze-slot-head').nth(1).click();for(const [c,n] of [['r',3],['g',4],['b',5],['y',6]])await select(c,n);
    await expect(page.locator('[data-g=lay]')).toBeEnabled();expect(await hand(page)).toBe(original);await page.locator('[data-kit=sort]').click();await expect(page.locator('.kg-hand [aria-pressed=true]')).toHaveCount(7);expect(await hand(page)).toBe(original);await shot(page,info,`phase-${variant}-groups`);
    await page.locator('[data-g=lay]').click();await expect.poll(()=>page.evaluate(()=>lastState.players.find((p)=>p.id===lastState.you.id).laidDone)).toBe(true);await expect(page.locator('.ze-slot')).toHaveCount(0);await expect(page.locator('.kg-hand [aria-pressed=true]')).toHaveCount(0);
    await page.locator('[data-g=mode-discard]').click();await page.locator('.kg-hand .kc').filter({hasNot:page.locator('.sym')}).first().click();await page.locator('[data-g=discard]').click();await expect.poll(()=>page.evaluate(()=>lastState.turnId)).not.toBe(await page.evaluate(()=>lastState.you.id));
  }finally{await room.close();}
});

test('Phase 10 Joker endpoints and skip targets submit only the explicitly chosen decision',async({page,browser,app},info)=>{
  const room=await openTable(page,browser,app,info,'zehnetappen');
  try{
    await configure(page,app,room.code,{hand:['y7','j0','r2','s0'],laid:[{type:'set',cards:['r7','g7','b7'],vals:[7,7,7]},{type:'run',cards:['r3','g4','b5','y6'],vals:[3,4,5,6]}]});await watchEmits(page);
    const joker=await page.evaluate(()=>lastState.g.hand.find((c)=>c.c==='j').id);await page.locator(`.kg-hand [data-id="${joker}"]`).click();await expect(page.locator('[data-g=hit][data-side=low]')).toBeVisible();await page.locator('[data-g=hit][data-side=low]').click();await expect.poll(()=>page.evaluate(()=>Object.values(lastState.g.laid).flat().find((g)=>g.type==='run').vals[0])).toBe(2);expect(await page.evaluate(()=>window.cixEmits.at(-1).data.end)).toBe('low');
    await page.locator('[data-g=mode-discard]').click();const skip=await page.evaluate(()=>lastState.g.hand.find((c)=>c.c==='s').id);await page.locator(`.kg-hand [data-id="${skip}"]`).click();const initial=await hand(page);await page.locator('[data-g=discard]').click();await expect(page.locator('[data-g=skipwho]')).toHaveCount(1);expect(await hand(page)).toBe(initial);await page.locator('[data-g=skipwho]').click();await expect.poll(()=>hand(page)).not.toBe(initial);
  }finally{await room.close();}
});

test('Phase 10 desktop Joker drop asks for an end instead of silently choosing one',async({page,browser,app},info)=>{
  test.skip(info.project.name!=='desktop','Touch chooses the same explicit endpoint buttons.');const room=await openTable(page,browser,app,info,'zehnetappen');
  try{
    await configure(page,app,room.code,{hand:['y7','j0','r2','s0'],laid:[{type:'set',cards:['r7','g7','b7'],vals:[7,7,7]},{type:'run',cards:['r3','g4','b5','y6'],vals:[3,4,5,6]}]});await watchEmits(page);const initial=await hand(page),id=await page.evaluate(()=>lastState.g.hand.find((c)=>c.c==='j').id);await page.locator(`.kg-hand [data-id="${id}"]`).dragTo(page.locator('.ze-group[data-group="1"]'),{force:true});expect(await hand(page)).toBe(initial);expect(await page.evaluate(()=>window.cixEmits.length)).toBe(0);await expect(page.locator('[data-g=hit][data-side=high]')).toBeVisible();await shot(page,info,'phase-joker-end-choice');await page.locator('[data-g=hit][data-side=high]').click();await expect.poll(()=>hand(page)).not.toBe(initial);expect(await page.evaluate(()=>window.cixEmits.at(-1).data.end)).toBe('high');
  }finally{await room.close();}
});

test('UNO desktop drag submits the exact physical duplicate and asks for a wild colour',async({page,browser,app},info)=>{
  test.skip(info.project.name!=='desktop','Touch uses explicit selection and confirmation.');const room=await openTable(page,browser,app,info,'farbenchaos','flip');
  try{
    await configure(page,app,room.code,{});await watchEmits(page);const src=page.locator('.kg-hand [data-card^="7r"]').nth(1),token=await src.getAttribute('data-card'),initial=await hand(page);
    await src.dragTo(page.locator('[data-drop=discard]'));await expect.poll(()=>hand(page)).not.toBe(initial);expect(await page.evaluate(()=>window.cixEmits.at(-1).data.card)).toBe(token);
    await configure(page,app,room.code,{});const before=await hand(page),count=await page.evaluate(()=>window.cixEmits.length);await page.locator('.kg-hand [data-card^=Ww]').dragTo(page.locator('[data-drop=discard]'));await expect(page.locator('[data-g=wish]')).toHaveCount(4);expect(await hand(page)).toBe(before);expect(await page.evaluate(()=>window.cixEmits.length)).toBe(count);await page.locator('[data-g=wish][data-wish=g]').click();await expect.poll(()=>hand(page)).not.toBe(before);
  }finally{await room.close();}
});

test('missing acknowledgement stays locked until a deliberate reconnect without replaying the action',async({page,browser,app},info)=>{
  test.skip(info.project.name!=='desktop','Connection edge case is device independent.');test.setTimeout(50000);const room=await openTable(page,browser,app,info,'farbenchaos');
  try{
    await configure(page,app,room.code,{});await watchEmits(page);await page.evaluate(()=>{const original=socket.emit;let dropped=false;socket.emit=function(event,data,...rest){if(event==='draw'&&!dropped){dropped=true;return original.call(this,event,data,()=>{});}return original.call(this,event,data,...rest);};});
    await page.locator('[data-g=draw]').click();await expect(page.locator('.cix-turn strong')).toHaveText('Warte auf Bestätigung');await expect(page.locator('[data-kit=resync]')).toBeVisible({timeout:16000});await expect(page.locator('[data-g=pass]')).toBeDisabled();expect(await page.evaluate(()=>window.cixEmits.filter((x)=>x.event==='draw').length)).toBe(1);await shot(page,info,'uno-unconfirmed');
    await page.locator('[data-kit=resync]').click();await expect(page.locator('.cix-error')).toHaveCount(0);await expect(page.locator('[data-g=pass]')).toBeEnabled();expect(await page.evaluate(()=>window.cixEmits.filter((x)=>x.event==='draw').length)).toBe(1);
    await configure(page,app,room.code,{hand:['5r'],top:'7r'});await playCode(page,'5r');await expect.poll(()=>page.evaluate(()=>lastState.phase)).toBe('over');await expect(page.locator('.cix-turn strong')).toHaveText('Runde beendet');
  }finally{await room.close();}
});

test('readonly clocks preserve the same card node; disconnect clears selection and never queues a move',async({page,browser,app},info)=>{
  const room=await openTable(page,browser,app,info,'farbenchaos');
  try{
    await configure(page,app,room.code,{});await watchEmits(page);await page.locator('.kg-hand .kc').first().click();
    await page.evaluate(()=>{window.cixNode=document.querySelector('.kg-hand [aria-pressed=true]');const view=structuredClone(lastState);view.deadline=view.now+15000;current.onState(view);});
    expect(await page.locator('.kg-hand [aria-pressed=true]').evaluate((n)=>n===window.cixNode)).toBe(true);await expect(page.locator('[data-cix-clock]')).toContainText('s');
    await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.kg-hand [aria-pressed=true]')).toHaveCSS('transition-duration','0s');
    const original=await hand(page);await page.evaluate(()=>socket.disconnect());await expect(page.locator('.cix-turn strong')).toHaveText('Verbindung wird wiederhergestellt');await expect(page.locator('.kg-hand [aria-pressed=true]')).toHaveCount(0);
    await page.evaluate(()=>document.querySelector('[data-g=draw]').dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(await page.evaluate(()=>window.cixEmits.length)).toBe(0);expect(await hand(page)).toBe(original);
    await page.evaluate(()=>socket.connect());await expect(page.locator('.cix-turn strong')).toHaveText('DU BIST DRAN');await expect(page.locator('.kg-hand [aria-pressed=true]')).toHaveCount(0);
  }finally{await room.close();}
});

test('long hands stay fully reachable; scrolling and keyboard navigation never play a card',async({page,browser,app},info)=>{
  const room=await openTable(page,browser,app,info,'farbenchaos');
  try{
    const cards=Array.from({length:24},(_,i)=>`${i%9+1}${'ryg'[Math.floor(i/9)]}`);await configure(page,app,room.code,{hand:cards});await watchEmits(page);const original=await hand(page),list=page.locator('.kg-hand .kc');await expect(list).toHaveCount(24);expect(await list.last().evaluate((n)=>n.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
    await list.first().focus();await list.first().press('End');await expect(list.last()).toBeFocused();await expect(list.last()).toBeInViewport();expect(await page.evaluate(()=>window.cixEmits.length)).toBe(0);
    if(info.project.name==='mobil'){
      const session=await page.context().newCDPSession(page),box=await page.locator('.kg-hand').boundingBox(),y=Math.min(page.viewportSize().height-40,box.y+box.height/2);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:270,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
    }
    expect(await hand(page)).toBe(original);expect(await page.evaluate(()=>window.cixEmits.length)).toBe(0);await list.last().scrollIntoViewIfNeeded();if(info.project.use.hasTouch){const box=await list.last().boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else await list.last().click();await expect(list.last()).toHaveAttribute('aria-pressed','true');expect(await hand(page)).toBe(original);await shot(page,info,'uno-long-hand');
  }finally{await room.close();}
});

for(const game of ['farbenchaos','stapelrennen','zehnetappen'])test(`Card UX six-viewports ${game}: selected hand, valid targets and status stay reachable`,async({page,browser,app},info)=>{
  test.skip(info.project.name!=='desktop','Explicit viewport matrix is run once.');test.setTimeout(100000);const room=await openTable(page,browser,app,info,game);
  try{
    await configure(page,app,room.code,{});
    if(game==='farbenchaos')await page.locator('.kg-hand [data-card="7r"]').first().click();else if(game==='stapelrennen')await page.locator('.kg-hand [data-i="2"]').click();else{for(const c of ['r','g','b']){const id=await page.evaluate((c)=>lastState.g.hand.find((x)=>x.c===c&&x.n===7).id,c);await page.locator(`.kg-hand [data-id="${id}"]`).click();}}
    for(const [width,height] of [[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]]){
      await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('.cix-turn strong')).toBeInViewport();const dock=await page.locator('#kg-dock').boundingBox();expect(dock.y).toBeGreaterThanOrEqual(0);expect(dock.y+dock.height).toBeLessThanOrEqual(height+1);await shot(page,info,`${game}-${width}x${height}`);
    }
  }finally{await room.close();}
});
