'use strict';
// Szene „Winterfenster“: Nachthimmel, Schnee, Fensterbrett als Fanglinie. Alles original mit Canvas/SVG gezeichnet.
(() => {
  const tx = (de, en) => I18n.content(de, en);
  const FLOOR = 545, KIND = { small: ['#d6453d', '#f1d78a', 22], big: ['#4a7fd1', '#fff2c8', 30], gold: ['#f0c23b', '#fff6c8', 28] };
  const itemY = (i, t) => -30 + (t - i.t0) * i.speed / 1000;
  function item(ctx, i, y) {
    ctx.save(); ctx.translate(i.x, y);
    if (i.kind === 'bomb') {
      ctx.fillStyle = '#17171c'; ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c99a45'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, -16); ctx.quadraticCurveTo(18, -28, 26, -24); ctx.stroke();
      ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(27, -25, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      const [box, ribbon, s] = KIND[i.kind];
      if (i.kind === 'gold') { ctx.shadowColor = '#ffd75a'; ctx.shadowBlur = 18; }
      ctx.fillStyle = box; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.shadowBlur = 0;
      ctx.fillStyle = ribbon; ctx.fillRect(-3, -s / 2, 6, s); ctx.fillRect(-s / 2, -3, s, 6);
      ctx.beginPath(); ctx.arc(-6, -s / 2 - 3, 6, 0, Math.PI * 2); ctx.arc(6, -s / 2 - 3, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  arcadeGame({
    id: 'geschenkfaenger', kind: 'gift', de: 'Geschenkfänger', en: 'Gift Catch', tag: 'WINTERFENSTER / WINTER WINDOW', colors: ['#1d2a4a', '#f1d78a'],
    brief: ['Fang Geschenke, weich den Bomben aus – der Server zählt jeden Treffer.', 'Catch gifts, dodge the bombs – the server counts every catch.'],
    alt: ['Gemeinsamer Geschenkfall. Dein Korb hat einen weißen Rand. Punkte stehen unter dem Feld.', 'Shared gift fall. Your basket has a white outline. Scores are below the field.'],
    hint: ['Korb bewegen: Pfeiltasten oder A/D, am Handy die Knöpfe halten.', 'Move the basket: arrow keys or A/D; hold the buttons on a phone.'],
    fair: ['Alle sehen denselben Fall (gleicher Seed), jede Person fängt für sich. Körbe, Fall und Treffer berechnet der Server nach seiner Uhr.', 'Everyone sees the same fall (same seed) and catches for themselves. The server computes baskets, fall and catches on its own clock.'],
    rules: [
      ['Alle sehen denselben Fall von Geschenken und Bomben (gleicher Seed); jede Person fängt mit dem eigenen Korb.', 'Everyone sees the same fall of gifts and bombs (same seed); each person catches with their own basket.'],
      ['Den Korb bewegst du nach links und rechts: Pfeiltasten, A/D oder die gehaltenen Knöpfe am Handy.', 'Move the basket left and right: arrow keys, A/D or the held buttons on a phone.'],
      ['Kleine Geschenke geben 10, große 20 Punkte; optional gibt es goldene Geschenke mit 50. Eine Bombe nimmt 30 Punkte weg (nie unter null).', 'Small gifts give 10, large ones 20 points; optionally golden gifts give 50. A bomb takes away 30 points (never below zero).'],
      ['Optional wird der Korb mit jeder Bombe kleiner.', 'Optionally the basket shrinks with every bomb.'],
      ['Der Server berechnet Korb, Fall und Treffer; nach Ablauf der Spielzeit gewinnt die höchste Punktzahl, Gleichstand teilt den Sieg.', 'The server computes basket, fall and catches; when time is up the highest score wins and a tie shares the win.'],
    ],
    scene: '<svg class="game-art" viewBox="0 0 240 140" aria-hidden="true"><rect x="5" y="5" width="230" height="130" rx="18" fill="#1d2a4a" stroke="#f1d78a"/><circle cx="190" cy="34" r="14" fill="#f4efd0"/><g fill="#fff" opacity=".8"><circle cx="30" cy="25" r="2"/><circle cx="70" cy="48" r="2"/><circle cx="120" cy="20" r="2"/><circle cx="160" cy="62" r="2"/><circle cx="210" cy="80" r="2"/></g><rect x="62" y="30" width="22" height="22" fill="#d6453d"/><path d="M73 30v22M62 41h22" stroke="#f1d78a" stroke-width="4"/><circle cx="140" cy="48" r="11" fill="#17171c" stroke="#8a8a96"/><path d="M146 38l6-8" stroke="#c99a45" stroke-width="3"/><path d="M86 98h68l-8 22H94z" fill="#c99a45"/><rect x="5" y="122" width="230" height="13" fill="#e9e5d6"/></svg>',
    state: (f, S) => { const m = f.bodies.find((p) => p.id === S.you?.id); return `${tx('Dein Stand', 'Your score')}: ${m?.points ?? 0}`; },
    row: (p) => `${tx('Korb', 'Basket')} ${Math.round(p.w)}`,
    background(c) {
      const g = c.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, '#111a36'); g.addColorStop(1, '#2a3a63'); c.fillStyle = g; c.fillRect(0, 0, 900, 600);
      c.fillStyle = '#f4efd0'; c.beginPath(); c.arc(790, 70, 28, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1d2a4a'; c.beginPath(); c.arc(802, 62, 26, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${.25 + (i % 5) * .12})`; c.beginPath(); c.arc((i * 137) % 900, (i * 71) % 520, 1 + i % 3 * .6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#e6e2d2'; c.fillRect(0, 578, 900, 22); c.fillStyle = '#b8a98a'; c.fillRect(0, 570, 900, 9);
      c.strokeStyle = '#ffffff22'; c.setLineDash([10, 14]); c.beginPath(); c.moveTo(0, FLOOR); c.lineTo(900, FLOOR); c.stroke();
    },
    paint(c, v) {
      const f = v.f, caught = new Set((f.fx || []).filter((x) => x.kind !== 'bomb').map((x) => x.id));
      for (const i of f.items) { const y = itemY(i, v.t); if (y > 640 || y < -60 || (caught.has(i.id) && y >= FLOOR - 6)) continue; item(c, i, y); }
      for (const p of v.bodies) {
        const self = p.id === v.self, w = p.w || 110;
        c.save(); c.globalAlpha = self ? 1 : .7; c.fillStyle = v.color(p.i); c.strokeStyle = self ? '#fff' : '#152523'; c.lineWidth = self ? 5 : 3;
        c.beginPath(); c.moveTo(p.x - w / 2, FLOOR - 14); c.lineTo(p.x + w / 2, FLOOR - 14); c.lineTo(p.x + w / 2 - 12, FLOOR + 20); c.lineTo(p.x - w / 2 + 12, FLOOR + 20); c.closePath(); c.fill(); c.stroke();
        c.restore(); ArcadeDraw.label(c, v.name(p.id), p.x, FLOOR + 46, self ? 22 : 17);
        if (p.hit && f.elapsed - p.hit < 500) { c.fillStyle = '#ff586d55'; c.beginPath(); c.arc(p.x, FLOOR, w / 2 + 12, 0, Math.PI * 2); c.fill(); }
      }
      const me = v.me;
      for (const x of f.fx || []) { const age = f.elapsed - x.at; if (age > 800 || !me) continue; c.save(); c.globalAlpha = 1 - age / 800; ArcadeDraw.label(c, (x.gain > 0 ? '+' : '') + x.gain, me.x, FLOOR - 40 - age / 12, 30); c.restore(); }
      c.textAlign = 'left'; c.font = 'bold 40px system-ui'; c.fillStyle = '#fff'; c.fillText(String(me?.points ?? 0), 24, 56);
    },
  });
})();
