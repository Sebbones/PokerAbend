// Gemeinsame Oberfläche der Arcade-Spiele (Geschenkfänger, Rhythmus-Rausch, Stillgestanden!, Bomben-Duell).
// Der Client zeigt nur Server-Frames an und sendet Eingaben. Zeitbasis ist die Serverzeit: frame.elapsed + Zeit seit Empfang.
// Gezeichnet wird mit requestAnimationFrame auf einem Canvas; der statische Hintergrund liegt einmal in einem Zwischenbild.
'use strict';
function arcadeGame(def) {
  const tx = (de, en) => I18n.content(de, en);
  const palette = ['#f4c95b', '#5fc8ee', '#ef8196', '#9bdb8d', '#bc9af4', '#ffa86b', '#75ddc1', '#e8e1c8'];
  const keys = new Set(), held = new Map(), flash = [0, 0, 0, 0];
  let frame = null, previous = null, received = 0, raf = 0, seq = 0, cmdSeq = 0, sentAt = 0, lastSig = '', canvas = null, resize = null, observed = null, bg = null, bgRun = '';
  const perf = window.ArcadePerf = window.ArcadePerf || { frames: 0, total: 0, max: 0 };
  const mine = () => session?.game === def.id && kit.S?.phase === 'playing';
  const active = () => mine() && !kit.S.gamePaused && !document.hidden && $('#kg-panel')?.hidden !== false && !document.querySelector('dialog[open]');
  const me = () => frame?.bodies.find((p) => p.id === kit.S?.you?.id);
  const person = (id) => kit.S.players.find((p) => p.id === id);
  // Geschätzte Serverzeit jetzt: bei Pause und Countdown wie im letzten Frame.
  const serverTime = (now) => frame ? frame.elapsed + (kit.S?.gamePaused ? 0 : Math.min(250, Math.max(0, now - received))) : 0;

  function cue(next, old) {
    const id = kit.S.you?.id, a = old?.bodies.find((p) => p.id === id), b = next.bodies.find((p) => p.id === id);
    let name = null;
    if (next.elapsed < 0 && old && Math.ceil(-next.elapsed / 1000) < Math.ceil(-old.elapsed / 1000)) name = 'countdown';
    else if (a && b) {
      if (next.kind === 'gift' || next.kind === 'rhythm') name = b.points > a.points ? 'crown' : b.points < a.points ? 'hit' : null;
      if (next.kind === 'freeze') name = b.hitAt > a.hitAt ? 'hit' : next.signal !== old.signal && next.signal !== 'green' ? 'warn' : null;
      if (next.kind === 'bomb') name = a.alive && !b.alive ? 'hit' : next.bombs.length > old.bombs.length ? 'warn' : null;
    }
    if (name) { GameDesign.sound(def.id, name); if (name === 'hit') GameDesign.pulse($('#kg'), 'hit'); }
  }
  function accept(next) {
    if (!next || next.game !== def.id || next.runId !== kit.S?.g?.runId) return;
    if (frame?.runId === next.runId && next.tick < frame.tick) return;
    if (frame?.runId !== next.runId) { keys.clear(); held.clear(); seq = 0; lastSig = ''; }
    previous = frame?.runId === next.runId ? frame : next;
    if (previous !== next && kit.S.phase === 'playing') cue(next, previous);
    frame = next; received = performance.now();
    updateLabels();
  }
  function updateLabels() {
    if (!frame) return;
    const state = $('#rt-state');
    if (state) state.textContent = frame.elapsed < 0 ? `${tx('Start in', 'Starting in')} ${Math.ceil(-frame.elapsed / 1000)}${frame.total > 1 ? ` · ${tx('Runde', 'Round')} ${frame.q + 1}/${frame.total}` : ''}` : kit.S.phase !== 'playing' ? tx('Runde beendet', 'Round finished') : !me()?.alive ? tx('Du schaust zu', 'You are watching') : def.state(frame, kit.S);
    const clock = $('#rt-time'); if (clock) clock.textContent = `${Math.max(0, Math.ceil((frame.duration - Math.max(0, frame.elapsed)) / 1000))} s`;
    for (const p of frame.bodies) {
      const row = document.querySelector(`[data-rt-player="${CSS.escape(p.id)}"]`);
      if (row) { row.textContent = `${p.alive ? def.row(p, frame) : tx('aus', 'out')} · ${p.points} ${tx('Pkt.', 'pts')}`; row.classList.toggle('rt-out', !p.alive); }
    }
    document.querySelectorAll('#kg-players .kp').forEach((row, i) => {
      const p = kit.S.players.filter((p) => p.seated)[i], body = frame.bodies.find((b) => b.id === p?.id), small = row.querySelector('.kp-txt small');
      if (body && small) small.textContent = `${body.points} ${tx('Pkt.', 'pts')}${body.alive ? '' : ' · ' + tx('ausgeschieden', 'eliminated')}`;
    });
  }

  // ----- Eingaben -----
  const emitBase = () => ({ runId: frame.runId, round: frame.round, ack: frame.tick });
  function vector() {
    const all = new Set([...keys, ...held.values()]);
    const v = { x: Number(all.has('right')) - Number(all.has('left')), y: Number(all.has('down')) - Number(all.has('up')) };
    if (frame?.kind === 'gift') v.y = 0;
    if (frame?.kind === 'freeze') { v.x = 0; v.y = all.has('up') ? -1 : 0; }
    return v;
  }
  function pump(force = false) {
    if (!mine() || kit.S.gamePaused || !frame || !me()?.alive || !kit.S.you?.inRound || frame.kind === 'rhythm') return;
    const now = performance.now(), v = active() ? vector() : { x: 0, y: 0 }, sig = `${v.x}:${v.y}`;
    if (!force && (now - sentAt < 120 || (sig === lastSig && now - sentAt < 200))) return;
    seq = Math.max(seq, kit.S.g?.inputSeq || 0) + 1;
    socket.emit('steer', { ...emitBase(), seq, ...v }, () => {});
    sentAt = now; lastSig = sig;
  }
  function command(event, extra) {
    if (!active() || !frame || !me()?.alive || !kit.S.you?.inRound || frame.elapsed < 0) return;
    cmdSeq = Math.max(cmdSeq, kit.S.g?.cmdSeq || 0) + 1;
    socket.emit(event, { ...emitBase(), seq: cmdSeq, ...extra }, () => {});
  }
  const tap = (lane) => { flash[lane] = performance.now(); command('arcTap', { lane, at: Math.round(serverTime(performance.now())) }); };
  const bomb = () => command('arcAct', {});
  function release() { keys.clear(); held.clear(); pump(true); }
  const dirKeys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  const laneKeys = { d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
  document.addEventListener('keydown', (e) => {
    if (!mine() || e.target.closest?.('input,textarea,select,dialog,.panel') || !active() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (frame?.kind === 'rhythm') {
      const lane = k in laneKeys ? laneKeys[k] : e.code === 'Space' && frame.lanes === 1 ? 0 : -1;
      if (lane >= 0) { e.preventDefault(); if (!e.repeat) tap(frame.lanes === 1 ? 0 : lane); }
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); if (frame?.kind === 'bomb') { if (!e.repeat) bomb(); } else if (frame?.kind === 'freeze' && !keys.has('up')) { keys.add('up'); pump(true); } return; }
    if (dirKeys[k]) { e.preventDefault(); if (!keys.has(dirKeys[k])) { keys.add(dirKeys[k]); pump(true); } }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ((e.code === 'Space' ? keys.delete('up') && frame?.kind === 'freeze' : dirKeys[k] && keys.delete(dirKeys[k]))) pump(true);
  });
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); else if (mine() && !raf) raf = requestAnimationFrame(loop); });
  socket.on('disconnect', () => { keys.clear(); held.clear(); });
  socket.on('arena', (next) => { if (session?.game === def.id) accept(next); });
  setInterval(pump, 80);

  // ----- Zeichnen -----
  function view(now) {
    const alpha = kit.S?.gamePaused ? 1 : Math.min(1, Math.max(0, (now - received) / 100));
    const bodies = frame.bodies.map((p, i) => { const old = previous?.bodies.find((b) => b.id === p.id) || p; return { ...p, i, x: old.x + (p.x - old.x) * alpha, y: old.y + (p.y - old.y) * alpha, prog: old.prog === undefined ? p.prog : old.prog + (p.prog - old.prog) * alpha }; });
    return { f: frame, prev: previous, t: serverTime(now), alpha, now, bodies, me: bodies.find((p) => p.id === kit.S.you?.id), S: kit.S, flash, name: (id) => person(id)?.name || '?', avatar: (id) => person(id)?.avatar || '', color: (i) => palette[i % palette.length], self: kit.S.you?.id };
  }
  function draw(now) {
    if (!canvas?.isConnected || !frame) return;
    const t0 = performance.now(), ctx = canvas.getContext('2d'), a = frame.arena;
    if (!bg || bgRun !== def.id) {
      bg = document.createElement('canvas'); bg.width = a.width; bg.height = a.height; bgRun = def.id;
      def.background(bg.getContext('2d'));
    }
    ctx.drawImage(bg, 0, 0);
    const v = view(now);
    def.paint(ctx, v);
    if (frame.elapsed < 0) {
      ctx.fillStyle = '#081a16ad'; ctx.fillRect(0, 0, a.width, a.height);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffe0a0'; ctx.font = 'bold 120px system-ui'; ctx.fillText(String(Math.ceil(-frame.elapsed / 1000)), a.width / 2, a.height / 2 + 40);
      if (frame.total > 1) { ctx.font = 'bold 34px system-ui'; ctx.fillText(`${tx('Runde', 'Round')} ${frame.q + 1} / ${frame.total}`, a.width / 2, a.height / 2 - 90); }
    }
    const spent = performance.now() - t0; perf.frames++; perf.total += spent; perf.max = Math.max(perf.max, spent);
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
    const style = getComputedStyle(main), gap = parseFloat(getComputedStyle(wrap).rowGap) || 0, banner = main.querySelector('.program-banner');
    const height = main.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - wrap.querySelector('.rt-head').offsetHeight - wrap.querySelector('.rt-scores').offsetHeight - gap * 2 - (banner ? banner.offsetHeight + (parseFloat(style.rowGap) || 0) : 0);
    canvas.style.width = `${Math.floor(Math.min(wrap.clientWidth, Math.max(90, height) * 1.5))}px`;
  }
  function bind() {
    canvas = $('#rt-canvas');
    const main = $('#kg-main');
    if (main !== observed) { resize?.disconnect(); observed = main; resize = new ResizeObserver(fit); if (main) resize.observe(main); }
    fit();
    if (canvas && !raf) raf = requestAnimationFrame(loop);
    const press = (button, fn, end) => {
      if (button.dataset.bound) return; button.dataset.bound = 'true';
      button.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!active() || !me()?.alive) return; button.setPointerCapture?.(e.pointerId); button.classList.add('is-down'); fn(e); });
      const up = (e) => { button.classList.remove('is-down'); end?.(e); };
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, up);
    };
    document.querySelectorAll('[data-arc-hold]').forEach((b) => press(b, (e) => { held.set(e.pointerId, b.dataset.arcHold); pump(true); }, (e) => { if (held.delete(e.pointerId)) pump(true); }));
    document.querySelectorAll('[data-arc-tap]').forEach((b) => press(b, () => tap(Number(b.dataset.arcTap))));
    document.querySelectorAll('[data-arc-act]').forEach((b) => press(b, bomb));
    updateLabels();
  }
  const dirButton = (d, icon, de, en) => `<button class="btn rt-dir rt-${d}" type="button" data-arc-hold="${d}" aria-label="${esc(tx(de, en))}">${icon}</button>`;
  function controls(S) {
    const kind = def.kind, lanes = S.g?.lanes || 4;
    if (kind === 'gift') return `<div class="rt-controls arc-two">${['left', 'right'].map((d) => `<button class="btn arc-big" type="button" data-arc-hold="${d}" aria-label="${esc(d === 'left' ? tx('Korb nach links', 'Basket left') : tx('Korb nach rechts', 'Basket right'))}">${d === 'left' ? '←' : '→'}</button>`).join('')}</div>`;
    if (kind === 'freeze') return `<div class="rt-controls"><button class="btn btn-brass arc-run" type="button" data-arc-hold="up" aria-label="${esc(tx('Laufen, gedrückt halten', 'Run, hold down'))}">▲ ${tx('Laufen', 'Run')}</button><p class="rt-keyhint">${tx('↑ / W / Leertaste halten', 'Hold ↑ / W / Space')}</p></div>`;
    if (kind === 'rhythm') return `<div class="rt-controls arc-lanes" style="--lanes:${lanes}">${Array.from({ length: lanes }, (_, i) => `<button class="btn arc-pad" type="button" data-arc-tap="${i}" aria-label="${esc(tx('Bahn', 'Lane'))} ${i + 1}"><b>${lanes === 1 ? '●' : 'DFJK'[i]}</b></button>`).join('')}</div>`;
    return `<div class="rt-controls"><div class="rt-pad" role="group" aria-label="${esc(tx('Bewegungssteuerung', 'Movement controls'))}">${dirButton('up', '↑', 'Nach oben', 'Up')}${dirButton('left', '←', 'Nach links', 'Left')}${dirButton('down', '↓', 'Nach unten', 'Down')}${dirButton('right', '→', 'Nach rechts', 'Right')}</div><button class="btn btn-brass rt-jump" type="button" data-arc-act aria-label="${esc(tx('Bombe legen', 'Place bomb'))}">💣 ${tx('Bombe', 'Bomb')}</button></div>`;
  }
  const title = () => tx(def.de, def.en);
  const kit = kitGame({
    id: def.id, get name() { return title(); }, ring: false, direction: false, roundWord: tx('Runde', 'Round'),
    get short() { return def.rules.map((r) => tx(r[0], r[1])); },
    get rules() { return `<h3>${esc(title())}</h3><ul>${def.rules.map((r) => `<li>${esc(tx(r[0], r[1]))}</li>`).join('')}</ul><p>${esc(tx(def.fair[0], def.fair[1]))}</p>`; },
    lobby() { return `<section class="arc-lobby" style="--arc-bg:${def.colors[0]};--arc-accent:${def.colors[1]}">${def.scene}<p class="arc-tag">${esc(def.tag)}</p><h2>${esc(title())}</h2><p>${esc(tx(def.brief[0], def.brief[1]))}</p><p>${tx('Tastatur und Touch · optionale Bots · gemeinsame Pause', 'Keyboard and touch · optional bots · shared pause')}</p></section>`; },
    onState(S) { seq = Math.max(seq, S.g?.inputSeq || 0); cmdSeq = Math.max(cmdSeq, S.g?.cmdSeq || 0); if (S.g) accept(S.g); if (S.gamePaused || S.phase !== 'playing') release(); },
    status: () => tx('Alle spielen gleichzeitig', 'Everyone plays simultaneously'),
    playerInfo: (p) => `${p.pts || 0} ${tx('Pkt.', 'pts')}${p.eliminated ? ' · ' + tx('ausgeschieden', 'eliminated') : ''}`,
    hint: (S) => S.you?.inRound ? tx(def.hint[0], def.hint[1]) : tx('Du schaust zu – beim nächsten Start kannst du mitspielen.', 'You are watching – you can join the next start.'),
    keepMain: (S) => !!$('#rt-canvas') && $('#rt-canvas').dataset.run === S.g?.runId && S.phase === 'playing',
    main(S) {
      const G = S.g;
      return `<section class="rt-wrap" aria-label="${esc(title())}"><div class="rt-head"><span class="rt-label">${esc(def.tag)}</span><b id="rt-state">${tx('Arena bereit', 'Arena ready')}</b><span id="rt-time"></span></div><canvas id="rt-canvas" width="900" height="600" data-run="${esc(G.runId)}" role="img" aria-label="${esc(tx(def.alt[0], def.alt[1]))}"></canvas><ul class="rt-scores">${G.bodies.map((p, i) => `<li style="--player:${palette[i % palette.length]}"><b>${esc(S.players.find((q) => q.id === p.id)?.name || '?')}${p.id === S.you?.id ? ' ' + tx('(du)', '(you)') : ''}</b><span data-rt-player="${esc(p.id)}"></span></li>`).join('')}</ul></section>`;
    },
    dock: controls,
    dockKey: (S) => `${S.phase}:${S.g?.runId}:${S.g?.lanes}:${S.you?.inRound}:${S.you?.playing}:${S.you?.isHost}:${S.players.filter((p) => p.seated).length}`,
    afterRender: bind,
  });
  return kit;
}

// Kleine Zeichenhilfen, von allen vier Spielen genutzt.
const ArcadeDraw = {
  token(ctx, p, v, y = p.y, r = 22) {
    ctx.save(); ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, r + 2, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = v.color(p.i); ctx.strokeStyle = p.id === v.self ? '#fff' : '#152523'; ctx.lineWidth = p.id === v.self ? 5 : 3;
    ctx.beginPath(); ctx.arc(p.x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = '26px system-ui'; ctx.fillStyle = '#152523'; ctx.fillText(v.avatar(p.id) || String(p.i + 1), p.x, y + 9);
    ctx.restore();
  },
  label(ctx, text, x, y, size = 22) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = `bold ${size}px system-ui`; ctx.lineWidth = 6; ctx.strokeStyle = '#13201c'; ctx.strokeText(text, x, y); ctx.fillStyle = '#fff'; ctx.fillText(text, x, y); ctx.restore();
  },
};
