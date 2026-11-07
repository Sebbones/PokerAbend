export const seeded=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
export function adjacent(i,cols,rows,diagonal=false){const x=i%cols,y=Math.floor(i/cols),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&(diagonal||Math.abs(dx)+Math.abs(dy)===1)&&x+dx>=0&&x+dx<cols&&y+dy>=0&&y+dy<rows)out.push((y+dy)*cols+x+dx);return out;}
// Route is retained before placing any mines. All left-edge starts are connected.
export function minefield(cols=11,rows=7,density=.24,rng=Math.random){
 const safe=new Set();for(let y=0;y<rows;y++){safe.add(y*cols);safe.add(y*cols+cols-1);}let y=Math.floor(rng()*rows);
 for(let x=0;x<cols;x++){safe.add(y*cols+x);const target=Math.max(0,Math.min(rows-1,y+Math.floor(rng()*5)-2));while(y!==target){y+=Math.sign(target-y);safe.add(y*cols+x);}}
 const mines=Array.from({length:cols*rows},(_,i)=>!safe.has(i)&&rng()<density),numbers=mines.map((m,i)=>m?-1:adjacent(i,cols,rows,true).filter(n=>mines[n]).length);
 return {cols,rows,mines,numbers};
}
export function path(start,goal,neighbors){const seen=new Set([start]),queue=[start],prev=new Map();for(let n=0;n<queue.length;n++){const a=queue[n];if(goal(a)){const out=[a];while(prev.has(out[0]))out.unshift(prev.get(out[0]));return out;}for(const b of neighbors(a))if(!seen.has(b)){seen.add(b);prev.set(b,a);queue.push(b);}}return null;}
