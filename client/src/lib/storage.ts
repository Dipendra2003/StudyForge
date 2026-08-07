// IndexedDB wrapper for local file storage

const DB_NAME = 'JadooChatDB';
const STORE_NAME = 'chatAttachments';
const DB_VERSION = 1;

export interface ChatAttachment {
  id: string; // sessionId_timestamp_random
  sessionId: string;
  messageId?: string; // Optional linkage to a specific message
  fileData: string; // Base64 data
  mimeType: string;
  name: string;
  size: number;
  timestamp: number;
}

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };
  });
};

export const saveAttachmentLocally = async (
  sessionId: string, 
  file: File,
  messageId?: string
): Promise<ChatAttachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result as string;
        // Extract base64 part if it's a data URL
        const fileData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const id = `${sessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        const attachment: ChatAttachment = {
          id,
          sessionId,
          messageId,
          fileData,
          mimeType: file.type,
          name: file.name,
          size: file.size,
          timestamp: Date.now()
        };
        
        const request = store.put(attachment);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(attachment);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

export const getSessionAttachments = async (sessionId: string): Promise<ChatAttachment[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
};

export const deleteAttachment = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const clearSessionAttachments = async (sessionId: string): Promise<void> => {
  try {
    const attachments = await getSessionAttachments(sessionId);
    for (const attachment of attachments) {
      await deleteAttachment(attachment.id);
    }
  } catch (error) {

  }
};
