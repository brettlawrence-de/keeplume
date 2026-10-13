import { blank, State, validate } from './model.js';
export const DATABASE = 'keeplume-vault', SCHEMA = 1;
export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE, SCHEMA);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains('vault'))
                request.result.createObjectStore('vault');
        };
        request.onerror = () => reject(Error('Device storage could not open. Do not clear browser data; try reopening Safari.'));
        request.onblocked = () => reject(Error('Close other Nelmavriq tabs and retry the storage update.'));
        request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    });
}
export async function load(): Promise<State> {
    const db = await openDB();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction('vault', 'readonly'), request = tx.objectStore('vault').get('state');
            request.onsuccess = () => {
                try {
                    resolve(request.result ? validate(request.result) : blank());
                }
                catch (e) {
                    reject(e);
                }
            };
            request.onerror = () => reject(Error('Could not read device storage. Your stored data was not changed.'));
        });
    }
    finally {
        db.close();
    }
}
export async function commit(next: State, expected: number): Promise<State> {
    const value = validate({ ...next, revision: expected + 1 });
    const db = await openDB();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction('vault', 'readwrite'), store = tx.objectStore('vault');
            let problem = 'Could not save. Your previous records are preserved. Check available storage and export a backup.';
            tx.oncomplete = () => resolve(value);
            tx.onabort = () => reject(Error(problem));
            tx.onerror = () => {
                if (tx.error?.name === 'QuotaExceededError')
                    problem = 'Device storage is full. Nothing was saved. Free space or remove an unneeded photo after making a backup.';
            };
            const current = store.get('state');
            current.onsuccess = () => {
                if ((current.result?.revision || 0) !== expected) {
                    problem = 'Another Nelmavriq tab changed these records. Reload and review before saving again.';
                    tx.abort();
                    return;
                }
                try {
                    store.put(value, 'state');
                }
                catch (error) {
                    problem = error instanceof DOMException && error.name === 'QuotaExceededError' ? 'Device storage is full. Nothing was saved. Export a backup before freeing space.' : problem;
                    tx.abort();
                }
            };
        });
    }
    finally {
        db.close();
    }
}
