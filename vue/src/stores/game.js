// vue/src/stores/game.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useUserStore } from './user';
import { db } from '@/services/firebase';
import {
  collection, query, where, getDocs, doc,
  setDoc, deleteDoc, writeBatch, onSnapshot
} from 'firebase/firestore';

export const useGameStore = defineStore('game', () => {
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

  // Sortér og gruppér spil efter status
  const gamesByStatus = computed(() => {
    const grouped = {};

    statusList.forEach(status => {
      grouped[status.id] = games.value
        .filter(game => game.status === status.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return grouped;
  });

  // Indlæs alle spil for den aktuelle bruger
  async function loadGames() {
    const userStore = useUserStore();
    if (!userStore.currentUser) return;

    isLoading.value = true;

    try {
      const gamesCollection = collection(db, 'games');
      const q = query(gamesCollection, where('userId', '==', userStore.currentUser.uid));

      // Hvis der allerede er en aktiv lytter, skal vi rydde den
      if (unsubscribe.value) {
        unsubscribe.value();
      }

      // Opsæt realtime lytter for spilændringer
      unsubscribe.value = onSnapshot(q, (snapshot) => {
        const updatedGames = [];

        snapshot.docs.forEach(doc => {
          updatedGames.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Sortér spil efter status og derefter efter rækkefølge
        updatedGames.sort((a, b) => {
          if (a.status !== b.status) {
            return statusList.findIndex(s => s.id === a.status) -
              statusList.findIndex(s => s.id === b.status);
          }
          return (a.order || 0) - (b.order || 0);
        });

        games.value = updatedGames;
        isLoading.value = false;
      });

    } catch (error) {
      console.error('Error loading games:', error);
      isLoading.value = false;
    }
  }

  // Modificer saveGame til ikke at gemme direkte til Firebase
  async function saveGame(game) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return null;

    updateSyncStatus('syncing', 'Gemmer ændringer...');

    try {
      // Tilføj bruger-ID og sikre at spillets ID er sat
      const gameData = {
        ...game,
        userId: userStore.currentUser.uid
      };

      if (!gameData.id) {
        gameData.id = doc(collection(db, 'games')).id;
      }

      // Konverter order til et nummer
      gameData.order = Number(gameData.order) || 0;

      // Tilføj ændring til unsyncedChanges array
      unsyncedChanges.value.push({
        type: 'set',
        id: gameData.id,
        data: gameData
      });

      // Opdater lokalt i stedet for at gemme direkte
      const existingIndex = games.value.findIndex(g => g.id === gameData.id);
      if (existingIndex >= 0) {
        games.value[existingIndex] = gameData;
      } else {
        games.value.push(gameData);
      }

      return gameData;
    } catch (error) {
      console.error('Error saving game:', error);
      updateSyncStatus('error', 'Fejl ved gemning');
      return null;
    }
  }

  // Slet et spil
  async function deleteGame(gameId) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;

    updateSyncStatus('syncing', 'Sletter spil...');

    try {
      // Tilføj ændring til unsyncedChanges array
      unsyncedChanges.value.push({
        type: 'delete',
        id: gameId
      });

      // Slet spillet direkte i Firestore
      await deleteDoc(doc(db, 'games', gameId));

      updateSyncStatus('success', 'Spil slettet');
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      updateSyncStatus('error', 'Fejl ved sletning af spil');
      return false;
    }
  }

  // Tilføj et nyt spil
  async function addGame(title, platformData) {
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
    };

    try {
      const result = await saveGame(newGame);
      updateSyncStatus('success', 'Nyt spil tilføjet');
      return result;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved tilføjelse af spil');
      return null;
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

  const updatedGame = {
    ...game,
    status: newStatus,
    order: newOrder
  };

  try {
    const result = await saveGame(updatedGame);
    
    // Hvis vi har en specifik position, skal vi også opdatere de andre spil i listen
    if (specificPosition !== null) {
      // Sortér og lav numerisk orden (1, 2, 3...)
      const gamesInSameList = games.value
        .filter(g => g.status === newStatus && g.id !== gameId) // Ekskluder det spil vi lige har flyttet
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Indsæt det nye spil på den rette position
      let updatedOrders = [];
      
      // Reorder alle spil for at få hele tal orden
      [...gamesInSameList, updatedGame]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((g, index) => {
          if (g.id !== gameId) { // Vi har allerede opdateret det flyttede spil
            updatedOrders.push({ id: g.id, order: index, status: newStatus });
          }
        });
      
      if (updatedOrders.length > 0) {
        await updateGameOrder(updatedOrders);
      }
    }
    
    updateSyncStatus('success', 'Spil flyttet');
    return result;
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

    const updatedGame = {
      ...game,
      favorite: !game.favorite
    };

    try {
      const result = await saveGame(updatedGame);
      updateSyncStatus('success', game.favorite ? 'Fjernet fra favoritter' : 'Markeret som favorit');
      return result;
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

    const updatedGame = { ...game };

    if (date && date.trim() !== "") {
      updatedGame.completionDate = date.trim();
    } else {
      delete updatedGame.completionDate;
    }

    try {
      const result = await saveGame(updatedGame);
      updateSyncStatus('success', 'Gennemførelsesdato opdateret');
      return result;
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
  
  const updatedGame = {
    ...game,
    completionDate: formattedDate
  };
  
  try {
    const result = await saveGame(updatedGame);
    updateSyncStatus('success', 'Dagens dato tilføjet');
    return result;
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

    const updatedGame = {
      ...game,
      platform: platformData.name,
      platformColor: platformData.color
    };

    try {
      const result = await saveGame(updatedGame);
      updateSyncStatus('success', `Platform ændret til ${platformData.name}`);
      return result;
    } catch (error) {
      updateSyncStatus('error', 'Fejl ved skift af platform');
      return false;
    }
  }

  // Opdater rækkefølgen for spil
  async function updateGameOrder(changedGames) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;

    updateSyncStatus('syncing', 'Opdaterer rækkefølge...');

    try {
      // I stedet for direkte batch-operation, lav ændringer lokalt og tilføj til unsyncedChanges
      changedGames.forEach(game => {
        // Opdater det lokale spil
        const index = games.value.findIndex(g => g.id === game.id);
        if (index >= 0) {
          games.value[index].order = Number(game.order) || 0;
          games.value[index].status = game.status;
        }

        // Tilføj ændring til unsyncedChanges
        unsyncedChanges.value.push({
          type: 'update',
          id: game.id,
          data: {
            order: Number(game.order) || 0,
            status: game.status
          }
        });
      });

      // Sortér listen igen
      games.value.sort((a, b) => {
        if (a.status !== b.status) {
          return statusList.findIndex(s => s.id === a.status) -
            statusList.findIndex(s => s.id === b.status);
        }
        return (a.order || 0) - (b.order || 0);
      });

      updateSyncStatus('success', `Rækkefølge opdateret: ${changedGames.length} spil`);
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
    if (unsubscribe.value) {
      unsubscribe.value();
      unsubscribe.value = null;
    }
  }

  // Hjælpefunktion til at håndtere synkroniseringsstatus
function updateSyncStatus(status, message, autoReset = true) {
  syncStatus.value = { status, message };
  
  // Håndter synkroniseringsstart eller nye ændringer
  if (status === 'syncing') {
    pendingSync.value = true;
    
    // Ryd den eksisterende timer, hvis der er en
    if (syncDebounceTimer.value) {
      clearTimeout(syncDebounceTimer.value);
      syncDebounceTimer.value = null;
    }
    
    // Start en ny timer
    syncDebounceTimer.value = setTimeout(async () => {
      try {
        // Kun synkroniser hvis der faktisk er ændringer
        if (unsyncedChanges.value.length > 0) {
          await syncWithFirebase();
        } else {
          // Nulstil synkroniseringsstatus uden at synkronisere
          pendingSync.value = false;
          syncStatus.value = { status: 'idle', message: '' };
        }
      } finally {
        syncDebounceTimer.value = null;
      }
    }, 5000);
  }
  
  // Håndter success og error beskeder
  if (autoReset && (status === 'success' || status === 'error')) {
    setTimeout(() => {
      // Nulstil kun hvis der ikke er en igangværende synkronisering
      if (!pendingSync.value) {
        syncStatus.value = { status: 'idle', message: '' };
      }
    }, status === 'error' ? 5000 : 3000);
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
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;

    updateSyncStatus('syncing', 'Importerer spil...');

    try {
      const importedGames = JSON.parse(jsonData);

      // Tilføj bruger-ID til importerede spil
      const updatedGames = importedGames.map(game => ({
        ...game,
        userId: userStore.currentUser.uid
      }));

      // Gem importerede spil i Firestore
      const batch = writeBatch(db);

      updatedGames.forEach(game => {
        const gameRef = doc(db, 'games', game.id || doc(collection(db, 'games')).id);
        batch.set(gameRef, game);
      });

      await batch.commit();
      updateSyncStatus('success', `${updatedGames.length} spil importeret`);
      return true;
    } catch (error) {
      console.error('Error importing games:', error);
      updateSyncStatus('error', 'Fejl ved import af spil');
      return false;
    }
  }

  // Sikre at pendingSync nulstilles korrekt
async function syncWithFirebase() {
  const userStore = useUserStore();
  if (!userStore.currentUser) return false;
  
  // Hvis der ikke er nogen ændringer at synkronisere
  if (unsyncedChanges.value.length === 0) {
    pendingSync.value = false; // Vigtig linje at have her!
    updateSyncStatus('success', 'Ingen ændringer at synkronisere', true);
    return true;
  }
  
  updateSyncStatus('syncing', 'Synkroniserer...', false);
  
  try {
    const batch = writeBatch(db);
    let setOps = 0, updateOps = 0, deleteOps = 0;
    
    // Sorter så deletes kommer sidst
    const sortedChanges = [...unsyncedChanges.value].sort((a, b) => {
      if (a.type === 'delete' && b.type !== 'delete') return 1;
      if (a.type !== 'delete' && b.type === 'delete') return -1;
      return 0;
    });
    
    for (const change of sortedChanges) {
      if (change.type === 'set') {
        batch.set(doc(db, 'games', change.id), change.data);
        setOps++;
      } else if (change.type === 'update') {
        batch.update(doc(db, 'games', change.id), change.data);
        updateOps++;
      } else if (change.type === 'delete') {
        batch.delete(doc(db, 'games', change.id));
        deleteOps++;
      }
    }
    
    await batch.commit();
    
    // Ryd unsyncedChanges efter succesfuld commit
    unsyncedChanges.value = [];
    
    // Nulstil pendingSync efter synkronisering
    pendingSync.value = false;
    
    updateSyncStatus('success', `Synkroniseret: ${setOps + updateOps + deleteOps} operationer`, true);
    lastSync.value = new Date();
    
    return true;
  } catch (error) {
    console.error('Error synchronizing with Firebase:', error);
    updateSyncStatus('error', 'Fejl under synkronisering', true);
    pendingSync.value = false; // Nulstil også ved fejl
    return false;
  }
}

  return {
    syncWithFirebase,
    updateSyncStatus,
    games,
    gamesByStatus,
    statusList,
    isLoading,
    syncStatus,
    loadGames,
    saveGame,
    deleteGame,
    addGame,
    moveGameToStatus,
    toggleFavorite,
    setCompletionDate,
    setTodayAsCompletionDate,
    changePlatform,
    updateGameOrder,
    clearGames,
    exportGames,
    importGames
  };
}); 