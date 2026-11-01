// Update-Ankündigung: Banner für alle, neue Runden starten nicht mehr, laufende dürfen fertig werden.
// Der Zustand liegt nur im Speicher – nach dem Neustart ist die Ankündigung erledigt.
export const UPDATE_BLOCKED = 'Ein Update steht an – neue Runden starten erst nach dem Neustart';
export const MAX_UPDATE_MINUTES = 180;
const MIN_UPDATE_MINUTES = 0.05; // die Admin-Seite bietet ganze Minuten an; kürzere Fristen sind für Tests und Skripte

let announced = null; // { at, minutes, by }

export const maintenance = {
  announce(minutes, by = 'admin', now = Date.now()) {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m < MIN_UPDATE_MINUTES || m > MAX_UPDATE_MINUTES) throw new Error(`Bitte ${Math.ceil(MIN_UPDATE_MINUTES)} bis ${MAX_UPDATE_MINUTES} Minuten angeben`);
    announced = { at: now + m * 60000, minutes: m, by };
    return this.state(now);
  },
  cancel() { const was = announced !== null; announced = null; return was; },
  get active() { return announced !== null; },
  /** Ab dann darf der Server beenden (sobald keine Runde mehr läuft) */
  due(now = Date.now()) { return announced !== null && now >= announced.at; },
  get at() { return announced?.at ?? null; },
  /** Für Clients: verbleibende Zeit statt Uhrzeit, damit falsch gehende Browseruhren nicht stören */
  state(now = Date.now()) {
    return announced ? { leftMs: Math.max(0, announced.at - now), due: now >= announced.at } : null;
  },
};

/** Räume rufen das auf, bevor eine neue Runde beginnt */
export function assertNewRoundAllowed() {
  if (maintenance.active) throw new Error(UPDATE_BLOCKED);
}
