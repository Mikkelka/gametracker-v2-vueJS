// src/firebase/db-new-structure.service.js
// New Firebase service for v3.0 structure (users/{uid}/data/lists)
// Handles reading and writing to the pre-grouped list structure

import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { useMediaTypeStore } from '../stores/mediaType';
import { warn, error } from '../utils/logger';

export function useFirestoreNewStructure() {
  const requestStats = {
    lastRequestTime: Date.now(),
    requestsThisHour: 0,
    hourlyLimit: parseInt(import.meta.env.VITE_MAX_OPERATIONS_PER_HOUR)
  };

  /**
   * Get the status list name for the current media type
   */
  function getStatusForMediaType() {
    const mediaTypeStore = useMediaTypeStore();
    return mediaTypeStore.currentType;
  }

  /**
   * Get all items for current media type from the lists document
   * Returns items grouped by status
   */
  async function getItemsByStatus(userId) {
    try {
      const mediaType = getStatusForMediaType();
      const listRef = doc(db, `users/${userId}/data`, 'lists');
      const docSnap = await getDoc(listRef);

      if (!docSnap.exists()) {
        return { success: true, data: {} };
      }

      const listsData = docSnap.data();
      const mediaTypeData = listsData[mediaType] || {};

      return { success: true, data: mediaTypeData };
    } catch (error) {
      error(`Error getting items by status for ${getStatusForMediaType()}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all items (flattened) for current media type
   * Combines items from all status lists
   */
  async function getItems(userId) {
    try {
      const result = await getItemsByStatus(userId);
      if (!result.success) {
        return result;
      }

      // Flatten all status lists into a single array
      const items = [];
      for (const status of Object.keys(result.data)) {
        const statusItems = result.data[status];
        if (Array.isArray(statusItems)) {
          items.push(...statusItems);
        }
      }

      return { success: true, data: items };
    } catch (error) {
      error(`Error getting items for ${getStatusForMediaType()}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get single item by ID from lists
   */
  async function getItem(userId, itemId) {
    try {
      const result = await getItemsByStatus(userId);
      if (!result.success) {
        return result;
      }

      // Search for item in all status lists
      for (const statusItems of Object.values(result.data)) {
        if (Array.isArray(statusItems)) {
          const found = statusItems.find(item => item.id === itemId);
          if (found) {
            return { success: true, data: found };
          }
        }
      }

      return { success: false, error: 'Item not found' };
    } catch (error) {
      error(`Error getting item ${itemId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add new item to a specific status list
   */
  async function addItem(userId, itemData, status = 'upcoming') {
    try {
      const mediaType = getStatusForMediaType();
      const listRef = doc(db, `users/${userId}/data`, 'lists');

      const newItem = {
        ...itemData,
        userId: userId,
        createdAt: itemData.createdAt || new Date(),
        updatedAt: itemData.updatedAt || new Date()
      };

      // Get current list data
      const docSnap = await getDoc(listRef);
      const listsData = docSnap.exists() ? docSnap.data() : {};

      // Ensure media type structure exists
      if (!listsData[mediaType]) {
        listsData[mediaType] = {};
      }

      // Ensure status array exists
      if (!Array.isArray(listsData[mediaType][status])) {
        listsData[mediaType][status] = [];
      }

      // Add new item
      listsData[mediaType][status].push(newItem);

      // Write back
      await setDoc(listRef, listsData, { merge: true });

      return {
        success: true,
        data: {
          id: newItem.id,
          ...newItem
        }
      };
    } catch (error) {
      error(`Error adding item to ${getStatusForMediaType()}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update item in the lists structure
   */
  async function updateItem(userId, itemId, updateData, oldStatus = null) {
    try {
      const mediaType = getStatusForMediaType();
      const listRef = doc(db, `users/${userId}/data`, 'lists');

      const docSnap = await getDoc(listRef);
      if (!docSnap.exists()) {
        return { success: false, error: 'Lists document not found' };
      }

      const listsData = docSnap.data();
      const mediaTypeData = listsData[mediaType] || {};

      let found = false;
      let newStatus = updateData.status;
      let updatedItem = null;

      // If status changed, move item to new status list
      if (oldStatus && newStatus && oldStatus !== newStatus) {
        // Find and remove from old status
        if (Array.isArray(mediaTypeData[oldStatus])) {
          const index = mediaTypeData[oldStatus].findIndex(item => item.id === itemId);
          if (index >= 0) {
            const [removedItem] = mediaTypeData[oldStatus].splice(index, 1);
            updatedItem = { ...removedItem, ...updateData };

            // Add to new status
            if (!Array.isArray(mediaTypeData[newStatus])) {
              mediaTypeData[newStatus] = [];
            }
            mediaTypeData[newStatus].push(updatedItem);
            found = true;
          }
        }
      } else {
        // Update in current status list
        for (const status of Object.keys(mediaTypeData)) {
          if (Array.isArray(mediaTypeData[status])) {
            const index = mediaTypeData[status].findIndex(item => item.id === itemId);
            if (index >= 0) {
              mediaTypeData[status][index] = {
                ...mediaTypeData[status][index],
                ...updateData,
                updatedAt: new Date()
              };
              updatedItem = mediaTypeData[status][index];
              found = true;
              break;
            }
          }
        }
      }

      if (!found) {
        return { success: false, error: 'Item not found' };
      }

      listsData[mediaType] = mediaTypeData;
      await setDoc(listRef, listsData, { merge: true });

      return {
        success: true,
        data: updatedItem
      };
    } catch (error) {
      error(`Error updating item ${itemId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete item from lists
   */
  async function deleteItem(userId, itemId, status = null) {
    try {
      const mediaType = getStatusForMediaType();
      const listRef = doc(db, `users/${userId}/data`, 'lists');

      const docSnap = await getDoc(listRef);
      if (!docSnap.exists()) {
        return { success: false, error: 'Lists document not found' };
      }

      const listsData = docSnap.data();
      const mediaTypeData = listsData[mediaType] || {};

      let found = false;
      for (const st of Object.keys(mediaTypeData)) {
        if (Array.isArray(mediaTypeData[st])) {
          const index = mediaTypeData[st].findIndex(item => item.id === itemId);
          if (index >= 0) {
            mediaTypeData[st].splice(index, 1);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        return { success: false, error: 'Item not found' };
      }

      listsData[mediaType] = mediaTypeData;
      await setDoc(listRef, listsData, { merge: true });

      return { success: true, data: { id: itemId } };
    } catch (error) {
      error(`Error deleting item ${itemId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch update items (set multiple items in specific statuses)
   */
  async function batchUpdate(userId, operations) {
    if (!operations || !operations.length) {
      return { success: true, count: 0 };
    }

    try {
      const mediaType = getStatusForMediaType();
      const listRef = doc(db, `users/${userId}/data`, 'lists');

      const docSnap = await getDoc(listRef);
      const listsData = docSnap.exists() ? docSnap.data() : {};
      let mediaTypeData = listsData[mediaType] || {};

      // Initialize all status lists if they don't exist
      const mediaTypeStore = useMediaTypeStore();
      const statusList = mediaTypeStore.config.statusList || [];
      for (const statusObj of statusList) {
        const statusId = statusObj.id;
        if (!Array.isArray(mediaTypeData[statusId])) {
          mediaTypeData[statusId] = [];
        }
      }

      let successCount = 0;

      // Process each operation
      for (const op of operations) {
        try {
          const itemData = {
            ...op.data,
            userId: userId,
            createdAt: op.data.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (op.type === 'set') {
            // Remove from all lists first
            for (const status of Object.keys(mediaTypeData)) {
              const index = mediaTypeData[status].findIndex(item => item.id === op.id);
              if (index >= 0) {
                mediaTypeData[status].splice(index, 1);
              }
            }

            // Add to correct status
            const status = itemData.status || 'upcoming';
            if (!Array.isArray(mediaTypeData[status])) {
              mediaTypeData[status] = [];
            }
            mediaTypeData[status].push(itemData);
            successCount++;
          } else if (op.type === 'update') {
            // Find and update item
            for (const status of Object.keys(mediaTypeData)) {
              const index = mediaTypeData[status].findIndex(item => item.id === op.id);
              if (index >= 0) {
                mediaTypeData[status][index] = {
                  ...mediaTypeData[status][index],
                  ...itemData
                };
                successCount++;
                break;
              }
            }
          } else if (op.type === 'delete') {
            // Remove from all lists
            for (const status of Object.keys(mediaTypeData)) {
              const index = mediaTypeData[status].findIndex(item => item.id === op.id);
              if (index >= 0) {
                mediaTypeData[status].splice(index, 1);
                successCount++;
                break;
              }
            }
          }
        } catch (opError) {
          warn(`Error in batch operation for ${op.id}:`, opError);
        }
      }

      listsData[mediaType] = mediaTypeData;
      await setDoc(listRef, listsData, { merge: true });

      return {
        success: true,
        count: operations.length,
        successCount: successCount
      };
    } catch (error) {
      error(`Error in batch update for ${getStatusForMediaType()}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to items changes for current media type
   */
  function subscribeToItems(userId, callback) {
    try {
      const mediaType = getStatusForMediaType();
      const listRef = doc(db, `users/${userId}/data`, 'lists');

      console.warn(`[DB-NEW] subscribeToItems: mediaType=${mediaType}, userId=${userId}`);

      return onSnapshot(
        listRef,
        (docSnap) => {
          try {
            if (!docSnap.exists()) {
              console.warn('[DB-NEW] Lists document does not exist');
              callback({ success: true, data: [] });
              return;
            }

            const listsData = docSnap.data();
            console.warn('[DB-NEW] listsData keys:', Object.keys(listsData || {}));
            const mediaTypeData = listsData[mediaType] || {};
            console.warn(`[DB-NEW] mediaTypeData for ${mediaType}:`, {
              exists: !!listsData[mediaType],
              keys: Object.keys(mediaTypeData),
              count: Object.values(mediaTypeData).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0)
            });

            // Flatten all status lists and restore status field to each item
            const items = [];
            for (const [statusId, statusItems] of Object.entries(mediaTypeData)) {
              if (Array.isArray(statusItems)) {
                items.push(...statusItems.map(item => ({
                  ...item,
                  status: statusId
                })));
              }
            }

            console.warn(`[DB-NEW] Total items loaded: ${items.length}`);
            callback({ success: true, data: items });
          } catch (parseError) {
            error(`Error parsing snapshot for ${mediaType}:`, parseError);
            callback({ success: false, error: parseError });
          }
        },
        (snapshotError) => {
          error(`Snapshot listener error for ${mediaType}:`, snapshotError);
          callback({ success: false, error: snapshotError });
        }
      );
    } catch (error) {
      error(`Error setting up listener for ${getStatusForMediaType()}:`, error);
      callback({ success: false, error });
      return () => {};
    }
  }

  /**
   * Subscribe to items grouped by status
   * Returns items organized by their status lists
   */
  function subscribeToItemsByStatus(userId, callback) {
    try {
      const mediaType = getStatusForMediaType();
      const listRef = doc(db, `users/${userId}/data`, 'lists');

      return onSnapshot(
        listRef,
        (docSnap) => {
          try {
            if (!docSnap.exists()) {
              callback({ success: true, data: {} });
              return;
            }

            const listsData = docSnap.data();
            const mediaTypeData = listsData[mediaType] || {};

            callback({ success: true, data: mediaTypeData });
          } catch (parseError) {
            error(`Error parsing status snapshot for ${mediaType}:`, parseError);
            callback({ success: false, error: parseError });
          }
        },
        (snapshotError) => {
          error(`Status snapshot listener error for ${mediaType}:`, snapshotError);
          callback({ success: false, error: snapshotError });
        }
      );
    } catch (error) {
      error(`Error setting up status listener for ${getStatusForMediaType()}:`, error);
      callback({ success: false, error });
      return () => {};
    }
  }

  /**
   * Get metadata (categories) for current media type
   */
  async function getMetadata(userId) {
    try {
      const mediaTypeStore = useMediaTypeStore();
      const categoryName = mediaTypeStore.config.categoryName.toLowerCase();

      // Map to Firebase metadata key
      const metadataKeyMap = {
        'platform': 'platforms',
        'genre': 'genres',
        'author': 'authors'
      };
      const metadataKey = metadataKeyMap[categoryName] || categoryName + 's';

      const metadataRef = doc(db, `users/${userId}/data`, 'metadata');
      const docSnap = await getDoc(metadataRef);

      if (!docSnap.exists()) {
        return { success: true, data: [] };
      }

      const metadata = docSnap.data();
      const categories = metadata[metadataKey] || [];

      return { success: true, data: categories };
    } catch (error) {
      error(`Error getting metadata:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to metadata changes
   */
  function subscribeToMetadata(userId, callback) {
    try {
      const mediaTypeStore = useMediaTypeStore();
      const categoryName = mediaTypeStore.config.categoryName.toLowerCase();

      const metadataKeyMap = {
        'platform': 'platforms',
        'genre': 'genres',
        'author': 'authors'
      };
      const metadataKey = metadataKeyMap[categoryName] || categoryName + 's';

      const metadataRef = doc(db, `users/${userId}/data`, 'metadata');

      return onSnapshot(
        metadataRef,
        (docSnap) => {
          try {
            if (!docSnap.exists()) {
              callback({ success: true, data: [] });
              return;
            }

            const metadata = docSnap.data();
            const categories = metadata[metadataKey] || [];

            callback({ success: true, data: categories });
          } catch (parseError) {
            error(`Error parsing metadata snapshot:`, parseError);
            callback({ success: false, error: parseError });
          }
        },
        (snapshotError) => {
          error(`Metadata snapshot listener error:`, snapshotError);
          callback({ success: false, error: snapshotError });
        }
      );
    } catch (error) {
      error(`Error setting up metadata listener:`, error);
      callback({ success: false, error });
      return () => {};
    }
  }

  return {
    getItems,
    getItem,
    getItemsByStatus,
    addItem,
    updateItem,
    deleteItem,
    batchUpdate,
    subscribeToItems,
    subscribeToItemsByStatus,
    getMetadata,
    subscribeToMetadata,
    getRequestStats: () => ({ ...requestStats })
  };
}
