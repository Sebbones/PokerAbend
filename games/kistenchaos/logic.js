export const adjacent = (i,w,h)=>[i-w,i+1,i+w,i-1].filter(n=>n>=0&&n<w*h&&Math.abs(n%w-i%w)+Math.abs(Math.floor(n/w)-Math.floor(i/w))===1);
// Each clear lane has two crates. Solve the farther crate first, then the nearer.
// Only connecting corridors receive random walls; the certificate is independent
// of those walls and the mirrored orientation. Other players may interfere later.
export function warehouse(ids,rng=Math.random){const cols=11,rows=ids.length*2+1,mirror=rng()<.5,walls=[],crates=[],goals=[],starts={},solutions={};const at=(x,y)=>y*cols+(mirror?cols-1-x:x);
 for(let x=1;x<cols-1;x++)if(rng()<.48)walls.push(at(x,rows-1));
 ids.forEach((id,i)=>{const y=1+i*2,near=2+Math.floor(rng()*2),far=6,nearGoal=4+Math.floor(rng()*2),farGoal=8+Math.floor(rng()*2);starts[id]=at(0,y);crates.push({id:id+':0',owner:id,cell:at(near,y),start:at(near,y)},{id:id+':1',owner:id,cell:at(far,y),start:at(far,y)});goals.push({owner:id,cell:at(nearGoal,y)},{owner:id,cell:at(farGoal,y)});
 solutions[id]=[{stand:at(far-1,y),target:at(farGoal,y),dir:mirror?-1:1},{stand:at(near-1,y),target:at(nearGoal,y),dir:mirror?-1:1}];});
 const field={cols,rows,walls,crates,goals,starts,solutions};
 for(const id of ids){const copy=structuredClone(field),positions={...starts},moves=[];for(const step of solutions[id]){const route=walk(copy,positions[id],step.stand,new Set(copy.crates.map(c=>c.cell)));if(!route)throw Error('Unsolvable warehouse');for(const cell of route){move(copy,positions,id,cell);moves.push(cell);}while(positions[id]!==step.target-step.dir){const cell=positions[id]+step.dir;if(!move(copy,positions,id,cell))throw Error('Invalid warehouse certificate');moves.push(cell);}}solutions[id]=moves;}
 return field;
}
export function move(field,positions,id,to){const from=positions[id];if(!adjacent(from,field.cols,field.rows).includes(to)||field.walls.includes(to))return false;
 const crate=field.crates.find(c=>c.cell===to);if(crate){if(crate.locked)return false;const beyond=to+(to-from);if(!adjacent(to,field.cols,field.rows).includes(beyond)||field.walls.includes(beyond)||field.crates.some(c=>c.cell===beyond)||Object.entries(positions).some(([p,cell])=>p!==id&&cell===beyond))return false;crate.cell=beyond;crate.locked=field.goals.some(g=>g.owner===crate.owner&&g.cell===beyond);}
 // Players can share cells: prevents permanent body-blocking of corridors.
 positions[id]=to;return true;
}
export function walk(field,from,to,blocked=new Set()) {const todo=[from],prev=new Map([[from,null]]);for(let k=0;k<todo.length;k++){const p=todo[k];if(p===to){const out=[];for(let q=p;prev.get(q)!==null;q=prev.get(q))out.unshift(q);return out;}for(const n of adjacent(p,field.cols,field.rows))if(!prev.has(n)&&!field.walls.includes(n)&&!blocked.has(n)){prev.set(n,p);todo.push(n);}}return null;}
export function botTarget(view,id){const from=view.positions[id],crates=view.crates.filter(c=>c.owner===id&&!c.locked),goals=view.goals.filter(g=>g.owner===id&&!view.crates.some(c=>c.cell===g.cell&&c.locked));let best=null;
 for(const crate of crates)for(const to of adjacent(crate.cell,view.cols,view.rows)){const stand=crate.cell-(to-crate.cell);if(!adjacent(crate.cell,view.cols,view.rows).includes(stand)||view.walls.includes(to)||view.crates.some(c=>c.cell===to))continue;const path=walk(view,from,stand,new Set(view.crates.map(c=>c.cell)));if(path===null)continue;const dist=i=>Math.min(...goals.map(g=>Math.abs(i%view.cols-g.cell%view.cols)+Math.abs(Math.floor(i/view.cols)-Math.floor(g.cell/view.cols))));const cost=dist(to)*10+path.length+(dist(to)>=dist(crate.cell)?40:0);if(!best||cost<best.cost)best={cost,cell:path[0]??crate.cell};}return best?.cell;
}
