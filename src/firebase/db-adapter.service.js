// src/firebase/db-adapter.service.js
// Adapter that intelligently switches between old and new Firebase structures
// Checks for new structure first (users/{uid}/data/lists), falls back to old structure

import { useFirestoreCollection } from './db.service';
import { useFirestoreNewStructure } from './db-new-structure.service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { warn } from '../utils/logger';

export function useFirestoreAdapter() {
  let useNewStructure = false;
  let userId = null;

  const oldService = useFirestoreCollection('games');
  const newService = useFirestoreNewStructure();

  /**
   * Check if new structure exists for user
   */
  async function checkNewStructure(currentUserId) {
    try {
      userId = currentUserId;
      const listRef = doc(db, `users/${currentUserId}/data`, 'lists');
      const docSnap = await getDoc(listRef);
      useNewStructure = docSnap.exists();

      if (useNewStructure) {
        warn('Using new Firebase structure (v3.0)');
      } else {
        warn('Using old Firebase structure (v2.0)');
      }

      return useNewStructure;
    } catch (error) {
      warn('Could not check new structure, falling back to old:', error);
      useNewStructure = false;
      return false;
    }
  }

  /**
   * Get which structure is currently being used
   */
  function isUsingNewStructure() {
    return useNewStructure;
  }

  /**
   * Get all items (delegates to appropriate service)
   */
  async function getItems(userId) {
    await checkNewStructure(userId);

    if (useNewStructure) {
      return newService.getItems(userId);
    } else {
      return oldService.getItems(userId);
    }
  }

  /**
   * Get single item
   */
  async function getItem(id) {
    if (useNewStructure) {
      return newService.getItem(userId, id);
    } else {
      return oldService.getItem(id);
    }
  }

  /**
   * Add new item
   */
  async function addItem(data, id = null, status = 'upcoming') {
    if (useNewStructure) {
      return newService.addItem(userId, data, status);
    } else {
      return oldService.addItem(data, id);
    }
  }

  /**
   * Update item
   */
  async function updateItem(id, data, merge = true, oldStatus = null) {
    if (useNewStructure) {
      return newService.updateItem(userId, id, data, oldStatus);
    } else {
      return oldService.updateItem(id, data, merge);
    }
  }

  /**
   * Delete item
   */
  async function deleteItem(id) {
    if (useNewStructure) {
      return newService.deleteItem(userId, id);
    } else {
      return oldService.deleteItem(id);
    }
  }

  /**
   * Batch update operations
   */
  async function batchUpdate(operations) {
    if (useNewStructure) {
      return newService.batchUpdate(userId, operations);
    } else {
      return oldService.batchUpdate(operations);
    }
  }

  /**
   * Subscribe to items (real-time)
   */
  function subscribeToItems(userId, callback, options = {}) {
    checkNewStructure(userId);

    if (useNewStructure) {
      return newService.subscribeToItems(userId, callback);
    } else {
      return oldService.subscribeToItems(userId, callback, options);
    }
  }

  /**
   * Get items grouped by status (new structure only)
   */
  async function getItemsByStatus(userId) {
    await checkNewStructure(userId);

    if (useNewStructure) {
      return newService.getItemsByStatus(userId);
    } else {
      return { success: false, error: 'Old structure does not support status grouping' };
    }
  }

  /**
   * Subscribe to items grouped by status
   */
  function subscribeToItemsByStatus(userId, callback) {
    checkNewStructure(userId);

    if (useNewStructure) {
      return newService.subscribeToItemsByStatus(userId, callback);
    } else {
      // For old structure, flatten and group in callback
      return oldService.subscribeToItems(userId, (result) => {
        if (result.success) {
          const grouped = {};
          for (const item of result.data) {
            const status = item.status || 'upcoming';
            if (!grouped[status]) {
              grouped[status] = [];
            }
            grouped[status].push(item);
          }
          callback({ success: true, data: grouped });
        } else {
          callback(result);
        }
      });
    }
  }

  /**
   * Get metadata (categories)
   */
  async function getMetadata(userId) {
    await checkNewStructure(userId);

    if (useNewStructure) {
      return newService.getMetadata(userId);
    } else {
      // Old structure - use category service
      return { success: false, error: 'Use category service for old structure' };
    }
  }

  /**
   * Subscribe to metadata changes
   */
  function subscribeToMetadata(userId, callback) {
    checkNewStructure(userId);

    if (useNewStructure) {
      return newService.subscribeToMetadata(userId, callback);
    } else {
      return () => {};
    }
  }

  return {
    checkNewStructure,
    isUsingNewStructure,
    getItems,
    getItem,
    addItem,
    updateItem,
    deleteItem,
    batchUpdate,
    subscribeToItems,
    getItemsByStatus,
    subscribeToItemsByStatus,
    getMetadata,
    subscribeToMetadata,
    getRequestStats: () => oldService.getRequestStats()
  };
}
