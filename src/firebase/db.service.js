// firebase/db.service.js
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

/**
 * Generiske Firestore collection operationer
 * @param {string} collectionName - Navnet på Firestore collection
 * @returns {Object} CRUD operationer for collection
 */
export function useFirestoreCollection(collectionName) {
  /**
   * Henter alle dokumenter for en bruger
   * @param {string} userId - Bruger ID
   * @param {Object} options - Ekstra query options (sortering, filtrering)
   * @returns {Promise<Array>} Array af dokumenter
   */
  async function getItems(userId, options = {}) {
    try {
      const collectionRef = collection(db, collectionName);
      
      // Opbyg query med filters
      let queryConstraints = [where('userId', '==', userId)];
      
      // Tilføj sortering hvis angivet
      if (options.orderBy) {
        queryConstraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }
      
      // Tilføj limit hvis angivet
      if (options.limit) {
        queryConstraints.push(limit(options.limit));
      }
      
      // Tilføj ekstra where-betingelser
      if (options.where && Array.isArray(options.where)) {
        options.where.forEach(condition => {
          queryConstraints.push(where(condition.field, condition.operator, condition.value));
        });
      }
      
      const q = query(collectionRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      return { 
        success: true, 
        data: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };
    } catch (error) {
      console.error(`Error getting items from ${collectionName}:`, error);
      return { success: false, error };
    }
  }
  
  /**
   * Henter et enkelt dokument
   * @param {string} id - Dokument ID
   * @returns {Promise<Object>} Dokumentet
   */
  async function getItem(id) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { 
          success: true, 
          data: {
            id: docSnap.id,
            ...docSnap.data()
          }
        };
      }
      
      return { success: false, error: 'Document not found' };
    } catch (error) {
      console.error(`Error getting item from ${collectionName}:`, error);
      return { success: false, error };
    }
  }
  
  /**
   * Tilføjer et nyt dokument
   * @param {Object} data - Dokumentdata
   * @param {string} id - Valgfrit ID (autogenereres hvis ikke angivet)
   * @returns {Promise<Object>} Det nye dokument
   */
  async function addItem(data, id = null) {
    try {
      // Tilføj timestamp
      const itemData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Brug angivet ID eller generer et nyt
      const docRef = id 
        ? doc(db, collectionName, id) 
        : doc(collection(db, collectionName));
      
      await setDoc(docRef, itemData);
      
      return { 
        success: true, 
        data: { 
          id: docRef.id,
          ...itemData,
          // Erstat server timestamps med aktuelle timestamps i returdata
          createdAt: itemData.createdAt || new Date(),
          updatedAt: itemData.updatedAt || new Date()
        }
      };
    } catch (error) {
      console.error(`Error adding item to ${collectionName}:`, error);
      return { success: false, error };
    }
  }
  
  /**
   * Opdaterer et eksisterende dokument
   * @param {string} id - Dokument ID
   * @param {Object} data - Data der skal opdateres
   * @param {boolean} merge - Om data skal merges (true) eller erstatte (false)
   * @returns {Promise<Object>} Det opdaterede dokument
   */
  async function updateItem(id, data, merge = true) {
    try {
      const docRef = doc(db, collectionName, id);
      
      // Tilføj opdateringstidspunkt
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
        success: true, 
        data: { 
          id,
          ...updateData,
          // Erstat server timestamp med aktuel timestamp i returdata
          updatedAt: updateData.updatedAt || new Date()
        }
      };
    } catch (error) {
      console.error(`Error updating item in ${collectionName}:`, error);
      return { success: false, error };
    }
  }
  
  /**
   * Sletter et dokument
   * @param {string} id - Dokument ID
   * @returns {Promise<Object>} Success status
   */
  async function deleteItem(id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true, id };
    } catch (error) {
      console.error(`Error deleting item from ${collectionName}:`, error);
      return { success: false, error };
    }
  }
  
  /**
   * Udfører batch operationer
   * @param {Array} operations - Array af operationer { type, id, data }
   * @returns {Promise<Object>} Success status
   */
  async function batchUpdate(operations) {
    if (!operations || !operations.length) {
      return { success: true, count: 0 };
    }
    
    try {
      const batch = writeBatch(db);
      let setCount = 0, updateCount = 0, deleteCount = 0;
      
      operations.forEach(op => {
        const docRef = doc(db, collectionName, op.id);
        
        if (op.type === 'set') {
          batch.set(docRef, {
            ...op.data,
            updatedAt: serverTimestamp()
          }, { merge: op.merge !== false });
          setCount++;
        } else if (op.type === 'update') {
          batch.update(docRef, {
            ...op.data,
            updatedAt: serverTimestamp()
          });
          updateCount++;
        } else if (op.type === 'delete') {
          batch.delete(docRef);
          deleteCount++;
        }
      });
      
      await batch.commit();
      
      return { 
        success: true, 
        count: operations.length,
        stats: { setCount, updateCount, deleteCount }
      };
    } catch (error) {
      console.error(`Error in batch operation for ${collectionName}:`, error);
      return { success: false, error };
    }
  }
  
  /**
   * Opsætter realtime listener for dokumenter
   * @param {string} userId - Bruger ID
   * @param {Function} callback - Callback funktion der kaldes ved ændringer
   * @param {Object} options - Ekstra query options
   * @returns {Function} Unsubscribe funktion
   */
  function subscribeToItems(userId, callback, options = {}) {
    try {
      const collectionRef = collection(db, collectionName);
      
      // Opbyg query med filters
      let queryConstraints = [where('userId', '==', userId)];
      
      // Tilføj sortering hvis angivet
      if (options.orderBy) {
        queryConstraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }
      
      // Tilføj ekstra where-betingelser
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
        console.error(`Error in snapshot listener for ${collectionName}:`, error);
        callback({ success: false, error });
      });
    } catch (error) {
      console.error(`Error setting up listener for ${collectionName}:`, error);
      callback({ success: false, error });
      return () => {}; // Returner en no-op unsubscribe funktion
    }
  }
  
  return {
    getItems,
    getItem,
    addItem,
    updateItem,
    deleteItem,
    batchUpdate,
    subscribeToItems
  };
}

/**
 * Hjælpefunktion til fejlhåndtering
 * @param {Function} operation - Asynkron operation der skal køres
 * @param {string} errorMsg - Fejlmeddelelse hvis operationen fejler
 * @returns {Promise<Object>} Resultat med success flag
 */
export async function handleFirestoreOperation(operation, errorMsg) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(errorMsg, error);
    return { success: false, error };
  }
}