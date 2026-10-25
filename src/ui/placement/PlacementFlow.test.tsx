import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlacementFlow from './PlacementFlow';
import { createFakeServices } from '../testing/fakeServices';
import type { AppEvent } from '../../core/events';

function setup(events: AppEvent[] = []) {
  const s = createFakeServices();
  const onDone = vi.fn();
  const view = render(<PlacementFlow services={s} uid="u1" events={events} sessionId="S" onDone={onDone} armDelayMs={0} />);
  return { s, onDone, rerender: (evts: AppEvent[]) => view.rerender(<PlacementFlow services={s} uid="u1" events={evts} sessionId="S" onDone={onDone} armDelayMs={0} />) };
}

test('répondre à la grammaire écrit un événement placement_answer', async () => {
  const { s } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'am' }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(s.store.append).toHaveBeenCalledWith('u1', expect.objectContaining({
    type: 'placement_answer',
    deviceId: 'test-device',
    payload: { sessionId: 'S', skill: 'grammarVocab', itemId: 'g1', level: 'A2', correct: true },
  }));
});

test('parcours complet → placement_completed puis onDone', async () => {
  const { s, onDone, rerender } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'am' }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  rerender([...s.events]);
  await userEvent.type(screen.getByRole('textbox'), 'I start work at nine');
  await userEvent.click(screen.getByRole('button', { name: /valider/i }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  rerender([...s.events]);
  await userEvent.type(screen.getByRole('textbox'), 'I am a developer.');
  await userEvent.click(screen.getByRole('button', { name: /comparer avec le modèle/i }));
  await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
  rerender([...s.events]);
  s.speech.listen = vi.fn(async () => 'I work in a team');
  await userEvent.click(screen.getByRole('button', { name: /parler/i }));
  await userEvent.click(await screen.findByRole('button', { name: /suivant/i }));
  rerender([...s.events]);
  await userEvent.click(screen.getByRole('button', { name: /voir mon résultat/i }));
  expect(s.events.at(-1)?.type).toBe('placement_completed');
  expect(onDone).toHaveBeenCalled();
});
