// EXP-F4. Structured public results only; no game rules, random outcomes or private cards.
import { createTableMotion } from './motion.js';
const worlds = new Map(), active = new Map(), seen = new Set();
const number = value => Number.isFinite(value) ? value : 0;
const text = value => String(value ?? '');
export function configureWorld(game, options = {}) {
  worlds.set(game, { colors: Array.isArray(options.colors)?options.colors.filter(c=>typeof c==='string').slice(0,6):undefined, shape: ['paper','chip','leaf','star'].includes(options.shape) ? options.shape : 'paper', palette: options.palette, winEvent: options.winEvent || 'win' });
}
export function resultModel(state, { category, roundWord, level } = {}) {
  const program = state.partyProgram, evening = program?.status === 'done' && program.config?.mode === 'abend';
  const result = state.result || {}, winners = new Set(result.winners || []), points = result.points || {};
  const participants = result.players || Object.keys(points);
  const programDone = program?.status === 'done';
  const rows = (programDone ? (program.config?.mode==='team'?program.teams:program.standings) || [] : participants.map(id => {
    const player = state.players?.find(p => p.id === id);
    return { id, name: player?.name || '?', points: number(points[id]), total: number(player?.score), winner: winners.has(id) };
  })).map(row => ({id:row.id,name:row.name,points:number(row.points),total:number(row.total),winner:programDone ? (program.winners || []).includes(row.name) : row.winner}));
  if (programDone) rows.sort((a,b)=>Number(b.winner)-Number(a.winner));
  if (!programDone) rows.sort((a,b)=>Number(b.winner)-Number(a.winner)||(a.points-b.points)*(state.lowWins?1:-1));
  const completed = evening ? 3 : level || (program?.status==='done'||category==='brett'||category==='party'||roundWord==='Partie'||result.matchComplete ? 2 : 1);
  const best = evening ? rows.map(row => ({name:row.name, points:Math.max(...(program.results || []).filter(r=>Number.isFinite(r.points?.[row.id])).map(r=>r.points[row.id]))})).filter(row=>Number.isFinite(row.points)) : [];
  const ownTeam=program?.standings?.find(row=>row.id===state.you?.id)?.team;
  const ownWinner=programDone ? program.config?.mode==='team' ? rows.some(row=>row.id===ownTeam&&row.winner) : rows.some(row=>row.id===state.you?.id&&row.winner) : winners.has(state.you?.id);
  return { level:completed, rows, best, count:evening?(program.results||[]).length:0, name:program?.config?.name || '',
    key:`${state.code}:${state.game}:${programDone?program.id:'round-'+state.roundNo}`, game:state.game,
    spectator:!participants.includes(state.you?.id), ownWinner, paused:!!state.gamePaused };
}
export function pokerResultModel(state) {
  const points = {}, winners = new Set(), idOf = seat => state.seats?.[seat]?.id || String(seat);
  for(const pot of state.hand?.result?.pots || []) for(const seat of pot.winners || []) { const id=idOf(seat);winners.add(id);points[id]=(points[id]||0)+Math.floor(pot.amount/pot.winners.length); }
  const players=(state.seats||[]).flatMap((seat,id)=>seat&&seat.inHand!==false?[{id:idOf(id),name:seat.name,score:seat.stack,seated:true}]:[]);
  return resultModel({...state,roundNo:state.hand?.no,players,you:{id:state.you?.id || idOf(state.you?.seat)},result:{players:players.map(p=>p.id),points,winners:[...winners]}},{level:1});
}

function style(document) {
  if(document.querySelector('link[data-winner-style]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='/motion/celebrate.css';link.dataset.winnerStyle='';document.head.append(link);
}
export function finishStage(key) {active.get(key)?.finish();active.delete(key);}
export function finishAll() {for(const key of [...active.keys()])finishStage(key);}
export function mountStage(root, model, {fresh=false, language='de', world, playSound, reduced}={}) {
  if(!root?.isConnected)return;
  if(root.dataset.winnerKey)finishStage(root.dataset.winnerKey);
  finishStage(model.key);
  style(root.ownerDocument);root.replaceChildren();root.classList.add('winner-stage');root.dataset.winnerLevel=String(model.level);root.dataset.winnerGame=model.game;root.dataset.winnerKey=model.key;
  const document=root.ownerDocument, tx=(de,en)=>language==='en'?en:de;
  const make=(tag,cls,value)=>{const el=document.createElement(tag);el.className=cls;if(value!==undefined)el.textContent=text(value);return el;};
  const title=make('h3','winner-stage-title',model.level===3?tx('Spieleabend beendet','Evening complete'):model.level===2?tx('Partie beendet','Match complete'):tx('Runde gewertet','Round scored'));root.append(title);
  const config={shape:'paper',winEvent:'win',...worlds.get(model.game),...world};
  const media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const calm=()=>!!reduced?.()||!!media?.matches;
  const animate=fresh&&!seen.has(model.key)&&!model.spectator&&!model.paused&&!document.hidden&&!calm();seen.add(model.key);if(seen.size>256)seen.delete(seen.values().next().value);
  let stopped=false, raf=0;
  const counters=[];
  if(model.level===3){
    const trophy=make('div','winner-trophy');trophy.setAttribute('aria-label',tx('Pokal','Trophy'));trophy.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v18c0 12-7 18-14 18s-14-6-14-18ZM18 13H8v9c0 9 7 14 14 14M46 13h10v9c0 9-7 14-14 14M32 44v10M20 57h24"/></svg>';root.append(trophy);
    root.append(make('p','winner-summary',`${model.name} · ${model.count} ${tx('gewertete Spiele','scored games')}`));
  }
  const podium=make('ol',model.level>=2?'winner-podium':'winner-scores');
  // Tied winners share first place; no winner is inferred from a visual animation or score order.
  let nextPlace=1;
  for(const row of model.rows){
    const item=make('li','winner-place'+(row.winner?' is-winner':''));
    const place=row.winner?1:Math.max(2,nextPlace);nextPlace++;
    if(model.level>=2){const rank=make('span','winner-rank',row.winner?'★':model.rows.some(r=>r.winner)?place:'–');rank.setAttribute('aria-hidden','true');item.append(rank);}
    item.append(make('b','winner-name',row.name));if(row.winner)item.append(make('small','winner-badge',tx('Gewonnen','Winner')));
    const score=make('span','winner-score');score.setAttribute('aria-label',`${row.name}: ${row.points}`);
    const actual=make('span','winner-actual',row.points);const visual=make('span','winner-visual',animate?0:row.points);visual.setAttribute('aria-hidden','true');score.append(actual,visual);item.append(score);podium.append(item);counters.push({el:visual,value:row.points});
  }
  root.append(podium);
  if(model.level===3&&model.best.length){const best=make('section','winner-best');best.append(make('h4','',tx('Bestwerte in diesem Abend','Best scores this evening')));for(const row of model.best)best.append(make('p','',`${row.name}: ${row.points}`));root.append(best);}
  const motion=createTableMotion({root,reduced:calm});
  const particles=[];
  const finish=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(raf);for(const row of counters)row.el.textContent=text(row.value);motion.dispose();for(const particle of particles)particle.remove();observer.disconnect();media?.removeEventListener('change',onReduce);window.removeEventListener('settingschange',onReduce);if(active.get(model.key)?.finish===finish)active.delete(model.key);};
  const onReduce=()=>{if(calm())finish();};
  const observer=new MutationObserver(()=>{if(!root.isConnected||root.closest('[hidden]'))finish();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  media?.addEventListener('change',onReduce);window.addEventListener('settingschange',onReduce);active.set(model.key,{finish});
  if(animate){
    const start=performance.now(), countFrame=now=>{if(stopped)return;const p=Math.min(1,(now-start)/650);for(const row of counters)row.el.textContent=p===1?text(row.value):text(Math.round(row.value*(1-(1-p)**3)));if(p<1)raf=requestAnimationFrame(countFrame);};raf=requestAnimationFrame(countFrame);
    if(model.level>=2&&model.rows.some(row=>row.winner)){
      const layer=make('div','winner-confetti');layer.setAttribute('aria-hidden','true');root.append(layer);
      const colors=Array.isArray(config.colors)&&config.colors.length?config.colors:['var(--scene-accent, #dab56a)','var(--scene-light, #9cb9aa)','var(--scene-dark, #f4e8c8)'];
      for(let i=0;i<24;i++){const particle=make('i','winner-paper shape-'+config.shape);particle.style.left=`${(i*37)%100}%`;particle.style.top='0';particle.style.opacity='0';particle.style.backgroundColor=colors[i%colors.length];layer.append(particle);particles.push(particle);}
      motion.celebrate(model.level,{elements:particles,confetti:true}).then(()=>{layer.remove();});
      if(model.ownWinner)Promise.resolve().then(()=>{if(!stopped&&root.isConnected) return playSound?.(config.winEvent,config);}).catch(()=>{});
    }
  }
  return {finish,model,animated:animate};
}
if(typeof window!=='undefined'){
 window.addEventListener('pagehide',finishAll);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finishAll();});
}
