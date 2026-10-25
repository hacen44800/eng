import { makeEvent } from '../core/events';
import { createOutbox } from './outbox';

const setDoc = vi.fn();
vi.mock('../firebase/app', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (...path: unknown[]) => path.join('/'),
  collection: () => 'col',
  query: () => 'q',
  orderBy: () => 'order',
  setDoc: (...args: unknown[]) => setDoc(...args),
  onSnapshot: () => () => {},
}));

const { createFirestoreEventStore } = await import('./firestoreEventStore');

beforeEach(() => localStorage.clear());

test('écriture refusée → erreur transmise à l\'abonné et événement mis en file locale', async () => {
  setDoc.mockRejectedValueOnce(new Error('permission-denied'));
  const store = createFirestoreEventStore(() => {});
  const onError = vi.fn();
  store.subscribe('u1', () => {}, onError);
  const e = makeEvent('placement_completed', { sessionId: 's' }, 'd', 1, 'e1');

  store.append('u1', e);
  await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'permission-denied' })));
  expect(createOutbox(localStorage).drain().map(x => x.id)).toEqual(['e1']);
});
