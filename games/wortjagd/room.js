import {ChallengeRoom} from '../challenge-room.js';
import {letterfield,normalize,inDictionary,wordPath,boardWords,tally} from './logic.js';
export class Room extends ChallengeRoom {
 static KIND='words';
 static OPTIONS=[{key:'language',label:'Wortsprache',type:'select',values:[{value:'de',label:'Deutsch'},{value:'en',label:'English'}]},{key:'large',label:'5 × 5 Buchstaben',type:'bool'},{key:'duplicates',label:'Doppelte Wörter zählen',type:'bool'},{key:'minFour',label:'Mindestlänge vier',type:'bool'}];
 defaultSettings(){return {playSecs:60,language:'de',large:false,duplicates:false,minFour:false};}
 setup(){this.settings.playSecs=60;this.field=letterfield(this.settings.language,this.settings.large?5:4,this.rng);this.accepted=Object.fromEntries(this.roster.map(id=>[id,[]]));this.wordResults=null;this.botWords=[...boardWords(this.field.board,this.field.size,this.settings.language).keys()];if(!this.botWords.includes(this.field.guaranteed))this.botWords.push(this.field.guaranteed);}
 get actionGap(){return 300;}
 // Text search has no physics: enforce exactly 60 active clock seconds even
 // when a busy event loop delays one of the inherited 50 ms frame callbacks.
 advance(){if(this.deadline!==null)this.elapsed=Math.max(this.elapsed,this.clock.now()-this.deadline+60000);super.advance();}
 check(p,d){if(d.action!=='word'||typeof d.word!=='string'||d.word.length>32)throw Error('Ungültiges Wort');const word=normalize(d.word.trim());if(word.length<(this.settings.minFour?4:3)||word.length>16||!inDictionary(this.settings.language,word)||!wordPath(this.field.board,this.field.size,word))throw Error('Wort nicht in der Liste oder nicht im Feld');if(this.accepted[p.id].includes(word))throw Error('Dieses Wort hast du schon');if(this.accepted[p.id].length>=128)throw Error('Wortlimit erreicht');}
 act(p,d){this.accepted[p.id].push(normalize(d.word.trim()));}
 worldView(id){return {size:this.field?.size||4,board:[...(this.field?.board||[])],language:this.settings.language,accepted:[...(this.accepted?.[id]||[])],wordResults:this.phase==='over'?this.wordResults:null};}
 resolve(){this.wordResults=tally(this.accepted,this.settings.duplicates);for(const [id,words]of Object.entries(this.wordResults))this.points[id]=words.reduce((n,w)=>n+w.points,0);super.resolve();}
 botStep(id){const p=this.bodies.find(p=>p.id===id);if(!p||this.elapsed<(p.moveAt||0))return;const word=this.botWords.find(w=>w.length>=(this.settings.minFour?4:3)&&!this.accepted[id].includes(w));if(word){this.accepted[id].push(word);p.moveAt=this.elapsed+1500;}}
}
