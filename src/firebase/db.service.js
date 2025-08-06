// src/firebase/db.service.js 
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc,
  deleteDoc, 
  writeBatch,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { useMediaTypeStore } from '../stores/mediaType';
import { warn, error } from '../utils/logger';

export function useFirestoreCollection(collectionName) {
  const requestStats = {
    lastRequestTime: Date.now(),
    requestsThisHour: 0,
    hourlyLimit: parseInt(import.meta.env.VITE_MAX_OPERATIONS_PER_HOUR)
  };

  function getCollectionPath() {
    try {
      const mediaTypeStore = useMediaTypeStore();
      const mediaType = mediaTypeStore.currentType;
      
      if (mediaType === 'game') {
        return collectionName;
      } 
      else {
        let mappedCollection = collectionName;
        if (collectionName === 'games') {
          mappedCollection = mediaTypeStore.config.collections.items;
        } else if (collectionName === 'platforms') {
          mappedCollection = mediaTypeStore.config.collections.categories;
        }
        
        return `mediaTypes/${mediaType}/${mappedCollection}`;
      }
    } catch (error) {
      warn('MediaTypeStore not available, defaulting to original structure', error);
      return collectionName;
    }
  }
  
  async function safeOperation(operation, errorMsg) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      error(errorMsg, error);
      return { success: false, error: error.message || errorMsg };
    }
  }
  
  async function getItems(userId, options = {}) {
    return safeOperation(async () => {
      const collectionPath = getCollectionPath();
      const collectionRef = collection(db, collectionPath);
      const queryConstraints = [where('userId', '==', userId)];
      
      if (options.orderBy) {
        queryConstraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }
      
      if (options.limit) {
        queryConstraints.push(limit(options.limit));
      }
      
      if (options.where && Array.isArray(options.where)) {
        options.where.forEach(condition => {
          queryConstraints.push(where(condition.field, condition.operator, condition.value));
        });
      }
      
      const q = query(collectionRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }, `Error getting items from ${getCollectionPath()}`);
  }
  
  async function getItem(id) {
    return safeOperation(async () => {
      const collectionPath = getCollectionPath();
      const docRef = doc(db, collectionPath, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      
      throw new Error('Document not found');
    }, `Error getting item from ${getCollectionPath()}`);
  }
  
  async function addItem(data, id = null) {
    return safeOperation(async () => {
      const collectionPath = getCollectionPath();
      const itemData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = id 
        ? doc(db, collectionPath, id) 
        : doc(collection(db, collectionPath));
      
      await setDoc(docRef, itemData);
      
      return { 
        id: docRef.id,
        ...itemData,
        createdAt: itemData.createdAt || new Date(),
        updatedAt: itemData.updatedAt || new Date()
      };
    }, `Error adding item to ${getCollectionPath()}`);
  }
  
  async function updateItem(id, data, merge = true) {
    return safeOperation(async () => {
      const collectionPath = getCollectionPath();
      const docRef = doc(db, collectionPath, id);
      
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      if (merge) {
        await setDoc(docRef, updateData, { merge: true });
      } else {
        await updateDoc(docRef, updateData);
      }
      
      return { 
        id,
        ...updateData,
        updatedAt: updateData.updatedAt || new Date()
      };
    }, `Error updating item in ${getCollectionPath()}`);
  }
  
  async function deleteItem(id) {
    return safeOperation(async () => {
      const collectionPath = getCollectionPath();
      await deleteDoc(doc(db, collectionPath, id));
      return { id };
    }, `Error deleting item from ${getCollectionPath()}`);
  }
  
  async function batchUpdate(operations) {
    if (!operations || !operations.length) {
      return { success: true, count: 0 };
    }
    
    const MAX_BATCH_SIZE = 500;
    const collectionPath = getCollectionPath();
    
    return safeOperation(async () => {
      let totalCount = 0;
      let successCount = 0;
      
      for (let i = 0; i < operations.length; i += MAX_BATCH_SIZE) {
        const batchChunk = operations.slice(i, i + MAX_BATCH_SIZE);
        const batch = writeBatch(db);
        
        batchChunk.forEach(op => {
          const docRef = doc(db, collectionPath, op.id);
          
          if (op.type === 'set') {
            batch.set(docRef, {
              ...op.data,
              updatedAt: serverTimestamp()
            }, { merge: op.merge !== false });
          } else if (op.type === 'update') {
            batch.update(docRef, {
              ...op.data,
              updatedAt: serverTimestamp()
            });
          } else if (op.type === 'delete') {
            batch.delete(docRef);
          }
          
          totalCount++;
        });
        
        await batch.commit();
        successCount += batchChunk.length;
      }
      
      return { 
        count: totalCount, 
        successCount,
        stats: { 
          totalOperations: totalCount,
          successfulOperations: successCount
        }
      };
    }, `Error in batch operation for ${getCollectionPath()}`);
  }
  
  function subscribeToItems(userId, callback, options = {}) {
    try {
      const collectionPath = getCollectionPath();
      const collectionRef = collection(db, collectionPath);
      
      const queryConstraints = [where('userId', '==', userId)];
      
      if (options.orderBy) {
        queryConstraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }
      
      if (options.where && Array.isArray(options.where)) {
        options.where.forEach(condition => {
          queryConstraints.push(where(condition.field, condition.operator, condition.value));
        });
      }
      
      const q = query(collectionRef, ...queryConstraints);
      
      return onSnapshot(q, snapshot => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        callback({ success: true, data: items });
      }, error => {
        error(`Error in snapshot listener for ${collectionPath}:`, error);
        callback({ success: false, error });
      });
    } catch (error) {
      error(`Error setting up listener for ${getCollectionPath()}:`, error);
      callback({ success: false, error });
      return () => {};
    }
  }
  
  return {
    getItems,
    getItem,
    addItem,
    updateItem,
    deleteItem,
    batchUpdate,
    subscribeToItems,
    getRequestStats: () => ({ ...requestStats })
  };
}