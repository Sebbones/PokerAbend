import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { MATERIALS, getMaterial } from '../public/material/index.js';
const root=resolve('public/material');
const source=item=>readFileSync(resolve(root,item.file),'utf8');
const list=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?list(resolve(dir,entry.name)):[resolve(dir,entry.name)]);

test('EXP-F3 catalog: complete own material sets with unique IDs, names and paths',()=>{
  assert.equal(MATERIALS.length,71);assert.equal(new Set(MATERIALS.map(m=>m.id)).size,71);assert.equal(new Set(MATERIALS.map(m=>m.file)).size,71);
  const counts={cards:12,dice:30,stones:4,pawns:1,chips:6,notes:6,props:4,accessories:8};
  for(const [category,count] of Object.entries(counts))assert.equal(MATERIALS.filter(m=>m.category===category).length,count,category);
  for(const item of MATERIALS){assert.ok(item.name.length>3);assert.equal(item.license,'eigen');assert.equal(getMaterial(item.id),item);assert.ok(Object.isFrozen(item));}
  assert.ok(Object.isFrozen(MATERIALS));assert.throws(()=>getMaterial('../private'),/Unknown material/);
  assert.deepEqual(new Set(list(root).filter(file=>file.endsWith('.svg'))),new Set(MATERIALS.map(m=>resolve(root,m.file))),'every SVG is catalogued');
});
for(const item of MATERIALS)test(`EXP-F3 ${item.id}: valid local vector under 8 KB, CSS colors, no external resources`,()=>{
  assert.match(item.file,/^[a-z0-9-]+\/[a-z0-9-]+\.svg$/);
  const path=realpathSync(resolve(root,item.file));assert.ok(path.startsWith(root+sep));
  assert.ok(statSync(path).size<8192,`${item.file} exceeds 8 KB`);
  const svg=source(item);
  assert.match(svg,/^<svg\s/);assert.match(svg,/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);assert.ok(svg.trim().endsWith('</svg>'));
  assert.ok(svg.includes(`viewBox="${item.viewBox}"`));assert.match(svg,/<title>[^<]+<\/title>/);assert.match(svg,/role="img"/);assert.match(svg,/aria-label="[^"]+"/);
  assert.match(svg,/var\(--material-(primary|secondary|accent|paper|ink),/);
  assert.doesNotMatch(svg,/<\s*(?:image|foreignObject|script|style|iframe|object|embed|animate|set|feImage)\b/i);
  assert.doesNotMatch(svg,/<!DOCTYPE|<!ENTITY|\son[a-z]+\s*=|@import|javascript:|data:/i);
  const withoutNamespace=svg.replace('http://www.w3.org/2000/svg','');assert.doesNotMatch(withoutNamespace,/https?:|\/\//i);
  const ids=new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  for(const [,ref] of svg.matchAll(/\s(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)){assert.match(ref,/^#[a-zA-Z][\w-]*$/);assert.ok(ids.has(ref.slice(1)));}
  for(const [,ref] of svg.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)){assert.ok(ref.startsWith('#'));assert.ok(ids.has(ref.slice(1)));}
});
test('EXP-F3: each dice set has six genuine pip faces; all twelve card patterns differ',()=>{
  for(const theme of ['holz','glas','metall','kneipe','marmor']){
    const dice=MATERIALS.filter(m=>m.category==='dice'&&m.theme===theme);assert.deepEqual(dice.map(m=>m.value),[1,2,3,4,5,6]);
    for(const die of dice)assert.equal([...source(die).matchAll(/<circle\b[^>]*\br="6\.5"/g)].length,die.value,die.id);
  }
  const patterns=MATERIALS.filter(m=>m.category==='cards').map(m=>source(m).replace(/aria-label="[^"]*"/g,'').replace(/<title>[^<]*<\/title>/g,''));
  assert.equal(new Set(patterns).size,12,'card backs must differ in geometry, not just name');
});
test('EXP-F3: six chip values carry distinct repeated edge geometry independent of color',()=>{
  const chips=MATERIALS.filter(m=>m.category==='chips');assert.deepEqual(chips.map(m=>m.value),[1,5,10,25,50,100]);
  assert.equal(new Set(chips.map(m=>m.edgePattern)).size,6);
  const motifs=[];
  for(const chip of chips){
    const svg=source(chip);assert.match(svg,new RegExp('>'+chip.value+'</text>'));assert.equal([...svg.matchAll(/<g transform="rotate\(/g)].length,8);
    motifs.push(svg.match(/<g transform="rotate\(0 50 50\)">([\s\S]*?)<\/g>/)[1]);
  }
  assert.equal(new Set(motifs).size,6,'edge marks must differ structurally');
});
test('EXP-F3: all eight avatar accessories share a transparent normalized overlay canvas',()=>{
  const overlays=MATERIALS.filter(m=>m.overlay);
  assert.deepEqual(overlays.map(m=>m.id),['detektivhut','kochmuetze','krone','papiermuetze','sonnenbrille','raumhelm','sumo-guertel','schwimmreifen'].map(id=>'accessory-'+id));
  for(const item of overlays){assert.equal(item.category,'accessories');assert.equal(item.viewBox,'0 0 100 100');assert.doesNotMatch(source(item),/<rect[^>]*width="100"[^>]*height="100"/);}
});
