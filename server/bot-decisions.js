import {Worker} from 'node:worker_threads';
import {BOT_BUDGET_MS,fallbackAction} from '../games/bot-strategies/index.js';

// At most two concurrent CPU jobs. Both queued/startup time and compute time
// are bounded. A forced stop returns the last legal root candidate, never a
// fabricated result or an unbounded search on the server's main thread.
export function createDecisionService({size=2,budgetMs=BOT_BUDGET_MS,wallMs=250,workerURL=new URL('./bot-worker.js',import.meta.url)}={}){
  const slots=[],queue=[];let seq=0,closed=false;
  function clearSlot(slot){if(slot.worker){slot.worker.removeAllListeners();slot.worker.terminate();slot.worker=null;}slot.ready=false;}
  function finish(job){if(job.finished)return;job.finished=true;clearTimeout(job.timer);job.signal?.removeEventListener('abort',job.abort);if(job.slot){job.slot.job=null;job.slot.worker?.unref();}job.resolve(job.best);pump();}
  function spawn(slot){const worker=new Worker(workerURL);slot.worker=worker;worker.on('message',m=>{if(m.ready){slot.ready=true;pump();return;}const job=slot.job;if(!job||m.token!==job.token)return;if(m.best)job.best=m.best;if(m.done){if(m.action)job.best=m.action;finish(job);}});worker.on('error',()=>{const job=slot.job;clearSlot(slot);if(job)finish(job);else pump();});worker.on('exit',()=>{if(slot.worker===worker){const job=slot.job;slot.worker=null;slot.ready=false;if(job)finish(job);}});worker.unref();}
  function pump(){if(closed)return;while(queue.length){let slot=slots.find(s=>!s.job);if(!slot&&slots.length<size){slot={worker:null,ready:false,job:null};slots.push(slot);}if(!slot)return;if(!slot.worker)spawn(slot);if(!slot.ready)return;const job=queue.shift();if(job.finished)continue;slot.job=job;job.slot=slot;slot.worker.ref();slot.worker.postMessage({token:job.token,observation:job.observation,level:job.level,budgetMs,seed:job.seed});}}
  function decide(observation,level,{signal,seed=Math.floor(Math.random()*4294967296)}={}){return new Promise(resolve=>{const job={token:++seq,observation,level,seed,resolve,best:fallbackAction(observation),finished:false,slot:null,signal};job.abort=()=>{const at=queue.indexOf(job);if(at>=0)queue.splice(at,1);if(job.slot)clearSlot(job.slot);finish(job);};job.timer=setTimeout(job.abort,wallMs);if(closed||signal?.aborted){clearTimeout(job.timer);resolve(job.best);return;}signal?.addEventListener('abort',job.abort,{once:true});queue.push(job);pump();});}
  function close(){closed=true;for(const job of [...queue,...slots.map(s=>s.job).filter(Boolean)]){job.best=job.best;finish(job);}queue.length=0;for(const slot of slots)clearSlot(slot);}
  return {decide,close};
}
