import { test, expect, login } from './helpers.js';
async function open(page,app){await login(page,app);await page.goto(app.url+'/material/test-material.html');await expect(page.locator('#status')).toHaveText('71 eigene SVGs geladen');}

test('EXP-F3 material overview: every vector renders and screenshots fit desktop/mobile',async({page,app},info)=>{
  await open(page,app);
  await expect(page.locator('[data-material-id]')).toHaveCount(71);await expect(page.locator('.material-svg')).toHaveCount(71);
  const vectors=await page.locator('.material-svg').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.material,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,box:{width:node.getBBox().width,height:node.getBBox().height},title:node.querySelector('title')?.textContent})));
  for(const svg of vectors){expect(svg.width,svg.id).toBeGreaterThan(20);expect(svg.height,svg.id).toBeGreaterThan(20);expect(svg.box.width,svg.id).toBeGreaterThan(0);expect(svg.box.height,svg.id).toBeGreaterThan(0);expect(svg.title).toBeTruthy();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath('material-overview.png'),fullPage:true});
});
test('EXP-F3 CSS palette recolors inline SVGs; chip edge marks survive monochrome',async({page,app},info)=>{
  await open(page,app);
  const shape=page.locator('[data-material-id="back-salon"] svg rect').nth(1);
  const before=await shape.evaluate(node=>getComputedStyle(node).fill);
  await page.locator('#palette').selectOption('nacht');
  await expect.poll(()=>shape.evaluate(node=>getComputedStyle(node).fill)).toBe('rgb(53, 57, 85)');expect(before).not.toBe('rgb(53, 57, 85)');
  await page.locator('#palette').selectOption('grau');
  await expect.poll(()=>shape.evaluate(node=>getComputedStyle(node).fill)).toBe('rgb(119, 119, 119)');
  const chips=await page.locator('#group-chips svg').evaluateAll(nodes=>nodes.map(node=>({face:getComputedStyle(node.querySelectorAll('circle')[1]).fill,mark:node.querySelector('g').innerHTML,value:node.querySelector('text').textContent})));
  expect(new Set(chips.map(c=>c.face)).size).toBe(1);expect(new Set(chips.map(c=>c.mark)).size).toBe(6);expect(chips.map(c=>c.value)).toEqual(['1','5','10','25','50','100']);
  await page.locator('#group-chips').screenshot({path:info.outputPath('chips-monochrome.png')});
});
test('EXP-F3 overlays: transparent center, reusable on emoji/initial/image avatars, safe labels',async({page,app})=>{
  await open(page,app);
  const result=await page.evaluate(async()=>{
    const {MATERIALS,createMaterial,createAccessory}=materialDemo,alpha=[];
    for(const item of MATERIALS.filter(m=>m.overlay)){
      const svg=await createAccessory(item.id);svg.setAttribute('width','100');svg.setAttribute('height','100');
      const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
      await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=100;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,100,100);alpha.push({id:item.id,center:ctx.getImageData(50,50,1,1).data[3]});
    }
    const wrappers=[];
    for(const kind of ['emoji','initials','image']){
      const wrapper=document.createElement('span');wrapper.className='material-avatar';wrapper.style.width=wrapper.style.height='100px';
      const base=document.createElement('span');base.className='material-avatar-base';
      if(kind==='image'){const img=document.createElement('img');img.src='/icons/apple-touch-icon.png';img.alt='Avatar';base.append(img);await img.decode();}else base.textContent=kind==='emoji'?'🦊':'AB';
      const overlay=await createAccessory('accessory-raumhelm');wrapper.append(base,overlay);document.body.append(wrapper);
      const a=wrapper.getBoundingClientRect(),b=overlay.getBoundingClientRect();wrappers.push({kind,dx:b.left-a.left,dy:b.top-a.top,width:b.width,height:b.height,pointer:getComputedStyle(overlay).pointerEvents,hidden:overlay.getAttribute('aria-hidden')});
    }
    const safe=await createMaterial('pawn',{label:'<img src=x onerror=alert(1)>'});
    let rejected=false;try{await createAccessory('pawn');}catch{rejected=true;}
    return {alpha,wrappers,rejected,label:safe.getAttribute('aria-label'),injected:safe.querySelectorAll('img,script').length};
  });
  for(const item of result.alpha)expect(item.center,item.id).toBe(0);
  for(const item of result.wrappers){expect(item.dx).toBe(0);expect(item.dy).toBe(0);expect(item.width).toBe(100);expect(item.height).toBe(100);expect(item.pointer).toBe('none');expect(item.hidden).toBe('true');}
  expect(result.rejected).toBe(true);expect(result.injected).toBe(0);expect(result.label).toBe('<img src=x onerror=alert(1)>');
});
