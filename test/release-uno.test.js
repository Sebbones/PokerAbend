import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('UNO: 6/9 are underlined in both rotated corners as well as the centre',()=>{
  let definition;
  const context={I18n:{language:'de',t:s=>s,content:(a)=>a,html:(s,...values)=>typeof s==='string'?s:s.reduce((out,part,i)=>out+part+(values[i]??''),'')},CardInteraction:{term:s=>s},kitShedding:d=>{definition=d;return{};},esc:s=>s,colorMark:()=>''};
  vm.runInNewContext(readFileSync(new URL('../public/games/farbenchaos/farbenchaos.js',import.meta.url),'utf8'),context);
  for(const value of ['6','9']){const html=definition.card(value+'r');assert.equal((html.match(/class="cr [^"]*\bul\b/g)||[]).length,2);assert.match(html,/class="v ul"/);}
  assert.equal((definition.card('5r').match(/class="cr [^"]*\bul\b/g)||[]).length,0);
});
