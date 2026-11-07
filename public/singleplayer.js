// Bridge between the classic hub and isolated ESM game views. No sockets or public score submission.
'use strict';
window.Singleplayer=(()=>{
  const ids=['sudoku','2048','wellenwacht','snake','memory','minesweeper','nonogramm','sokoban','block-puzzle','solitaire','mahjong-solitaire','match-3'],puzzles=['block-puzzle','solitaire','mahjong-solitaire','match-3'],memory=new Map();let current=null,generation=0,pending=null;
  function leave(next=''){
    generation++;pending=null;
    if(current){memory.set(current.id,current.view.destroy(next!==current.id));current=null;}
  }
  async function mount(root,id){
    if(!ids.includes(id))return;const token=++generation;pending=id;
    try {
      const {mount}=await import(['sudoku','2048','wellenwacht'].includes(id)?'/singleplayer/runtime.js':puzzles.includes(id)?'/singleplayer/puzzles-runtime.js':'/singleplayer/collection-runtime.js');
      if(token!==generation||!root.isConnected)return;
      const view=mount(root,id,memory.get(id),{tx:(de,en)=>I18n.content(de,en),esc,preferences:()=>UITheme.preferences(),calm:()=>motionOff(),recent:()=>markPlayed(id)});
      current={id,view};pending=null;
    }catch{if(token===generation){root.textContent=I18n.content('Das Spiel konnte nicht geladen werden. Bitte lade die Seite neu.','The game could not load. Please reload the page.');pending=null;}}
  }
  const hasSave=(id)=>{try{return ids.includes(id)&&!!localStorage.getItem(`poker:singleplayer:${id}`);}catch{return false;}};
  return {ids,mount,leave,hasSave,get active(){return current?.id||pending;}};
})();
