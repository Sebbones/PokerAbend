// Reproducible local-only randomness. No server RNG or ranked result uses this state.
export function next(seed) { const value = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0; return { seed:value, value:value / 4294967296 }; }
export function rng(seed) { let state=seed>>>0; return () => { const r=next(state);state=r.seed;return r.value; }; }
export function shuffle(values, random) { const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
export const integer = (v,min,max) => Number.isInteger(v)&&v>=min&&v<=max;
