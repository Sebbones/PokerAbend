// Oberfläche für Block-Puzzle, Solitär, Mahjong-Solitär und Match-3. Rein lokal: Spielstand und Bestwerte nur in diesem Browser.
import * as blockpuzzle from './blockpuzzle-logic.js';
import * as solitaire from './solitaire-logic.js';
import * as mahjong from './mahjong-logic.js';
import * as match3 from './match3-logic.js';
import * as saves from './storage.js';
import {MAHJONG,mahjongSvg,PLANTS,plantSvg} from './puzzle-art.js';

const ENGINES={'block-puzzle':blockpuzzle,solitaire,'mahjong-solitaire':mahjong,'match-3':match3};
const time=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
const SUITS={c:'♣',d:'♦',h:'♥',s:'♠'};

export function mount(root,id,remember,ctx){
 const engine=ENGINES[id],{tx,esc}=ctx,abort=new AbortController();
 const title={'block-puzzle':tx('Block-Puzzle','Block puzzle'),solitaire:tx('Solitär','Solitaire'),'mahjong-solitaire':tx('Mahjong-Solitär','Mahjong solitaire'),'match-3':tx('Match-3','Match-3')}[id];
 let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();}};}
 const loaded=remember?{state:remember.state,status:remember.saveStatus}:saves.load(storage,id,engine.restore);
 let state=loaded.state,saveStatus=loaded.status,setup=remember?.setup??!state,draft=remember?.draft||{},stats=saves.readStats(storage,id);
 let last=performance.now(),dead=false,piece=null,preview=null,cursor=0,sel=null,hintMove=null,lastTap={key:'',at:0},autoRun=false,pointer=null,ignoreClickUntil=0;
 const q=s=>root.querySelector(s),on=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
 const difficultyName=d=>({
  'block-puzzle':{easy:tx('Leicht · 10×10, kleine Formen','Easy · 10×10, small shapes'),normal:tx('Mittel · 10×10, alle Formen','Medium · 10×10, all shapes'),hard:tx('Schwer · 8×8, große Formen','Hard · 8×8, large shapes')},
  solitaire:{easy:tx('Leicht · eine Karte ziehen','Easy · draw one'),normal:tx('Mittel · drei Karten ziehen','Medium · draw three'),hard:tx('Schwer · drei Karten, drei Durchgänge','Hard · draw three, three passes')},
  'mahjong-solitaire':{easy:tx('Leicht · Pyramide, 36 Steine','Easy · Pyramid, 36 tiles'),normal:tx('Mittel · Brücke, 62 Steine','Medium · Bridge, 62 tiles'),hard:tx('Schwer · Turm, 96 Steine','Hard · Tower, 96 tiles')},
  'match-3':{easy:tx('Leicht','Easy'),normal:tx('Mittel','Medium'),hard:tx('Schwer','Hard')},
 })[id][d];
 const levels=()=>id==='match-3'?match3.LEVELS.filter(l=>l.difficulty===(draft.difficulty||state?.difficulty||'normal')):[];
 const recordKey=s=>s.difficulty+(s.level?':'+s.level:'');
 const valid=v=>Number.isFinite(v)&&v>=0&&v<=1e12;
 const record=(s=state)=>{const r=stats.records?.[recordKey(s)];return r&&typeof r==='object'&&!Array.isArray(r)?r:{};};
 function bestText(s=state){
  const r=record(s);
  if(id==='block-puzzle')return `${tx('Highscore','High score')}: ${valid(r.score)?r.score:0}`;
  if(id==='match-3')return `${tx('Bestpunkte','Best score')}: ${valid(r.score)?r.score:0}${r.cleared?' ✓':''}`;
  return `${tx('Bestzeit','Best time')}: ${valid(r.timeMs)?time(r.timeMs):'—'}${id==='solitaire'?` · ${tx('Beste Züge','Fewest moves')}: ${valid(r.moves)?r.moves:'—'}`:''}`;
 }
 function persist(){
  if(!state)return;saveStatus=saves.save(storage,id,state)?'saved':'unavailable';
  const previous=record(),r={...previous};let changed=false;
  if(id==='block-puzzle'&&state.score>(valid(r.score)?r.score:0)){r.score=state.score;changed=true;}
  if(id==='match-3'){if(state.score>(valid(r.score)?r.score:0)){r.score=state.score;changed=true;}if(state.status==='won'&&!r.cleared){r.cleared=true;changed=true;}}
  if(state.status==='won'&&(id==='solitaire'||id==='mahjong-solitaire'&&!state.hints)){
   if(state.elapsedMs<(valid(r.timeMs)?r.timeMs:Infinity)){r.timeMs=state.elapsedMs;changed=true;}
   if(id==='solitaire'&&state.moves<(valid(r.moves)?r.moves:Infinity)){r.moves=state.moves;changed=true;}
  }
  if(changed){stats={records:{...(stats.records&&typeof stats.records==='object'&&!Array.isArray(stats.records)?stats.records:{}),[recordKey(state)]:r}};if(!saves.writeStats(storage,id,stats))saveStatus='unavailable';}
  updateSave();
 }
 function updateSave(){const el=q('[data-save]');if(el)el.textContent=saveStatus==='unavailable'?tx('Speichern nicht verfügbar. Halte diesen Tab offen.','Saving unavailable. Keep this tab open.'):state?tx('Automatisch in diesem Browser gespeichert','Automatically saved in this browser'):tx('Privater Spielstand in diesem Browser','Private save in this browser');}
 const button=(action,label,disabled=false,extra='')=>`<button class="btn btn-ghost" type="button" data-action="${action}" ${disabled?'disabled':''} ${extra}>${label}</button>`;
 function rules(){return {
  'block-puzzle':tx('Wähle eine der drei Formen und setze sie auf das Raster. Formen werden nicht gedreht. Eine volle Reihe oder Spalte verschwindet; mehrere gleichzeitig geben deutlich mehr Punkte, aufeinanderfolgende Treffer einen Bonus. Sind alle drei gesetzt, kommen drei neue. Die Runde endet, wenn keine der angebotenen Formen mehr passt. Maus: Form wählen, über das Raster fahren, klicken. Touch: Form antippen, ein Feld antippen (Vorschau), dasselbe Feld nochmals antippen zum Setzen. Tastatur: 1–3 wählt die Form, Pfeile bewegen die Vorschau, Enter setzt, Z macht rückgängig, H zeigt einen Tipp, P pausiert.','Choose one of the three shapes and place it on the grid. Shapes are not rotated. A full row or column disappears; several at once score much more and consecutive clears add a bonus. After all three are placed, three new ones arrive. The round ends when none of the offered shapes fits. Mouse: choose a shape, hover over the grid, click. Touch: tap a shape, tap a cell (preview), tap the same cell again to place. Keyboard: 1–3 choose the shape, arrows move the preview, Enter places, Z undoes, H shows a hint, P pauses.'),
  solitaire:tx('Klondike: Baue in den sieben Reihen absteigend in wechselnden Farben (Rot auf Schwarz). Auf leere Reihen darf nur ein König. Die vier Fundamente werden je Farbe vom Ass bis zum König aufgebaut. Tippe den Vorrat, um Karten aufzudecken – je nach Stufe eine oder drei. Wähle eine Karte (mit allen darunterliegenden) und danach das Ziel; ein Doppelklick bzw. Doppeltipp legt eine Karte direkt auf das Fundament. Sind alle Karten aufgedeckt und der Vorrat leer, wird automatisch abgelegt. Z macht rückgängig, H zeigt einen Tipp, P pausiert.','Klondike: build the seven columns downward in alternating colours (red on black). Only a king may go on an empty column. The four foundations are built up per suit from ace to king. Tap the stock to turn cards – one or three depending on the level. Choose a card (with all below it) and then the target; a double click or double tap sends a card straight to the foundation. When all cards are face up and the stock is empty, the rest is placed automatically. Z undoes, H shows a hint, P pauses.'),
  'mahjong-solitaire':tx('Entferne Paare gleicher Steine. Ein Stein ist frei, wenn nichts auf ihm liegt und links oder rechts daneben kein Stein liegt. Alle Anordnungen sind beim Start lösbar. Der Tipp zeigt ein sinnvolles Paar (ein Bestzeit-Eintrag zählt nur ohne Tipp). Gibt es keine Paare mehr, wird automatisch neu gemischt – danach bleibt das Spiel lösbar. Lässt sich die Form nicht mehr abbauen, hilft Rückgängig. Tippen oder Enter wählt, Z macht rückgängig, H zeigt einen Tipp, P pausiert.','Remove pairs of identical tiles. A tile is free when nothing lies on top of it and at least one side neighbour is missing. Every layout is solvable at the start. The hint shows a sensible pair (a best-time entry counts only without hints). When no pairs are left the tiles are reshuffled automatically – the game stays solvable afterwards. If the shape can no longer be taken apart, undo helps. Tap or Enter selects, Z undoes, H shows a hint, P pauses.'),
  'match-3':tx('Tausche zwei benachbarte Pflanzen, sodass drei oder mehr gleiche in einer Reihe oder Spalte liegen. Sie verschwinden, neue rutschen nach – Kaskaden zählen immer mehr. Ein Tausch ohne Treffer wird zurückgenommen und kostet keinen Zug. Erreiche die Zielpunkte, bevor die Züge aufgebraucht sind. Gibt es keinen Zug mehr, wird das Brett neu gemischt. Tippen, Wischen oder Tastatur (Pfeile, Enter wählt und tauscht) – H zeigt einen Tipp, P pausiert.','Swap two neighbouring plants so that three or more identical ones line up in a row or column. They disappear and new ones fall in – cascades score more and more. A swap without a match is taken back and costs no move. Reach the target score before the moves run out. If no move is left the board is reshuffled. Tap, swipe or use the keyboard (arrows, Enter selects and swaps) – H shows a hint, P pauses.'),
 }[id];}
 function frame(){root.innerHTML=`<section class="singleplayer solo-${id} solo-collection solo-puzzle" data-solo="${id}" aria-label="${title}"><header class="sp-heading"><div><a href="#spiele/einzelspieler">← ${tx('Einzelspieler','Single player')}</a><p class="eyebrow">${tx('Dein Spiel. Dein Tempo.','Your game. Your pace.')}</p><h1>${title}</h1></div><span class="sp-private">${tx('Lokal · nur für dich','Local · just for you')}</span></header><div class="sp-common"><span class="sp-save" data-save role="status"></span><div class="sp-actions">${button('pause',tx('Pause','Pause'))}${button('new',tx('Neues Spiel','New game'))}</div></div><div data-content></div><details class="sp-details"><summary>${tx('Regeln & Bedienung','Rules & controls')}</summary><p>${rules()}</p></details><details class="sp-details"><summary>${tx('Einstellungen','Settings')}</summary><div class="sp-settings">${ctx.preferences()}</div></details><p class="sp-footnote">${tx('Nur lokale Bestleistungen. Keine öffentliche Rangliste. Beim Verlassen oder im Hintergrund wird pausiert.','Local personal bests only. No public leaderboard. Leaving or hiding the tab pauses the game.')}</p></section>`;updateSave();}
 function renderSetup(){
  const d=draft.difficulty||state?.difficulty||'normal',lv=levels();
  const warning=saveStatus==='corrupt'?tx('Der gespeicherte Spielstand ist beschädigt und bleibt unverändert, bis du bewusst ein neues Spiel startest.','The saved game is damaged and stays unchanged until you deliberately start a new game.'):saveStatus==='version'?tx('Unbekannte Speicherversion. Sie wird erst durch ein bewusst gestartetes neues Spiel ersetzt.','Unknown save version. It is replaced only by deliberately starting a new game.'):saveStatus==='unavailable'?tx('Browserspeicher gesperrt. Du kannst trotzdem spielen.','Browser storage blocked. You can still play.'):'';
  q('[data-content]').innerHTML=`<div class="sp-setup"><div class="sp-emblem" aria-hidden="true">${{'block-puzzle':'▦ ▤','solitaire':'♠ ♥','mahjong-solitaire':'☀ ☾','match-3':'❀ ✿'}[id]}</div><h2>${tx('Bereit für eine Runde?','Ready for a round?')}</h2>${warning?`<p class="error" role="status">${warning}</p>`:''}${state?`<p>${tx('Dein bisheriges Spiel bleibt bis zum Neustart erhalten.','Your current game stays saved until you start a new one.')}</p>${button('cancel-new',tx('Vorhandenes Spiel fortsetzen','Continue existing game'))}`:''}<form data-setup><label>${tx('Schwierigkeit','Difficulty')}<select name="difficulty">${Object.keys(engine.DIFFICULTIES).map(v=>`<option value="${v}" ${v===d?'selected':''}>${esc(difficultyName(v))}</option>`).join('')}</select></label>${lv.length?`<label>${tx('Level','Level')}<select name="level">${lv.map(l=>`<option value="${l.id}" ${l.id===(draft.level||state?.level)?'selected':''}>${esc(tx(...l.name))} · ${l.target} / ${l.moves}${stats.records?.[d+':'+l.id]?.cleared?' ✓':''}</option>`).join('')}</select></label>`:''}<button class="btn btn-brass" type="submit">${tx('Neues Spiel starten','Start new game')}</button></form></div>`;
  q('.sp-common [data-action=pause]').disabled=true;
 }
 const paused=()=>state.paused&&state.status==='playing'?`<div class="sp-paused"><h2>${tx('Spiel pausiert','Game paused')}</h2><p>${tx('Dein Fortschritt wartet auf dich.','Your progress is waiting for you.')}</p>${button('pause',tx('Fortsetzen','Resume'))}</div>`:'';
 const locked=()=>state.paused||state.status!=='playing';
 function toolbar(){
  const s=state,off=locked();
  const undo=id!=='match-3'?button('undo',tx('Rückgängig','Undo'),!s.history?.length||s.paused&&s.status==='playing'):'';
  const hintBtn=button('hint',tx('Tipp','Hint'),off);
  const extra=id==='mahjong-solitaire'?button('shuffle',tx('Mischen','Shuffle'),off):id==='solitaire'&&solitaire.canAutoFinish(s)?button('auto',tx('Automatisch ablegen','Auto-place'),off):'';
  return `<div class="sp-actions sp-tools">${undo}${hintBtn}${extra}</div>`;
 }
 function resultBlock(){
  const s=state;if(s.status==='playing')return '';
  const won=s.status==='won',msg=won?tx('Geschafft!','Well done!'):id==='match-3'?tx('Keine Züge mehr.','Out of moves.'):id==='mahjong-solitaire'?tx('Keine Paare mehr. Mach einen Zug rückgängig oder starte neu.','No pairs left. Undo a move or start again.'):tx('Das Brett ist voll.','The board is full.');
  const detail=id==='block-puzzle'?`${tx('Punkte','Score')}: ${s.score}`:id==='match-3'?`${tx('Punkte','Score')}: ${s.score} / ${match3.levelOf(s).target}`:`${time(s.elapsedMs)}${s.moves!==undefined?` · ${s.moves} ${tx('Züge','moves')}`:''}`;
  const next=id==='match-3'&&won?match3.LEVELS[match3.LEVELS.findIndex(l=>l.id===s.level)+1]:null;
  return `<div class="sp-result" role="status"><h2>${msg}</h2><p>${detail}</p><div class="sp-actions">${(s.history?.length&&!won)?button('undo',tx('Rückgängig','Undo')):''}${button('restart',tx('Nochmal','Again'))}${next&&next.difficulty===s.difficulty?button('next',tx('Nächstes Level','Next level')):''}${button('new',tx('Neues Spiel','New game'))}</div></div>`;
 }
 // ---------- Block-Puzzle ----------
 function blockHTML(){
  const s=state,n=blockpuzzle.size(s),off=locked();
  const cells=new Set();let ok=false;
  if(piece!==null&&preview&&s.pieces[piece]!==null){ok=blockpuzzle.canPlace(s,s.pieces[piece],preview.r,preview.c);for(const [r,c] of blockpuzzle.cellsOf(s.pieces[piece]))cells.add((preview.r+r)*n+preview.c+c);}
  const hinted=new Set();if(hintMove)for(const [r,c] of blockpuzzle.cellsOf(s.pieces[hintMove.piece]))hinted.add((hintMove.row+r)*n+hintMove.col+c);
  const cleared=new Set(s.lastCleared);
  const board=Array.from({length:n*n},(_,i)=>`<button type="button" class="bp-cell ${s.grid[i]?'full':''} ${cells.has(i)?(ok?'preview':'bad'):''} ${hinted.has(i)?'hint':''} ${cleared.has(i)?'cleared':''}" data-cell="${i}" tabindex="${(preview?preview.r*n+preview.c:cursor)===i?0:-1}" aria-label="${tx('Zeile','Row')} ${Math.floor(i/n)+1}, ${tx('Spalte','column')} ${i%n+1}, ${s.grid[i]?tx('belegt','filled'):tx('frei','empty')}" ${off?'disabled':''}></button>`).join('');
  const trays=s.pieces.map((p,i)=>{if(p===null)return `<div class="bp-piece used" aria-hidden="true"></div>`;const e=blockpuzzle.extent(p),set=new Set(blockpuzzle.cellsOf(p).map(([r,c])=>r*e.cols+c)),fits=blockpuzzle.fitsAnywhere(s,p);
   return `<button type="button" class="bp-piece ${piece===i?'selected':''} ${hintMove?.piece===i?'hint':''} ${fits?'':'stuck'}" data-piece="${i}" aria-pressed="${piece===i}" aria-label="${tx('Form','Shape')} ${i+1}${fits?'':', '+tx('passt nirgends','fits nowhere')}" ${off?'disabled':''}><span class="bp-mini" style="--cols:${e.cols};--rows:${e.rows}">${Array.from({length:e.rows*e.cols},(_,k)=>`<i class="${set.has(k)?'on':''}"></i>`).join('')}</span></button>`;}).join('');
  return `<div class="bp-layout"><div class="bp-board" style="--n:${n}" role="grid" aria-label="${tx('Spielfeld','Board')}">${board}</div><div class="bp-side"><div class="bp-trays" role="group" aria-label="${tx('Angebotene Formen','Offered shapes')}">${trays}</div>${toolbar()}</div></div>`;
 }
 // ---------- Solitär ----------
 const same=(a,b)=>a&&b&&a.k===b.k&&a.col===b.col&&a.index===b.index&&a.suit===b.suit;
 function cardHTML(c,attrs='',cls=''){return typeof deckCard==='function'?deckCard(c,{cls,attrs}):`<button type="button" class="kc ${cls}" ${attrs}>${c}</button>`;}
 function solitaireHTML(){
  const s=state,off=locked(),hf=hintMove?.from,ht=hintMove?.to,mark=(src,extra='')=>`${same(sel,src)?'sol-selected ':''}${same(hf,src)?'hint ':''}${extra}`;
  const stock=s.stock.length?`<button type="button" class="kc kc-back sol-stock ${hintMove?.draw?'hint':''}" data-sol="stock" aria-label="${tx('Vorrat','Stock')}: ${s.stock.length}" ${off?'disabled':''}><b>${s.stock.length}</b></button>`:`<button type="button" class="sol-slot sol-stock" data-sol="stock" aria-label="${tx('Vorrat leer','Stock empty')}${solitaire.redealsLeft(s)>0&&s.waste.length?', '+tx('Ablage zurücklegen','recycle waste'):''}" ${off?'disabled':''}>${s.waste.length&&solitaire.redealsLeft(s)>0?'↺':'∅'}</button>`;
  const wasteShown=s.waste.slice(-Math.min(3,solitaire.drawCount(s))).map((c,i,a)=>i===a.length-1?cardHTML(c,`data-sol="waste" ${off?'disabled':''}`,mark({k:'waste'})):cardHTML(c,'disabled tabindex="-1"','sol-under')).join('');
  const waste=`<div class="sol-waste ${s.waste.length?'':'empty'}">${wasteShown||`<span class="sol-slot" aria-hidden="true"></span>`}</div>`;
  const found=solitaire.SUITS.split('').map((su,i)=>{const f=s.foundations[i],c=f[f.length-1];return c?cardHTML(c,`data-sol="found" data-suit="${i}" ${off?'disabled':''}`,mark({k:'found',suit:i})):`<button type="button" class="sol-slot found" data-sol="found" data-suit="${i}" aria-label="${tx('Fundament','Foundation')} ${SUITS[su]}" ${off?'disabled':''}>${SUITS[su]}</button>`;}).join('');
  const columns=s.tableau.map((p,col)=>{
   if(!p.length)return `<div class="sol-col" role="group" aria-label="${tx('Reihe','Column')} ${col+1}"><button type="button" class="sol-slot ${ht?.k==='tab'&&ht.col===col?'hint':''}" data-sol="col" data-col="${col}" aria-label="${tx('Leere Reihe','Empty column')} ${col+1}" ${off?'disabled':''}>K</button></div>`;
   let t=0;const parts=p.map((e,index)=>{const at=t;t+=e.up?.44:.2;return e.up?cardHTML(e.c,`data-sol="tab" data-col="${col}" data-index="${index}" style="--t:${at.toFixed(2)}" ${off?'disabled':''}`,mark({k:'tab',col,index},ht?.k==='tab'&&ht.col===col&&index===p.length-1?'hint ':'')):`<span class="kc kc-back sol-down" style="--t:${at.toFixed(2)}" aria-hidden="true"></span>`;});
   return `<div class="sol-col" role="group" aria-label="${tx('Reihe','Column')} ${col+1}" style="--span:${(t-(p[p.length-1].up?.44:.2)).toFixed(2)}">${parts.join('')}</div>`;
  }).join('');
  return `<div class="sol-board"><div class="sol-top"><div class="sol-stockwaste">${stock}${waste}</div><div class="sol-found" role="group" aria-label="${tx('Fundamente','Foundations')}">${found}</div></div><div class="sol-cols">${columns}</div></div>${toolbar()}`;
 }
 // ---------- Mahjong ----------
 function mahjongHTML(){
  const s=state,pos=mahjong.layout(s),off=locked(),W=Math.max(...pos.map(p=>p[1]))+2,H=Math.max(...pos.map(p=>p[2]))+2,freeSet=new Set(mahjong.freeTiles(s)),hp=new Set(hintMove||[]);
  const order=pos.map((_,i)=>i).sort((a,b)=>pos[a][0]-pos[b][0]||pos[a][2]-pos[b][2]||pos[a][1]-pos[b][1]);
  const tiles=order.filter(i=>s.tiles[i]!==null).map(i=>{const [z,x,y]=pos[i],k=s.tiles[i],free=freeSet.has(i);
   return `<button type="button" class="mj-tile ${free?'free':'blocked'} ${s.selected===i?'selected':''} ${hp.has(i)?'hint':''}" style="--x:${x};--y:${y};--z:${z}" data-tile="${i}" aria-label="${esc(tx(MAHJONG[k][0],MAHJONG[k][1]))}${free?'':', '+tx('blockiert','blocked')}" aria-pressed="${s.selected===i}" ${free&&!off?'':'tabindex="-1"'} ${off?'disabled':''}>${mahjongSvg(k)}</button>`;}).join('');
  return `<div class="solo-scroll"><div class="mj-board" style="--w:${W};--h:${H}" role="group" aria-label="${tx('Steine','Tiles')}">${tiles}</div></div>${s.notice==='shuffled'?`<p class="sp-note" role="status">${tx('Keine Paare mehr – die Steine wurden neu gemischt.','No pairs left – the tiles were reshuffled.')}</p>`:''}${toolbar()}`;
 }
 // ---------- Match-3 ----------
 function match3HTML(){
  const s=state,off=locked(),lv=match3.levelOf(s),hp=new Set(hintMove||[]);
  const cells=s.grid.map((k,i)=>`<button type="button" class="m3-cell ${s.selected===i?'selected':''} ${hp.has(i)?'hint':''}" data-cell="${i}" tabindex="${cursor===i?0:-1}" aria-label="${esc(tx(PLANTS[k][0],PLANTS[k][1]))}, ${tx('Zeile','row')} ${Math.floor(i/8)+1}, ${tx('Spalte','column')} ${i%8+1}" aria-pressed="${s.selected===i}" ${off?'disabled':''}>${plantSvg(k)}</button>`).join('');
  const pct=Math.min(100,Math.round(s.score/lv.target*100));
  return `<div class="m3-goal"><div class="m3-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.target}" aria-valuenow="${Math.min(s.score,lv.target)}" aria-label="${tx('Zielpunkte','Target score')}"><span style="width:${pct}%"></span></div><small>${s.score} / ${lv.target}</small></div><div class="m3-board" role="grid" aria-label="${tx('Spielfeld','Board')}">${cells}</div>${s.notice==='invalid'?`<p class="sp-note" role="status">${tx('Dieser Tausch ergibt keine Reihe – er kostet keinen Zug.','That swap makes no line – it costs no move.')}</p>`:s.notice==='shuffled'?`<p class="sp-note" role="status">${tx('Kein Zug mehr möglich – das Brett wurde neu gemischt.','No move left – the board was reshuffled.')}</p>`:''}${toolbar()}`;
 }
 function render(){
  const focused=document.activeElement,action=focused?.closest?.('[data-action]')?.dataset.action,cell=focused?.closest?.('[data-cell]')?.dataset.cell,tile=focused?.closest?.('[data-tile]')?.dataset.tile,solKey=focused?.closest?.('[data-sol]')?focused.outerHTML.match(/data-sol="(\w+)"(?: data-col="(\d)")?(?: data-index="(\d+)")?(?: data-suit="(\d)")?/):null,piece0=focused?.closest?.('[data-piece]')?.dataset.piece;
  if(setup){renderSetup();return;}
  const s=state,lv=id==='match-3'?match3.levelOf(s):null;
  const count={'block-puzzle':()=>`${tx('Punkte','Score')}: ${s.score}`,solitaire:()=>`${tx('Züge','Moves')}: ${s.moves}${solitaire.redealsLeft(s)!==Infinity?` · ${tx('Durchgänge','Passes')}: ${solitaire.redealsLeft(s)+1}`:''}`,'mahjong-solitaire':()=>`${tx('Paare','Pairs')}: ${s.removed}/${s.tiles.length/2}`,'match-3':()=>`${tx('Züge','Moves')}: ${s.movesLeft}`}[id]();
  const body={'block-puzzle':blockHTML,solitaire:solitaireHTML,'mahjong-solitaire':mahjongHTML,'match-3':match3HTML}[id]();
  q('[data-content]').innerHTML=`<div class="sp-metrics"><span>${esc(difficultyName(s.difficulty))}${lv?' · '+esc(tx(...lv.name)):''}</span><span>${count}</span><span data-clock>${time(s.elapsedMs)}</span><span data-best>${bestText()}</span></div>${paused()}${s.paused&&s.status==='playing'?'':body}${resultBlock()}`;
  const pause=q('.sp-common [data-action=pause]');pause.disabled=s.status!=='playing';pause.textContent=s.paused?tx('Fortsetzen','Resume'):tx('Pause','Pause');
  if(action)q(`[data-action="${action}"]:not(:disabled)`)?.focus({preventScroll:true});
  else if(cell!==undefined)q(`[data-cell="${cell}"]:not(:disabled)`)?.focus({preventScroll:true});
  else if(tile!==undefined)(q(`[data-tile="${tile}"]:not(:disabled)`)||q('[data-tile]:not(:disabled):not([tabindex="-1"])'))?.focus({preventScroll:true});
  else if(piece0!==undefined)q(`[data-piece="${piece0}"]:not(:disabled)`)?.focus({preventScroll:true});
  else if(solKey){const [,k,col,index,suit]=solKey;const sel2=k==='tab'?`[data-sol=tab][data-col="${col}"][data-index="${index}"]`:k==='found'?`[data-sol=found][data-suit="${suit}"]`:`[data-sol=${k}]`;(q(sel2)||q('[data-sol]'))?.focus({preventScroll:true});}
 }
 function change(fn){if(!state||setup)return false;const ok=fn();if(ok===false){render();return false;}hintMove=null;persist();render();return true;}
 function pause(){if(!state||setup||state.status!=='playing')return;state.paused=!state.paused;last=performance.now();persist();render();}
 function newGame(opts={}){
  const params={difficulty:opts.difficulty??state?.difficulty,level:opts.level??state?.level,seed:crypto.getRandomValues(new Uint32Array(1))[0]};
  state=engine.create(params);setup=false;piece=null;preview=null;sel=null;hintMove=null;autoRun=false;cursor=0;last=performance.now();ctx.recent?.();persist();render();
 }
 // ---------- Aktionen ----------
 function placePiece(r,c){
  if(piece===null)return;const p=state.pieces[piece];if(p===null)return;
  if(!blockpuzzle.canPlace(state,p,r,c)){preview={r,c};render();return;}
  const index=piece;change(()=>blockpuzzle.place(state,index,r,c));preview=null;
  piece=state.pieces[index]!==null?index:state.pieces.findIndex(v=>v!==null);if(piece<0)piece=null;render();
 }
 function blockCell(i){
  const n=blockpuzzle.size(state),r=Math.floor(i/n),c=i%n;cursor=i;
  if(piece===null){const first=state.pieces.findIndex(v=>v!==null);if(first>=0){piece=first;preview={r,c};render();}return;}
  if(preview&&preview.r===r&&preview.c===c)placePiece(r,c);else{preview={r,c};render();}
 }
 const sourceOf=el=>el.dataset.sol==='waste'?{k:'waste'}:el.dataset.sol==='found'?{k:'found',suit:Number(el.dataset.suit)}:el.dataset.sol==='tab'?{k:'tab',col:Number(el.dataset.col),index:Number(el.dataset.index)}:null;
 function solClick(el){
  const kind=el.dataset.sol;
  if(kind==='stock'){sel=null;change(()=>solitaire.draw(state));return;}
  const src=sourceOf(el),target=kind==='tab'||kind==='col'?{k:'tab',col:Number(el.dataset.col)}:kind==='found'?{k:'found'}:null,key=JSON.stringify(src),now=performance.now();
  if(src&&sel&&same(sel,src)&&lastTap.key===key&&now-lastTap.at<420&&kind!=='found'){const from=sel;sel=null;if(solitaire.canMove(state,from,{k:'found'}))change(()=>solitaire.move(state,from,{k:'found'}));else render();lastTap={key:'',at:0};return;}
  lastTap={key,at:now};
  if(sel&&target&&!(src&&same(sel,src))){const from=sel;if(solitaire.canMove(state,from,target)){sel=null;change(()=>solitaire.move(state,from,target));return;}}
  sel=src&&solitaire.cardsAt(state,src).length&&!same(sel,src)?src:null;render();
 }
 function mahjongTile(i){change(()=>mahjong.select(state,i));}
 function matchCell(i){cursor=i;change(()=>match3.select(state,i));}
 function doHint(){
  if(locked())return;
  if(id==='block-puzzle'){hintMove=blockpuzzle.hint(state);if(hintMove){piece=hintMove.piece;preview={r:hintMove.row,c:hintMove.col};}}
  else if(id==='solitaire'){hintMove=solitaire.hint(state);}
  else if(id==='mahjong-solitaire'){hintMove=mahjong.hint(state);persist();}
  else hintMove=match3.hint(state);
  if(id==='match-3'||id==='mahjong-solitaire')persist();
  render();
 }
 function activate(target){
  if(!target||target.disabled)return;
  if(target.dataset.piece!==undefined){piece=piece===Number(target.dataset.piece)?null:Number(target.dataset.piece);hintMove=null;render();return;}
  if(target.hasAttribute('data-sol')){solClick(target);return;}
  if(target.hasAttribute('data-tile')){if(target.getAttribute('aria-disabled')==='true')return;mahjongTile(Number(target.dataset.tile));return;}
  if(target.hasAttribute('data-cell')){id==='block-puzzle'?blockCell(Number(target.dataset.cell)):matchCell(Number(target.dataset.cell));return;}
  const a=target.dataset.action;
  if(a==='pause')pause();
  else if(a==='new'){if(state){state.paused=state.status==='playing';persist();}setup=true;render();}
  else if(a==='cancel-new'){setup=false;render();}
  else if(a==='undo'){sel=null;preview=null;change(()=>engine.undo(state));}
  else if(a==='hint')doHint();
  else if(a==='shuffle')change(()=>mahjong.shuffleRemaining(state));
  else if(a==='auto'){autoRun=true;}
  else if(a==='restart'){const s=state;state=engine.create({difficulty:s.difficulty,level:s.level,seed:s.seed});piece=null;preview=null;sel=null;persist();render();}
  else if(a==='next'){const nx=match3.LEVELS[match3.LEVELS.findIndex(l=>l.id===state.level)+1];if(nx&&nx.difficulty===state.difficulty){state=engine.create({difficulty:state.difficulty,level:nx.id,seed:state.seed});persist();render();}}
 }
 on(root,'submit',event=>{if(!event.target.matches('[data-setup]'))return;event.preventDefault();const form=new FormData(event.target);newGame({difficulty:form.get('difficulty'),level:form.get('level')});});
 on(root,'change',event=>{if(!event.target.closest('[data-setup]'))return;draft[event.target.name]=event.target.value;if(event.target.name==='difficulty'){draft.level=null;renderSetup();q('[name=difficulty]')?.focus();}});
 on(root,'click',event=>{if(event.detail&&performance.now()<ignoreClickUntil&&event.target.closest('[data-cell]'))return;activate(event.target.closest('[data-piece],[data-sol],[data-tile],[data-cell],[data-action]'));});
 on(root,'pointerover',event=>{ // Maus: Vorschau folgt dem Zeiger; Touch braucht zwei Tipps
  if(id!=='block-puzzle'||event.pointerType!=='mouse'||piece===null||!state||setup||locked())return;
  const el=event.target.closest('[data-cell]');if(!el)return;const n=blockpuzzle.size(state),i=Number(el.dataset.cell),r=Math.floor(i/n),c=i%n;
  if(!preview||preview.r!==r||preview.c!==c){preview={r,c};cursor=i;render();}
 });
 on(root,'pointerdown',event=>{if(id!=='match-3')return;const el=event.target.closest('[data-cell]');if(el&&!el.disabled)pointer={x:event.clientX,y:event.clientY,id:event.pointerId,cell:Number(el.dataset.cell)};});
 on(root,'pointerup',event=>{
  const p=pointer?.id===event.pointerId?pointer:null;pointer=null;if(!p||!state||setup)return;
  const dx=event.clientX-p.x,dy=event.clientY-p.y;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
  const to=p.cell+(Math.abs(dx)>Math.abs(dy)?(dx>0?1:-1):(dy>0?8:-8)),horizontal=Math.abs(dx)>Math.abs(dy);
  if(to<0||to>63||horizontal&&Math.floor(to/8)!==Math.floor(p.cell/8))return;
  ignoreClickUntil=performance.now()+350;state.selected=null;change(()=>match3.swap(state,p.cell,to)||true);
 });
 on(root,'pointercancel',()=>{pointer=null;});
 on(document,'keydown',event=>{
  if(!state||setup||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,select,textarea,summary,.sp-settings'))return;
  const key=event.key.toLowerCase();
  if(key==='p'){event.preventDefault();pause();return;}
  if(locked())return;
  if(key==='z'&&engine.undo){event.preventDefault();sel=null;preview=null;change(()=>engine.undo(state));return;}
  if(key==='h'){event.preventDefault();doHint();return;}
  if(id==='block-puzzle'){
   if(['1','2','3'].includes(key)){event.preventDefault();const i=Number(key)-1;if(state.pieces[i]!==null){piece=i;render();}return;}
   const d={arrowup:[-1,0],arrowdown:[1,0],arrowleft:[0,-1],arrowright:[0,1]}[key],n=blockpuzzle.size(state);
   if(d&&event.target.closest('[data-cell]')){event.preventDefault();const cur=preview||{r:Math.floor(cursor/n),c:cursor%n},r=Math.max(0,Math.min(n-1,cur.r+d[0])),c=Math.max(0,Math.min(n-1,cur.c+d[1]));cursor=r*n+c;if(piece===null)piece=state.pieces.findIndex(v=>v!==null);preview={r,c};render();}
   else if(key==='enter'&&event.target.closest('[data-cell]')&&piece!==null&&preview){event.preventDefault();placePiece(preview.r,preview.c);}
   return;
  }
  if(id==='match-3'){const d={arrowup:-8,arrowdown:8,arrowleft:-1,arrowright:1}[key];if(d&&event.target.closest('[data-cell]')){event.preventDefault();const to=cursor+d;if(to>=0&&to<64&&!(Math.abs(d)===1&&Math.floor(to/8)!==Math.floor(cursor/8))){cursor=to;render();}}return;}
 });
 function suspend(){if(state&&state.status==='playing'&&!state.paused){state.paused=true;persist();render();}}
 on(document,'visibilitychange',()=>{if(document.hidden)suspend();});on(window,'pagehide',suspend);
 frame();render();
 const timer=setInterval(()=>{
  const now=performance.now(),dt=Math.min(250,now-last);last=now;
  if(dead||!state||setup||state.paused||state.status!=='playing'||document.hidden)return;
  if(autoRun){if(solitaire.canAutoFinish(state)&&solitaire.autoStep(state)){persist();render();}else autoRun=false;return;}
  engine.tick(state,dt);
  const clock=q('[data-clock]');if(clock)clock.textContent=time(state.elapsedMs);
  if(Math.floor(state.elapsedMs/5000)!==Math.floor((state.elapsedMs-dt)/5000))persist();
  if(id==='solitaire'&&!autoRun&&state.history.length&&solitaire.canAutoFinish(state)&&solitaire.autoStep(structuredClone(state)))autoRun=true; // am Ende automatisch ablegen
 },100);
 return {destroy(shouldPause=true){dead=true;abort.abort();clearInterval(timer);if(state){if(shouldPause&&state.status==='playing')state.paused=true;persist();}return {state,saveStatus,setup,draft};}};
}
