import { randomInt } from 'node:crypto';

// Public rules only. Never derive a rule from answers, cards, roles or RNG seeds.
export const CHAOS_RULES = ['double', 'reverse', 'pressure', 'double-pressure', 'reverse-pressure'];
export function drawChaos(previous = null, random = randomInt) {
  const choices = CHAOS_RULES.filter((rule) => rule !== previous);
  return choices[random(choices.length)];
}
