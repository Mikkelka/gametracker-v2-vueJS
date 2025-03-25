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
import Modal from '../components/ui/Modal.vue'; // Importér Modal-komponenten
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

// Luk alle menus ved klik udenfor
function handleClickOutside(event) {
  // Håndterer Edit Menu
  if (activeEditMenu.value && !event.target.closest('.edit-menu') && !event.target.classList.contains('edit-btn')) {
    activeEditMenu.value = null;
  }

  // Håndterer Platform Menu
  if (activePlatformMenu.value && !event.target.closest('.platform-tag-menu') && !event.target.classList.contains('platform-pill')) {
    activePlatformMenu.value = null;
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

    <!-- Sync notification -->
    <div v-if="gameStore.syncStatus.status !== 'idle'" class="sync-notification" :class="gameStore.syncStatus.status">
      {{ gameStore.syncStatus.message }}
    </div>

    <main id="app">
      <div id="listIndicator"></div>
      <div id="listsContainer">
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

    <!-- Modaler med det nye Modal-komponent -->
    <!-- Add Game Modal -->
    <Modal :isOpen="showAddGameModal" title="Tilføj nyt spil" @close="showAddGameModal = false">
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
      </form>
      
      <div slot="footer">
        <button @click="addGame" class="btn btn-primary">Tilføj Spil</button>
      </div>
    </Modal>

    <!-- Platform Modal -->
    <Modal :isOpen="showPlatformModal" title="Administrer Platforme" @close="showPlatformModal = false">
      <PlatformManager @close="showPlatformModal = false" />
    </Modal>

    <!-- Settings Modal -->
    <Modal :isOpen="showSettingsModal" title="Indstillinger" @close="showSettingsModal = false">
      <SettingsManager @close="showSettingsModal = false" />
    </Modal>

    <!-- Import Modal -->
    <Modal :isOpen="showImportModal" title="Importér spilliste" @close="showImportModal = false">
      <ImportManager @close="showImportModal = false" />
    </Modal>
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

/* Form styling */
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
  min-width: 120px;
}

.btn-primary:hover {
  background-color: var(--button-hover);
}

/* Sync notification */
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

/* Responsiv design */
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
}
</style>