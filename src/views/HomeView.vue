<!-- vue/src/views/HomeView.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGameStore } from '../stores/game.store';
import { usePlatformStore } from '../stores/platform';
import { useDragAndDrop } from '../composables/useDragAndDrop';
import AppHeader from '../components/layout/AppHeader.vue';
import AppFooter from '../components/layout/AppFooter.vue';
import GameList from '../components/game/GameList.vue';
import PlatformManager from '../components/platform/PlatformManager.vue';
import SettingsManager from '../components/settings/SettingsManager.vue';
import ImportManager from '../components/game/ImportManager.vue';
import { computed } from 'vue';
import { watch } from 'vue';


const gameStore = useGameStore();
const platformStore = usePlatformStore();
const searchTerm = ref('');
const showAddGameModal = ref(false);
const showPlatformModal = ref(false);
const showSettingsModal = ref(false);
const showImportModal = ref(false);
const activeEditMenu = ref(null);
const activePlatformMenu = ref(null);
const newGameTitle = ref('');
const selectedPlatform = ref('');
const syncStatusDisplay = computed(() => gameStore.syncStatus);

useDragAndDrop();

onMounted(async () => {
  document.title = 'GameTrack';
  await gameStore.loadGames();
  await platformStore.loadPlatforms();
});

watch(() => gameStore.syncStatus, (newStatus) => {
  console.log('Sync status changed:', newStatus);
}, { deep: true });

// Søgefunktion
function handleSearch(term) {
  searchTerm.value = term;
}

// Generisk funktion til at vise kontekstmenuer
function showContextMenu(menuType, ...args) {
  // Luk eksisterende menuer
  activeEditMenu.value = null;
  activePlatformMenu.value = null;

  // Åbn ny menu
  nextTick(() => {
    if (menuType === 'edit') {
      const [gameId, x, y] = args;
      activeEditMenu.value = { gameId, x, y };
    } else if (menuType === 'platform') {
      const [gameId, platform, x, y] = args;
      activePlatformMenu.value = { gameId, platform, x, y };
    }
  });
}

// Wrapper-funktion for edit menu
function showEditMenu(gameId, x, y) {
  showContextMenu('edit', gameId, x, y);
}

// Wrapper-funktion for platform menu
function showPlatformMenu(gameId, platform, x, y) {
  showContextMenu('platform', gameId, platform, x, y);
}

// Luk alle menus og modaler ved klik udenfor
function handleClickOutside(event) {
  // Håndterer Edit Menu
  if (activeEditMenu.value && !event.target.closest('.edit-menu') && !event.target.classList.contains('edit-btn')) {
    activeEditMenu.value = null;
  }

  // Håndterer Platform Menu
  if (activePlatformMenu.value && !event.target.closest('.platform-tag-menu') && !event.target.classList.contains('platform-pill')) {
    activePlatformMenu.value = null;
  }

  // Håndterer alle modaler
  if (event.target.classList.contains('modal')) {
    // Luk alle modaler
    showAddGameModal.value = false;
    showPlatformModal.value = false;
    showSettingsModal.value = false;
    showImportModal.value = false;
  }
}

// Menu actions
function performEditMenuAction(action, gameId) {
  const game = gameStore.games.find(g => g.id === gameId);
  if (!game) return;

  switch (action) {
    case 'favorite':
      gameStore.toggleFavorite(gameId);
      break;
    case 'edit-date':
      const currentDate = game.completionDate || '';
      const newDate = prompt('Indtast gennemførelsesdato (DD-MM-ÅÅÅÅ):', currentDate);
      if (newDate !== null) {
        gameStore.setCompletionDate(gameId, newDate);
      }
      break;
    case 'today-date':
      gameStore.setTodayAsCompletionDate(gameId);
      break;
    case 'delete':
      if (confirm('Er du sikker på, at du vil slette dette spil?')) {
        gameStore.deleteGame(gameId);
      }
      break;
  }

  activeEditMenu.value = null;
}

// Platform menu action
function changePlatform(gameId, platformId) {
  const platform = platformStore.platforms.find(p => p.id === platformId);
  if (platform) {
    gameStore.changePlatform(gameId, platform);
  }
  activePlatformMenu.value = null;
}

// Tilføj nyt spil
async function addGame() {
  if (!newGameTitle.value || !selectedPlatform.value) return;

  const platform = platformStore.platforms.find(p => p.id === selectedPlatform.value);
  if (!platform) return;

  await gameStore.addGame(newGameTitle.value, platform);

  newGameTitle.value = '';
  selectedPlatform.value = '';
  showAddGameModal.value = false;
}

// Event listeners
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="game-track-app">
    <AppHeader @search="handleSearch" @open-add-game-modal="showAddGameModal = true"
      @open-platform-modal="showPlatformModal = true" @open-settings-modal="showSettingsModal = true"
      @open-import-modal="showImportModal = true" />

    <!-- I HomeView.vue template -->
    <div v-if="gameStore.syncStatus.status !== 'idle'" class="sync-notification" :class="gameStore.syncStatus.status">
      {{ gameStore.syncStatus.message }}
    </div>

    <main id="app">

      <div id="listIndicator"></div>
      <div id="listsContainer">
        <!-- vue/src/views/HomeView.vue (fortsat) -->
        <GameList v-for="status in gameStore.statusList" :key="status.id" :title="status.name" :status="status.id"
          :games="gameStore.gamesByStatus[status.id] || []" :search-term="searchTerm" @edit-menu="showEditMenu"
          @platform-menu="showPlatformMenu" />
      </div>
    </main>

    <AppFooter />

    <!-- Edit Menu -->
    <div v-if="activeEditMenu" class="edit-menu" :style="{
      position: 'fixed',
      left: `${activeEditMenu.x}px`,
      top: `${activeEditMenu.y + 30}px`,
      zIndex: 1000
    }">
      <button class="favorite-btn" @click="performEditMenuAction('favorite', activeEditMenu.gameId)">
        {{gameStore.games.find(g => g.id === activeEditMenu.gameId)?.favorite
          ? 'Fjern favorit'
          : 'Marker som favorit'}}
      </button>
      <button class="edit-date-btn" @click="performEditMenuAction('edit-date', activeEditMenu.gameId)">
        Rediger dato
      </button>
      <button class="today-date-btn" @click="performEditMenuAction('today-date', activeEditMenu.gameId)">
        Dagens dato
      </button>
      <button class="delete-btn" @click="performEditMenuAction('delete', activeEditMenu.gameId)">
        Slet
      </button>
    </div>

    <!-- Platform Menu -->
    <div v-if="activePlatformMenu" class="platform-tag-menu" :style="{
      position: 'fixed',
      left: `${activePlatformMenu.x}px`,
      top: `${activePlatformMenu.y + 30}px`,
      zIndex: 1000
    }">
      <button v-for="platform in platformStore.platforms" :key="platform.id" class="change-platform-btn"
        @click="changePlatform(activePlatformMenu.gameId, platform.id)">
        {{ platform.name }}
      </button>
    </div>

    <!-- Add Game Modal -->
    <div v-if="showAddGameModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showAddGameModal = false">&times;</span>
        <h2>Tilføj nyt spil</h2>
        <form @submit.prevent="addGame" class="game-form">
          <div class="form-group">
            <label for="gameTitle">Spiltitel:</label>
            <input type="text" id="gameTitle" v-model="newGameTitle" required />
          </div>
          <div class="form-group">
            <label for="gamePlatform">Platform:</label>
            <select id="gamePlatform" v-model="selectedPlatform" required>
              <option value="" disabled>Vælg platform</option>
              <option v-for="platform in platformStore.platforms" :key="platform.id" :value="platform.id">
                {{ platform.name }}
              </option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Tilføj Spil</button>
        </form>
      </div>
    </div>

    <!-- Platform Modal -->
    <div v-if="showPlatformModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showPlatformModal = false">&times;</span>
        <h2>Administrer Platforme</h2>
        <PlatformManager @close="showPlatformModal = false" />
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showSettingsModal = false">&times;</span>
        <h2>Indstillinger</h2>
        <SettingsManager @close="showSettingsModal = false" />
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showImportModal = false">&times;</span>
        <h2>Importér spilliste</h2>
        <ImportManager @close="showImportModal = false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  padding: 2rem;
  padding-top: 1rem;
  min-height: calc(100vh - 60px - 3rem);
}

#listsContainer {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
}

/* Edit Menu og Platform Menu styling */
.edit-menu,
.platform-tag-menu {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  padding: 5px;
  box-shadow: var(--shadow);
  z-index: 1000;
  width: 160px;
  max-width: calc(100% - 20px);
}

.edit-menu button,
.platform-tag-menu button {
  display: block;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9em;
}

.edit-menu button:hover,
.platform-tag-menu button:hover {
  background-color: var(--list-bg);
}

/* Modal styling */
.modal {
  display: block;
  position: fixed;
  z-index: 1001;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
}

.modal-content {
  background-color: var(--list-bg);
  margin: 15% auto;
  padding: 20px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  width: 80%;
  max-width: 500px;
  box-shadow: var(--shadow);
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover,
.close:focus {
  color: var(--text-color);
  text-decoration: none;
  cursor: pointer;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--card-border);
  border-radius: 4px;
  background-color: var(--card-bg);
  color: var(--text-color);
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-primary {
  background-color: var(--button-bg);
  color: white;
  width: 100%;
}

.btn-primary:hover {
  background-color: var(--button-hover);
}

/* Responsiv design for listerne */
@media (min-width: 769px) {
  #listsContainer {
    display: flex;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  #app {
    padding: 10px;
  }

  #listsContainer {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    justify-content: space-between;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    gap: 1rem;
    width: 100%;
  }

  .modal-content {
    margin: 30% auto 15% auto;
    width: 90%;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .modal-content {
    margin: 40% auto 15% auto;
    padding: 15px;
  }
}

/* sync message */

.sync-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 15px;
  border-radius: 4px;
  background-color: var(--card-bg);
  color: var(--text-color);
  box-shadow: var(--shadow);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.sync-notification.syncing {
  background-color: #2196F3;
  color: white;
}

.sync-notification.success {
  background-color: var(--button-bg);
  color: white;
}

.sync-notification.error {
  background-color: #f44336;
  color: white;
}
</style>