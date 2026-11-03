const pick=(a,rng)=>a[Math.floor(rng()*a.length)];
export function decide(g,id,rng=Math.random){
  const d={key:g.key,revision:g.revision};
  if(g.stage==='vote')return {method:'vote',args:[{key:g.key,voteId:g.vote.id,agree:g.secret?.spy?g.vote.target!==id:rng()<.65}]};
  if(g.stage==='answer')return {method:'answer',args:[{...d,text:g.secret?.spy?'Das hängt vom Tag ab.':g.secret.cue.de,textEn:g.secret?.spy?'It depends on the day.':g.secret.cue.en}]};
  const targets=g.people.filter(p=>p!==id&&p!==g.previous);
  // Suspicions use only the public transcript: a generic answer is a weak clue, never proof.
  const vague=g.transcript.filter(x=>x.kind==='answer'&&/hängt vom Tag|depends on the day/i.test(x.text)).at(-1)?.from;
  if(!g.accused&&g.transcript.length>=8&&rng()<.1){const target=vague&&vague!==id?vague:pick(g.people.filter(p=>p!==id),rng);return {method:'accuse',args:[{...d,target}]};}
  if(g.secret?.spy&&g.transcript.length>=12&&rng()<.08)return {method:'guess',args:[{...d,location:pick(g.locations,rng).id}]};
  return {method:'ask',args:[{...d,target:pick(targets,rng),text:'Was würdest du hier mitbringen?',textEn:'What would you bring here?'}]};
}
