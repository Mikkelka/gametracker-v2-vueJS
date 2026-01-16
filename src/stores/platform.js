// src/stores/platform.js (behold dette filnavn)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useUserStore } from './user';
import { useMediaTypeStore } from './mediaType';
import { useGameStore } from './game.store';
import { useFirestoreNewStructure } from '../firebase/db-new-structure.service';

// Behold dette eksportnavn for bagudkompatibilitet
export const usePlatformStore = defineStore('platform', () => {
  const createCategoryId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `category-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  // State
  const platforms = ref([]);
  const isLoading = ref(true);
  const error = ref(null);

  // Services
  const mediaTypeStore = useMediaTypeStore();
  const metadataService = useFirestoreNewStructure();

  // Computed for at få det rigtige metadata-nøgle baseret på medietype
  const metadataKey = computed(() => {
    const categoryName = mediaTypeStore.config.categoryName.toLowerCase();
    const keyMap = {
      'platform': 'platforms',
      'genre': 'genres',
      'author': 'authors'
    };
    return keyMap[categoryName] || categoryName + 's';
  });

  // Computed for at få kategoritekst baseret på medietype
  const categoryLabel = computed(() => mediaTypeStore.config.categoryName);
  
  // Indlæs platforme/kategorier for brugeren fra metadata
  async function loadPlatforms() {
    const userStore = useUserStore();
    if (!userStore.currentUser) {
      error.value = "Ingen bruger logget ind";
      return [];
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await metadataService.getMetadata(userStore.currentUser.uid);

      if (result.success) {
        platforms.value = result.data;
        return platforms.value;
      } else {
        error.value = result.error || `Fejl ved indlæsning af ${categoryLabel.value.toLowerCase()}e`;
        console.error(`Error loading metadata:`, result.error);
        return [];
      }
    } catch (err) {
      error.value = err.message || `Uventet fejl ved indlæsning af ${categoryLabel.value.toLowerCase()}e`;
      console.error(`Error in loadPlatforms:`, err);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // Tilføj en ny platform/kategori
  async function addPlatform(name, color) {
    error.value = null;
    const userStore = useUserStore();

    if (!userStore.currentUser) {
      error.value = "Ingen bruger logget ind";
      return null;
    }

    // Tjek om navn og farve er gyldige
    if (!name?.trim()) {
      error.value = `${categoryLabel.value}navn er påkrævet`;
      return null;
    }

    // Tjek miljøvariablen for maksimalt antal platforme
    const maxPlatforms = parseInt(import.meta.env.VITE_MAX_PLATFORMS_PER_USER);

    // Kun tjek hvis miljøvariablen er defineret og gyldig
    if (!isNaN(maxPlatforms) && platforms.value.length >= maxPlatforms) {
      error.value = `Du har nået grænsen på ${maxPlatforms} ${categoryLabel.value.toLowerCase()}e i den gratis plan.`;
      return null;
    }

    try {
      const key = metadataKey.value;
      const metadataRef = doc(db, `users/${userStore.currentUser.uid}/data`, 'metadata');

      // Læs nuværende metadata
      const metadataSnap = await getDoc(metadataRef);
      const metadataData = metadataSnap.exists() ? metadataSnap.data() : {};

      // Sikr at arrayet eksisterer
      if (!Array.isArray(metadataData[key])) {
        metadataData[key] = [];
      }

      // Opret ny kategori
      const newCategory = {
        id: createCategoryId(),
        name: name.trim(),
        color: color || '#4caf50',
        userId: userStore.currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Tilføj til array
      metadataData[key].push(newCategory);

      // Skriv tilbage til Firebase
      await setDoc(metadataRef, metadataData, { merge: true });

      // Opdater lokalt
      platforms.value.push(newCategory);
      return newCategory;
    } catch (err) {
      error.value = err.message || `Uventet fejl ved tilføjelse af ${categoryLabel.value.toLowerCase()}`;
      console.error(`Error adding platform:`, err);
      return null;
    }
  }

  // Opdater en platforms/kategoris farve
  async function updatePlatformColor(platformId, newColor) {
    const userStore = useUserStore();
    const gameStore = useGameStore();

    if (!userStore.currentUser) return false;

    try {
      // Find platform i den lokale liste
      const platform = platforms.value.find(p => p.id === platformId);
      if (!platform) return false;

      // Læs metadata-dokument
      const key = metadataKey.value;
      const metadataRef = doc(db, `users/${userStore.currentUser.uid}/data`, 'metadata');
      const metadataSnap = await getDoc(metadataRef);

      if (!metadataSnap.exists()) {
        console.error('Metadata document not found');
        return false;
      }

      const metadataData = metadataSnap.data();

      // Find og opdater kategori i arrayet
      const categoryArray = metadataData[key] || [];
      const categoryIndex = categoryArray.findIndex(c => c.id === platformId);

      if (categoryIndex === -1) {
        console.error('Category not found in metadata');
        return false;
      }

      categoryArray[categoryIndex].color = newColor;
      categoryArray[categoryIndex].updatedAt = new Date();

      // Skriv tilbage til Firebase
      metadataData[key] = categoryArray;
      await setDoc(metadataRef, metadataData, { merge: true });

      // Opdater lokalt objekt
      platform.color = newColor;

      // Opdater alle spil med denne platform (kun for games)
      if (mediaTypeStore.currentType === 'game') {
        const gamesWithPlatform = gameStore.games.filter(
          game => game.platform === platform.name
        );

        if (gamesWithPlatform.length > 0) {
          // Opret batch operations til at opdatere alle berørte spil
          const batchOperations = gamesWithPlatform.map(game => ({
            type: 'update',
            id: game.id,
            data: { platformColor: newColor }
          }));

          await metadataService.batchUpdate(batchOperations);

          // Opdater også spil i gameStore
          gameStore.games.forEach(game => {
            if (game.platform === platform.name) {
              game.platformColor = newColor;

              // Trigger en re-render ved at lave en "kopi" af objektet
              const index = gameStore.games.findIndex(g => g.id === game.id);
              if (index >= 0) {
                gameStore.games[index] = { ...game };
              }
            }
          });
        }
      }

      return true;
    } catch (error) {
      console.error(`Error updating ${categoryLabel.value} color:`, error);
      return false;
    }
  }

  // Slet en platform/kategori
  async function deletePlatform(platformId) {
    const userStore = useUserStore();
    const gameStore = useGameStore();

    if (!userStore.currentUser) return false;

    try {
      // Find platform i den lokale liste
      const platform = platforms.value.find(p => p.id === platformId);
      if (!platform) return false;

      // Tjek kun for spil der bruger platformen (kun for games)
      if (mediaTypeStore.currentType === 'game') {
        const gamesUsingPlatform = gameStore.games.filter(g => g.platform === platform.name);

        if (gamesUsingPlatform.length > 0) {
          alert(`Kan ikke slette ${categoryLabel.value.toLowerCase()}en "${platform.name}" da ${gamesUsingPlatform.length} ${mediaTypeStore.config.itemNamePlural} bruger den. Fjern eller ændr disse ${mediaTypeStore.config.itemNamePlural} først.`);
          return false;
        }
      }

      // Læs metadata-dokument
      const key = metadataKey.value;
      const metadataRef = doc(db, `users/${userStore.currentUser.uid}/data`, 'metadata');
      const metadataSnap = await getDoc(metadataRef);

      if (!metadataSnap.exists()) {
        console.error('Metadata document not found');
        return false;
      }

      const metadataData = metadataSnap.data();

      // Find og fjern kategori fra arrayet
      const categoryArray = metadataData[key] || [];
      const categoryIndex = categoryArray.findIndex(c => c.id === platformId);

      if (categoryIndex === -1) {
        console.error('Category not found in metadata');
        return false;
      }

      categoryArray.splice(categoryIndex, 1);

      // Skriv tilbage til Firebase
      metadataData[key] = categoryArray;
      await setDoc(metadataRef, metadataData, { merge: true });

      // Opdater lokal liste
      platforms.value = platforms.value.filter(p => p.id !== platformId);
      return true;
    } catch (error) {
      console.error(`Error deleting ${categoryLabel.value}:`, error);
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
    categoryLabel, 
    // categories,
    loadPlatforms,
    addPlatform,
    updatePlatformColor,
    deletePlatform,
    clearPlatforms
  };
});
