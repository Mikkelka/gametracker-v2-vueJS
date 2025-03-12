// vue/src/stores/platform.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUserStore } from './user';
import { useGameStore } from './game';
import { db } from '@/services/firebase';
import { 
  collection, query, where, getDocs, doc, 
  setDoc, deleteDoc, writeBatch
} from 'firebase/firestore';

export const usePlatformStore = defineStore('platform', () => {
  const platforms = ref([]);
  const isLoading = ref(true);
  
  // Indlæs platforme for brugeren
  async function loadPlatforms() {
    const userStore = useUserStore();
    if (!userStore.currentUser) return;
    
    isLoading.value = true;
    
    try {
      const platformsCollection = collection(db, 'platforms');
      const q = query(platformsCollection, where('userId', '==', userStore.currentUser.uid));
      const snapshot = await getDocs(q);
      
      platforms.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      isLoading.value = false;
    } catch (error) {
      console.error('Error loading platforms:', error);
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
      
      const newDocRef = doc(collection(db, 'platforms'));
      await setDoc(newDocRef, platformData);
      
      // Opdater lokal liste
      const newPlatform = {
        id: newDocRef.id,
        ...platformData
      };
      
      platforms.value.push(newPlatform);
      return newPlatform;
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
      await setDoc(doc(db, 'platforms', platformId), { color: newColor }, { merge: true });
      
      // Opdater alle spil med denne platform
      const batch = writeBatch(db);
      const gamesCollection = collection(db, 'games');
      const q = query(
        gamesCollection, 
        where('userId', '==', userStore.currentUser.uid),
        where('platform', '==', platform.name)
      );
      
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach(gameDoc => {
        batch.update(gameDoc.ref, { platformColor: newColor });
      });
      
      await batch.commit();
      
      // Opdater lokal platforms-liste
      platform.color = newColor;
      
      // Opdater også spil i gameStore
      gameStore.games.forEach(game => {
        if (game.platform === platform.name) {
          game.platformColor = newColor;
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error updating platform color:', error);
      return false;
    }
  }
  
  // Slet en platform
  async function deletePlatform(platformId) {
    const userStore = useUserStore();
    if (!userStore.currentUser) return false;
    
    try {
      await deleteDoc(doc(db, 'platforms', platformId));
      
      // Opdater lokal liste
      platforms.value = platforms.value.filter(p => p.id !== platformId);
      return true;
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