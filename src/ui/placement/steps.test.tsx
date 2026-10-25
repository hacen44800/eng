import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GrammarStep from './GrammarStep';
import ListeningStep from './ListeningStep';
import WritingStep from './WritingStep';
import SpeakingStep from './SpeakingStep';
import { RubricGrader } from '../../grader/rubricGrader';
import type { Speech } from '../../speech/browserSpeech';

const speech = (over: Partial<Speech> = {}): Speech =>
  ({ canSpeak: true, canListen: true, speak: vi.fn(async () => {}), listen: vi.fn(async () => ''), ...over });

const grammarItem = { id: 'g1', level: 'A1' as const, prompt: 'I ___ a developer.', choices: ['am', 'is', 'are', 'be'], answer: 0, explanation: 'Avec I : am.' };

test('grammaire : bonne réponse → correction affichée puis onAnswer(true) au clic sur Suivant', async () => {
  const onAnswer = vi.fn();
  render(<GrammarStep item={grammarItem} index={0} total={30} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: 'am' }));
  expect(screen.getByText('Avec I : am.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('grammaire : un seul choix possible (pas de double réponse)', async () => {
  const onAnswer = vi.fn();
  render(<GrammarStep item={grammarItem} index={0} total={30} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: 'is' }));
  expect(screen.getByRole('button', { name: 'am' })).toBeDisabled();
});

test('écoute sans voix de synthèse → phrase affichée avec avertissement', () => {
  render(<ListeningStep item={{ id: 'l1', level: 'A1', kind: 'dictation', audio: 'I start work at nine.' }} speech={speech({ canSpeak: false })} onAnswer={vi.fn()} />);
  expect(screen.getByText(/pas de voix anglaise/i)).toBeInTheDocument();
  expect(screen.getByText('I start work at nine.')).toBeInTheDocument();
});

test('dictée : texte proche → onAnswer(true)', async () => {
  const onAnswer = vi.fn();
  render(<ListeningStep item={{ id: 'l1', level: 'A1', kind: 'dictation', audio: 'I start work at nine.' }} speech={speech()} onAnswer={onAnswer} />);
  await userEvent.type(screen.getByRole('textbox'), 'I start work at nine');
  await userEvent.click(screen.getByRole('button', { name: /valider/i }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('écrit : validation impossible si la réponse est vide', () => {
  render(<WritingStep prompt={{ id: 'w1', prompt: 'Describe your job.', promptFr: 'Décris ton métier.', rubric: ['A', 'B', 'C', 'D'], modelAnswer: 'm' }} grader={new RubricGrader()} onGraded={vi.fn()} />);
  expect(screen.getByRole('button', { name: /comparer avec le modèle/i })).toBeDisabled();
});

test('écrit : auto-évaluation → score = critères cochés', async () => {
  const onGraded = vi.fn();
  render(<WritingStep prompt={{ id: 'w1', prompt: 'Describe your job.', promptFr: 'Décris ton métier.', rubric: ['A', 'B', 'C', 'D'], modelAnswer: 'I am a developer.' }} grader={new RubricGrader()} onGraded={onGraded} />);
  await userEvent.type(screen.getByRole('textbox'), 'I am a developer in a team.');
  await userEvent.click(screen.getByRole('button', { name: /comparer avec le modèle/i }));
  expect(screen.getByText('I am a developer.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'A' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'C' }));
  await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
  expect(onGraded).toHaveBeenCalledWith(2);
});

test('oral : micro refusé → bascule sur l\'auto-évaluation', async () => {
  const onAnswer = vi.fn();
  render(<SpeakingStep item={{ id: 's1', level: 'A1', text: 'I work in a team.' }} speech={speech({ listen: vi.fn(async () => { throw new Error('not-allowed'); }) })} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: /parler/i }));
  expect(await screen.findByText(/micro indisponible/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /je l'ai bien dit/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('oral : reconnaissance OK → score affiché puis onAnswer selon le seuil', async () => {
  const onAnswer = vi.fn();
  render(<SpeakingStep item={{ id: 's1', level: 'A1', text: 'I work in a team.' }} speech={speech({ listen: vi.fn(async () => 'I work in team') })} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: /parler/i }));
  expect(await screen.findByText(/80 %/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});
