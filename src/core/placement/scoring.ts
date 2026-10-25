import { LEVELS, type Cefr, type Skill } from '../levels';

const PASS_RATE = 0.6;

export function levelFromAnswers(answers: { level: Cefr; correct: boolean }[]): Cefr {
  let result: Cefr = 'A1';
  for (const lvl of LEVELS) {
    const at = answers.filter(a => a.level === lvl);
    if (at.length === 0) continue;
    const rate = at.filter(a => a.correct).length / at.length;
    if (rate >= PASS_RATE) result = lvl;
    else break;
  }
  return result;
}

export function levelFromScores(scores: number[]): Cefr {
  if (scores.length === 0) return 'A1';
  const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
  if (avg < 1.5) return 'A1';
  if (avg < 2.5) return 'A2';
  if (avg < 3.5) return 'B1';
  return 'B2';
}

// Ordre de priorité en cas d'égalité : l'objectif est l'oral.
const TIE_PRIORITY: Skill[] = ['speaking', 'listening', 'writing', 'grammarVocab'];

export function weakestSkill(levels: Record<Skill, Cefr>): Skill {
  return TIE_PRIORITY.reduce((min, s) => (LEVELS.indexOf(levels[s]) < LEVELS.indexOf(levels[min]) ? s : min));
}
