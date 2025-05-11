<!-- src/components/layout/MobileNavigation.vue (opdateret) -->
<script setup>
import { ref, computed } from 'vue';
import { useMediaTypeStore } from '../../stores/mediaType';
import { useRouter } from 'vue-router';
import { useGameStore } from '../../stores/game.store';
import { useCategoryStore } from '../../stores/category';

const gameStore = useGameStore();
const categoryStore = useCategoryStore();

const mediaTypeStore = useMediaTypeStore();
const router = useRouter();

const showMediaMenu = ref(false);
const showSearch = ref(false);
const showActionMenu = ref(false);
const searchInput = ref('');

// Computed property for at få ikoner og tekst baseret på medietype
const actionConfig = computed(() => {
  const config = mediaTypeStore.config;
  return {
    addLabel: config.addButtonText,
    addIcon: '➕',
    categoryLabel: config.categoryNamePlural,
    categoryIcon: '📋'
  };
});

// Luk alle menuer
function closeAllMenus() {
  showMediaMenu.value = false;
  showSearch.value = false;
  showActionMenu.value = false;
}

// Toggle funktioner
function toggleMediaMenu() {
  showMediaMenu.value = !showMediaMenu.value;
  if (showMediaMenu.value) {
    showSearch.value = false;
    showActionMenu.value = false;
  }
}

function toggleSearch() {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    showMediaMenu.value = false;
    showActionMenu.value = false;
    // Fokuser på søgefeltet når det åbnes
    setTimeout(() => {
      document.getElementById('mobileSearchInput')?.focus();
    }, 100);
  }
}

function toggleActionMenu() {
  showActionMenu.value = !showActionMenu.value;
  if (showActionMenu.value) {
    showMediaMenu.value = false;
    showSearch.value = false;
  }
}

// Håndter søgning
function handleSearch() {
  // Emit search event som app'en kan lytte efter
  const searchEvent = new CustomEvent('app-search', { 
    detail: { term: searchInput.value }
  });
  window.dispatchEvent(searchEvent);
}

function clearSearch() {
  searchInput.value = '';
  handleSearch();
}

// Medietype-skift
async function changeMediaType(type, event) {
  // Stop event propagation
  if (event) {
    event.stopPropagation();
  }
  
  if (mediaTypeStore.currentType !== type) {
    try {
      // Skift medietype
      await mediaTypeStore.setMediaType(type);
      
      // Genindlæs spil/film/bøger og kategorier baseret på den nye type
      await gameStore.loadGames();
      await categoryStore.loadPlatforms();
      
      // Luk menu efter en kort forsinkelse
      setTimeout(() => {
        showMediaMenu.value = false;
      }, 100);
      
      console.log(`Skiftet til ${type}, data indlæst`);
    } catch (error) {
      console.error('Fejl ved skift af medietype:', error);
    }
  } else {
    showMediaMenu.value = false;
  }
}

// Åbne dashboardet
function goToDashboard(event) {
  if (event) {
    event.stopPropagation();
  }
  
  router.push({ name: 'dashboard' });
  
  // Tilføj en lille forsinkelse før menuen lukkes
  setTimeout(() => {
    closeAllMenus();
  }, 100);
}

// Emit events for at åbne modaler
const emit = defineEmits(['openAddModal', 'openCategoryModal', 'openSettingsModal']);

function openAddModal() {
  emit('openAddModal');
  closeAllMenus();
}

function openCategoryModal() {
  emit('openCategoryModal');
  closeAllMenus();
}

// Ny funktion til at åbne indstillinger
function openSettingsModal(type) {
  // Skift medietype hvis nødvendigt
  if (type && mediaTypeStore.currentType !== type) {
    mediaTypeStore.setMediaType(type);
  }
  emit('openSettingsModal');
  closeAllMenus();
}
</script>

<template>
  <nav class="mobile-navigation">
    <!-- Medietype-menu (venstre) -->
    <div class="nav-item" @click="toggleMediaMenu">
      <div class="icon">{{ mediaTypeStore.config.icon }}</div>
      <span class="label">Medier</span>
      
      <!-- Dropdown menu - justeret width og padding -->
      <div class="dropdown-menu media-menu" :class="{ active: showMediaMenu }">
        <div class="dropdown-item" @click="goToDashboard($event)">
          <span class="dropdown-icon">🏠</span>
          <span class="dropdown-text">Dashboard</span>
        </div>
        <div class="dropdown-item dropdown-item-with-settings">
          <div class="dropdown-main" @click="changeMediaType('game', $event)">
            <span class="dropdown-icon">🎮</span>
            <span class="dropdown-text">GameTrack</span>
          </div>
          <button 
            class="dropdown-settings-btn" 
            @click.stop="openSettingsModal('game')"
            aria-label="Indstillinger for GameTrack"
          >⚙️</button>
        </div>
        <div class="dropdown-item dropdown-item-with-settings">
          <div class="dropdown-main" @click="changeMediaType('movie', $event)">
            <span class="dropdown-icon">🎬</span>
            <span class="dropdown-text">MovieTrack</span>
          </div>
          <button 
            class="dropdown-settings-btn" 
            @click.stop="openSettingsModal('movie')"
            aria-label="Indstillinger for MovieTrack"
          >⚙️</button>
        </div>
        <div class="dropdown-item dropdown-item-with-settings">
          <div class="dropdown-main" @click="changeMediaType('book', $event)">
            <span class="dropdown-icon">📚</span>
            <span class="dropdown-text">BookTrack</span>
          </div>
          <button 
            class="dropdown-settings-btn" 
            @click.stop="openSettingsModal('book')"
            aria-label="Indstillinger for BookTrack"
          >⚙️</button>
        </div>
      </div>
    </div>
    
    <!-- Søg (midt) -->
    <div class="nav-item" @click="toggleSearch">
      <div class="icon">🔍</div>
      <span class="label">Søg</span>
    </div>
    
    <!-- Handlingsmenu (højre) -->
    <div class="nav-item" @click="toggleActionMenu">
      <div class="icon">➕</div>
      <span class="label">Handling</span>
      
      <!-- Dropdown menu -->
      <div class="dropdown-menu action-menu" :class="{ active: showActionMenu }">
        <div class="dropdown-item" @click.stop="openAddModal">
          <span class="dropdown-icon">{{ actionConfig.addIcon }}</span>
          <span>{{ actionConfig.addLabel }}</span>
        </div>
        <div class="dropdown-item" @click.stop="openCategoryModal">
          <span class="dropdown-icon">{{ actionConfig.categoryIcon }}</span>
          <span>{{ actionConfig.categoryLabel }}</span>
        </div>
      </div>
    </div>
  </nav>
  
  <!-- Søgefelt overlay -->
  <div class="search-overlay" :class="{ active: showSearch }">
    <div class="search-container">
      <input 
        type="text" 
        id="mobileSearchInput"
        v-model="searchInput" 
        @input="handleSearch"
        :placeholder="`Søg efter ${mediaTypeStore.config.itemNamePlural}...`"
      >
      <button v-if="searchInput" class="clear-search-btn" @click.stop="clearSearch">✕</button>
    </div>
  </div>
  
  <!-- Backdrop for når en menu er åben -->
  <div 
    class="mobile-menu-backdrop" 
    :class="{ active: showMediaMenu || showActionMenu }"
    @click="closeAllMenus"
  ></div>
</template>

<style scoped>
.mobile-navigation {
  display: flex;
  justify-content: space-around;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: var(--header-bg);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  position: relative;
  cursor: pointer;
}

.icon {
  font-size: 1.5rem;
  margin-bottom: 2px;
}

.label {
  font-size: 0.7rem;
  text-transform: uppercase;
}

/* Dropdown menuer */
.dropdown-menu {
  position: absolute;
  bottom: 65px;
  min-width: 180px;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
  transform: translateY(20px);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.media-menu {
  left: 5px;
  right: auto;
}

.action-menu {
  left: auto;
  right: 5px;
}

.dropdown-menu.active {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.dropdown-item {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--card-border);
  white-space: nowrap; /* Forhindrer tekstombrydning */
}

.dropdown-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:active {
  background-color: var(--list-bg);
}

.dropdown-item:last-child {
  border-bottom: none;
}

/* Ny styling for medietyper med indstillingsknap */
.dropdown-item-with-settings {
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dropdown-main {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 14px 16px;
}

.dropdown-settings-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  padding: 14px 16px;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.7;
  transition: transform 0.2s;
}

.dropdown-settings-btn:hover, 
.dropdown-settings-btn:active {
  opacity: 1;
  transform: rotate(45deg);
}

.dropdown-icon {
  margin-right: 10px;
  font-size: 1.2rem;
}

/* Søgefelt overlay */
.search-overlay {
  position: fixed;
  bottom: 60px;
  left: 0;
  right: 0;
  background-color: var(--card-bg);
  padding: 10px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 999;
}

.search-overlay.active {
  transform: translateY(0);
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-container input {
  width: 100%;
  padding: 10px 35px 10px 15px;
  border-radius: 20px;
  border: 1px solid var(--card-border);
  background-color: var(--list-bg);
  color: var(--text-color);
  font-size: 1rem;
}

.clear-search-btn {
  position: absolute;
  right: 15px;
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1rem;
  cursor: pointer;
}

/* Backdrop når en menu er åben */
.mobile-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease;
}

.mobile-menu-backdrop.active {
  opacity: 1;
  visibility: visible;
}
</style>