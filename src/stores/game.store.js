// src/stores/game.store.js
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useUserStore } from './user';
import { useMediaTypeStore } from './mediaType';
import { useFirestoreCollection } from '../firebase/db.service';

export const useGameStore = defineStore('game', () => {
  // State
  const games = ref([]);
  const isLoading = ref(true);
  const syncStatus = ref({ status: 'idle', message: '' });
  const isSyncing = ref(false);
  const mediaTypeStore = useMediaTypeStore();

  const pendingChanges = ref([]);
  let syncTimer = null;
  const SYNC_DELAY = 5000; // 5 sekunder mellem synkroniseringer

  // Service
  const gamesService = computed(() => {
    const collectionName = mediaTypeStore.currentType === 'game'
      ? 'games'
      : mediaTypeStore.config.collections.items;
    return useFirestoreCollection(collectionName);
  });

  const userStore = useUserStore();

  // Statusliste
  const statusList = computed(() => mediaTypeStore.config.statusList);

  // Filtrerer spil baseret på den aktuelle medietype
  const filteredGames = computed(() => {
    // Returnér alle spil uanset mediaType for nu
    return games.value;
  });

  // Computed
  const gamesByStatus = computed(() => {
    const grouped = {};
    statusList.value.forEach(status => {
      grouped[status.id] = filteredGames.value
        .filter(game => game.status === status.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  });

  // Unsubscribe reference
  let unsubscribe = null;

  function getDynamicMessage(messageKey, customValue = null) {
    // Få det korrekte item navn baseret på medietype
    const itemName = mediaTypeStore.config.itemName;
    const itemNamePlural = mediaTypeStore.config.itemNamePlural;
    const categoryName = mediaTypeStore.config.categoryName;

    // Objektet med alle beskedtyper
    const messages = {
      // Under handling
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

      // Efter succes
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

      // Dynamiske beskeder med specialkode
      categoryChanged: () => `${categoryName} ændret til ${customValue}`,
      imported: () => `${customValue} ${customValue === 1 ? itemName : itemNamePlural} importeret`,
      limitReached: () => `Du har nået grænsen på ${customValue} ${itemNamePlural} i den gratis plan.`,
      synced: () => `Ændringer gemt`, // Fjernet antallet - nu vises bare "Ændringer gemt"

      // Fejl
      error: `Kunne ikke gemme ændringer. Prøv igen.`,
      syncError: `Fejl under synkronisering. Prøv igen senere.`
    };

    // Returner enten en dynamisk besked eller en statisk besked
    if (typeof messages[messageKey] === 'function') {
      return messages[messageKey]();
    }

    return messages[messageKey] || messageKey;
  }

  // Hjælpefunktion til at håndtere synkroniseringsstatus
  function updateSyncStatus(status, messageKey, customValue = null, autoHide = true) {
    const message = getDynamicMessage(messageKey, customValue);
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
    updateSyncStatus('syncing', 'saving', null, false);

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
      const result = await gamesService.value.batchUpdate(batchOperations);

      if (result.success) {
        console.log(`Successfully synced ${result.count} changes`);
        updateSyncStatus('success', 'saved');
      } else {
        console.error('Failed to sync changes');
        pendingChanges.value = [...changesToProcess, ...pendingChanges.value];
        updateSyncStatus('error', 'syncError');
      }
    } catch (error) {
      console.error('Error syncing with Firebase:', error);
      updateSyncStatus('error', 'syncError');
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

      // Opsæt realtime lytter - BEMÆRK .value her
      unsubscribe = gamesService.value.subscribeToItems(
        userStore.currentUser.uid,
        (result) => {
          if (result.success) {
            // Få statuslisten fra den aktuelle mediaType
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
        games.value[index] = { ...games.value[index], ...game };
      } else {
        // For nye spil uden ID, brug midlertidigt ID der erstattes efter synkronisering
        if (!game.id) {
          game.id = 'temp_' + Date.now();
        }
        games.value.push(game);
      }

      // Queue ændringen til batch-synkronisering
      queueChange(game.id.startsWith('temp_') ? 'add' : 'update', game.id, game);

      updateSyncStatus('syncing', 'saving', null, false);
      return game;
    } catch (error) {
      console.error('Error saving game:', error);
      updateSyncStatus('error', 'error');
      return null;
    }
  }

  async function updateGameTitle(gameId, newTitle) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    updateSyncStatus('syncing', 'updatingTitle');

    try {
      // Opdater lokalt først
      game.title = newTitle.trim();
      game.updatedAt = Date.now();

      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, {
        title: newTitle.trim(),
        updatedAt: Date.now()
      });

      updateSyncStatus('success', 'titleUpdated');
      return game;
    } catch (error) {
      updateSyncStatus('error', 'error');
      return false;
    }
  }

  // Tilføj et nyt spil
  async function addGame(title, platformData) {
    // Tjek miljøvariablen for maksimalt antal spil
    const maxGames = parseInt(import.meta.env.VITE_MAX_GAMES_PER_USER);

    // Kun tjek hvis miljøvariablen er defineret og gyldig
    if (!isNaN(maxGames) && games.value.length >= maxGames) {
      updateSyncStatus('error', 'limitReached', maxGames);
      return null;
    }

    updateSyncStatus('syncing', 'adding');

    // Find den korrekte "vil" status baseret på mediaType
    const mediaType = mediaTypeStore.currentType;
    let statusId = 'willplay'; // Default (game)

    // Find den korrekte "Vil" status fra statusListen for denne mediaType
    const willStatus = mediaTypeStore.config.statusList.find(s =>
      s.name.toLowerCase().startsWith('vil ')
    );

    if (willStatus) {
      statusId = willStatus.id;
    }

    const maxOrder = Math.max(
      ...games.value
        .filter(g => g.status === statusId)
        .map(g => g.order || 0),
      -1
    );

    const newGame = {
      title,
      platform: platformData.name,
      platformColor: platformData.color,
      status: statusId, // Brug den korrekte mediaType status
      favorite: false,
      createdAt: Date.now(),
      order: maxOrder + 1,
      userId: userStore.currentUser.uid
    };

    try {
      // Brug direkte Firebase addItem for nye spil
      const result = await gamesService.value.addItem(newGame);

      if (result.success) {
        // Tilføj det nye spil med Firebase-genereret ID til lokal state
        games.value.push(result.data);
        updateSyncStatus('success', 'added');
        return result.data;
      } else {
        updateSyncStatus('error', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error adding game:', error);
      updateSyncStatus('error', 'error');
      return null;
    }
  }

  // Slet et spil
  async function deleteGame(gameId) {
    if (!userStore.currentUser) return false;

    updateSyncStatus('syncing', 'deleting');

    try {
      // Fjern fra lokal state først
      const index = games.value.findIndex(g => g.id === gameId);
      if (index >= 0) {
        games.value.splice(index, 1);
      }

      // Queue sletning til batch-synkronisering
      queueChange('delete', gameId);

      updateSyncStatus('success', 'deleted');
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      updateSyncStatus('error', 'error');
      return false;
    }
  }

  // Flyt et spil til en ny status med en specifik position
  async function moveGameToStatus(gameId, newStatus, specificPosition = null) {
    updateSyncStatus('syncing', 'moving');

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

      updateSyncStatus('success', 'moved');
      return game;
    } catch (error) {
      updateSyncStatus('error', 'error');
      return false;
    }
  }

  // Toggle favorit-status for et spil
  async function toggleFavorite(gameId) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    updateSyncStatus('syncing', 'updatingFavorite');

    try {
      // Opdater lokalt først
      game.favorite = !game.favorite;
      game.updatedAt = Date.now();

      // Queue ændringen til batch-synkronisering
      queueChange('update', gameId, {
        favorite: game.favorite,
        updatedAt: Date.now()
      });

      updateSyncStatus('success', game.favorite ? 'favoritedTrue' : 'favoritedFalse');
      return game;
    } catch (error) {
      updateSyncStatus('error', 'error');
      return false;
    }
  }

  // Sæt gennemførelsesdato for et spil
  async function setCompletionDate(gameId, date) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    updateSyncStatus('syncing', 'updatingDate');

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

      updateSyncStatus('success', 'dateUpdated');
      return game;
    } catch (error) {
      updateSyncStatus('error', 'error');
      return false;
    }
  }

  // Sæt dagens dato som gennemførelsesdato
  async function setTodayAsCompletionDate(gameId) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    updateSyncStatus('syncing', 'addingDate');

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

      updateSyncStatus('success', 'dateAdded');
      return game;
    } catch (error) {
      updateSyncStatus('error', 'error');
      return false;
    }
  }

  // Skift platform for et spil
  async function changePlatform(gameId, platformData) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    updateSyncStatus('syncing', 'changingCategory');

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

      updateSyncStatus('success', 'categoryChanged', platformData.name);
      return game;
    } catch (error) {
      updateSyncStatus('error', 'error');
      return false;
    }
  }

  // Opdater rækkefølgen for spil
  async function updateGameOrder(changedGames) {
    if (!userStore.currentUser) return false;

    updateSyncStatus('syncing', 'updatingOrder');

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
        const statusOrder = statusList.value.map(status => status.id);
        if (a.status !== b.status) {
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        }
        return (a.order || 0) - (b.order || 0);
      });

      updateSyncStatus('success', 'orderUpdated');
      return true;
    } catch (error) {
      console.error('Error updating game order:', error);
      updateSyncStatus('error', 'error');
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

    updateSyncStatus('syncing', 'importing');

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

      const result = await gamesService.value.batchUpdate(batchOperations);

      if (result.success) {
        // Opdater lokal state
        await loadGames(); // Genindlæs spil efter import
        updateSyncStatus('success', 'imported', updatedGames.length);
        return true;
      } else {
        updateSyncStatus('error', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error importing games:', error);
      updateSyncStatus('error', 'error');
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
    filteredGames,

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