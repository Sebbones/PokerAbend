import {ChallengeRoom} from '../challenge-room.js';import {warehouse,adjacent,move,botTarget} from './logic.js';
export class Room extends ChallengeRoom {
 static KIND='crates';
 static OPTIONS=[{key:'playSecs',label:'Spielzeit in Sekunden',type:'number',min:15,max:180}];
 defaultSettings(){return {playSecs:60};}
 get actionGap(){return 180;}
 setup(){this.field=warehouse(this.roster,this.rng);this.positions={...this.field.starts};for(const p of this.bodies)this.position(p);}
 position(p){const cell=this.positions[p.id];p.cell=cell;p.x=(cell%this.field.cols+.5)*900/this.field.cols;p.y=(Math.floor(cell/this.field.cols)+.5)*600/this.field.rows;}
 check(p,d){if(d.action==='reset')return;if(d.action!=='cell'||!Number.isInteger(d.cell)||!adjacent(this.positions[p.id],this.field.cols,this.field.rows).includes(d.cell))throw Error('Wähle ein benachbartes Feld');}
 act(p,d){if(d.action==='reset'){for(const c of this.field.crates.filter(c=>c.owner===p.id&&!c.locked))if(!this.field.crates.some(o=>o!==c&&o.cell===c.start)&&!Object.values(this.positions).includes(c.start))c.cell=c.start;}else this.shift(p,d.cell);}
 shift(p,to){if(move(this.field,this.positions,p.id,to)){p.moves=(p.moves||0)+1;this.position(p);for(const id of this.roster)this.points[id]=this.field.crates.filter(c=>c.owner===id&&c.locked).length*100;}}
 direction(p,x,y){const cell=this.positions[p.id],to=cell+x+y*this.field.cols;if(adjacent(cell,this.field.cols,this.field.rows).includes(to))this.shift(p,to);}
 update(p){this.trySteer(p);}
 worldView(){return this.field?{cols:this.field.cols,rows:this.field.rows,walls:[...this.field.walls],crates:this.field.crates.map(c=>({id:c.id,owner:c.owner,cell:c.cell,locked:!!c.locked})),goals:this.field.goals.map(g=>({...g})),positions:{...this.positions}}:{};}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p||this.elapsed<(p.moveAt||0))return;const to=botTarget(this.gameView(id),id);if(to!==undefined)this.shift(p,to);p.moveAt=this.elapsed+250;}
}
