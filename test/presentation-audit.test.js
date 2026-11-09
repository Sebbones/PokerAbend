import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPresentation,cardCode} from './helpers/presentation-audit.js';
const view={code:'ROOM',game:'maumau',roundNo:1,players:[{id:'a',name:'Anna'},{id:'b',name:'Ben'}],you:{id:'a'},g:{hand:['7c','Ah'],top:'Ts',dice:null}};
const peer={...view,you:{id:'b'},g:{hand:['Kd','Qs'],top:'Ts',dice:[3,6]}};
const sample=(attributes,text='',kind='dom')=>({attributes,text,kind,tag:'BUTTON',frames:[]});
test('EXP-F6 differential presentation audit permits only current visible cards and placeholders',()=>{
 const result=inspectPresentation(view,[peer],[sample({'data-card':'7c'}),sample({},'??'),sample({'data-card':'Ts'})]);
 assert.equal(result.compared,1);assert.ok(result.privateValues>0);assert.deepEqual(result.problems,[]);
 assert.ok(inspectPresentation(view,[peer],[sample({'data-card':'Kd'})]).problems.length);
 assert.ok(inspectPresentation(view,[peer],[sample({},'Q♠','animation')]).problems.some(p=>p.includes('animation')));
 assert.ok(inspectPresentation(view,[peer],[{...sample({},'', 'animation'),frames:['url("/cards/Kd.svg")']}]).problems.length);
 assert.ok(inspectPresentation(view,[peer],[sample({style:'background-image: url(/cards/Kd.svg)'})]).problems.length);
});
test('EXP-F6 view-path bindings catch a hidden slot even when the face is public elsewhere',()=>{
 const v={...view,g:{hand:['Kd'],top:'7c',opponent:null}};
 const result=inspectPresentation(v,[],[{...sample({'data-card':'Kd'}),path:'.g.opponent',value:'Kd'}]);
 assert.ok(result.problems.some(p=>p.includes('.g.opponent')));
});
test('EXP-F6 numeric dice checks use dice context and do not mistake ordinary scores for rolls',()=>{
 const v={...view,g:{dice:null,score:6}};
 assert.deepEqual(inspectPresentation(v,[peer],[sample({},'6')]).problems,[]);
 assert.ok(inspectPresentation(v,[peer],[sample({'data-die-value':'6'},'6')]).problems.length);
});
test('EXP-F6 physical colored-card IDs remain distinct; real room epochs are required',()=>{
 assert.equal(cardCode('A♠'),'As');assert.equal(cardCode('10♥'),'Th');assert.notEqual(cardCode('7r@2'),cardCode('7r@8'));
 const v={...view,game:'farbenchaos',g:{hand:['7r@2']}},p={...peer,game:'farbenchaos',g:{hand:['7r@8']}};
 assert.ok(inspectPresentation(v,[p],[sample({'data-card':'7r@8'})]).problems.length);
 assert.equal(inspectPresentation(view,[{...peer,roundNo:2}],[]).compared,0);
 assert.throws(()=>inspectPresentation(null,[],[]),/authoritative/);
});
