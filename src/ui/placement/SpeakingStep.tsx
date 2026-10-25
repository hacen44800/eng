import { useState } from 'react';
import type { SpeakingItem } from '../../content/schemas';
import type { Speech } from '../../speech/browserSpeech';
import { wordAccuracy } from '../../core/textScore';
import { PASS_ACCURACY } from './ListeningStep';
import { ARM_DELAY_MS, useArmed } from './useArmed';

type Props = { item: SpeakingItem; speech: Speech; onAnswer: (correct: boolean) => void; armDelayMs?: number };

export default function SpeakingStep({ item, speech, onAnswer, armDelayMs = ARM_DELAY_MS }: Props) {
  const armed = useArmed(armDelayMs);
  const [heard, setHeard] = useState<string | null>(null);
  const [fallback, setFallback] = useState(!speech.canListen);
  const [busy, setBusy] = useState(false);

  const listen = async () => {
    setBusy(true);
    try {
      setHeard(await speech.listen());
    } catch {
      setFallback(true);
    } finally {
      setBusy(false);
    }
  };

  const accuracy = heard === null ? 0 : wordAccuracy(item.text, heard);

  return (
    <section className="card">
      <h2>Lis à voix haute</h2>
      <p style={{ fontSize: '1.3em' }}>{item.text}</p>
      {speech.canSpeak && <button className="secondary" onClick={() => speech.speak(item.text).catch(() => {})}>Écouter le modèle</button>}
      {fallback ? (
        <>
          <p className="banner">Micro indisponible : lis la phrase à voix haute, puis évalue-toi honnêtement.</p>
          <button disabled={!armed} onClick={() => onAnswer(true)}>Je l'ai bien dit</button>{' '}
          <button className="secondary" disabled={!armed} onClick={() => onAnswer(false)}>J'ai hésité ou buté</button>
        </>
      ) : heard === null ? (
        <button onClick={listen} disabled={!armed || busy}>{busy ? 'J\'écoute…' : 'Parler'}</button>
      ) : (
        <>
          <p>Entendu : <em>{heard || '(rien)'}</em></p>
          <p className={accuracy >= PASS_ACCURACY ? 'ok' : 'ko'}>{Math.round(accuracy * 100)} % des mots reconnus</p>
          <button onClick={() => onAnswer(accuracy >= PASS_ACCURACY)}>Suivant</button>{' '}
          <button className="secondary" onClick={() => setHeard(null)}>Réessayer</button>
        </>
      )}
    </section>
  );
}
