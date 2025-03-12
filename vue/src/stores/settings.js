// vue/src/stores/settings.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const showUpcoming = ref(true);
  const showPaused = ref(true);
  const showDropped = ref(true);
  
  // Indlæs indstillinger fra localStorage
  function loadSettings() {
    const savedSettings = localStorage.getItem('gameTrackSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      showUpcoming.value = parsedSettings.showUpcoming ?? true;
      showPaused.value = parsedSettings.showPaused ?? true;
      showDropped.value = parsedSettings.showDropped ?? true;
    }
  }
  
  // Gem indstillinger i localStorage
  function saveSettings() {
    localStorage.setItem(
      'gameTrackSettings',
      JSON.stringify({
        showUpcoming: showUpcoming.value,
        showPaused: showPaused.value,
        showDropped: showDropped.value
      })
    );
  }
  
  // Opdater indstillinger
  function updateSettings(settings) {
    if (settings.showUpcoming !== undefined) {
      showUpcoming.value = settings.showUpcoming;
    }
    if (settings.showPaused !== undefined) {
      showPaused.value = settings.showPaused;
    }
    if (settings.showDropped !== undefined) {
      showDropped.value = settings.showDropped;
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
    updateSettings
  };
});