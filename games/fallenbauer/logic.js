export const COLS=11,ROWS=9,START=44,GOAL=54;
export const adjacent=i=>[i-COLS,i+1,i+COLS,i-1].filter(n=>n>=0&&n<COLS*ROWS&&Math.abs(n%COLS-i%COLS)+Math.abs(Math.floor(n/COLS)-Math.floor(i/COLS))===1);
export function route(from,traps){const blocked=new Set(traps),todo=[from],prev=new Map([[from,null]]);for(let k=0;k<todo.length;k++){const p=todo[k];if(p===GOAL){const out=[];for(let q=p;prev.get(q)!==null;q=prev.get(q))out.unshift(q);return out;}for(const n of adjacent(p))if(!blocked.has(n)&&!prev.has(n)){prev.set(n,p);todo.push(n);}}return null;}
export const legalSites=traps=>Array.from({length:COLS*ROWS},(_,i)=>i).filter(i=>i%COLS>0&&i%COLS<COLS-1&&!traps.includes(i)&&route(START,[...traps,i])!==null);
