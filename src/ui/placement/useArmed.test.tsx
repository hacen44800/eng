import { act, render, screen } from '@testing-library/react';
import SpeakingStep from './SpeakingStep';
import GrammarStep from './GrammarStep';
import type { Speech } from '../../speech/browserSpeech';

const noMic: Speech = { canSpeak: false, canListen: false, speak: vi.fn(async () => {}), listen: vi.fn(async () => '') };
const grammarItem = { id: 'g1', level: 'A1' as const, prompt: 'p', choices: ['am', 'is', 'are', 'be'], answer: 0, explanation: 'x' };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('double clic entre deux items : les réponses du nouvel item sont inactives juste après son affichage', () => {
  const onAnswer = vi.fn();
  render(<SpeakingStep item={{ id: 's2', level: 'A1', text: 'x' }} speech={noMic} onAnswer={onAnswer} armDelayMs={400} />);
  const btn = screen.getByRole('button', { name: /je l'ai bien dit/i });
  btn.click();
  expect(onAnswer).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(400); });
  screen.getByRole('button', { name: /je l'ai bien dit/i }).click();
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('grammaire : choix inactifs pendant le délai d\'armement', () => {
  render(<GrammarStep item={grammarItem} index={0} total={30} onAnswer={vi.fn()} armDelayMs={400} />);
  expect(screen.getByRole('button', { name: 'am' })).toBeDisabled();
  act(() => { vi.advanceTimersByTime(400); });
  expect(screen.getByRole('button', { name: 'am' })).toBeEnabled();
});
