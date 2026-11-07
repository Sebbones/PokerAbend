'use strict';
// Szene „Neon-Bühne“: dunkle Bühne, leuchtende Bahnen, Trefferlinie. Alles original mit Canvas/SVG gezeichnet.
(() => {
  const tx = (de, en) => I18n.content(de, en);
  const LINE = 500, SPEED = 520 / 2300, LANE_COLORS = ['#f1d78a', '#7ad7c1', '#ef8196', '#9ab4ff'];
  const GRADE = { p: ['PERFECT', '#ffe27a'], g: ['GOOD', '#8fe3b0'], o: ['OK', '#b8c4d8'], m: ['MISS', '#ff7a8a'] };
  const geometry = (lanes) => { const lw = lanes === 1 ? 240 : 124; return { lw, x0: 450 - lanes * lw / 2 - 40 }; };
  arcadeGame({
    id: 'rhythmus-rausch', kind: 'rhythm', de: 'Rhythmus-Rausch', en: 'Rhythm Rush', tag: 'NEON-BÜHNE / NEON STAGE', colors: ['#2a2150', '#7ad7c1'],
    brief: ['Tippe im Takt: Je genauer, desto mehr Punkte.', 'Tap on the beat: the more precise, the more points.'],
    alt: ['Bahnen mit herabfallenden Noten und Trefferlinie. Punkte und Serie stehen im Feld und darunter.', 'Lanes with falling notes and a hit line. Scores and combo are in the field and below.'],
    hint: ['Tasten D F J K oder Pfeiltasten, am Handy die Felder tippen.', 'Keys D F J K or arrow keys; tap the pads on a phone.'],
    fair: ['Alle bekommen dieselbe Notenfolge. Der Server wertet jeden Tipp mit der Serverzeit; nur die selbst gemessene Verzögerung deiner Verbindung (höchstens 200 ms) wird ausgeglichen.', 'Everyone gets the same note chart. The server judges every tap by server time; only your connection\'s self-measured delay (at most 200 ms) is compensated.'],
    rules: [
      ['Alle bekommen dieselbe Notenfolge (gleicher Seed); die Noten laufen in vier Bahnen auf die Trefferlinie zu.', 'Everyone gets the same note chart (same seed); the notes run towards the hit line in four lanes.'],
      ['Tippe die Bahn genau dann, wenn die Note die Linie erreicht: Tasten D F J K oder ← ↓ ↑ →, am Handy die vier Felder.', 'Tap the lane exactly when the note reaches the line: keys D F J K or ← ↓ ↑ →, the four pads on a phone.'],
      ['Perfekt (±60 ms) gibt 100, gut (±130 ms) 60 und knapp (±200 ms) 25 Punkte. Serien aus perfekten und guten Treffern geben bis zu 50 Bonuspunkte pro Note.', 'Perfect (±60 ms) gives 100, good (±130 ms) 60 and close (±200 ms) 25 points. Streaks of perfect and good hits give up to 50 bonus points per note.'],
      ['Verpasste Noten und Fehltipps unterbrechen die Serie; ein Fehltipp kostet 10 Punkte.', 'Missed notes and stray taps break the streak; a stray tap costs 10 points.'],
      ['Der Server wertet jeden Tipp mit seiner Zeit; nur die selbst gemessene Verzögerung deiner Verbindung (höchstens 200 ms) wird ausgeglichen. Die höchste Punktzahl gewinnt.', 'The server judges every tap by its own time; only your connection\'s self-measured delay (at most 200 ms) is compensated. The highest score wins.'],
    ],
    scene: '<svg class="game-art" viewBox="0 0 240 140" aria-hidden="true"><rect x="5" y="5" width="230" height="130" rx="18" fill="#2a2150" stroke="#7ad7c1"/><g stroke="#5a468f" stroke-width="3"><path d="M60 10v120M100 10v120M140 10v120M180 10v120"/></g><rect x="50" y="25" width="20" height="14" rx="4" fill="#f1d78a"/><rect x="130" y="50" width="20" height="14" rx="4" fill="#7ad7c1"/><rect x="90" y="76" width="20" height="14" rx="4" fill="#ef8196"/><rect x="170" y="38" width="20" height="14" rx="4" fill="#9ab4ff"/><path d="M40 108h160" stroke="#fff" stroke-width="4"/></svg>',
    state: () => tx('Im Takt tippen', 'Tap on the beat'),
    row: (p) => `${tx('Serie', 'Combo')} ${p.combo}`,
    background(c) {
      const g = c.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, '#120c2b'); g.addColorStop(1, '#2a1d52'); c.fillStyle = g; c.fillRect(0, 0, 900, 600);
      for (let i = 0; i < 24; i++) { c.fillStyle = `rgba(${i % 2 ? '122,215,193' : '239,129,150'},.07)`; c.beginPath(); c.arc((i * 211) % 900, (i * 97) % 600, 40 + (i % 5) * 18, 0, Math.PI * 2); c.fill(); }
    },
    paint(c, v) {
      const f = v.f, lanes = f.lanes, { lw, x0 } = geometry(lanes);
      for (let i = 0; i < lanes; i++) {
        const x = x0 + i * lw, glow = Math.max(0, 1 - (v.now - v.flash[i]) / 160);
        c.fillStyle = `rgba(255,255,255,${.05 + glow * .22})`; c.fillRect(x + 3, 0, lw - 6, 600);
        c.fillStyle = LANE_COLORS[lanes === 1 ? 0 : i] + '33'; c.fillRect(x + 3, LINE - 30, lw - 6, 60);
        c.strokeStyle = LANE_COLORS[lanes === 1 ? 0 : i]; c.lineWidth = 2; c.strokeRect(x + 3, LINE - 30, lw - 6, 60);
      }
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, LINE); c.lineTo(x0 + lanes * lw, LINE); c.stroke();
      for (const n of f.notes) {
        if (n.j === 'p' || n.j === 'g' || n.j === 'o') continue;
        const y = LINE - (n.t - v.t) * SPEED; if (y < -30 || y > 640) continue;
        const x = x0 + n.lane * lw; c.globalAlpha = n.j === 'm' ? .3 : 1; c.fillStyle = LANE_COLORS[lanes === 1 ? 0 : n.lane];
        c.beginPath(); c.roundRect(x + 14, y - 14, lw - 28, 28, 10); c.fill(); c.globalAlpha = 1;
      }
      const last = f.last;
      if (last && f.elapsed - last.at < 700) {
        const key = last.grade === 'perfect' ? 'p' : last.grade === 'good' ? 'g' : last.grade === 'ok' ? 'o' : last.grade === 'miss' ? 'm' : null, [text, color] = key ? GRADE[key] : ['STRAY', '#ff9a7a'];
        c.save(); c.globalAlpha = 1 - (f.elapsed - last.at) / 700; c.fillStyle = color; c.font = 'bold 44px system-ui'; c.textAlign = 'center'; c.fillText(text, x0 + lanes * lw / 2, LINE - 70 - (f.elapsed - last.at) / 20); c.restore();
      }
      const me = v.me; c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = 'bold 40px system-ui'; c.fillText(String(me?.points ?? 0), 24, 56);
      if (me?.combo > 1) { c.fillStyle = '#ffe27a'; c.font = 'bold 28px system-ui'; c.fillText(`${tx('Serie', 'Combo')} ×${me.combo}`, 24, 94); }
      // Rangliste rechts: öffentliche Punkte aller Spielenden
      c.textAlign = 'left'; c.font = '600 18px system-ui';
      [...v.bodies].sort((a, b) => b.points - a.points).forEach((p, k) => { c.fillStyle = p.id === v.self ? '#fff' : '#c9c3e0'; c.fillText(`${k + 1}. ${v.name(p.id).slice(0, 10)}  ${p.points}`, 735, 40 + k * 26); });
    },
  });
})();
