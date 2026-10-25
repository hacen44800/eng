import { useState } from 'react';
import type { WritingPrompt } from '../../content/schemas';
import type { Grader, GradeResult } from '../../grader/types';

type Props = { prompt: WritingPrompt; grader: Grader; onGraded: (score: number) => void };

export default function WritingStep({ prompt, grader, onGraded }: Props) {
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(prompt.rubric.map(() => false));
  const [result, setResult] = useState<GradeResult | null>(null);

  const task = { kind: 'writing' as const, promptId: prompt.id, prompt: prompt.prompt, rubric: prompt.rubric, modelAnswer: prompt.modelAnswer };

  const grade = async () => {
    const r = await grader.grade(task, { text, rubricChecks: grader.needsSelfAssessment ? checks : undefined });
    setResult(r);
    onGraded(r.score);
  };

  return (
    <section className="card">
      <h2>{prompt.prompt}</h2>
      <p className="muted">{prompt.promptFr}</p>
      <textarea aria-label="Ta réponse" value={text} onChange={e => setText(e.target.value)} disabled={revealed} />
      {!revealed && (
        <button disabled={text.trim() === ''} onClick={() => (grader.needsSelfAssessment ? setRevealed(true) : grade())}>
          Comparer avec le modèle
        </button>
      )}
      {revealed && !result && (
        <>
          <h3>Exemple de réponse</h3>
          <p><em>{prompt.modelAnswer}</em></p>
          <h3>Coche ce qui est vrai pour ton texte</h3>
          {prompt.rubric.map((r, i) => (
            <label key={r} style={{ display: 'block' }}>
              <input type="checkbox" checked={checks[i]} onChange={() => setChecks(c => c.map((v, j) => (j === i ? !v : v)))} /> {r}
            </label>
          ))}
          <button onClick={grade}>Enregistrer</button>
        </>
      )}
    </section>
  );
}
