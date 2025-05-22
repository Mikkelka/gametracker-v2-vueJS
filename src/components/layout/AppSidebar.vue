<!-- src/components/layout/AppSidebar.vue (opdateret) -->
<script setup>
import { ref, watch, computed, inject, onMounted, onBeforeUnmount } from 'vue';
import { useMediaTypeStore } from '../../stores/mediaType';
import { useUserStore } from '../../stores/user';
import { useRouter } from 'vue-router';
import { useGameStore } from '../../stores/game.store';
import { useCategoryStore } from '../../stores/category';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle', 'open-settings-modal']);
const isCollapsed = ref(props.collapsed);
const mediaTypeStore = useMediaTypeStore();
const userStore = useUserStore();
const gameStore = useGameStore();
const categoryStore = useCategoryStore();
const router = useRouter();

// Memory leak prevention
const isComponentDestroyed = ref(false);

// Få adgang til openModal funktion
const openModal = inject('openModal', null);

// Lyt til collapsed prop ændringer
watch(() => props.collapsed, (newValue) => {
  if (!isComponentDestroyed.value) {
    isCollapsed.value = newValue;
  }
});

function toggleSidebar() {
  if (isComponentDestroyed.value) return;
  
  isCollapsed.value = !isCollapsed.value;
  emit('toggle', isCollapsed.value);
}

// Søgefelt
const searchInput = ref('');

// Debounced search function for better performance
let searchTimeout = null;

function handleSearch() {
  if (isComponentDestroyed.value) return;
  
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Debounce search for 300ms
  searchTimeout = setTimeout(() => {
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

// Tjek om vi er på home-siden (for at vise/skjule undermenuer)
const isHomeView = computed(() => {
  return router.currentRoute.value.name === 'home';
});

// Tjek for at markere aktive menupunkter
const isItemActive = (itemId) => {
  return isHomeView.value && mediaTypeStore.currentType === itemId;
};

function navigateTo(path) {
  if (isComponentDestroyed.value) return;
  router.push(path);
}

// Dynamisk app ikon baseret på valgt medietype
const currentAppIcon = computed(() => {
  return mediaTypeStore.config?.icon || '📱';
});

// Åbn indstillinger for den aktuelle medietype
function openSettingsModal() {
  if (isComponentDestroyed.value) return;
  
  if (openModal) {
    openModal('settings');
  }
}

// Ny funktion for at åbne relevante modaler baseret på medietype
function openAddModal() {
  if (isComponentDestroyed.value) return;
  
  if (openModal) {
    openModal('addGame');
  }
}

function openCategoryModal() {
  if (isComponentDestroyed.value) return;
  
  if (openModal) {
    openModal('platform');
  }
}

// Medietype menupunkter med undermenuer
const mediaMenuItems = [
  { 
    id: 'game',
    icon: '🎮',
    label: 'GameTrack',
    action: async () => {
      if (isComponentDestroyed.value) return;
      
      if (mediaTypeStore.currentType !== 'game') {
        await mediaTypeStore.setMediaType('game');
        await gameStore.loadGames();
        await categoryStore.loadPlatforms();
      }
      navigateTo({ name: 'home' });
    },
    subMenu: [
      {
        icon: '➕',
        label: 'Tilføj spil',
        action: () => openAddModal(),
      },
      {
        icon: '📋',
        label: 'Platforme',
        action: () => openCategoryModal(),
      }
    ]
  },
  { 
    id: 'movie',
    icon: '🎬',
    label: 'MovieTrack',
    action: async () => {
      if (isComponentDestroyed.value) return;
      
      if (mediaTypeStore.currentType !== 'movie') {
        await mediaTypeStore.setMediaType('movie');
        await gameStore.loadGames();
        await categoryStore.loadPlatforms();
      }
      navigateTo({ name: 'home' });
    },
    subMenu: [
      {
        icon: '➕',
        label: 'Tilføj film',
        action: () => openAddModal(),
      },
      {
        icon: '📋',
        label: 'Genrer',
        action: () => openCategoryModal(),
      }
    ]
  },
  { 
    id: 'book',
    icon: '📚',
    label: 'BookTrack',
    action: async () => {
      if (isComponentDestroyed.value) return;
      
      if (mediaTypeStore.currentType !== 'book') {
        await mediaTypeStore.setMediaType('book');
        await gameStore.loadGames();
        await categoryStore.loadPlatforms();
      }
      navigateTo({ name: 'home' });
    },
    subMenu: [
      {
        icon: '➕',
        label: 'Tilføj bog',
        action: () => openAddModal(),
      },
      {
        icon: '📋',
        label: 'Forfattere',
        action: () => openCategoryModal(),
      }
    ]
  }
];

// Andre menupunkter (Nu uden indstillinger)
const otherMenuItems = [
  { 
    id: 'dashboard',
    icon: '🏠', 
    label: 'Dashboard',
    action: () => navigateTo({ name: 'dashboard' }) 
  }
];

// Funktion til at åbne indstillinger for specifik medietype
function openSettingsForType(typeId) {
  if (isComponentDestroyed.value) return;
  
  if (mediaTypeStore.currentType !== typeId) {
    mediaTypeStore.setMediaType(typeId);
  }
  if (openModal) {
    openModal('settings');
  }
}

// Tjek om dashboard er aktivt
const isDashboardActive = computed(() => {
  return router.currentRoute.value.name === 'dashboard';
});

async function logout() {
  if (isComponentDestroyed.value) return;
  
  await gameStore.syncWithFirebase?.();
  await userStore.logout();
  router.push({ name: 'login' });
}

// Cleanup function
function cleanup() {
  isComponentDestroyed.value = true;
  
  // Clear search timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
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
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <div class="sidebar-header">
      <div class="logo-container">
        <span class="logo-icon">{{ currentAppIcon }}</span>
        <span class="logo-text" v-if="!isCollapsed">MediaTrack</span>
      </div>
      <button class="toggle-btn" @click="toggleSidebar" title="Skift sidebar visning">
        {{ isCollapsed ? '▶' : '◀' }}
      </button>
    </div>
    
    <!-- Søgefelt -->
    <div class="search-container" v-if="!isCollapsed">
      <input 
        type="text" 
        v-model="searchInput" 
        @input="handleSearch"
        :placeholder="`Søg efter ${mediaTypeStore.config.itemNamePlural}...`"
      >
      <button 
        v-if="searchInput" 
        class="clear-search-btn" 
        @click="clearSearch"
      >✕</button>
    </div>
    
    <!-- Navigation -->
    <nav class="sidebar-nav">
      <!-- Dashboard menupunkt -->
      <ul class="nav-list">
        <li class="nav-item" 
            :class="{ 'active': isDashboardActive }"
            @click="otherMenuItems[0].action">
          <span class="nav-icon">{{ otherMenuItems[0].icon }}</span>
          <span class="nav-label" v-if="!isCollapsed">{{ otherMenuItems[0].label }}</span>
        </li>
      </ul>
      
      <!-- Medietyper sektion -->
      <div class="menu-section" v-if="!isCollapsed">
        <span class="menu-section-title">Medietyper</span>
      </div>
      <div class="menu-section-icon" v-else>
        <span class="menu-icon-divider"></span>
      </div>
      
      <ul class="nav-list">
        <!-- For hver medietype -->
        <template v-for="(item, index) in mediaMenuItems" :key="'media-'+index">
          <!-- Hovedmenupunkt med tandhjulsikon -->
          <li class="nav-item"
              :class="{ 'active': isItemActive(item.id) }"
              @click="item.action">
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label" v-if="!isCollapsed">{{ item.label }}</span>
            <button 
              v-if="!isCollapsed" 
              class="settings-btn" 
              @click.stop="openSettingsForType(item.id)"
              title="Indstillinger"
            >⚙️</button>
          </li>
          
          <!-- Vis kun undermenuer for den aktive medietype -->
          <div 
            class="submenu-container" 
            v-if="!isCollapsed && isHomeView && mediaTypeStore.currentType === item.id"
          >
            <transition-group name="submenu" tag="div">
              <div 
                v-for="(subItem, subIndex) in item.subMenu" 
                :key="'submenu-'+subIndex"
                class="submenu-item"
              >
                <div class="nav-item" @click="subItem.action">
                  <span class="nav-icon submenu-icon">{{ subItem.icon }}</span>
                  <span class="nav-label">{{ subItem.label }}</span>
                </div>
              </div>
            </transition-group>
          </div>
        </template>
      </ul>
    </nav>
    
    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="user-info" v-if="!isCollapsed">
        <div class="user-avatar">{{ userStore.displayName?.charAt(0).toUpperCase() || 'U' }}</div>
        <div class="user-details">
          <div class="user-name">{{ userStore.displayName }}</div>
          <button class="logout-btn" @click="logout">Log ud</button>
        </div>
      </div>
      <div class="user-icon" v-else @click="logout" title="Log ud">
        <div class="user-avatar">{{ userStore.displayName?.charAt(0).toUpperCase() || 'U' }}</div>
      </div>
    </div>
  </aside>
</template>

<!-- CSS unchanged - keeping original styles -->
<style scoped>
.sidebar {
  background-color: var(--header-bg);
  color: var(--text-color);
  height: 100vh;
  width: 240px;
  position: fixed;
  left: 0;
  top: 0;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow);
  z-index: 1000;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--card-border);
}

.logo-container {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.logo-icon {
  font-size: 1.4rem;
  margin-right: 10px;
}

.logo-text {
  font-weight: bold;
  font-size: 1.2rem;
  white-space: nowrap;
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  font-size: 1rem;
  padding: 5px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.toggle-btn:hover {
  opacity: 1;
}

.search-container {
  padding: 1rem;
  position: relative;
}

.search-container input {
  width: 100%;
  padding: 8px 30px 8px 10px;
  border-radius: 4px;
  border: 1px solid var(--card-border);
  background-color: var(--card-bg);
  color: var(--text-color);
  font-size: 0.9rem;
}

.search-container input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.clear-search-btn {
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  opacity: 0.6;
}

.clear-search-btn:hover {
  opacity: 1;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.menu-section {
  padding: 0.5rem 1rem 0.25rem;
  opacity: 0.7;
}

.menu-section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Divider mellem sektioner */
.menu-divider {
  height: 1px;
  background-color: var(--card-border);
  margin: 0.5rem 0.75rem;
  opacity: 0.5;
}

.menu-section-icon {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0;
  position: relative;
}

.menu-icon-divider {
  width: 20px;
  height: 2px;
  background-color: var(--card-border);
  opacity: 0.5;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 4px;
  margin: 0 0.5rem 0.1rem 0.5rem;
  position: relative; /* For at positionere settings-knappen */
}

/* Centrér ikoner i kollapset tilstand */
.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.5rem 0;
}

.nav-item:hover {
  background-color: var(--card-bg);
}

.nav-item.active {
  background-color: var(--primary-color);
  color: white;
}

/* Styling for indstillingsknap */
.settings-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 2px;
  opacity: 0.7;
  transition: all 0.2s;
}

.settings-btn:hover {
  opacity: 1;
  transform: rotate(45deg);
}

.nav-item.active .settings-btn {
  color: white;
}

.submenu-container {
  overflow: hidden;
}

.submenu-item {
  margin-left: 1.5rem;
  font-size: 0.9rem;
}

.submenu-item .nav-item {
  padding: 0.4rem 0.8rem;
}

.nav-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.submenu-icon {
  font-size: 1rem;
}

.nav-label {
  margin-left: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Animation for submenu items */
.submenu-enter-active,
.submenu-leave-active {
  transition: all 0.3s;
}

.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.submenu-move {
  transition: transform 0.3s;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--card-border);
}

/* Centrér brugeravatar i kollapset tilstand */
.sidebar.collapsed .user-icon {
  display: flex;
  justify-content: center;
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.user-details {
  margin-left: 12px;
  overflow: hidden;
}

.user-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: bold;
  margin-bottom: 4px;
}

.logout-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  padding: 0;
  font-size: 0.8rem;
  opacity: 0.7;
  text-align: left;
}

.logout-btn:hover {
  text-decoration: underline;
  opacity: 1;
}

/* Tilpasning til mobil */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    position: fixed;
    z-index: 1001;
  }
  
  .sidebar.active {
    transform: translateX(0);
  }
}
</style>