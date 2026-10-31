// Opt-in interaction primitives for UNO, Skip-Bo and Phase 10. No game rules or server state mutations.
'use strict';
window.CardInteraction=(()=>{
  const tx=(de,en)=>I18n.language==='en'?en:de;
  // Local to the three opt-in pilots; adding card terms does not translate other games.
  const terms={Rot:'Red',Gelb:'Yellow',Grün:'Green',Blau:'Blue',Schwarz:'Black',Pink:'Pink',Türkis:'Teal',Orange:'Orange',Lila:'Purple',Aussetzen:'Skip',Richtungswechsel:'Reverse','plus zwei':'Draw two',Farbwahl:'Wild','plus vier':'Draw four','plus eins':'Draw one','plus fünf':'Draw five','Farbwahl plus zwei':'Wild draw two',Flip:'Flip','Alle aussetzen':'Skip all','Zieh bis Farbe':'Draw until colour','Alle ablegen':'Discard all','plus sechs':'Draw six','plus zehn':'Draw ten','Richtung plus vier':'Reverse draw four',Farbroulette:'Colour roulette','Zwei aussetzen':'Double skip','Gezieltes plus zwei':'Targeted draw two','Hände tauschen':'Swap hands','Welche Farbe soll gelten?':'Which colour should apply?'};
  const term=(source)=>I18n.language==='en'?(terms[source]||I18n.t(source)):source;
  function context(S){
    const g=S.g||{},me=S.players.find((p)=>p.id===S.you?.id),partner=S.players.find((p)=>p.id===g.partner);
    const source=(p)=>p&&[p.stock,p.stockTop,p.piles,p.inRound,p.eliminated,p.laidDone];
    return JSON.stringify([S.code,S.game,S.variant,S.roundNo,S.phase,S.turnId,S.you?.id,S.gamePaused,g.hand,g.top,g.side,g.step,g.drawn,g.playable,g.pending,g.colorChoice,g.challenge,g.build,source(me),source(partner)]);
  }
  function tracker(){
    let signature='',epoch=0,records=[];
    return {update(S){
      const hand=S.g?.hand||[],next=JSON.stringify([S.code,S.game,S.variant,S.roundNo,S.you?.id,hand]);
      if(next!==signature){signature=next;epoch++;records=hand.map((card,index)=>({card,index,key:typeof card==='object'&&Number.isInteger(card.id)?`id:${card.id}`:typeof card==='string'&&card.includes('@')?`token:${card}`:`hand:${epoch}:${index}`}));}
      return records;
    },get records(){return records;},find(key){return records.find((r)=>r.key===key);}};
  }
  function gate(transport,changed,allowed,timeoutMs=12000){
    let busy=false,uncertain=false,error='',generation=0;
    return {get busy(){return busy||uncertain;},get uncertain(){return uncertain;},get error(){return error;},clear(){error='';},invalidate(){generation++;busy=false;uncertain=false;error='';},
      async run(event,data){
        if(busy||uncertain||!allowed())return {ok:false,blocked:true};const ticket=++generation;busy=true;error='';changed();let timer;
        try {
          const result=await Promise.race([transport(event,data),new Promise((resolve)=>{timer=setTimeout(()=>resolve({ok:false,uncertain:true,error:tx('Keine Bestätigung erhalten. Lade den aktuellen Spielstand, bevor du erneut handelst.','No confirmation received. Refresh the current game state before acting again.')}),timeoutMs);})]);
          if(ticket!==generation)return {ok:false,stale:true};
          if(result?.uncertain)uncertain=true;if(!result?.ok)error=result?.error||tx('Die Aktion wurde nicht bestätigt.','The action was not confirmed.');return result;
        }catch{if(ticket===generation)error=tx('Verbindung unterbrochen. Dein Spielstand wird erneut geladen.','Connection interrupted. Your game state will reload.');return {ok:false};}
        finally{clearTimeout(timer);if(ticket===generation){busy=false;changed();}}
      }};
  }
  // Reconcile keyed cards in place, preserving focus, scroll and the native drag source.
  const nodeKey=(n)=>n.nodeType===1?(n.getAttribute('data-card-key')||n.getAttribute('data-cix-node')||n.id&&`id:${n.id}`||n.hasAttribute('data-g')&&`action:${['g','i','id','kind','owner','group','end','side','wish','target','color'].map((k)=>n.dataset[k]||'').join(':')}`||null):null;
  const sameType=(a,b)=>a.nodeType===b.nodeType&&(a.nodeType!==1||a.localName===b.localName&&a.namespaceURI===b.namespaceURI);
  function sync(parent,fresh){
    const old=[...parent.childNodes],used=new Set(),keyed=new Map(old.map((n)=>[nodeKey(n),n]).filter(([k])=>k));let cursor=parent.firstChild;
    for(const next of [...fresh.childNodes]){
      const key=nodeKey(next);let node=key?keyed.get(key):old.find((n)=>!used.has(n)&&!nodeKey(n)&&sameType(n,next));
      if(node&&(!sameType(node,next)||used.has(node)))node=null;
      if(!node){node=next.cloneNode(true);parent.insertBefore(node,cursor);}else{
        used.add(node);if(node!==cursor)parent.insertBefore(node,cursor);
        if(node.nodeType===3){if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;}
        else if(node.nodeType===1&&!node.isEqualNode(next)){
          for(const a of [...node.attributes])if(!next.hasAttribute(a.name)&&a.name!=='draggable'&&!(a.name==='style'&&node.classList.contains('kc')))node.removeAttribute(a.name);
          for(const a of [...next.attributes])if(node.getAttribute(a.name)!==a.value)node.setAttribute(a.name,a.value);
          sync(node,next);
        }
      }
      cursor=node.nextSibling;
    }
    for(const node of old)if(!used.has(node)&&node.parentNode===parent)node.remove();
  }
  function patch(element,html){const template=document.createElement('template');template.innerHTML=html;sync(element,template.content);}
  function selection({label,html='',hint='',count=1}){
    return `<section class="cix-selection" data-cix-node="selection" aria-label="${esc(tx('Ausgewählte Karten','Selected cards'))}">${html?`<div class="cix-preview" aria-hidden="true">${html}</div>`:''}<div><b>${esc(label)}</b><p>${hint}</p></div><span class="cix-selection-count">${count}</span></section>`;
  }
  return {tx,term,context,tracker,gate,patch,selection};
})();
