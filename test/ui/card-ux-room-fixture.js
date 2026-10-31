// Test-process IPC only. Never installed in the production app or exposed as an HTTP/socket endpoint.
import {http,rooms} from '../../server/index.js';
if(!process.send||process.env.POKER_NO_DOTENV!=='1')throw Error('Isolated test process required');
function configure(code,data){
  const r=rooms.get(code);if(!r||r.phase!=='playing')throw Error('Start a real room first');
  const ids=r.order,me=ids[0];r.turn=0;r.dir=1;r.acts={};r.result=null;
  if(data.settings)r.settings=r.clampSettings({...r.settings,...data.settings},r.settings);
  if(r.game==='farbenchaos'){
    const physical=r.variant!=='classic'&&r.variant!=='halloween-ghosthunt';
    const pool=[...r.deck,...r.discard,...Object.values(r.hands).flat(),...(r.aside||[])];
    r.side=data.side||0;
    const take=(code)=>{const at=pool.findIndex((c)=>(physical?r.face(c):c)===code);if(at<0)throw Error('Missing UNO card '+code);return pool.splice(at,1)[0];};
    const top=take(data.top||(r.variant==='all-wild'?'Ww':r.side?'7t':'7b'));
    const hand=(data.hand||(r.variant==='all-wild'?['Ww','Ww','Xw','Tw','Kw','Dw','Fw']:r.side?['7p','7p','Ww','Lp','3o','6v','9t']:['7r','7r',r.variant==='no-mercy'?'Zw':'Ww','Rb','5g','1y','9b'])).map(take);
    r.hands=Object.fromEntries(ids.map((id,i)=>[id,i===0?hand:pool.splice(-(data.otherCounts?.[i-1]||7))]));r.discard=[top];r.deck=pool;r.aside=[];
    Object.assign(r,{wish:null,pending:0,lastDraw:0,forgot:null,drawn:null,stall:0,colorChoice:null,challenge:null,challengeHand:null,revealed:[],eliminated:{}});
  }else if(r.game==='stapelrennen'){
    const pool=[...r.deck,...r.used,...r.build.flat(),...Object.values(r.hand).flat(),...Object.values(r.stock).flat(),...Object.values(r.piles).flat(2)];
    const take=(n)=>{const at=pool.indexOf(n);if(at<0)throw Error('Missing Skip-Bo card '+n);return pool.splice(at,1)[0];};
    r.hand=Object.fromEntries(ids.map((id,i)=>[id,(i===0?(data.hand||[1,2,8,0,12]):[4,5,6,7,9]).map(take)]));
    r.build=(data.build||[0,1,7,11]).map((n)=>Array.from({length:n},(_,i)=>take(i+1)));
    r.stock=Object.fromEntries(ids.map((id,i)=>[id,[take(5),take(8),take(10),take(12),take(i===2?1:4)]]));
    r.piles=Object.fromEntries(ids.map((id)=>[id,[[take(3),take(7)],[take(6)],[],[]]]));r.deck=pool;r.used=[];
  }else if(r.game==='zehnetappen'){
    const pool=[...r.deck,...r.discard,...Object.values(r.hands).flat(),...Object.values(r.laid).flat(2).flatMap((g)=>g.cards||[])];
    const take=(code)=>{const at=pool.findIndex((c)=>c.c===code[0]&&c.n===Number(code.slice(1)||0));if(at<0)throw Error('Missing Phase card '+code);return pool.splice(at,1)[0];};
    const codes=data.hand||['r7','g7','b7','r3','g4','b5','y6','j0','r8','b12','s0'];
    const own=codes.map(take),top=take('y2');
    r.progress[me]=data.phase||2;r.step=data.step||'play';r.done=new Set();r.skip=new Set();r.laid=Object.fromEntries(ids.map((id)=>[id,[]]));
    if(data.laid){r.done.add(me);r.laid[me]=data.laid.map((g)=>({type:g.type,cards:g.cards.map(take),vals:[...g.vals]}));}
    // Reserve every explicitly required public group before dealing arbitrary opponents.
    // Otherwise a random opposing hand can take both copies of a required card.
    r.hands=Object.fromEntries(ids.map((id,i)=>[id,i===0?own:pool.splice(-10)]));
    r.discard=[top];r.deck=pool;
  }else throw Error('Unsupported fixture');
  r.afterChange();r.onChange('state');return {game:r.game,turn:r.currentId,g:r.view(me).g};
}
process.on('message',(m)=>{if(m?.type!=='card-fixture')return;try{process.send({request:m.request,result:configure(m.code,m.data||{})});}catch(error){process.send({request:m.request,error:error.message});}});
const ready=()=>console.log('TEST_READY:'+http.address().port);if(http.listening)ready();else http.once('listening',ready);
