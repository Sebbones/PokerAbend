export const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
export function makeZone(rng=Math.random){return {phase:rng()*Math.PI*2,rate:.45+rng()*.25};}
export function zoneAt(zone,elapsed,smaller=false){const centre=44+Math.sin(elapsed/1000*zone.rate+zone.phase)*15,width=smaller?Math.max(8,22-elapsed/6000):22;return {low:centre-width/2,high:centre+width/2};}
export function tickBand(state,pressed,zone,step=50){if(state.broken)return;state.tension=clamp(state.tension+(pressed?38:-24)*step/1000,0,100);if(state.tension>=96){state.broken=true;return;}if(state.tension>=zone.low&&state.tension<=zone.high)state.time+=step;}
