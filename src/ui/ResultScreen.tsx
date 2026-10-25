import type { PlacementResult } from '../core/placement/result';
import { SKILLS } from '../core/levels';
import { SKILL_LABELS } from './labels';

export default function ResultScreen({ result }: { result: PlacementResult }) {
  return (
    <section className="card">
      <h2>Ton niveau</h2>
      <ul>
        {SKILLS.map(s => (
          <li key={s}>{SKILL_LABELS[s]} : <strong>{result.levels[s]}</strong></li>
        ))}
      </ul>
      <p>Compétence à travailler en priorité : <strong>{SKILL_LABELS[result.weakest]}</strong></p>
      <p className="muted">Test passé le {new Date(result.completedAt).toLocaleDateString('fr-FR')}.</p>
    </section>
  );
}
