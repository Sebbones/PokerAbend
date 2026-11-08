'use strict';
{
  let data = null, zoom = 1, viewport = null, observer = null, animatedMove = 0, animatedSpin = 0;
  const colors = ['#da6553', '#4b95bd', '#d2a73d', '#72a168', '#a37aba', '#dc8e48'];
  const money = (value) => Number(value || 0).toLocaleString(I18n.locale);
  const name = (S, id) => esc(S.players.find((p) => p.id === id)?.name || '?');
  const car = (p, color) => `<svg viewBox="0 0 80 50" aria-hidden="true"><path d="M5 35V20q0-8 8-8h54q8 0 8 8v15z" fill="${color}" stroke="#3b4640" stroke-width="2"/><rect x="8" y="18" width="15" height="12" rx="3" fill="#c4e8eb"/><circle cx="17" cy="36" r="7" fill="#33423c"/><circle cx="64" cy="36" r="7" fill="#33423c"/>${Array.from({ length: Math.min(8, 1 + (p.partner ? 1 : 0) + p.kids) }, (_, i) => `<circle cx="${29 + i % 4 * 11}" cy="${i < 4 ? 18 : 29}" r="4" fill="${i === 0 ? '#fff5d3' : i === 1 && p.partner ? '#efd0db' : '#b9e3ec'}" stroke="#4c5545"/>`).join('')}</svg>`;
  const label = (kind) => ({ start: 'Studium oder Beruf', job: 'Beruf wählen', house: 'Haus kaufen', wedding: 'Hochzeitsgeschenke', route: 'Weg wählen', chance: 'Glück versuchen' })[kind] || 'Drehen und weiterfahren';
  const icon = (kind) => ({ payday: '$', event: '?', life: '♥', child: '+1', raise: '↑', job: '★', 'risk-event': '!', graduation: 'UNI', wedding: '♥', house: '⌂', family: 'Y', risk: 'Y', retirement: 'Ziel', start: 'Los' })[kind] || '•';
  function scenery(g) {
    const points = g.board.fields, near = (kind) => points.find((f) => f.kind === kind);
    const building = (kind, drawing) => { const f = near(kind); return f ? `<g transform="translate(${Math.max(50, Math.min(860, f.x - 60))} ${Math.max(6, f.y - 115)})">${drawing}</g>` : ''; };
    return `<rect width="1000" height="${g.board.height}" fill="#d9e4bf"/><path d="M0 70Q150-40 320 90T650 40T1000 90V0H0z" fill="#a8c499"/><path d="M30 260Q230 120 400 270T800 260T1030 340" fill="none" stroke="#b4d3d8" stroke-width="26"/>
      ${building('graduation', I18n.html('<path d="M5 45h120v35H5zM0 45l65-35 65 35z" fill="#ebddbb" stroke="#7d785c" stroke-width="3"/><path d="M24 45v35m25-35v35m25-35v35m25-35v35" stroke="#aa9b74" stroke-width="8"/><text x="65" y="35" text-anchor="middle" font-size="16" fill="#59654a">UNI</text>'))}
      ${building('wedding', '<path d="M20 80V30h35V5h25v75zM55 30 37 12 20 30M80 48l30 15v17H80" fill="#f3edda" stroke="#95886e" stroke-width="3"/><path d="M65 9v15m-6-8h12" stroke="#7d8d77" stroke-width="3"/><path d="M32 80V58q8-16 16 0v22" fill="#a9c2c8"/>')}
      ${building('house', '<path d="M0 80V30l25-20 25 20v50M52 80V15l20-12 20 12v65M95 80V40l20-18 20 18v40" fill="#e0ba97" stroke="#7d8f76" stroke-width="3"/><path d="M12 40h12m-12 16h12m40-26h12m-12 16h12m30 9h12" stroke="#d5e8e5" stroke-width="9"/>')}
      ${building('retirement', '<path d="M0 80V30l65-22 65 22v50z" fill="#f0d3a4" stroke="#7d8e67" stroke-width="3"/><path d="M12 48h18m17 0h18m17 0h18M50 80V60h28v20" stroke="#aeccce" stroke-width="9"/><path d="M-8 80V48m146 32V48" stroke="#728b5e" stroke-width="8"/>')}
      ${Array.from({ length: 16 }, (_, i) => `<g transform="translate(${30 + i * 67 % 940} ${170 + Math.floor(i / 4) * 210})"><path d="M0 18V46" stroke="#9b8d66" stroke-width="5"/><circle cy="12" r="18" fill="${i % 2 ? '#99b87d' : '#b1c98d'}"/></g>`).join('')}`;
  }
  function wheel(S) {
    const value = S.g.spin?.value || 1;
    return `<div class="life-wheel-box"><span class="life-pointer" aria-hidden="true">▼</span><div class="life-wheel" style="transform:rotate(${(11 - value) * 36}deg)">${Array.from({ length: 10 }, (_, i) => `<span style="transform:rotate(${i * 36}deg) translateY(-39px) rotate(${-i * 36}deg)">${i + 1}</span>`).join('')}<b>✦</b></div><output aria-live="polite">${S.g.spin ? `${S.g.spin.value} · ${esc(S.g.spin.reason)}` : 'Drehrad 1–10'}</output></div>`;
  }
  function stats(S) {
    return S.players.filter((p) => S.g.people[p.id]).map((p, i) => {
      const x = S.g.people[p.id], job = data.JOBS.find((j) => j.id === x.job);
      return I18n.html`<article class="life-player ${p.id === S.you?.id ? 'own' : ''}" style="--car:${colors[i % colors.length]}"><h3>${name(S, p.id)}${x.retired ? ' · Ruhestand' : ''}</h3><b>${money(x.money)} Geld</b><p>${job ? I18n.html`${esc(job.name)}<br>${money(x.salary)} je Zahltag` : 'Noch in Ausbildung'}</p>${job ? `<small>${esc(job.text)}</small>` : ''}<p>${x.partner ? 'Mit Partner' : 'Ohne Partner'} · ${x.kids} Kinder<br>${x.loans} Kredite (${money(x.loans * 60000)} Tilgung)</p><p>${x.houses.map((id) => esc(data.HOUSES.find((h) => h.id === id).name)).join(', ') || 'Noch kein Haus'}</p><div class="life-cards" aria-label="${x.lifeCards} verdeckte Lebenskarten">${Array.from({ length: Math.min(12, x.lifeCards) }, () => '<i>♥</i>').join('')}<b>${x.lifeCards}</b></div></article>`;
    }).join('');
  }
  function follow() {
    const own = viewport?.querySelector('.life-car.own'); if (!own) return;
    const a = own.getBoundingClientRect(), b = viewport.getBoundingClientRect(), pad = 65;
    if (a.left < b.left + pad) viewport.scrollLeft -= b.left + pad - a.left;
    if (a.right > b.right - pad) viewport.scrollLeft += a.right - b.right + pad;
    if (a.top < b.top + pad) viewport.scrollTop -= b.top + pad - a.top;
    if (a.bottom > b.bottom - pad) viewport.scrollTop += a.bottom - b.bottom + pad;
  }
  function fit() { const map = viewport?.querySelector('.life-map'); if (map) map.style.width = I18n.html`${Math.max(viewport.clientWidth, 700) * zoom}px`; }
  const kit = kitGame({
    id: 'spiel-des-lebens', name: 'Spiel des Lebens', ring: false, direction: false,
    short: ['Starte mit 200.000: Studium mit 100.000 Kredit oder direkt ins Berufsleben.', 'Drehe 1–10. Zahltag zählt beim Überqueren. An jedem STOPP hältst du an, der Rest verfällt.', 'Wähle Beruf, Haus und Wege. Familiengeschenke und Ereignisse können Kredite nötig machen.', 'Kredite: 50.000 bekommen, 60.000 zurückzahlen. Lebenskarten bleiben bis zum Ende verdeckt.', 'Am Ende zählen Geld, Hausverkauf, Lebenskarten und 50.000 je Kind minus Kredite.'],
    rules: I18n.html('<p>Eine eigene Lebensreise für 2–6 Spieler. Studium kostet 100.000 aus zwei Krediten; danach stehen besser bezahlte Berufe zur Wahl. Direkter Beruf überspringt den Studienweg.</p><p>Der Server dreht 1–10. Alle überquerten Zahltage zahlen das aktuelle Gehalt. STOPP-Felder beenden die Fahrt sofort: Abschluss, Hochzeit, Hauskauf, Familie/Karriere, Sicher/Riskant und Ruhestand. Du entscheidest dort, bevor der nächste Spieler fährt.</p><p>Hochzeit: Drehrad ×10.000 als Geschenk von jedem aktiven Mitspieler. Kinder: 10.000 pro Kind von jedem aktiven Mitspieler, eine Lebenskarte pro Kind. Familienweg bringt mehr Kinder und Lebensmomente, Karriereweg Berufschancen und Gehaltserhöhungen. Der riskante Weg bietet beim Drehen bis 5 einen Verlust von 80.000, ab 6 einen Gewinn von 180.000.</p><p>Berufe haben eigene Fähigkeiten. Häuser zeigen Kaufpreis und zwei spätere Verkaufspreise. Beim Verkauf entscheidet ein neuer Dreh: ungerade erster, gerade zweiter Preis. Verdeckte Lebenskarten sind 50.000–250.000 wert und werden erst bei der Endabrechnung aufgedeckt.</p><p>Bankkredite sind jederzeit während der eigenen aktiven Teilnahme möglich: je 50.000 erhalten, je 60.000 tilgen. Fehlt Geld bei einer Pflichtzahlung, leiht die Bank genau den benötigten Rest auf volle 50.000 aufgerundet. Im Ruhestand sind keine neuen Kredite möglich.</p><p>Ruhestand belohnt die Reihenfolge mit 4, 3, 2, danach je 1 Lebenskarte. Sobald alle dort sind, werden Häuser verkauft und Kredite automatisch getilgt. Vermögen = Bargeld + Hausverkäufe + Lebenskarten + 50.000 je Kind − 60.000 je Kredit. Höchster Wert gewinnt.</p>'),
    status: (S) => S.g.choice ? label(S.g.choice.kind) : 'Drehen und weiterfahren',
    playerInfo: (p) => I18n.html`${money(p.money)} · ${p.kids || 0} Kinder · ${p.lifeCards || 0} Lebenskarten`,
    hint: (S, mine) => mine ? S.g.choice ? label(S.g.choice.kind) : 'Drehe das Rad und fahre zum nächsten Lebensmoment' : I18n.html`${name(S, S.turnId)} ist dran`,
    main(S) {
      if (!data) return I18n.html('<p>Lade die Landschaft …</p>');
      const g = S.g, fields = new Map(g.board.fields.map((f) => [f.id, f])), main = g.board.fields.filter((f) => !f.route);
      const paths = [main.map((f) => `${f.x},${f.y}`).join(' ')];
      for (const prefix of ['c', 'r']) { const branch = g.board.fields.filter((f) => f.id.startsWith(prefix)); if (branch.length) { const start = fields.get(String(branch[0].index - 1)), end = fields.get(branch.at(-1).next); paths.push([start, ...branch, end].map((f) => `${f.x},${f.y}`).join(' ')); } }
      const roads = paths.map((points) => `<polyline points="${points}" fill="none" stroke="#f4efd7" stroke-width="40" stroke-linejoin="round"/><polyline points="${points}" fill="none" stroke="#899481" stroke-width="30" stroke-linejoin="round"/><polyline points="${points}" fill="none" stroke="#f4efd7" stroke-width="2" stroke-dasharray="8 9"/>`).join('');
      const cells = g.board.fields.map((f) => `<g class="life-field ${f.stop ? 'stop' : f.kind}" transform="translate(${f.x} ${f.y})"><circle r="${f.stop ? 21 : 15}"/><text y="4" text-anchor="middle">${f.stop ? 'STOP' : icon(f.kind)}</text><title>${esc(f.name)}</title>${f.stop ? `<text class="life-field-label" y="41" text-anchor="middle">${esc(f.name)}</text>` : ''}</g>`).join('');
      const cars = S.players.filter((p) => g.people[p.id] && !g.people[p.id].out).map((p, i) => { const f = fields.get(g.people[p.id].position); return I18n.html`<div class="life-car ${p.id === S.you?.id ? 'own' : ''}" data-car="${p.id}" style="left:${f.x / 10}%;top:${f.y / g.board.height * 100}%;--offset-x:${(i % 3 - 1) * 18}px;--offset-y:${Math.floor(i / 3) * 20}px;--car:${colors[i % colors.length]}" aria-label="Auto von ${name(S, p.id)} bei ${esc(f.name)}">${car(g.people[p.id], colors[i % colors.length])}<small>${name(S, p.id)}</small></div>`; }).join('');
      return I18n.html`<section class="life-table"><div class="life-toolbar"><b>${I18n.t(S.variant === 'short' ? 'Schnelles Leben' : 'Deine große Lebensreise')}</b><div class="kg-acts"><button class="btn" data-g="zoom-out" aria-label="Karte verkleinern">−</button><button class="btn" data-g="zoom-in" aria-label="Karte vergrößern">+</button><button class="btn" data-g="own">Zu deinem Auto</button></div></div><div class="life-layout"><div class="life-view-wrap"><div class="life-viewport" tabindex="0" aria-label="Verschiebbare Landschaft"><div class="life-map" style="aspect-ratio:1000/${g.board.height}"><svg viewBox="0 0 1000 ${g.board.height}" aria-label="Lebensweg mit Stoppfeldern">${scenery(g)}${roads}${cells}</svg>${cars}</div></div>${wheel(S)}</div><aside class="life-stats" aria-label="Geld, Beruf und Familie">${stats(S)}</aside></div>${g.lastEvent ? `<p class="life-event" role="status">${esc(g.lastEvent)}</p>` : ''}</section>`;
    },
    dock(S, mine) {
      if (!data) return '';
      const p = S.g.people[S.you?.id]; if (!p || p.out) return '';
      const choice = S.g.choice; let actions = '';
      const pick = (value, text) => `<button class="btn btn-brass" data-g="choose" data-value="${value}">${text}</button>`;
      if (mine) {
        if (!choice) actions = I18n.html('<button class="btn btn-brass life-spin-btn" data-g="spin">Drehrad drehen</button>');
        else if (choice.kind === 'start') actions = pick('college', 'Studium · 100.000 Kredit') + pick('work', 'Direkt Beruf · ohne Studienkredit');
        else if (choice.kind === 'job') actions = choice.offers.map((id) => { const j = data.JOBS.find((j) => j.id === id); return pick(id, `${esc(j.name)} · ${money(j.salary)}<small>${esc(j.text)}</small>`); }).join('');
        else if (choice.kind === 'house') actions = choice.offers.map((id) => { const h = data.HOUSES.find((h) => h.id === id); return pick(id, I18n.html`${esc(h.name)} · ${money(h.price)}<small>Verkauf ungerade ${money(h.sale[0])}, gerade ${money(h.sale[1])}</small>`); }).join('') + pick('skip', 'Kein Haus kaufen');
        else if (choice.kind === 'route') { const f = S.g.board.fields.find((f) => f.id === p.position); actions = f.kind === 'family' ? pick('family', 'Familienweg') + pick('career', 'Karriereweg') : pick('safe', 'Sicherer Weg') + pick('risk', 'Riskanter Weg'); }
        else actions = pick('spin', choice.kind === 'wedding' ? 'Geschenke ausdrehen' : 'Ereignis ausdrehen');
      }
      const bank = p.retired ? '' : I18n.html`<details class="life-bank"><summary>Bank · ${p.loans} Kredite</summary><div class="kg-acts"><button class="btn" data-g="borrow">50.000 leihen</button><button class="btn" data-g="repay" ${p.loans > 0 && p.money >= 60000 ? '' : 'disabled'}>60.000 tilgen</button></div></details>`;
      return `<div class="kg-acts life-actions">${actions}</div>${bank}`;
    },
    standExtra(S) {
      const rows = S.g?.breakdown; if (!rows) return '';
      return I18n.html`<h3>Endabrechnung</h3>${Object.entries(rows).map(([id, r]) => I18n.html`<details open><summary>${name(S, id)} · ${money(r.total)}</summary><p>Bargeld ${money(r.cash)} + Häuser ${money(r.sales.reduce((n, h) => n + h.value, 0))} + Lebenskarten ${r.life.map(money).join(' + ')} + Kinder ${money(r.children)} − Kredite ${money(r.debt)}</p>${r.sales.map((h) => I18n.html`<p>${esc(data.HOUSES.find((x) => x.id === h.house).name)}: Dreh ${h.spin} → ${money(h.value)}</p>`).join('')}</details>`).join('')}`;
    },
    afterRender(S) {
      if (!data || !S.g) return;
      const next = document.querySelector('.life-viewport'); if (next !== viewport) { observer?.disconnect(); viewport = next; if (viewport) { observer = new ResizeObserver(fit); observer.observe(viewport); } }
      fit();
      if (S.g.spin && S.g.spin.n !== animatedSpin) { animatedSpin = S.g.spin.n; const w = document.querySelector('.life-wheel'); if (w && !motionOff()) { const angle = (11 - S.g.spin.value) * 36; w.animate([{ transform: I18n.html`rotate(${angle - 900}deg)` }, { transform: I18n.html`rotate(${angle}deg)` }], { duration: 950, easing: 'cubic-bezier(.12,.7,.15,1)' }); } }
      const move = S.g.lastMove;
      if (move && move.n !== animatedMove) {
        animatedMove = move.n; const car = viewport?.querySelector(I18n.html`[data-car="${move.id}"]`);
        if (car && !motionOff()) { const fields = new Map(S.g.board.fields.map((f) => [f.id, f])); const animation = car.animate(move.path.map((id) => { const f = fields.get(id); return { left: `${f.x / 10}%`, top: `${f.y / S.g.board.height * 100}%` }; }), { duration: Math.max(250, (move.path.length - 1) * 130), easing: 'linear' }); if (move.id === S.you?.id) { const track = () => { follow(); if (animation.playState === 'running' && car.isConnected) requestAnimationFrame(track); }; requestAnimationFrame(track); } }
      }
      follow();
    },
    onClick(t) {
      const g = t.dataset.g;
      if (g === 'spin') send('spin'); if (g === 'choose') send('choose', { value: t.dataset.value });
      if (g === 'borrow') send('borrow', { units: 1 }); if (g === 'repay') send('repay', { units: 1 });
      if (g === 'zoom-in' || g === 'zoom-out') { zoom = Math.max(.75, Math.min(2.5, zoom + (g === 'zoom-in' ? .25 : -.25))); fit(); follow(); }
      if (g === 'own') follow();
    },
  });
  import('/games/spiel-des-lebens/data.js').then((module) => { data = module; kit.render(); });
}
