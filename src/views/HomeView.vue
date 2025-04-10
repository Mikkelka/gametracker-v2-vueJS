<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useMediaTypeStore } from '../stores/mediaType';
import { useGameStore } from '../stores/game.store';
import { useCategoryStore } from '../stores/category';
import { useDragAndDrop } from '../composables/useDragAndDrop';
import AppHeader from '../components/layout/AppHeader.vue';
import AppFooter from '../components/layout/AppFooter.vue';
import GameList from '../components/game/GameList.vue';
import PlatformManager from '../components/platform/PlatformManager.vue';
import SettingsManager from '../components/settings/SettingsManager.vue';
import ImportManager from '../components/game/ImportManager.vue';
import Modal from '../components/ui/Modal.vue';
import { computed } from 'vue';
import { watch } from 'vue';


const mediaTypeStore = useMediaTypeStore();
const gameStore = useGameStore();
const categoryStore = useCategoryStore();
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
const moveMode = ref(null);
const cardToMove = ref(null);

useDragAndDrop();

onMounted(async () => {
  document.title = mediaTypeStore.config.name;
  await gameStore.loadGames();
  await categoryStore.loadPlatforms();
});

watch(() => gameStore.syncStatus, (newStatus) => {
  console.log('Sync status changed:', newStatus);
}, { deep: true });

// Søgefunktion
function handleSearch(term) {
  searchTerm.value = term;
}

// Generisk funktion til at vise kontekstmenuer
function showContextMenu(menuType, gameId, x, y, element) {
  // Luk eksisterende menuer
  activeEditMenu.value = null;
  activePlatformMenu.value = null;

  // Åbn ny menu
  nextTick(() => {
    if (menuType === 'edit') {
      activeEditMenu.value = { gameId, x, y, element };
    } else if (menuType === 'platform') {
      activePlatformMenu.value = { gameId, platform: x, x: y, y: element };
    }
  });
}

// Wrapper-funktion for edit menu
function showEditMenu(gameId, x, y, element) {
  showContextMenu('edit', gameId, x, y, element);
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

  if (cardToMove.value &&
    !event.target.closest('.move-arrows') &&
    !event.target.classList.contains('move-btn')) {
    disableMoveMode();
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
    case 'edit-title':
      const gameToEdit = gameStore.games.find(g => g.id === gameId);
      const currentTitle = game.title || '';
      const newTitle = prompt('Indtast ny titel:', currentTitle);
      if (newTitle !== null && newTitle.trim() !== '') {
        gameStore.updateGameTitle(gameId, newTitle);
      }
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
    case 'move':
      toggleMoveMode(gameId);
      break;
    case 'delete':
      if (confirm('Er du sikker på, at du vil slette dette spil?')) {
        gameStore.deleteGame(gameId);
      }
      break;
  }

  // Luk kun menuen hvis vi ikke går i flyttilstand
  if (action !== 'move') {
    activeEditMenu.value = null;
  }
}

// Implementér toggleMoveMode funktionen
function toggleMoveMode(gameId) {
  if (cardToMove.value === gameId) {
    // Deaktiver flyttilstand
    disableMoveMode();
  } else {
    // Aktiver flyttilstand for dette kort
    cardToMove.value = gameId;
    activeEditMenu.value = null;

    // Fremhæv det kort der skal flyttes og vis pile på alle andre kort
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      if (card.dataset.id === gameId) {
        card.classList.add('card-to-move');
      } else {
        const arrows = card.querySelector('.move-arrows');
        if (arrows) {
          arrows.style.display = 'flex';

          // Tilføj event listeners til pilene
          const upBtn = arrows.querySelector('.move-up');
          const downBtn = arrows.querySelector('.move-down');

          if (upBtn) {
            upBtn.onclick = (e) => {
              e.stopPropagation();
              moveCardRelative(gameId, card.dataset.id, 'before');
            };
          }
          if (downBtn) {
            downBtn.onclick = (e) => {
              e.stopPropagation();
              moveCardRelative(gameId, card.dataset.id, 'after');
            };
          }
        }
      }
    });
  }
}

function disableMoveMode() {
  cardToMove.value = null;

  // Fjern markeringer og skjul pile på alle kort
  document.querySelectorAll('.card').forEach(card => {
    card.classList.remove('card-to-move');
    const arrows = card.querySelector('.move-arrows');
    if (arrows) {
      arrows.style.display = 'none';
    }
  });
}


// Implementér moveCardRelative funktionen for at flytte et kort relativt til et andet
async function moveCardRelative(sourceGameId, targetGameId, position) {
  const sourceGame = gameStore.games.find(g => g.id === sourceGameId);
  const targetGame = gameStore.games.find(g => g.id === targetGameId);

  if (!sourceGame || !targetGame) return;

  // Hvis vi flytter til en anden liste, brug moveGameToStatus
  if (sourceGame.status !== targetGame.status) {
    const specificPosition = position === 'before' ?
      targetGame.order - 0.5 :
      targetGame.order + 0.5;

    await gameStore.moveGameToStatus(sourceGameId, targetGame.status, specificPosition);
  } else {
    // Ellers opdater rækkefølgen inden for den samme liste
    // Find alle spil i samme status-liste
    const gamesInSameList = gameStore.games
      .filter(g => g.status === targetGame.status)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Beregn ny ordre
    let newOrder;
    if (position === 'before') {
      newOrder = targetGame.order - 0.5;
    } else {
      newOrder = targetGame.order + 0.5;
    }

    // Opret array til updateGameOrder
    const updatedGame = {
      id: sourceGameId,
      order: newOrder,
      status: targetGame.status
    };

    await gameStore.updateGameOrder([updatedGame]);
  }

  // Deaktiver flyttilstand
  disableMoveMode();
}

// Implementér moveCard funktionen
async function moveCard(gameId, direction) {
  const game = gameStore.games.find(g => g.id === gameId);
  if (!game) return;

  // Find alle spil i samme status-liste
  const gamesInSameList = gameStore.games
    .filter(g => g.status === game.status)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Find indeks for det aktuelle spil
  const currentIndex = gamesInSameList.findIndex(g => g.id === gameId);

  // Beregn nyt indeks
  let newIndex;
  if (direction === 'up' && currentIndex > 0) {
    newIndex = currentIndex - 1;
  } else if (direction === 'down' && currentIndex < gamesInSameList.length - 1) {
    newIndex = currentIndex + 1;
  } else {
    return; // Kan ikke flytte længere op/ned
  }

  // Byt orden for de to spil
  const gameToSwapWith = gamesInSameList[newIndex];
  const tempOrder = game.order;

  // Opret array med opdaterede spil til gameStore.updateGameOrder
  const updatedGames = [
    { id: game.id, order: gameToSwapWith.order, status: game.status },
    { id: gameToSwapWith.id, order: tempOrder, status: gameToSwapWith.status }
  ];

  // Opdater rækkefølgen
  await gameStore.updateGameOrder(updatedGames);
}

// Platform menu action
function changePlatform(gameId, platformId) {
  const platform = categoryStore.categories.find(p => p.id === platformId);
  if (platform) {
    gameStore.changePlatform(gameId, platform);
  }
  activePlatformMenu.value = null;
}

// Tilføj nyt spil
async function addGame() {
  if (!newGameTitle.value || !selectedPlatform.value) return;

  // Skift fra .categories til .platforms
  const platform = categoryStore.platforms.find(p => p.id === selectedPlatform.value);
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
        <!-- Brug statusList fra mediaTypeStore -->
        <GameList v-for="status in mediaTypeStore.config.statusList" :key="status.id" :title="status.name"
          :status="status.id" :games="gameStore.gamesByStatus[status.id] || []" :search-term="searchTerm"
          @edit-menu="showEditMenu" @platform-menu="showPlatformMenu" />
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
      <button class="edit-title-btn" @click="performEditMenuAction('edit-title', activeEditMenu.gameId)">
        Rediger titel
      </button>
      <button class="edit-date-btn" @click="performEditMenuAction('edit-date', activeEditMenu.gameId)">
        Rediger dato
      </button>
      <button class="today-date-btn" @click="performEditMenuAction('today-date', activeEditMenu.gameId)">
        Dagens dato
      </button>
      <button class="move-btn" @click="performEditMenuAction('move', activeEditMenu.gameId)">
        Flyt kort
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
      <button v-for="platform in categoryStore.categories" :key="platform.id" class="change-platform-btn"
        @click="changePlatform(activePlatformMenu.gameId, platform.id)">
        {{ platform.name }}
      </button>
    </div>

    <!-- Modaler med det nye Modal-komponent -->
    <!-- Add Game Modal -->
    <Modal :isOpen="showAddGameModal" :title="`Tilføj nyt ${mediaTypeStore.config.itemName}`" @close="showAddGameModal = false">
  <form @submit.prevent="addGame" class="game-form">
    <div class="form-group">
      <label :for="mediaTypeStore.config.itemName + 'Title'">{{ mediaTypeStore.config.itemName }}-titel:</label>
      <input type="text" :id="mediaTypeStore.config.itemName + 'Title'" v-model="newGameTitle" required />
    </div>
    <div class="form-group">
      <label :for="mediaTypeStore.config.itemName + 'Platform'">{{ mediaTypeStore.config.categoryName }}:</label>
      <select :id="mediaTypeStore.config.itemName + 'Platform'" v-model="selectedPlatform" required>
  <option value="" disabled>Vælg {{ mediaTypeStore.config.categoryName.toLowerCase() }}</option>
  <option v-for="platform in categoryStore.platforms" :key="platform.id" :value="platform.id">
    {{ platform.name }}
  </option>
</select>
    </div>
  </form>

  <div slot="footer">
    <button @click="addGame" class="btn btn-primary">{{ mediaTypeStore.config.addButtonText }}</button>
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
    padding: 0px;
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

  .edit-menu,
  .platform-tag-menu {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 12px 12px 0 0;
    padding: 15px 0;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
  }

  .edit-menu button,
  .platform-tag-menu button {
    padding: 12px 20px;
    font-size: 16px;
    border-bottom: 1px solid var(--card-border);
  }

  .edit-menu button:last-child,
  .platform-tag-menu button:last-child {
    border-bottom: none;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
  }

}


/* Styling for kort der er valgt til flytning */
.card.card-to-move {
  border: 2px dashed var(--button-bg);
  background-color: rgba(76, 175, 80, 0.1);
  transform: scale(0.98);
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.2);
}

/* Opdater styling for pile */
.move-arrows {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: none;
  /* Skjult som standard */
  gap: 5px;
  z-index: 5;
}

.move-btn {
  display: none !important;
}

.move-up,
.move-down {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  font-size: 18px;
  box-shadow: var(--shadow);
}

.move-up:hover,
.move-down:hover {
  background-color: var(--button-bg);
  color: white;
}

@media (max-width: 768px) {

  .move-btn {
    display: block !important;
  }

  .move-arrows {
    right: 5px;
    bottom: 5px;
  }

  .move-up,
  .move-down {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }
}
</style>