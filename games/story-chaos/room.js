import {TurnRoom} from '../../server/turn-room.js';
import {cleanText} from '../../server/security.js';
import {randomUUID} from 'node:crypto';

export const MAX_SENTENCE=240;
const BOT_SENTENCES=['Plötzlich klopfte ein Pinguin an die Tür.','Niemand hatte mit diesem seltsamen Geräusch gerechnet.','Im letzten Moment fiel der Gruppe ein neuer Plan ein.','Eine geheimnisvolle Karte führte alle zum Bahnhof.','Der sprechende Koffer wollte unbedingt mitkommen.','Zum Glück hatte jemand einen riesigen Regenschirm dabei.','Hinter der nächsten Ecke wartete eine unerwartete Überraschung.','Alle atmeten tief durch und gingen gemeinsam weiter.'];
export class Room extends TurnRoom {
  static OPTIONS=[{key:'cycles',label:'Sätze pro Mitspieler',type:'number',min:1,max:5},{key:'turnTime',label:'Schreibzeit pro Satz in Sekunden (0 = ohne)',type:'number',min:0,max:300}];
  defaultSettings(){return {cycles:2,turnTime:90};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:3,maxPlayers:12,scoreLabel:'Punkte'});this.sentences=[];this.total=0;}
  setupRound(){this.roundKey=randomUUID();this.sentences=[];this.total=this.order.length*this.settings.cycles;}
  onTurnStart(){
    for(let i=0;i<this.order.length;i++){
      if(this.sentences.filter((s)=>s.author===this.currentId).length<this.settings.cycles)return;
      this.turn=(this.turn+1)%this.order.length;
    }
    this.finishRound([],'Eure Geschichte ist fertig – gemeinsam lesen!');
  }
  onDropOut(p){
    const remaining=this.order.filter((id)=>id!==p.id);
    this.total=this.sentences.length+remaining.reduce((n,id)=>n+Math.max(0,this.settings.cycles-this.sentences.filter((s)=>s.author===id).length),0);
    if(remaining.length<2||this.total===this.sentences.length){this.order=remaining;this.turn=0;this.finishRound([],remaining.length<2?'Die Geschichte endet vorzeitig: zu wenige Mitspieler.':'Eure Geschichte ist fertig – gemeinsam lesen!');}
  }
  write(id,text,step,round,roundKey,automatic=false){
    this.requireTurn(id);
    if(step!==this.sentences.length||round!==this.roundNo||roundKey!==this.roundKey)throw Error('Dieser Schreibzug ist nicht mehr aktuell');
    if(typeof text!=='string'||text.length>MAX_SENTENCE)throw Error(`Bitte höchstens ${MAX_SENTENCE} Zeichen schreiben`);
    const sentence=cleanText(text,MAX_SENTENCE);if(!sentence)throw Error('Bitte einen Satz schreiben');
    this.sentences.push({author:id,name:this.name(id),text:sentence,automatic:!!automatic});
    // Do not put a sentence into public logs, moves, bubbles or other players' views.
    this.act(id,'hat einen Satz ergänzt');
    if(this.sentences.length>=this.total)this.finishRound([],`Eure Geschichte ist fertig: ${this.sentences.length} Sätze – gemeinsam lesen!`);
    else this.next();
  }
  onTimeout(id){this.write(id,'…',this.sentences.length,this.roundNo,this.roundKey,true);}
  botStep(id,rng=Math.random){this.write(id,BOT_SENTENCES[Math.floor(rng()*BOT_SENTENCES.length)%BOT_SENTENCES.length],this.sentences.length,this.roundNo,this.roundKey);}
  publicPlayer(p){return {sentences:this.sentences.filter((s)=>s.author===p.id&&!s.automatic).length};}
  gameView(viewerId){
    const over=this.phase==='over';
    return {roundKey:this.roundKey,step:this.sentences.length,total:this.total,maxLength:MAX_SENTENCE,
      previous:!over&&this.currentId===viewerId&&this.sentences.length?{...this.sentences.at(-1)}:null,
      own:this.sentences.filter((s)=>s.author===viewerId).map((s)=>({...s})),
      story:over?this.sentences.map((s)=>({...s})):null};
  }
  onAbort(){this.sentences=[];this.total=0;}
  static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
