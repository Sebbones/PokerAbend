import {randomUUID} from 'node:crypto';import {TurnRoom} from '../../server/turn-room.js';import {shuffle} from '../poker/engine/cards.js';import {decide,distance,heat,fallback} from './bot.js';
export class Room extends TurnRoom{
 static OPTIONS=[{key:'treasures',label:'Schätze pro Insel',type:'number',min:3,max:5},{key:'hints',label:'Hinweise heiß / warm / kalt',type:'bool'},{key:'turnTime',label:'Zeit pro Entscheidung in Sekunden (0 = ohne)',type:'number',min:0,max:300}];
 defaultSettings(){return {treasures:3,hints:true,turnTime:45};}
 constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:4});this.stage=null;this.revision=0;this.hidden={};this.shots={};}
 get currentId(){return this.phase==='playing'&&this.stage==='dig'?this.order[this.turn]:null;}
 setupRound(){this.key=randomUUID();this.revision++;this.stage='hide';this.hidden={};this.shots=Object.fromEntries(this.order.map(id=>[id,[]]));this.caught=Object.fromEntries(this.order.map(id=>[id,0]));this.active=new Set(this.order);}
 participant(id,d){if(this.gamePaused)throw Error('Das Spiel ist angehalten');if(this.phase!=='playing'||!this.order.includes(id)||d?.key!==this.key)throw Error('Diese Inselrunde ist nicht mehr aktuell');}
 placeTreasures(id,d){this.participant(id,d);if(this.stage!=='hide'||this.hidden[id])throw Error('Deine Insel ist bereits vorbereitet');if(!Array.isArray(d.cells)||d.cells.length!==this.settings.treasures||new Set(d.cells).size!==d.cells.length||d.cells.some(i=>!Number.isInteger(i)||i<0||i>=64))throw Error('Verschiedene Felder für genau deine Schätze wählen');this.hidden[id]=[...d.cells];this.revision++;this.act(id,'hat seine Schätze verdeckt versteckt');if(this.order.every(p=>this.hidden[p])){this.stage='dig';this.turn=0;}}
 advance(){do{this.turn=(this.turn+1)%this.order.length;}while(!this.active.has(this.order[this.turn]));}
 dig(id,d){this.participant(id,d);this.requireTurn(id);if(this.stage!=='dig'||d.revision!==this.revision)throw Error('Dieser Grabungszug ist nicht mehr aktuell');if(d.target===id||!this.active.has(d.target)||!Number.isInteger(d.cell)||d.cell<0||d.cell>=64||this.shots[d.target].some(s=>s.cell===d.cell))throw Error('Ein noch verdecktes Feld auf einer fremden aktiven Insel wählen');
  const remaining=this.hidden[d.target].filter(cell=>!this.shots[d.target].some(s=>s.hit&&s.cell===cell)),hit=remaining.includes(d.cell),after=remaining.length-Number(hit),hint=!hit&&this.settings.hints?heat(Math.min(...remaining.map(cell=>distance(cell,d.cell)))):null;
  this.shots[d.target].push({cell:d.cell,hit,heat:hint,remaining:after,by:id});this.revision++;if(hit){this.caught[id]++;this.act(id,`findet einen Schatz auf ${this.name(d.target)}s Insel`);if(!after)this.active.delete(d.target);}else{this.act(id,'gräbt ohne Schatzfund');this.advance();}
  if(this.active.size<=1){this.stage='over';const top=Math.max(...Object.values(this.caught));this.finishRound(this.order.filter(p=>this.caught[p]===top),'Schatzinsel: die meisten gefundenen Schätze gewinnen',{...this.caught});}
 }
 botDue(){if(this.phase!=='playing')return null;if(this.stage==='hide')return this.order.find(id=>this.players.get(id)?.bot&&!this.hidden[id])||null;return this.players.get(this.currentId)?.bot?this.currentId:null;}
 botStep(id,rng=Math.random){const a=decide(this.gameView(id),id,this.players.get(id)?.botDifficulty||'medium',rng);return this[a.method](id,...a.args);}
 onTimeout(id){if(this.stage==='hide'){for(const p of this.order)if(!this.hidden[p])this.placeTreasures(p,{key:this.key,cells:shuffle(Array.from({length:64},(_,i)=>i)).slice(0,this.settings.treasures)});}else if(id){const a=fallback({g:this.gameView(id),id});this[a.method](id,...a.args);}}
 timerActive(){return this.stage==='dig';}
 afterChange(){if(this.gamePaused)return;if(this.phase==='playing'&&this.stage==='hide'){const key='hide:'+this.key;if(this.timerKey===key)return;this.clock.clearTimeout(this.turnTimer);this.timerKey=key;this.deadline=this.settings.turnTime?this.clock.now()+this.settings.turnTime*1000:null;this.turnTimer=this.settings.turnTime?this.clock.setTimeout(()=>{if(this.timerKey!==key)return;this.onTimeout(null);this.afterChange();this.onChange('state');},this.settings.turnTime*1000):null;this.turnTimer?.unref?.();}else super.afterChange();}
 onDropOut(){this.hidden={};this.stage=null;this.finishRound([],'Inselrunde wegen Aussteigen abgebrochen – keine Wertung');}
 publicPlayer(p){return {ready:!!this.hidden[p.id],treasures:this.caught?.[p.id]||0,out:this.stage!=='hide'&&!this.active?.has(p.id)};}
 gameView(id){return {key:this.key,revision:this.revision,stage:this.stage,count:this.settings.treasures,hints:this.settings.hints,ready:!!this.hidden[id],own:this.hidden[id]?[...this.hidden[id]]:null,islands:this.order.map(p=>({id:p,active:this.active.has(p),ready:!!this.hidden[p],remaining:this.settings.treasures-this.shots[p].filter(s=>s.hit).length,shots:this.shots[p].map(s=>({...s}))})),caught:{...this.caught}};}
 onAbort(){this.hidden={};this.shots={};this.stage=null;this.key=null;}
 static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
