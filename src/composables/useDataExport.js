// src/composables/useDataExport.js
import { ref } from 'vue';
import { useGameStore } from '../stores/game.store';
import { useCategoryStore } from '../stores/category';
import { useMediaTypeStore } from '../stores/mediaType';
import { useFirestoreNewStructure } from '../firebase/db-new-structure.service';
import { db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useDataExport() {
  const isExporting = ref(false);
  const exportError = ref(null);

  /**
   * Export ALL media type data to JSON (v3.0 format - pre-grouped by status)
   * Reads directly from new Firebase structure: users/{uid}/data/
   */
  async function exportAllData(userId, userEmail) {
    isExporting.value = true;
    exportError.value = null;

    try {
      const mediaTypeStore = useMediaTypeStore();
      const dbService = useFirestoreNewStructure();

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

      // Map category names (category names depend on media type)
      const categoryKeyMap = {
        game: 'platforms',
        movie: 'genres',
        book: 'authors'
      };

      // Get all metadata at once from users/{uid}/data/metadata
      const metadataResult = await dbService.getMetadata(userId);
      const allMetadata = metadataResult.success ? metadataResult.data : {};

      // Export metadata for each media type
      for (const mediaType of ['game', 'movie', 'book']) {
        const categoryKey = categoryKeyMap[mediaType];
        exportData.data.metadata[categoryKey] = (allMetadata[categoryKey] || []).map(c => ({
          id: c.id,
          name: c.name,
          color: c.color,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          userId: c.userId
        }));
      }

      // Get all lists at once from users/{uid}/data/lists
      // We need to read it directly since we want all media types at once
      const listRef = doc(db, `users/${userId}/data`, 'lists');
      const listSnap = await getDoc(listRef);

      if (listSnap.exists()) {
        const listsData = listSnap.data();

        // Export each media type's lists
        for (const mediaType of ['game', 'movie', 'book']) {
          const mediaTypeData = listsData[mediaType] || {};

          // Initialize all statuses for this media type
          exportData.data.lists[mediaType] = {};
          const mediaConfig = mediaTypeStore.mediaTypeConfig[mediaType];
          mediaConfig.statusList.forEach(statusObj => {
            exportData.data.lists[mediaType][statusObj.id] = [];
          });

          // Export items grouped by status (already in correct format)
          for (const [status, items] of Object.entries(mediaTypeData)) {
            if (Array.isArray(items)) {
              exportData.data.lists[mediaType][status] = items.map(item => ({
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
              }));
            }
          }
        }
      }

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
