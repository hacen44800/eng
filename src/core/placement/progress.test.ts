import { activeSessionId, placementProgress } from './progress';
import { makeEvent, type AppEvent } from '../events';
import type { PlacementContent } from '../../content/schemas';

const content: PlacementContent = {
  grammar: [
    { id: 'g1', level: 'A2', prompt: 'p', choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'x' },
    { id: 'g2', level: 'A2', prompt: 'p', choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'x' },
  ],
  listening: [{ id: 'l1', level: 'A1', kind: 'dictation', audio: 'hello' }],
  writing: [{ id: 'w1', prompt: 'p', promptFr: 'p', rubric: ['a', 'b', 'c', 'd'], modelAnswer: 'm' }],
  speaking: [{ id: 's1', level: 'A1', text: 'hi' }],
};

let t = 0;
const ans = (skill: 'grammarVocab' | 'listening' | 'speaking', itemId: string, correct = true, sessionId = 'S'): AppEvent =>
  makeEvent('placement_answer', { sessionId, skill, itemId, level: 'A2', correct }, 'd', ++t);
const graded = (promptId: string, sessionId = 'S'): AppEvent =>
  makeEvent('production_graded', { context: 'placement', sessionId, skill: 'writing', promptId, score: 3 }, 'd', ++t);

test('session vide → étape grammaire avec le premier item', () => {
  const p = placementProgress([], 'S', content);
  expect(p.step).toBe('grammar');
  expect(p.nextGrammar?.id).toBe('g1');
});

test('reprend une session inachevée à la bonne étape', () => {
  const events = [ans('grammarVocab', 'g1'), ans('grammarVocab', 'g2'), ans('listening', 'l1')];
  const p = placementProgress(events, 'S', content);
  expect(p.step).toBe('writing');
  expect(p.nextWriting?.id).toBe('w1');
});

test('ignore les doublons d\'item (double clic) : seule la première réponse compte', () => {
  const events = [ans('grammarVocab', 'g1', false), ans('grammarVocab', 'g1', true)];
  const p = placementProgress(events, 'S', content);
  expect(p.grammarHistory).toEqual([{ itemId: 'g1', level: 'A2', correct: false }]);
});

test('ignore les événements d\'une autre session', () => {
  const p = placementProgress([ans('grammarVocab', 'g1', true, 'OTHER')], 'S', content);
  expect(p.grammarHistory).toHaveLength(0);
});

test('toutes les étapes faites → done', () => {
  const events = [ans('grammarVocab', 'g1'), ans('grammarVocab', 'g2'), ans('listening', 'l1'), graded('w1'), ans('speaking', 's1')];
  expect(placementProgress(events, 'S', content).step).toBe('done');
});

test('activeSessionId : session commencée et non terminée', () => {
  expect(activeSessionId([])).toBeNull();
  const started = [ans('grammarVocab', 'g1')];
  expect(activeSessionId(started)).toBe('S');
  const done = [...started, makeEvent('placement_completed', { sessionId: 'S' }, 'd', ++t)];
  expect(activeSessionId(done)).toBeNull();
});
