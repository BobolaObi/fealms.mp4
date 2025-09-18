const DB_NAME = 'fealms.mp4';
const DB_VERSION = 1;
const STORE_MEDIA = 'media';

let dbPromise = null;

function getDB(){
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject)=>{
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event)=>{
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MEDIA)){
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
    };
    request.onsuccess = ()=> resolve(request.result);
    request.onerror = ()=> reject(request.error);
  });
  return dbPromise;
}

export async function saveMediaRecord(record){
  const db = await getDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
    tx.objectStore(STORE_MEDIA).put(record);
  });
}

export async function loadAllMediaRecords(){
  const db = await getDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    tx.onerror = ()=> reject(tx.error);
    const req = tx.objectStore(STORE_MEDIA).getAll();
    req.onsuccess = ()=> resolve(req.result || []);
    req.onerror = ()=> reject(req.error);
  });
}

export async function getMediaRecord(id){
  const db = await getDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    tx.onerror = ()=> reject(tx.error);
    const req = tx.objectStore(STORE_MEDIA).get(id);
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
}

export async function clearAllMediaRecords(){
  const db = await getDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
    tx.objectStore(STORE_MEDIA).clear();
  });
}

