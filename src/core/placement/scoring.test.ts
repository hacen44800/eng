import { levelFromAnswers, levelFromScores, weakestSkill } from './scoring';
import type { Cefr } from '../levels';

const a = (level: Cefr, correct: boolean) => ({ level, correct });

test('niveau = plus haut niveau réussi à ≥ 60 % sans échec en dessous', () => {
  expect(levelFromAnswers([a('A1', true), a('A2', true), a('A2', true), a('B1', false), a('B1', false)])).toBe('A2');
});

test('niveau non testé ignoré (démarrage en A2)', () => {
  expect(levelFromAnswers([a('A2', true), a('A2', true), a('B1', true), a('B1', true), a('B1', false)])).toBe('B1');
});

test('échec à un niveau bloque les niveaux supérieurs', () => {
  expect(levelFromAnswers([a('A2', false), a('A2', false), a('B1', true)])).toBe('A1');
});

test('aucune réponse → A1', () => {
  expect(levelFromAnswers([])).toBe('A1');
});

test('scores 0..4 → niveau par moyenne', () => {
  expect(levelFromScores([1, 1, 2])).toBe('A1');   // 1.33
  expect(levelFromScores([2, 2, 3])).toBe('A2');   // 2.33
  expect(levelFromScores([3, 3, 4])).toBe('B1');   // 3.33
  expect(levelFromScores([4, 4, 3])).toBe('B2');   // 3.67
  expect(levelFromScores([])).toBe('A1');
});

test('compétence la plus faible, priorité à l\'oral en cas d\'égalité', () => {
  expect(weakestSkill({ grammarVocab: 'B1', listening: 'A2', writing: 'B1', speaking: 'B1' })).toBe('listening');
  expect(weakestSkill({ grammarVocab: 'A2', listening: 'A2', writing: 'A2', speaking: 'A2' })).toBe('speaking');
});
