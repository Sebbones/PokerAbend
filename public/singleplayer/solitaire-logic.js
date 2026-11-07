// Solitär (Klondike): sieben Reihen, Vorrat und Ablage, vier Fundamente. Karten sind "Rang+Farbe", z. B. "Td" (Karo-Zehn).
import {base,validBase,restoreBase,playable,clock,integer} from './puzzle-base.js';
import {rng,shuffle} from './random.js';
export const RANKS='A23456789TJQK',SUITS='cdhs';
// leicht: eine Karte ziehen; mittel: drei Karten; schwer: drei Karten und höchstens drei Durchgänge durch den Vorrat
export const DIFFICULTIES={easy:{draw:1,passes:Infinity},normal:{draw:3,passes:Infinity},hard:{draw:3,passes:3}};
export const HISTORY=80;
export const deck=()=>[...SUITS].flatMap(s=>[...RANKS].map(r=>r+s));
export const rankOf=c=>RANKS.indexOf(c[0]);
export const red=c=>c[1]==='d'||c[1]==='h';
const snapshot=s=>({tableau:s.tableau.map(p=>p.map(x=>({...x}))),stock:[...s.stock],waste:[...s.waste],foundations:s.foundations.map(f=>[...f]),moves:s.moves,passes:s.passes});
export function create({difficulty='normal',seed=1}={}){
  const b=base(difficulty,seed),cards=shuffle(deck(),rng(seed)),tableau=[];let at=0;
  for(let i=0;i<7;i++){tableau.push(Array.from({length:i+1},(_,j)=>({c:cards[at++],up:j===i})));}
  return {...b,tableau,stock:cards.slice(at),waste:[],foundations:[[],[],[],[]],moves:0,passes:0,history:[],started:true};
}
const top=pile=>pile[pile.length-1];
export const drawCount=s=>DIFFICULTIES[s.difficulty].draw;
const push=s=>{s.history.push(snapshot(s));if(s.history.length>HISTORY)s.history.shift();};
export function draw(s){
  if(!playable(s))return false;
  if(s.stock.length){push(s);for(let i=0;i<drawCount(s)&&s.stock.length;i++)s.waste.push(s.stock.pop());s.moves++;return true;}
  if(!s.waste.length||redealsLeft(s)<=0)return false;
  push(s);s.stock=s.waste.reverse();s.waste=[];s.passes++;s.moves++;return true;
}
export const redealsLeft=s=>{const p=DIFFICULTIES[s.difficulty].passes;return p===Infinity?Infinity:Math.max(0,p-1-s.passes);};
const canOnFoundation=(s,c)=>{const f=s.foundations[SUITS.indexOf(c[1])];return f.length===rankOf(c);};
const canOnTableau=(s,c,col)=>{const p=s.tableau[col],t=top(p);return t?t.up&&rankOf(t.c)===rankOf(c)+1&&red(t.c)!==red(c):rankOf(c)===12;};
// Quelle: { k:'waste' } | { k:'tab', col, index } | { k:'found', suit }. Ziel: { k:'tab', col } | { k:'found' } (Fundament der Kartenfarbe).
export function cardsAt(s,from){
  if(from.k==='waste')return s.waste.length?[top(s.waste)]:[];
  if(from.k==='found'){const f=s.foundations[from.suit];return f.length?[top(f)]:[];}
  const p=s.tableau[from.col];if(!p||!integer(from.index,0,p.length-1)||!p[from.index].up)return [];
  return p.slice(from.index).map(x=>x.c);
}
export function canMove(s,from,to){
  const cards=cardsAt(s,from);if(!cards.length)return false;
  if(to.k==='found')return cards.length===1&&canOnFoundation(s,cards[0])&&!(from.k==='found');
  if(to.k==='tab'&&integer(to.col,0,6)){if(from.k==='tab'&&from.col===to.col)return false;return canOnTableau(s,cards[0],to.col);}
  return false;
}
export function move(s,from,to){
  if(!playable(s)||!canMove(s,from,to))return false;
  push(s);const cards=cardsAt(s,from);
  if(from.k==='waste')s.waste.pop();else if(from.k==='found')s.foundations[from.suit].pop();else{const p=s.tableau[from.col];p.splice(from.index);const t=top(p);if(t&&!t.up)t.up=true;}
  if(to.k==='found')s.foundations[SUITS.indexOf(cards[0][1])].push(cards[0]);else s.tableau[to.col].push(...cards.map(c=>({c,up:true})));
  s.moves++;if(s.foundations.every(f=>f.length===13))s.status='won';
  return true;
}
export function undo(s){if(s.paused||!s.history.length)return false;Object.assign(s,s.history.pop());s.status='playing';return true;}
// Alle sinnvollen Züge für die Hilfe: Fundament zuerst, dann sichtbare Reihen, dann Ziehen
export function hint(s){
  if(!playable(s))return null;
  const sources=[];if(s.waste.length)sources.push({k:'waste'});
  s.tableau.forEach((p,col)=>{p.forEach((x,index)=>{if(x.up)sources.push({k:'tab',col,index});});});
  for(const from of sources)if(cardsAt(s,from).length===1&&canMove(s,from,{k:'found'}))return {from,to:{k:'found'}};
  for(const from of sources){const first=cardsAt(s,from)[0];if(from.k==='tab'&&from.index===0&&rankOf(first)===12)continue;
    for(let col=0;col<7;col++)if(canMove(s,from,{k:'tab',col})){if(from.k==='tab'&&from.index>0&&s.tableau[from.col][from.index-1].up)continue;return {from,to:{k:'tab',col}};}}
  if(s.stock.length||s.waste.length&&redealsLeft(s)>0)return {draw:true};
  return null;
}
// Automatisches Ablegen: möglich, wenn alle Karten aufgedeckt sind und der Vorrat leer ist
export const canAutoFinish=s=>s.status==='playing'&&!s.stock.length&&s.tableau.every(p=>p.every(x=>x.up));
export function autoStep(s){
  if(!playable(s))return false;
  const sources=[];if(s.waste.length)sources.push({k:'waste'});s.tableau.forEach((p,col)=>{if(p.length)sources.push({k:'tab',col,index:p.length-1});});
  for(const from of sources)if(canMove(s,from,{k:'found'}))return move(s,from,{k:'found'});
  return false;
}
export function autoFinish(s){let n=0;while(canAutoFinish(s)&&autoStep(s)&&n++<60);return n;}
export const tick=(s,ms)=>{clock(s,ms);return false;};
const validCard=c=>typeof c==='string'&&c.length===2&&RANKS.includes(c[0])&&SUITS.includes(c[1]);
function validLayout(x){
  if(!Array.isArray(x.tableau)||x.tableau.length!==7||!Array.isArray(x.stock)||!Array.isArray(x.waste)||!Array.isArray(x.foundations)||x.foundations.length!==4)return false;
  const all=[...x.stock,...x.waste];
  for(const p of x.tableau){if(!Array.isArray(p)||p.length>30)return false;let up=false;for(const e of p){if(!e||!validCard(e.c)||typeof e.up!=='boolean')return false;if(up&&!e.up)return false;up=up||e.up;all.push(e.c);}}
  for(let i=0;i<4;i++){const f=x.foundations[i];if(!Array.isArray(f)||f.length>13)return false;for(let j=0;j<f.length;j++){if(f[j]!==RANKS[j]+SUITS[i])return false;all.push(f[j]);}}
  return all.length===52&&all.every(validCard)&&new Set(all).size===52;
}
export function restore(x){
  if(!validBase(x)||!validLayout(x)||!integer(x.moves,0,1e6)||!integer(x.passes,0,1e6)||!Array.isArray(x.history)||x.history.length>HISTORY||!x.history.every(h=>validLayout(h)&&integer(h.moves,0,1e6)&&integer(h.passes,0,1e6)))return null;
  if(x.status==='lost'||(x.status==='won')!==x.foundations.every(f=>f.length===13))return null;
  const copy=h=>({tableau:h.tableau.map(p=>p.map(e=>({c:e.c,up:e.up}))),stock:[...h.stock],waste:[...h.waste],foundations:h.foundations.map(f=>[...f]),moves:h.moves,passes:h.passes});
  return {...restoreBase(x),...copy(x),history:x.history.map(copy)};
}
