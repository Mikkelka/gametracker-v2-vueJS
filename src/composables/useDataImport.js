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
   * Validate imported JSON data structure (v3.0 format only)
   */
  function validateImportData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Ugyldig JSON format');
    }

    if (!data.version || data.version !== '3.0') {
      throw new Error('Kun v3.0 format understøttes');
    }

    if (!data.data || !data.data.metadata || !data.data.lists) {
      throw new Error('Manglende data.metadata eller data.lists i backup fil');
    }

    return true;
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
              id: item.id || `item-${Date.now()}-${Math.random()}`,
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

      // Import v3.0 format (only supported format now)
      const importResult = await importAllDataV3(importData, replace, currentUserId);

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
