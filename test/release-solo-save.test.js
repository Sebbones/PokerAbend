import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as td from '../public/singleplayer/wellenwacht-logic.js';
import * as saves from '../public/singleplayer/storage.js';
const source=readFileSync(new URL('../public/singleplayer/runtime.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function mount','function mount')+'\nglobalThis.mountRuntime=mount;';
for(const end of ['won','lost','between'])test(`Wellenwacht saves ${end} immediately when the animation stops before the one-second autosave`,()=>{
 const state=td.create({difficulty:'hard',seed:1});state.wave=end==='won'?12:1;state.active=true;state.queue=[];
 if(end==='lost'){state.lives=1;state.enemies=[{id:1,kind:'crawler',cell:td.MAPS[state.map].goal,next:null,progress:0,hp:10,maxHp:10,slowUntil:0}];}
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};saves.save(storage,'wellenwacht',state);
 let callback;const node={scrollLeft:0,scrollTop:0,addEventListener(){},focus(){},textContent:'',innerHTML:''};
 const root={...node,querySelector:()=>node};
 const context=vm.createContext({sdk:{},number:{},td,saves,drawDefense(){},localStorage:storage,AbortController,performance:{now:()=>100},document:{hidden:false,activeElement:null,addEventListener(){}},window:{addEventListener(){}},ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{callback=fn;return 1;},cancelAnimationFrame(){},clearInterval(){}});
 vm.runInContext(source,context);context.mountRuntime(root,'wellenwacht',{state,setup:false,saveStatus:'saved'},{tx:(de)=>de,esc:String,calm:()=>false,preferences:()=>''});
 assert.equal(typeof callback,'function');callback(166);
 const stored=JSON.parse(values.get(saves.key('wellenwacht'))).state;
 assert.equal(stored.active,false);assert.equal(stored.status,end==='between'?'playing':end);assert.equal(stored.lives,state.lives);assert.equal(stored.coins,state.coins);
});
