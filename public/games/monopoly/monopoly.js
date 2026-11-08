'use strict';
{
  let data = null, baseData = null, art = null, dialogKey = '', zoom = 1, observer = null, viewport = null, animated = 0, animatedRoll = 0;
  function useData(S) { if (!baseData) return; const board = baseData.JUNIOR_BOARD; data = S.variant === 'junior' ? { ...baseData, BOARD: board, PROPERTIES: board.filter((f) => f.price).map((f) => f.index), square: baseData.juniorSquare, group: (i) => board.filter((f) => f.color === board[i].color).map((f) => f.index) } : baseData; }
  function coordinates(i, S) { const [row, col] = data.square(i), junior = S.variant === 'junior', classic = S.settings.theme === 'classic' && !junior; const widths = Array(junior ? 7 : 11).fill(1); if (classic) widths[0] = widths[10] = 1.45; const total = widths.reduce((a, b) => a + b); const center = (n) => (widths.slice(0, n).reduce((a, b) => a + b, 0) + widths[n] / 2) / total * 100; return { left: center(col), top: center(row) }; }
  function tokenPicker(S) { return !art || !S.you?.playing ? '' : I18n.html`<section class="mo-token-picker"><h3>Deine Spielfigur</h3><div class="kg-acts">${Object.entries(art.TOKENS).map(([id, token]) => { const taken = Object.entries(S.monopolyTokens || {}).some(([p, t]) => p !== S.you.id && t === id && S.players.some((q) => q.id === p && q.seated)); return `<button class="btn" data-g="token" data-token="${id}" aria-pressed="${S.monopolyTokens?.[S.you.id] === id}" ${taken ? 'disabled' : ''}>${token.art}<span>${token.name}</span></button>`; }).join('')}</div></section>`; }
  const palette = ['#f3c968', '#8dc9ec', '#dc9fca', '#a4d59b', '#edab82', '#c4b0e9', '#9edbd1', '#e5e0b1'];
  const name = (S, id) => esc(S.players.find((p) => p.id === id)?.name || '?');
  const fieldName = (S, i) => { const at = data.PROPERTIES.indexOf(i); return at < 0 ? data.BOARD[i].name : S.g?.board.names[at] || S.monopolyBoards.find((b) => b.id === S.settings.board)?.names[at] || data.BOARD[i].name; };
  const option = (id, label, selected = false) => `<option value="${esc(id)}" ${selected ? 'selected' : ''}>${esc(label)}</option>`;
  const field = (label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;
  const input = (id, value = 0, max = 1000000) => `<input class="input" type="number" id="${id}" min="0" max="${max}" step="1" value="${value}">`;
  function notes(money) { let rest = money; return I18n.html`<div class="mo-notes" aria-label="Dein Bargeld als Geldscheine">${[500, 100, 50, 20, 10, 5, 1].map((v, i) => { const n = Math.floor(rest / v); rest %= v; return n ? `<span class="mo-note" style="--note:${['#e7ba99', '#c2dfb1', '#b9cde9', '#e5d6a5', '#d9b9d9', '#e0c7ae', '#ddd8c5'][i]}">${v} ×${n}</span>` : ''; }).join('')}</div>`; }
  function dialog(title, html, key) {
    let d = document.querySelector('#mo-dialog');
    if (!d) { d = document.createElement('dialog'); d.id = 'mo-dialog'; d.className = 'dlg mo-dialog'; d.setAttribute('aria-labelledby', 'mo-title'); document.body.append(d); d.addEventListener('close', () => { dialogKey = ''; }); }
    if (d.open) d.close();
    d.innerHTML = I18n.html`<div class="mo-dialog-body"><div class="panel-head"><h2 id="mo-title">${esc(title)}</h2><button type="button" class="icon-btn" data-mo="close" aria-label="Schließen">×</button></div>${html}</div>`;
    dialogKey = key; d.showModal(); return d;
  }
  function close() { document.querySelector('#mo-dialog')?.close(); dialogKey = ''; }
  async function perform(event, payload = {}) { close(); const r = await send(event, payload); if (!r?.ok) kit.render(); }
  const manageButton = (field, action, label, enabled = true) => `<button type="button" class="btn" data-mo="manage" data-field="${field}" data-action="${action}" ${enabled ? '' : 'disabled'}>${label}</button>`;
  function propertyDialog(S, i) {
    const f = data.BOARD[i], q = S.g.owned[i], possible = S.g.possible.find((p) => p.field === i);
    if (S.variant === 'junior') { dialog(fieldName(S, i), `<div class="mo-deed" style="--deed:${f.color ? data.COLORS[f.color].hex : '#ddd'}"><h3>${esc(fieldName(S, i))}</h3><p>${q ? I18n.html`Preis ${f.price} · Miete ${f.price}, beide derselben Farbe: ${f.price * 2}.<br>Besitzer: ${q.owner ? name(S, q.owner) : 'Bank'}<br>Freie Grundstücke werden beim Betreten gekauft.` : 'Feldaktion beim Betreten.'}</p></div>`, 'property:' + i); return; }
    let html = `<p>${esc(f.type === 'street' ? data.COLORS[f.color].name : f.type === 'rail' ? 'Bahnhof' : f.type === 'utility' ? 'Werk' : f.type)}</p>`;
    if (q) {
      html += I18n.html`<p>Preis ${f.price} · Hypothek ${f.price / 2} · Auslösen ${data.redemption(i)}</p><p>Besitzer: <b>${q.owner ? name(S, q.owner) : 'Bank'}</b>${q.mortgage ? ' · belastet' : ''}${q.level ? ` · ${q.level === 5 ? 'Hotel' : q.level + ' Häuser'}` : ''}</p>`;
      html += `<table class="mo-rents"><tbody>${f.rents ? f.rents.map((v, k) => `<tr><td>${k === 0 ? 'Unbebaut (volle Gruppe doppelt)' : k === 5 ? 'Hotel' : k + ' Haus' + (k > 1 ? 'er' : '')}</td><td>${v}</td></tr>`).join('') : f.type === 'rail' ? I18n.html('<tr><td>1 / 2 / 3 / 4 Bahnhöfe</td><td>25 / 50 / 100 / 200</td></tr>') : I18n.html('<tr><td>1 / 2 Werke</td><td>4× / 10× Würfel</td></tr>')}</tbody></table>`;
      if (possible) html += `<div class="mo-dialog-actions">${f.color ? manageButton(i, 'build', I18n.html`Bauen (${f.build})`, possible.build) + manageButton(i, 'sell', I18n.html`Ein Gebäude verkaufen (+${f.build / 2})`, possible.sell) + manageButton(i, 'sellAll', 'Gebäude der Farbe alle verkaufen', possible.sellAll) : ''}${manageButton(i, 'mortgage', I18n.html`Hypothek (+${f.price / 2})`, possible.mortgage)}${manageButton(i, 'unmortgage', I18n.html`Auslösen (${data.redemption(i)})`, possible.unmortgage)}</div>`;
    } else html += I18n.html('<p>Auf diesem Feld wird beim Landen die entsprechende Aktion ausgeführt.</p>');
    dialog(fieldName(S, i), `<div class="mo-deed" style="--deed:${f.color ? data.COLORS[f.color].hex : '#bac9ae'}"><h3>${esc(fieldName(S, i))}</h3>${html}</div>`, 'property:' + i);
  }
  function offerDescription(S, side) { return I18n.html`<p>${side.money || 0} Geld · ${side.free || 0} Freikarten</p><ul>${side.properties.map((i) => `<li>${esc(fieldName(S, i))}${S.g.owned[i].mortgage ? ' (belastet, +10 % Übernahmezinsen)' : ''}</li>`).join('') || I18n.html('<li>Keine Grundstücke</li>')}</ul>`; }
  function tradeForm(S, counter = false) {
    const me = S.you.id, g = S.g, incoming = counter ? g.trade : null;
    const targets = S.players.filter((p) => p.inRound && !g.people[p.id].out && p.id !== me);
    const target = incoming ? incoming.from : targets[0]?.id;
    const give = incoming ? incoming.take : { money: 0, free: 0, properties: [] }, take = incoming ? incoming.give : { money: 0, free: 0, properties: [] };
    const selectable = (id) => data.PROPERTIES.filter((i) => g.owned[i].owner === id && !data.group(i).some((j) => g.owned[j].level));
    const checks = (id, side, selected) => selectable(id).map((i) => `<label><input type="checkbox" data-mo-trade="${side}" value="${i}" ${selected.includes(i) ? 'checked' : ''}><span>${esc(fieldName(S, i))}${g.owned[i].mortgage ? ' · Hypothek' : ''}</span></label>`).join('') || I18n.html('<p class="hint">Keine unbebauten Grundstücke</p>');
    const d = dialog(counter ? 'Gegenangebot' : 'Handel anbieten', I18n.html`<p>Unbebaute Grundstücke, Geld und Freikarten tauschen. Empfänger belasteter Grundstücke zahlen sofort 10 % ihres Hypothekenwerts an die Bank.</p>${field(I18n.t('Mitspieler'), `<select class="input" id="mo-trade-target">${targets.map((p) => option(p.id, p.name, p.id === target)).join('')}</select>`)}<div class="mo-trade-sides"><section class="mo-trade-side"><h3>Du gibst</h3>${field('Geld abgeben', input('mo-give-money', give.money, g.people[me].money))}${field('Freikarten abgeben', input('mo-give-free', give.free, g.people[me].free.length))}<div class="mo-trade-list">${checks(me, 'give', give.properties)}</div></section><section class="mo-trade-side"><h3>Du erhältst</h3>${field('Geld erhalten', input('mo-take-money', take.money, g.people[target]?.money || 0))}${field('Freikarten erhalten', input('mo-take-free', take.free, g.people[target]?.free.length || 0))}<div class="mo-trade-list" id="mo-take-properties">${checks(target, 'take', take.properties)}</div></section></div><button type="button" class="btn btn-brass" data-mo="offer" ${targets.length ? '' : 'disabled'}>Angebot senden</button>`, 'trade-form');
    d.querySelector('#mo-trade-target').addEventListener('change', (e) => {
      d.querySelector('#mo-take-properties').innerHTML = checks(e.target.value, 'take', []);
      d.querySelector('#mo-take-money').max = g.people[e.target.value].money; d.querySelector('#mo-take-money').value = 0;
      d.querySelector('#mo-take-free').max = g.people[e.target.value].free.length; d.querySelector('#mo-take-free').value = 0;
    });
  }
  function pending(S, force = false) {
    if (!data || S.phase !== 'playing') { if (dialogKey.startsWith('pending:')) close(); return; }
    const g = S.g, me = S.you?.id; let key = '', title = '', html = '';
    if (g.debt?.from === me) {
      const debt = g.debt; key = I18n.html`pending:debt:${debt.from}:${debt.to}:${debt.amount}:${g.people[me].money}`; title = I18n.html`${debt.amount} bezahlen`;
      html = I18n.html`<p>An ${debt.to ? name(S, debt.to) : 'die Bank'} · ${esc(debt.reason)}. Bargeld: <b>${g.people[me].money}</b>. Verkauf oder Hypothek schaffen Geld; sobald es reicht, wird automatisch bezahlt.</p><div class="mo-debt-list">${g.possible.filter((p) => p.sellAll || p.mortgage).map((p) => `<div><b>${esc(fieldName(S, p.field))}</b><div>${p.sell ? manageButton(p.field, 'sell', 'Ein Gebäude verkaufen') : ''}${p.sellAll ? manageButton(p.field, 'sellAll', 'Gebäude der Farbe verkaufen') : ''}${p.mortgage ? manageButton(p.field, 'mortgage', I18n.html`Hypothek +${data.BOARD[p.field].price / 2}`) : ''}</div></div>`).join('')}</div><p>Bei vollständiger Verwertung verfügbar: ${g.liquidation}.</p><button class="btn btn-outline-red" data-mo="bankrupt" ${g.liquidation < debt.amount ? '' : 'disabled'}>Bankrott erklären</button>`;
    } else if (g.auction && g.auction.participants.includes(me)) {
      const a = g.auction; key = I18n.html`pending:auction:${a.field}`; title = I18n.html`Versteigerung: ${fieldName(S, a.field)}`;
      html = I18n.html`<p id="mo-auction-live"></p><p>Alle dürfen bieten. Ein Gebot ist verbindlich, Aussteigen für diese Versteigerung endgültig.</p>${field('Dein Gebot', input('mo-bid', Math.max(1, a.bid + 1), g.people[me].money))}<div class="mo-dialog-actions"><button class="btn btn-brass" data-mo="bid">Gebot abgeben</button><button class="btn" data-mo="auction-pass">Aussteigen</button></div>`;
    } else if (g.trade && g.trade.to === me) {
      const t = g.trade; key = 'pending:trade:' + t.n; title = I18n.html`Handel von ${S.players.find((p) => p.id === t.from)?.name || '?'}`;
      html = I18n.html`<div class="mo-trade-sides"><section><h3>Du erhältst</h3>${offerDescription(S, t.give)}</section><section><h3>Du gibst</h3>${offerDescription(S, t.take)}</section></div><div class="mo-dialog-actions"><button class="btn btn-brass" data-mo="trade-accept">Annehmen</button><button class="btn" data-mo="trade-reject">Ablehnen</button><button class="btn" data-mo="counter">Gegenangebot</button></div>`;
    } else if (!g.debt && !g.auction && !g.trade && g.actor === me && g.step === 'buy') {
      const i = g.people[me].position; key = I18n.html`pending:buy:${g.turnNo}:${i}`; title = fieldName(S, i);
      html = I18n.html`<p>Freies Grundstück. Kaufpreis <b>${data.BOARD[i].price}</b>, dein Bargeld <b>${g.people[me].money}</b>.</p><div class="mo-dialog-actions"><button class="btn btn-brass" data-mo="buy" data-yes="true" ${g.people[me].money >= data.BOARD[i].price ? '' : 'disabled'}>Kaufen</button><button class="btn" data-mo="buy" data-yes="false">${S.settings.noAuction ? 'Nicht kaufen' : 'Versteigern'}</button></div>`;
    }
    const d = document.querySelector('#mo-dialog');
    if (!key) { if (dialogKey.startsWith('pending:')) close(); return; }
    if (dialogKey === 'trade-form' && g.trade?.to === me && !force) return;
    if (key !== dialogKey || !d?.open || force) dialog(title, html, key);
    if (g.auction && dialogKey === key) {
      const a = g.auction, root = document.querySelector('#mo-dialog'), out = a.passed.includes(me) || a.leader === me;
      root.querySelector('#mo-auction-live').innerHTML = I18n.html`Höchstgebot: <b>${a.bid}</b> · ${a.leader ? name(S, a.leader) : 'Noch niemand'} · ${S.settings.auctionTime} Sekunden nach der letzten Entscheidung`;
      root.querySelector('#mo-bid').min = a.bid + 1;
      root.querySelector('[data-mo=bid]').disabled = out || g.people[me].money <= a.bid;
      root.querySelector('[data-mo=auction-pass]').disabled = out;
    }
  }
  function boardEditor(S) {
    const board = S.monopolyBoards.find((b) => b.id === S.settings.board) || S.monopolyBoards[0];
    dialog('Eigenes Stadtbrett', I18n.html`<p>28 eigene Grundstücksnamen, unveränderte Regelwerte. Höchstens 20 eigene Bretter werden auf dem Server gespeichert.</p>${field('Brettname', '<input class="input" id="mo-board-title" maxlength="60" value="Unser Spieleabend">')}<div class="mo-board-editor">${data.PROPERTIES.map((i, at) => field(data.BOARD[i].name, `<input class="input" data-mo-name="${at}" maxlength="40" value="${esc(board.names[at])}">`)).join('')}</div><button class="btn btn-brass" data-mo="board-save">Brett speichern und auswählen</button>`, 'board-editor');
  }
  function fit() {
    if (!viewport?.isConnected) return;
    const board = viewport.querySelector('.mo-board');
    const base = Math.max(matchMedia('(max-width:600px), (pointer:coarse)').matches ? 530 : 364, Math.min(viewport.clientWidth, viewport.clientHeight, 880)); board.style.setProperty('--mo-size', Math.round(base * zoom) + 'px');
    const label = viewport.parentElement.querySelector('.mo-zoom > span'); if (label) label.textContent = Math.round(zoom * 100) + ' %';
  }
  function showOwn() {
    const token = viewport?.querySelector('.mo-token.own'); if (!token) return;
    const a = token.getBoundingClientRect(), b = viewport.getBoundingClientRect(), padding = 20;
    if (a.left < b.left + padding) viewport.scrollLeft -= b.left + padding - a.left;
    if (a.right > b.right - padding) viewport.scrollLeft += a.right - b.right + padding;
    if (a.top < b.top + padding) viewport.scrollTop -= b.top + padding - a.top;
    if (a.bottom > b.bottom - padding) viewport.scrollTop += a.bottom - b.bottom + padding;
  }
  function afterRender(S) {
    if (!data) return;
    if (S.phase !== 'playing' && dialogKey !== 'board-editor') close();
    const next = document.querySelector('.mo-board-viewport');
    if (next !== viewport) { observer?.disconnect(); viewport = next; if (viewport) { observer = new ResizeObserver(() => { fit(); showOwn(); }); observer.observe(viewport); } }
    fit();
    if (S.g?.rollNo !== animatedRoll) {
      animatedRoll = S.g?.rollNo || 0;
      if (animatedRoll && !motionOff()) document.querySelectorAll('.mo-dice .die').forEach((die, i) => die.animate([{ transform: 'translateY(-8px) rotate(-90deg)' }, { transform: 'translateY(3px) rotate(12deg)' }, { transform: 'none' }], { duration: 350 + i * 60 }));
    }
    const move = S.g?.lastMove;
    if (viewport && move && move.n !== animated) {
      animated = move.n;
      const token = viewport.querySelector(I18n.html`[data-mo-token="${move.id}"]`);
      if (token && !motionOff()) {
        const frames = move.path.map((i) => { const at = coordinates(i, S); return { left: at.left + '%', top: at.top + '%' }; });
        const animation = token.animate(frames, { duration: Math.min(2500, Math.max(250, (frames.length - 1) * 95)), easing: 'linear' });
        if (move.id === S.you?.id) { const follow = () => { if (!token.isConnected || animation.playState !== 'running') return; showOwn(); requestAnimationFrame(follow); }; requestAnimationFrame(follow); }
      }
    }
    showOwn(); pending(S);
  }
  function boardHTML(S) {
    if (!data) return I18n.html('<p>Lade die Stadt …</p>');
    const g = S.g, junior = S.variant === 'junior', classic = S.settings.theme === 'classic' || junior;
    const players = S.players.filter((p) => g.people[p.id]), color = (id) => palette[players.findIndex((p) => p.id === id) % palette.length];
    const fields = data.BOARD.map((f) => {
      const [row, col] = data.square(f.index), q = g.owned[f.index], corner = classic && art?.CORNERS[f.type];
      return I18n.html`<button type="button" class="mo-field ${corner ? 'mo-corner' : ''} ${q?.owner ? 'mo-owned' : ''} ${q?.mortgage ? 'mo-mortgage' : ''}" style="grid-row:${row + 1};grid-column:${col + 1};--mo-color:${f.color ? data.COLORS[f.color].hex : '#cad8bb'};--mo-owner:${q?.owner ? color(q.owner) : 'transparent'}" data-g="field" data-field="${f.index}" aria-label="Feld ${f.index}: ${esc(fieldName(S, f.index))}"><span class="mo-color"></span>${corner || ''}<b>${f.type === 'jail' && classic ? 'Nur zu Besuch' : esc(fieldName(S, f.index))}</b><small>${q?.level ? q.level === 5 ? 'Hotel' : '⌂'.repeat(q.level) : f.price || f.tax || (f.index === 0 ? junior ? '+2' : '+200' : '')}</small></button>`;
    }).join('');
    const pieces = players.filter((p) => !g.people[p.id].out).map((p, i) => { const at = coordinates(g.people[p.id].position, S); return I18n.html`<span class="mo-token ${p.id === S.you?.id ? 'own' : ''}" style="left:${at.left + (i % 3 - 1)}%;top:${at.top + (Math.floor(i / 3) - 1)}%;--mo-owner:${color(p.id)}" data-mo-token="${p.id}" aria-label="${name(S, p.id)} auf ${esc(fieldName(S, g.people[p.id].position))}">${art?.TOKENS[g.tokens?.[p.id]]?.art || i + 1}</span>`; }).join('');
    return I18n.html`<section class="mo-table"><div class="mo-toolbar"><b>${esc(g.board.title)}</b><span>${junior ? '24 Felder · Pflichtkauf · keine Gebäude' : I18n.html`Vorrat ${g.stock.houses} Häuser / ${g.stock.hotels} Hotels`}</span><div class="mo-zoom"><button class="btn" data-g="zoom-out" aria-label="Brett verkleinern">−</button><span>${Math.round(zoom * 100)} %</span><button class="btn" data-g="zoom-in" aria-label="Brett vergrößern">+</button><button class="btn" data-g="own">Zu deiner Figur</button></div></div><div class="mo-board-viewport" tabindex="0" aria-label="Verschiebbares Stadtbrett"><div class="mo-board ${classic ? 'mo-classic' : ''} ${junior ? 'mo-junior' : ''}">${fields}<div class="mo-center"><h2>${classic ? 'Spieleabend' : esc(g.board.title)}</h2>${classic ? I18n.html('<div class="mo-decks"><span><b>?</b>Ereignis</span><span><svg viewBox="0 0 40 30" aria-hidden="true"><path d="M5 13q0-12 15-12t15 12v14H5zM5 13h30M17 11h6v8h-6z" fill="none" stroke="currentColor" stroke-width="2"/></svg>Gemeinschaft</span></div>') : ''}<div class="mo-dice">${g.dice.map((n) => dieHTML(n)).join('')}${g.speedDie ? `<span class="mo-speed-die">${Number.isInteger(g.speedDie) ? g.speedDie : g.speedDie === 'bus' ? 'BUS' : '✦'}</span>` : ''}</div><p>${name(S, g.actor)} · ${esc(thisStatus(g) || '')}</p>${g.card ? `<p class="mo-event">${esc(g.card.text)}</p>` : I18n.html('<small>Ziehe am Brett oder nutze die Zoomknöpfe.</small>')}</div>${pieces}</div></div></section>`;
  }
  const kit = kitGame({
    id: 'monopoly', name: 'Monopoly', ring: false, direction: false,
    onState: useData,
    lobbyExtra: tokenPicker,
    meExtra: tokenPicker,
    short: ['Mit 1500 starten, würfeln und Grundstücke kaufen oder versteigern. Über Los bringt 200.', 'Farbgruppen erlauben gleichmäßiges Bauen. Miete, Hypothek und Gebäudevorrat verwaltet der Server.', 'Handel: Grundstücke, Geld und Freikarten anbieten, ablehnen oder gegenbieten.', 'Letzter Spieler gewinnt; beim Zeitlimit das größte Vermögen. Am Handy kannst du das Brett verschieben und vergrößern.'],
    rules: I18n.html('<h3>Monopoly · Spieleabend-Stadt</h3><p>40 Felder, 1500 Startgeld, 200 über Los. Pasch erlaubt einen weiteren Wurf, drei Pasche führen ins Gefängnis. Freie Grundstücke kaufen oder mit Mindestgebot 1 versteigern; auch der Ziehende darf bieten.</p><p>Unbebaute ganze Farbgruppen verlangen doppelte Miete. Häuser/Hotel nach Karte, Bahnhöfe 25/50/100/200, Werke 4× oder 10× Augenzahl. Belastete Grundstücke kassieren keine Miete; Gefangene kassieren weiter.</p><p>Nur ganze unbelastete Farben gleichmäßig bebauen. 32 Häuser und 12 Hotels insgesamt. Hotel ersetzt vier Häuser; zum Rücktausch müssen vier Häuser frei sein. Gebäude zum halben Preis gleichmäßig verkaufen; eine ganze Farbe kann vollständig abgebaut werden. Hypothek halber Kaufpreis, Auslösen mit 10 % Zins.</p><p>Gefängnis: 50 zahlen, Freikarte oder Pasch. Nach dem dritten Fehlversuch 50 zahlen und mit diesem Wurf ziehen. Ein Gefängnis-Pasch gibt keinen weiteren Wurf. Karten führen aus, was im Brettzentrum steht.</p><p>Handeln ohne Versteigerung oder offene Zahlung: beide Seiten legen Geld, unbebaute Grundstücke und Freikarten fest. Übernahmezinsen für belastete Grundstücke werden sofort abgerechnet. Bei Zahlungsschwierigkeiten erst Gebäude verkaufen oder Hypotheken aufnehmen. Bei Bankrott gehen Werte an den Gläubiger, Gebäude werden zum halben Preis verwertet; bei Bankschulden werden Grundstücke versteigert.</p><p>Letzter Spieler übrig gewinnt. Beim optionalen Zeitlimit zählt Geld plus Kaufwerte und Gebäude, abzüglich Hypotheken. Steuern auf Frei Parken, doppelt auf Los, Kauf ohne Versteigerung, Startgeld und Schnellstart sind Hausregeln.</p>'),
    house: (S) => [I18n.html`Startgeld ${S.settings.startMoney}`, S.settings.timeLimit ? I18n.html`${S.settings.timeLimit} Minuten` : 'Ohne Zeitlimit', ...(S.settings.quick ? ['Zwei Startgrundstücke'] : []), ...(S.settings.parkingPot ? ['Steuern auf Frei Parken'] : []), ...(S.settings.doubleGo ? ['Doppelt auf Los'] : []), ...(S.settings.noAuction ? ['Kaufverzicht ohne Versteigerung'] : [])],
    playerInfo: (p) => I18n.html`${p.money ?? 0} · ${p.properties || 0} Grundstücke${p.jail ? ' · Gefängnis' : ''}${p.out ? ' · bankrott' : ''}`,
    status: (S) => S.g.debt ? 'Zahlung offen' : S.g.auction ? 'Versteigerung' : S.g.trade ? 'Handelsangebot' : I18n.html`Zug ${S.g.turnNo} · ${{ roll: I18n.t('Würfeln'), jail: 'Gefängnis', buy: 'Kaufen oder versteigern', end: 'Zug abschließen' }[S.g.step]}`,
    hint: (S) => S.g.debt ? I18n.html`${name(S, S.g.debt.from)} schuldet ${S.g.debt.amount}` : S.g.auction ? 'Alle dürfen an der Versteigerung teilnehmen' : S.g.trade ? I18n.html`${name(S, S.g.trade.to)} beantwortet den Handel` : I18n.html`${name(S, S.g.actor)} ist am Zug`,
    main: boardHTML,
    dock(S) {
      if (!data) return '';
      const g = S.g, me = S.you.id, p = g.people[me], own = g.actor === me && !g.debt && !g.auction && !g.trade;
      if (!p || p.out) return I18n.html('<p class="hint">Du schaust zu</p>');
      let buttons = '';
      if (own && g.juniorChoice) buttons += g.juniorChoice.map((i) => I18n.html`<button class="btn btn-brass" data-g="junior" data-field="${i}">${esc(fieldName(S, i))} übernehmen</button>`).join('');
      if (own && g.speedChoice === 'bus') buttons += [...new Set([...g.dice, g.dice[0] + g.dice[1]])].map((value) => I18n.html`<button class="btn btn-brass" data-g="speed" data-value="${value}">Bus: ${value} Felder</button>`).join('');
      if (own && g.speedChoice === 'triple') buttons += I18n.html`<label class="field"><span>Dreierpasch: beliebiges Feld wählen</span><select class="input" id="mo-destination">${data.BOARD.map((f) => option(f.index, fieldName(S, f.index))).join('')}</select></label><button class="btn btn-brass" data-g="destination">Hierhin ziehen</button>`;
      if (own && ['roll', 'jail'].includes(g.step)) buttons += I18n.html('<button class="btn btn-brass" data-g="roll">Würfeln</button>');
      if (own && g.step === 'jail') buttons += I18n.html`<button class="btn" data-g="jail-pay">50 zahlen</button><button class="btn" data-g="jail-card" ${p.free.length ? '' : 'disabled'}>Freikarte nutzen (${p.free.length})</button>`;
      if (own && g.step === 'end') buttons += I18n.html('<button class="btn btn-brass" data-g="end">Zug beenden</button>');
      if ((g.debt?.from === me) || (g.auction?.participants.includes(me)) || g.trade?.to === me || own && g.step === 'buy') buttons += I18n.html('<button class="btn btn-brass" data-g="pending">Offene Entscheidung</button>');
      if (S.variant !== 'junior' && !p.out && !g.debt && !g.auction && !g.trade) buttons += I18n.html('<button class="btn" data-g="trade">Handel anbieten</button>');
      if (S.variant === 'junior') return I18n.html`${notes(p.money)}<div class="mo-summary"><b>${p.money} Geld</b>${buttons}</div><div class="mo-properties">${data.PROPERTIES.filter((i) => g.owned[i].owner === me).map((i) => `<button class="btn" data-g="field" data-field="${i}">${esc(fieldName(S, i))}</button>`).join('')}</div>`;
      return I18n.html`${S.settings.theme === 'classic' ? notes(p.money) : ''}<div class="kg-acts mo-summary"><b>${p.money} Geld · Vermögen ${S.players.find((p) => p.id === me).wealth}</b>${buttons}</div><details class="mo-possessions"><summary>Dein Besitz (${g.possible.length}) · Bauen, Hypothek, Verkaufen</summary><div class="mo-properties">${g.possible.map((a) => `<button class="btn" style="--mo-color:${data.BOARD[a.field].color ? data.COLORS[data.BOARD[a.field].color].hex : '#acb7a8'}" data-g="field" data-field="${a.field}">${esc(fieldName(S, a.field))}${g.owned[a.field].mortgage ? ' · Hypothek' : ''}</button>`).join('') || 'Noch keine Grundstücke'}</div></details>`;
    },
    hostExtra: (S) => S.variant === 'junior' ? '' : I18n.html`<h3>Stadtbrett</h3>${field('Brett auswählen', `<select class="input" data-g="board" ${S.phase === 'playing' ? 'disabled' : ''}>${(S.monopolyBoards || []).map((b) => option(b.id, b.title, b.id === S.settings.board)).join('')}</select>`)}<button class="btn" data-g="board-editor" ${S.phase === 'playing' ? 'disabled' : ''}>Eigenes Brett anlegen</button>`,
    standExtra: (S) => !data || !S.g ? '' : I18n.html`<h3>Besitz und Vermögen</h3>${S.players.filter((p) => S.g.people[p.id]).map((p) => I18n.html`<div class="mo-stand"><b>${name(S, p.id)} · ${p.money} Geld · ${p.wealth} Vermögen${p.out ? ' · bankrott' : ''}</b><div>${Object.entries(data.COLORS).map(([color, c]) => { const fields = data.BOARD.filter((f) => f.color === color), own = fields.filter((f) => S.g.owned[f.index].owner === p.id).length; return own ? `<span style="border-color:${c.hex}">${c.name} ${own}/${fields.length}</span>` : ''; }).join('')}</div></div>`).join('')}`,
    onChange(t) { if (t.dataset.g === 'board') send('boardChoose', { board: t.value }); },
    onClick(t, S) {
      if (!data) return;
      const action = t.dataset.g;
      if (action === 'token') send('token', { token: t.dataset.token });
      if (action === 'junior') send('juniorSelect', { field: Number(t.dataset.field) });
      if (action === 'speed') send('speedSelect', { value: Number(t.dataset.value) });
      if (action === 'destination') send('speedSelect', { value: Number(document.querySelector('#mo-destination').value) });
      if (action === 'roll') send('roll'); if (action === 'end') send('endTurn');
      if (action === 'jail-pay' || action === 'jail-card') send('jail', { method: action === 'jail-pay' ? 'pay' : 'card' });
      if (action === 'field') propertyDialog(S, Number(t.dataset.field)); if (action === 'trade') tradeForm(S); if (action === 'pending') pending(S, true); if (action === 'board-editor') boardEditor(S);
      if (action === 'own') showOwn();
      if (action === 'zoom-in' || action === 'zoom-out') { zoom = Math.max(1, Math.min(2, zoom + (action === 'zoom-in' ? .25 : -.25))); fit(); showOwn(); }
    },
    afterRender,
  });
  const thisStatus = (g) => g.debt ? 'Zahlung offen' : g.auction ? 'Versteigerung' : g.trade ? 'Handelsangebot' : { roll: I18n.t('Würfeln'), jail: 'Gefängnis', buy: 'Kaufentscheidung', end: 'Zug abschließen', 'speed-choice': 'Tempowürfel: Ziel wählen' }[g.step];
  document.addEventListener('click', (e) => {
    if (session?.game !== 'monopoly' || !data) return;
    const t = e.target.closest('[data-mo]'); if (!t || t.disabled) return;
    const action = t.dataset.mo, d = document.querySelector('#mo-dialog');
    if (action === 'close') close();
    if (action === 'manage') perform('manage', { field: Number(t.dataset.field), action: t.dataset.action });
    if (action === 'buy') perform('buy', { yes: t.dataset.yes === 'true' });
    if (action === 'bid') perform('bid', { amount: Number(d.querySelector('#mo-bid').value) });
    if (action === 'auction-pass') perform('auctionPass'); if (action === 'bankrupt') perform('bankrupt');
    if (action === 'trade-accept' || action === 'trade-reject') perform('tradeReply', { accept: action === 'trade-accept' });
    if (action === 'counter') tradeForm(kit.S, true);
    if (action === 'offer') {
      const side = (type) => ({ money: Number(d.querySelector('#mo-' + type + '-money').value), free: Number(d.querySelector('#mo-' + type + '-free').value), properties: [...d.querySelectorAll(I18n.html`[data-mo-trade="${type}"]:checked`)].map((b) => Number(b.value)) });
      perform('trade', { target: d.querySelector('#mo-trade-target').value, give: side('give'), take: side('take') });
    }
    if (action === 'board-save') perform('boardSave', { title: d.querySelector('#mo-board-title').value, names: [...d.querySelectorAll('[data-mo-name]')].map((input) => input.value) });
  });
  Promise.all([import('/games/monopoly/data.js'), import('/games/monopoly/tokens.js')]).then(([module, artwork]) => { baseData = module; art = artwork; useData(kit.S || {}); kit.render(); });
}
