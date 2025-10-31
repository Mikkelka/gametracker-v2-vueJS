// src/composables/useDataExport.js
import { ref } from 'vue';
import { useGameStore } from '../stores/game.store';
import { useCategoryStore } from '../stores/category';
import { useMediaTypeStore } from '../stores/mediaType';

export function useDataExport() {
  const isExporting = ref(false);
  const exportError = ref(null);

  /**
   * Export all user data to JSON
   * Uses data from stores (which are already loaded from Firebase)
   */
  async function exportAllData(userId, userEmail) {
    isExporting.value = true;
    exportError.value = null;

    try {
      const gameStore = useGameStore();
      const categoryStore = useCategoryStore();
      const mediaTypeStore = useMediaTypeStore();

      const exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        userEmail: userEmail,
        mediaTypes: {}
      };

      // Export games (current media type only, but that's what's loaded)
      const currentType = mediaTypeStore.currentType;
      const mediaConfig = mediaTypeStore.mediaTypeConfig[currentType];

      if (gameStore.games && gameStore.games.length > 0) {
        exportData.mediaTypes[currentType] = {
          items: gameStore.games.map(game => ({
            id: game.id,
            title: game.title,
            platform: game.platform,
            platformColor: game.platformColor,
            status: game.status,
            favorite: game.favorite,
            order: game.order,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
            completionDate: game.completionDate,
            userId: game.userId
          })),
          categories: categoryStore.platforms && categoryStore.platforms.length > 0
            ? categoryStore.platforms.map(p => ({
              id: p.id,
              name: p.name,
              color: p.color,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              userId: p.userId
            }))
            : [],
          notes: gameStore.notes || []
        };
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

    if (importData.mediaTypes) {
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
