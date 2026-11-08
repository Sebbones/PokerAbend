export const MAX_LEVELS=60;
export const sequence=(rng=Math.random)=>Array.from({length:MAX_LEVELS},(_,i)=>({speed:110+Math.min(140,i*4)+rng()*25,phase:rng(),reverse:rng()<.5}));
export const tower=()=>({blocks:[{x:320,width:260}],height:0,nextAt:0,failed:false});
export function moving(state,profiles,elapsed){if(state.failed||state.height>=MAX_LEVELS||elapsed<state.nextAt)return null;const last=state.blocks.at(-1),profile=profiles[state.height],span=660-last.width,travel=((elapsed-state.nextAt)/1000*profile.speed/span+profile.phase*2)%2,t=travel<=1?travel:2-travel;return {x:120+(profile.reverse?1-t:t)*span,width:last.width};}
export function drop(state,profiles,elapsed){const block=moving(state,profiles,elapsed);if(!block)return false;const last=state.blocks.at(-1),x=Math.max(block.x,last.x),width=Math.min(block.x+block.width,last.x+last.width)-x;if(width<8){state.failed=true;return true;}state.blocks.push({x,width});state.height++;state.nextAt=elapsed+250;return true;}
