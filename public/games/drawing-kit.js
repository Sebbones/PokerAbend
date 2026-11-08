// Gemeinsames Zeichenwerkzeug: normierte Vektoren, keine Bild-Uploads.
'use strict';
const DRAW_COLORS = ['#172b25', '#df493d', '#e8aa32', '#358856', '#368ad4', '#8954ba', '#ffffff'];
function drawingHTML(strokes, label = 'Zeichnung') {
  if (!strokes?.length) return I18n.html('<p class="draw-empty">Hier entsteht die Zeichnung …</p>');
  return `<svg class="draw-picture" viewBox="0 0 1000 650" role="img" aria-label="${esc(label)}"><rect width="1000" height="650" fill="#fff"/>${strokes.map((s) => {
    const points = s.points.map(([x, y]) => `${x},${y * .65}`).join(' ');
    return s.points.length === 1 ? `<circle cx="${s.points[0][0]}" cy="${s.points[0][1] * .65}" r="${s.size / 2}" fill="${esc(s.color)}"/>` : `<polyline points="${points}" fill="none" stroke="${esc(s.color)}" stroke-width="${s.size}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('')}</svg>`;
}

function drawingGame({ id, name, short, intro }) {
  const isChain = id === 'kritzelpost', isGuess = id === 'malen-raten';
  let draftKey = '', strokes = [], color = DRAW_COLORS[0], size = 8;
  let pointer = null, editor = null, timer = null, dirty = false, serial = 0;
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const currentKey = (S) => `${id}:${S.roundNo}:${S.g?.key}`;
  const sync = (S) => {
    const key = currentKey(S);
    if (key === draftKey) return;
    clearTimeout(timer); timer = null; pointer = null; dirty = false;
    draftKey = key; strokes = clone(S.g?.image || []); editor = null; serial++;
  };
  const valid = () => session?.game === id && !lastState?.gamePaused && lastState?.phase === 'playing' && currentKey(lastState) === draftKey;
  async function flush(done = false) {
    clearTimeout(timer); timer = null;
    if (!valid() || (!dirty && !done)) return;
    const savedSerial = serial, key = draftKey;
    const r = await send('drawing', { key: lastState.g.key, strokes: clone(strokes), done });
    if (r?.ok && key === draftKey && savedSerial === serial) dirty = false;
  }
  const changed = () => { dirty = true; serial++; clearTimeout(timer); timer = setTimeout(() => flush(), 450); };
  const paint = () => {
    const canvas = editor?.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 650);
    for (const s of strokes) {
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(s.points[0][0], s.points[0][1] * .65);
      if (s.points.length === 1) { ctx.arc(s.points[0][0], s.points[0][1] * .65, s.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else { s.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y * .65)); ctx.stroke(); }
    }
    const meter = editor.querySelector('.draw-meter');
    if (meter) meter.textContent = I18n.html`${strokes.length}/60 Striche · ${strokes.reduce((n, s) => n + s.points.length, 0)}/800 Punkte`;
  };
  const toolsHTML = () => I18n.html`<div class="draw-tools" role="group" aria-label="Zeichenwerkzeuge">
    ${DRAW_COLORS.map((c, i) => `<button type="button" class="draw-color" data-color="${c}" style="--ink:${c}" aria-label="${['Schwarz', 'Rot', 'Gelb', 'Grün', 'Blau', 'Violett', 'Radierer'][i]}" aria-pressed="${color === c}"></button>`).join('')}
    <label>Stiftstärke<select class="input" data-size aria-label="Stiftstärke">${[3, 8, 18, 36].map((n) => `<option value="${n}" ${size === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <button type="button" class="btn" data-undo>Rückgängig</button><button type="button" class="btn btn-ghost" data-clear>Leeren</button></div>`;
  const editorHTML = () => I18n.html`<section class="draw-editor" aria-label="Dein Zeichenbereich">${toolsHTML()}<canvas width="1000" height="650" aria-label="Zeichenfläche: mit Maus, Stift oder Finger zeichnen"></canvas><small class="draw-meter"></small><small>Mit Finger, Stift oder Maus zeichnen. Der Radierer malt weiß; Rückgängig entfernt den letzten Strich.</small></section>`;
  function bind(S) {
    sync(S);
    if (S.gamePaused && pointer !== null) { pointer = null; dirty = true; serial++; }
    if (!S.gamePaused && dirty && !timer) timer = setTimeout(() => flush(), 450);
    const progress = document.querySelector('#kg-main .pk-done');
    const players = S.players.filter((p) => p.inRound);
    if (progress) progress.textContent = I18n.html`${players.filter((p) => p.ready).length} von ${players.length} fertig`;
    if (pointer !== null) return;
    editor = document.querySelector('#kg-main .draw-editor');
    if (!editor) return;
    if (editor.dataset.bound) { paint(); return; }
    editor.dataset.bound = 'true';
    paint();
    editor.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => {
      color = button.dataset.color;
      editor.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    }));
    editor.querySelector('[data-size]').addEventListener('change', (e) => { size = Number(e.target.value); });
    editor.querySelector('[data-undo]').addEventListener('click', () => { strokes.pop(); changed(); paint(); });
    editor.querySelector('[data-clear]').addEventListener('click', async () => {
      const key = draftKey;
      if (!strokes.length || !await ask({ title: 'Zeichnung leeren?', text: 'Alle Striche dieser Zeichnung entfernen?', ok: 'Leeren', danger: true })) return;
      if (key !== draftKey || !valid()) return;
      strokes = []; changed(); paint();
    });
    const canvas = editor.querySelector('canvas');
    const point = (e) => { const rect = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1000, Math.round((e.clientX - rect.left) / rect.width * 1000))), Math.max(0, Math.min(1000, Math.round((e.clientY - rect.top) / rect.height * 1000)))]; };
    canvas.addEventListener('pointerdown', (e) => {
      if (pointer !== null || e.button !== 0 || !valid()) return;
      if (strokes.length >= 60 || strokes.reduce((n, s) => n + s.points.length, 0) >= 800) return toast('Zeichnung voll – nutze Rückgängig', true);
      pointer = e.pointerId; canvas.setPointerCapture(pointer);
      strokes.push({ color, size, points: [point(e)] }); paint(); e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointer || !valid()) return;
      const s = strokes.at(-1), p = point(e), prev = s.points.at(-1);
      if (s.points.length >= 100 || strokes.reduce((n, stroke) => n + stroke.points.length, 0) >= 800 || Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 7) return;
      s.points.push(p); paint();
    });
    const end = (e) => {
      if (e.pointerId !== pointer) return;
      pointer = null; changed(); kit.render();
    };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
  }
  const reveal = (S) => {
    const G = S.g;
    if (isChain) return `<div class="draw-chains">${(G.chains || []).map((chain) => I18n.html`<details open><summary>Kette von ${esc(pkName(S, chain.owner))}</summary><ol>${chain.pages.map((page) => `<li><b>${esc(pkName(S, page.author))}</b>${page.image ? drawingHTML(page.image) : `<p>${esc(page.text || 'Keine Beschreibung abgegeben')}</p>`}</li>`).join('')}</ol></details>`).join('')}</div>`;
    return `${drawingHTML(G.image)}${isGuess ? I18n.html`<h2 class="draw-solution">Gesucht: ${esc(G.prompt)}</h2><p>${(G.guessed || []).map((id) => esc(pkName(S, id))).join(', ') || 'Niemand'} hat richtig geraten.</p>` : I18n.html`<p>Gezeichnet von ${esc(pkName(S, G.artist))}</p><ol class="draw-results">${(G.results || []).map((row) => I18n.html`<li><b>${esc(row.text)}</b><span>${esc(pkName(S, row.id))} · ${row.votes} Stimmen · ${row.votes * 100} Punkte</span></li>`).join('')}</ol>`}`;
  };
  const kit = partyGame({
    id, name, short, intro, noBots: true, rules: `<h3>${esc(name)}</h3><ul>${short.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`,
    terms: { unit: I18n.t('Runde'), write: isGuess ? 'Zeichnen & Raten' : 'Beiträge', waitWrite: 'arbeitet …' },
    custom: isChain ? null : { help: 'Eigene Zeichenbegriffe, einer pro Zeile. Nur die zeichnende Person sieht den Begriff während der Runde.', example: 'Ein schlafender Drache\nFahrrad', noun: 'Begriff', plural: 'Begriffe' },
    // Den aktiven Zeichenbereich auch bei Updates anderer Spieler stehen lassen:
    // Fokus, Scrollposition und Pointer-Capture gehören zum laufenden Entwurf.
    keepMain: (S) => !!editor?.isConnected && currentKey(S) === draftKey && S.phase === 'playing' && S.g?.draw && (!S.g.ready || isGuess),
    hint(S) {
      const G = S.g;
      if (G.ready) return isGuess ? 'Richtig! Warte, bis die anderen fertig sind.' : 'Dein Beitrag ist abgegeben. Warte auf die anderen.';
      if (G.draw) return 'Zeichne ohne Buchstaben. Farben und Werkzeuge stehen über dem Bild.';
      if (G.stage === 'vote') return 'Wähle deine Lieblings-Bildunterschrift. Die eigene zählt nicht.';
      return G.canWrite ? isGuess ? 'Welcher Begriff ist gesucht? Deine Vermutungen sieht niemand sonst.' : isChain && G.step === 1 ? 'Schreib einen kurzen Begriff oder Satz für deine Kette.' : 'Beschreibe das Bild mit wenigen Worten.' : 'Du schaust zu – die Mitspieler arbeiten gerade.';
    },
    question(S) {
      const G = S.g;
      if (G.stage === 'reveal') return `<div class="pk-q"><h2>${isChain ? 'Eure Kritzelpost' : isGuess ? I18n.t('Auflösung') : 'Eure Bildunterschriften'}</h2></div>`;
      return `<div class="pk-q"><h2>${G.prompt ? esc(G.prompt) : G.stage === 'vote' ? 'Welche Bildunterschrift gefällt dir?' : isChain ? I18n.html`Kritzelpost · Schritt ${G.step || 1} von ${G.steps || 1}` : isGuess ? I18n.html`${esc(pkName(S, G.artist))} zeichnet` : G.step === 1 ? 'Eine Zeichnung entsteht' : 'Finde eine Bildunterschrift'}</h2>${G.previous?.text ? `<p>${esc(G.previous.text || 'Keine Vorlage')}</p>` : ''}${isGuess && G.mine && !G.ready && G.stage === 'write' ? I18n.html`<small>„${esc(G.mine)}“ ist noch nicht richtig. Versuch es erneut.</small>` : ''}</div>`;
    },
    board(S) {
      sync(S); const G = S.g;
      if (G.stage === 'vote') return `${drawingHTML(G.image)}<div class="draw-answers">${G.answers.map((a) => `<button class="btn ${G.myVote === a.i ? 'btn-brass' : ''}" data-g="draw-vote" data-choice="${a.i}" ${!G.canVote || a.mine ? 'disabled' : ''}>${esc(a.text)}${a.mine ? ' (deine)' : G.myVote === a.i ? ' ✓' : ''}</button>`).join('')}</div>`;
      if (G.draw && (!G.ready || isGuess)) return editorHTML();
      return `${G.previous?.image ? drawingHTML(G.previous.image, 'Vorlage zum Beschreiben') : !isChain ? drawingHTML(G.image) : ''}${G.ready ? I18n.html('<p class="pk-mine">✓ Beitrag abgegeben</p>') : ''}`;
    },
    reveal,
    writeForm(S) {
      const G = S.g;
      if (G.draw && (!G.ready || isGuess)) return isGuess ? I18n.html('<span class="waiting">Deine Zeichnung wird automatisch geteilt.</span>') : I18n.html('<button class="btn btn-brass" data-g="draw-done">Zeichnung abgeben</button>');
      if (!G.canWrite || G.ready) return '';
      return pkForm({ kind: 'answer', label: isGuess ? 'Deine Vermutung' : 'Dein Text', placeholder: isGuess ? 'Welcher Begriff ist das?' : 'Dein Begriff oder deine Beschreibung', value: isGuess ? '' : G.mine || '', button: isGuess ? 'Raten' : 'Abgeben', counter: !isGuess });
    },
    dockState: (S) => { const G = S.g || {}; return `${G.key}|${G.canWrite}|${G.draw}|${G.ready}|${G.mine || ''}`; },
    submit: (_kind, text) => send('answer', { key: lastState.g.key, text }),
    onClick(el, S) {
      if (el.dataset.g === 'draw-done') flush(true);
      if (el.dataset.g === 'draw-vote') send('vote', { key: S.g.key, choice: Number(el.dataset.choice) });
    },
    afterRender: bind,
  });
  return kit;
}
