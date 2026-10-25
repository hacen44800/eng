import { makeEvent, normalizeEvents, type AppEvent } from './events';

const answer = (id: string, createdAt: number): AppEvent =>
  makeEvent('placement_answer',
    { sessionId: 's1', skill: 'grammarVocab', itemId: `q-${id}`, level: 'A1', correct: true },
    'dev', createdAt, id);

test('makeEvent remplit id, createdAt, deviceId', () => {
  const e = makeEvent('placement_completed', { sessionId: 's1' }, 'dev-1', 1000, 'abc');
  expect(e).toEqual({ id: 'abc', type: 'placement_completed', payload: { sessionId: 's1' }, createdAt: 1000, deviceId: 'dev-1' });
});

test('makeEvent génère un UUID par défaut', () => {
  const e = makeEvent('placement_completed', { sessionId: 's1' }, 'dev');
  expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
});

test('normalizeEvents trie par createdAt puis id', () => {
  const out = normalizeEvents([answer('b', 2), answer('c', 1), answer('a', 2)]);
  expect(out.map(e => e.id)).toEqual(['c', 'a', 'b']);
});

test('normalizeEvents supprime les doublons d\'id (fusion de deux appareils)', () => {
  const out = normalizeEvents([answer('a', 1), answer('b', 2), answer('a', 1)]);
  expect(out.map(e => e.id)).toEqual(['a', 'b']);
});
