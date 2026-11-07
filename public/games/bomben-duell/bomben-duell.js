'use strict';
// Szene „Sprengwerkstatt“: Pflasterboden, Steinpfeiler, Holzkisten, Lunten. Alles original mit Canvas/SVG gezeichnet.
(() => {
  const tx = (de, en) => I18n.content(de, en), T = 60, FUSE = 2200, FLAME = 450;
  arcadeGame({
    id: 'bomben-duell', kind: 'bomb', de: 'Bomben-Duell', en: 'Bomb Duel', tag: 'SPRENGWERKSTATT / BLAST WORKSHOP', colors: ['#33261f', '#ff8a3d'],
    brief: ['Bomben legen, Kisten sprengen und rechtzeitig in Deckung gehen.', 'Place bombs, blast crates and take cover in time.'],
    alt: ['Raster mit Pfeilern, Kisten, Bomben und Spielfiguren. Punkte stehen unter dem Feld.', 'Grid with pillars, crates, bombs and tokens. Scores are below the field.'],
    hint: ['Bewegen: Pfeiltasten/WASD, Bombe: Leertaste; am Handy Richtungsknöpfe und Bombenknopf.', 'Move: arrow keys/WASD, bomb: Space; direction pad and bomb button on a phone.'],
    fair: ['Die Zündschnur ist für alle sichtbar. Der Server berechnet Bewegung, Explosion, Kettenreaktion und Punkte; der Client sendet nur Richtungen und das Legen.', 'The fuse is visible to everyone. The server computes movement, blasts, chain reactions and points; the client only sends directions and placing.'],
    rules: [
      ['Alle bewegen sich gleichzeitig Feld für Feld auf einem Raster mit festen Pfeilern und zerstörbaren Kisten (Pfeiltasten/WASD oder Richtungsknöpfe).', 'Everyone moves simultaneously, cell by cell, on a grid with fixed pillars and destructible crates (arrow keys/WASD or direction buttons).'],
      ['Mit Leertaste oder Bombenknopf legst du eine Bombe (eine gleichzeitig). Ihre Zündschnur ist sichtbar und läuft etwa zwei Sekunden.', 'Space or the bomb button places a bomb (one at a time). Its fuse is visible and burns for about two seconds.'],
      ['Die Explosion reicht zwei Felder in vier Richtungen, wird von Pfeilern gestoppt, sprengt die erste Kiste und zündet andere Bomben. Wer in den Flammen steht, scheidet aus.', 'The blast reaches two cells in four directions, is stopped by pillars, destroys the first crate and sets off other bombs. Anyone standing in the flames is out.'],
      ['Pro Runde gibt es so viele Punkte, wie vor dir ausgeschieden sind; Überlebende erhalten die Zahl aller Ausgeschiedenen. Nach den eingestellten Runden gewinnt die höchste Summe.', 'Each round you score as many points as players left before you; survivors score the number of everyone eliminated. After the set rounds the highest total wins.'],
      ['Der Server berechnet Bewegung, Zündschnur, Explosion und Punkte; Eingaben vom Client sind nur Richtungen und das Legen.', 'The server computes movement, fuse, blast and points; client input is only directions and placing.'],
    ],
    scene: '<svg class="game-art" viewBox="0 0 240 140" aria-hidden="true"><rect x="5" y="5" width="230" height="130" rx="18" fill="#33261f" stroke="#ff8a3d"/><rect x="25" y="25" width="30" height="30" fill="#6b6b73"/><rect x="85" y="25" width="30" height="30" fill="#8b6b4a"/><path d="M85 25l30 30M115 25L85 55" stroke="#5a432d" stroke-width="3"/><circle cx="170" cy="85" r="22" fill="#17171c" stroke="#8a8a96" stroke-width="3"/><path d="M183 68l10-12" stroke="#c99a45" stroke-width="4"/><path d="M198 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ff8a3d"/><path d="M30 105h70" stroke="#ff8a3d" stroke-width="10" stroke-linecap="round" opacity=".6"/></svg>',
    state: (f, S) => { const m = f.bodies.find((p) => p.id === S.you?.id); return `${tx('Runde', 'Round')} ${f.q + 1}/${f.total} · ${m?.alive ? tx('im Spiel', 'in play') : tx('ausgeschieden', 'out')}`; },
    row: () => tx('im Spiel', 'in play'),
    background(c) {
      for (let y = 0; y < 10; y++) for (let x = 0; x < 15; x++) {
        c.fillStyle = (x + y) % 2 ? '#4a3a2c' : '#42342a'; c.fillRect(x * T, y * T, T, T);
        if (x % 2 === 1 && y % 2 === 1) { c.fillStyle = '#6f707a'; c.fillRect(x * T + 2, y * T + 2, T - 4, T - 4); c.fillStyle = '#8b8d98'; c.fillRect(x * T + 2, y * T + 2, T - 4, 8); c.fillStyle = '#4e4f58'; c.fillRect(x * T + 2, y * T + T - 10, T - 4, 8); }
      }
    },
    paint(c, v) {
      const f = v.f;
      for (let i = 0; i < f.cells.length; i++) if (f.cells[i] === '2') {
        const x = i % 15 * T, y = Math.floor(i / 15) * T;
        c.fillStyle = '#a07a4c'; c.fillRect(x + 4, y + 4, T - 8, T - 8); c.strokeStyle = '#5a3f22'; c.lineWidth = 4; c.strokeRect(x + 6, y + 6, T - 12, T - 12);
        c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + T - 8, y + T - 8); c.moveTo(x + T - 8, y + 8); c.lineTo(x + 8, y + T - 8); c.stroke();
      }
      for (const [i, until] of f.flames) {
        const x = i % 15 * T, y = Math.floor(i / 15) * T, a = Math.max(0, Math.min(1, (until - v.t) / FLAME));
        c.fillStyle = `rgba(255,${120 + 80 * a | 0},40,${.35 + a * .55})`; c.fillRect(x + 3, y + 3, T - 6, T - 6);
        c.fillStyle = `rgba(255,240,180,${a * .8})`; c.fillRect(x + 16, y + 16, T - 32, T - 32);
      }
      for (const b of f.bombs) {
        const x = b.cx * T + T / 2, y = b.cy * T + T / 2, left = b.explodeAt - v.t, urgent = left < 700, pulse = 1 + Math.sin(v.t / (urgent ? 40 : 120)) * .08;
        c.save(); c.translate(x, y); c.scale(pulse, pulse);
        c.fillStyle = urgent && Math.floor(v.t / 80) % 2 ? '#7a1f1f' : '#17171c'; c.strokeStyle = '#8a8a96'; c.lineWidth = 3; c.beginPath(); c.arc(0, 4, 19, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#c99a45'; c.lineWidth = 4; c.beginPath(); c.moveTo(8, -12); c.quadraticCurveTo(14, -22, 20, -18); c.stroke();
        c.fillStyle = '#ffb347'; c.beginPath(); c.arc(21, -19, 4 + (left / FUSE) * 3, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      for (const p of v.bodies) if (p.alive) {
        ArcadeDraw.token(c, p, v, p.y - 4, 20);
        ArcadeDraw.label(c, v.name(p.id).slice(0, 10), p.x, p.y - 30, p.id === v.self ? 17 : 13);
      }
    },
  });
})();
