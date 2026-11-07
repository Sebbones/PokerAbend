import {randomUUID,randomInt} from 'node:crypto';import {TurnRoom} from '../../server/turn-room.js';import {shuffle} from '../poker/engine/cards.js';import {rotate,reachable,shifted} from './rules.js';import {decide,fallback} from './bot.js';
export class Room extends TurnRoom{
 static OPTIONS=[{key:'tasks',label:'Schätze pro Person',type:'number',min:1,max:6},{key:'turnTime',label:'Zeit pro Entscheidung in Sekunden (0 = ohne)',type:'number',min:0,max:300}];
 defaultSettings(){return {tasks:3,turnTime:45};}
 constructor(code,settings,onChange){super(code,settings,onChange,{minPlayers:2,maxPlayers:4,winPoints:1,scoreLabel:'Siege'});this.board=[];this.revision=0;this.stage=null;}
 setupRound(){this.key=randomUUID();this.revision++;this.stage='shift';this.lastShift=null;this.board=Array.from({length:49},(_,i)=>{const x=i%7,y=Math.floor(i/7),fixed=x%2===0&&y%2===0;let mask=[3,5,7][randomInt(3)];if(fixed)mask=y===0?14:y===6?11:x===0?7:x===6?13:rotate(7,randomInt(4));else mask=rotate(mask,randomInt(4));return {id:'tile-'+i,mask,treasure:null,fixed};});
  for(const [i,mask]of [[0,6],[6,12],[42,3],[48,9]])this.board[i].mask=mask;this.spare={id:'tile-49',mask:rotate(3,randomInt(4)),treasure:null,fixed:false};
  const slots=shuffle(Array.from({length:49},(_,i)=>i).filter(i=>![0,6,42,48].includes(i)));for(let t=0;t<24;t++)this.board[slots[t]].treasure=t;
  const cards=shuffle(Array.from({length:24},(_,i)=>i));this.tasks=Object.fromEntries(this.order.map(id=>[id,cards.splice(0,this.settings.tasks)]));this.collected=Object.fromEntries(this.order.map(id=>[id,0]));this.homes=Object.fromEntries(this.order.map((id,i)=>[id,[0,6,48,42][i]]));this.positions={...this.homes};
 }
 guard(id,d,stage){this.requireTurn(id);if(this.stage!==stage||d?.key!==this.key||d.revision!==this.revision)throw Error('Diese Entscheidung ist nicht mehr aktuell');}
 rotateSpare(id,d){this.guard(id,d,'shift');this.spare.mask=rotate(this.spare.mask);this.revision++;this.act(id,'dreht das freie Gangplättchen');}
 shift(id,d){this.guard(id,d,'shift');if(!['row','column'].includes(d.axis)||![1,3,5].includes(d.index)||![-1,1].includes(d.dir)||!Number.isInteger(d.rotation)||d.rotation<0||d.rotation>3)throw Error('Eine markierte Reihe oder Spalte wählen');Object.assign(this,shifted(this.board,this.spare,this.positions,d.axis,d.index,d.dir,d.rotation));this.lastShift={axis:d.axis,index:d.index,dir:d.dir};this.stage='move';this.revision++;this.act(id,'verschiebt einen Gang');}
 movePawn(id,d){this.guard(id,d,'move');if(!Number.isInteger(d.cell)||!reachable(this.board,this.positions[id]).includes(d.cell))throw Error('Dieses Feld ist nicht über verbundene Gänge erreichbar');this.positions[id]=d.cell;const task=this.tasks[id][this.collected[id]];if(task!==undefined&&this.board[d.cell].treasure===task){this.collected[id]++;this.act(id,'findet einen eigenen Schatz');}else this.act(id,'zieht durch die Gänge');this.revision++;
  if(this.collected[id]===this.tasks[id].length&&d.cell===this.homes[id])return this.finishRound([id],'Alle eigenen Schätze gefunden und zum Start zurückgekehrt',{[id]:1});this.stage='shift';this.next();}
 botStep(id,rng=Math.random){const a=decide(this.gameView(id),id,this.players.get(id)?.botDifficulty||'medium',rng);return this[a.method](id,...a.args);}
 onTimeout(id){if(id){const a=fallback({g:this.gameView(id),id});this[a.method](id,...a.args);}}
 onDropOut(){this.tasks={};this.stage=null;this.finishRound([],'Labyrinth wegen Aussteigen abgebrochen – keine Wertung');}
 publicPlayer(p){return {collected:this.collected?.[p.id]||0,remaining:this.tasks?.[p.id]?.length-(this.collected?.[p.id]||0)||0,position:this.positions?.[p.id]??null};}
 gameView(id){return {key:this.key,revision:this.revision,stage:this.stage,board:this.board.map(t=>({...t})),spare:{...this.spare},positions:{...this.positions},homes:{...this.homes},task:this.tasks?.[id]?this.tasks[id][this.collected[id]]??null:null,hasTask:!!this.tasks?.[id],legal:this.currentId===id&&this.stage==='move'?reachable(this.board,this.positions[id]):[],lastShift:this.lastShift?{...this.lastShift}:null};}
 onAbort(){this.tasks={};this.board=[];this.stage=null;this.key=null;}
 static restore(data,onChange){return TurnRoom.restoreInto(new this(data.code,data.settings,onChange),data);}
}
