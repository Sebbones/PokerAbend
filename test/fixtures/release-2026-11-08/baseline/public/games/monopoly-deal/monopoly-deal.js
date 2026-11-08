'use strict';
{
  let rules = null, dialogKey = '', discarded = new Set();
  const name = (S, id) => esc(S.players.find((p) => p.id === id)?.name || '?');
  const meta = (id) => rules.CARDS[id];
  const colorName = (c) => rules.COLORS[c].name;
  const card = (id, attrs = '', cls = '') => {
    const c = meta(id), colors = c.colors?.map((color) => rules.COLORS[color].hex) || ['#dfc58c'];
    return I18n.html`<button type="button" class="kc md-card ${cls}" style="--md-color:${colors[0]}" ${attrs} aria-label="${esc(c.name)}, ${c.value} M"><small>${c.value} M</small><b>${esc(c.name)}</b><span>${c.colors?.map(colorName).join(' / ') || (c.kind === 'money' ? 'Bank' : 'Aktion')}</span></button>`;
  };
  const option = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;
  const field = (label, id, options) => `<label class="field"><span>${label}</span><select class="input" id="${id}">${options}</select></label>`;
  function dialog(title, content, key) {
    let d = document.querySelector('#md-dialog');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'md-dialog'; d.className = 'dlg md-dialog'; d.setAttribute('aria-labelledby', 'md-title'); document.body.append(d);
      d.addEventListener('close', () => { dialogKey = ''; });
    }
    if (d.open) d.close();
    d.innerHTML = I18n.html`<div class="md-dialog-body"><div class="panel-head"><h2 id="md-title">${esc(title)}</h2><button type="button" class="icon-btn" data-md="close" aria-label="Schließen">×</button></div>${content}</div>`;
    dialogKey = key; d.showModal(); return d;
  }
  function close() { document.querySelector('#md-dialog')?.close(); dialogKey = ''; }
  async function perform(event, data) { close(); const r = await send(event, data); if (!r?.ok) kit.render(); }
  function openCard(S, id, wild = false) {
    const g = S.g, me = S.you.id, c = meta(id), groups = g.sets[me];
    let html = I18n.html`<p>${esc(c.text)}</p><p><b>${c.value} M</b> · ${g.actions}/3 Karten gespielt</p>`, type = c.action;
    if (c.kind === 'property') html += field('Farbe', 'md-color', c.colors.map((color) => option(color, colorName(color))).join('')) + field('Satz', 'md-group', '');
    if (['debt', 'sly', 'forced', 'breaker'].includes(type) || c.kind === 'rent' && c.colors.length === 10) html += field(I18n.t('Mitspieler'), 'md-target', S.players.filter((p) => p.inRound && p.id !== me).map((p) => option(p.id, p.name)).join(''));
    if (['house', 'hotel'].includes(type) || c.kind === 'rent') html += field('Dein Satz', 'md-group', groups.filter((group) => c.kind === 'rent' ? c.colors.includes(group.color) && rules.rent(group) > 0 : rules.complete(group) && !['rail', 'utility'].includes(group.color) && !group[type] && (type !== 'hotel' || group.house)).map((group) => option(group.id, I18n.html`${colorName(group.color)} (${group.cards.length}/${rules.COLORS[group.color].size}), Miete ${rules.rent(group)} M`)).join(''));
    if (c.kind === 'rent') html += `<div class="md-boosts">${g.hand.filter((h) => meta(h).action === 'double').map((h) => I18n.html`<label class="toggle"><span>Miete verdoppeln (eine weitere Aktion)</span><input type="checkbox" data-md-boost value="${h}"></label>`).join('')}</div>`;
    if (['sly', 'forced'].includes(type)) html += field('Grundstück nehmen', 'md-take', '');
    if (type === 'forced') html += field('Eigenes Grundstück geben', 'md-give', groups.filter((group) => !rules.complete(group)).flatMap((group) => group.cards.map((h) => option(h, `${meta(h).name} (${colorName(group.color)})`))).join(''));
    if (type === 'breaker') html += field('Vollen Satz nehmen', 'md-enemy-group', '');
    const canPlay = wild || g.actions < 3 && !['no', 'double'].includes(type);
    html += `<div class="md-dialog-actions">${c.kind !== 'property' && !wild && g.actions < 3 ? I18n.html`<button class="btn" data-md="bank" data-card="${id}">Als ${c.value} M auf die Bank</button>` : ''}${c.kind !== 'money' && canPlay ? `<button class="btn btn-brass" data-md="use" data-card="${id}" data-wild="${wild}">${wild ? 'Joker umordnen' : c.kind === 'property' ? 'Grundstück auslegen' : 'Aktion spielen'}</button>` : ''}</div>`;
    const d = dialog(c.name, html, 'card:' + id);
    const update = () => {
      if (c.kind === 'property') {
        const color = d.querySelector('#md-color').value, from = wild ? groups.find((g) => g.cards.includes(id))?.id : null;
        d.querySelector('#md-group').innerHTML = option('', 'Automatisch / neuen Satz beginnen') + groups.filter((group) => group.id !== from && group.color === color && group.cards.length < rules.COLORS[color].size).map((group) => option(group.id, `${colorName(color)} (${group.cards.length}/${rules.COLORS[color].size})`)).join('');
      }
      const target = d.querySelector('#md-target')?.value;
      if (d.querySelector('#md-take')) d.querySelector('#md-take').innerHTML = (g.sets[target] || []).filter((group) => !rules.complete(group)).flatMap((group) => group.cards.map((h) => option(h, `${meta(h).name} (${colorName(group.color)})`))).join('');
      if (d.querySelector('#md-enemy-group')) d.querySelector('#md-enemy-group').innerHTML = (g.sets[target] || []).filter(rules.complete).map((group) => option(group.id, colorName(group.color))).join('');
      const use = d.querySelector('[data-md=use]');
      if (use) use.disabled = [...d.querySelectorAll('select')].some((select) => !select.options.length);
    };
    d.querySelector('#md-color')?.addEventListener('change', update); d.querySelector('#md-target')?.addEventListener('change', update); update();
  }
  function pendingDialog(S) {
    const g = S.g, p = g.pending;
    if (!p || p.responder !== S.you?.id) { if (dialogKey.startsWith('pending:')) close(); return; }
    const key = I18n.html`pending:${S.roundNo}:${p.actor}:${p.index}:${p.stage}:${p.chain.length}:${p.responder}`;
    if (dialogKey === key && document.querySelector('#md-dialog')?.open) return;
    if (p.stage === 'react') {
      dialog(p.blocked ? 'Widerspruch beantworten' : 'Aktion gegen dich', I18n.html`<p>${name(S, p.actor)}: ${p.kind === 'payment' ? I18n.html`Forderung über <b>${p.amount} M</b>` : 'Grundstücke übernehmen'}. Du kannst widersprechen; danach kann erneut widersprochen werden.</p><p>${p.chain.length} Widersprüche · ${S.settings.responseTime} Sekunden pro Antwort</p><div class="md-dialog-actions"><button class="btn btn-brass" data-md="respond" data-no="false">${p.blocked ? 'Widerspruch akzeptieren' : 'Aktion zulassen'}</button><button class="btn" data-md="respond" data-no="true" ${g.hand.some((h) => meta(h).action === 'no') ? '' : 'disabled'}>Just Say No</button></div>`, key);
    } else {
      const d = dialog(I18n.html`${p.amount} M bezahlen`, I18n.html`<p>Empfänger: ${name(S, p.actor)}. Tippe Bankwerte oder Grundstücke an. Es gibt kein Wechselgeld; bei zu wenig Vermögen zahlst du alles, was einen Geldwert hat.</p><div class="md-payment">${g.assets.map((a) => I18n.html`<label><input type="checkbox" data-md-pay value="${a.card}" data-value="${a.value}"><span>${esc(meta(a.card).name)}${a.color ? ` · ${colorName(a.color)}` : ' · Bankwert'}<b>${a.value} M</b></span></label>`).join('')}</div><p id="md-pay-total" aria-live="polite">Ausgewählt: 0 M / ${p.amount} M</p><button class="btn btn-brass" data-md="pay">Bezahlen</button>`, key);
      const update = () => {
        const boxes = [...d.querySelectorAll('[data-md-pay]')], selected = boxes.filter((b) => b.checked), total = selected.reduce((s, b) => s + Number(b.dataset.value), 0);
        d.querySelector('#md-pay-total').textContent = I18n.html`Ausgewählt: ${total} M / ${p.amount} M${total > p.amount ? ' · kein Wechselgeld' : ''}`;
        d.querySelector('[data-md=pay]').disabled = total < p.amount && selected.length !== boxes.length;
      };
      d.querySelectorAll('input').forEach((input) => input.addEventListener('change', update)); update();
    }
  }
  const kit = kitGame({
    id: 'monopoly-deal', name: 'Monopoly Deal', ring: false, direction: false,
    short: ['Zwei Karten ziehen (fünf bei leerer Hand), bis zu drei Karten spielen.', 'Geld und Aktionen lassen sich einzahlen. Grundstücke bilden Farbsätze.', 'Forderungen aus Bank oder Auslage bezahlen, ohne Wechselgeld. Just Say No erlaubt Gegenketten.', 'Drei volle Sätze verschiedener Farben gewinnen. Am Zugende höchstens sieben Handkarten.'],
    rules: I18n.html('<h3>Monopoly Deal</h3><p>106 Spielkarten: 20 Geld, 34 Aktionen, 13 Mieten, 28 Grundstücke und 11 Grundstücks-Joker. Start mit fünf Handkarten; zu Zugbeginn zwei ziehen, bei leerer Hand fünf. Bis zu drei Karten spielen, danach höchstens sieben behalten.</p><p>Bankkarten bleiben Bankwerte. Für Miete zählt ein eigener Satz der passenden Farbe; zweifarbige Miete betrifft alle, Wunschmiete einen Spieler. Jede Verdopplung kostet eine zusätzliche Aktion. Bezahlt wird aus Bank und Auslage, ohne Wechselgeld. Zehnfarbige Joker haben keinen Geldwert.</p><p>Just Say No kann von Betroffenen und anschließend vom Angreifer abwechselnd beantwortet werden. Diese Reaktionen kosten keine Aktion. Sly Deal und Forced Deal betreffen nur unfertige Sätze. Deal Breaker übernimmt einen vollen Satz mit Haus und Hotel.</p><p>Joker können im eigenen Zug kostenlos umgeordnet werden; bei aufgelösten Sätzen werden Gebäude zu eigenen Bankwerten. Haus +3 M, Hotel zusätzlich +4 M nur mit Haus, nicht auf Bahnhof oder Werk. Eine aus einem vollständigen Satz gezahlte Einzelkarte löst die Gebäude als Bankwerte beim bisherigen Besitzer. Drei volle verschiedene Farbgruppen gewinnen sofort.</p>'),
    house: (S) => [I18n.html`Antwortfenster: ${S.settings.responseTime} Sekunden`, I18n.html`Aktionszeit: ${S.settings.turnTime || 'unbegrenzt'}`],
    playerInfo: (p) => I18n.html`${p.full || 0}/3 Farben · ${p.money || 0} M · ${p.cards || 0} Handkarten`,
    status: (S) => S.g.pending ? S.g.pending.stage === 'pay' ? 'Zahlung offen' : 'Reaktionsfenster' : I18n.html`Noch ${3 - S.g.actions} Karten · ${S.g.step === 'discard' ? 'Hand auf sieben reduzieren' : 'Grundstücke sammeln'}`,
    hint: (S) => S.g.pending ? I18n.html`${name(S, S.g.pending.responder)} beantwortet die Aktion` : S.g.actor === S.you?.id ? S.g.step === 'discard' ? I18n.html`Wähle ${S.g.hand.length - 7} Karten zum Abwerfen` : 'Karte antippen: auslegen, Aktion spielen oder einzahlen' : I18n.html`${name(S, S.g.actor)} spielt`,
    main(S) {
      if (!rules) return I18n.html('<p>Lade die Karten …</p>');
      const g = S.g, me = S.you?.id;
      return I18n.html`<div class="kg-table md-table">${S.players.filter((p) => p.inRound).map((p) => I18n.html`<section class="md-player ${p.id === me ? 'md-own' : ''}"><header><b>${name(S, p.id)}${p.id === me ? ' · deine Auslage' : ''}</b><span>${p.full}/${S.variant === 'quick' ? 2 : 3} Farben · ${p.cards} Handkarten</span></header><details class="md-bank"><summary>Bank: <b>${p.money} M</b> · ${g.bank[p.id].length} Karten</summary><div>${g.bank[p.id].map((id) => I18n.html`<span>${meta(id).value} M</span>`).join('')}</div></details><div class="md-sets">${g.sets[p.id].map((group) => I18n.html`<div class="md-set ${rules.complete(group) ? 'complete' : ''}" style="--md-color:${rules.COLORS[group.color].hex}"><b>${colorName(group.color)} ${group.cards.length}/${rules.COLORS[group.color].size}</b><div>${group.cards.map((h) => card(h, p.id === me && g.actor === me && !g.pending && meta(h).colors.length > 1 ? `data-g="wild" data-card="${h}"` : 'disabled tabindex="-1"')).join('')}</div><small>Miete ${rules.rent(group)} M${group.house ? ' · Haus' : ''}${group.hotel ? ' · Hotel' : ''}</small></div>`).join('') || I18n.html('<p class="hint">Noch keine Grundstücke</p>')}</div></section>`).join('')}<small>Nachziehen: ${g.deck} · Ablage: ${g.discard.length ? esc(meta(g.discard[0]).name) : I18n.t('leer')}</small></div>`;
    },
    dock(S) {
      if (!rules) return '';
      const g = S.g, own = g.actor === S.you.id && !g.pending;
      return I18n.html`<div class="kg-hand md-hand" aria-label="Deine Handkarten">${(g.hand || []).map((h) => card(h, own ? `data-g="card" data-card="${h}"` : 'disabled', discarded.has(h) ? 'sel' : '')).join('')}</div><div class="kg-acts">${own ? `<button class="btn btn-brass" data-g="end">${g.step === 'discard' ? 'Ausgewählte Karten abwerfen' : 'Zug beenden'}</button>` : g.pending?.responder === S.you.id ? I18n.html('<button class="btn btn-brass" data-g="pending">Offene Aktion beantworten</button>') : ''}</div>`;
    },
    onState(S) { if (S.g?.actor !== S.you?.id || S.g?.step !== 'discard') discarded.clear(); },
    onClick(t, S) {
      if (!rules) return;
      if (t.dataset.g === 'card') { if (S.g.step === 'discard') { const c = t.dataset.card; if (discarded.has(c)) discarded.delete(c); else discarded.add(c); kit.render(); } else openCard(S, t.dataset.card); }
      if (t.dataset.g === 'wild') openCard(S, t.dataset.card, true);
      if (t.dataset.g === 'end') send('endTurn', { cards: [...discarded] });
      if (t.dataset.g === 'pending') pendingDialog(S);
    },
    afterRender(S) { if (rules && S.phase === 'playing') pendingDialog(S); else close(); },
  });
  document.addEventListener('click', (e) => {
    if (session?.game !== 'monopoly-deal' || !rules) return;
    const t = e.target.closest('[data-md]'); if (!t || t.disabled) return;
    const d = document.querySelector('#md-dialog'), action = t.dataset.md;
    if (action === 'close') close();
    if (action === 'bank') perform('bankCard', { card: t.dataset.card });
    if (action === 'respond') perform('respond', { no: t.dataset.no === 'true' });
    if (action === 'pay') perform('pay', { cards: [...d.querySelectorAll('[data-md-pay]:checked')].map((b) => b.value) });
    if (action === 'use') {
      const value = (id) => d.querySelector('#md-' + id)?.value || null, card = t.dataset.card;
      const args = { card, color: value('color'), group: value('enemy-group') || value('group'), target: value('target'), take: value('take'), give: value('give'), boosts: [...d.querySelectorAll('[data-md-boost]:checked')].map((b) => b.value) };
      perform(t.dataset.wild === 'true' ? 'recolor' : meta(card).kind === 'property' ? 'property' : 'dealAction', args);
    }
  });
  import('/games/monopoly-deal/cards.js').then((module) => { rules = module; kit.render(); });
}
