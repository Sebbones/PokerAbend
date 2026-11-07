// Solo-Paket B: Block-Puzzle, Solitär, Mahjong-Solitär und Match-3 – reine Logik, Lösbarkeit, Speicherstände.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as bp from '../public/singleplayer/blockpuzzle-logic.js';
import * as sol from '../public/singleplayer/solitaire-logic.js';
import * as mj from '../public/singleplayer/mahjong-logic.js';
import * as m3 from '../public/singleplayer/match3-logic.js';
import * as saves from '../public/singleplayer/storage.js';
import {MAHJONG,PLANTS,mahjongSvg,plantSvg} from '../public/singleplayer/puzzle-art.js';

const engines={'block-puzzle':bp,solitaire:sol,'mahjong-solitaire':mj,'match-3':m3};
const clone=x=>JSON.parse(JSON.stringify(x));

// ---------- Block-Puzzle ----------
test('Block-Puzzle: Formenliste ist gültig, eindeutig und ohne Drehung',()=>{
  assert.ok(bp.SHAPES.length>=20);
  const keys=new Set();
  for(const [i,cells] of bp.SHAPES.entries()){
    assert.ok(cells.length>=1&&cells.length<=9,String(i));assert.equal(new Set(cells.map(c=>c.join(','))).size,cells.length);
    assert.ok(cells.every(([r,c])=>r>=0&&c>=0));assert.ok(cells.some(c=>c[0]===0)&&cells.some(c=>c[1]===0),'Form liegt an der Ecke');
    const key=cells.map(c=>c.join(',')).sort().join(';');assert.ok(!keys.has(key),'doppelte Form '+i);keys.add(key);
  }
  for(const d of Object.keys(bp.DIFFICULTIES)){const s=bp.create({difficulty:d,seed:3});assert.equal(s.grid.length,bp.size(s)**2);assert.equal(s.pieces.length,3);}
  assert.ok(bp.create({difficulty:'easy',seed:1}).pieces.every(p=>bp.SHAPES[p].length<=4),'leicht: nur kleine Formen');
  assert.deepEqual(bp.create({seed:9}),bp.create({seed:9}));
});
test('Block-Puzzle: Setzen prüft Rand und Belegung, räumt Reihe und Spalte gleichzeitig und bucht Punkte',()=>{
  const s=bp.create({difficulty:'normal',seed:2}),n=bp.size(s);
  s.pieces=[0,0,0]; // drei Einzelfelder
  for(let c=0;c<n;c++)if(c!==3)s.grid[c]=1;      // Reihe 0 bis auf Spalte 3
  for(let r=1;r<n;r++)s.grid[r*n+3]=1;             // Spalte 3 bis auf Reihe 0
  assert.equal(bp.place(s,0,-1,0),false);assert.equal(bp.place(s,0,0,n),false);assert.equal(bp.place(s,0,1,3),false,'belegtes Feld');
  assert.equal(bp.place(s,0,0,3),true);
  assert.equal(s.lastCleared.length,2*n-1,'Reihe und Spalte zusammen');
  assert.ok(s.grid.every(v=>v===0));
  assert.equal(s.score,1+10*2*2,'ein Feld plus 10 × Linien²');
  assert.equal(s.combo,1);assert.deepEqual(s.pieces,[null,0,0]);
  assert.equal(bp.place(s,0,0,0),false,'benutzte Form lässt sich nicht nochmals setzen');
});
test('Block-Puzzle: nach drei gesetzten Formen kommen drei neue, Rückgängig stellt alles genau wieder her',()=>{
  const s=bp.create({seed:5}),before=clone(s);
  assert.equal(bp.undo(s),false);
  for(let i=0;i<3;i++){const h=bp.hint(s);assert.ok(h);assert.ok(bp.place(s,h.piece,h.row,h.col));}
  assert.ok(s.pieces.every(p=>p!==null),'neue Formen');assert.equal(s.history.length,3);
  assert.ok(bp.undo(s)&&bp.undo(s)&&bp.undo(s));
  const after=clone(s);delete after.history;delete before.history;delete after.lastCleared;delete before.lastCleared;assert.deepEqual(after,before);
});
test('Block-Puzzle: Ende nur, wenn keine angebotene Form mehr passt',()=>{
  const s=bp.create({difficulty:'hard',seed:4}),n=bp.size(s);
  s.pieces=[0,9,null];s.grid=Array(n*n).fill(1);s.grid[0]=0; // genau ein freies Feld: das Einzelfeld passt
  assert.equal(bp.fitsAnywhere(s,0),true);assert.equal(bp.fitsAnywhere(s,9),false);
  assert.equal(bp.place(s,0,0,0),true);
  assert.equal(s.status==='lost'||s.pieces.some(p=>p!==null),true);
  const t=bp.create({seed:8});t.pieces=[9,9,9];t.grid=Array(100).fill(1);t.grid[0]=0;
  const u=bp.restore(clone({...t,status:'playing'}));assert.equal(u,null,'ein Stand ohne möglichen Zug darf nicht „läuft“ heißen');
  let g=0;const r=bp.create({seed:11});while(r.status==='playing'&&g++<2000){const h=bp.hint(r);if(!h)break;bp.place(r,h.piece,h.row,h.col);}
  assert.equal(r.status,'lost');assert.ok(r.score>0);assert.ok(!r.pieces.some(p=>p!==null&&bp.fitsAnywhere(r,p)));
});

// ---------- Solitär ----------
test('Solitär: Blatt hat 52 verschiedene Karten, Austeilung 28 + 24, nur die oberste Karte liegt offen',()=>{
  assert.equal(new Set(sol.deck()).size,52);
  for(const d of Object.keys(sol.DIFFICULTIES)){
    const s=sol.create({difficulty:d,seed:7}),all=[...s.stock,...s.tableau.flat().map(e=>e.c)];
    assert.equal(all.length,52);assert.equal(new Set(all).size,52);assert.equal(s.stock.length,24);
    s.tableau.forEach((p,i)=>{assert.equal(p.length,i+1);assert.equal(p.filter(e=>e.up).length,1);assert.ok(p[i].up);});
  }
  assert.deepEqual(sol.create({seed:3}),sol.create({seed:3}));assert.notDeepEqual(sol.create({seed:3}).stock,sol.create({seed:4}).stock);
});
const bare=(over={})=>({...sol.create({seed:1}),tableau:[[],[],[],[],[],[],[]],stock:[],waste:[],foundations:[[],[],[],[]],...over});
const up=c=>({c,up:true});
test('Solitär: Regeln – wechselnde Farben absteigend, König auf leere Reihe, Fundament aufsteigend je Farbe',()=>{
  const s=bare({tableau:[[up('7s')],[up('6h')],[up('6c')],[up('Kd')],[],[up('Ah')],[]]});
  assert.equal(sol.canMove(s,{k:'tab',col:1,index:0},{k:'tab',col:0}),true,'rot auf schwarz');
  assert.equal(sol.canMove(s,{k:'tab',col:2,index:0},{k:'tab',col:0}),false,'schwarz auf schwarz');
  assert.equal(sol.canMove(s,{k:'tab',col:3,index:0},{k:'tab',col:4}),true,'König auf leere Reihe');
  assert.equal(sol.canMove(s,{k:'tab',col:1,index:0},{k:'tab',col:4}),false,'nur Könige auf leere Reihen');
  assert.equal(sol.canMove(s,{k:'tab',col:5,index:0},{k:'found'}),true,'Ass auf Fundament');
  assert.equal(sol.canMove(s,{k:'tab',col:1,index:0},{k:'found'}),false,'Sechs braucht erst Ass–Fünf');
  assert.equal(sol.move(s,{k:'tab',col:5,index:0},{k:'found'}),true);assert.equal(s.foundations[2].length,1,'Herz hat seine eigene Fundament-Reihe');
  assert.equal(sol.canMove(s,{k:'tab',col:0,index:0},{k:'tab',col:0}),false,'nicht auf dieselbe Reihe');
});
test('Solitär: ganze Folgen werden bewegt, die neue oberste Karte wird aufgedeckt, Rückgängig stellt exakt her',()=>{
  const s=bare({tableau:[[{c:'9d',up:false},up('8s'),up('7h')],[up('9c')],[],[],[],[],[]]});
  const before=clone(s);
  assert.equal(sol.move(s,{k:'tab',col:0,index:1},{k:'tab',col:1}),false,'Acht schwarz auf Neun schwarz');
  s.tableau[1]=[up('9d')];
  assert.equal(sol.move(s,{k:'tab',col:0,index:1},{k:'tab',col:1}),true);
  assert.deepEqual(s.tableau[1].map(e=>e.c),['9d','8s','7h']);assert.equal(s.tableau[0][0].up,true,'Aufdecken');assert.equal(s.moves,1);
  assert.ok(sol.undo(s));assert.deepEqual(s.tableau.map(p=>p.map(e=>e.c)),[['9d','8s','7h'],['9d'],[],[],[],[],[]]);assert.equal(s.tableau[0][0].up,false);assert.equal(s.moves,0);
  void before;
});
test('Solitär: Zug 1 und Zug 3, Durchgänge begrenzt in der schweren Stufe, Vorrat dreht die Ablage um',()=>{
  const e=sol.create({difficulty:'easy',seed:2}),n=sol.create({difficulty:'normal',seed:2}),h=sol.create({difficulty:'hard',seed:2});
  sol.draw(e);sol.draw(n);assert.equal(e.waste.length,1);assert.equal(n.waste.length,3);assert.equal(e.stock.length,23);assert.equal(n.stock.length,21);
  for(let i=0;i<120;i++)assert.ok(sol.draw(n));assert.ok(n.passes>=3,'mittel: beliebig viele Durchgänge');assert.equal(sol.redealsLeft(n),Infinity,'mittel: unbegrenzt');
  let draws=0;while(sol.draw(h)&&draws<200)draws++;assert.equal(h.passes,2,'schwer: zwei Wiederholungen, drei Durchgänge');assert.equal(sol.redealsLeft(h),0);
  assert.equal(sol.draw(h),false);
  const order=sol.create({difficulty:'easy',seed:6}),stock=[...order.stock];for(let i=0;i<stock.length;i++)sol.draw(order);sol.draw(order);
  assert.deepEqual(order.stock,stock,'nach dem Umdrehen liegt der Vorrat wieder in derselben Reihenfolge');
});
test('Solitär: automatisches Ablegen – nur wenn alles offen und der Vorrat leer ist, danach gewonnen',()=>{
  const s=bare({tableau:[[up('Kc'),up('Qd')],[up('Ks'),up('Qh')],[],[],[],[],[]],foundations:[Array.from('A23456789TJ',r=>r+'c'),Array.from('A23456789TJ',r=>r+'d').concat([]),Array.from('A23456789TJ',r=>r+'h'),Array.from('A23456789TJ',r=>r+'s')]});
  s.tableau=[[up('Qc'),up('Kd')],[up('Qs'),up('Kh')],[up('Kc')],[up('Ks')],[],[],[]];s.tableau[0]=[up('Qc')];s.tableau[1]=[up('Qs')];
  s.foundations=[Array.from('A23456789TJ',r=>r+'c'),Array.from('A23456789TJQ',r=>r+'d'),Array.from('A23456789TJQ',r=>r+'h'),Array.from('A23456789TJ',r=>r+'s')];
  s.tableau=[[up('Qc')],[up('Qs')],[up('Kc')],[up('Ks')],[up('Kd')],[up('Kh')],[]];
  assert.equal(sol.canAutoFinish(s),true);
  assert.ok(sol.autoFinish(s)>0);assert.equal(s.status,'won');assert.ok(s.foundations.every(f=>f.length===13));
  const blocked=sol.create({seed:1});assert.equal(sol.canAutoFinish(blocked),false);
  const covered=bare({stock:['2c']});covered.tableau[0]=[up('Kc')];assert.equal(sol.canAutoFinish(covered),false,'Vorrat nicht leer');
});
test('Solitär: Hilfe nennt nur erlaubte Züge; ein Spiel mit Hilfe bleibt gültig und speicherbar',()=>{
  for(let seed=1;seed<=10;seed++){
    const s=sol.create({difficulty:'easy',seed});let g=0;
    while(s.status==='playing'&&g++<300){
      const h=sol.hint(s);if(!h)break;
      if(h.draw)assert.ok(sol.draw(s));else{assert.ok(sol.canMove(s,h.from,h.to));assert.ok(sol.move(s,h.from,h.to));}
      assert.equal([...s.stock,...s.waste,...s.tableau.flat().map(e=>e.c),...s.foundations.flat()].length,52,'keine Karte geht verloren');
    }
    assert.ok(sol.restore(clone(s)));
  }
});
test('Solitär: Speicherstand mit doppelter Karte, falscher Reihenfolge oder offener Karte unter verdeckter wird abgelehnt',()=>{
  const s=sol.create({seed:12});assert.ok(sol.restore(clone(s)));
  const dup=clone(s);dup.stock[0]=dup.tableau[6][0].c;assert.equal(sol.restore(dup),null);
  const order=clone(s);order.tableau[2][0].up=true;order.tableau[2][1].up=false;assert.equal(sol.restore(order),null);
  const found=clone(s);found.foundations[0]=['2c'];assert.equal(sol.restore(found),null);
  const lost=clone(s);lost.status='lost';assert.equal(sol.restore(lost),null);
  const won=clone(s);won.status='won';assert.equal(sol.restore(won),null,'gewonnen nur mit vollen Fundamenten');
});


// Vollständige Suche (mit Merken bereits geprüfter Reststeine): true = lösbar, false = unlösbar, null = Rechenbudget erschöpft
function solvable(s,budget=300000){
  const pos=mj.layout(s),seen=new Set();let nodes=0;
  function go(tiles){
    const alive=tiles.flatMap((k,i)=>k===null?[]:[i]);if(!alive.length)return true;
    const key=alive.join(',');if(seen.has(key))return false;seen.add(key);if(++nodes>budget)throw new Error('budget');
    const free=alive.filter(i=>mj.freeIn(pos,alive,i));
    for(let x=0;x<free.length;x++)for(let y=x+1;y<free.length;y++)if(tiles[free[x]]===tiles[free[y]]){const t=[...tiles];t[free[x]]=null;t[free[y]]=null;if(go(t))return true;}
    return false;
  }
  try{return go([...s.tiles]);}catch{return null;}
}
// ---------- Mahjong-Solitär ----------
test('Mahjong: eigene Motive – 18 verschiedene Zeichnungen ohne Skripte oder fremde Bilder',()=>{
  assert.equal(MAHJONG.length,mj.KINDS);assert.equal(new Set(MAHJONG.map(m=>m[2])).size,18);
  for(let k=0;k<18;k++){const svg=mahjongSvg(k);assert.match(svg,/^<svg [^>]*viewBox="0 0 32 32"/);assert.ok(!/<script|<image|href=|on\w+=|<foreignObject/i.test(svg));}
  assert.equal(PLANTS.length,6);assert.equal(new Set(PLANTS.map(p=>p[3])).size,6);for(let k=0;k<6;k++)assert.ok(!/<script|<image|href=|on\w+=/i.test(plantSvg(k)));
});
test('Mahjong: Layouts haben gerade Steinzahlen und gültige Plätze; frei = nichts darauf und links oder rechts offen',()=>{
  assert.deepEqual(Object.values(mj.LAYOUTS).map(l=>l.length),[36,62,96]);
  for(const [name,l] of Object.entries(mj.LAYOUTS)){assert.equal(l.length%2,0,name);assert.equal(new Set(l.map(p=>p.join(','))).size,l.length);}
  const pos=[[0,0,0],[0,2,0],[0,4,0],[1,2,0],[0,0,2]],all=[0,1,2,3,4];
  assert.equal(mj.freeIn(pos,all,0),true,'links offen');assert.equal(mj.freeIn(pos,all,1),false,'links und rechts belegt, dazu bedeckt');
  assert.equal(mj.freeIn(pos,all,2),true,'rechts offen');assert.equal(mj.freeIn(pos,all,3),true,'oben, beide Seiten leer');
  assert.equal(mj.freeIn(pos,all,4),true,'Nachbarreihe zählt nicht als Seitenstein');
  assert.equal(mj.freeIn(pos,[0,1,2,4],1),false,'links und rechts belegt');assert.equal(mj.freeIn(pos,[0,1,4],1),true);
});
for(const difficulty of Object.keys(mj.DIFFICULTIES))test(`Mahjong ${difficulty}: 60 erzeugte Anordnungen sind lösbar (Erzeugungsreihenfolge spielt bis zum Sieg), jedes Motiv paarig`,()=>{
  for(let seed=1;seed<=60;seed++){
    const s=mj.create({difficulty,seed}),counts=new Map();
    for(const k of s.tiles)counts.set(k,(counts.get(k)||0)+1);assert.ok([...counts.values()].every(n=>n%2===0));assert.ok(mj.pairs(s).length>=1,'am Start gibt es einen Zug');
    for(const [a,b] of mj.solution({difficulty,seed})){assert.ok(mj.select(s,a),`${seed}`);assert.ok(mj.select(s,b));}
    assert.equal(s.status,'won');assert.equal(mj.aliveOf(s).length,0);
  }
});
test('Mahjong: blockierte oder ungleiche Steine entfernen nichts; Rückgängig und Tipp liefern gültige Paare',()=>{
  const s=mj.create({difficulty:'easy',seed:4}),blocked=s.tiles.findIndex((_,i)=>!mj.free(s,i));assert.ok(blocked>=0);
  assert.equal(mj.select(s,blocked),false);assert.equal(s.selected,null);
  const [a,b]=mj.pairs(s)[0];assert.ok(mj.select(s,a));assert.ok(mj.select(s,a),'zweites Tippen hebt die Wahl auf');assert.equal(s.selected,null);
  const other=mj.freeTiles(s).find(i=>s.tiles[i]!==s.tiles[a]);if(other!==undefined){mj.select(s,a);mj.select(s,other);assert.equal(s.selected,other,'ungleiches Paar: neue Wahl statt Entfernen');assert.equal(s.removed,0);}
  const h=mj.hint(s);assert.ok(h&&s.tiles[h[0]]===s.tiles[h[1]]&&mj.free(s,h[0])&&mj.free(s,h[1]));assert.equal(s.hints,1);
  mj.select(s,h[0]);mj.select(s,h[1]);assert.equal(s.removed,1);const kinds=[s.tiles[h[0]],s.tiles[h[1]]];assert.deepEqual(kinds,[null,null]);
  assert.ok(mj.undo(s));assert.equal(s.removed,0);assert.notEqual(s.tiles[h[0]],null);assert.equal(mj.undo(s),false);
});
test('Mahjong: Sackgasse wird automatisch gemischt und bleibt lösbar',()=>{
  let shuffled=0,proven=0;
  for(const difficulty of ['easy','normal'])for(let seed=1;seed<=60&&shuffled<4;seed++){
    const s=mj.create({difficulty,seed});let g=0,x=seed;
    // zufällig (aber reproduzierbar) spielen, bis eine Sackgasse entsteht
    while(s.status==='playing'&&g++<300){
      const before=s.shuffles,ps=mj.pairs(s);if(!ps.length)break;x=(Math.imul(x,1664525)+1013904223)>>>0;const p=ps[x%ps.length];mj.select(s,p[0]);mj.select(s,p[1]);
      if(s.shuffles>before){
        shuffled++;assert.equal(s.notice,'shuffled');assert.ok(mj.pairs(s).length>=1,'nach dem Mischen gibt es Züge');
        const result=solvable(s);assert.notEqual(result,false,'ein gemischtes Brett ist weiterhin zu gewinnen');if(result===true)proven++;
      }
    }
  }
  assert.ok(shuffled>0,'der Test hat eine Sackgasse erreicht');assert.ok(proven>0,'mindestens ein gemischtes Brett wurde vollständig als lösbar bewiesen');
});
test('Mahjong: Speicherstand mit ungeraden Motiven, belegtem Rückgängig-Platz oder ohne Zug wird abgelehnt',()=>{
  const s=mj.create({difficulty:'normal',seed:3});assert.ok(mj.restore(clone(s)));
  const odd=clone(s);odd.tiles[odd.tiles.findIndex(k=>k!==null)]=null;assert.equal(mj.restore(odd),null);
  const bad=clone(s);bad.history=[[0,1,2,3]];assert.equal(mj.restore(bad),null);
  const range=clone(s);range.tiles[0]=99;assert.equal(mj.restore(range),null);
  const won=clone(s);won.status='won';assert.equal(mj.restore(won),null);
  const lost=clone(s);lost.status='lost';assert.equal(mj.restore(lost),null,'verloren nur ohne Zug');
});

// ---------- Match-3 ----------
test('Match-3: Start ohne fertige Reihen und mit mindestens einem Zug; reproduzierbar',()=>{
  for(const lv of m3.LEVELS)for(let seed=1;seed<=15;seed++){
    const s=m3.create({difficulty:lv.difficulty,level:lv.id,seed});
    assert.equal(s.grid.length,64);assert.equal(m3.matches(s.grid).size,0);assert.ok(m3.validSwaps(s.grid).length>=1);assert.equal(s.movesLeft,lv.moves);assert.ok(s.grid.every(k=>k>=0&&k<m3.DIFFICULTIES[lv.difficulty].kinds));
  }
  assert.deepEqual(m3.create({seed:5}),m3.create({seed:5}));
  assert.equal(m3.LEVELS.length,9);assert.equal(new Set(m3.LEVELS.map(l=>l.id)).size,9);
});
test('Match-3: ungültiger Tausch wird zurückgesetzt und kostet keinen Zug; gültiger kostet einen und räumt',()=>{
  const s=m3.create({difficulty:'normal',level:'n1',seed:6}),before=[...s.grid],valid=m3.validSwaps(s.grid);
  const invalid=[...Array(63).keys()].find(i=>i%8<7&&!valid.some(([a,b])=>a===i&&b===i+1));
  assert.equal(m3.swap(s,invalid,invalid+1),false);assert.deepEqual(s.grid,before);assert.equal(s.movesLeft,22);assert.equal(s.notice,'invalid');
  assert.equal(m3.swap(s,0,9),false,'nicht benachbart');assert.equal(m3.swap(s,7,8),false,'Zeilenumbruch ist keine Nachbarschaft');
  const [a,b]=valid[0];assert.equal(m3.swap(s,a,b),true);assert.equal(s.movesLeft,21);assert.equal(s.moves,1);assert.ok(s.score>0);assert.equal(m3.matches(s.grid).size,0,'danach keine fertigen Reihen');
});
test('Match-3: Kaskaden enden immer, Punkte wachsen mit der Kette, Brett bleibt gültig',()=>{
  for(let seed=1;seed<=40;seed++){
    const s=m3.create({difficulty:'hard',level:'h1',seed});let g=0,max=0;
    while(s.status==='playing'&&g++<40){const h=m3.hint(s);if(!h)break;const before=s.score;m3.swap(s,h[0],h[1]);max=Math.max(max,s.combo);assert.ok(s.score>before);assert.equal(m3.matches(s.grid).size,0);assert.ok(s.grid.every(k=>k>=0&&k<6));if(s.status==='playing')assert.ok(m3.validSwaps(s.grid).length>=1,'immer ein Zug möglich (sonst wird gemischt)');}
    assert.ok(['won','lost'].includes(s.status)||g>=40);assert.ok(max<=m3.MAX_CASCADE);
  }
  const s=m3.create({difficulty:'easy',level:'e1',seed:2});s.grid=Array.from({length:64},(_,i)=>(i*3+Math.floor(i/8))%5);s.grid[0]=0;s.grid[1]=0;s.grid[3]=0;s.grid[2]=1;
  // 0 0 _ 0 → Tausch von Feld 2 und 3 ergibt drei Nullen in Reihe 0
  s.grid[2]=2;s.grid[3]=0;const swaps=m3.validSwaps(s.grid);assert.ok(swaps.length>0);
});
test('Match-3: Sieg bei erreichtem Ziel, Niederlage bei leerem Zugvorrat, Hilfe liefert gültige Tausche',()=>{
  const s=m3.create({difficulty:'easy',level:'e1',seed:3});s.score=m3.levelOf(s).target-1;const h=m3.hint(s);assert.ok(h);assert.ok(m3.validSwaps(s.grid).some(([a,b])=>a===h[0]&&b===h[1]));
  m3.swap(s,h[0],h[1]);assert.equal(s.status,'won');assert.equal(m3.swap(s,0,1),false,'nach dem Ende nichts mehr');
  const t=m3.create({difficulty:'hard',level:'h3',seed:4});t.movesLeft=1;const g=m3.hint(t);m3.swap(t,g[0],g[1]);assert.equal(t.status,t.score>=1800?'won':'lost');
  const sel=m3.create({difficulty:'easy',level:'e2',seed:5}),[a,b]=m3.validSwaps(sel.grid)[0];assert.ok(m3.select(sel,a));assert.equal(sel.selected,a);assert.ok(m3.select(sel,a));assert.equal(sel.selected,null);m3.select(sel,a);m3.select(sel,b);assert.equal(sel.moves,1,'zweites benachbartes Feld tauscht');
});
test('Match-3: Speicherstand mit fertigen Reihen, falschem Zugvorrat oder unmöglichem Ausgang wird abgelehnt',()=>{
  const s=m3.create({difficulty:'normal',level:'n2',seed:8});assert.ok(m3.restore(clone(s)));
  const rows=clone(s);rows.grid[0]=rows.grid[1]=rows.grid[2]=0;assert.equal(m3.restore(rows),null);
  const moves=clone(s);moves.movesLeft=3;assert.equal(m3.restore(moves),null);
  const won=clone(s);won.status='won';assert.equal(m3.restore(won),null);
  const lost=clone(s);lost.status='lost';assert.equal(m3.restore(lost),null);
  const kinds=clone(s);kinds.grid[5]=9;assert.equal(m3.restore(kinds),null);
  const level=clone(s);level.level='e1';assert.equal(m3.restore(level),null,'Level gehört zur Schwierigkeit');
});

// ---------- gemeinsam ----------
test('Alle vier: Speichern und Wiederherstellen ist verlustfrei, Pause bleibt, defekte Stände bleiben unangetastet',()=>{
  const memory=new Map(),storage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>{memory.set(k,v);}};
  for(const [id,engine] of Object.entries(engines)){
    assert.ok(saves.IDS.includes(id));
    const s=engine.create({difficulty:'normal',seed:21});
    if(id==='block-puzzle'){const h=bp.hint(s);bp.place(s,h.piece,h.row,h.col);}else if(id==='solitaire')sol.draw(s);else if(id==='mahjong-solitaire'){const h=mj.hint(s);mj.select(s,h[0]);}else m3.swap(s,...m3.hint(s));
    s.paused=true;
    assert.equal(saves.save(storage,id,s),true);
    const back=saves.load(storage,id,engine.restore);assert.equal(back.status,'saved');assert.equal(back.state.paused,true,'wird pausiert fortgesetzt');
    const again=clone(s);again.paused=true;assert.deepEqual(clone(back.state).tableau??clone(back.state).grid??clone(back.state).tiles,again.tableau??again.grid??again.tiles);
    memory.set(saves.key(id),'{"kaputt":');const damaged=saves.load(storage,id,engine.restore);assert.equal(damaged.status,'corrupt');assert.equal(memory.get(saves.key(id)),'{"kaputt":','das Laden verändert nichts');
    memory.set(saves.key(id),JSON.stringify({version:99,id,updatedAt:1,state:s}));assert.equal(saves.load(storage,id,engine.restore).status,'version');
    memory.set(saves.key(id),JSON.stringify({version:1,id,updatedAt:1,state:{...clone(s),status:'unbekannt'}}));assert.equal(saves.load(storage,id,engine.restore).status,'corrupt');
  }
});
test('Alle vier: die Uhr zählt nur im Spiel, nicht in Pause und nicht nach dem Ende',()=>{
  for(const engine of Object.values(engines)){
    const s=engine.create({difficulty:'easy',seed:3});engine.tick(s,500);assert.equal(s.elapsedMs,500);
    s.paused=true;engine.tick(s,500);assert.equal(s.elapsedMs,500);s.paused=false;s.status='lost';engine.tick(s,500);assert.equal(s.elapsedMs,500);
  }
});
