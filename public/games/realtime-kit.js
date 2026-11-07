// Kleine Server-Frames werden interpoliert; kein DOM-Neubau pro Bewegungsbild.
'use strict';
function realtimeGame(def) {
  const palette = ['#f4c95b', '#5fc8ee', '#ef8196', '#9bdb8d', '#bc9af4', '#ffa86b', '#75ddc1', '#e8e1c8'];
  const keys = new Set(), held = new Map();
  let frame = null, previous = null, received = 0, raf = 0, seq = 0, sentAt = 0, lastVector = '', jump = false, canvas = null, resize = null, observed = null;
  const mine = () => session?.game === def.id && kit.S?.phase === 'playing';
  const active = () => mine() && !kit.S.gamePaused && !document.hidden && $('#kg-panel')?.hidden !== false && !document.querySelector('dialog[open]');
  const me = () => frame?.bodies.find((p) => p.id === kit.S?.you?.id);
  function accept(next) {
    if (!next || next.game !== def.id || next.runId !== kit.S?.g?.runId) return;
    if (frame?.runId === next.runId && next.tick < frame.tick) return;
    if (frame?.runId !== next.runId) { keys.clear(); held.clear(); seq = 0; lastVector = ''; jump = false; }
    previous = frame?.runId === next.runId ? frame : next;
    if (previous !== next && next.tick > previous.tick && kit.S.phase === 'playing') {
      const oldMe = previous.bodies.find((p) => p.id === kit.S.you?.id);
      const newMe = next.bodies.find((p) => p.id === kit.S.you?.id);
      const cue = oldMe?.alive && newMe && (!newMe.alive || newMe.lives < oldMe.lives) ? 'hit'
        : next.hazards?.some((h) => h.warning && !previous.hazards.some((old) => old.id === h.id)) ? 'warn'
        : next.crown?.holder && next.crown.holder !== previous.crown?.holder ? 'crown'
        : newMe && oldMe && newMe.jumpUntil > oldMe.jumpUntil ? 'jump'
        : next.elapsed < 0 && Math.ceil(-next.elapsed / 1000) < Math.ceil(-previous.elapsed / 1000) ? 'countdown' : null;
      if (cue) {
        GameDesign.sound(def.id, cue);
        if (cue === 'hit' || cue === 'warn') GameDesign.pulse($('#kg'), cue);
      }
    }
    frame = next; received = performance.now();
    updateLabels();
  }
  function updateLabels() {
    if (!frame) return;
    const state = $('#rt-state');
    if (state) state.textContent = def.state ? def.state(frame,kit.S) : frame.elapsed < 0 ? I18n.html`Start in ${Math.ceil(-frame.elapsed / 1000)} …` : kit.S.phase !== 'playing' ? 'Runde beendet' : frame.kind === 'laser' && frame.hazards.some((h) => h.warning) ? 'Laser angekündigt – Sprung vorbereiten' : !me()?.alive ? I18n.t('Du schaust zu') : 'Die Arena ist frei';
    const clock = $('#rt-time'); if (clock) clock.textContent = I18n.html`${Math.max(0, Math.ceil((frame.duration - Math.max(0, frame.elapsed)) / 1000))} s`;
    for (const p of frame.bodies) {
      const row = document.querySelector(I18n.html`[data-rt-player="${p.id}"]`);
      if (row) { row.textContent = I18n.html`${p.alive ? frame.kind === 'laser' ? '♥'.repeat(p.lives) : '●' : 'aus'} · ${p.points} Pkt.${frame.crown?.holder === p.id ? ' · ♛' : ''}`; row.classList.toggle('rt-out', !p.alive); }
    }
    const button = document.querySelector('[data-rt-jump]');
    if (button) { button.disabled = !me()?.alive || frame.elapsed < 0; button.textContent = (me()?.jumpReady || 0) > frame.elapsed ? 'Lädt …' : 'Springen'; }
    // Die kompakte Spielerleiste bleibt auch ohne vollständige Zustandsupdates aktuell.
    document.querySelectorAll('#kg-players .kp').forEach((row, i) => {
      const p = kit.S.players.filter((p) => p.seated)[i];
      const body = frame.bodies.find((b) => b.id === p?.id);
      const small = row.querySelector('.kp-txt small');
      if (body && small) small.textContent = I18n.html`${body.points} Pkt.${body.alive ? '' : ' · ausgeschieden'}`;
    });
  }
  function vector() {
    const all = new Set([...keys, ...held.values()]);
    return { x: Number(all.has('right')) - Number(all.has('left')), y: Number(all.has('down')) - Number(all.has('up')) };
  }
  function pump(force = false) {
    if (!mine() || kit.S.gamePaused || !frame || !me()?.alive || !kit.S.you?.inRound) return;
    const now = performance.now(), v = active() ? vector() : { x: 0, y: 0 }, signature = `${v.x}:${v.y}`;
    if (!force && (now - sentAt < 160 || signature === lastVector && !jump && now - sentAt < 220)) return;
    seq = Math.max(seq, kit.S.g?.inputSeq || 0) + 1;
    socket.emit('steer', { runId: frame.runId, round: frame.round, seq, ...v, jump: active() && jump }, () => {});
    jump = false; sentAt = now; lastVector = signature;
  }
  function release() { keys.clear(); held.clear(); jump = false; pump(true); }
  const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', W: 'up', a: 'left', A: 'left', s: 'down', S: 'down', d: 'right', D: 'right' };
  document.addEventListener('keydown', (e) => {
    if (!mine() || e.target.closest?.('input,textarea,select,dialog,.panel') || !active()) return;
    if (keyMap[e.key]) { e.preventDefault(); if (!keys.has(keyMap[e.key])) { keys.add(keyMap[e.key]); pump(true); } }
    else if (e.code === 'Space' && frame?.jumping) { e.preventDefault(); if (!e.repeat) { jump = true; pump(true); } }
  });
  document.addEventListener('keyup', (e) => { if (keyMap[e.key] && keys.delete(keyMap[e.key])) pump(true); });
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); else if (mine() && !raf) raf = requestAnimationFrame(loop); });
  socket.on('disconnect', () => { keys.clear(); held.clear(); jump = false; });
  socket.on('arena', (next) => { if (session?.game === def.id) accept(next); });
  setInterval(pump, 80);

  function draw(now) {
    if (!canvas?.isConnected || !frame) return;
    const ctx = canvas.getContext('2d'), a = frame.arena;
    const alpha = kit.S?.gamePaused ? 1 : Math.min(1, Math.max(0, (now - received) / 100));
    ctx.clearRect(0, 0, a.width, a.height);
    ctx.fillStyle = frame.kind === 'floor' ? '#291d22' : frame.kind === 'crown' ? '#231c3d' : '#0e2430'; ctx.fillRect(0, 0, a.width, a.height);
    if (def.paint) def.paint(ctx,frame,kit.S);
    else if (frame.kind === 'floor') {
      frame.tiles.forEach((time, i) => {
        const x = i % a.cols * a.tile, y = Math.floor(i / a.cols) * a.tile;
        if (time === -1) { ctx.fillStyle = '#bb503842'; ctx.fillRect(x + 13, y + 13, a.tile - 26, a.tile - 26); return; }
        ctx.fillStyle = time > 0 ? time - frame.elapsed < 400 ? '#a3583d' : '#ab874d' : (i + Math.floor(i / a.cols)) % 2 ? '#597563' : '#486451';
        ctx.fillRect(x + 2, y + 2, a.tile - 4, a.tile - 4);
        ctx.strokeStyle = '#d0dfb936'; ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 4, a.tile - 8, a.tile - 8);
        if (time > 0) { ctx.strokeStyle = '#342b22'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 10, y + 2); ctx.lineTo(x + 33, y + 25); ctx.lineTo(x + 18, y + 45); ctx.lineTo(x + 44, y + 58); ctx.stroke(); }
      });
    } else {
      ctx.strokeStyle = '#ffffff0e'; ctx.lineWidth = 1;
      for (let x = 0; x <= a.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, a.height); ctx.stroke(); }
      for (let y = 0; y <= a.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(a.width, y); ctx.stroke(); }
      ctx.strokeStyle = '#ffffff38'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, a.width - 8, a.height - 8);
    }
    if (frame.kind === 'laser') for (const h of frame.hazards) {
      const prev = previous?.hazards?.find((p) => p.id === h.id);
      const pos = h.warning ? h.dir === 1 ? 12 : h.length - 12 : prev && !prev.warning ? prev.pos + (h.pos - prev.pos) * alpha : h.pos;
      ctx.save(); ctx.strokeStyle = h.warning ? '#ffe18b' : '#ff586d'; ctx.lineWidth = h.warning ? 5 : 12;
      ctx.setLineDash(h.warning ? [18, 14] : []); ctx.shadowColor = '#ff5369'; ctx.shadowBlur = h.warning ? 0 : 20;
      ctx.beginPath(); if (h.axis === 'x') { ctx.moveTo(pos, 0); ctx.lineTo(pos, a.height); } else { ctx.moveTo(0, pos); ctx.lineTo(a.width, pos); } ctx.stroke(); ctx.restore();
    }
    const bodies = frame.bodies.map((p) => {
      const old = previous?.bodies.find((b) => b.id === p.id) || p;
      return { ...p, x: old.x + (p.x - old.x) * alpha, y: old.y + (p.y - old.y) * alpha };
    });
    if (frame.crown && !frame.crown.holder) { ctx.fillStyle = '#ffdb74'; ctx.font = '48px system-ui'; ctx.textAlign = 'center'; ctx.fillText('♛', frame.crown.x, frame.crown.y + 16); }
    bodies.forEach((p, i) => {
      if (!p.alive) return;
      const person = kit.S.players.find((player) => player.id === p.id);
      const t = frame.elapsed - (p.jumpUntil - 550), height = t >= 0 && t < 550 ? Math.sin(t / 550 * Math.PI) * 35 : 0;
      ctx.save(); ctx.globalAlpha = p.immuneUntil > frame.elapsed ? .65 : 1;
      ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette[i % palette.length]; ctx.strokeStyle = p.id === kit.S.you?.id ? '#fff' : '#152523'; ctx.lineWidth = p.id === kit.S.you?.id ? 5 : 3;
      ctx.beginPath(); ctx.arc(p.x, p.y - height, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = '28px system-ui'; ctx.fillStyle = '#152523'; ctx.fillText(person?.avatar || String(i + 1), p.x, p.y + 10 - height);
      ctx.font = 'bold 25px system-ui'; ctx.lineWidth = 7; ctx.strokeStyle = '#13201c'; ctx.strokeText(person?.name || '?', p.x, Math.max(26, p.y - 34 - height)); ctx.fillStyle = '#fff'; ctx.fillText(person?.name || '?', p.x, Math.max(26, p.y - 34 - height));
      if (frame.crown?.holder === p.id) { ctx.font = '44px system-ui'; ctx.fillStyle = '#ffdb74'; ctx.fillText('♛', p.x, p.y - 58); }
      ctx.restore();
    });
    if (frame.elapsed < 0) {
      ctx.fillStyle = '#081a16ad'; ctx.fillRect(0, 0, a.width, a.height);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffe0a0'; ctx.font = 'bold 120px system-ui'; ctx.fillText(String(Math.ceil(-frame.elapsed / 1000)), a.width / 2, a.height / 2 + 40);
    }
  }
  function loop(now) {
    raf = 0;
    if (session?.game !== def.id || document.hidden) return;
    draw(now);
    if (kit.S?.phase === 'playing') raf = requestAnimationFrame(loop);
  }
  function fit() {
    const main = $('#kg-main'), wrap = main?.querySelector('.rt-wrap');
    if (!main || !wrap || !canvas?.isConnected) return;
    const style = getComputedStyle(main), gap = parseFloat(getComputedStyle(wrap).rowGap) || 0;
    const banner = main.querySelector('.program-banner');
    const height = main.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - wrap.querySelector('.rt-head').offsetHeight - wrap.querySelector('.rt-scores').offsetHeight - gap * 2 - (banner ? banner.offsetHeight + (parseFloat(style.rowGap) || 0) : 0);
    canvas.style.width = I18n.html`${Math.floor(Math.min(wrap.clientWidth, Math.max(90, height) * 1.5))}px`;
  }
  function bind() {
    canvas = $('#rt-canvas');
    const main = $('#kg-main');
    if (main !== observed) { resize?.disconnect(); observed = main; resize = new ResizeObserver(fit); if (main) resize.observe(main); }
    fit();
    if (canvas && !raf) raf = requestAnimationFrame(loop);
    document.querySelectorAll('[data-rt-dir]').forEach((button) => {
      if (button.dataset.bound) return; button.dataset.bound = 'true';
      button.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!active() || !me()?.alive) return; button.setPointerCapture(e.pointerId); held.set(e.pointerId, button.dataset.rtDir); pump(true); });
      const end = (e) => { if (held.delete(e.pointerId)) pump(true); };
      button.addEventListener('pointerup', end); button.addEventListener('pointercancel', end); button.addEventListener('lostpointercapture', end);
    });
    const jumpButton = document.querySelector('[data-rt-jump]');
    if (jumpButton && !jumpButton.dataset.bound) { jumpButton.dataset.bound = 'true'; jumpButton.addEventListener('click', () => { jump = true; pump(true); }); }
    const stop = document.querySelector('[data-rt-stop]');
    if (stop && !stop.dataset.bound) { stop.dataset.bound = 'true'; stop.addEventListener('click', release); }
    updateLabels();
  }
  const controls = (S) => I18n.html`<div class="rt-controls"><div class="rt-pad" role="group" aria-label="Bewegungssteuerung">${[['up', '↑', 'oben'], ['left', '←', 'links'], ['down', '↓', 'unten'], ['right', '→', 'rechts']].map(([dir, icon, label]) => I18n.html`<button class="btn rt-dir rt-${dir}" type="button" data-rt-dir="${dir}" aria-label="Nach ${label} bewegen">${icon}</button>`).join('')}<button class="btn rt-stop" type="button" data-rt-stop aria-label="Bewegung stoppen">●</button></div>${S.g?.jumping ? I18n.html('<button class="btn btn-brass rt-jump" type="button" data-rt-jump>Springen</button>') : I18n.html('<p class="rt-keyhint">Pfeiltasten / WASD<br>Richtung halten zum Bewegen</p>')}</div>`;
  const kit = kitGame({
    id: def.id, get name(){return def.name;}, ring: false, direction: false, roundWord: I18n.t('Runde'), get short(){return def.short;}, intro: def.intro, lobby:def.lobby,
    get rules(){return def.rules || I18n.html`<h3>${uiText(def.name)}</h3><ul>${def.short.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><p>Pfeiltasten oder WASD zum Bewegen; Richtungsknöpfe am Handy halten. Leertaste oder Sprungknopf zum Springen. Bei Tabwechsel oder fehlenden Eingaben bleibt die Figur stehen; die Runde läuft weiter.</p>`;},
    onState(S) { seq = Math.max(seq, S.g?.inputSeq || 0); if (S.g) accept(S.g); if (S.gamePaused || S.phase !== 'playing') release(); },
    status: () => 'Alle spielen gleichzeitig',
    playerInfo: (p) => I18n.html`${p.pts || 0} Pkt.${p.eliminated ? ' · ausgeschieden' : ''}`,
    hint: (S) => S.you?.inRound ? def.hint : I18n.t('Du schaust zu – beim nächsten Start kannst du mitspielen.'),
    keepMain: (S) => !!$('#rt-canvas') && $('#rt-canvas').dataset.run === S.g?.runId && S.phase === 'playing',
    main(S) {
      const G = S.g;
      return I18n.html`<section class="rt-wrap" aria-label="${uiText(def.name)} Arena"><div class="rt-head"><span class="rt-label">${esc(def.tag)}</span><b id="rt-state">Arena bereit</b><span id="rt-time"></span></div><canvas id="rt-canvas" width="900" height="600" data-run="${esc(G.runId)}" role="img" aria-label="Gemeinsames Spielfeld. Deine Figur hat einen weißen Rand. Status und Punkte stehen unter dem Feld."></canvas><ul class="rt-scores">${G.bodies.map((p, i) => `<li style="--player:${palette[i % palette.length]}"><b>${esc(S.players.find((person) => person.id === p.id)?.name || '?')}${p.id === S.you?.id ? ' (du)' : ''}</b><span data-rt-player="${p.id}"></span></li>`).join('')}</ul></section>`;
    },
    dock: controls,
    dockKey: (S) => `${S.phase}:${S.g?.runId}:${S.you?.inRound}:${S.you?.playing}:${S.you?.isHost}:${S.players.filter((p) => p.seated).length}`,
    afterRender: bind,
  });
  return kit;
}
