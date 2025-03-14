// vue/src/stores/game.sync.js
import { useUserStore } from './user';
import { db } from '@/services/firebase';
import {
  collection, query, where, doc,
  setDoc, deleteDoc, writeBatch, onSnapshot
} from 'firebase/firestore';

export function gameSyncService(
  games, 
  isLoading, 
  syncStatus, 
  lastSync, 
  unsyncedChanges, 
  unsubscribe, 
  syncDebounceTimer, 
  pendingSync
) {
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
          // Definer statusListen internt for sortering
          const statusOrder = ["upcoming", "willplay", "playing", "completed", "paused", "dropped"];
          if (a.status !== b.status) {
            return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
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

  // Sikre at pendingSync nulstilles korrekt ved fejl
  async function syncWithFirebase() {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;
    
    // Hvis der ikke er nogen ændringer at synkronisere
    if (unsyncedChanges.value.length === 0) {
      pendingSync.value = false;
      // Opdater status via den importerede funktion
      const gameStore = useGameStore();
      gameStore.updateSyncStatus('success', 'Ingen ændringer at synkronisere', true);
      return true;
    }
    
    // Opdater status via den importerede funktion
    const gameStore = useGameStore();
    gameStore.updateSyncStatus('syncing', 'Synkroniserer...', false);
    
    try {
      const batch = writeBatch(db);
      let setOps = 0, updateOps = 0, deleteOps = 0;
      
      // Tag en kopi af ændringer at arbejde med
      const changesToProcess = [...unsyncedChanges.value];
      
      // Behandl hver ændring individuelt for at undgå at en fejl blokerer alle ændringer
      for (const change of changesToProcess) {
        try {
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
          
          // Fjern den behandlede ændring fra listen
          unsyncedChanges.value = unsyncedChanges.value.filter(c => 
            !(c.id === change.id && c.type === change.type)
          );
        } catch (innerError) {
          console.error(`Fejl ved behandling af ændring (${change.type}, ${change.id}):`, innerError);
          // Vi fortsætter med næste ændring i stedet for at afbryde hele processen
        }
      }
      
      // Commit batch hvis der er noget at committe
      if (setOps + updateOps + deleteOps > 0) {
        await batch.commit();
      }
      
      pendingSync.value = false;
      
      if (setOps + updateOps + deleteOps > 0) {
        gameStore.updateSyncStatus('success', `Synkroniseret: ${setOps + updateOps + deleteOps} operationer`, true);
      } else {
        gameStore.updateSyncStatus('idle', '', false);
      }
      
      lastSync.value = new Date();
      return true;
    } catch (error) {
      console.error('Error synchronizing with Firebase:', error);
      
      // Vigtig: Nulstil pendingSync, men kun hvis der faktisk var et problem
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

// Importer useGameStore for at undgå cirkelsreferencer
import { useGameStore } from './game.store';