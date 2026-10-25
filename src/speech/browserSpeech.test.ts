import { createBrowserSpeech, type SpeechWindow } from './browserSpeech';

test('sans API → canSpeak et canListen à false, listen rejette', async () => {
  const s = createBrowserSpeech({} as SpeechWindow);
  expect(s.canSpeak).toBe(false);
  expect(s.canListen).toBe(false);
  await expect(s.listen()).rejects.toThrow('non disponible');
});

test('canSpeak exige une voix anglaise', () => {
  const synth = { getVoices: () => [{ lang: 'fr-FR' }], speak: vi.fn(), cancel: vi.fn() };
  const win = { speechSynthesis: synth, SpeechSynthesisUtterance: class {} } as unknown as SpeechWindow;
  expect(createBrowserSpeech(win).canSpeak).toBe(false);
  synth.getVoices = () => [{ lang: 'en-GB' }];
  expect(createBrowserSpeech(win).canSpeak).toBe(true);
});

test('listen renvoie la transcription', async () => {
  class FakeRecognition {
    lang = ''; interimResults = true; maxAlternatives = 0;
    onresult: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    start() { this.onresult?.({ results: [[{ transcript: 'hello world' }]] }); this.onend?.(); }
  }
  const s = createBrowserSpeech({ webkitSpeechRecognition: FakeRecognition } as unknown as SpeechWindow);
  expect(s.canListen).toBe(true);
  await expect(s.listen()).resolves.toBe('hello world');
});

test('listen rejette si le micro est refusé', async () => {
  class DeniedRecognition {
    lang = ''; interimResults = true; maxAlternatives = 0;
    onresult: ((e: unknown) => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start() { this.onerror?.({ error: 'not-allowed' }); this.onend?.(); }
  }
  const s = createBrowserSpeech({ SpeechRecognition: DeniedRecognition } as unknown as SpeechWindow);
  await expect(s.listen()).rejects.toThrow('not-allowed');
});
