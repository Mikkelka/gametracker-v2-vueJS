// src/stores/game.store.js
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useUserStore } from './user';
import { useFirestoreCollection } from '../firebase/db.service';
import { deleteField } from 'firebase/firestore';

export const useGameStore = defineStore('game', () => {
  // State
  const games = ref([]);
  const isLoading = ref(true);
  const syncStatus = ref({ status: 'idle', message: '' });
  const isSyncing = ref(false);

  const pendingChanges = ref([]);
  let syncTimer = null;
  const SYNC_DELAY = 5000; // 5 sekunder mellem synkroniseringer
  
  // Service
  const gamesService = useFirestoreCollection('games');
  const userStore = useUserStore();

  // Statusliste
  const statusList = [
    { id: "upcoming", name: "Ser frem til" },
    { id: "willplay", name: "Vil spille" },
    { id: "playing", name: "Spiller nu" },
    { id: "completed", name: "Gennemført" },
    { id: "paused", name: "På pause" },
    { id: "dropped", name: "Droppet" }
  ];
  
  // Computed
  const gamesByStatus = computed(() => {
    const grouped = {};
    statusList.forEach(status => {
      grouped[status.id] = games.value
        .filter(game => game.status === status.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  });
  
  // Unsubscribe reference
  let unsubscribe = null;

  // Hjælpefunktion til at håndtere synkroniseringsstatus
  function updateSyncStatus(status, message, autoHide = true) {
    syncStatus.value = { status, message };
    
    if (autoHide && status !== 'error') {
      setTimeout(() => {
        // Opdater kun hvis status ikke er ændret i mellemtiden
        if (syncStatus.value.status === status) {
          syncStatus.value = { status: 'idle', message: '' };
        }
      }, status === 'success' ? 3000 : 5000);
    }
  }

  function queueChange(type, id, data) {
    console.log(`Queuing ${type} operation for id: ${id}`);
    
    // Special case for 'add' operations - these should skip the queue
    // and be handled directly to get a Firebase-generated ID
    if (type === 'add') {
      console.warn('Add operations should not use queueChange. Use gamesService.addItem directly.');
      return;
    }
    
    // Find eksisterende ændring til samme dokument
    const existingIndex = pendingChanges.value.findIndex(change => change.id === id);
    
    if (existingIndex >= 0) {
      const existingChange = pendingChanges.value[existingIndex];
      
      if (type === 'delete') {
        // Hvis det er en sletning overskriver vi alt
        pendingChanges.value[existingIndex] = { type, id };
      } else if (existingChange.type === 'delete') {
        // Kan ikke opdatere noget der skal slettes
        return;
      } else if (type === 'update') {
        // Update operation - sammenlæg data
        pendingChanges.value[existingIndex] = { 
          type: existingChange.type, 
          id, 
          data: { ...existingChange.data, ...data }
        };
      }
    } else {
      // Tilføj ny ændring
      pendingChanges.value.push({ type, id, data });
    }
    
    // Klar og sæt ny timer
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
    
    syncTimer = setTimeout(() => {
      console.log('Sync timer triggered');
      syncWithFirebase();
    }, SYNC_DELAY);
  }
  
  async function syncWithFirebase() {
    if (pendingChanges.value.length === 0) {
      console.log('No pending changes to sync');
      return;
    }
    
    if (!userStore.currentUser) {
      console.log('No user logged in');
      return;
    }
    
    console.log(`Syncing ${pendingChanges.value.length} changes`);
    updateSyncStatus('syncing', 'Synkroniserer ændringer...', false);
    
    try {
      // Tag en kopi af ændringer og tøm listen
      const changesToProcess = [...pendingChanges.value];
      pendingChanges.value = [];
      
      // Nulstil timer
      syncTimer = null;
      
      // Konverter til batch operations format
      const batchOperations = changesToProcess.map(change => ({
        type: change.type,
        id: change.id,
        data: change.data
      }));
      
      // Udfør batch operation
      const result = await gamesService.batchUpdate(batchOperations);
      
      if (result.success) {
        console.log(`Successfully synced ${result.count} changes`);
        updateSyncStatus('success', `Synkroniseret: ${result.count} ændringer`);
      } else {
        console.error('Failed to sync changes');
        pendingChanges.value = [...changesToProcess, ...pendingChanges.value];
        updateSyncStatus('error', 'Fejl under synkronisering');
      }
    } catch (error) {
      console.error('Error syncing with Firebase:', error);
      updateSyncStatus('error', 'Fejl under synkronisering');
    }
  }
  
  // Firebase integration
  async function loadGames() {
    if (!userStore.currentUser) return;
    
    isLoading.value = true;
    
    try {
      // Afbryd tidligere lytter hvis den findes
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      
      // Opsæt realtime lytter
      unsubscribe = gamesService.subscribeToItems(
        userStore.currentUser.uid,
        (result) => {
          if (result.success) {
            games.value = result.data.sort((a, b) => {
              const statusOrder = ["upcoming", "willplay", "playing", "completed", "paused", "dropped"];
              if (a.status !== b.status) {
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
              }
              return (a.order || 0) - (b.order || 0);
            });
          } else {
            console.error('Error loading games:', result.error);
          }
          isLoading.value = false;
        },
        { orderBy: { field: 'order', direction: 'asc' } }
      );
    } catch (error) {
      console.error('Error setting up games subscription:', error);
      isLoading.value = false;
    }
  }
  
  // Game operations
  async function saveGame(gameData) {
    if (!userStore.currentUser) return null;
    
    try {
      const game = {
        ...gameData,
        userId: userStore.currentUser.uid,
        updatedAt: Date.now()
      };
      
      // Opdater lokalt først
      const index = games.value.findIndex(g => g.id === game.id);
      if (index >= 0) {
        games.value[index] = {...games.value[index], ...game};
      } else {
        // For nye spil uden ID, brug midlertidigt ID der erstattes efter synkronisering
        if (!game.id) {
          game.id = 'temp_' + Date.now();
        }
        games.value.push(game);
      }
      
      // Queue ændringen til batch-synkronisering
      queueChange(game.id.startsWith('temp_') ? 'add' : 'update', game.id, game);
      
      updateSyncStatus('syncing', 'Ændringer planlagt...', false);
      return game;
    } catch (error) {
      console.error('Error saving game:', error);
      updateSyncStatus('error', 'Fejl ved behandling af spil');
      return null;
    }
  }

  async function updateGameTitle(gameId, newTitle) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
  
    updateSyncStatus('syncing', 'Opdaterer spiltitel...');
  
    try {
      // Opdater lokalt først
      game.title = newTitle.trim();
      game.updatedAt = Date.now();
      
      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, {
        title: newTitle.trim(),
        updatedAt: Date.now()
      });
      
      updateSyncStatus('syncing', 'Titel opdateret lokalt...', false);
      return game;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved opdatering af titel');
      return false;
    }
  }
  
  // Tilføj et nyt spil
async function addGame(title, platformData) {
  // Tjek miljøvariablen for maksimalt antal spil
  const maxGames = parseInt(import.meta.env.VITE_MAX_GAMES_PER_USER);
  
  // Kun tjek hvis miljøvariablen er defineret og gyldig
  if (!isNaN(maxGames) && games.value.length >= maxGames) {
    updateSyncStatus('error', `Du har nået grænsen på ${maxGames} spil i den gratis plan.`);
    return null;
  }

  updateSyncStatus('syncing', 'Tilføjer nyt spil...');

  const maxOrder = Math.max(
    ...games.value
      .filter(g => g.status === 'willplay')
      .map(g => g.order || 0),
    -1
  );

  const newGame = {
    title,
    platform: platformData.name,
    platformColor: platformData.color,
    status: 'willplay',
    favorite: false,
    createdAt: Date.now(),
    order: maxOrder + 1,
    userId: userStore.currentUser.uid
  };

  try {
    // Brug direkte Firebase addItem for nye spil
    const result = await gamesService.addItem(newGame);
    
    if (result.success) {
      // Tilføj det nye spil med Firebase-genereret ID til lokal state
      games.value.push(result.data);
      updateSyncStatus('success', 'Nyt spil tilføjet');
      return result.data;
    } else {
      updateSyncStatus('error', 'Fejl ved tilføjelse af spil');
      return null;
    }
  } catch (error) {
    console.error('Error adding game:', error);
    updateSyncStatus('error', 'Fejl ved tilføjelse af spil');
    return null;
  }
}

  // Slet et spil
  async function deleteGame(gameId) {
    if (!userStore.currentUser) return false;
    
    updateSyncStatus('syncing', 'Sletter spil...');
    
    try {
      // Fjern fra lokal state først
      const index = games.value.findIndex(g => g.id === gameId);
      if (index >= 0) {
        games.value.splice(index, 1);
      }
      
      // Queue sletning til batch-synkronisering
      queueChange('delete', gameId);
      
      updateSyncStatus('syncing', 'Sletning planlagt...', false);
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      updateSyncStatus('error', 'Fejl ved sletning af spil');
      return false;
    }
  }

  // Flyt et spil til en ny status med en specifik position
  async function moveGameToStatus(gameId, newStatus, specificPosition = null) {
    updateSyncStatus('syncing', 'Flytter spil...');
  
    const game = games.value.find(g => g.id === gameId);
    if (!game || game.status === newStatus) {
      updateSyncStatus('idle', '', false);
      return false;
    }
  
    let newOrder;
    if (specificPosition !== null) {
      // Brug den specificerede position
      newOrder = specificPosition;
    } else {
      // Fallback til at placere det sidst i listen
      const maxOrder = Math.max(
        ...games.value
          .filter(g => g.status === newStatus)
          .map(g => g.order || 0),
        -1
      );
      newOrder = maxOrder + 1;
    }
  
    try {
      // Opdater lokal state først
      game.status = newStatus;
      game.order = newOrder;
      game.updatedAt = Date.now();
      
      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, {
        status: newStatus,
        order: newOrder,
        updatedAt: Date.now()
      });
      
      // Hvis vi har en specifik position, skal vi også opdatere de andre spil i listen
      if (specificPosition !== null) {
        // Sortér og lav numerisk orden (1, 2, 3...)
        const gamesInSameList = games.value
          .filter(g => g.status === newStatus && g.id !== gameId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Reorder alle spil for at få hele tal orden
        [...gamesInSameList, game]
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .forEach((g, index) => {
            if (g.id !== gameId) {
              g.order = index;
              queueChange('update', g.id, {
                order: index,
                updatedAt: Date.now()
              });
            }
          });
      }
      
      updateSyncStatus('syncing', 'Spil flyttet lokalt...', false);
      return game;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved flytning af spil');
      return false;
    }
  }

  // Toggle favorit-status for et spil
  async function toggleFavorite(gameId) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
  
    updateSyncStatus('syncing', 'Opdaterer favorit-status...');
  
    try {
      // Opdater lokalt først
      game.favorite = !game.favorite;
      game.updatedAt = Date.now();
      
      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, {
        favorite: game.favorite,
        updatedAt: Date.now()
      });
      
      updateSyncStatus('syncing', game.favorite ? 'Markeret som favorit lokalt...' : 'Fjernet fra favoritter lokalt...', false);
      return game;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved opdatering af favorit-status');
      return false;
    }
  }

  // Sæt gennemførelsesdato for et spil
  async function setCompletionDate(gameId, date) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
  
    updateSyncStatus('syncing', 'Opdaterer gennemførelsesdato...');
  
    // Valider dato-format hvis den ikke er tom
    if (date && date.trim() !== "") {
      // Regex for DD-MM-ÅÅÅÅ format
      const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
      if (!dateRegex.test(date.trim())) {
        updateSyncStatus('error', 'Forkert datoformat. Brug DD-MM-ÅÅÅÅ');
        return false;
      }
    }
  
    try {
      // Opdater lokalt først
      const updateData = {
        updatedAt: Date.now()
      };
      
      if (date && date.trim() !== "") {
        game.completionDate = date.trim();
        updateData.completionDate = date.trim();
      } else {
        delete game.completionDate;
        updateData.completionDate = deleteField();
      }
      
      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, updateData);
      
      updateSyncStatus('syncing', 'Gennemførelsesdato opdateret lokalt...', false);
      return game;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved opdatering af dato');
      return false;
    }
  }

  // Sæt dagens dato som gennemførelsesdato
  async function setTodayAsCompletionDate(gameId) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
    
    updateSyncStatus('syncing', 'Tilføjer gennemførelsesdato...');
    
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, "0")}-${(
      today.getMonth() + 1
    ).toString().padStart(2, "0")}-${today.getFullYear()}`;
    
    try {
      // Opdater lokalt først
      game.completionDate = formattedDate;
      game.updatedAt = Date.now();
      
      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, {
        completionDate: formattedDate,
        updatedAt: Date.now()
      });
      
      updateSyncStatus('syncing', 'Dagens dato tilføjet lokalt...', false);
      return game;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved tilføjelse af dagens dato');
      return false;
    }
  }

  // Skift platform for et spil
  async function changePlatform(gameId, platformData) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
  
    updateSyncStatus('syncing', 'Skifter platform...');
  
    try {
      // Opdater lokalt først
      game.platform = platformData.name;
      game.platformColor = platformData.color;
      game.updatedAt = Date.now();
      
      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, {
        platform: platformData.name,
        platformColor: platformData.color,
        updatedAt: Date.now()
      });
      
      updateSyncStatus('syncing', `Platform ændret lokalt til ${platformData.name}...`, false);
      return game;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved skift af platform');
      return false;
    }
  }

  // Opdater rækkefølgen for spil
  async function updateGameOrder(changedGames) {
    if (!userStore.currentUser) return false;
  
    updateSyncStatus('syncing', 'Opdaterer rækkefølge...');
  
    try {
      // Opdater lokalt først og queue ændringer
      changedGames.forEach(change => {
        const index = games.value.findIndex(g => g.id === change.id);
        if (index >= 0) {
          games.value[index].order = Number(change.order) || 0;
          games.value[index].status = change.status;
          
          // Queue ændringen
          queueChange('update', change.id, {
            order: Number(change.order) || 0,
            status: change.status,
            updatedAt: Date.now()
          });
        }
      });
      
      // Sortér listen igen
      games.value.sort((a, b) => {
        const statusOrder = ["upcoming", "willplay", "playing", "completed", "paused", "dropped"];
        if (a.status !== b.status) {
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        }
        return (a.order || 0) - (b.order || 0);
      });
      
      updateSyncStatus('syncing', `Rækkefølge opdateret lokalt: ${changedGames.length} spil...`, false);
      return true;
    } catch (error) {
      console.error('Error updating game order:', error);
      updateSyncStatus('error', 'Fejl ved opdatering af rækkefølge');
      return false;
    }
  }

  // Ryd spildata når brugeren logger ud
  function clearGames() {
    games.value = [];
    pendingChanges.value = [];
    
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
  }

  // Eksporter spilliste til JSON
  function exportGames() {
    const jsonData = JSON.stringify(games.value, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "gametrack_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Importér spilliste fra JSON
  async function importGames(jsonData) {
    if (!userStore.currentUser) return false;
  
    updateSyncStatus('syncing', 'Importerer spil...');
  
    try {
      const importedGames = JSON.parse(jsonData);
  
      // Tilføj bruger-ID til importerede spil
      const updatedGames = importedGames.map(game => ({
        ...game,
        userId: userStore.currentUser.uid
      }));
  
      // For import bruger vi stadig direkte batch operation da det kan være mange spil på én gang
      const batchOperations = updatedGames.map(game => ({
        type: 'set',
        id: game.id,
        data: game
      }));
  
      const result = await gamesService.batchUpdate(batchOperations);
  
      if (result.success) {
        // Opdater lokal state
        await loadGames(); // Genindlæs spil efter import
        updateSyncStatus('success', `${updatedGames.length} spil importeret`);
        return true;
      } else {
        updateSyncStatus('error', 'Fejl ved import af spil');
        return false;
      }
    } catch (error) {
      console.error('Error importing games:', error);
      updateSyncStatus('error', 'Fejl ved import af spil');
      return false;
    }
  }

  // Sørg for at ikke-autentificerede brugere ikke kan tilgå eller ændre data
  watch(() => userStore.isLoggedIn, (isLoggedIn) => {
    if (!isLoggedIn) {
      clearGames();
    }
  });

  return {
    // State
  games,
  isLoading,
  syncStatus,
  statusList,
  
  // Getters
  gamesByStatus,
  
  // Methods
  loadGames,
  saveGame,
  addGame,
  deleteGame,
  moveGameToStatus,
  toggleFavorite,
  setCompletionDate,
  setTodayAsCompletionDate,
  changePlatform,
  updateGameOrder,
  clearGames,
  exportGames,
  importGames,
  updateSyncStatus,
  syncWithFirebase,
  updateGameTitle
  };
});