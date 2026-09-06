// Simple IndexedDB & LocalStorage storage utility

const DB_NAME = 'QRCodeAppDB';
const STORE_NAME = 'templates';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

// Save uploaded template image
export async function saveTemplateImage(dataUrl) {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(dataUrl, 'currentTemplate');
      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
  } catch (e) {
    console.warn('IndexedDB failed, trying localStorage:', e);
  }

  // Fallback to localStorage if image isn't too huge
  try {
    localStorage.setItem('qr_app_template', dataUrl);
    return true;
  } catch (e) {
    console.warn('LocalStorage quota exceeded for template image:', e);
    return false;
  }
}

// Load saved template image
export async function loadTemplateImage() {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('currentTemplate');
      return new Promise((resolve) => {
        req.onsuccess = () => {
          if (req.result) resolve(req.result);
          else resolve(localStorage.getItem('qr_app_template') || null);
        };
        req.onerror = () => resolve(localStorage.getItem('qr_app_template') || null);
      });
    }
  } catch (e) {
    // ignore
  }

  return localStorage.getItem('qr_app_template') || null;
}

// Save QR Config and Text Config to localStorage
export function saveSettings(qrConfig, textConfig) {
  try {
    localStorage.setItem('qr_app_settings', JSON.stringify({ qrConfig, textConfig }));
  } catch (e) {
    console.warn('Failed to save settings to localStorage', e);
  }
}

// Load QR Config and Text Config
export function loadSettings() {
  try {
    const data = localStorage.getItem('qr_app_settings');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Save Batch Data to localStorage
export function saveBatchData(batchData) {
  try {
    localStorage.setItem('qr_app_batch', JSON.stringify(batchData));
  } catch (e) {
    console.warn('Failed to save batch data to localStorage', e);
  }
}

// Load Batch Data
export function loadBatchData() {
  try {
    const data = localStorage.getItem('qr_app_batch');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Clear all stored data
export async function clearAllSavedData() {
  try {
    localStorage.removeItem('qr_app_settings');
    localStorage.removeItem('qr_app_batch');
    localStorage.removeItem('qr_app_template');
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    }
  } catch (e) {
    console.warn('Failed to clear saved data', e);
  }
}
