// Original sliding puzzles: shuffle by legal moves, retain a reverse certificate.
export const neighbours = (cell, size) => [cell-size,cell+1,cell+size,cell-1].filter(n=>n>=0&&n<size*size&&Math.abs(n%size-cell%size)+Math.abs(Math.floor(n/size)-Math.floor(cell/size))===1);
export const solved = board => board.every((v,i)=>v===(i+1)%board.length);
export function slide(board,size,cell){const gap=board.indexOf(0);if(!Number.isInteger(cell)||!neighbours(gap,size).includes(cell))return false;[board[gap],board[cell]]=[board[cell],board[gap]];return true;}
export function puzzle(size=3,rng=Math.random){
 const board=Array.from({length:size*size},(_,i)=>(i+1)%(size*size)),undo=[];let previous=-1;
 for(let i=0;i<(size===3?22:42);i++){const gap=board.indexOf(0),options=neighbours(gap,size).filter(n=>n!==previous),cell=options[Math.floor(rng()*options.length)];undo.unshift(gap);slide(board,size,cell);previous=gap;}
 if(solved(board)){const gap=board.indexOf(0);undo.unshift(gap);slide(board,size,neighbours(gap,size)[0]);}
 return {size,board,solution:undo};
}
export const progress = board => board.filter((v,i)=>v!==0&&v===i+1).length;
export const manhattan = (board,size) => board.reduce((s,v,i)=>s+(v?Math.abs(i%size-(v-1)%size)+Math.abs(Math.floor(i/size)-Math.floor((v-1)/size)):0),0);
// Fixed node ceiling AND wall-clock budget: return best move found so far.
export function nextMove(board,size,{nodes=1200,ms=4}={}){
 const started=performance.now(),queue=[{board:[...board],first:null,g:0,h:manhattan(board,size)}],seen=new Set([board.join(',')]);let best=null,count=0;
 while(queue.length&&count++<nodes&&performance.now()-started<ms){queue.sort((a,b)=>(a.g+a.h)-(b.g+b.h));const at=queue.shift();if(best===null||at.h<best.h)best=at;if(!at.h)return at.first;for(const n of neighbours(at.board.indexOf(0),size)){const b=[...at.board];slide(b,size,n);const key=b.join(',');if(!seen.has(key)){seen.add(key);queue.push({board:b,first:at.first??n,g:at.g+1,h:manhattan(b,size)});}}}
 return best?.first??neighbours(board.indexOf(0),size).sort((a,b)=>{const x=[...board],y=[...board];slide(x,size,a);slide(y,size,b);return manhattan(x,size)-manhattan(y,size);})[0];
}
