import {ChallengeRoom} from '../challenge-room.js';
import {puzzle,slide,solved,progress,nextMove,neighbours} from './logic.js';
export class Room extends ChallengeRoom {
 static KIND='puzzle';
 static OPTIONS=[{key:'playSecs',label:'Spielzeit in Sekunden',type:'number',min:15,max:180},{key:'size',label:'Puzzlegröße',type:'select',values:[{value:'3',label:'3 × 3'},{value:'4',label:'4 × 4'}]}];
 defaultSettings(){return {playSecs:90,size:'3'};}
 setup(){this.task=puzzle(Number(this.settings.size),this.rng);for(const p of this.bodies){this.cells.set(p.id,{board:[...this.task.board]});this.points[p.id]=progress(this.task.board)*100;}}
 check(p,d){if(d.action!=='tile'||!Number.isInteger(d.cell)||!neighbours(this.cells.get(p.id).board.indexOf(0),this.task.size).includes(d.cell))throw Error('Wähle ein Teil neben der Lücke');}
 act(p,d){this.shift(p,d.cell);}
 shift(p,cell){const b=this.cells.get(p.id).board;if(!slide(b,this.task.size,cell))return;p.moves=(p.moves||0)+1;this.points[p.id]=progress(b)*100;if(solved(b)){p.finished=true;p.finishMs=this.elapsed;this.points[p.id]=10000+progress(b)*100;this.resolve();}}
 direction(p,x,y){const b=this.cells.get(p.id).board,gap=b.indexOf(0),cell=gap+x+y*this.task.size;if(neighbours(gap,this.task.size).includes(cell))this.shift(p,cell);}
 update(p){this.trySteer(p);}
 worldView(id){return {size:this.task?.size||3,board:[...(this.cells.get(id)?.board||[])],initial:this.phase==='over'?[...(this.task?.board||[])]:undefined};}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p||p.finished||this.elapsed<(p.moveAt||0))return;const v=this.gameView(id),cell=nextMove(v.board,v.size);this.shift(p,cell);p.moveAt=this.elapsed+250;}
}
