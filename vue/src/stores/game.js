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
  
  // Gem et spil (nyt eller opdateret)
  async function saveGame(game) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return null;
    
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
      
      // Gem ændringen direkte i Firestore
      await setDoc(doc(db, 'games', gameData.id), gameData);
      
      return gameData;
    } catch (error) {
      console.error('Error saving game:', error);
      return null;
    }
  }
  
  // Slet et spil
  async function deleteGame(gameId) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;
    
    try {
      // Tilføj ændring til unsyncedChanges array
      unsyncedChanges.value.push({
        type: 'delete',
        id: gameId
      });
      
      // Slet spillet direkte i Firestore
      await deleteDoc(doc(db, 'games', gameId));
      
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      return false;
    }
  }
  
  // Tilføj et nyt spil
  async function addGame(title, platformData) {
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
    
    return saveGame(newGame);
  }
  
  // Flyt et spil til en ny status
  async function moveGameToStatus(gameId, newStatus) {
    const game = games.value.find(g => g.id === gameId);
    if (!game || game.status === newStatus) return false;
    
    const maxOrder = Math.max(
      ...games.value
        .filter(g => g.status === newStatus)
        .map(g => g.order || 0),
      -1
    );
    
    const updatedGame = {
      ...game,
      status: newStatus,
      order: maxOrder + 1
    };
    
    return saveGame(updatedGame);
  }
  
  // Toggle favorit-status for et spil
  async function toggleFavorite(gameId) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
    
    const updatedGame = {
      ...game,
      favorite: !game.favorite
    };
    
    return saveGame(updatedGame);
  }
  
  // Sæt gennemførelsesdato for et spil
  async function setCompletionDate(gameId, date) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
    
    const updatedGame = { ...game };
    
    if (date && date.trim() !== "") {
      updatedGame.completionDate = date.trim();
    } else {
      delete updatedGame.completionDate;
    }
    
    return saveGame(updatedGame);
  }
  
  // Sæt dagens dato som gennemførelsesdato
  async function setTodayAsCompletionDate(gameId) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
    
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, "0")}-${(
      today.getMonth() + 1
    ).toString().padStart(2, "0")}-${today.getFullYear()}`;
    
    const updatedGame = {
      ...game,
      completionDate: formattedDate,
      status: "completed"
    };
    
    return saveGame(updatedGame);
  }
  
  // Skift platform for et spil
  async function changePlatform(gameId, platformData) {
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;
    
    const updatedGame = {
      ...game,
      platform: platformData.name,
      platformColor: platformData.color
    };
    
    return saveGame(updatedGame);
  }
  
  // Opdater rækkefølgen for spil
  async function updateGameOrder(changedGames) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;
    
    try {
      const batch = writeBatch(db);
      
      // Opdater hvert spil
      changedGames.forEach(game => {
        const gameRef = doc(db, 'games', game.id);
        batch.update(gameRef, {
          order: Number(game.order) || 0,
          status: game.status
        });
        
        // Opdater det lokale spil også
        const index = games.value.findIndex(g => g.id === game.id);
        if (index >= 0) {
          games.value[index].order = Number(game.order) || 0;
          games.value[index].status = game.status;
        }
      });
      
      await batch.commit();
      
      // Sortér listen igen
      games.value.sort((a, b) => {
        if (a.status !== b.status) {
          return statusList.findIndex(s => s.id === a.status) - 
                 statusList.findIndex(s => s.id === b.status);
        }
        return (a.order || 0) - (b.order || 0);
      });
      
      return true;
    } catch (error) {
      console.error('Error updating game order:', error);
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
      return true;
    } catch (error) {
      console.error('Error importing games:', error);
      return false;
    }
  }

  // Synkronisér med Firebase
async function syncWithFirebase() {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;
    
    syncStatus.value = { status: 'syncing', message: 'Synkroniserer...' };
    
    try {
      // Proces unsyncedChanges i Firebase
      if (unsyncedChanges.value.length > 0) {
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
        
        syncStatus.value = { 
          status: 'success', 
          message: `Synkroniseret: ${setOps + updateOps + deleteOps} operationer` 
        };
        lastSync.value = new Date();
        
        // Genindlæs spil
        await loadGames();
      } else {
        syncStatus.value = { status: 'success', message: 'Ingen ændringer at synkronisere' };
      }
      
      return true;
    } catch (error) {
      console.error('Error synchronizing with Firebase:', error);
      syncStatus.value = { status: 'error', message: 'Fejl under synkronisering' };
      return false;
    }
  }

  return {
    syncWithFirebase,
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