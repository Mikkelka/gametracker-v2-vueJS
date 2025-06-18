<script setup>
// Import MobileNavigation
import { onMounted, ref, onBeforeUnmount, provide, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from './stores/user';
import AppSidebar from './components/layout/AppSidebar.vue';
import MobileNavigation from './components/layout/MobileNavigation.vue';

const userStore = useUserStore();
const _router = useRouter();
const isLoading = ref(true);
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true');
const _showMobileMenu = ref(false);
const showSettingsModal = ref(false);
const showAddGameModal = ref(false);
const showPlatformModal = ref(false);

// Tilføj en isMobile reactive property
const isMobile = ref(window.innerWidth < 768);
const route = useRoute();

const isDashboard = computed(() => {
  return route.name === 'dashboard';
});

// Lyt efter ændringer i vinduesstørrelse
function handleResize() {
  isMobile.value = window.innerWidth < 768;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
  applyCssVariables();
  // Resten af onMounted koden...
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  // Resten af onBeforeUnmount koden...
});

provide('modals', {
  showSettingsModal,
  showAddGameModal,
  showPlatformModal
});

// CSS variabler
const cssVariables = {
  '--bg-color': '#1a1a1a',
  '--text-color': '#e0e0e0',
  '--header-bg': '#2c2c2c',
  '--list-bg': '#2c2c2c',
  '--card-bg': '#3a3a3a',
  '--card-border': '#4a4a4a',
  '--button-bg': '#4caf50',
  '--button-hover': '#45a049',
  '--shadow': '0 4px 6px rgba(0, 0, 0, 0.3)',
  '--primary-color': '#4caf50',
  '--sidebar-width': '240px',
  '--sidebar-collapsed-width': '60px'
};

// Tilføj CSS variabler til :root
function applyCssVariables() {
  const root = document.documentElement;
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Håndter toggle af sidebar
function handleSidebarToggle(collapsed) {
  sidebarCollapsed.value = collapsed;
  localStorage.setItem('sidebarCollapsed', collapsed.toString());
}

// Mobile menu toggle removed - handled by MobileNavigation component

// Håndter åbning af indstillingsmodal
function openSettingsModal() {
  showSettingsModal.value = true;
}

// Tilføj eventBus til at åbne modaler fra child komponenter
provide('openModal', (modalName) => {
  if (modalName === 'settings') {
    showSettingsModal.value = true;
  } else if (modalName === 'addGame') {
    showAddGameModal.value = true;
  } else if (modalName === 'platform') {
    showPlatformModal.value = true;
  }
});

// Initialisér app
onMounted(async () => {
  applyCssVariables();
  try {
    await userStore.initUser();
  } catch (error) {
    console.error('Failed to initialize user:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="app-container">
    <div v-if="isLoading" class="loading-screen">
      <div class="loader"></div>
      <span>Indlæser MediaTrack...</span>
    </div>
    
    <template v-else>
      <AppSidebar 
        v-if="userStore.isLoggedIn && !isMobile && !isDashboard" 
        :collapsed="sidebarCollapsed" 
        @toggle="handleSidebarToggle"
        @open-settings-modal="openSettingsModal"
      />
      
      <MobileNavigation
        v-if="userStore.isLoggedIn && isMobile && !isDashboard"
        @openAddModal="showAddGameModal = true"
        @openCategoryModal="showPlatformModal = true"
        @openSettingsModal="showSettingsModal = true"
      />
      
      <main 
        class="content-area" 
        :class="{ 
          'with-sidebar': userStore.isLoggedIn && !isMobile && !isDashboard, 
          'sidebar-collapsed': sidebarCollapsed && !isMobile && !isDashboard,
          'with-mobile-nav': userStore.isLoggedIn && isMobile && !isDashboard
        }"
      >
        <router-view 
          :show-settings-modal="showSettingsModal"
          @update:show-settings-modal="showSettingsModal = $event"
          :show-add-game-modal="showAddGameModal"
          @update:show-add-game-modal="showAddGameModal = $event"
          :show-platform-modal="showPlatformModal"
          @update:show-platform-modal="showPlatformModal = $event"
        />
      </main>
    </template>
  </div>
</template>

<style>

* {
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
  box-sizing: border-box;
}

.app-container {
  position: relative;
  min-height: 100vh;
}

.content-area {
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}

.content-area.with-sidebar {
  margin-left: var(--sidebar-width);
}

.content-area.with-sidebar.sidebar-collapsed {
  margin-left: var(--sidebar-collapsed-width);
}

/* Loading animation */
.loading-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--bg-color);
}

.loader {
  border: 5px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 5px solid var(--button-bg);
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Mobil menu knap */
.mobile-menu-toggle {
  display: none;
  position: fixed;
  top: 15px;
  left: 15px;
  background-color: var(--button-bg);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.5rem;
  padding: 5px 10px;
  z-index: 1002;
  cursor: pointer;
}

/* Overlay for mobil */
.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: block;
  }
  
  .mobile-overlay {
    display: block;
  }
  
  .content-area.with-sidebar,
  .content-area.with-sidebar.sidebar-collapsed {
    margin-left: 0;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.5s ease;
}

.content-area.with-mobile-nav {
  margin-left: 0;
  padding-bottom: 60px; 
}

@media (max-width: 768px) {
  .content-area.with-sidebar,
  .content-area.with-sidebar.sidebar-collapsed {
    margin-left: 0;
  }
}
</style>