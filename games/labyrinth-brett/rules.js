export const SIZE=7,DIRECTIONS=[[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
export const rotate=(mask,n=1)=>{for(let i=0;i<n;i++)mask=((mask<<1)&15)|(mask>>3);return mask;};
export function reachable(board,start){const seen=new Set([start]),queue=[start];for(let at=0;at<queue.length;at++){const i=queue[at],x=i%7,y=Math.floor(i/7);for(const [dx,dy,out,inward]of DIRECTIONS){const nx=x+dx,ny=y+dy,j=ny*7+nx;if(nx<0||ny<0||nx>=7||ny>=7||seen.has(j)||!(board[i].mask&out)||!(board[j].mask&inward))continue;seen.add(j);queue.push(j);}}return [...seen];}
export function shifted(board,spare,positions,axis,index,dir,rotation=0){const tiles=board.map(t=>({...t})),people={...positions},indices=Array.from({length:7},(_,i)=>axis==='row'?index*7+i:i*7+index),incoming={...spare,mask:rotate(spare.mask,rotation)};let extra;
 if(dir===1){extra=tiles[indices[6]];for(let i=6;i>0;i--)tiles[indices[i]]=tiles[indices[i-1]];tiles[indices[0]]=incoming;}else{extra=tiles[indices[0]];for(let i=0;i<6;i++)tiles[indices[i]]=tiles[indices[i+1]];tiles[indices[6]]=incoming;}
 for(const [id,p]of Object.entries(people)){const at=indices.indexOf(p);if(at>=0)people[id]=indices[(at+dir+7)%7];}return {board:tiles,spare:extra,positions:people};}
export const shifts=()=>['row','column'].flatMap(axis=>[1,3,5].flatMap(index=>[-1,1].flatMap(dir=>[0,1,2,3].map(rotation=>({axis,index,dir,rotation})))));
