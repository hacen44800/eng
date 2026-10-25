const KEY = 'eng.deviceId';

export function getDeviceId(storage: Storage = localStorage): string {
  let id = storage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(KEY, id);
  }
  return id;
}
