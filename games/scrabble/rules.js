import {shuffle} from '../poker/engine/cards.js';

export const SIZE=15;
// German 102-tile edition: 100 letter tiles and two zero-value blanks.
export const LETTERS={A:[5,1],B:[2,3],C:[2,4],D:[4,1],E:[15,1],F:[2,4],G:[3,2],H:[4,2],I:[6,1],J:[1,6],K:[2,4],L:[3,2],M:[4,3],N:[9,1],O:[3,2],P:[1,4],Q:[1,10],R:[6,1],S:[7,1],T:[6,1],U:[6,1],V:[1,6],W:[1,3],X:[1,8],Y:[1,10],Z:[1,3],Ä:[1,6],Ö:[1,8],Ü:[1,6],_:[2,0]};
export const newBag=(rng)=>shuffle(Object.entries(LETTERS).flatMap(([letter,[count,value]])=>Array.from({length:count},(_,n)=>({id:`${letter}-${n}`,letter,value}))),rng);
export const emptyBoard=()=>Array(225).fill(null);
const premiums={TW:[[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]],DW:[[1,1],[2,2],[3,3],[4,4],[7,7],[10,10],[11,11],[12,12],[13,13],[1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1]],TL:[[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]],DL:[[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],[7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]]};
export const PREMIUMS=Object.fromEntries(Object.entries(premiums).flatMap(([type,cells])=>cells.map(([r,c])=>[r*15+c,type])));
const neighbours=p=>[p%15>0?p-1:-1,p%15<14?p+1:-1,p>=15?p-15:-1,p<210?p+15:-1].filter(p=>p>=0);
function line(board,pos,step){let at=pos;const before=p=>p-step>=0&&(step===15||p%15>0);while(before(at)&&board[at-step])at-=step;const cells=[];while(at<225&&board[at]){cells.push(at);if(step===1&&at%15===14)break;at+=step;}return cells;}

// Pure and atomic: never modifies the supplied board or the private rack.
export function evaluateMove(board,rack,placements){
  if(!Array.isArray(placements)||placements.length<1||placements.length>7)throw Error('Lege 1 bis 7 eigene Steine');
  const used=new Set(),fresh=new Set(),next=board.map(t=>t?{...t}:null);
  for(const p of placements){
    if(!p||!Number.isInteger(p.pos)||p.pos<0||p.pos>=225||next[p.pos])throw Error('Dieses Feld ist nicht frei');
    const tile=rack.find(t=>t.id===p.id);if(!tile||used.has(tile.id))throw Error('Nur eigene verschiedene Steine legen');
    const letter=tile.letter==='_'?p.letter:tile.letter;if(!Object.hasOwn(LETTERS,letter)||letter==='_')throw Error('Joker braucht einen Buchstaben A–Z, Ä, Ö oder Ü');
    used.add(tile.id);fresh.add(p.pos);next[p.pos]={...tile,letter,blank:tile.letter==='_'};
  }
  const cells=[...fresh],row=Math.floor(cells[0]/15),col=cells[0]%15;
  if(!cells.every(p=>Math.floor(p/15)===row)&&!cells.every(p=>p%15===col))throw Error('Alle neuen Steine müssen in einer Linie liegen');
  const step=cells.every(p=>Math.floor(p/15)===row)?1:15,main=line(next,cells[0],step);
  if(!cells.every(p=>main.includes(p)))throw Error('Das Wort darf keine Lücke enthalten');
  const opening=!board.some(Boolean);
  if(opening&&!fresh.has(112))throw Error('Das erste Wort muss über die Mitte gehen');
  if(!opening&&!cells.some(p=>neighbours(p).some(n=>board[n])))throw Error('Lege an vorhandene Wörter an');
  const words=[],seen=new Set();
  for(const p of cells)for(const dir of [1,15]){const run=line(next,p,dir),key=run.join(',');if(run.length<2||seen.has(key))continue;seen.add(key);let points=0,mult=1;for(const x of run){const t=next[x],pr=fresh.has(x)?PREMIUMS[x]:null;points+=t.value*(pr==='DL'?2:pr==='TL'?3:1);mult*=pr==='DW'?2:pr==='TW'?3:1;}words.push({word:run.map(x=>next[x].letter).join(''),cells:run,points:points*mult});}
  if(!words.length)throw Error('Mindestens ein Wort aus zwei Buchstaben legen');
  return {board:next,words,points:words.reduce((n,w)=>n+w.points,0)+(used.size===7?50:0),bonus:used.size===7?50:0,used:[...used],placements:cells.map(pos=>({pos,tile:{...next[pos]}}))};
}
export function endScores(points,racks,finisher=null){const out={...points};let transfer=0;for(const [id,rack]of Object.entries(racks)){const value=rack.reduce((n,t)=>n+t.value,0);out[id]-=value;if(id!==finisher)transfer+=value;}if(finisher)out[finisher]+=transfer;return out;}
