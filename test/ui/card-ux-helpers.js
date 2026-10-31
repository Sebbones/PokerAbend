import {test as base,expect,login,selectGame} from './helpers.js';
import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const test=base.extend({app:async({},use)=>{
  const child=spawn(process.execPath,['test/ui/card-ux-room-fixture.js'],{cwd:root,env:{...process.env,POKER_NO_DOTENV:'1',PORT:'0',DATA_DIR:mkdtempSync(join(tmpdir(),'card-ux-')),SITE_PASSWORD:'Card-UX-Testpasswort',CREATE_LIMIT:'100'},stdio:['ignore','pipe','pipe','ipc']});
  let output='',serial=0;const pending=new Map();child.stderr.on('data',(x)=>{output+=x;});child.on('message',(m)=>{const p=pending.get(m.request);if(!p)return;pending.delete(m.request);clearTimeout(p.timer);m.error?p.reject(Error(m.error)):p.resolve(m.result);});
  try{
    const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(output)),15000);child.once('error',(e)=>{clearTimeout(timer);reject(e);});child.stdout.on('data',(x)=>{output+=x;const m=output.match(/TEST_READY:(\d+)/);if(m){clearTimeout(timer);resolve('http://localhost:'+m[1]);}});});
    await use({url,password:'Card-UX-Testpasswort',fixture:(code,data)=>new Promise((resolve,reject)=>{const request=++serial,timer=setTimeout(()=>{pending.delete(request);reject(Error('Fixture timeout'));},10000);pending.set(request,{resolve,reject,timer});child.send({type:'card-fixture',request,code,data});})});
  }finally{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Test ended'));}if(child.exitCode===null){const ended=new Promise((resolve)=>child.once('exit',resolve));child.kill();await ended;}}
}});
export {expect};
export async function emit(page,event,data={}){const r=await page.evaluate(({event,data})=>send(event,data),{event,data});expect(r.ok,`${event}: ${r.error}`).toBe(true);return r;}
export async function openTable(page,browser,app,info,game,variant='classic',players=2){
  await login(page,app,'Anna');await selectGame(page,game);await page.locator('#host-variant').selectOption(variant);await page.locator('#host-form button[type=submit]').click();await expect(page.locator('#kg')).toBeVisible();await emit(page,'sit');await emit(page,'settings',{turnTime:0,startAction:false});
  const code=await page.evaluate(()=>lastState.code),contexts=[],guests=[],errors=[];
  const add=async(name,sit=true)=>{const context=await browser.newContext({viewport:page.viewportSize(),reducedMotion:'reduce',...(info.project.use.isMobile?{isMobile:true,hasTouch:true}:{})});contexts.push(context);const peer=await context.newPage();peer.on('pageerror',(e)=>errors.push(e.message));await login(peer,app,name);await peer.evaluate(({code,sit})=>joinAndEnter(code,sit?'sit':'watch'),{code,sit});await expect.poll(()=>peer.evaluate(()=>lastState?.code)).toBe(code);guests.push(peer);return peer;};
  await add('Sebastian');if(variant==='team'||players>=3)await add('Cem');if(variant==='team'||players>=4)await add('Dana');await emit(page,'start');await expect.poll(()=>page.evaluate(()=>lastState.phase)).toBe('playing');
  return {code,guests,add,async close(){for(const context of contexts)await context.close();expect(errors).toEqual([]);}};
}
export async function configure(page,app,code,data){const expected=await app.fixture(code,data);await expect.poll(()=>page.evaluate(()=>JSON.stringify(lastState.g))).toBe(JSON.stringify(expected.g));await expect.poll(()=>page.evaluate(()=>lastState.turnId)).toBe(expected.turn);}
