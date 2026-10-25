import type { Cefr } from '../core/levels';

export interface Speech {
  readonly canSpeak: boolean;
  readonly canListen: boolean;
  speak(text: string, rate?: number): Promise<void>;
  listen(): Promise<string>;
}

export const RATE_BY_LEVEL: Record<Cefr, number> = { A1: 0.8, A2: 0.9, B1: 1.0, B2: 1.1 };

type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
};
type RecognitionCtor = new () => Recognition;

export type SpeechWindow = {
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  SpeechRecognition?: RecognitionCtor;
  webkitSpeechRecognition?: RecognitionCtor;
};

export function createBrowserSpeech(win: SpeechWindow = window as unknown as SpeechWindow): Speech {
  const synth = win.speechSynthesis;
  const Utterance = win.SpeechSynthesisUtterance;
  const RecognitionImpl = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  const englishVoice = () => synth?.getVoices().find(v => v.lang.toLowerCase().startsWith('en'));

  return {
    get canSpeak() { return !!synth && !!Utterance && !!englishVoice(); },
    canListen: !!RecognitionImpl,

    speak(text, rate = 1) {
      return new Promise((resolve, reject) => {
        if (!synth || !Utterance) return reject(new Error('Synthèse vocale non disponible'));
        synth.cancel();
        const u = new Utterance(text);
        u.lang = 'en-US';
        u.rate = rate;
        const voice = englishVoice();
        if (voice) u.voice = voice;
        u.onend = () => resolve();
        u.onerror = e => reject(new Error(e.error));
        synth.speak(u);
      });
    },

    listen() {
      return new Promise((resolve, reject) => {
        if (!RecognitionImpl) return reject(new Error('Reconnaissance vocale non disponible'));
        const rec = new RecognitionImpl();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        let transcript = '';
        let error: string | null = null;
        rec.onresult = e => { transcript = e.results[0]?.[0]?.transcript ?? ''; };
        rec.onerror = e => { error = e.error; };
        rec.onend = () => (error ? reject(new Error(error)) : resolve(transcript));
        rec.start();
      });
    },
  };
}
