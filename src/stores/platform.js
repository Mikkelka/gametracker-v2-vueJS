// stores/platform.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUserStore } from './user';
import { useGameStore } from './game.store';
import { useFirestoreCollection } from '../firebase/db.service';

export const usePlatformStore = defineStore('platform', () => {
  // State
  const platforms = ref([]);
  const isLoading = ref(true);
  
  // Firebase service
  const platformsService = useFirestoreCollection('platforms');
  
  // Indlæs platforme for brugeren
  async function loadPlatforms() {
    const userStore = useUserStore();
    if (!userStore.currentUser) return;
    
    isLoading.value = true;
    
    try {
      const result = await platformsService.getItems(userStore.currentUser.uid);
      
      if (result.success) {
        platforms.value = result.data;
      } else {
        console.error('Error loading platforms:', result.error);
      }
    } catch (error) {
      console.error('Error in loadPlatforms:', error);
    } finally {
      isLoading.value = false;
    }
  }
  
  // Tilføj en ny platform
  async function addPlatform(name, color) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return null;
    
    try {
      const platformData = {
        name,
        color,
        userId: userStore.currentUser.uid
      };
      
      const result = await platformsService.addItem(platformData);
      
      if (result.success) {
        // Opdater lokal liste
        platforms.value.push(result.data);
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error adding platform:', error);
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
    loadPlatforms,
    addPlatform,
    updatePlatformColor,
    deletePlatform,
    clearPlatforms
  };
});