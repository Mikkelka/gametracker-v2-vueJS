// src/stores/game.store.js - Refactored with modules
import { defineStore } from 'pinia';
import { ref, computed, watch, readonly } from 'vue';
import { useUserStore } from './user';
import { useMediaTypeStore } from './mediaType';
import { useGameSync } from './modules/gameSync';
import { useGameOperations } from './modules/gameOperations';
import { useGameValidation } from './modules/gameValidation';

export const useGameStore = defineStore('game', () => {
  // Core state
  const games = ref([]);
  const isLoading = ref(true);
  
  // Store dependencies
  const mediaTypeStore = useMediaTypeStore();
  const userStore = useUserStore();
  
  // Initialize modules
  const gameValidation = useGameValidation();
  const gameSync = useGameSync(mediaTypeStore, userStore);
  const gameOperations = useGameOperations(games, gameSync, gameValidation, mediaTypeStore, userStore);
  
  // Real-time listener reference
  let unsubscribe = null;

  // Computed properties
  const statusList = computed(() => mediaTypeStore.config.statusList);
  
  const filteredGames = computed(() => {
    // Return all games for now, regardless of media type
    return games.value;
  });

  const gamesByStatus = computed(() => {
    const grouped = {};
    statusList.value.forEach(status => {
      grouped[status.id] = filteredGames.value
        .filter(game => game.status === status.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  });

  /**
   * Load games with real-time listener
   */
  async function loadGames() {
    if (!userStore.currentUser || gameSync.isDestroyed.value) return;

    isLoading.value = true;

    try {
      // Cleanup previous subscription
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      // Setup real-time listener
      unsubscribe = gameSync.setupGamesListener(
        userStore.currentUser.uid,
        (result) => {
          if (gameSync.isDestroyed.value) {
            console.log('Store destroyed, ignoring subscription callback');
            return;
          }

          if (result.success) {
            // Sort games by status and order
            const statusOrder = statusList.value.map(status => status.id);

            games.value = result.data.sort((a, b) => {
              if (a.status !== b.status) {
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
              }
              return (a.order || 0) - (b.order || 0);
            });
          } else {
            console.error('Error loading games:', result.error);
          }
          isLoading.value = false;
        }
      );

    } catch (error) {
      console.error('Error setting up games subscription:', error);
      isLoading.value = false;
    }
  }

  /**
   * Comprehensive cleanup function
   */
  function clearGames() {
    console.log('Clearing games store...');
    
    // Clear data
    games.value = [];
    
    // Cleanup subscription
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error clearing subscription:', error);
      }
      unsubscribe = null;
    }

    // Cleanup sync module
    gameSync.cleanup();
  }

  /**
   * Reactivate store after cleanup
   */
  function reactivateStore() {
    gameSync.reactivate();
  }

  // Watch for user logout to cleanup
  watch(() => userStore.isLoggedIn, (isLoggedIn) => {
    if (!isLoggedIn) {
      clearGames();
    } else {
      reactivateStore();
    }
  });

  // Emergency cleanup on page unload
  if (typeof window !== 'undefined') {
    const handleBeforeUnload = () => {
      clearGames();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Override clearGames to also cleanup event listener
    const originalClearGames = clearGames;
    clearGames = function() {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      originalClearGames.call(this);
    };
  }

  return {
    // State
    games,
    isLoading,
    statusList,
    filteredGames,
    isStoreDestroyed: readonly(gameSync.isDestroyed),

    // Sync state (exposed from sync module)
    syncStatus: gameSync.syncStatus,

    // Computed
    gamesByStatus,

    // Core methods
    loadGames,
    clearGames,
    reactivateStore,

    // CRUD operations (from operations module)
    addGame: gameOperations.addGame,
    updateGameTitle: gameOperations.updateGameTitle,
    deleteGame: gameOperations.deleteGame,
    moveGameToStatus: gameOperations.moveGameToStatus,
    toggleFavorite: gameOperations.toggleFavorite,
    setCompletionDate: gameOperations.setCompletionDate,
    setTodayAsCompletionDate: gameOperations.setTodayAsCompletionDate,
    changePlatform: gameOperations.changePlatform,
    updateGameOrder: gameOperations.updateGameOrder,
    exportGames: gameOperations.exportGames,
    importGames: gameOperations.importGames,

    // Sync methods (from sync module)
    syncWithFirebase: gameSync.syncWithFirebase,
    updateSyncStatus: gameSync.updateSyncStatus,

    // Legacy method for backward compatibility
    saveGame: async (gameData) => {
      console.warn('saveGame is deprecated. Use specific CRUD operations instead.');
      // This can be implemented as a wrapper if needed
      return null;
    }
  };
});