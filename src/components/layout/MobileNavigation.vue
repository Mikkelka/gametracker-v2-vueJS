<!-- src/components/layout/MobileNavigation.vue (opdateret) -->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useMediaTypeStore } from '../../stores/mediaType';
import { useRouter } from 'vue-router';
import { useGameStore } from '../../stores/game.store';
import { useCategoryStore } from '../../stores/category';

const gameStore = useGameStore();
const categoryStore = useCategoryStore();

const mediaTypeStore = useMediaTypeStore();
const router = useRouter();

// Memory leak prevention
const isComponentDestroyed = ref(false);
const activeTimeouts = new Set();

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

// Timer management with cleanup tracking
function createTimeout(callback, delay) {
  if (isComponentDestroyed.value) return null;
  
  const timeoutId = setTimeout(() => {
    activeTimeouts.delete(timeoutId);
    if (!isComponentDestroyed.value) {
      callback();
    }
  }, delay);
  
  activeTimeouts.add(timeoutId);
  return timeoutId;
}

function clearTrackedTimeout(timeoutId) {
  if (timeoutId) {
    clearTimeout(timeoutId);
    activeTimeouts.delete(timeoutId);
  }
}

// Luk alle menuer
function closeAllMenus() {
  if (isComponentDestroyed.value) return;
  
  showMediaMenu.value = false;
  showSearch.value = false;
  showActionMenu.value = false;
}

// Toggle funktioner
function toggleMediaMenu() {
  if (isComponentDestroyed.value) return;
  
  showMediaMenu.value = !showMediaMenu.value;
  if (showMediaMenu.value) {
    showSearch.value = false;
    showActionMenu.value = false;
  }
}

function toggleSearch() {
  if (isComponentDestroyed.value) return;
  
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    showMediaMenu.value = false;
    showActionMenu.value = false;
    // Fokuser på søgefeltet når det åbnes - with safety check
    createTimeout(() => {
      if (!isComponentDestroyed.value) {
        const searchInput = document.getElementById('mobileSearchInput');
        if (searchInput) {
          searchInput.focus();
        }
      }
    }, 100);
  }
}

function toggleActionMenu() {
  if (isComponentDestroyed.value) return;
  
  showActionMenu.value = !showActionMenu.value;
  if (showActionMenu.value) {
    showMediaMenu.value = false;
    showSearch.value = false;
  }
}

// Debounced search for better performance
let searchTimeout = null;

function handleSearch() {
  if (isComponentDestroyed.value) return;
  
  // Clear previous timeout
  if (searchTimeout) {
    clearTrackedTimeout(searchTimeout);
    searchTimeout = null;
  }
  
  // Debounce search for 300ms
  searchTimeout = createTimeout(() => {
    if (!isComponentDestroyed.value) {
      const searchEvent = new CustomEvent('app-search', { 
        detail: { term: searchInput.value }
      });
      window.dispatchEvent(searchEvent);
    }
    searchTimeout = null;
  }, 300);
}

function clearSearch() {
  if (isComponentDestroyed.value) return;
  
  searchInput.value = '';
  handleSearch();
}

// Medietype-skift
async function changeMediaType(type, event) {
  if (isComponentDestroyed.value) return;
  
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
      createTimeout(() => {
        if (!isComponentDestroyed.value) {
          showMediaMenu.value = false;
        }
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
  if (isComponentDestroyed.value) return;
  
  if (event) {
    event.stopPropagation();
  }
  
  router.push({ name: 'dashboard' });
  
  // Tilføj en lille forsinkelse før menuen lukkes
  createTimeout(() => {
    if (!isComponentDestroyed.value) {
      closeAllMenus();
    }
  }, 100);
}

// Emit events for at åbne modaler
const emit = defineEmits(['openAddModal', 'openCategoryModal', 'openSettingsModal']);

function openAddModal() {
  if (isComponentDestroyed.value) return;
  
  emit('openAddModal');
  closeAllMenus();
}

function openCategoryModal() {
  if (isComponentDestroyed.value) return;
  
  emit('openCategoryModal');
  closeAllMenus();
}

async function openSettingsModal(type) {
  if (isComponentDestroyed.value) return;
  
  if (type && mediaTypeStore.currentType !== type) {
    try {
      await mediaTypeStore.setMediaType(type);
      await gameStore.loadGames();
      await categoryStore.loadPlatforms();
      await router.push({ name: 'home' });
      closeAllMenus();
      setTimeout(() => {
        if (!isComponentDestroyed.value) {
          emit('openSettingsModal');
        }
      }, 100);
    } catch (error) {
      console.error('Fejl ved skift af medietype:', error);
      closeAllMenus();
    }
  } else {
    emit('openSettingsModal');
    closeAllMenus();
  }
}

// Cleanup function
function cleanup() {
  isComponentDestroyed.value = true;
  
  // Clear all timeouts
  activeTimeouts.forEach(timeoutId => {
    clearTimeout(timeoutId);
  });
  activeTimeouts.clear();
  
  // Clear search timeout specifically
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
  
  // Close all menus
  showMediaMenu.value = false;
  showSearch.value = false;
  showActionMenu.value = false;
}

// Component lifecycle
onMounted(() => {
  isComponentDestroyed.value = false;
});

onBeforeUnmount(() => {
  cleanup();
});

// Emergency cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}
</script>

<template>
  <nav class="mobile-navigation">
    <!-- Medietype-menu (venstre) -->
    <div class="nav-item" @click.stop="toggleMediaMenu">
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
            aria-label="Indstillinger för MovieTrack"
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
    <div class="nav-item" @click.stop="toggleActionMenu">
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
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-moderate: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-strong: 0 10px 25px rgba(0, 0, 0, 0.2);
  --nav-radius: 0;

  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 5px;
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 66px;
  background: linear-gradient(145deg, var(--header-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-bottom: none;
  border-radius: var(--nav-radius);
  box-shadow: var(--shadow-strong);
  backdrop-filter: blur(20px);
  z-index: 1000 !important;
  overflow: visible;
  padding-top: 3px;
}

.mobile-navigation::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    var(--primary-color), 
    rgba(76, 175, 80, 0.6),
    var(--primary-color)
  );
  opacity: 0.8;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
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
  transition: var(--transition-smooth);
  /* margin: 0rem 0.2rem; */
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.05), 
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  overflow: visible;
}

.nav-item:hover {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: var(--shadow-subtle);
}

.nav-item:active {
  transform: translateY(-1px) scale(0.98);
}

.icon {
  font-size: 1.4rem;
  margin-bottom: 2px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  transition: var(--transition-smooth);
}

.nav-item:hover .icon {
  transform: scale(1.1);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.label {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  opacity: 0.8;
  transition: var(--transition-smooth);
}

.nav-item:hover .label {
  opacity: 1;
}

/* Dropdown menuer */
.dropdown-menu {
  position: absolute;
  bottom: 60px;
  min-width: 200px;
  background: linear-gradient(145deg, var(--card-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: var(--shadow-strong);
  backdrop-filter: blur(20px);
  overflow: hidden;
  transform: translateY(10px);
  opacity: 0;
  visibility: hidden;
  transition: var(--transition-spring);
  z-index: 1001;
}

.dropdown-menu::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.media-menu {
  left: -2px;
  right: auto;
  margin-bottom: 4px;
}

.action-menu {
  left: auto;
  right: -2px;
  margin-bottom: 4px;
}

.dropdown-menu.active {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.dropdown-item {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
  cursor: pointer;
  transition: var(--transition-smooth);
  position: relative;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.05), 
    rgba(255, 255, 255, 0.02)
  );
}

.dropdown-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.dropdown-item:hover {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border-color: rgba(255, 255, 255, 0.15);
}

.dropdown-item:hover::before {
  left: 100%;
}

.dropdown-item:active {
  transform: scale(0.98);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
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
  padding: 16px 18px;
  transition: var(--transition-smooth);
}

.dropdown-settings-btn {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  font-size: 1rem;
  padding: 8px;
  margin: 8px 12px 8px 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.8;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
}

.dropdown-settings-btn:hover {
  opacity: 1;
  transform: rotate(90deg) scale(1.1);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: var(--shadow-subtle);
}

.dropdown-settings-btn:active {
  transform: rotate(90deg) scale(1.05);
}

.dropdown-icon {
  margin-right: 12px;
  font-size: 1.3rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.dropdown-text {
  font-weight: 500;
  letter-spacing: 0.25px;
}

/* Søgefelt overlay */
.search-overlay {
  position: fixed !important;
  bottom: 60px !important;
  left: 0 !important;
  right: 0 !important;
  background: linear-gradient(145deg, var(--card-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-bottom: none;
  padding: 16px;
  transform: translateY(100%);
  transition: var(--transition-spring);
  z-index: 999;
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-strong);
  opacity: 0;
  visibility: hidden;
}

.search-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.search-overlay.active {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-container input {
  width: 100%;
  padding: 14px 45px 14px 18px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 500;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-subtle);
}

.search-container input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-container input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  box-shadow: 
    var(--shadow-moderate),
    0 0 0 2px rgba(76, 175, 80, 0.2);
  transform: translateY(-1px);
}

.clear-search-btn {
  position: absolute;
  right: 12px;
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.8), 
    rgba(239, 68, 68, 0.6)
  );
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0.8;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
}

.clear-search-btn:hover {
  opacity: 1;
  transform: scale(1.1);
  box-shadow: var(--shadow-subtle);
}

/* Backdrop når en menu er åben */
.mobile-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px;
  background: linear-gradient(135deg, 
    rgba(0, 0, 0, 0.4), 
    rgba(0, 0, 0, 0.6)
  );
  backdrop-filter: blur(8px);
  z-index: 998;
  opacity: 0;
  visibility: hidden;
  transition: var(--transition-smooth);
}

.mobile-menu-backdrop.active {
  opacity: 1;
  visibility: visible;
}

/* Enhanced mobile optimizations */
@media (max-height: 600px) {
  .mobile-navigation {
    height: 55px;
  }
  
  .search-overlay {
    bottom: 55px;
  }
  
  .dropdown-menu {
    bottom: 55px;
    max-height: 180px;
    overflow-y: auto;
  }
  
  .mobile-menu-backdrop {
    bottom: 55px;
  }
  
  .nav-item {
   
  }
}

/* Large screen considerations (tablet landscape) */
@media (min-width: 768px) {
  .mobile-navigation {
    display: none;
  }
  
  .search-overlay,
  .mobile-menu-backdrop {
    display: none;
  }
}

/* Prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .mobile-navigation,
  .nav-item,
  .icon,
  .label,
  .dropdown-menu,
  .dropdown-item,
  .dropdown-settings-btn,
  .search-overlay,
  .search-container input,
  .clear-search-btn,
  .mobile-menu-backdrop {
    animation: none;
    transition: none;
  }
  
  .nav-item:hover,
  .nav-item:active,
  .dropdown-item:hover,
  .dropdown-item:active,
  .dropdown-settings-btn:hover,
  .dropdown-settings-btn:active,
  .search-container input:focus,
  .clear-search-btn:hover {
    transform: none;
  }
  
  .dropdown-item::before {
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .mobile-navigation {
    border-width: 2px;
    border-color: var(--text-color);
  }
  
  .nav-item {
    border-width: 2px;
    border-color: var(--text-color);
  }
  
  .dropdown-menu {
    border-width: 2px;
    border-color: var(--text-color);
    background: var(--bg-color);
  }
  
  .dropdown-item {
    border-color: var(--text-color);
  }
  
  .dropdown-settings-btn {
    border-width: 2px;
    border-color: var(--text-color);
    background: var(--text-color);
    color: var(--bg-color);
  }
  
  .search-overlay {
    border-width: 2px;
    border-color: var(--text-color);
    background: var(--bg-color);
  }
  
  .search-container input {
    border-width: 2px;
    border-color: var(--text-color);
  }
}
</style>