import {readFileSync} from 'node:fs';
// DE: enz/german-wordlist, CC0-1.0. EN: dwyl/english-words, Unlicense.
// Full notices and pinned upstream commits: LICENSE-*.txt and SOURCES.json.
export const normalize = word => word.normalize('NFC').toUpperCase().replaceAll('ß','SS');
// Loading another game must not allocate a million dictionary entries. Cache
// only the language actually selected, once, before its round clock starts.
const lists=new Map(),sets=new Map(),candidates=new Map();
export const WORDS=Object.defineProperties({},Object.fromEntries(['de','en'].map(lang=>[lang,{enumerable:true,get(){if(!lists.has(lang))lists.set(lang,readFileSync(new URL(`words-${lang}.txt`,import.meta.url),'utf8').trim().split('\n'));return lists.get(lang);}}])));
export const inDictionary=(lang,word)=>{if(!['de','en'].includes(lang))return false;if(!sets.has(lang))sets.set(lang,new Set(WORDS[lang]));return sets.get(lang).has(word);};
export const neighbours=(i,size)=>Array.from({length:size*size},(_,n)=>n).filter(n=>n!==i&&Math.abs(n%size-i%size)<=1&&Math.abs(Math.floor(n/size)-Math.floor(i/size))<=1);
export function wordPath(board,size,word){if(!word.length||word.length>board.length)return null;const counts=new Map();for(const c of board)counts.set(c,(counts.get(c)||0)+1);for(const c of word){const n=counts.get(c)||0;if(!n)return null;counts.set(c,n-1);}let budget=30000;const links=board.map((_,i)=>neighbours(i,size));function dfs(i,pos,used,path){if(--budget<0||board[i]!==word[pos])return null;const next=[...path,i];if(pos===word.length-1)return next;const mask=used|1n<<BigInt(i);for(const n of links[i])if(!(mask&1n<<BigInt(n))){const p=dfs(n,pos+1,mask,next);if(p)return p;}return null;}for(let i=0;i<board.length;i++){const p=dfs(i,0,0n,[]);if(p)return p;}return null;}
const hasPrefix=(list,prefix)=>{let a=0,b=list.length;while(a<b){const m=(a+b)>>1;if(list[m]<prefix)a=m+1;else b=m;}return list[a]?.startsWith(prefix)===true;};
export function boardWords(board,size,lang,{nodes=12000,ms=8}={}){const found=new Map(),list=WORDS[lang],start=performance.now(),links=board.map((_,i)=>neighbours(i,size));let count=0;
 function dfs(i,text,mask,path){if(++count>nodes||performance.now()-start>ms)return;const word=text+board[i];if(!hasPrefix(list,word))return;const p=[...path,i],used=mask|1n<<BigInt(i);if(word.length>=3&&inDictionary(lang,word))found.set(word,p);if(word.length>=16)return;for(const n of links[i])if(!(used&1n<<BigInt(n)))dfs(n,word,used,p);}
 for(let i=0;i<board.length;i++)dfs(i,'',0n,[]);return found;
}
export function letterfield(lang='de',size=4,rng=Math.random){const key=lang+size;if(!candidates.has(key))candidates.set(key,WORDS[lang].filter(w=>w.length===size));const list=candidates.get(key),word=list[Math.floor(rng()*list.length)];inDictionary(lang,word);const letters=lang==='de'?'EEEEEEEEENNNNNNIIIIIRRRRRSSSSSTTTTTAAAAADDDHHHUUULLLCCGGMMOOBBWWFFKKZZPJVÄÖÜ':'EEEEEEEEETTTTTTAAAAAAOOOOOIIIIINNNNNSSSSHHHHRRRRDDDLLLCCUUMMWFFGYPBVKJXQZ';const board=Array.from({length:size*size},()=>letters[Math.floor(rng()*letters.length)]);for(let i=0;i<size;i++)board[i]=word[i];return {board,size,guaranteed:word};}
export const wordPoints=word=>word.length<=4?1:word.length===5?2:word.length===6?3:word.length===7?5:11;
export function tally(submissions,duplicates=false){const counts=new Map();for(const words of Object.values(submissions))for(const word of words)counts.set(word,(counts.get(word)||0)+1);return Object.fromEntries(Object.entries(submissions).map(([id,words])=>[id,words.map(word=>({word,points:duplicates||counts.get(word)===1?wordPoints(word):0,duplicate:counts.get(word)>1}))]));}
