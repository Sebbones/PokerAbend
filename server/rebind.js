// Ersetzt in einem gespeicherten Zustand eine Besucher-/Konto-ID durch die neue (V2-01). Zufalls-IDs sind eindeutig,
// deshalb genügt der genaue Vergleich von Textwerten. Listen von Texten (z. B. Stimmen) bleiben ohne Doppelte.
export function rebindIds(value, from, to) {
  let count = 0;
  const walk = (v) => {
    if (v === from) { count++; return to; }
    if (Array.isArray(v)) {
      const before = count, out = v.map(walk);
      return count > before && out.every((x) => typeof x === 'string') ? [...new Set(out)] : out;
    }
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = walk(v[k]); }
    return v;
  };
  const result = walk(value);
  return { value: result, count };
}
