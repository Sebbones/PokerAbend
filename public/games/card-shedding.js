// Safe two-step adapter. Only games explicitly passing cardUX opt in; Mau-Mau keeps its existing controls.
'use strict';
function kitSafeShedding(opts){
  const tx=CardInteraction.tx;let selectedKey=null,wishFor=null,targetFor=null,chosenTarget=null,callArmed=false;
  const clear=()=>{selectedKey=null;wishFor=null;targetFor=null;chosenTarget=null;callArmed=false;};
  const selected=()=>kit.cards().find((r)=>r.key===selectedKey);
  const legal=(S,r)=>!!(r&&S.phase==='playing'&&S.turnId===S.you?.id&&!S.gamePaused&&!S.g.colorChoice&&!S.g.challenge&&S.g.playable.includes(r.card));
  async function play(S,wish=null){
    const r=selected();if(!legal(S,r))return;
    if(opts.needsTarget?.(r.card,S)&&!chosenTarget){targetFor=r.card;wishFor=null;kit.render();return;}
    if(opts.needsWish(r.card,S)&&!wish){wishFor=r.card;targetFor=null;kit.render();return;}
    const key=selectedKey,result=await kit.command('play',{card:r.card,wish,call:callArmed,target:chosenTarget});
    if(result?.ok&&selectedKey===key)clear();kit.render();
  }
  const kit=kitGame({
    id:opts.id,name:opts.name,cardUX:true,ring:opts.ring,lobby:opts.lobby,house:opts.house,sort:opts.sort,prefs:opts.prefs,translate:opts.translate,intro:opts.intro,resultExtra:opts.resultExtra,afterRender:opts.afterRender,
    get rules(){return opts.rules;},get short(){return opts.short;},
    look:(S)=>[{title:I18n.t('Zuletzt gelegt'),html:lookMoves(S.moves,{filter:(m)=>/^legt /.test(m.t),n:10})}],moveDetail:()=>'',
    playerInfo:(p)=>I18n.html`${p.cards} Karten`,seat:(p,S)=>opts.seat?.(p,S),onClear:clear,
    onState(S,prev){if(!prev||CardInteraction.context(S)!==CardInteraction.context(prev))clear();opts.onState?.(S,prev);},
    hint(S,mine){
      if(targetFor)return tx('Ziel wählen: Wer soll die Aktion erhalten?','Choose a target: who receives the action?');
      if(wishFor||mine&&S.g.colorChoice)return CardInteraction.term(opts.wishLabel);
      if(mine&&(S.g.colorChoice||S.g.challenge)){const special=opts.specialHint?.(S,mine);if(special)return special;}
      if(S.g?.forgot===S.you?.id)return tx('UNO vergessen – hole die Ansage jetzt nach.','Forgot UNO — make the call now.');
      if(S.g?.forgot)return `${esc(S.players.find((p)=>p.id===S.g.forgot)?.name||'')} ${tx('hat UNO vergessen – du kannst „Erwischt!“ wählen.','forgot UNO — you may choose “Caught!”.')}`;
      if(!mine)return `${esc(S.players.find((p)=>p.id===S.turnId)?.name||'')} ${tx('ist dran','is on turn')}`;
      const r=selected();if(r)return legal(S,r)?tx('Karte ausgewählt – „Ausspielen“ oder die Ablage wählen.','Card selected — choose “Play” or the discard pile.'):tx('Diese Karte passt gerade nicht. Wähle eine andere Karte.','This card cannot be played now. Choose another card.');
      const special=opts.specialHint?.(S,mine);if(special)return special;
      if(S.g.drawn)return S.g.playable.length?tx('Gezogene Karte auswählen und bestätigen – oder weitergeben.','Select and confirm the drawn card — or pass.'):tx('Die gezogene Karte passt nicht. Gib den Zug weiter.','The drawn card does not fit. Pass your turn.');
      if(S.g.pending)return tx(`Zieh ${S.g.pending} Karten oder wähle eine erlaubte Antwort.`,`Draw ${S.g.pending} cards or select a permitted response.`);
      return S.g.playable.length?tx('Karte auswählen. Erst die Bestätigung spielt sie aus.','Select a card. Only confirmation plays it.'):tx('Keine Karte passt – zieh eine Karte.','No card fits — draw a card.');
    },
    main(S){
      const g=S.g,r=selected(),can=legal(S,r),wishBig=g.wish&&opts.wishBadge?I18n.html`<div class="kg-pile kg-wish" role="status"><div class="kg-wish-badge">${opts.wishBadge(g.wish)}</div><small>Gewünscht: <b>${esc(opts.wishName(g.wish))}</b></small></div>`:'';
      return I18n.html`<div class="kg-table">${opts.tableIntro?.(S)||''}<div class="kg-piles"><div class="kg-pile">${opts.backCard?opts.backCard(g.deck,S):backCard(g.deck)}<small>Stapel</small></div><div class="kg-pile kg-discard ${opts.pileClass?.(g)||''} ${can?'cix-target':''}" data-drop="discard">${g.top?opts.card(g.top,{cls:'big',attrs:'disabled'},S):''}${g.pending?`<span class="kg-penalty">+${g.pending}</span>`:''}${can?`<button type="button" class="cix-discard-button" data-g="play-selected" aria-label="${tx('Ausgewählte Karte hier ausspielen','Play selected card here')}"><span>${tx('Hier ausspielen','Play here')}</span></button>`:''}<small>Ablage</small></div>${wishBig}</div><div class="kg-chips">${g.pending?`<div class="kg-chip warn">${esc(opts.pendingText(g))}</div>`:''}${g.wish&&!opts.wishBadge?`<div class="kg-chip">${esc(opts.wishName(g.wish))}</div>`:''}</div>${opts.extraMain?.(S)||''}</div>`;
    },
    dock(S,mine){
      const g=S.g,r=selected(),can=legal(S,r),hand=kit.cards().map(({card:c,key})=>opts.card(c,{cls:`${mine&&g.playable.includes(c)?'can':''} ${selectedKey===key?'sel cix-selected':''}`,attrs:`data-g="card" data-card="${esc(c)}" data-card-key="${esc(key)}" aria-pressed="${selectedKey===key}" ${mine&&g.playable.includes(c)?`data-drag="${esc(key)}"`:''} ${mine?'':'disabled'}`},S)).join('');
      let acts='';
      if(mine&&targetFor)acts=S.players.filter((p)=>p.inRound&&p.id!==S.you.id&&!p.eliminated).map((p)=>`<button type="button" class="btn" data-g="target" data-target="${esc(p.id)}">${esc(p.name)} · ${p.cards} ${tx('Karten','cards')}</button>`).join('');
      else if(mine&&wishFor){const wishes=typeof opts.wishes==='function'?opts.wishes(S):opts.wishes;acts=`<div class="kg-wishes" role="group" aria-label="${esc(CardInteraction.term(opts.wishLabel))}">${wishes.map(([v,label,cls])=>`<button type="button" class="btn wish ${cls}" data-g="wish" data-wish="${v}">${I18n.t(label)}</button>`).join('')}</div>`;}
      else if(mine){
        acts=`<button type="button" class="btn btn-brass" data-g="play-selected" ${can?'':'disabled'}>${tx('Ausspielen','Play card')}</button>`;
        acts+=g.drawn?(g.mustPlay?`<span class="hint">${tx('Gezogene Karte bestätigen','Confirm the drawn card')}</span>`:I18n.html('<button type="button" class="btn" data-g="pass">Weiter</button>')):`<button type="button" class="btn" data-g="draw" ${g.mustPlay&&!g.pending&&g.playable.length?'disabled':''}>${g.pending?tx(`${g.pending} Karten ziehen`,`Draw ${g.pending} cards`):I18n.t('Karte ziehen')}</button>`;
      }
      if(mine&&g.callNeeded&&(g.hand||[]).length===2)acts+=`<button type="button" class="btn btn-call ${callArmed?'armed':''}" data-g="call" aria-pressed="${callArmed}">${callArmed?'✓ ':''}${opts.lastWord}</button>`;
      if(mine)acts+=`<button type="button" class="btn btn-ghost" data-g="clear-selection" ${selectedKey?'':'disabled'}>${tx('Auswahl aufheben','Clear selection')}</button>`;
      if(g.forgot===S.you?.id)acts=`<button type="button" class="btn btn-call" data-g="late">${opts.lastWord}</button>`+acts;
      else if(g.forgot)acts=`<button type="button" class="btn btn-call catch" data-g="catch">${tx('Erwischt!','Caught!')} (${esc(S.players.find((p)=>p.id===g.forgot)?.name||'')})</button>`+acts;
      acts=opts.specialDock?.(S,mine)??acts;
      const summary=r?CardInteraction.selection({label:opts.cardLabel(r.card),html:opts.card(r.card,{attrs:'disabled tabindex="-1"'},S),hint:can?tx('Auswahl ist noch kein Zug. Bestätige die Aktion.','Selection is not a move. Confirm the action.'):tx('Zurzeit nicht spielbar.','Not playable at the moment.')}):'';
      return `${summary}<div class="kg-hand" data-cix-node="hand" role="group" aria-label="${I18n.t('Deine Karten')}">${hand}</div><div class="kg-acts" data-cix-node="actions">${acts}</div>`;
    },
    onDragStart(src){selectedKey=src.dataset.cardKey;wishFor=null;targetFor=null;chosenTarget=null;},
    canDrop(src,z,S){return z.dataset.drop==='discard'&&legal(S,kit.cards().find((r)=>r.key===src.dataset.cardKey));},
    onDrop(src,z,S){selectedKey=src.dataset.cardKey;play(S);},
    onClick(t,S){
      if(opts.onClick?.(t,S,kit.command))return;
      const action=t.dataset.g;
      if(action==='card'){selectedKey=selectedKey===t.dataset.cardKey?null:t.dataset.cardKey;wishFor=null;targetFor=null;chosenTarget=null;kit.render();}
      else if(action==='play-selected')play(S);
      else if(action==='target'){chosenTarget=t.dataset.target;targetFor=null;play(S);}
      else if(action==='wish')play(S,t.dataset.wish);
      else if(action==='clear-selection'||action==='nowish'){clear();kit.render();}
      else if(action==='call'){callArmed=!callArmed;kit.render();}
      else if(['draw','pass','catch','late'].includes(action))kit.command(action);
    },
  });
  return kit;
}
