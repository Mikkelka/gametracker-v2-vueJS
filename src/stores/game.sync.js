import { useUserStore } from './user';
import { useFirestoreCollection } from '../firebase/db.service';

export function useGameSync(
  games, 
  isLoading, 
  syncStatus, 
  lastSync, 
  unsyncedChanges, 
  unsubscribe, 
  syncDebounceTimer, 
  pendingSync
) {
  // Database service
  const gamesService = useFirestoreCollection('games');
  
  // Indlæs alle spil for den aktuelle bruger
  async function loadGames() {
    const userStore = useUserStore();
    if (!userStore.currentUser) return;

    isLoading.value = true;

    try {
      // Hvis der allerede er en aktiv lytter, skal vi rydde den
      if (unsubscribe.value) {
        unsubscribe.value();
        unsubscribe.value = null;
      }

      // Opsæt realtime lytter for spilændringer
      unsubscribe.value = gamesService.subscribeToItems(
        userStore.currentUser.uid,
        (result) => {
          if (result.success) {
            const updatedGames = result.data;

            // Sortér spil efter status og derefter efter rækkefølge
            updatedGames.sort((a, b) => {
              // Definer statusListen internt for sortering
              const statusOrder = ["upcoming", "willplay", "playing", "completed", "paused", "dropped"];
              if (a.status !== b.status) {
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
              }
              return (a.order || 0) - (b.order || 0);
            });

            games.value = updatedGames;
          } else {
            console.error('Error in games subscription:', result.error);
          }
          
          isLoading.value = false;
        },
        { 
          orderBy: {
            field: 'order',
            direction: 'asc'
          }
        }
      );
    } catch (error) {
      console.error('Error loading games:', error);
      isLoading.value = false;
    }
  }

  // Sikre at pendingSync nulstilles korrekt ved fejl
  async function syncWithFirebase() {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;
    
    // Hvis der ikke er nogen ændringer at synkronisere
    if (unsyncedChanges.value.length === 0) {
      pendingSync.value = false;
      const gameStore = useGameStore();
      gameStore.updateSyncStatus('success', 'Ingen ændringer at synkronisere', true);
      return true;
    }
    
    const gameStore = useGameStore();
    gameStore.updateSyncStatus('syncing', 'Synkroniserer...', false);
    
    try {
      // Tag en kopi af ændringer at arbejde med
      const changesToProcess = [...unsyncedChanges.value];
      
      // Brug batchUpdate funktion til at synkronisere ændringer
      const batchOperations = changesToProcess.map(change => ({
        type: change.type,
        id: change.id,
        data: change.data
      }));
      
      const result = await gamesService.batchUpdate(batchOperations);
      
      if (result.success) {
        // Fjern synkroniserede ændringer fra listen
        unsyncedChanges.value = [];
        
        pendingSync.value = false;
        gameStore.updateSyncStatus('success', 
          `Synkroniseret: ${result.count} operationer`, true);
        
        lastSync.value = new Date();
        return true;
      } else {
        // Fejl ved synkronisering
        pendingSync.value = false;
        gameStore.updateSyncStatus('error', 'Fejl under synkronisering', true);
        return false;
      }
    } catch (error) {
      console.error('Error synchronizing with Firebase:', error);
      
      // Nulstil pendingSync, men kun hvis der faktisk var et problem
      pendingSync.value = false;
      
      // Hvis der var succesfulde operationer før fejlen, vis success i stedet for fejl
      if (unsyncedChanges.value.length === 0) {
        gameStore.updateSyncStatus('success', 'Ændringer synkroniseret', true);
      } else {
        gameStore.updateSyncStatus('error', 'Fejl under synkronisering', true);
      }
      
      return false;
    }
  }

  return {
    loadGames,
    syncWithFirebase
  };
}

// Importer useGameStore for at undgå cirkulære afhængigheder
import { useGameStore } from './game.store';