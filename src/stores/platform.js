// Forbedret platform.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUserStore } from './user';
import { useGameStore } from './game.store';
import { useFirestoreCollection } from '../firebase/db.service';

export const usePlatformStore = defineStore('platform', () => {
 // State
 const platforms = ref([]);
 const isLoading = ref(true);
 const error = ref(null);
 
 // Firebase service
 const platformsService = useFirestoreCollection('platforms');

   // Indlæs platforme for brugeren
   async function loadPlatforms() {
    const userStore = useUserStore();
    if (!userStore.currentUser) {
      error.value = "Ingen bruger logget ind";
      return [];
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const result = await platformsService.getItems(userStore.currentUser.uid);
      
      if (result.success) {
        platforms.value = result.data;
        return platforms.value;
      } else {
        error.value = result.error || 'Fejl ved indlæsning af platforme';
        console.error('Error loading platforms:', result.error);
        return [];
      }
    } catch (err) {
      error.value = err.message || 'Uventet fejl ved indlæsning af platforme';
      console.error('Error in loadPlatforms:', err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }



  // Tilføj en ny platform med begrænsning
  async function addPlatform(name, color) {
    error.value = null;
    const userStore = useUserStore();
    
    if (!userStore.currentUser) {
      error.value = "Ingen bruger logget ind";
      return null;
    }
    
    // Tjek om navn og farve er gyldige
    if (!name?.trim()) {
      error.value = "Platformnavn er påkrævet";
      return null;
    }
    
    // Tjek miljøvariablen for maksimalt antal platforme
    const maxPlatforms = parseInt(import.meta.env.VITE_MAX_PLATFORMS_PER_USER);
    
    // Kun tjek hvis miljøvariablen er defineret og gyldig
    if (!isNaN(maxPlatforms) && platforms.value.length >= maxPlatforms) {
      error.value = `Du har nået grænsen på ${maxPlatforms} platforme i den gratis plan.`;
      return null;
    }
    
    try {
      const platformData = {
        name: name.trim(),
        color: color || '#4caf50', // Standard farve hvis ingen er angivet
        userId: userStore.currentUser.uid
      };
      
      const result = await platformsService.addItem(platformData);
      
      if (result.success) {
        platforms.value.push(result.data);
        return result.data;
      } else {
        error.value = result.error || 'Fejl ved tilføjelse af platform';
        return null;
      }
    } catch (err) {
      error.value = err.message || 'Uventet fejl ved tilføjelse af platform';
      console.error('Error adding platform:', err);
      return null;
    }
  }

  // Opdater en platforms farve
  async function updatePlatformColor(platformId, newColor) {
    const userStore = useUserStore();
    const gameStore = useGameStore();

    if (!userStore.currentUser) return false;

    try {
      // Find platform i den lokale liste
      const platform = platforms.value.find(p => p.id === platformId);
      if (!platform) return false;

      // Opdater i Firestore
      const updateResult = await platformsService.updateItem(platformId, { color: newColor });

      if (!updateResult.success) {
        return false;
      }

      // Opdater lokalt objekt
      platform.color = newColor;

      // Opdater alle spil med denne platform
      const gamesWithPlatform = gameStore.games.filter(
        game => game.platform === platform.name
      );

      if (gamesWithPlatform.length > 0) {
        // Opret batch operations til at opdatere alle berørte spil
        const gamesService = useFirestoreCollection('games');
        const batchOperations = gamesWithPlatform.map(game => ({
          type: 'update',
          id: game.id,
          data: { platformColor: newColor }
        }));

        await gamesService.batchUpdate(batchOperations);

        // Opdater også spil i gameStore
        gameStore.games.forEach(game => {
          if (game.platform === platform.name) {
            game.platformColor = newColor;
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating platform color:', error);
      return false;
    }
  }

  // Slet en platform
  async function deletePlatform(platformId) {
    const userStore = useUserStore();
    const gameStore = useGameStore();

    if (!userStore.currentUser) return false;

    try {
      // Find platform i den lokale liste
      const platform = platforms.value.find(p => p.id === platformId);
      if (!platform) return false;

      // Tjek om der er spil, der bruger denne platform
      const gamesUsingPlatform = gameStore.games.filter(g => g.platform === platform.name);

      if (gamesUsingPlatform.length > 0) {
        alert(`Kan ikke slette platformen "${platform.name}" da ${gamesUsingPlatform.length} spil bruger den. Fjern eller ændr disse spil først.`);
        return false;
      }

      // Slet fra Firestore
      const result = await platformsService.deleteItem(platformId);

      if (result.success) {
        // Opdater lokal liste
        platforms.value = platforms.value.filter(p => p.id !== platformId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting platform:', error);
      return false;
    }
  }

  // Ryd platforme når brugeren logger ud
  function clearPlatforms() {
    platforms.value = [];
  }

  return {
    platforms,
    isLoading,
    error, 
    loadPlatforms,
    addPlatform,
    updatePlatformColor,
    deletePlatform,
    clearPlatforms
  };
});