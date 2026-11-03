// Development-only reproducible conversion; runtime reads the committed JSON, no build required.
import {readFileSync,writeFileSync} from 'node:fs';
let quelle=null;const questions=[];
for(const line of readFileSync(new URL('./catalog-input.txt',import.meta.url),'utf8').split(/\r?\n/).filter(Boolean)){
  if(line.startsWith('%')){const [title,url]=line.slice(1).split('|');quelle={title,url,checked:'2026-11-03'};continue;}
  const [type,de,en,truthDe,truthEn,aliases='']=line.split('|');if(!quelle||!de?.includes('___')||!en?.includes('___')||!truthDe||!truthEn)throw Error('Invalid catalogue row: '+line);
  questions.push({id:'lb-'+String(questions.length+1).padStart(3,'0'),type,de,en,truth:{de:truthDe,en:truthEn},aliases:aliases.split(';').filter(Boolean),quelle:{...quelle}});
}
if(questions.length<150)throw Error('Need at least 150 checked facts');
writeFileSync(new URL('./facts.json',import.meta.url),JSON.stringify(questions,null,2)+'\n');console.log(questions.length+' bilingual sourced questions');
