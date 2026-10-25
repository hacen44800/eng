import { useState } from 'react';

export default function LoginScreen({ onSignIn }: { onSignIn: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSignIn();
    } catch {
      setError('Connexion impossible : vérifie ton réseau et réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>Eng</h1>
      <p>Ton parcours pour parler anglais au travail.</p>
      <button onClick={signIn} disabled={busy}>Se connecter avec GitHub</button>
      {error && <p className="ko">{error}</p>}
    </main>
  );
}
