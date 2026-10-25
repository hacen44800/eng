import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createFakeServices } from './ui/testing/fakeServices';
import { makeEvent } from './core/events';

vi.mock('./ui/placement/PlacementFlow', () => ({
  default: ({ sessionId }: { sessionId: string }) => <p>flow:{sessionId}</p>,
}));

test('non connecté → écran de connexion', () => {
  const s = createFakeServices();
  render(<App services={s} />);
  act(() => s.emitUser(null));
  expect(screen.getByRole('button', { name: /se connecter avec github/i })).toBeInTheDocument();
});

test('connexion → accueil avec bouton du test, et vidage de l\'outbox', async () => {
  const s = createFakeServices();
  render(<App services={s} />);
  act(() => s.emitUser(null));
  await userEvent.click(screen.getByRole('button', { name: /se connecter avec github/i }));
  expect(await screen.findByRole('button', { name: /commencer le test/i })).toBeInTheDocument();
  expect(s.store.flushOutbox).toHaveBeenCalledWith('u1');
});

test('session inachevée → bouton reprendre', async () => {
  const s = createFakeServices();
  s.events.push(makeEvent('placement_answer', { sessionId: 'S1', skill: 'grammarVocab', itemId: 'g1', level: 'A2', correct: true }, 'd', 1));
  render(<App services={s} />);
  act(() => s.emitUser({ uid: 'u1', name: 'T' }));
  await userEvent.click(await screen.findByRole('button', { name: /reprendre le test/i }));
  expect(screen.getByText('flow:S1')).toBeInTheDocument();
});

test('résultat existant → affiché sur l\'accueil', async () => {
  const s = createFakeServices();
  s.events.push(makeEvent('placement_completed', { sessionId: 'S1' }, 'd', 1));
  render(<App services={s} />);
  act(() => s.emitUser({ uid: 'u1', name: 'T' }));
  expect(await screen.findByText(/compétence à travailler en priorité/i)).toBeInTheDocument();
});

test('connexion impossible → message d\'erreur', async () => {
  const s = createFakeServices();
  s.auth.signIn = vi.fn(async () => { throw new Error('network'); });
  render(<App services={s} />);
  act(() => s.emitUser(null));
  await userEvent.click(screen.getByRole('button', { name: /se connecter avec github/i }));
  expect(await screen.findByText(/connexion impossible/i)).toBeInTheDocument();
});
