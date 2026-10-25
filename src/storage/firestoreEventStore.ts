import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../firebase/app';
import type { AppEvent } from '../core/events';
import type { EventStore } from '../services';
import { createOutbox } from './outbox';

export function createFirestoreEventStore(onWriteError: (err: Error) => void): EventStore {
  const outbox = createOutbox(localStorage);

  const write = (uid: string, e: AppEvent) => {
    // Pas d'await : la promesse ne se résout qu'à l'accusé du serveur (jamais hors ligne).
    setDoc(doc(db, 'users', uid, 'events', e.id), e).catch((err: Error) => {
      outbox.add(e);
      onWriteError(err);
    });
  };

  return {
    append: write,
    subscribe(uid, cb, onError) {
      const q = query(collection(db, 'users', uid, 'events'), orderBy('createdAt'));
      return onSnapshot(
        q,
        { includeMetadataChanges: true },
        snap => cb(snap.docs.map(d => d.data() as AppEvent), snap.metadata.hasPendingWrites),
        err => onError(err),
      );
    },
    flushOutbox(uid) {
      for (const e of outbox.drain()) write(uid, e);
    },
  };
}
