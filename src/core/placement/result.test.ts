import { latestPlacementResult } from './result';
import { makeEvent, type AppEvent } from '../events';
import type { Cefr } from '../levels';

let t = 0;
const ans = (sessionId: string, skill: 'grammarVocab' | 'listening' | 'speaking', level: Cefr, correct: boolean): AppEvent =>
  makeEvent('placement_answer', { sessionId, skill, itemId: `i${++t}`, level, correct }, 'd', t);
const graded = (sessionId: string, score: number): AppEvent =>
  makeEvent('production_graded', { context: 'placement', sessionId, skill: 'writing', promptId: `w${++t}`, score }, 'd', t);
const done = (sessionId: string): AppEvent => makeEvent('placement_completed', { sessionId }, 'd', ++t);

test('aucune session terminée → null', () => {
  expect(latestPlacementResult([ans('S', 'grammarVocab', 'A1', true)])).toBeNull();
});

test('calcule le niveau par compétence et la plus faible', () => {
  const events = [
    ans('S', 'grammarVocab', 'A2', true), ans('S', 'grammarVocab', 'A2', true),
    ans('S', 'listening', 'A1', false),
    graded('S', 3), graded('S', 3),
    ans('S', 'speaking', 'A1', true), ans('S', 'speaking', 'A2', false),
    done('S'),
  ];
  const r = latestPlacementResult(events)!;
  expect(r.sessionId).toBe('S');
  expect(r.levels).toEqual({ grammarVocab: 'A2', listening: 'A1', writing: 'B1', speaking: 'A1' });
  expect(r.weakest).toBe('speaking');
});

test('prend la session terminée la plus récente', () => {
  const events = [ans('OLD', 'grammarVocab', 'A1', true), done('OLD'), ans('NEW', 'grammarVocab', 'B1', true), done('NEW')];
  expect(latestPlacementResult(events)!.sessionId).toBe('NEW');
});
