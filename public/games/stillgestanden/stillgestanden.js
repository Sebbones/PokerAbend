'use strict';
// Szene „Ampelstrecke“: Dämmerung, Zielband oben, große Ampel links. Alles original mit Canvas/SVG gezeichnet.
(() => {
  const tx = (de, en) => I18n.content(de, en);
  const LIGHT = { green: '#4ac26b', amber: '#f0b429', red: '#e5483f' };
  function lamp(c, y, on, color) {
    c.fillStyle = on ? color : '#2a2a2a'; c.shadowColor = color; c.shadowBlur = on ? 28 : 0;
    c.beginPath(); c.arc(46, y, 22, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
  }
  arcadeGame({
    id: 'stillgestanden', kind: 'freeze', de: 'Stillgestanden!', en: 'Freeze!', tag: 'AMPELSTRECKE / SIGNAL TRACK', colors: ['#2b2a2a', '#e5483f'],
    brief: ['Bei Grün laufen, bei Rot stillstehen – wer sich bewegt, muss zurück.', 'Run on green, freeze on red – move and you go back.'],
    alt: ['Laufstrecke mit Ampel. Jede Spielfigur läuft in ihrer Bahn nach oben zum Ziel. Fortschritt steht unter dem Feld.', 'Race track with a traffic light. Each token runs up its lane to the finish. Progress is below the field.'],
    hint: ['Laufen: ↑, W oder Leertaste halten; am Handy den Laufknopf halten.', 'Run: hold ↑, W or Space; hold the run button on a phone.'],
    fair: ['Der Server wählt die Signale zufällig und entscheidet über Strafen. Nach dem Wechsel auf Rot gibt es eine Gnadenfrist, die sich um deine selbst gemessene Verzögerung verlängert (höchstens 200 ms).', 'The server picks the signals at random and decides penalties. After the switch to red there is a grace period that grows with your self-measured delay (at most 200 ms).'],
    rules: [
      ['Alle starten an derselben Linie und laufen in Echtzeit zum Ziel. Laufen: ↑, W oder Leertaste halten, am Handy den Laufknopf halten.', 'Everyone starts at the same line and runs to the finish in real time. Run: hold ↑, W or Space; hold the run button on a phone.'],
      ['Bei Grün darfst du laufen. Gelb kündigt Rot an, bei Rot musst du stillstehen – die Signale kommen zufällig.', 'You may run on green. Amber announces red; on red you must stand still – the signals come at random.'],
      ['Wer sich bei Rot bewegt, geht zurück zum Start (oder steht ohne Rückkehr zwei Sekunden still). Nach dem Wechsel auf Rot gibt es eine kurze, an deine Verbindung angepasste Gnadenfrist.', 'If you move on red you go back to the start (or, without return, stand still for two seconds). After the switch to red there is a short grace period adapted to your connection.'],
      ['Optional gibt es ein Fake-Signal: ein kurzes Rot ohne Strafe.', 'Optionally there is a fake signal: a brief red without penalty.'],
      ['Wer zuerst das Ziel erreicht, gewinnt; läuft die Zeit ab, gewinnt der weiteste Lauf. Der Server entscheidet über Signale, Bewegung und Strafen.', 'The first to reach the finish wins; when time runs out the furthest run wins. The server decides signals, movement and penalties.'],
    ],
    scene: '<svg class="game-art" viewBox="0 0 240 140" aria-hidden="true"><rect x="5" y="5" width="230" height="130" rx="18" fill="#2b2a2a" stroke="#e5483f"/><rect x="180" y="20" width="30" height="86" rx="15" fill="#151515"/><circle cx="195" cy="38" r="9" fill="#e5483f"/><circle cx="195" cy="63" r="9" fill="#4a4328"/><circle cx="195" cy="88" r="9" fill="#2f5a3b"/><path d="M20 112h150" stroke="#8a8a8a" stroke-width="3" stroke-dasharray="8 6"/><circle cx="70" cy="48" r="11" fill="#e8c68b"/><path d="M70 59v26m-16-12 16-6 16 6m-16 12-12 20m12-20 12 20" stroke="#e8c68b" stroke-width="6" fill="none" stroke-linecap="round"/></svg>',
    state: (f) => f.signal === 'green' ? tx('GRÜN – laufen!', 'GREEN – run!') : f.signal === 'amber' ? tx('GELB – gleich Rot!', 'AMBER – red is coming!') : tx('ROT – stillstehen!', 'RED – stand still!'),
    row: (p) => `${Math.round((p.prog || 0) * 100)} %${p.stun > 0 ? ' ⏸' : ''}`,
    background(c) {
      const g = c.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, '#2c2a3f'); g.addColorStop(.35, '#5a3f4a'); g.addColorStop(1, '#232a24'); c.fillStyle = g; c.fillRect(0, 0, 900, 600);
      c.fillStyle = '#2f3a2e'; c.fillRect(0, 90, 900, 510);
      c.strokeStyle = '#ffffff22'; c.lineWidth = 2; for (let y = 120; y < 600; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(900, y); c.stroke(); }
      c.fillStyle = '#e8e0c8'; c.fillRect(0, 568, 900, 5);
      for (let i = 0; i < 45; i++) { c.fillStyle = (i + (i / 45 | 0)) % 2 ? '#fff' : '#111'; c.fillRect(i * 20, 52, 20, 14); c.fillStyle = i % 2 ? '#111' : '#fff'; c.fillRect(i * 20, 66, 20, 14); }
    },
    paint(c, v) {
      const f = v.f;
      for (const p of v.bodies) { c.fillStyle = '#ffffff0d'; c.fillRect(p.x - 38, 82, 76, 488); }
      c.fillStyle = '#151515'; c.beginPath(); c.roundRect(14, 120, 64, 200, 30); c.fill();
      lamp(c, 160, f.signal === 'red', LIGHT.red); lamp(c, 220, f.signal === 'amber', LIGHT.amber); lamp(c, 280, f.signal === 'green', LIGHT.green);
      if (f.signal !== 'green') { c.save(); c.strokeStyle = LIGHT[f.signal]; c.globalAlpha = .55 + Math.sin(v.now / 90) * .2; c.lineWidth = 10; c.strokeRect(5, 5, 890, 590); c.restore(); }
      if (f.signal === 'red') { c.fillStyle = '#e5483f14'; c.fillRect(0, 0, 900, 600); }
      for (const p of [...v.bodies].sort((a, b) => a.y - b.y)) {
        ArcadeDraw.token(c, p, v, p.y - (p.stun > 0 ? 4 + Math.sin(v.now / 70) * 3 : 0));
        ArcadeDraw.label(c, v.name(p.id), p.x, Math.max(106, p.y - 34), p.id === v.self ? 21 : 16);
        if (f.elapsed - p.hitAt < 900 && p.hitAt >= 0) ArcadeDraw.label(c, tx('Bewegt!', 'Moved!'), p.x, p.y - 58, 20);
        if (p.done) ArcadeDraw.label(c, '🏁', p.x, p.y - 50, 30);
      }
    },
  });
})();
