// EXP-F6: V2-09's differential view audit, restricted to presentation of cards/dice.
import { leaves, PUBLIC_PATHS } from './leak-audit.js';
const masks = new Set(['?', '??', '—', '-', '…', 'null', 'undefined', '']);
const privatePath = path => /hand|cards?|dice|roll|cup|reveal|wuerfel|würfel|secret|future|tiles/i.test(path);
const dicePath = path => /dice|roll|cup|reveal|wuerfel|würfel/i.test(path);
export function cardCode(value) {
  const raw=String(value).trim();
  const m=raw.match(/^(10|[2-9TJQKABD])\s*([cshd♣♠♥♦])(@\d+)?$/i);
  if(!m){const colored=raw.match(/^([0-9A-Z])([rgybpow])(@\d+)?$/i);return colored?colored[1].toUpperCase()+colored[2].toLowerCase()+(colored[3]||''):null;}
  const rank={10:'T',B:'J',D:'Q'}[m[1].toUpperCase()]||m[1].toUpperCase();
  return rank+({'♣':'c','♠':'s','♥':'h','♦':'d'}[m[2]]||m[2].toLowerCase())+(m[3]||'');
}
function readPath(view,path) {
  const parts=String(path).replace(/^\$?\.?/,'').replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean);
  if(parts.some(key=>!/^\w+$/.test(key)||['__proto__','constructor','prototype'].includes(key)))return undefined;
  return parts.reduce((value,key)=>value!=null&&Object.hasOwn(value,key)?value[key]:undefined,view);
}
const normalized=value=>typeof value==='object'?JSON.stringify(value):String(value??'');
export function inspectPresentation(view, peers, samples) {
  if(!view||typeof view!=='object'||!view.code||!view.game)throw new Error('No authoritative room view supplied');
  const own=leaves(view), allowed=new Set(own.values()), allowedCards=new Set(), allowedDice=new Set();
  const collect=(value,path='')=>{
    if(typeof value==='string'){const code=cardCode(value);if(code)allowedCards.add(code);}
    else if(typeof value==='number'&&dicePath(path))allowedDice.add(String(value));
    else if(Array.isArray(value))value.forEach((v,i)=>collect(v,`${path}[${i}]`));
    else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))collect(v,path+'.'+k);
  };collect(view);
  const publicWords=new Set(['?', '??', '—', '-', '…',...(view.players||[]).flatMap(p=>[p.id,p.name]),view.you?.id,view.you?.name]);
  const secrets=new Set(), secretDice=new Set();let compared=0;
  for(const peer of peers||[]){
    if(!peer||peer.code!==view.code||peer.game!==view.game||peer.roundNo!==view.roundNo)continue;
    compared++;
    for(const [path,value]of leaves(peer)){
      if(!privatePath(path)||own.get(path)===value||allowed.has(value)||publicWords.has(value)||((PUBLIC_PATHS[view.game]||[]).some(p=>path.includes(p))&&!cardCode(value)&&!dicePath(path)))continue;
      secrets.add(value);
      if(dicePath(path)){try{const values=JSON.parse(value);if(Array.isArray(values))for(const n of values)if(Number.isFinite(n)&&!allowedDice.has(String(n)))secretDice.add(String(n));}catch{/* a dice word is checked as text */}}
    }
  }
  const problems=[];
  for(const sample of samples){
    const values=Object.values(sample.attributes||{}).concat(sample.text||'',sample.frames||[]).filter(v=>typeof v==='string');
    const location=`${sample.kind}:${sample.tag||'element'}`;
    if(sample.path){
      const actual=sample.value??sample.text??'',expected=readPath(view,sample.path);
      if(!masks.has(String(actual).trim())&&normalized(actual)!==normalized(expected))problems.push(`${location}: value is not authorized at ${sample.path}`);
    }
    for(const value of values){
      for(const secret of secrets){
        const code=cardCode(secret);
        if(code){
          const exact=cardCode(value)===code;
          const asset=value.includes('/'+secret+'.');
          if((exact||asset)&&!allowedCards.has(code))problems.push(`${location}: private card in presentation`);
        }else if(value.includes(secret)&&secret.length>=4)problems.push(`${location}: private view value in presentation`);
      }
    }
    for(const [key,value]of Object.entries(sample.attributes||{})){
      if(['data-card','data-card-value','data-card-code'].includes(key)){
        const code=cardCode(value);if(code&&!allowedCards.has(code))problems.push(`${location}: card attribute absent from server view`);
      }
      if(['data-die-value','data-dice-value'].includes(key)&&!masks.has(value)&&!allowedDice.has(String(value)))problems.push(`${location}: dice attribute absent from server view`);
    }
    if(sample.dice)for(const value of values)if(secretDice.has(value.trim()))problems.push(`${location}: private die in presentation`);
  }
  return {compared,privateValues:secrets.size+secretDice.size,samples:samples.length,problems:[...new Set(problems)]};
}
