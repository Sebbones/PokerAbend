import {next,integer} from './random.js';
const validBoard=(a)=>Array.isArray(a)&&a.length===16&&a.every((n)=>n===0||integer(n,2,2**40)&&Number.isInteger(Math.log2(n)));
export function mergeLine(line){
  const a=line.filter(Boolean),result=[],moves=[];let gain=0;
  for(let i=0;i<a.length;i++){if(a[i]===a[i+1]){result.push(a[i]*2);gain+=a[i]*2;i++;}else result.push(a[i]);}
  while(result.length<4)result.push(0);return {line:result,gain,moves};
}
export const canMove=(b)=>b.some((v,i)=>!v||i%4<3&&v===b[i+1]||i<12&&v===b[i+4]);
function spawn(s){const empty=s.board.map((v,i)=>v? -1:i).filter((i)=>i>=0);if(!empty.length)return -1;let r=next(s.seed);s.seed=r.seed;const index=empty[Math.floor(r.value*empty.length)];r=next(s.seed);s.seed=r.seed;s.board[index]=r.value<.9?2:4;return index;}
export function create({seed=1}={}){const s={id:`2048-${seed>>>0}`,board:Array(16).fill(0),seed:seed>>>0,score:0,won:false,continued:false,status:'playing',paused:false,undo:[]};spawn(s);spawn(s);return s;}
const snap=(s)=>({board:[...s.board],seed:s.seed,score:s.score,won:s.won,continued:s.continued,status:s.status});
function lines(dir){return Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>dir==='left'?r*4+c:dir==='right'?r*4+3-c:dir==='up'?c*4+r:(3-c)*4+r));}
export function move(s,dir){
  if(s.paused||s.status!=='playing'||!['left','right','up','down'].includes(dir))return {changed:false,motions:[]};
  const before=snap(s),motions=[];let gain=0;
  for(const indices of lines(dir)){
    const old=indices.filter((i)=>s.board[i]),values=old.map((i)=>s.board[i]),merged=mergeLine(values);let source=0;
    for(let c=0;c<4;c++){const value=merged.line[c];if(value){motions.push({from:old[source],to:indices[c]});source+=values[source]===values[source+1]?2:1;}s.board[indices[c]]=value;}
    gain+=merged.gain;
  }
  if(s.board.every((v,i)=>v===before.board[i])){if(!canMove(s.board))s.status='lost';return {changed:false,motions:[]};}
  s.undo.push(before);if(s.undo.length>20)s.undo.shift();s.score=Math.min(Number.MAX_SAFE_INTEGER,s.score+gain);const spawned=spawn(s);
  if(s.board.some((v)=>v>=2048)){s.won=true;if(!s.continued)s.status='won';}
  if(s.status==='playing'&&!canMove(s.board))s.status='lost';return {changed:true,motions,spawned,gain};
}
export function undo(s){if(s.paused||!s.undo.length)return false;Object.assign(s,s.undo.pop());return true;}
export function continueGame(s){if(s.status!=='won')return false;s.continued=true;s.status=canMove(s.board)?'playing':'lost';return true;}
export function restore(x){
  const valid=(a)=>a&&validBoard(a.board)&&integer(a.seed,0,2**32-1)&&Number.isSafeInteger(a.score)&&a.score>=0&&typeof a.won==='boolean'&&typeof a.continued==='boolean'&&['playing','won','lost'].includes(a.status);
  if(!valid(x)||!Array.isArray(x.undo)||x.undo.length>20||!x.undo.every(valid))return null;
  const s={id:typeof x.id==='string'?x.id.slice(0,60):'2048-restored',board:[...x.board],seed:x.seed,score:x.score,won:x.won,continued:x.continued,status:x.status,paused:true,undo:x.undo.map(snap)};
  if(s.board.some((v)=>v>=2048))s.won=true;
  if(!canMove(s.board))s.status='lost';else if(s.won&&!s.continued)s.status='won';else s.status='playing';return s;
}
