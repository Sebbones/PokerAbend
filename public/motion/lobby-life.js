// EXP-F5 Lobby-Leben: Wer sich an den Tisch setzt, rutscht sichtbar auf seinen Platz (Stuhlrücken),
// wer aufsteht, hebt sich kurz an und verblasst. Nur Darstellung: Grundlage ist allein die Spielerliste vom Server.
// Erster Stand eines Tisches (Betreten, Neuladen, Wiederverbinden) wird nur gemerkt, nie animiert.
const MAX_ANIMATED = 8;
const seatedIds = (state) => (state?.players || []).filter((p) => p.seated || p.inRound).map((p) => p.id);
const visible = (el) => el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden]');
const cssEscape = (value) => (globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&'));

export function createLobbyLife({ sound = () => globalThis.Sound, reduced = () => false, host = globalThis } = {}) {
  let table = null, known = new Set(), snapshot = new Map(), animations = new Set();
  const doc = host.document;
  function track(animation) { if (!animation) return; animations.add(animation); animation.finished?.catch(() => {}).finally?.(() => animations.delete(animation)); }
  function seatsOf(root, id) { return [...root.querySelectorAll(`[data-pid="${cssEscape(id)}"]`)].filter(visible); }
  function remember(root, ids) {
    snapshot = new Map();
    for (const id of ids) {
      const el = seatsOf(root, id)[0];
      if (el) { const r = el.getBoundingClientRect(); snapshot.set(id, { html: el.outerHTML, rect: { left: r.left, top: r.top, width: r.width, height: r.height } }); }
    }
  }
  function sit(root, ids) {
    for (const id of ids.slice(0, MAX_ANIMATED)) for (const el of seatsOf(root, id)) {
      el.dataset.seatJoined = '';
      if (reduced() || !el.animate) continue;
      track(el.animate([{ transform: 'translateY(-12px) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }));
    }
  }
  function stand(ids) {
    if (reduced() || !doc?.body) return;
    for (const id of ids.slice(0, MAX_ANIMATED)) {
      const last = snapshot.get(id);
      if (!last || !last.rect.width) continue;
      const ghost = doc.createElement('div');
      ghost.className = 'seat-ghost'; ghost.setAttribute('aria-hidden', 'true'); ghost.dataset.seatGhost = id;
      ghost.innerHTML = last.html;
      Object.assign(ghost.style, { position: 'fixed', left: last.rect.left + 'px', top: last.rect.top + 'px', width: last.rect.width + 'px', height: last.rect.height + 'px', margin: '0', pointerEvents: 'none', zIndex: '40' });
      doc.body.append(ghost);
      const animation = ghost.animate?.([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      if (!animation) { ghost.remove(); continue; }
      track(animation); animation.finished.catch(() => {}).finally(() => ghost.remove());
    }
  }
  return {
    observe(state, root) {
      if (!state || !root) return;
      const ids = seatedIds(state), key = state.code || null;
      if (key !== table) { table = key; known = new Set(ids); remember(root, ids); return; }
      const joined = ids.filter((id) => !known.has(id)), left = [...known].filter((id) => !ids.includes(id));
      // Mitten in einer Partie wechselt niemand den Platz; Ab- und Zugänge dort sind Verbindungsfragen, kein Lobby-Leben.
      if (state.phase === 'lobby' && !state.gamePaused) {
        if (left.length) { stand(left); sound()?.play?.('stand'); }
        if (joined.length) { sit(root, joined); sound()?.play?.('seat'); }
      }
      known = new Set(ids); remember(root, ids);
    },
    reset() { table = null; known = new Set(); snapshot = new Map(); this.finish(); },
    finish() { for (const animation of [...animations]) { try { animation.finish(); } catch { /* already done */ } } animations.clear(); doc?.querySelectorAll('.seat-ghost').forEach((g) => g.remove()); },
  };
}
