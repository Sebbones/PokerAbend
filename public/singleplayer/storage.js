export const VERSION=1;
export const IDS=['sudoku','2048','wellenwacht','snake','memory','minesweeper','nonogramm','sokoban','block-puzzle','solitaire','mahjong-solitaire','match-3'];
export const key=(id)=>{if(!IDS.includes(id))throw Error('Unknown single-player game');return `poker:singleplayer:${id}`;};
const MAX_BYTES=250000;
export function load(storage,id,restore){
  let raw;
  try {raw=storage.getItem(key(id));}catch{return {state:null,status:'unavailable'};}
  try {
    if(raw===null)return {state:null,status:'empty'};
    if(typeof raw!=='string'||raw.length>MAX_BYTES)return {state:null,status:'corrupt'};
    const data=JSON.parse(raw);
    if(!data||data.id!==id||!Number.isFinite(data.updatedAt)||data.updatedAt<0||data.updatedAt>8e15)return {state:null,status:'corrupt'};
    if(data.version!==VERSION)return {state:null,status:'version'};
    const state=restore(data.state);return state?{state,status:'saved',updatedAt:data.updatedAt}:{state:null,status:'corrupt'};
  }catch{return {state:null,status:'corrupt'};}
}
export function save(storage,id,state){
  try {const data=JSON.stringify({version:VERSION,id,updatedAt:Date.now(),state});if(data.length>MAX_BYTES)return false;storage.setItem(key(id),data);return true;}catch{return false;}
}
export function readStats(storage,id){
  try {const raw=storage.getItem(key(id)+':stats')||'{}';if(raw.length>12000)return {};const x=JSON.parse(raw);return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}
}
export function writeStats(storage,id,value){try {const s=JSON.stringify(value);if(s.length>12000)return false;storage.setItem(key(id)+':stats',s);return true;}catch{return false;}}
