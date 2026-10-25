import type { AppEvent } from './core/events';
import type { Grader } from './grader/types';
import type { Speech } from './speech/browserSpeech';
import type { PlacementContent } from './content/schemas';

export type User = { uid: string; name: string };

export interface AuthService {
  onUser(cb: (u: User | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

export interface EventStore {
  /** Ajout sans attente : écrit dans le cache local, synchronisé plus tard. */
  append(uid: string, e: AppEvent): void;
  /** onError reçoit les erreurs de lecture ET les écritures refusées (mises en file locale). */
  subscribe(uid: string, cb: (events: AppEvent[], pending: boolean) => void, onError: (err: Error) => void): () => void;
  /** Renvoie les événements dont l'écriture avait échoué. */
  flushOutbox(uid: string): void;
}

export type Services = {
  auth: AuthService;
  store: EventStore;
  speech: Speech;
  grader: Grader;
  deviceId: string;
  content: PlacementContent;
};
