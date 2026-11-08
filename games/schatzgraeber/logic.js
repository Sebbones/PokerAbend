// Schatzgräber: Regeln ohne Netzwerk. Das Feld (Schätze/Bomben) bleibt serverseitig und wird nur durch Graben aufgedeckt.
export const COLS=12,ROWS=8,TILE=75,DIG_MS=700,STUN_MS=1500,BOUNCE=95,SPEED=190;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const tileAt=p=>clamp(Math.floor(p.y/TILE),0,ROWS-1)*COLS+clamp(Math.floor(p.x/TILE),0,COLS-1);
export const center=i=>({x:(i%COLS+.5)*TILE,y:(Math.floor(i/COLS)+.5)*TILE});
export const near=i=>{const x=i%COLS,y=Math.floor(i/COLS),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS)out.push(ny*COLS+nx);}return out;};
export function layout(players,rng=Math.random){
 const all=Array.from({length:COLS*ROWS},(_,i)=>i);for(let i=all.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
 const t=Math.min(36,8+players*3),b=Math.min(14,6+players);
 return {treasure:new Set(all.slice(0,t)),bomb:new Set(all.slice(t,t+b))};
}
export const kindOf=(field,i)=>field.treasure.has(i)?'treasure':field.bomb.has(i)?'bomb':'empty';
export function reveal(field,i){const k=kindOf(field,i),around=near(i);return {i,k,t:around.filter(n=>field.treasure.has(n)).length,b:around.filter(n=>field.bomb.has(n)).length};}
export function move(bodies,input,now){for(const p of bodies){if(now<p.digUntil||now<p.stunUntil)continue;const v=input(p),norm=Math.hypot(v?.x||0,v?.y||0)||1;if(!v||(!v.x&&!v.y))continue;p.facing={x:v.x/norm,y:v.y/norm};p.x=clamp(p.x+v.x/norm*SPEED*.05,18,882);p.y=clamp(p.y+v.y/norm*SPEED*.05,18,582);}}
export function bounce(p){p.x=clamp(p.x-p.facing.x*BOUNCE,18,882);p.y=clamp(p.y-p.facing.y*BOUNCE,18,582);}
