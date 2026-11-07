import {reachable,shifted,shifts} from './rules.js';
const distance=(a,b)=>Math.abs(a%7-b%7)+Math.abs(Math.floor(a/7)-Math.floor(b/7));
const target=(g,id,board=g.board)=>g.task===null?g.homes[id]:board.findIndex(t=>t.treasure===g.task);
const command=(g,method,d)=>({method,args:[{key:g.key,revision:g.revision,...d}]});
export function decide(g,id,level='medium',rng=Math.random,c){
 if(g.stage==='move'){const goal=target(g,id);let cells=reachable(g.board,g.positions[id]);if(level==='easy')return command(g,'movePawn',{cell:cells[Math.floor(rng()*cells.length)]});cells.sort((a,b)=>distance(a,goal<0?g.homes[id]:goal)-distance(b,goal<0?g.homes[id]:goal));c?.best(command(g,'movePawn',{cell:cells[0]}));if(level==='hard'&&goal>=0&&!cells.includes(goal)){for(const cell of cells.slice(0,5))for(const option of shifts()){c?.check();const next=shifted(g.board,g.spare,{...g.positions,[id]:cell},option.axis,option.index,option.dir,option.rotation),t=target(g,id,next.board);if(t>=0&&reachable(next.board,next.positions[id]).includes(t))return command(g,'movePawn',{cell});}}return command(g,'movePawn',{cell:cells[0]});}
 const options=shifts();if(level==='easy')return command(g,'shift',options[Math.floor(rng()*options.length)]);let best=options[0],score=-Infinity;const candidates=[];
 for(const option of options){c?.check();const next=shifted(g.board,g.spare,g.positions,option.axis,option.index,option.dir,option.rotation),goal=target(g,id,next.board),cells=reachable(next.board,next.positions[id]);let value=goal>=0&&cells.includes(goal)?1000:goal<0?-100:-Math.min(...cells.map(p=>distance(p,goal)))*12;
  if(level==='hard')value+=cells.length*.15;candidates.push({option,next,goal,cells,value});
  if(value>score){score=value;best=option;c?.best(command(g,'shift',best));}}
 if(level==='hard'&&score<900)for(const item of candidates.sort((a,b)=>b.value-a.value).slice(0,5)){const {next,cells,goal}=item;for(const p of [...cells].sort((a,b)=>distance(a,goal)-distance(b,goal)).slice(0,3))for(const future of options){c?.check();const f=shifted(next.board,next.spare,{...next.positions,[id]:p},future.axis,future.index,future.dir,future.rotation),t=target(g,id,f.board);if(t>=0&&reachable(f.board,f.positions[id]).includes(t)){const v=item.value+80;if(v>score){score=v;best=item.option;c?.best(command(g,'shift',best));}break;}}}
 return command(g,'shift',best);
}
export const fallback=o=>o.g.stage==='shift'?command(o.g,'shift',{axis:'row',index:1,dir:1,rotation:0}):command(o.g,'movePawn',{cell:o.g.positions[o.id]});
export const strategy=(o,level,c)=>decide(o.g,o.id,level,c.rng,c);
