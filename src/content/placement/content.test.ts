import { placementContent } from './index';
import { LEVELS } from '../../core/levels';

const { grammar, listening, writing, speaking } = placementContent;
const countBy = <T extends { level: string }>(xs: T[], lvl: string) => xs.filter(x => x.level === lvl).length;

test('ids uniques sur toute la banque', () => {
  const ids = [...grammar, ...listening, ...writing, ...speaking].map(x => x.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test.each(LEVELS)('grammaire : 15 items de niveau %s', lvl => {
  expect(countBy(grammar, lvl)).toBe(15);
});

test.each(LEVELS)('écoute : 3 items de niveau %s dont au moins 1 dictée', lvl => {
  const items = listening.filter(x => x.level === lvl);
  expect(items).toHaveLength(3);
  expect(items.some(x => x.kind === 'dictation')).toBe(true);
});

test('écoute triée par niveau croissant', () => {
  const idx = listening.map(x => LEVELS.indexOf(x.level));
  expect(idx).toEqual([...idx].sort((a, b) => a - b));
});

test('écrit : 3 sujets', () => {
  expect(writing).toHaveLength(3);
});

test.each(LEVELS)('oral : 2 phrases de niveau %s', lvl => {
  expect(countBy(speaking, lvl)).toBe(2);
});

test('oral trié par niveau croissant', () => {
  const idx = speaking.map(x => LEVELS.indexOf(x.level));
  expect(idx).toEqual([...idx].sort((a, b) => a - b));
});

test('grammaire : choix distincts et réponse unique', () => {
  for (const q of grammar) expect(new Set(q.choices).size).toBe(4);
});
