// src/composables/useDataExport.js
import { ref } from 'vue';
import { useGameStore } from '../stores/game.store';
import { useCategoryStore } from '../stores/category';
import { useMediaTypeStore } from '../stores/mediaType';
import { useFirestoreCollection } from '../firebase/db.service';

export function useDataExport() {
  const isExporting = ref(false);
  const exportError = ref(null);

  /**
   * Export ALL media type data to JSON (v3.0 format - pre-grouped by status)
   * Loads all games, movies, books and their categories in one file
   */
  async function exportAllData(userId, userEmail) {
    isExporting.value = true;
    exportError.value = null;

    try {
      const mediaTypeStore = useMediaTypeStore();
      const gameStore = useGameStore();

      // Use v3.0 format for new exports
      const exportData = {
        version: '3.0',
        exportDate: new Date().toISOString(),
        userEmail: userEmail,
        data: {
          metadata: {},
          lists: {}
        }
      };

      // Map category names to metadata keys
      const metadataKeyMap = {
        'platform': 'platforms',
        'genre': 'genres',
        'author': 'authors'
      };

      // Export each media type (game, movie, book)
      const mediaTypes = ['game', 'movie', 'book'];
      const originalMediaType = mediaTypeStore.currentType; // Save original

      for (const mediaType of mediaTypes) {
        // Set the media type temporarily so db.service knows the correct path
        mediaTypeStore.setMediaType(mediaType);

        const mediaConfig = mediaTypeStore.mediaTypeConfig[mediaType];
        const metadataKey = metadataKeyMap[mediaConfig.categoryName.toLowerCase()] || mediaConfig.categoryName + 's';

        // Get Firebase service for this media type
        // Note: db.service will use the correct path based on mediaTypeStore.currentType
        const collectionName = 'games'; // This gets mapped to correct path by db.service
        const categoriesCollectionName = 'platforms'; // This also gets mapped

        // Load items from Firebase (db.service handles path mapping)
        const itemsService = useFirestoreCollection(collectionName);
        const itemsResult = await itemsService.getItems(userId);
        const items = itemsResult.success ? itemsResult.data : [];

        // Load categories from Firebase (db.service handles path mapping)
        const categoriesService = useFirestoreCollection(categoriesCollectionName);
        const categoriesResult = await categoriesService.getItems(userId);
        const categories = categoriesResult.success ? categoriesResult.data : [];

        // Export metadata (categories)
        if (categories && categories.length > 0) {
          exportData.data.metadata[metadataKey] = categories.map(c => ({
            id: c.id,
            name: c.name,
            color: c.color,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            userId: c.userId
          }));
        } else {
          exportData.data.metadata[metadataKey] = [];
        }

        // Initialize all statuses for this media type
        exportData.data.lists[mediaType] = {};
        mediaConfig.statusList.forEach(statusObj => {
          exportData.data.lists[mediaType][statusObj.id] = [];
        });

        // Group items by status
        if (items && items.length > 0) {
          items.forEach(item => {
            const status = item.status || 'upcoming';
            if (!exportData.data.lists[mediaType][status]) {
              exportData.data.lists[mediaType][status] = [];
            }

            exportData.data.lists[mediaType][status].push({
              id: item.id,
              title: item.title,
              platform: item.platform,
              platformColor: item.platformColor,
              favorite: item.favorite || false,
              order: item.order || 0,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              completionDate: item.completionDate,
              userId: item.userId,
              notes: item.notes || []
            });
          });
        }
      }

      // Restore original media type
      mediaTypeStore.setMediaType(originalMediaType);

      // Fetch user settings from localStorage
      exportData.settings = {
        showUpcoming: localStorage.getItem('showUpcoming') === 'true',
        showPaused: localStorage.getItem('showPaused') === 'true',
        showDropped: localStorage.getItem('showDropped') === 'true'
      };

      // Convert to JSON string
      const jsonData = JSON.stringify(exportData, null, 2);

      // Create blob and download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `mediatrack-backup-${timestamp}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      isExporting.value = false;
      return { success: true, filename };
    } catch (error) {
      console.error('Error exporting data:', error);
      exportError.value = error.message || 'Fejl ved eksport af data';
      isExporting.value = false;
      throw error;
    }
  }

  /**
   * Prepare data preview for user to see what will be imported
   */
  function getImportPreview(importData) {
    const preview = {
      version: importData.version,
      exportDate: importData.exportDate,
      summary: {
        mediaTypes: {}
      }
    };

    // Handle v3.0 format
    if (importData.version === '3.0' && importData.data) {
      for (const [mediaType, lists] of Object.entries(importData.data.lists || {})) {
        let totalItems = 0;
        let totalNotes = 0;

        for (const items of Object.values(lists)) {
          if (Array.isArray(items)) {
            totalItems += items.length;
            for (const item of items) {
              if (item.notes && Array.isArray(item.notes)) {
                totalNotes += item.notes.length;
              }
            }
          }
        }

        const categoryName = {
          game: 'platforms',
          movie: 'genres',
          book: 'authors'
        }[mediaType];

        const categories = importData.data.metadata?.[categoryName]?.length || 0;

        preview.summary.mediaTypes[mediaType] = {
          items: totalItems,
          categories: categories,
          notes: totalNotes
        };
      }
    }
    // Handle v2.0 format (legacy)
    else if (importData.mediaTypes) {
      for (const [mediaType, data] of Object.entries(importData.mediaTypes)) {
        preview.summary.mediaTypes[mediaType] = {
          items: data.items?.length || 0,
          categories: data.categories?.length || 0,
          notes: data.notes?.length || 0
        };
      }
    }

    return preview;
  }

  return {
    isExporting,
    exportError,
    exportAllData,
    getImportPreview
  };
}
