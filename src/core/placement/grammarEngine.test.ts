import { currentLevel, nextGrammarItem, type AnswerRecord } from './grammarEngine';
import type { GrammarItem } from '../../content/schemas';
import type { Cefr } from '../levels';

const q = (id: string, level: Cefr): GrammarItem =>
  ({ id, level, prompt: id, choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'x' });
const r = (itemId: string, level: Cefr, correct: boolean): AnswerRecord => ({ itemId, level, correct });

test('démarre en A2', () => {
  expect(currentLevel([])).toBe('A2');
});

test('monte après 2 bonnes réponses consécutives', () => {
  expect(currentLevel([r('1', 'A2', true)])).toBe('A2');
  expect(currentLevel([r('1', 'A2', true), r('2', 'A2', true)])).toBe('B1');
});

test('descend après 1 erreur', () => {
  expect(currentLevel([r('1', 'A2', false)])).toBe('A1');
});

test('reste borné entre A1 et B2', () => {
  expect(currentLevel([r('1', 'A2', false), r('2', 'A1', false)])).toBe('A1');
  const allGood = Array.from({ length: 10 }, (_, i) => r(`${i}`, 'B2', true));
  expect(currentLevel(allGood)).toBe('B2');
});

test('propose un item non posé du niveau courant', () => {
  const bank = [q('a1-1', 'A1'), q('a2-1', 'A2'), q('a2-2', 'A2')];
  expect(nextGrammarItem(bank, [])?.id).toBe('a2-1');
  expect(nextGrammarItem(bank, [r('a2-1', 'A2', true)])?.id).toBe('a2-2');
});

test('niveau épuisé → niveau le plus proche, en dessous d\'abord', () => {
  const bank = [q('a1-1', 'A1'), q('b1-1', 'B1')];
  expect(nextGrammarItem(bank, [])?.id).toBe('a1-1');
});

test('s\'arrête au nombre max ou banque épuisée', () => {
  const bank = [q('a2-1', 'A2'), q('a2-2', 'A2')];
  expect(nextGrammarItem(bank, [r('a2-1', 'A2', true)], 1)).toBeNull();
  expect(nextGrammarItem(bank, [r('a2-1', 'A2', true), r('a2-2', 'A2', true)])).toBeNull();
});
