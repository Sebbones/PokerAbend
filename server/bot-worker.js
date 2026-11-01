import {parentPort} from 'node:worker_threads';
import {chooseBotAction,seededRandom} from '../games/bot-strategies/index.js';
parentPort.on('message',({token,observation,level,budgetMs,seed})=>{
  try{let reports=0;const result=chooseBotAction(observation,level,{budgetMs,rng:seededRandom(seed),onBest:action=>{if(reports++<64)parentPort.postMessage({token,best:action});}});parentPort.postMessage({token,done:true,...result});}
  catch{parentPort.postMessage({token,done:true,error:true});}
});
parentPort.postMessage({ready:true});
