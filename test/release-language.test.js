import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {i18nContext} from './i18n-harness.js';
import {copy} from '../public/games/release-rules.js';
import {describe} from '../games/poker/engine/cards.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function client(id){
 let def;const context=i18nContext({esc,kitGame:d=>{def=d;return {render(){}};},kitShedding:d=>{def=d;},soloGame:d=>{def=d;},WorldKit:{t:(de,en)=>en,head:({title})=>title,chip:()=>''},colorMark:()=>'',isGermanDeck:()=>false,deckCard:()=>'',deckTranslate:s=>s,deckSuitName:s=>s,deckSuitSign:s=>s,deckSuit:s=>s,deckPrefHTML:()=>''},'en');
 for(const [key,value]of Object.entries(copy))if(!Object.hasOwn(context.EN,key))context.EN[key]=value;
 vm.runInContext(readFileSync(new URL(`../public/games/${id}/${id}.js`,import.meta.url),'utf8'),context);return {def,context};
}
test('Release English: mill placement, card claims and poker-dice instructions translate their live values',()=>{
 const base={players:[{id:'me',name:'Rot'}],you:{id:'me'},turnId:'me'};
 assert.equal(client('muehle').def.hint({...base,g:{legal:{place:true},inHand:{me:9}}},true),'Place a piece on a free point (9 left)');
 assert.equal(client('mogeln').def.hint({...base,g:{need:'A'}},true),'Your turn: lay cards face down and claim “aces”, whatever they really are');
 assert.equal(client('praesident').def.hint({...base,g:{table:null}},true),'Lead with one to four cards of the same rank');
 assert.equal(client('wuerfelpoker').def.hint({...base,g:{throws:0,maxThrows:3,limit:0}},true),'Roll! You have up to 3 rolls');
 assert.equal(client('maumau').def.playHint({wish:null,top:'Ah',playable:['Ac','Jd']}),'Play a hearts card or an ace or a jack');
});
test('Release English: all three generated zoo question kinds and revealed questions are English',()=>{
 const {def}=client('zahlenzoo');
 for(const [source,english]of [
  ['Wie viele Katzen sind am Ende noch im Bild?','How many cats remain at the end?'],
  ['Wie viele Mäuse mehr als Frösche sind am Ende im Bild?','How many more mice than frogs remain at the end?'],
  ['Wie viele Hunde und Hasen zusammen sind insgesamt hereingekommen?','How many dogs and rabbits entered in total?'],
 ]){assert.ok(def.question({round:{question:{text:source}}}).includes(english));assert.ok(def.solution({answer:3,question:source}).includes(english));}
 assert.ok(def.question({round:{question:{text:'<img src=x onerror=alert(1)>'}}}).includes('&lt;img'));
});
test('Release English: authored template translation preserves names, custom strings and HTML-escaped values verbatim',()=>{
 const {context}=client('zahlenzoo');context.value=esc('Rot <b>Deine Rolle</b>');const translated=vm.runInContext('I18n.html`Schreib einen Begriff für ${value} – wer ihn bekommt, weiß nicht, von wem er kommt`',context);
 assert.ok(translated.includes('Write a word for Rot &lt;b&gt;Deine Rolle&lt;/b&gt;'));assert.equal(context.value,esc('Rot <b>Deine Rolle</b>'));
 context.I18n.select('de');assert.equal(vm.runInContext("I18n.t('Noch nicht gewürfelt')",context),'Noch nicht gewürfelt');
});
test('Release English: a preserved drawing editor refreshes its live meter after a language switch without rebinding input',()=>{
 let definition;const meter={textContent:'0/60 Striche · 0/800 Punkte'},canvas={width:1000,height:650,getContext:()=>({fillRect(){}})},editor={dataset:{bound:'true'},querySelector:selector=>selector==='canvas'?canvas:meter};
 const state={gamePaused:false,roundNo:1,players:[],g:{key:'round',image:[]}};
 const context=i18nContext({partyGame:d=>{definition=d;return {S:state};},esc,clearTimeout,setTimeout,document:{documentElement:{lang:'en'},addEventListener(){},querySelectorAll:()=>[],querySelector:s=>s==='#kg-main .draw-editor'?editor:null}},'en');
 for(const [key,value]of Object.entries(copy))if(!Object.hasOwn(context.EN,key))context.EN[key]=value;
 vm.runInContext(readFileSync(new URL('../public/games/drawing-kit.js',import.meta.url),'utf8'),context);context.drawingGame({id:'bildunterschrift',name:'Caption',short:[],intro:[]});definition.afterRender(state);
 assert.equal(meter.textContent,'0/60 strokes · 0/800 points');assert.equal(editor.dataset.bound,'true');assert.deepEqual(state.g.image,[]);
});
test('Release English: every poker category and rank plural is translated as a complete word, including full houses and two pairs',()=>{
 const source=readFileSync(new URL('../public/games/poker/poker.js',import.meta.url),'utf8').match(/function pokerHandEnglish\(value\) \{[\s\S]*?\n\}/)[0];const context=vm.createContext({});vm.runInContext(source,context);
 assert.equal(context.pokerHandEnglish(describe([6,14,13])),'Full House, aces over kings');assert.equal(context.pokerHandEnglish(describe([2,14,12])),'Two pair, aces and queens');assert.equal(context.pokerHandEnglish(describe([8,14])),'Straight Flush to Ace');
 for(let category=0;category<=9;category++)for(let rank=2;rank<=14;rank++)assert.doesNotMatch(context.pokerHandEnglish(describe([category,rank,2])),/Höchste|Paar|Drilling|Vierling|Straße|Asse|Könige|Damen|Buben|Zehnen|Zweien| bis | über | hoch/);
});
