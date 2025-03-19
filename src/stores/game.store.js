import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useGameActions } from './game.actions';
import { useGameSync } from './game.sync';
import { games, isLoading, syncStatus, statusList } from './game.state';

export const useGameStore = defineStore('game', () => {
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
  const actions = useGameActions();
  const syncService = useGameSync();

  return {
    // State
    games,
    isLoading,
    syncStatus,
    statusList,
    
    // Getters
    gamesByStatus,
    
    // Actions
    ...actions,
    
    // Sync
    ...syncService
  };
});