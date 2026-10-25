import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const ev = (id: string) => ({ id, type: 'placement_completed', payload: { sessionId: 's' }, createdAt: 1, deviceId: 'd' });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-eng',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

test('propriétaire : crée et lit ses événements', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/alice/events/e1'), ev('e1')));
  await assertSucceeds(getDoc(doc(db, 'users/alice/events/e1')));
});

test('autre utilisateur : lecture et écriture refusées', async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users/alice/events/e1'), ev('e1')));
  const bob = env.authenticatedContext('bob').firestore();
  await assertFails(getDoc(doc(bob, 'users/alice/events/e1')));
  await assertFails(setDoc(doc(bob, 'users/alice/events/e2'), ev('e2')));
});

test('non connecté : tout refusé', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, 'users/alice/events/e1')));
  await assertFails(setDoc(doc(anon, 'users/alice/events/e1'), ev('e1')));
});

test('événement immuable : modification et suppression refusées', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/alice/events/e1'), ev('e1')));
  await assertFails(updateDoc(doc(db, 'users/alice/events/e1'), { type: 'x' }));
  await assertFails(deleteDoc(doc(db, 'users/alice/events/e1')));
});

test('id incohérent ou champ inconnu refusé', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(db, 'users/alice/events/e1'), ev('autre')));
  await assertFails(setDoc(doc(db, 'users/alice/events/e2'), { ...ev('e2'), extra: true }));
});

test('hors de users/{uid}/events : refusé', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(db, 'config/x'), { a: 1 }));
});
