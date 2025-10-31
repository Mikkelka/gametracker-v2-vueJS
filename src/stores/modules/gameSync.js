// src/stores/modules/gameSync.js
import { ref, computed } from 'vue';
import { useFirestoreAdapter } from '../../firebase/db-adapter.service';


export function useGameSync(mediaTypeStore, userStore) {
  // Sync state
  const pendingChanges = ref([]);
  const isSyncing = ref(false);
  const syncStatus = ref({ status: 'idle', message: '' });
  
  // Memory leak prevention
  const isDestroyed = ref(false);
  const activeTimers = new Set();
  const activeSubscriptions = new Set();
  
  let syncTimer = null;
  const SYNC_DELAY = 5000; // 5 seconds between syncs

  // Service - adapter automatically switches between old and new structure
  const gamesService = computed(() => {
    return useFirestoreAdapter();
  });

 
  function createTimer(callback, delay) {
    if (isDestroyed.value) return null;
    
    const timerId = setTimeout(() => {
      activeTimers.delete(timerId);
      if (!isDestroyed.value) {
        callback();
      }
    }, delay);
    
    activeTimers.add(timerId);
    return timerId;
  }

  function clearTimer(timerId) {
    if (timerId) {
      clearTimeout(timerId);
      activeTimers.delete(timerId);
    }
  }

 
  function setSyncTimer() {
    // Clear existing timer first
    if (syncTimer) {
      clearTimer(syncTimer);
      syncTimer = null;
    }
    
    if (isDestroyed.value) return;
    
    syncTimer = createTimer(() => {
      syncWithFirebase();
      syncTimer = null;
    }, SYNC_DELAY);
  }

 
  function getDynamicMessage(messageKey, customValue = null) {
    const itemName = mediaTypeStore.config.itemName;
    const itemNamePlural = mediaTypeStore.config.itemNamePlural;
    const categoryName = mediaTypeStore.config.categoryName;

    const messages = {
      // During operations
      moving: `Flytter ${itemName}...`,
      saving: `Gemmer ændringer...`,
      updatingTitle: `Opdaterer titel...`,
      adding: `Tilføjer nyt ${itemName}...`,
      deleting: `Sletter ${itemName}...`,
      updatingFavorite: `Opdaterer favorit...`,
      updatingDate: `Opdaterer dato...`,
      addingDate: `Tilføjer dato...`,
      changingCategory: `Skifter ${categoryName.toLowerCase()}...`,
      updatingOrder: `Opdaterer rækkefølge...`,
      importing: `Importerer ${itemNamePlural}...`,

      // Note-specifikke beskeder
      savingNote: `Gemmer note...`,
      noteDeleting: `Sletter note...`,
      noteSaved: `Note gemt`,
      noteDeleted: `Note slettet`,
      noteError: `Kunne ikke gemme note. Prøv igen.`,

      // After success
      moved: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} flyttet`,
      saved: `Ændringer gemt`,
      titleUpdated: `Titel opdateret`,
      added: `Nyt ${itemName} tilføjet`,
      deleted: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} slettet`,
      favoritedTrue: `Markeret som favorit`,
      favoritedFalse: `Fjernet fra favoritter`,
      dateUpdated: `Dato opdateret`,
      dateAdded: `Dato tilføjet`,
      orderUpdated: `Rækkefølge opdateret`,

      // Dynamic messages
      categoryChanged: () => `${categoryName} ændret til ${customValue}`,
      imported: () => `${customValue} ${customValue === 1 ? itemName : itemNamePlural} importeret`,
      limitReached: () => `Du har nået grænsen på ${customValue} ${itemNamePlural} i den gratis plan.`,
      synced: () => `Ændringer gemt`,

      // Errors
      error: `Kunne ikke gemme ændringer. Prøv igen.`,
      syncError: `Fejl under synkronisering. Prøv igen senere.`
    };

    if (typeof messages[messageKey] === 'function') {
      return messages[messageKey]();
    }

    return messages[messageKey] || messageKey;
  }

 
  function updateSyncStatus(status, messageKey, customValue = null, autoHide = true) {
    if (isDestroyed.value) return;
    
    const message = getDynamicMessage(messageKey, customValue);
    syncStatus.value = { status, message };

    if (autoHide && status !== 'error') {
      createTimer(() => {
        if (syncStatus.value.status === status && !isDestroyed.value) {
          syncStatus.value = { status: 'idle', message: '' };
        }
      }, status === 'success' ? 3000 : 5000);
    }
  }

 
  function queueChange(type, id, data) {
    if (isDestroyed.value) {
      return;
    }

    // Add operations should not use queue
    if (type === 'add') {
      return;
    }

    // Find existing change for same document
    const existingIndex = pendingChanges.value.findIndex(change => change.id === id);

    if (existingIndex >= 0) {
      const existingChange = pendingChanges.value[existingIndex];

      if (type === 'delete') {
        // Delete overrides everything
        pendingChanges.value[existingIndex] = { type, id };
      } else if (existingChange.type === 'delete') {
        // Can't update something that's being deleted
        return;
      } else if (type === 'update') {
        // Update operation - merge data
        pendingChanges.value[existingIndex] = {
          type: existingChange.type,
          id,
          data: { ...existingChange.data, ...data }
        };
      }
    } else {
      // Add new change
      pendingChanges.value.push({ type, id, data });
    }

    setSyncTimer();
  }

 
  async function syncWithFirebase() {
    if (pendingChanges.value.length === 0 || isDestroyed.value) {
      return;
    }

    if (!userStore.currentUser) {
      return;
    }

    updateSyncStatus('syncing', 'saving', null, false);

    try {
      // Take copy of changes and clear list atomically
      const changesToProcess = [...pendingChanges.value];
      pendingChanges.value = [];
      syncTimer = null;

      // Check if module was destroyed during async operation
      if (isDestroyed.value) {
        return;
      }

      // Convert to batch operations format
      const batchOperations = changesToProcess.map(change => ({
        type: change.type,
        id: change.id,
        data: change.data
      }));

      // Execute batch operation
      const result = await gamesService.value.batchUpdate(batchOperations);

      // Check again after async operation
      if (isDestroyed.value) {
        return;
      }

      if (result.success) {
        updateSyncStatus('success', 'saved');
      } else {
        console.error('Failed to sync changes');
        // Only restore changes if module is still active
        if (!isDestroyed.value) {
          pendingChanges.value = [...changesToProcess, ...pendingChanges.value];
          updateSyncStatus('error', 'syncError');
        }
      }
    } catch (error) {
      console.error('Error syncing with Firebase:', error);
      if (!isDestroyed.value) {
        updateSyncStatus('error', 'syncError');
      }
    }
  }


  async function setupGamesListener(userId, callback) {
    if (!userId || isDestroyed.value) return null;

    try {
      // Check which structure to use
      await gamesService.value.checkNewStructure(userId);

      const unsubscribe = gamesService.value.subscribeToItems(
        userId,
        (result) => {
          if (isDestroyed.value) {
            return;
          }
          callback(result);
        },
        { orderBy: { field: 'order', direction: 'asc' } }
      );

      // Track subscription for cleanup
      if (unsubscribe) {
        activeSubscriptions.add(unsubscribe);
      }

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up games listener:', error);
      return null;
    }
  }

 
  async function addGameDirectly(gameData) {
    if (isDestroyed.value || !userStore.currentUser) return null;

    try {
      const result = await gamesService.value.addItem({
        ...gameData,
        userId: userStore.currentUser.uid
      });

      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error adding game directly:', error);
      return null;
    }
  }

 
  async function importGamesDirectly(gamesData) {
    if (isDestroyed.value || !userStore.currentUser) return false;

    try {
      const batchOperations = gamesData.map(game => ({
        type: 'set',
        id: game.id,
        data: {
          ...game,
          userId: userStore.currentUser.uid
        }
      }));

      const result = await gamesService.value.batchUpdate(batchOperations);
      return result.success;
    } catch (error) {
      console.error('Error importing games:', error);
      return false;
    }
  }

 
  function cleanup() {
    console.warn('Cleaning up game sync module...');
    
    isDestroyed.value = true;
    
    // Clear pending changes
    pendingChanges.value = [];

    // Clear all timers
    activeTimers.forEach(timerId => {
      clearTimeout(timerId);
    });
    activeTimers.clear();
    
    // Clear sync timer specifically
    if (syncTimer) {
      clearTimer(syncTimer);
      syncTimer = null;
    }

    // Clear all subscriptions
    activeSubscriptions.forEach(unsubscribeFn => {
      try {
        unsubscribeFn();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    activeSubscriptions.clear();
  }

  function reactivate() {
    isDestroyed.value = false;
  }

  return {
    // State
    pendingChanges,
    isSyncing,
    syncStatus,
    isDestroyed,

    // Methods
    updateSyncStatus,
    queueChange,
    syncWithFirebase,
    setupGamesListener,
    addGameDirectly,
    importGamesDirectly,
    cleanup,
    reactivate
  };
}