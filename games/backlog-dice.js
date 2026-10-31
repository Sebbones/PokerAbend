// Validation shared only by the newly implemented dice games.
export function keptDice(dice,keep,roll,count=3){
  if(!Array.isArray(keep)||keep.length>count||new Set(keep).size!==keep.length||keep.some((i)=>!Number.isInteger(i)||i<0||i>=dice.length))throw Error('Diese Würfelauswahl ist ungültig');
  if(keep.length===count)throw Error('Mindestens einen Würfel neu werfen');
  const kept=new Set(keep),next=Array.from({length:count},(_,i)=>kept.has(i)?dice[i]:roll());
  if(next.some((n)=>!Number.isInteger(n)||n<1||n>6))throw Error('Ungültiger Würfelwurf');
  return next;
}
export const sameDice=(a,b)=>a.length===b.length&&[...a].sort().every((n,i)=>n===[...b].sort()[i]);
export function matchingDice(dice,target){const remaining=[...target],keep=[];for(let i=0;i<dice.length;i++){const at=remaining.indexOf(dice[i]);if(at>=0){keep.push(i);remaining.splice(at,1);}}return keep;}
