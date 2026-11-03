import {readFileSync} from 'node:fs';
import {normalise} from './normalise.js';
// A small static memory of authored, published facts. Never reads Room.cur or a live truth flag.
// Custom questions are unknown. A person could bring the same factual knowledge to the table.
const memory=new Map(JSON.parse(readFileSync(new URL('./facts.json',import.meta.url),'utf8')).filter((_,i)=>i%3===0).map(q=>[q.id,{de:q.truth.de,en:q.truth.en}]));
const POOLS={
 number:['4','9','12','18','27','36','42','56','72','96','125','1865','1923','1954','1968','1982','2002','2012','240','360','480','720'],
 name:['Meridian','Artemis','Bellamy','Huygens','Kepler','Lavoisier','Sagan','Borealis','Cassiopeia','Montague','Bergmann','Moreau','Asteria','Celestine'],
 place:['Island','Norwegen','Kanada','Portugal','Chile','Tansania','Namibia','Neuseeland','Wien','Lissabon','Oslo','Hamburg','Kyoto','Reykjavík'],
 thing:['Kalkstein','Silber','Harz','Kupferdraht','Wachs','Blütenstaub','Eiskristalle','Schwefel','Baumrinde','Basalt','Quarz','Salzkristalle','Wasserdampf','Sauerstoff','Holzkohle','Magnetfelder']
};
const EN={Island:'Iceland',Norwegen:'Norway',Kanada:'Canada',Chile:'Chile',Tansania:'Tanzania',Neuseeland:'New Zealand',Wien:'Vienna',Lissabon:'Lisbon',Hamburg:'Hamburg',Kalkstein:'limestone',Silber:'silver',Harz:'resin',Kupferdraht:'copper wire',Wachs:'wax',Blütenstaub:'pollen',Eiskristalle:'ice crystals',Schwefel:'sulphur',Baumrinde:'tree bark',Basalt:'basalt',Quarz:'quartz',Salzkristalle:'salt crystals',Wasserdampf:'water vapour',Sauerstoff:'oxygen',Holzkohle:'charcoal',Magnetfelder:'magnetic fields'};
const pick=(a,rng)=>a[Math.floor(rng()*a.length)];
export function decide(g,id,level,rng=Math.random,offset=0){const d={key:g.key,q:g.q};if(g.stage==='write'){const pool=POOLS[g.type]||POOLS.thing,text=pool[(Math.floor(rng()*pool.length)+offset)%pool.length];return {method:'answer',args:[{...d,text,textEn:EN[text]||text}]};}
  const options=g.options.filter(o=>!o.mine),known=memory.get(g.questionId),chance={easy:.03,medium:.16,hard:.32}[level]||.16;let selected;if(known&&rng()<chance)selected=options.find(o=>normalise(o.de)===normalise(known.de)||normalise(o.en)===normalise(known.en));return {method:'vote',args:[{...d,choice:(selected||pick(options,rng)).id}]};
}
export const fallback=o=>decide(o.g,o.id,'medium',()=>.71);
export const strategy=(o,level,c)=>{c.check();return decide(o.g,o.id,level,c.rng);};
