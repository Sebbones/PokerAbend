// Existing Hold'em chip helpers, shared without running either game controller.
'use strict';
window.PokerChips = {create({getState,$,$$}) {
function chipClass(n) {
  const bb = getState()?.settings?.bigBlind || 100;
  const x = n / bb;
  return x >= 50 ? 'c5' : x >= 20 ? 'c4' : x >= 5 ? 'c3' : x >= 2 ? 'c2' : 'c1';
}
// Chip-Stapel: 1–3 Chips je nach Höhe (in Big Blinds)
function chipStack(n, max = 3) {
  const x = n / (getState()?.settings?.bigBlind || 100);
  const count = Math.min(max, x < 2 ? 1 : x < 10 ? 2 : x < 30 ? 3 : x < 80 ? 4 : 5);
  return `<span class="stack" aria-hidden="true">${`<span class="chip ${chipClass(n)}"></span>`.repeat(count)}</span>`;
}



function animateChips(a, b) {
  if (prefs.calm || !a?.hand || !b?.hand || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sameHand = a.hand.no === b.hand.no;
  const streetChanged = sameHand && (a.hand.street !== b.hand.street);
  if (!streetChanged) return;
  const potEl = $('#pot');
  if (!potEl) return;
  const target = potEl.getBoundingClientRect();
  const tx = target.left + target.width / 2; const ty = target.top + target.height / 2;
  const flights = [];
  $$('.bet').forEach((el) => {
    const r = el.getBoundingClientRect();
    const f = el.cloneNode(true);
    f.classList.add('flying'); f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.style.transform = 'none';
    document.body.appendChild(f); flights.push([f, tx - r.left - r.width / 2, ty - r.top - r.height / 2]);
  });
  const winners = b.hand.done ? [...new Set(b.hand.result?.pots.flatMap((p) => p.winners) || [])] : [];
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const [f, dx, dy] of flights) { f.style.transform = I18n.html`translate(${dx}px, ${dy}px) scale(.8)`; f.style.opacity = '0'; }
    setTimeout(() => { flights.forEach(([f]) => f.remove()); potEl.classList.add('pulse'); setTimeout(() => potEl.classList.remove('pulse'), 400); }, 400);
    if (winners.length) {
      setTimeout(() => {
        for (const w of winners) {
          const seat = $(`.seat[data-seat="${w}"] .plate`); if (!seat) continue;
          const r = seat.getBoundingClientRect();
          const f = document.createElement('div'); f.className = 'flying';
          f.innerHTML = `<span class="chip c5" style="width:26px;height:26px;display:block"></span>`;
          f.style.left = tx + 'px'; f.style.top = ty + 'px';
          document.body.appendChild(f);
          requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transform = I18n.html`translate(${r.left + r.width / 2 - tx}px, ${r.top - ty}px)`; f.style.opacity = '.2'; }));
          setTimeout(() => f.remove(), 420);
        }
      }, 420);
    }
  }));
}


return {chipClass,chipStack,animateChips};
}};
