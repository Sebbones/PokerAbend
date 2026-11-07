// PartyRoom-based simultaneous arenas. Secret assignments never enter public frames.
import {randomBytes} from 'node:crypto';
import {PartyRoom} from './party-room.js';
import {TurnRoom} from '../server/turn-room.js';
import {shuffle} from '../server/random.js';
import {ARENA,STEP_MS,COUNTDOWN_MS,INPUT_TTL} from './realtime-room.js';
import {arenaIntent} from './party-arena-bot.js';
export const SHELTERS=Array.from({length:12},(_,i)=>({id:i,x:112.5+(i%4)*225,y:100+Math.floor(i/4)*200,radius:54}));
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class PartyArenaRoom extends PartyRoom {
  static OPTIONS=[{key:'playSecs',label:'Spielzeit in Sekunden',type:'number',min:10,max:180}];
  defaultSettings(){return {playSecs:60,warningSecs:8};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:new.target.MIN||2,maxPlayers:new.target.MAX||12,scoreLabel:'Siege',winPoints:1});this.loop=null;this.inputs=new Map();this.roles=new Map();this.bodies=[];this.tickNo=0;this.elapsed=-COUNTDOWN_MS;this.zones=[];this.personalFrames=true;this.runId=null;}
  get kind(){return this.constructor.KIND;}
  get currentId(){return null;}
  validateStart(){}
  setupRound(){
    this.stopLoop();this.runId=randomBytes(12).toString('hex');this.stage='arena';this.tickNo=0;this.elapsed=-COUNTDOWN_MS;this.inputs.clear();this.roster=[...this.order];this.points=Object.fromEntries(this.roster.map(id=>[id,0]));this.gamePts=this.points;this.roles=new Map();
    const assigned=shuffle([...this.roster]),hunters=Math.max(1,Math.floor(this.roster.length/3));
    for(const id of this.roster)this.roles.set(id,this.kind==='hunt'?(assigned.indexOf(id)<hunters?'hunter':'shadow'):this.kind==='infection'?(assigned[0]===id?'infected':'survivor'):'runner');
    this.bodies=this.roster.map((id,i)=>({id,x:450+Math.cos(i/this.roster.length*Math.PI*2)*300,y:300+Math.sin(i/this.roster.length*Math.PI*2)*190,alive:true,caught:false}));
    this.shelterDeck=shuffle(SHELTERS.map(s=>({...s})));this.shelterCount=Math.max(1,this.roster.length-1);this.shelterPhase=1;this.dangerAt=this.settings.warningSecs*1000;this.zones=this.kind==='shelter'?this.shelterDeck.slice(0,this.shelterCount).map(s=>({...s})):[];
    this.deadline=this.clock.now()+COUNTDOWN_MS+this.settings.playSecs*1000;
  }
  input(id,{runId,round,seq,x,y,jump=false}={}){
    if(this.gamePaused)throw Error('Das Spiel ist angehalten');
    if(this.phase!=='playing'||runId!==this.runId||round!==this.roundNo)throw Error('Diese Eingabe gehört nicht zur laufenden Runde');
    const body=this.bodies.find(p=>p.id===id);if(!this.order.includes(id)||!body?.alive)throw Error('Du schaust gerade zu');
    if(!Number.isSafeInteger(seq)||seq<1||seq>1e9||![-1,0,1].includes(x)||![-1,0,1].includes(y)||jump!==false)throw Error('Ungültige Bewegung');
    if(seq<=(this.inputs.get(id)?.seq||0))throw Error('Diese Eingabe ist bereits veraltet');
    this.setInput(id,x,y,seq);
  }
  setInput(id,x,y,seq=0){this.inputs.set(id,{x,y,seq,at:this.tickNo});}
  botDue(){return null;}
  botStep(id){const v=arenaIntent(this.gameView(id),id);if(v)this.setInput(id,v.x,v.y);}
  step(){
    if(this.phase!=='playing'||this.gamePaused)return;
    this.tickNo++;this.elapsed+=STEP_MS;if(this.elapsed<0)return;
    if(this.tickNo%4===0&&this.humanOnline())for(const p of this.bodies)if(p.alive&&this.players.get(p.id)?.bot)this.botStep(p.id);
    for(const p of this.bodies){const input=this.inputs.get(p.id),person=this.players.get(p.id);if(!p.alive||!person?.connected||person.kicked||!input||(this.tickNo-input.at)*STEP_MS>INPUT_TTL)continue;const length=Math.hypot(input.x,input.y)||1;p.x=clamp(p.x+input.x/length*190*STEP_MS/1000,ARENA.radius,ARENA.width-ARENA.radius);p.y=clamp(p.y+input.y/length*190*STEP_MS/1000,ARENA.radius,ARENA.height-ARENA.radius);}
    if(this.kind==='hunt'){
      const hunters=this.bodies.filter(p=>p.alive&&this.roles.get(p.id)==='hunter');
      for(const p of this.bodies)if(p.alive&&this.roles.get(p.id)==='shadow'&&hunters.some(h=>distance(p,h)<=ARENA.radius*2)){p.caught=true;p.alive=false;this.inputs.delete(p.id);}
      if(!this.bodies.some(p=>p.alive&&this.roles.get(p.id)==='shadow'))return this.finishArena('hunters');
    }else if(this.kind==='infection'){
      // Resolve one simultaneous contact wave; newly infected move/chase next tick.
      const infectious=this.bodies.filter(p=>this.roles.get(p.id)==='infected');
      const infected=this.bodies.filter(p=>this.roles.get(p.id)==='survivor'&&infectious.some(h=>distance(p,h)<=ARENA.radius*2));
      for(const p of infected)this.roles.set(p.id,'infected');
      if(this.bodies.every(p=>this.roles.get(p.id)==='infected'))return this.finishArena('infection');
    }else if(this.elapsed>=this.dangerAt||this.elapsed>=this.settings.playSecs*1000){
      for(const p of this.bodies)if(p.alive&&!this.zones.some(z=>distance(p,z)<=z.radius)){p.alive=false;this.inputs.delete(p.id);}
      if(this.bodies.filter(p=>p.alive).length<=1||this.elapsed>=this.settings.playSecs*1000)return this.finishArena('shelter');
      this.shelterPhase++;this.shelterCount=Math.max(1,this.shelterCount-1);this.shelterDeck=shuffle([...this.shelterDeck]);this.zones=this.shelterDeck.slice(0,this.shelterCount).map(s=>({...s}));this.dangerAt+=this.settings.warningSecs*1000;
    }
    if(this.elapsed>=this.settings.playSecs*1000)this.finishArena('time');
  }
  finishArena(reason){
    if(this.phase!=='playing')return;this.stopLoop();this.stage=null;this.deadline=null;
    const winners=this.bodies.filter(p=>this.kind==='hunt'?(reason==='hunters'?this.roles.get(p.id)==='hunter':p.alive&&this.roles.get(p.id)==='shadow'):this.kind==='infection'?(reason==='infection'?this.roles.get(p.id)==='infected':this.roles.get(p.id)==='survivor'):p.alive).map(p=>p.id);
    for(const id of this.roster)this.points[id]=Number(winners.includes(id));
    const text=this.kind==='hunt'?(reason==='hunters'?'Alle Schatten entdeckt – das Jägerteam gewinnt.':'Die entkommenen Schatten gewinnen.'):this.kind==='infection'?(reason==='infection'?'Vollständige Infektion – das infizierte Team gewinnt.':'Die Überlebenden gewinnen.'):winners.length?'Die verbliebenen Geschützten gewinnen.':'Niemand hat einen Schutzplatz erreicht – unentschieden.';
    this.finishRound(winners,text,{...this.points});
  }
  frame(viewerId=null){return {game:this.game,runId:this.runId,round:this.roundNo,tick:this.tickNo,elapsed:this.elapsed,duration:this.settings.playSecs*1000,kind:this.kind,arena:{...ARENA},jumping:false,role:this.roster?.includes(viewerId)?this.roles.get(viewerId)||null:null,
    bodies:this.bodies.map(p=>({id:p.id,x:p.x,y:p.y,alive:p.alive,caught:p.caught,points:this.phase==='over'?this.points[p.id]||0:0})),zones:this.zones.map(z=>({...z})),shelterPhase:this.shelterPhase||0,dangerAt:this.dangerAt||0};}
  gameView(id){return {...this.frame(id),inputSeq:this.inputs.get(id)?.seq||0};}
  publicPlayer(p){return {pts:this.phase==='over'?this.points?.[p.id]||0:0,eliminated:this.bodies.find(b=>b.id===p.id)?.alive===false};}
  afterChange(){if(this.gamePaused)return;if(this.phase!=='playing')return this.stopLoop();if(!this.loop){this.loop=this.clock.setInterval(()=>{this.step();if(this.phase==='playing'&&this.tickNo%2===0)this.onChange('frame');},STEP_MS);this.loop.unref?.();}}
  next(){throw Error('Die Echtzeitrunde endet durch ihre Regeln oder die Uhr');}
  dropOut(){this.stopLoop();this.stage=null;this.roles.clear();this.finishRound([],'Partie wegen Aussteigen abgebrochen – keine Wertung');}
  stopLoop(){this.clock.clearInterval(this.loop);this.loop=null;}
  onAbort(){this.stopLoop();this.inputs.clear();this.roles.clear();this.bodies=[];this.zones=[];this.stage=null;this.deadline=null;this.runId=null;}
  dispose(){this.stopLoop();super.dispose();}
  static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
export const partyArenaEvents={steer:(room,p,data)=>{room.input(p.id,data);return {frameOnly:true};}};
