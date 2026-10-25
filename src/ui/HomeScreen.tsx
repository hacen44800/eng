import type { PlacementResult } from '../core/placement/result';
import ResultScreen from './ResultScreen';

type Props = {
  name: string;
  result: PlacementResult | null;
  unfinishedSessionId: string | null;
  onStart: () => void;
  onResume: (sessionId: string) => void;
  onSignOut: () => void;
};

export default function HomeScreen({ name, result, unfinishedSessionId, onStart, onResume, onSignOut }: Props) {
  return (
    <main>
      <h1>Bonjour {name}</h1>
      {result && <ResultScreen result={result} />}
      <section className="card">
        <h2>Test de positionnement</h2>
        <p className="muted">Environ 45 minutes. Tu peux t'arrêter et reprendre plus tard.</p>
        {unfinishedSessionId ? (
          <button onClick={() => onResume(unfinishedSessionId)}>Reprendre le test</button>
        ) : (
          <button onClick={onStart}>{result ? 'Refaire le test' : 'Commencer le test'}</button>
        )}
      </section>
      <button className="secondary" onClick={onSignOut}>Se déconnecter</button>
    </main>
  );
}
