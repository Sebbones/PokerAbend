import {integer} from './random.js';
export {integer};
export const DIFFICULTIES={easy:1,normal:2,hard:3};
export const playable=s=>!s.paused&&s.status==='playing';
export function base(difficulty='normal',seed=1){return {difficulty:Object.hasOwn(DIFFICULTIES,difficulty)?difficulty:'normal',seed:seed>>>0,status:'playing',paused:false,elapsedMs:0,started:false};}
export function validBase(x){return !!x&&Object.hasOwn(DIFFICULTIES,x.difficulty)&&integer(x.seed,0,4294967295)&&['playing','won','lost'].includes(x.status)&&typeof x.paused==='boolean'&&typeof x.started==='boolean'&&Number.isFinite(x.elapsedMs)&&x.elapsedMs>=0&&x.elapsedMs<=1e12;}
export const restoreBase=x=>({difficulty:x.difficulty,seed:x.seed,status:x.status,paused:true,elapsedMs:x.elapsedMs,started:x.started});
export function clock(s,ms){if(!playable(s)||!s.started||!Number.isFinite(ms)||ms<=0)return 0;const dt=Math.min(ms,1000);s.elapsedMs=Math.min(1e12,s.elapsedMs+dt);return dt;}
export const array=(x,n,test)=>Array.isArray(x)&&x.length===n&&x.every(test);
export const indices=(x,n)=>Array.isArray(x)&&x.length<=n&&x.every(v=>integer(v,0,n-1))&&new Set(x).size===x.length;
