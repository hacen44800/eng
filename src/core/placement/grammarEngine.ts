import { LEVELS, type Cefr } from '../levels';
import type { GrammarItem } from '../../content/schemas';

export type AnswerRecord = { itemId: string; level: Cefr; correct: boolean };

export const GRAMMAR_QUESTION_COUNT = 30;

/** Escalier 2-haut / 1-bas : 2 bonnes réponses consécutives → niveau +1, 1 erreur → niveau -1. */
export function currentLevel(history: AnswerRecord[], start: Cefr = 'A2'): Cefr {
  let idx = LEVELS.indexOf(start);
  let streak = 0;
  for (const a of history) {
    if (a.correct) {
      streak++;
      if (streak >= 2) { idx = Math.min(idx + 1, LEVELS.length - 1); streak = 0; }
    } else {
      idx = Math.max(idx - 1, 0);
      streak = 0;
    }
  }
  return LEVELS[idx];
}

export function nextGrammarItem(bank: GrammarItem[], history: AnswerRecord[], max = GRAMMAR_QUESTION_COUNT): GrammarItem | null {
  if (history.length >= max) return null;
  const asked = new Set(history.map(h => h.itemId));
  const target = LEVELS.indexOf(currentLevel(history));
  const order = [0, -1, 1, -2, 2, -3, 3].map(d => target + d).filter(i => i >= 0 && i < LEVELS.length);
  for (const i of order) {
    const item = bank.find(q => q.level === LEVELS[i] && !asked.has(q.id));
    if (item) return item;
  }
  return null;
}
