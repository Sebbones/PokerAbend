export const SURVIVAL_MAX_ROUNDS = 60;
export const survivors = (p) => p.roster.filter((person) => p.lives[person.id] > 0).map((person) => person.id);
export function beginSurvival(p) {
  p.lives = Object.fromEntries(p.roster.map((person) => [person.id, p.config.lives]));
}
export function attachSurvival(room) {
  if (room.partyProgram?.config.mode !== 'survival-abend' || room.survivalHook) return;
  room.survivalHook = true;
  const leave = room.leaveGame.bind(room);
  room.leaveGame = (person) => {
    const p = room.partyProgram;
    if (p?.config.mode === 'survival-abend' && ['running', 'between'].includes(p.status) && Object.hasOwn(p.lives, person.id)) p.lives[person.id] = 0;
    return leave(person);
  };
}
export function scoreSurvival(p, row, members, compare, hasResult) {
  const alive = survivors(p), participants = members.filter((id) => alive.includes(id));
  // A void round or a complete tie costs nobody a life. Only last place loses.
  const sorted = [...participants].sort(compare), first = sorted[0], last = sorted.at(-1);
  const losers = hasResult && participants.length > 1 && compare(first, last) !== 0
    ? participants.filter((id) => compare(id, last) === 0) : [];
  // Explicitly departed participants forfeit their remaining lives. A disconnected
  // player still has a seat and stays in the program (handled by next-step validation).
  for (const id of losers) p.lives[id] = Math.max(0, p.lives[id] - 1);
  row.lostLife = losers;
  row.lives = { ...p.lives };
  return survivors(p).length <= 1 || p.index + 1 >= SURVIVAL_MAX_ROUNDS;
}
export function survivalWinners(p) {
  const best = Math.max(0, ...Object.values(p.lives));
  return p.roster.filter((person) => p.lives[person.id] === best && best > 0).map((person) => person.name);
}
export function validSurvival(p) {
  return p.lives && Object.keys(p.lives).length === p.roster.length && p.roster.every(({ id }) => Number.isInteger(p.lives[id]) && p.lives[id] >= 0 && p.lives[id] <= p.config.lives);
}
