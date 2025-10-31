// src/stores/game.store.js - Refactored with modules
import { defineStore } from 'pinia';
import { ref, computed, watch, readonly } from 'vue';
import { useUserStore } from './user';
import { useMediaTypeStore } from './mediaType';
import { useGameSync } from './modules/gameSync';
import { useGameOperations } from './modules/gameOperations';
import { useGameValidation } from './modules/gameValidation';
import { useGameNotes } from './modules/gameNotes';

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
  
  const gameNotes = useGameNotes(games, gameSync, userStore);

  // Real-time listener reference
  let unsubscribe = null;

  // Computed properties
  const statusList = computed(() => mediaTypeStore.config.statusList);
  
  const filteredGames = computed(() => {
    return games.value;
  });

  const gamesByStatus = computed(() => {
    console.warn('[GAME-STORE] gamesByStatus computed called');
    const grouped = {};
    statusList.value.forEach(status => {
      grouped[status.id] = filteredGames.value
        .filter(game => game.status === status.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      console.warn(`[GAME-STORE] Status ${status.id}: ${grouped[status.id].length} items`);
    });
    return grouped;
  });

  
  async function loadGames() {
    if (!userStore.currentUser || gameSync.isDestroyed.value) return;

    isLoading.value = true;

    try {
      // Cleanup previous subscription
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      // Setup real-time listener (now async due to structure detection)
      unsubscribe = await gameSync.setupGamesListener(
        userStore.currentUser.uid,
        (result) => {
          console.warn('[GAME-STORE] Callback received, result.success:', result.success);
          console.warn('[GAME-STORE] Result data length:', result.data?.length);

          if (gameSync.isDestroyed.value) {
            console.warn('Store destroyed, ignoring subscription callback');
            return;
          }

          if (result.success) {
            // Sort games by status and order
            const statusOrder = statusList.value.map(status => status.id);

            console.warn('[GAME-STORE] Sorting', result.data.length, 'games');
            games.value = result.data.sort((a, b) => {
              if (a.status !== b.status) {
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
              }
              return (a.order || 0) - (b.order || 0);
            });
            console.warn('[GAME-STORE] Games updated, total:', games.value.length);

            // Initialize hasNote flags for all games
            gameNotes.initializeHasNoteFlags();
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

  
  function clearGames() {
    console.warn('Clearing games store...');
    
    // Clear data
    games.value = [];

    // Cleanup notes module
    gameNotes.cleanup();
    
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

  
  function reactivateStore() {
    gameSync.reactivate();
    gameNotes.reactivate();
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
    const newClearGames = function() {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      originalClearGames.call(this);
    };
    // eslint-disable-next-line no-func-assign
    clearGames = newClearGames;
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

    // Notes methods (from notes module)
    hasNote: gameNotes.hasNote,
    loadNote: gameNotes.loadNote,
    saveNote: gameNotes.saveNote,
    deleteNote: gameNotes.deleteNote,
    copyNoteToClipboard: gameNotes.copyToClipboard,

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
    saveGame: async (_gameData) => {
      console.warn('saveGame is deprecated. Use specific CRUD operations instead.');
      // This can be implemented as a wrapper if needed
      return null;
    }
  };
});