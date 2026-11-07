import {adjacent,path} from '../minenlauf/logic.js';
export const edge=(a,b)=>a<b?a+':'+b:b+':'+a;
export function maze(cols,rows,rng=Math.random){const base=[],seen=new Set([0]),stack=[0];while(stack.length){const a=stack.at(-1),choices=adjacent(a,cols,rows).filter(b=>!seen.has(b));if(!choices.length){stack.pop();continue;}const b=choices[Math.floor(rng()*choices.length)];base.push(edge(a,b));seen.add(b);stack.push(b);}const tree=new Set(base),gates=[];for(let i=0;i<cols*rows;i++)for(const j of adjacent(i,cols,rows))if(i<j&&!tree.has(edge(i,j))&&rng()<.32)gates.push(edge(i,j));return {cols,rows,base,gates};}
export const passages=(level,phase)=>[...level.base,...level.gates.filter((_,i)=>(i+phase)%3!==0)];
export function route(level,open,start,goal){const links=new Set(open);return path(start,n=>n===goal,n=>adjacent(n,level.cols,level.rows).filter(b=>links.has(edge(n,b))));}
