// Gemeinsame Darstellung, ohne Änderungen an Regeln oder Serverzuständen.
'use strict';
const GameDesign = (() => {
  const families = {
    cards: { label: 'Kartenrunde', light: '#285944', dark: '#102d25', tone: 440, accents: ['#E8C481', '#92CFBE', '#E8A990'] },
    dice: { label: I18n.t('Würfelrunde'), light: '#665035', dark: '#29211c', tone: 330, accents: ['#E6B978', '#C3AFE6', '#C7D69C'] },
    board: { label: I18n.t('Zug um Zug'), light: '#35534b', dark: '#182925', tone: 290, accents: ['#B5D3B4', '#9DC7E4', '#E6C28A'] },
    party: { label: I18n.t('Gemeinsam am Tisch'), light: '#4c3c61', dark: '#221c31', tone: 523, accents: ['#D7B3EF', '#E9BB91', '#A4D9D2'] },
    solo: { label: I18n.t('Eine Aufgabe für alle'), light: '#334d70', dark: '#152337', tone: 587, accents: ['#9FC9F0', '#DFBE8B', '#B4DEAE'] },
    drawing: { label: I18n.t('Eure Ideen in Bildern'), light: '#3c5a60', dark: '#172b30', tone: 659, accents: ['#B1DECF', '#ECC58A', '#C0BDF1'] },
    arena: { label: I18n.t('Zusammen in der Arena'), light: '#3c4266', dark: '#1c2335', tone: 392, accents: ['#C2D598', '#EAC77F', '#A8D3EB'] },
  };
  const groups = {
    cards: 'poker omaha maumau farbenchaos zehnetappen stapelrennen schwimmen blackjack mogeln praesident durak sechs-nimmt monopoly-deal hearts five-card-draw omaha-hi-lo short-deck seven-card-stud exploding-deck skat doppelkopf stichmeister',
    dice: 'maexchen schocken kniffel shutthebox zehntausend wuerfelpoker luegenwuerfel chicago wuerfelduell risiko-wuerfeln wuerfeljagd monsterwuerfel wuerfel-auktion',
    board: 'huetchen schiffe viergewinnt muehle reversi dame domino monopoly spiel-des-lebens scotland-yard hex backgammon scrabble schach labyrinth-brett schatzinsel gebietskampf staedtehandel',
    party: 'schaetzmeister schlagfertig werhatdasgesagt tickendes-paket werwolf wer-bin-ich story-chaos zahlenreihe doppelagent luegenbaron regelwahnsinn jaeger-schatten infektionsjagd letzter-schutzplatz geschenkfaenger rhythmus-rausch stillgestanden bomben-duell brueckenroulette reaktor-notfall',
    solo: 'zahlenzoo gedaechtnis-kueche pfeilfieber sortierstation puzzle-panik wortjagd gummiband-challenge turmbauer',
    drawing: 'kritzelpost bildunterschrift malen-raten',
    arena: 'broeckelboden kronenjagd laser-huepfer schubsarena scheinwerfer-flucht minenlauf labyrinth-chaos kistenchaos fallenbauer geschenkdiebe schatzgraeber',
  };
  const scenes = Object.fromEntries(Object.entries(groups).flatMap(([family, ids]) => ids.split(' ').map((id, i) => [id, {
    family, ...families[family], accent: families[family].accents[i % 3], angle: 25 + i * 17, tone: families[family].tone + i * 13,
  }])));
  const scene = (id) => scenes[id] || { family: 'party', ...families.party, accent: families.party.accents[0], angle: 25 };
  const sizes = { normal: 1, large: 1.25, xl: 1.5 };
  const originals = new WeakMap();
  let observer = null, observed = null, refresh = null, frame = 0, effect = null;
  function apply(root, id) {
    if (!root) return;
    const s = scene(id);
    if (root.dataset.scene !== id) {
      root.dataset.scene = id; root.dataset.sceneFamily = s.family;
      root.dataset.sceneLayout = ['cards', 'dice', 'board'].includes(s.family) ? 'table' : 'party';
      root.style.setProperty('--scene-accent', s.accent); root.style.setProperty('--scene-light', s.light);
      root.style.setProperty('--scene-dark', s.dark); root.style.setProperty('--scene-angle', s.angle + 'deg');
    }
    if (!Object.hasOwn(sizes, prefs.cardSize)) prefs.cardSize = 'normal';
    document.body.classList.toggle('cards-l', prefs.cardSize === 'large');
    document.body.classList.toggle('cards-xl', prefs.cardSize === 'xl');
    document.body.classList.toggle('calm', !!prefs.calm);
    root.querySelectorAll('[data-scene-sound]').forEach((button) => { button.disabled = !prefs.sound; });
    if (motionOff()) effect?.cancel();
  }
  const art = (id) => account.games.find((g) => g.id === id)?.art || '';
  // V2-03: ehrliche Kennzeichnung, ob diese Runde in die gewertete Bestenliste zählt (der Server entscheidet und friert beim Start ein)
  const rankedChip = () => {
    const r = typeof lastState === 'object' && lastState?.ranked;
    if (!r || lastState.phase === 'over') return '';
    const why = ({ bots: I18n.t('Computer-Mitspieler dabei'), gast: I18n.t('Gäste ohne Discord-Verknüpfung dabei'), 'zu-wenige': I18n.t('zu wenige registrierte Menschen'), teilnehmer: I18n.t('Teilnehmerkreis änderte sich'), aus: I18n.t('Ranked-Wertung ausgeschaltet') })[r.reason] || '';
    return r.ranked ? I18n.html`<p class="rank-chip on" data-ranked="on">${I18n.t('Gewertet')} · ${I18n.t('zählt für die Bestenliste')}</p>` : I18n.html`<p class="rank-chip off" data-ranked="off">${I18n.t('Nicht gewertet')}${why ? ` · ${why}` : ''} · ${I18n.t('zählt nur für die Statistik')}</p>`;
  };
  const backdrop = (id) => `<div class="scene-backdrop" aria-hidden="true">${art(id)}</div>${rankedChip()}`;
  const hero = (id) => `<div class="scene-hero" aria-hidden="true">${art(id)}<span>${scene(id).label}</span></div>`;
  const cardPreference = () => I18n.html`<label class="field scene-preference"><span>Kartengröße</span><select class="input" data-pref="cardSize" aria-label="Kartengröße">${[['normal', I18n.t('Normal')], ['large', I18n.t('Groß')], ['xl', I18n.t('Sehr groß')]].map(([v, label]) => `<option value="${v}" ${prefs.cardSize === v ? 'selected' : ''}>${label}</option>`).join('')}</select><small>Vergrößert deine Handkarten. Die Einstellung wird in diesem Browser für alle Kartenspiele gespeichert.</small></label>`;
  const soundPreference = () => I18n.html`<button type="button" class="btn btn-ghost" data-scene-sound ${prefs.sound ? '' : 'disabled'}>Ton ausprobieren</button>`;
  function scaleCards(root) {
    const factor = sizes[prefs.cardSize] || 1;
    root.querySelectorAll('.kg-hand .kc').forEach((card) => {
      if (!originals.has(card)) originals.set(card, card.style.getPropertyValue('--w'));
      const original = originals.get(card);
      if (original) card.style.setProperty('--w', original); else card.style.removeProperty('--w');
      const base = getComputedStyle(card).getPropertyValue('--w').trim();
      if (base && factor !== 1) card.style.setProperty('--w', I18n.html`calc(${base} * ${factor})`);
    });
  }
  function fit(root) {
    if (!root.isConnected || !root.getClientRects().length) return;
    scaleCards(root);
    const main = root.querySelector('.kg-main');
    if (!main) return;
    const board = main.querySelector('.rv-board,.dm-board,.mu-board,.hb-wrap,.vg-board');
    if (!board) return;
    const area = main.querySelector('.kt-content') || main, table = board.closest('.kg-table');
    const style = getComputedStyle(area);
    const other = table ? Math.max(0, table.getBoundingClientRect().height - board.getBoundingClientRect().height) : 0;
    const banner = area === main ? main.querySelector('.program-banner') : null;
    const space = Math.max(120, Math.floor(area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - other - (banner ? banner.offsetHeight + (parseFloat(style.rowGap) || 0) : 0) - 8));
    if (main.style.getPropertyValue('--board-space') !== space + 'px') main.style.setProperty('--board-space', space + 'px');
  }
  function watch(root, onResize) {
    if (observed === root) return;
    observer?.disconnect(); observed = root; refresh = onResize;
    observer = new ResizeObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; if (!observed?.isConnected) return; fit(observed); refresh?.(); });
    });
    [root, root.querySelector('.kg-main'), root.querySelector('.kg-dock')].filter(Boolean).forEach((el) => observer.observe(el));
  }
  // Datengestützte, kurze Klangfolgen: leicht pro Spiel verschieden, keine Audiodateien.
  function cue(id, event) {
    const s = scene(id), base = s.tone;
    const note = (freq, ms = 85, at = 0) => ({ freq: Math.round(freq), ms, at, volume: .045, type: ['cards', 'dice', 'board'].includes(s.family) ? 'triangle' : 'sine' });
    if (event === 'win') return [note(base, 130), note(base * 1.25, 130, 100), note(base * 1.5, 200, 200)];
    if (event === 'end') return [note(base, 110), note(base * .75, 150, 100)];
    if (event === 'warn') return [note(base * 1.5, 90), note(base * 1.5, 90, 150)];
    if (event === 'jump') return [note(base, 60), note(base * 1.5, 80, 55)];
    if (event === 'crown' || event === 'done') return [note(base * 1.25), note(base * 1.5, 130, 90)];
    if (event === 'countdown') return [note(base, 60)];
    if (event === 'hit' || event === 'catch') return [note(base * .6, 120)];
    if (event === 'drum') return [note(base * .8, 140), note(base * 1.2, 110, 100)];
    if (event === 'shuffle') return [note(base * .75, 60), note(base, 60, 70), note(base * 1.25, 80, 140)];
    return [note(base, 65)];
  }
  function sound(id, event) {
    if (!prefs.sound) return false;
    if (event === 'dice' || event === 'splash' || event === 'call') { sfx(event); return true; }
    cue(id, event).forEach((n) => setTimeout(() => beep(n.freq, n.ms, n.volume, n.type), n.at));
    return true;
  }
  function pulse(root, event) {
    if (motionOff() || !root) return false;
    const area = root.querySelector('.kg-main,.table-wrap');
    if (!area?.animate) return false;
    effect?.cancel();
    effect = area.animate([{ boxShadow: 'inset 0 0 0 1px transparent' }, { boxShadow: I18n.html`inset 0 0 0 3px ${scene(root.dataset.scene).accent}` }, { boxShadow: 'inset 0 0 0 1px transparent' }], { duration: event === 'win' ? 450 : 220 });
    return true;
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-scene-sound]')) sound(session?.game, 'done');
  });
  return { scenes, scene, sizes, apply, backdrop, hero, cardPreference, soundPreference, scaleCards, fit, watch, cue, sound, pulse };
})();
