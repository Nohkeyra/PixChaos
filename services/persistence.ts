/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const DB_NAME = 'PixshopDB';
const DB_VERSION = 3; // Bumped to 3 to force schema validation and recovery
const STORE_NAME = 'history';
const PRESETS_STORE = 'style_presets';

export const dataUrlToBlob = (dataUrl: string): Blob => {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) {
      console.warn("Invalid Data URL format, defaulting to image/png for blob conversion.");
      return new Blob([], { type: 'image/png' });
    }

    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("Failed to convert data URL to blob, using fallback empty blob:", e);
    return new Blob([], { type: 'image/png' }); // Return empty blob on error
  }
};

const base64ToFile = (dataurl: string, filename: string, mimeType: string, lastModified: number): File => {
    // Ensure mimeType is an image type, fallback if not.
    const effectiveMimeType = mimeType.startsWith('image/') ? mimeType : 'image/png';

    if (!dataurl || !dataurl.includes(',')) {
        // Fallback for invalid data URL
        return new File([""], filename, {type: effectiveMimeType, lastModified: lastModified});
    }
    const blob = dataUrlToBlob(dataurl);
    return new File([blob], filename, {type: effectiveMimeType, lastModified: lastModified});
}

interface SerializedFile {
    name: string;
    type: string;
    lastModified: number;
    data: Blob | string;
    isUrl?: boolean;
}

interface StoredAppState {
    id: string;
    history: SerializedFile[];
    historyIndex: number;
    activeTab: string;
    hakiEnabled?: boolean;
    hakiColor?: string;
    hakiSize?: number;
    hakiSpeed?: number;
    isPlatinumTier?: boolean;
    timestamp: number;
}

interface AppState {
    history: (File | string)[];
    historyIndex: number;
    activeTab: string;
    hakiEnabled?: boolean;
    hakiColor?: string;
    hakiSize?: number;
    hakiSpeed?: number;
    isPlatinumTier?: boolean;
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Store 1: Session History
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }

            // Store 2: Style Presets
            if (!db.objectStoreNames.contains(PRESETS_STORE)) {
                db.createObjectStore(PRESETS_STORE, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

export const saveState = async (
    history: (File | string)[], 
    historyIndex: number, 
    activeTab: string, 
    hakiEnabled: boolean,
    hakiColor: string = '#DB24E3',
    hakiSize: number = 1,
    hakiSpeed: number = 1,
    isPlatinumTier: boolean = true
): Promise<void> => {
    try {
        const serializedHistory: SerializedFile[] = await Promise.all(history.map(async (item) => {
            if (typeof item === 'string') {
                if (item.startsWith('data:')) {
                    const blob = dataUrlToBlob(item);
                    return {
                        name: `generated-${Date.now()}.png`,
                        type: blob.type,
                        lastModified: Date.now(),
                        data: blob,
                        isUrl: false,
                    };
                }
                console.warn("Attempted to save a remote URL directly. Converting to placeholder image.");
                const placeholderBlob = new Blob([], { type: 'image/png' });
                 return {
                    name: 'placeholder-remote.png',
                    type: 'image/png',
                    lastModified: Date.now(),
                    data: placeholderBlob,
                    isUrl: false,
                };
            }
            return {
                name: item.name,
                type: item.type,
                lastModified: item.lastModified,
                data: item,
                isUrl: false,
            };
        }));

        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        const state: StoredAppState = {
            id: 'current',
            history: serializedHistory,
            historyIndex,
            activeTab,
            hakiEnabled,
            hakiColor,
            hakiSize,
            hakiSpeed,
            isPlatinumTier,
            timestamp: Date.now()
        };

        const request = store.put(state);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error("IndexedDB Put Error:", request.error);
                reject(request.error);
            };
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Persistence save failed:", e instanceof Error ? e.message : e);
        throw e;
    }
};

export const loadState = async (): Promise<AppState | null> => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('current');

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const result = request.result as StoredAppState | undefined;
                if (result) {
                    const history = result.history.map(f => {
                        if (f.isUrl) {
                            return new File([""], "placeholder-remote.png", { type: 'image/png', lastModified: Date.now() });
                        }
                        
                        if (typeof f.data === 'string') {
                            return base64ToFile(f.data, f.name, f.type, f.lastModified);
                        }
                        
                        return new File([f.data as Blob], f.name, { 
                            type: f.type, 
                            lastModified: f.lastModified 
                        });
                    });

                    resolve({
                        history: history,
                        historyIndex: result.historyIndex,
                        activeTab: result.activeTab,
                        hakiEnabled: result.hakiEnabled,
                        hakiColor: result.hakiColor ?? '#DB24E3',
                        hakiSize: result.hakiSize ?? 1,
                        hakiSpeed: result.hakiSpeed ?? 1,
                        isPlatinumTier: result.isPlatinumTier ?? true
                    });
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Persistence load failed:", e instanceof Error ? e.message : e);
        return null;
    }
};

export const clearState = async (): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete('current');
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
         console.error("Persistence clear failed:", e);
         throw e;
    }
};

export const nukeDatabase = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => {
            console.error("Failed to delete DB", req.error);
            resolve();
        };
        req.onblocked = () => {
            console.warn("Delete DB blocked");
            resolve();
        };
    });
};

// --- ROBUST PRESET MANAGEMENT ---

export const saveUserPresets = async (presets: any[]): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(PRESETS_STORE, 'readwrite');
        const store = tx.objectStore(PRESETS_STORE);
        
        // We now enforce the bundle format 'custom_presets' for performance and consistency
        const entry = { id: 'custom_presets', data: presets, timestamp: Date.now() };
        
        const request = store.put(entry);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to save presets to IDB", e);
        throw e;
    }
};

export const loadUserPresets = async (): Promise<any[]> => {
    try {
        const db = await openDB();
        const tx = db.transaction(PRESETS_STORE, 'readwrite'); // Readwrite to allow migration
        const store = tx.objectStore(PRESETS_STORE);
        
        // Use getAll to find *any* saved data, regardless of key format (bundle vs individual)
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const results = request.result;

                // STRATEGY 1: Check for standard Bundle
                const bundle = results.find(r => r.id === 'custom_presets');
                if (bundle && bundle.data && Array.isArray(bundle.data)) {
                    resolve(bundle.data);
                    return;
                }

                // STRATEGY 2: Check for Un-bundled Individual Items (Migration from v1/v2 schema)
                // Filter out the 'custom_presets' key if it exists but is invalid
                const individualItems = results.filter(r => r.id !== 'custom_presets');
                
                if (individualItems.length > 0) {
                    console.log("Persistence: Detected individual presets. Migrating to bundle format...");
                    const validPresets = individualItems;
                    
                    // Save them as a bundle for future efficiency
                    store.put({ id: 'custom_presets', data: validPresets, timestamp: Date.now() });
                    
                    // We can optionally delete individual items here to clean up, but keeping them is safer for now.
                    // Returning migrated data.
                    resolve(validPresets);
                    return;
                }

                // STRATEGY 3: Last Resort - LocalStorage check (Legacy Migration)
                const legacy = localStorage.getItem('user_style_presets');
                if (legacy) {
                    try {
                        const parsed = JSON.parse(legacy);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            console.log("Persistence: Migrating presets from LocalStorage...");
                            store.put({ id: 'custom_presets', data: parsed, timestamp: Date.now() });
                            resolve(parsed);
                            return;
                        }
                    } catch(e) {}
                }

                // No data found
                resolve([]);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load presets from IDB", e);
        return [];
    }
};