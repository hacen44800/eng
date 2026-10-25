import { createOutbox } from './outbox';
import { makeEvent } from '../core/events';

const e1 = makeEvent('placement_completed', { sessionId: 'a' }, 'd', 1, 'id1');
const e2 = makeEvent('placement_completed', { sessionId: 'b' }, 'd', 2, 'id2');

test('add puis drain renvoie les événements et vide la file', () => {
  const box = createOutbox(localStorage, 'test.outbox');
  box.add(e1); box.add(e2); box.add(e1);
  expect(box.drain().map(e => e.id)).toEqual(['id1', 'id2']);
  expect(box.drain()).toEqual([]);
});

test('contenu corrompu → file vide sans erreur', () => {
  localStorage.setItem('test.bad', '{pas du json');
  expect(createOutbox(localStorage, 'test.bad').drain()).toEqual([]);
});
