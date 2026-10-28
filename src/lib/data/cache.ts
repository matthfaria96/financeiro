import type { Snapshot } from './types';

/** Cópia local no navegador (IndexedDB) para abrir na hora, mesmo antes da rede responder. */
const DB = 'financeiro';
const STORE = 'snapshots';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readCache(householdId: string): Promise<Snapshot | null> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const request = db.transaction(STORE).objectStore(STORE).get(householdId);
      request.onsuccess = () => resolve((request.result as Snapshot) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function writeCache(snapshot: Snapshot): Promise<void> {
  try {
    const db = await open();
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(JSON.parse(JSON.stringify(snapshot)), snapshot.household.id);
  } catch {
    // Sem armazenamento (aba privada): só não abre instantâneo da próxima vez.
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await open();
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
  } catch {
    // nada a limpar
  }
}
