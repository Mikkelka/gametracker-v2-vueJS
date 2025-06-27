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

// Settings modal function removed - handled through provide/inject system

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
async function openSettingsForType(typeId) {
  if (isComponentDestroyed.value) return;
  if (mediaTypeStore.currentType !== typeId) {   
    await mediaTypeStore.setMediaType(typeId);
    await gameStore.loadGames();
    await categoryStore.loadPlatforms();  
    await router.push({ name: 'home' });   
    setTimeout(() => {
      if (!isComponentDestroyed.value && openModal) {
        openModal('settings');
      }
    }, 100);
  } else {  
    if (openModal) {
      openModal('settings');
    }
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

<style scoped>
.sidebar {
  --sidebar-radius: 0 var(--radius-lg) var(--radius-lg) 0;

  background: linear-gradient(145deg, var(--header-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: none;
  border-radius: var(--sidebar-radius);
  color: var(--text-color);
  height: 100vh;
  width: 240px;
  position: fixed;
  left: 0;
  top: 0;
  transition: var(--transition-smooth);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-dark-xl);
  backdrop-filter: blur(20px);
  z-index: 1000;
  overflow: hidden;
}

.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.sidebar.collapsed {
  width: 60px;
  border-radius: 3px;
}

.sidebar-header {
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08), 
    rgba(255, 255, 255, 0.04)
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.sidebar-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    var(--primary-color), 
    rgba(76, 175, 80, 0.6)
  );
  opacity: 0.8;
  box-shadow: 0 0 8px var(--primary-color);
}

.logo-container {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.logo-icon {
  font-size: 1.5rem;
  margin-right: 12px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  animation: gentle-pulse 3s ease-in-out infinite;
}

@keyframes gentle-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.logo-text {
  font-weight: 700;
  font-size: 1.25rem;
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-btn {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
}

.toggle-btn:hover {
  opacity: 1;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  transform: translateY(-1px);
  box-shadow: var(--shadow-subtle);
}

.search-container {
  padding: 1.25rem;
  position: relative;
}

.search-container input {
  width: 100%;
  padding: 10px 35px 10px 12px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  color: var(--text-color);
  font-size: 0.875rem;
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
  right: 1.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.8), 
    rgba(239, 68, 68, 0.6)
  );
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 3px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  font-size: 0.7rem;
  opacity: 0.8;
  transition: var(--transition-smooth);
}

.clear-search-btn:hover {
  opacity: 1;
  transform: translateY(-50%) scale(1.1);
  box-shadow: var(--shadow-subtle);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0;
}

.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.menu-section {
  padding: 0.75rem 1.25rem 0.5rem;
  opacity: 0.8;
}

.menu-section-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.menu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  margin: 0.75rem 1rem;
  opacity: 0.6;
}

.menu-section-icon {
  display: flex;
  justify-content: center;
  padding: 0.75rem 0;
  position: relative;
}

.menu-icon-divider {
  width: 24px;
  height: 3px;
  background: linear-gradient(90deg, 
    var(--primary-color), 
    rgba(76, 175, 80, 0.6)
  );
  border-radius: 3px;
  opacity: 0.7;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.3);
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.25rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  border-radius: 3px;
  margin: 0 0.75rem 0.25rem 0.75rem;
  position: relative;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.05), 
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.75rem 0;
  margin: 0 0.5rem 0.25rem 0.5rem;
  border-radius: 3px;
}

.nav-item:hover {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  box-shadow: var(--shadow-subtle);
}

.nav-item.active {
  background: linear-gradient(135deg, var(--primary-color), rgba(76, 175, 80, 0.8));
  color: white;
  border-color: rgba(76, 175, 80, 0.3);
  box-shadow: var(--shadow-moderate);
  position: relative;
  overflow: hidden;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: active-shine 2s ease-in-out infinite;
}

@keyframes active-shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.settings-btn {
  position: absolute;
  right: 12px;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: inherit;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
  z-index: 2;
}

.settings-btn:hover {
  opacity: 1;
  transform: rotate(90deg) scale(1.1);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.2), 
    rgba(255, 255, 255, 0.12)
  );
  box-shadow: var(--shadow-subtle);
}

.nav-item.active .settings-btn {
  color: white;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.2), 
    rgba(255, 255, 255, 0.1)
  );
  border-color: rgba(255, 255, 255, 0.2);
}

.submenu-container {
  overflow: hidden;
  margin: 0.5rem 0 0.75rem 0;
}

.submenu-item {
  margin-left: 2rem;
  font-size: 0.85rem;
  position: relative;
}

.submenu-item::before {
  content: '';
  position: absolute;
  left: -1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 60%;
  background: linear-gradient(180deg, 
    var(--primary-color), 
    rgba(76, 175, 80, 0.3)
  );
  border-radius: 1px;
  opacity: 0.6;
}

.submenu-item .nav-item {
  padding: 0.5rem 1rem;
  margin: 0 0 0.1rem 0;
  border-radius: 3px;
  font-size: 0.85rem;
}

.nav-icon {
  font-size: 1.25rem;
  width: 26px;
  text-align: center;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  position: relative;
  z-index: 1;
}

.submenu-icon {
  font-size: 1rem;
  width: 20px;
}

.nav-label {
  margin-left: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  letter-spacing: 0.25px;
  position: relative;
  z-index: 1;
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
  padding: 1.25rem;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08), 
    rgba(255, 255, 255, 0.04)
  );
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.sidebar-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    var(--primary-color), 
    rgba(76, 175, 80, 0.6)
  );
  opacity: 0.6;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.3);
}

.sidebar.collapsed .user-icon {
  display: flex;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.sidebar.collapsed .user-icon:hover {
  transform: translateY(-2px);
}

.user-info {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  padding: 0.75rem;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
}

.user-info:hover {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: var(--shadow-subtle);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 3px;
  background: linear-gradient(135deg, var(--primary-color), rgba(76, 175, 80, 0.8));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
  box-shadow: var(--shadow-moderate);
  border: 2px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.user-avatar::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: avatar-shine 3s ease-in-out infinite;
}

@keyframes avatar-shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.user-details {
  margin-left: 14px;
  overflow: hidden;
  flex: 1;
}

.user-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 0.9rem;
  letter-spacing: 0.25px;
}

.logout-btn {
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.8), 
    rgba(239, 68, 68, 0.6)
  );
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 3px;
  color: white;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.8;
  text-align: left;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
  letter-spacing: 0.25px;
}

.logout-btn:hover {
  opacity: 1;
  transform: translateY(-1px);
  box-shadow: var(--shadow-subtle);
  filter: brightness(1.1);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    position: fixed;
    z-index: 1001;
    border-radius: 3px;
    box-shadow: var(--shadow-dark-xl);
  }
  
  .sidebar.active {
    transform: translateX(0);
  }
  
  .nav-item {
    padding: 1rem 1.25rem;
    margin: 0 1rem 0.25rem 1rem;
  }
  
  .user-info {
    padding: 1rem;
  }
}

/* Prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .nav-item,
  .settings-btn,
  .toggle-btn,
  .user-info,
  .user-avatar,
  .logout-btn {
    animation: none;
    transition: none;
  }
  
  .nav-item:hover,
  .settings-btn:hover,
  .toggle-btn:hover,
  .user-info:hover,
  .logout-btn:hover {
    transform: none;
  }
  
  .nav-item.active::before,
  .user-avatar::before {
    animation: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .sidebar {
    border-width: 2px;
    border-color: var(--text-color);
  }
  
  .nav-item {
    border-width: 2px;
  }
  
  .nav-item.active {
    background-color: var(--text-color);
    color: var(--bg-color);
  }
  
  .user-avatar {
    border-width: 3px;
    border-color: var(--text-color);
  }
}
</style>