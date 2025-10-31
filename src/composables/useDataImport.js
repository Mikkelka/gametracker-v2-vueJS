// src/composables/useDataImport.js
import { ref } from 'vue';
import {
  collection,
  writeBatch,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useMediaTypeStore } from '../stores/mediaType';
import { useUserStore } from '../stores/user';

export function useDataImport() {
  const isImporting = ref(false);
  const importError = ref(null);
  const importProgress = ref(0);

  /**
   * Detect import format version (v2.0 or v3.0)
   */
  function detectVersion(data) {
    if (!data.version) {
      throw new Error('Manglende version i backup fil');
    }

    if (data.version === '2.0') {
      return '2.0'; // Old flat format
    } else if (data.version === '3.0') {
      return '3.0'; // New pre-grouped format
    } else {
      throw new Error(`Usupported export version: ${data.version}`);
    }
  }

  /**
   * Validate imported JSON data structure (v2.0 format)
   */
  function validateImportDataV2(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Ugyldig JSON format');
    }

    if (!data.mediaTypes || typeof data.mediaTypes !== 'object') {
      throw new Error('Manglende mediaTypes i backup fil');
    }

    const validMediaTypes = ['game', 'movie', 'book'];
    for (const mediaType of Object.keys(data.mediaTypes)) {
      if (!validMediaTypes.includes(mediaType)) {
        throw new Error(`Ukendt media type: ${mediaType}`);
      }

      const typeData = data.mediaTypes[mediaType];
      if (!Array.isArray(typeData.items)) {
        throw new Error(`${mediaType}: items skal være et array`);
      }
      if (!Array.isArray(typeData.categories)) {
        throw new Error(`${mediaType}: categories skal være et array`);
      }
      if (!Array.isArray(typeData.notes)) {
        throw new Error(`${mediaType}: notes skal være et array`);
      }
    }

    return true;
  }

  /**
   * Validate imported JSON data structure (v3.0 format)
   */
  function validateImportDataV3(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Ugyldig JSON format');
    }

    if (!data.data || !data.data.metadata || !data.data.lists) {
      throw new Error('Manglende data.metadata eller data.lists i backup fil');
    }

    return true;
  }

  /**
   * Main validation wrapper
   */
  function validateImportData(data) {
    const version = detectVersion(data);

    if (version === '2.0') {
      return validateImportDataV2(data);
    } else if (version === '3.0') {
      return validateImportDataV3(data);
    }

    return true;
  }

  /**
   * Clear all user data for a specific media type
   */
  async function clearMediaTypeData(userId, mediaType) {
    const mediaTypeStore = useMediaTypeStore();
    const mediaConfig = mediaTypeStore.mediaTypeConfig[mediaType];

    if (!mediaConfig) {
      throw new Error(`Unknown media type: ${mediaType}`);
    }

    try {
      // Clear items and their notes
      let itemsPath = mediaType === 'game'
        ? 'games'
        : `mediaTypes/${mediaType}/${mediaConfig.collections.items}`;

      const itemsRef = collection(db, itemsPath);
      const itemsQuery = query(itemsRef, where('userId', '==', userId));
      const itemsSnapshot = await getDocs(itemsQuery);

      const itemDeleteBatch = writeBatch(db);
      for (const itemDoc of itemsSnapshot.docs) {
        // Delete notes subcollection
        const notesRef = collection(db, itemsPath, itemDoc.id, 'notes');
        const notesSnapshot = await getDocs(notesRef);
        for (const noteDoc of notesSnapshot.docs) {
          itemDeleteBatch.delete(noteDoc.ref);
        }

        // Delete item
        itemDeleteBatch.delete(itemDoc.ref);
      }
      await itemDeleteBatch.commit();

      // Clear categories
      let categoriesPath = mediaType === 'game'
        ? 'platforms'
        : `mediaTypes/${mediaType}/${mediaConfig.collections.categories}`;

      const categoriesRef = collection(db, categoriesPath);
      const categoriesQuery = query(categoriesRef, where('userId', '==', userId));
      const categoriesSnapshot = await getDocs(categoriesQuery);

      const categoryDeleteBatch = writeBatch(db);
      for (const categoryDoc of categoriesSnapshot.docs) {
        categoryDeleteBatch.delete(categoryDoc.ref);
      }
      await categoryDeleteBatch.commit();
    } catch (error) {
      console.error(`Error clearing ${mediaType} data:`, error);
      throw error;
    }
  }

  /**
   * Import data for a specific media type
   */
  async function importMediaTypeData(userId, mediaType, importData, replace = false) {
    const mediaTypeStore = useMediaTypeStore();
    const mediaConfig = mediaTypeStore.mediaTypeConfig[mediaType];

    if (!mediaConfig) {
      throw new Error(`Unknown media type: ${mediaType}`);
    }

    try {
      // Clear existing data if replace is true
      if (replace) {
        await clearMediaTypeData(userId, mediaType);
      }

      const typeData = importData.mediaTypes[mediaType];
      if (!typeData || (!typeData.items?.length && !typeData.categories?.length)) {
        return { itemsImported: 0, categoriesImported: 0, notesImported: 0 };
      }

      // Prepare collection paths
      const itemsPath = mediaType === 'game'
        ? 'games'
        : `mediaTypes/${mediaType}/${mediaConfig.collections.items}`;

      const categoriesPath = mediaType === 'game'
        ? 'platforms'
        : `mediaTypes/${mediaType}/${mediaConfig.collections.categories}`;

      let categoriesImported = 0;
      let itemsImported = 0;
      let notesImported = 0;

      // Import categories first
      if (typeData.categories && typeData.categories.length > 0) {
        const categoryBatch = writeBatch(db);
        for (const category of typeData.categories) {
          const { id, ...data } = category;
          const docRef = doc(db, categoriesPath, id);
          categoryBatch.set(docRef, {
            ...data,
            userId: userId,
            createdAt: data.createdAt || Date.now(),
            updatedAt: Date.now()
          });
          categoriesImported++;
        }
        await categoryBatch.commit();
      }

      // Import items
      if (typeData.items && typeData.items.length > 0) {
        const itemBatch = writeBatch(db);
        const itemIds = new Map(); // Map old IDs to new IDs

        for (const item of typeData.items) {
          const { id, ...data } = item;
          const docRef = doc(db, itemsPath, id);
          itemBatch.set(docRef, {
            ...data,
            userId: userId,
            createdAt: data.createdAt || Date.now(),
            updatedAt: Date.now()
          });
          itemIds.set(id, id);
          itemsImported++;
        }
        await itemBatch.commit();

        // Import notes for each item
        if (typeData.notes && typeData.notes.length > 0) {
          const noteBatch = writeBatch(db);
          for (const note of typeData.notes) {
            const { id, itemId, ...data } = note;
            if (itemIds.has(itemId)) {
              const docRef = doc(db, itemsPath, itemId, 'notes', id);
              noteBatch.set(docRef, {
                ...data,
                userId: userId,
                createdAt: data.createdAt || Date.now(),
                updatedAt: Date.now()
              });
              notesImported++;
            }
          }
          if (notesImported > 0) {
            await noteBatch.commit();
          }
        }
      }

      return {
        itemsImported,
        categoriesImported,
        notesImported
      };
    } catch (error) {
      console.error(`Error importing ${mediaType} data:`, error);
      throw error;
    }
  }

  /**
   * Import data in v3.0 format (new pre-grouped structure)
   */
  async function importAllDataV3(importData, replace = false, userId) {
    const results = {};
    let totalItemsImported = 0;
    let totalCategoriesImported = 0;
    let totalNotesImported = 0;

    try {
      // First, import all metadata (categories) in one document
      // users/{uid}/data/metadata (document with game/movie/book categories)
      if (importData.data.metadata) {
        const metadataRef = doc(db, `users/${userId}/data`, 'metadata');
        const metadataData = {};

        for (const [categoryType, categories] of Object.entries(importData.data.metadata)) {
          if (Array.isArray(categories) && categories.length > 0) {
            metadataData[categoryType] = categories;
            totalCategoriesImported += categories.length;
          }
        }

        if (Object.keys(metadataData).length > 0) {
          await setDoc(metadataRef, metadataData, { merge: true });
        }
      }

      // Then, import all lists (game, movie, book)
      // users/{uid}/data/lists (document with game/movie/book status arrays)
      for (const [mediaType, lists] of Object.entries(importData.data.lists || {})) {
        try {
          results[mediaType] = {
            itemsImported: 0,
            categoriesImported: 0,
            notesImported: 0
          };

          // Count categories for this media type
          const categoryName = {
            game: 'platforms',
            movie: 'genres',
            book: 'authors'
          }[mediaType];

          if (importData.data.metadata && importData.data.metadata[categoryName]) {
            results[mediaType].categoriesImported = importData.data.metadata[categoryName].length;
          }

          // Import lists (game, movie, book with their statuses)
          // Path: users/{uid}/data/lists (document, not collection)
          const listRef = doc(db, `users/${userId}/data`, 'lists');

          // Build the structure with all statuses
          const listData = {};
          listData[mediaType] = {};

          for (const [status, items] of Object.entries(lists)) {
            listData[mediaType][status] = items.map(item => ({
              ...item,
              userId: userId,
              createdAt: item.createdAt || Date.now(),
              updatedAt: item.updatedAt || Date.now()
            }));
            results[mediaType].itemsImported += items.length;
            totalItemsImported += items.length;

            // Count notes
            for (const item of items) {
              if (item.notes && Array.isArray(item.notes)) {
                results[mediaType].notesImported += item.notes.length;
                totalNotesImported += item.notes.length;
              }
            }
          }

          // Write/merge entire list structure
          await setDoc(listRef, listData, { merge: true });

        } catch (error) {
          console.error(`Error importing ${mediaType} in v3.0:`, error);
          results[mediaType] = {
            error: error.message,
            itemsImported: 0,
            categoriesImported: 0,
            notesImported: 0
          };
        }
      }

    } catch (error) {
      console.error('Error importing metadata in v3.0:', error);
      throw error;
    }

    return {
      results,
      totals: {
        itemsImported: totalItemsImported,
        categoriesImported: totalCategoriesImported,
        notesImported: totalNotesImported
      }
    };
  }

  /**
   * Import all data from backup file (handles both v2.0 and v3.0)
   */
  async function importAllData(importData, replace = false, userId, userEmail) {
    isImporting.value = true;
    importError.value = null;
    importProgress.value = 0;

    try {
      const userStore = useUserStore();
      const currentUserId = userId || userStore.currentUser?.uid;
      const currentEmail = userEmail || userStore.currentUser?.email;

      if (!currentUserId) {
        throw new Error('Bruger ikke logget ind');
      }

      // Validate import data
      validateImportData(importData);

      // Detect version and import accordingly
      const version = detectVersion(importData);

      let importResult;

      if (version === '3.0') {
        // New format - import directly to new structure
        importResult = await importAllDataV3(importData, replace, currentUserId);

      } else {
        // v2.0 format - use old import logic
        const mediaTypes = Object.keys(importData.mediaTypes || {});
        const totalSteps = mediaTypes.length;
        let completedSteps = 0;

        const results = {};

        for (const mediaType of mediaTypes) {
          try {
            results[mediaType] = await importMediaTypeData(
              currentUserId,
              mediaType,
              importData,
              replace
            );
            completedSteps++;
            importProgress.value = Math.round((completedSteps / totalSteps) * 100);
          } catch (error) {
            console.error(`Failed to import ${mediaType}:`, error);
            results[mediaType] = {
              error: error.message,
              itemsImported: 0,
              categoriesImported: 0,
              notesImported: 0
            };
          }
        }

        importResult = {
          results,
          message: 'Data importeret succesfuldt'
        };
      }

      // Import settings if available
      if (importData.settings) {
        localStorage.setItem('showUpcoming', importData.settings.showUpcoming ? 'true' : 'false');
        localStorage.setItem('showPaused', importData.settings.showPaused ? 'true' : 'false');
        localStorage.setItem('showDropped', importData.settings.showDropped ? 'true' : 'false');
      }

      isImporting.value = false;
      importProgress.value = 100;

      return {
        success: true,
        ...importResult,
        message: 'Data importeret succesfuldt'
      };
    } catch (error) {
      console.error('Error importing data:', error);
      importError.value = error.message || 'Fejl ved import af data';
      isImporting.value = false;
      throw error;
    }
  }

  /**
   * Parse and validate JSON file
   */
  async function parseJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          validateImportData(data);
          resolve(data);
        } catch (error) {
          reject(new Error(`Fejl ved læsning af fil: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Fejl ved læsning af fil'));
      };

      reader.readAsText(file);
    });
  }

  return {
    isImporting,
    importError,
    importProgress,
    importAllData,
    parseJSONFile,
    validateImportData
  };
}
