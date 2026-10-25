import { useState } from 'react';
import type { GrammarItem } from '../../content/schemas';

type Props = { item: GrammarItem; index: number; total: number; onAnswer: (correct: boolean) => void };

export default function GrammarStep({ item, index, total, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === item.answer;

  return (
    <section className="card">
      <p className="muted">Question {index + 1} / {total}</p>
      <h2>{item.prompt}</h2>
      <div className="choices">
        {item.choices.map((c, i) => (
          <button key={c} className={picked === null ? 'secondary' : ''} disabled={picked !== null} onClick={() => setPicked(i)}>
            {c}
          </button>
        ))}
      </div>
      {picked !== null && (
        <>
          <p className={correct ? 'ok' : 'ko'}>{correct ? 'Correct' : `Réponse : ${item.choices[item.answer]}`}</p>
          <p>{item.explanation}</p>
          <button onClick={() => onAnswer(correct)}>Suivant</button>
        </>
      )}
    </section>
  );
}
