import { useState } from 'react';
import type { ListeningItem } from '../../content/schemas';
import { RATE_BY_LEVEL, type Speech } from '../../speech/browserSpeech';
import { wordAccuracy } from '../../core/textScore';

export const PASS_ACCURACY = 0.8;

type Props = { item: ListeningItem; speech: Speech; onAnswer: (correct: boolean) => void };

export default function ListeningStep({ item, speech, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState(false);

  const play = () => speech.speak(item.audio, RATE_BY_LEVEL[item.level]).catch(() => {});
  const correct = item.kind === 'mcq' ? picked === item.answer : wordAccuracy(item.audio, typed) >= PASS_ACCURACY;
  const answered = item.kind === 'mcq' ? picked !== null : checked;

  return (
    <section className="card">
      <h2>Écoute</h2>
      {speech.canSpeak ? (
        <button onClick={play}>Écouter</button>
      ) : (
        <>
          <p className="banner">Pas de voix anglaise disponible sur cet appareil : lis la phrase.</p>
          <p><em>{item.audio}</em></p>
        </>
      )}
      {item.kind === 'mcq' ? (
        <>
          <p>{item.question}</p>
          <div className="choices">
            {item.choices.map((c, i) => (
              <button key={i} className="secondary" disabled={picked !== null} onClick={() => setPicked(i)}>{c}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>Écris ce que tu entends :</p>
          <textarea value={typed} onChange={e => setTyped(e.target.value)} disabled={checked} />
          {!checked && <button disabled={typed.trim() === ''} onClick={() => setChecked(true)}>Valider</button>}
        </>
      )}
      {answered && (
        <>
          <p className={correct ? 'ok' : 'ko'}>{correct ? 'Correct' : 'Pas tout à fait'}</p>
          <p>Texte : <em>{item.audio}</em></p>
          {item.kind === 'mcq' && <p>{item.explanation}</p>}
          <button onClick={() => onAnswer(correct)}>Suivant</button>
        </>
      )}
    </section>
  );
}
