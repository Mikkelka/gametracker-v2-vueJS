// stores/game.store.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameActions } from './game.actions';
import { useGameSync } from './game.sync';

export const useGameStore = defineStore('game', () => {
  // State
  const games = ref([]);
  const isLoading = ref(true);
  const syncStatus = ref({ status: 'idle', message: '' });
  const lastSync = ref(null);
  const unsyncedChanges = ref([]);
  const unsubscribe = ref(null);
  const syncDebounceTimer = ref(null);
  const pendingSync = ref(false);
  
  // Liste af gametrack statusser
  const statusList = [
    { id: "upcoming", name: "Ser frem til" },
    { id: "willplay", name: "Vil spille" },
    { id: "playing", name: "Spiller nu" },
    { id: "completed", name: "Gennemført" },
    { id: "paused", name: "På pause" },
    { id: "dropped", name: "Droppet" }
  ];

  // Computed properties
  const gamesByStatus = computed(() => {
    const grouped = {};
    statusList.forEach(status => {
      grouped[status.id] = games.value
        .filter(game => game.status === status.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  });

  // Importer actions og sync-funktionalitet
  const actions = useGameActions(
    games, 
    syncStatus, 
    unsyncedChanges, 
    syncDebounceTimer, 
    pendingSync
  );
  
  const syncService = useGameSync(
    games, 
    isLoading, 
    syncStatus, 
    lastSync, 
    unsyncedChanges, 
    unsubscribe, 
    syncDebounceTimer, 
    pendingSync
  );

  return {
    // State
    games,
    isLoading,
    syncStatus,
    statusList,
    
    // Getters
    gamesByStatus,
    
    // Exported from actions.js
    addGame: actions.addGame,
    saveGame: actions.saveGame,
    deleteGame: actions.deleteGame,
    moveGameToStatus: actions.moveGameToStatus,
    toggleFavorite: actions.toggleFavorite,
    setCompletionDate: actions.setCompletionDate,
    setTodayAsCompletionDate: actions.setTodayAsCompletionDate,
    changePlatform: actions.changePlatform,
    updateGameOrder: actions.updateGameOrder,
    clearGames: actions.clearGames,
    exportGames: actions.exportGames,
    importGames: actions.importGames,
    updateSyncStatus: actions.updateSyncStatus,
    
    // Exported from sync.js
    loadGames: syncService.loadGames,
    syncWithFirebase: syncService.syncWithFirebase
  };
});