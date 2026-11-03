import {Chess,DEFAULT_POSITION} from 'chess.js';
export const opposite=c=>c==='w'?'b':'w';
const file=s=>'abcdefgh'.indexOf(s[0]),rank=c=>c==='w'?'1':'8';
const range=(a,b)=>Array.from({length:Math.abs(a-b)+1},(_,i)=>a+i*Math.sign(b-a));
const clone=x=>JSON.parse(JSON.stringify(x));

// Scharnagl numbering: bishops on opposite colours, king between the two rooks.
export function chess960Fen(index){
  if(!Number.isInteger(index)||index<0||index>959)throw Error('Chess960: 0–959');
  const row=Array(8).fill(null);let n=index;row[(n%4)*2+1]='b';n=Math.floor(n/4);row[(n%4)*2]='b';n=Math.floor(n/4);
  let free=()=>row.flatMap((p,i)=>p?[]:[i]);row[free()[n%6]]='q';n=Math.floor(n/6);
  const pairs=[];for(let a=0;a<4;a++)for(let b=a+1;b<5;b++)pairs.push([a,b]);const f=free();for(const i of pairs[n])row[f[i]]='n';
  const rest=free();row[rest[0]]='r';row[rest[1]]='k';row[rest[2]]='r';
  return `${row.join('')}/pppppppp/8/8/8/8/PPPPPPPP/${row.join('').toUpperCase()} w ${'abcdefgh'[rest[2]].toUpperCase()+ 'abcdefgh'[rest[0]].toUpperCase()+'abcdefgh'[rest[2]]+'abcdefgh'[rest[0]]} - 0 1`;
}

// chess.js supplies ordinary legal moves, king safety, SAN, en passant and
// promotion. Castling is owned here so the same rules also cover Chess960.
// No third-party engine internals are accessed or modified.
export class Position {
  constructor(fen=DEFAULT_POSITION,rights=null){
    const parts=fen.split(' '),flags=parts[2];parts[2]='-';this.chess=new Chess(parts.join(' '));
    this.rights=rights?clone(rights):{w:{},b:{}};
    if(!rights)for(const c of ['w','b']){
      const r=rank(c),king=this.chess.findPiece({type:'k',color:c})[0];
      for(const flag of flags.replace('-','')){if((flag===flag.toUpperCase())!==(c==='w'))continue;const f=flag.toLowerCase()==='k'?7:flag.toLowerCase()==='q'?0:'abcdefgh'.indexOf(flag.toLowerCase());if(f<0)continue;this.rights[c][f>file(king)?'k':'q']='abcdefgh'[f]+r;}
    }
  }
  get turn(){return this.chess.turn();}
  fen(){return this.chess.fen();}
  data(){return {fen:this.fen(),rights:clone(this.rights)};}
  static from(data){return new Position(data.fen,data.rights);}
  clone(){return Position.from(this.data());}
  key(){return this.fen().split(' ').slice(0,4).join(' ')+' '+JSON.stringify(this.rights);}
  board(){return this.chess.board().flatMap(row=>row.map(p=>p?`${p.color}${p.type}`:null));}
  castles(){
    const c=this.turn,r=rank(c),from=this.chess.findPiece({type:'k',color:c})[0],out=[];
    if(this.chess.isCheck())return out;
    for(const side of ['k','q']){
      const rook=this.rights[c][side];if(!rook||this.chess.get(rook)?.type!=='r'||this.chess.get(rook)?.color!==c)continue;
      const to=(side==='k'?'g':'c')+r,rookTo=(side==='k'?'f':'d')+r;
      const path=new Set([...range(file(from),file(to)),...range(file(rook),file(rookTo))].map(f=>'abcdefgh'[f]+r));path.delete(from);path.delete(rook);
      if([...path].some(s=>this.chess.get(s)))continue;
      const transit=this.clone().chess;transit.remove(from);transit.remove(rook);
      if(range(file(from),file(to)).slice(1,-1).some(f=>transit.isAttacked('abcdefgh'[f]+r,opposite(c))))continue;
      transit.put({type:'r',color:c},rookTo);transit.put({type:'k',color:c},to);
      if(transit.isAttacked(to,opposite(c)))continue;
      out.push({from,to,castle:side,rook,rookTo,piece:'k',san:side==='k'?'O-O':'O-O-O'});
    }return out;
  }
  legal(){return [...this.chess.moves({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion,piece:m.piece,captured:m.captured,san:m.san})),...this.castles()];}
  play(move){
    const legal=this.legal().find(m=>m.from===move.from&&m.to===move.to&&(m.promotion||null)===(move.promotion||null)&&(m.castle||null)===(move.castle||null));
    if(!legal)throw Error('Dieser Schachzug ist nicht erlaubt');return this.playLegal(legal);
  }
  // Search/perft only pass moves obtained from legal() on this exact position.
  playLegal(move){
    const c=this.turn;let san;
    if(move.castle){
      const parts=this.fen().split(' ');this.chess.remove(move.from);this.chess.remove(move.rook);this.chess.put({type:'r',color:c},move.rookTo);this.chess.put({type:'k',color:c},move.to);
      parts[0]=this.chess.fen().split(' ')[0];parts[1]=opposite(c);parts[2]='-';parts[3]='-';parts[4]=String(Number(parts[4])+1);parts[5]=String(Number(parts[5])+(c==='b'?1:0));this.chess.load(parts.join(' '));this.rights[c]={};
      san=move.san+(this.chess.isCheckmate()?'#':this.chess.isCheck()?'+':'');
    }else{
      san=this.chess.move({from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})}).san;
      if(move.piece==='k')this.rights[c]={};
      for(const colour of ['w','b'])for(const side of ['k','q'])if(this.rights[colour][side]===move.from||this.rights[colour][side]===move.to)delete this.rights[colour][side];
    }return san;
  }
  canMate(c){
    const own=this.chess.board().flat().filter(p=>p?.color===c&&p.type!=='k'),other=this.chess.board().flat().filter(p=>p&&p.color!==c&&p.type!=='k');
    if(!own.length)return false;if(own.some(p=>'prq'.includes(p.type)))return true;
    if(own.length===1&&own[0].type==='n')return other.some(p=>p.type!=='q');
    if(own.every(p=>p.type==='b')){const colour=p=>(file(p.square)+Number(p.square[1]))%2,bishops=[...own,...other].filter(p=>p.type==='b');return other.some(p=>'pn'.includes(p.type))||bishops.some(p=>colour(p)!==colour(own[0]));}
    return true;
  }
  outcome(repetitions=1){
    if(!this.legal().length)return this.chess.isCheck()?{winner:opposite(this.turn),reason:'checkmate'}:{winner:null,reason:'stalemate'};
    if(this.chess.isInsufficientMaterial())return {winner:null,reason:'material'};
    if(repetitions>=3)return {winner:null,reason:'repetition'};
    if(Number(this.fen().split(' ')[4])>=100)return {winner:null,reason:'fifty'};
    return null;
  }
}
export function perft(pos,depth){if(!depth)return 1;const moves=pos.legal();if(depth===1)return moves.length;let n=0;for(const move of moves){const next=pos.clone();next.playLegal(move);n+=perft(next,depth-1);}return n;}
