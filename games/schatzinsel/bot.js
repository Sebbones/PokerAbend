export const distance=(a,b)=>Math.abs(a%8-b%8)+Math.abs(Math.floor(a/8)-Math.floor(b/8));
export const heat=d=>d<=1?'hot':d<=3?'warm':'cold';
const command=(g,method,d)=>({method,args:[{key:g.key,revision:g.revision,...d}]});
export function decide(g,id,level='medium',rng=Math.random,c){
 if(g.stage==='hide'){const cells=[];while(cells.length<g.count){let options=Array.from({length:64},(_,i)=>i).filter(i=>!cells.includes(i));if(level!=='easy')options.sort((a,b)=>Math.min(20,...cells.map(p=>distance(b,p)))-Math.min(20,...cells.map(p=>distance(a,p))));const top=level==='hard'?Math.min(3,options.length):level==='medium'?Math.min(16,options.length):options.length;cells.push(options[Math.floor(rng()*top)]);}return command(g,'placeTreasures',{cells});}
 const islands=g.islands.filter(p=>p.id!==id&&p.active);let best=null,value=-Infinity;
 for(const island of islands){const unused=Array.from({length:64},(_,i)=>i).filter(i=>!island.shots.some(s=>s.cell===i));for(const cell of unused){c?.check();let score=rng();
   if(level!=='easy'){const misses=island.shots.filter(s=>!s.hit&&s.heat);for(const shot of misses){const d=distance(cell,shot.cell);if(level==='hard'&&(shot.heat==='cold'&&d<=3||shot.heat==='warm'&&d<=1||shot.remaining===1&&heat(d)!==shot.heat)){score=-10000;break;}score+=shot.heat==='hot'?(d===1?8:0):shot.heat==='warm'?(d>=2&&d<=3?1:0):0;}if(level==='hard')score+=(g.count-island.remaining)*1.4;}
   if(score>value){value=score;best={target:island.id,cell};c?.best(command(g,'dig',best));}}}
 return command(g,'dig',best);
}
export const fallback=o=>o.g.stage==='hide'?command(o.g,'placeTreasures',{cells:Array.from({length:o.g.count},(_,i)=>i)}):(()=>{const target=o.g.islands.find(p=>p.id!==o.id&&p.active);return command(o.g,'dig',{target:target.id,cell:Array.from({length:64},(_,i)=>i).find(i=>!target.shots.some(s=>s.cell===i))});})();
export const strategy=(o,level,c)=>decide(o.g,o.id,level,c.rng,c);
