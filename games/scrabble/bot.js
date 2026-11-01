import {evaluateMove} from './rules.js';
import {WORDS,WORD_SET} from './words.js';

export function choosePlacement({board,rack},{words=WORDS,check=()=>{},onBest=()=>{}}={}){
  let best=null;const occupied=board.flatMap((t,p)=>t?[p]:[]);
  for(const word of words)for(const step of [1,15]){
    check();
    const starts=new Set();
    if(!occupied.length){for(let n=0;n<word.length;n++)starts.add(112-n*step);}
    else for(const p of occupied)for(let n=0;n<word.length;n++)if(board[p].letter===word[n])starts.add(p-n*step);
    for(const start of starts){if(start<0||start+(word.length-1)*step>=225||step===1&&start%15+word.length>15)continue;
      check();
      if((step===15?start>=15:start%15>0)&&board[start-step])continue;
      const end=start+word.length*step;if(end<225&&(step===15||end%15>0)&&board[end])continue;
      const remaining=[...rack],placements=[];let valid=true;
      for(let n=0;n<word.length;n++){const pos=start+n*step;if(board[pos]){if(board[pos].letter!==word[n]){valid=false;break;}continue;}
        let i=remaining.findIndex(t=>t.letter===word[n]);if(i<0)i=remaining.findIndex(t=>t.letter==='_');if(i<0){valid=false;break;}const [tile]=remaining.splice(i,1);placements.push({id:tile.id,pos,letter:word[n]});}
      if(!valid||!placements.length)continue;
      let move;try{move=evaluateMove(board,rack,placements);}catch{continue;}if(move.words.some(w=>!WORD_SET.has(w.word)))continue;if(!best||move.points>best.points){best={placements,points:move.points};onBest(best);}
    }
  }return best;
}
