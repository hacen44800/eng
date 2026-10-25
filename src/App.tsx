import { useEffect, useMemo, useState } from 'react';
import type { AppEvent } from './core/events';
import type { Services, User } from './services';
import { latestPlacementResult } from './core/placement/result';
import { activeSessionId } from './core/placement/progress';
import LoginScreen from './ui/LoginScreen';
import HomeScreen from './ui/HomeScreen';
import PlacementFlow from './ui/placement/PlacementFlow';

type View = { name: 'home' } | { name: 'placement'; sessionId: string };

const OFFLINE_BANNER_DELAY_MS = 2000;

export default function App({ services }: { services: Services }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [pending, setPending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: 'home' });

  useEffect(() => services.auth.onUser(setUser), [services]);

  useEffect(() => {
    if (!user) return;
    services.store.flushOutbox(user.uid);
    return services.store.subscribe(
      user.uid,
      (evts, isPending) => { setEvents(evts); setPending(isPending); setSyncError(null); },
      err => setSyncError(err.message),
    );
  }, [services, user]);

  // Une écriture en attente est normale quelques centaines de ms en ligne : on ne signale que si ça dure.
  const [showOffline, setShowOffline] = useState(false);
  useEffect(() => {
    if (!pending) { setShowOffline(false); return; }
    const t = setTimeout(() => setShowOffline(true), OFFLINE_BANNER_DELAY_MS);
    return () => clearTimeout(t);
  }, [pending]);

  const result = useMemo(() => latestPlacementResult(events), [events]);
  const unfinished = useMemo(() => activeSessionId(events), [events]);

  if (user === undefined) return <main><p className="muted">Chargement…</p></main>;
  if (user === null) return <LoginScreen onSignIn={() => services.auth.signIn()} />;

  return (
    <>
      {(showOffline || syncError) && (
        <div className="toast">
          {showOffline && <div className="banner">Hors ligne : tes réponses seront synchronisées au retour du réseau.</div>}
          {syncError && <div className="banner">Problème de synchronisation : {syncError}</div>}
        </div>
      )}
      {view.name === 'placement' ? (
        <PlacementFlow
          services={services}
          uid={user.uid}
          events={events}
          sessionId={view.sessionId}
          onDone={() => setView({ name: 'home' })}
        />
      ) : (
        <HomeScreen
          name={user.name}
          result={result}
          unfinishedSessionId={unfinished}
          onStart={() => setView({ name: 'placement', sessionId: crypto.randomUUID() })}
          onResume={sessionId => setView({ name: 'placement', sessionId })}
          onSignOut={() => services.auth.signOut()}
        />
      )}
    </>
  );
}
