import {randomInt,randomUUID} from 'node:crypto';
import {PartyRoom,partyOptions} from '../party-room.js';

export function makeQuestion(index=0,twoGaps=false,rng=randomInt){
  const family=index<3?'add':['multiply','growing','alternate','fibonacci'][rng(4)];
  const start=rng(8)+1,a=rng(5)+2,b=rng(4)+1,values=[start];
  if(family==='fibonacci')values.push(start+b);
  while(values.length<6+(twoGaps?2:1)){
    const i=values.length,last=values.at(-1);
    values.push(family==='add'?last+a:family==='multiply'?last*(b+1):family==='growing'?last+a+i-1:family==='alternate'?last+(i%2?a:b):last+values.at(-2));
  }
  const explanations={add:[`Immer +${a}.`,`Add ${a} each time.`],multiply:[`Immer mal ${b+1}.`,`Multiply by ${b+1} each time.`],growing:[`Die Abstände beginnen bei ${a} und wachsen jeweils um 1.`,`Gaps start at ${a} and increase by 1.`],alternate:[`Abwechselnd +${a} und +${b}.`,`Alternate adding ${a} and ${b}.`],fibonacci:['Die beiden vorherigen Zahlen werden addiert.','Add the two preceding numbers.']};
  return {id:`sequence-${index}`,series:values.slice(0,6),answer:values.slice(6),explanation:explanations[family][0],explanationEn:explanations[family][1]};
}
export function inferNext(series,count=1){
  const values=[...series];if(values.length<4)return [];
  for(let i=0;i<count;i++){
    const d=values.slice(1).map((n,k)=>n-values[k]),last=values.at(-1);let next;
    if(d.every((n)=>n===d[0]))next=last+d[0];
    else if(values.slice(1).every((n,k)=>n===values[k]*(values[1]/values[0])))next=last*(values[1]/values[0]);
    else if(d.slice(1).every((n,k)=>n-d[k]===d[1]-d[0]))next=last+d.at(-1)+(d[1]-d[0]);
    else if(d.every((n,k)=>n===d[k%2]))next=last+d[d.length%2];
    else if(values.slice(2).every((n,k)=>n===values[k]+values[k+1]))next=last+values.at(-2);
    else next=last+d.at(-1);
    values.push(next);
  }
  return values.slice(series.length);
}
export function parseGuess(input,count){
  if(typeof input!=='string'||input.length>40)return null;
  const parts=input.trim().split(/[\s;,]+/);if(parts.length!==count||parts.some((s)=>!/^[-+]?\d{1,7}$/.test(s)))return null;
  const values=parts.map(Number);return values.every((n)=>Number.isSafeInteger(n)&&Math.abs(n)<=1000000)?values:null;
}
export class Room extends PartyRoom {
  static OPTIONS=[...partyOptions({voting:false}),{key:'twoGaps',label:'Zwei fehlende Zahlen statt einer',type:'bool'},{key:'speedBonus',label:'Bonus für die schnellste richtige Antwort',type:'bool'}];
  defaultSettings(){return {rounds:8,writeSecs:35,target:0,spectators:false,twoGaps:false,speedBonus:true};}
  constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:10});this.answers={};this.reveal=null;this.openedAt=0;}
  get flow(){return ['write','reveal'];}
  setupRound(){this.roundKey=randomUUID();super.setupRound();}
  next(id){if(this.gamePaused)throw Error('Das Spiel ist angehalten');super.next(id);}
  pickQuestions(n){return Array.from({length:n},(_,i)=>makeQuestion(i,this.settings.twoGaps));}
  startQuestion(){this.answers={};this.reveal=null;this.openedAt=this.clock.now();}
  waiting(){return this.order.filter((id)=>this.answers[id]===undefined);}
  isReady(id){return this.answers[id]!==undefined;}
  guess(id,text,question,round,roundKey){
    if(this.gamePaused)throw Error('Das Spiel ist angehalten');
    if(this.phase!=='playing'||this.stage!=='write')throw Error('Gerade wird nicht geraten');
    if(!this.canAnswer(id))throw Error('Du spielst in dieser Partie nicht mit');
    if(question!==this.q+1||round!==this.roundNo||roundKey!==this.roundKey)throw Error('Diese Zahlenreihe ist nicht mehr aktuell');
    if(this.answers[id]!==undefined)throw Error('Deine Antwort wurde bereits abgegeben');
    const value=parseGuess(text,this.cur.answer.length);if(!value)throw Error('Bitte die fehlenden ganzen Zahlen mit Leerzeichen getrennt eingeben');
    this.answers[id]={value,at:this.clock.now()-this.openedAt};if(this.order.includes(id))this.act(id,'✓ fertig');this.checkDone();
  }
  enter(stage){
    if(stage!=='reveal')return;
    const right=(a)=>a.value.every((n,i)=>n===this.cur.answer[i]);
    const eligible=Object.entries(this.answers).filter(([id,a])=>this.order.includes(id)&&right(a));
    const fastest=Math.min(Infinity,...eligible.map(([,a])=>a.at));
    const guesses=Object.entries(this.answers).filter(([id])=>this.players.has(id)).map(([id,a])=>{
      const spectator=!this.order.includes(id),correct=right(a),bonus=!spectator&&correct&&this.settings.speedBonus&&a.at===fastest?50:0,pts=!spectator&&correct?100+bonus:0;
      this.addPoints(id,pts);return {id,value:[...a.value],correct,bonus,pts,spectator};
    });
    this.reveal={answer:[...this.cur.answer],explanation:this.cur.explanation,explanationEn:this.cur.explanationEn,guesses,missing:this.order.filter((id)=>!this.answers[id])};
    this.say(`Die nächsten Zahlen: ${this.cur.answer.join(', ')}`,'win');
  }
  stageView(viewerId){return {roundKey:this.roundKey,series:[...this.cur.series],holes:this.cur.answer.length,mine:this.answers[viewerId]?[...this.answers[viewerId].value]:null,reveal:this.stage==='reveal'?this.reveal:null};}
  botStep(id,rng=Math.random){if(this.stage!=='write'||this.answers[id])return;const view=this.gameView(id),guess=inferNext(view.series,view.holes);if(rng()>.7)guess[0]++;this.guess(id,guess.join(' '),this.q+1,this.roundNo,this.roundKey);}
  fallback(id){this.botStep(id);}
  static restore(data,onChange){return PartyRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
