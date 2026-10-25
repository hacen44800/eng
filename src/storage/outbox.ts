import type { AppEvent } from '../core/events';

/** File locale des événements dont l'écriture Firestore a échoué. */
export function createOutbox(storage: Storage, key = 'eng.outbox') {
  const read = (): AppEvent[] => {
    try {
      const v = JSON.parse(storage.getItem(key) ?? '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  return {
    add(e: AppEvent) {
      const items = read();
      if (!items.some(x => x.id === e.id)) storage.setItem(key, JSON.stringify([...items, e]));
    },
    drain(): AppEvent[] {
      const items = read();
      storage.removeItem(key);
      return items;
    },
  };
}
