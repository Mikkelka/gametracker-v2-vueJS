<!-- src/components/layout/AppSidebar.vue (opdateret) -->
<script setup>
import { ref, watch, computed, inject, onMounted, onBeforeUnmount } from 'vue';
import { useMediaTypeStore } from '../../stores/mediaType';
import { useUserStore } from '../../stores/user';
import { useRouter } from 'vue-router';
import { useGameStore } from '../../stores/game.store';
import { useCategoryStore } from '../../stores/category';
import { 
  Home, 
  Search, 
  Menu, 
  Gamepad2, 
  Film, 
  Book, 
  Plus, 
  Settings, 
  LogOut,
  User 
} from 'lucide-vue-next';

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
const showSearch = ref(true);

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

function toggleSearch() {
  if (isComponentDestroyed.value) return;
  
  showSearch.value = !showSearch.value;
  if (!showSearch.value) {
    clearSearch();
  }
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
    icon: Gamepad2,
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
        icon: Plus,
        label: 'Tilføj spil',
        action: () => openAddModal(),
      },
      {
        icon: Settings,
        label: 'Platforme',
        action: () => openCategoryModal(),
      }
    ]
  },
  { 
    id: 'movie',
    icon: Film,
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
        icon: Plus,
        label: 'Tilføj film',
        action: () => openAddModal(),
      },
      {
        icon: Settings,
        label: 'Genrer',
        action: () => openCategoryModal(),
      }
    ]
  },
  { 
    id: 'book',
    icon: Book,
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
        icon: Plus,
        label: 'Tilføj bog',
        action: () => openAddModal(),
      },
      {
        icon: Settings,
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
    icon: Home, 
    label: 'Dashboard',
    action: () => navigateTo({ name: 'dashboard' }) 
  }
];


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
      <div class="user-header" v-if="!isCollapsed">
        <div class="user-avatar">{{ userStore.displayName?.charAt(0).toUpperCase() || 'U' }}</div>
        <div class="user-info-header">
          <div class="user-name">{{ userStore.displayName }}</div>
        </div>
        <div class="header-actions">
          <button 
            class="action-btn search-btn" 
            @click="toggleSearch"
            title="Søg"
          >
            <Search :size="16" />
          </button>
          <button class="action-btn menu-btn" @click="toggleSidebar" title="Skift sidebar visning">
            <Menu :size="16" />
          </button>
        </div>
      </div>
      <div class="collapsed-header" v-else>
        <div class="user-avatar" @click="toggleSidebar" title="Udvid sidebar">{{ userStore.displayName?.charAt(0).toUpperCase() || 'U' }}</div>
      </div>
    </div>
    
    <!-- Søgefelt -->
    <div class="search-container" v-if="!isCollapsed && showSearch">
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
          <component :is="otherMenuItems[0].icon" class="nav-icon" :size="20" />
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
          <!-- Hovedmenupunkt med count badge og add knap -->
          <li class="nav-item"
              :class="{ 'active': isItemActive(item.id) }"
              @click="item.action">
            <component :is="item.icon" class="nav-icon" :size="20" />
            <span class="nav-label" v-if="!isCollapsed">{{ item.label }}</span>
            <div v-if="!isCollapsed" class="nav-item-actions">
              <button 
                class="add-btn" 
                @click.stop="openAddModal()"
                title="Tilføj ny"
              >
                <Plus :size="14" />
              </button>
            </div>
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
                  <component :is="subItem.icon" class="nav-icon submenu-icon" :size="16" />
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
      <div class="footer-actions" v-if="!isCollapsed">
        <div class="nav-item" @click="openModal && openModal('settings')">
          <Settings class="nav-icon" :size="20" />
          <span class="nav-label">Indstillinger</span>
        </div>
        <div class="nav-item" @click="logout">
          <LogOut class="nav-icon" :size="20" />
          <span class="nav-label">Log ud</span>
        </div>
      </div>
      <div class="collapsed-footer" v-else>
        <div class="nav-item" @click="openModal && openModal('settings')" title="Indstillinger">
          <Settings class="nav-icon" :size="20" />
        </div>
        <div class="nav-item" @click="logout" title="Log ud">
          <LogOut class="nav-icon" :size="20" />
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: #1f2937;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: none;
  border-radius: 0;
  color: var(--text-color);
  height: 100vh;
  width: 240px;
  position: fixed;
  left: 0;
  top: 0;
  transition: var(--transition-smooth);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
}


.sidebar.collapsed {
  width: 60px;
  border-radius: 0;
}

.sidebar-header {
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.user-info-header {
  flex: 1;
  min-width: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: var(--transition-smooth);
}

.action-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}

.collapsed-header {
  display: flex;
  justify-content: center;
  width: 100%;
}

.collapsed-header .user-avatar {
  cursor: pointer;
  transition: var(--transition-smooth);
}

.collapsed-header .user-avatar:hover {
  opacity: 0.8;
}



.search-container {
  padding: 0.75rem 1rem;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.search-container input {
  width: 100%;
  padding: 8px 30px 8px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-color);
  font-size: 0.85rem;
  transition: var(--transition-smooth);
}

.search-container input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-container input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.65rem;
  opacity: 0.6;
  transition: var(--transition-smooth);
}

.clear-search-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.3);
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
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
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
  background: var(--primary-color);
  border-radius: 3px;
  opacity: 0.7;
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
  background: transparent;
  border: 1px solid transparent;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.75rem 0;
  margin: 0 0.5rem 0.25rem 0.5rem;
  border-radius: 3px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
}



.nav-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}


.add-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: var(--transition-smooth);
}

.add-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.nav-item.active .add-btn {
  color: white;
}

.submenu-container {
  margin: 0.25rem 0;
}

.submenu-item {
  margin-left: 1.5rem;
  font-size: 0.85rem;
}


.submenu-item .nav-item {
  padding: 0.4rem 1rem;
  margin: 0 0 0.05rem 0;
  border-radius: 4px;
  font-size: 0.85rem;
  background: transparent;
  border: none;
}

.submenu-item .nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.submenu-icon {
  width: 16px;
  height: 16px;
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

/* Simplified submenu animations */
.submenu-enter-active,
.submenu-leave-active {
  transition: opacity 0.2s;
}

.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
}

.sidebar-footer {
  padding: 0.5rem 0;
  background: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-actions,
.collapsed-footer {
  padding: 0 0.75rem;
}

.footer-actions .nav-item {
  margin: 0 0 0.1rem 0;
  padding: 0.5rem 1rem;
}

.collapsed-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.collapsed-footer .nav-item {
  margin: 0;
  padding: 0.5rem;
  width: 32px;
  height: 32px;
  justify-content: center;
}


.sidebar.collapsed .user-icon {
  display: flex;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.sidebar.collapsed .user-icon:hover {
  opacity: 0.8;
}

.user-info {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  padding: 0.75rem;
  transition: var(--transition-smooth);
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.15);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.user-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.25px;
  color: var(--text-color);
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
  background: rgba(239, 68, 68, 0.8);
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
  letter-spacing: 0.25px;
}

.logout-btn:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.9);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    position: fixed;
    z-index: 1001;
    border-radius: 0;
    width: 280px;
  }
  
  .sidebar.active {
    transform: translateX(0);
  }
  
  .sidebar-header {
    padding: 1rem;
  }
  
  .user-header {
    gap: 10px;
  }
  
  .header-actions {
    gap: 6px;
  }
  
  .nav-item {
    padding: 1rem 1.25rem;
    margin: 0 1rem 0.25rem 1rem;
  }
  
  .search-container {
    padding: 0.75rem 1rem;
  }
  
  .footer-actions,
  .collapsed-footer {
    padding: 0 1rem;
  }
  
  .footer-actions .nav-item {
    padding: 0.75rem 1rem;
    margin: 0 0 0.1rem 0;
  }
}

/* Prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .nav-item,
  .add-btn,
  .action-btn,
  .user-info,
  .user-avatar {
    transition: none;
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