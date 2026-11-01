// Small helpers for the new backlog games; existing game renderers keep their controls.
'use strict';
window.BacklogKit=(()=>{
  const tx=(de,en)=>I18n.language==='en'?en:de;
  function commands(id,getKit,allowed=()=>true){
    let fresh=socket.connected;
    const active=()=>session?.game===id;
    const render=()=>{if(active())getKit()?.render();};
    const gate=CardInteraction.gate(send,render,()=>{const S=getKit()?.S;return !!(active()&&fresh&&socket.connected&&S&&!S.gamePaused&&S.phase==='playing'&&allowed(S));});
    socket.on('disconnect',()=>{if(active()){fresh=false;gate.invalidate();render();}});
    socket.on('state',(S)=>{if(active()&&S.game===id){const reconnecting=!fresh;fresh=true;if(reconnecting)render();}});
    return {get busy(){return gate.busy;},run:(event,data)=>gate.run(event,data),
      refresh(){socket.disconnect();socket.connect();},
      blocked(S){return !fresh||!socket.connected||S.gamePaused||gate.busy;},
      notice(){return `<div class="bg-feedback" role="status" aria-live="polite">${!fresh||!socket.connected?tx('Verbindung wird wiederhergestellt …','Reconnecting …'):gate.busy?tx('Warte auf Serverbestätigung …','Waiting for server confirmation …'):''}</div>${gate.error?`<p class="bg-error" role="alert">${esc(I18n.t(gate.error))}${gate.uncertain?` <button type="button" class="btn" data-g="refresh-state">${tx('Spielstand neu laden','Refresh game state')}</button>`:''}</p>`:''}`;}};
  }
  const name=(S,id)=>esc(S.players.find((p)=>p.id===id)?.name||'?');
  return {tx,commands,name};
})();
