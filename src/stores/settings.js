// vue/src/stores/settings.js
import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { useMediaTypeStore } from './mediaType';

export const useSettingsStore = defineStore('settings', () => {
  const mediaTypeStore = useMediaTypeStore();
  
  // Indstillinger for hver medietype
  const mediaSettings = reactive({
    game: {
      showUpcoming: true,
      showPaused: true,
      showDropped: true
    },
    movie: {
      showUpcoming: true,
      showPaused: true,
      showDropped: true
    },
    book: {
      showUpcoming: true,
      showPaused: true,
      showDropped: true
    }
  });
  
  // Computed properties der henter indstillinger for den aktuelle medietype
  const showUpcoming = computed({
    get: () => {
      const currentType = mediaTypeStore.currentType;
      return mediaSettings[currentType]?.showUpcoming ?? true;
    },
    set: (value) => {
      const currentType = mediaTypeStore.currentType;
      if (mediaSettings[currentType]) {
        mediaSettings[currentType].showUpcoming = value;
      }
    }
  });
  
  const showPaused = computed({
    get: () => {
      const currentType = mediaTypeStore.currentType;
      return mediaSettings[currentType]?.showPaused ?? true;
    },
    set: (value) => {
      const currentType = mediaTypeStore.currentType;
      if (mediaSettings[currentType]) {
        mediaSettings[currentType].showPaused = value;
      }
    }
  });
  
  const showDropped = computed({
    get: () => {
      const currentType = mediaTypeStore.currentType;
      return mediaSettings[currentType]?.showDropped ?? true;
    },
    set: (value) => {
      const currentType = mediaTypeStore.currentType;
      if (mediaSettings[currentType]) {
        mediaSettings[currentType].showDropped = value;
      }
    }
  });
  
  // Indlæs indstillinger fra localStorage
  function loadSettings() {
    const savedSettings = localStorage.getItem('mediaTrackSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      
      // Opdater indstillinger for hver medietype
      for (const type in parsedSettings) {
        if (mediaSettings[type]) {
          mediaSettings[type] = { ...mediaSettings[type], ...parsedSettings[type] };
        }
      }
    } else {
      // Bagudkompatibilitet med "gameTrackSettings"
      const savedGameSettings = localStorage.getItem('gameTrackSettings');
      if (savedGameSettings) {
        const parsedSettings = JSON.parse(savedGameSettings);
        mediaSettings.game.showUpcoming = parsedSettings.showUpcoming ?? true;
        mediaSettings.game.showPaused = parsedSettings.showPaused ?? true;
        mediaSettings.game.showDropped = parsedSettings.showDropped ?? true;
      }
    }
  }
  
  // Gem indstillinger i localStorage
  function saveSettings() {
    localStorage.setItem('mediaTrackSettings', JSON.stringify(mediaSettings));
  }
  
  // Opdater indstillinger
  function updateSettings(settings) {
    const currentType = mediaTypeStore.currentType;
    
    if (settings.showUpcoming !== undefined) {
      mediaSettings[currentType].showUpcoming = settings.showUpcoming;
    }
    if (settings.showPaused !== undefined) {
      mediaSettings[currentType].showPaused = settings.showPaused;
    }
    if (settings.showDropped !== undefined) {
      mediaSettings[currentType].showDropped = settings.showDropped;
    }
    
    saveSettings();
  }

  // Indlæs indstillinger ved opstart
  loadSettings();

  return {
    showUpcoming,
    showPaused,
    showDropped,
    loadSettings,
    saveSettings,
    updateSettings,
    mediaSettings
  };
});