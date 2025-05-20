<!-- src/views/HomeView.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, inject } from 'vue';
import { useMediaTypeStore } from '../stores/mediaType';
import { useGameStore } from '../stores/game.store';
import { useCategoryStore } from '../stores/category';
import { useDragAndDrop } from '../composables/useDragAndDrop';
import GameList from '../components/game/GameList.vue';
import PlatformManager from '../components/platform/PlatformManager.vue';
import SettingsManager from '../components/settings/SettingsManager.vue';
import { computed } from 'vue';
import { watch } from 'vue';
import SimplerModal from '../components/ui/SimplerModal.vue';

const mediaTypeStore = useMediaTypeStore();
const gameStore = useGameStore();
const categoryStore = useCategoryStore();
const searchTerm = ref('');
const platformButtonRef = ref(null);

const activeEditMenu = ref(null);
const activePlatformMenu = ref(null);
const newGameTitle = ref('');
const selectedPlatform = ref('');
const syncStatusDisplay = computed(() => gameStore.syncStatus);
const moveMode = ref(null);
const cardToMove = ref(null);

// Modtag modalt-state fra props eller brug inject
const props = defineProps({
  showAddGameModal: Boolean,
  showPlatformModal: Boolean,
  showSettingsModal: Boolean
});

const emit = defineEmits([
  'update:show-add-game-modal',
  'update:show-platform-modal',
  'update:show-settings-modal'
]);

// Bruges til at tracke om props er blevet opdateret
const localShowAddGameModal = ref(props.showAddGameModal || false);
const localShowPlatformModal = ref(props.showPlatformModal || false);
const localShowSettingsModal = ref(props.showSettingsModal || false);

// Forsøg også at få modals via inject hvis tilgængelig
const injectedModals = inject('modals', null);

// Computed properties for at bestemme om modaler skal vises
const showAddGameModal = computed({
  get: () => localShowAddGameModal.value || (injectedModals && injectedModals.showAddGameModal.value) || false,
  set: (value) => {
    localShowAddGameModal.value = value;
    emit('update:show-add-game-modal', value);
    if (injectedModals) injectedModals.showAddGameModal.value = value;
  }
});

const showPlatformModal = computed({
  get: () => localShowPlatformModal.value || (injectedModals && injectedModals.showPlatformModal.value) || false,
  set: (value) => {
    localShowPlatformModal.value = value;
    emit('update:show-platform-modal', value);
    if (injectedModals) injectedModals.showPlatformModal.value = value;
  }
});

const showSettingsModal = computed({
  get: () => localShowSettingsModal.value || (injectedModals && injectedModals.showSettingsModal.value) || false,
  set: (value) => {
    localShowSettingsModal.value = value;
    emit('update:show-settings-modal', value);
    if (injectedModals) injectedModals.showSettingsModal.value = value;
  }
});

const showImportModal = computed({
  get: () => localShowImportModal.value || (injectedModals && injectedModals.showImportModal.value) || false,
  set: (value) => {
    localShowImportModal.value = value;
    emit('update:show-import-modal', value);
    if (injectedModals) injectedModals.showImportModal.value = value;
  }
});

// Lyt efter ændringer i props
watch(() => props.showAddGameModal, (newVal) => {
  localShowAddGameModal.value = newVal;
});

watch(() => props.showPlatformModal, (newVal) => {
  localShowPlatformModal.value = newVal;
});

watch(() => props.showSettingsModal, (newVal) => {
  localShowSettingsModal.value = newVal;
});

watch(() => props.showImportModal, (newVal) => {
  localShowImportModal.value = newVal;
});

const showDeleteConfirmModal = ref(false);
const gameToDelete = ref(null);

const showEditTitleModal = ref(false);
const editingGameId = ref(null);
const editingGameTitle = ref('');

const showEditDateModal = ref(false);
const editingDateGameId = ref(null);
const editingDate = ref('');

useDragAndDrop();

onMounted(async () => {
  document.title = mediaTypeStore.config.name;
  await gameStore.loadGames();
  await categoryStore.loadPlatforms();
  
  // Event listeners - konsolideret til én onMounted hook
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', handleScroll);
  
  // Lyt efter søgninger fra sidebar
  window.addEventListener('app-search', (event) => {
    searchTerm.value = event.detail.term;
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('app-search', () => {});
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
function showPlatformMenu(gameId, platform, x, y, element) {
  platformButtonRef.value = element; 
  showContextMenu('platform', gameId, platform, x, y);
}

function handleScroll() {
  if (activePlatformMenu.value && platformButtonRef.value) {
    const rect = platformButtonRef.value.getBoundingClientRect();
    // Opdater positionen baseret på knappens nye position efter scroll
    activePlatformMenu.value.x = rect.left;
    activePlatformMenu.value.y = rect.top;
  }
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

function saveEditedTitle() {
  if (editingGameTitle.value.trim() !== '') {
    gameStore.updateGameTitle(editingGameId.value, editingGameTitle.value);
    showEditTitleModal.value = false;
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
      editingGameId.value = gameId;
      editingGameTitle.value = gameToEdit.title || '';
      showEditTitleModal.value = true;
      break;
    case 'edit-date':
      const gameToEditDate = gameStore.games.find(g => g.id === gameId);
      editingDateGameId.value = gameId;
      editingDate.value = gameToEditDate.completionDate || '';
      showEditDateModal.value = true;
      break;
    case 'today-date':
      gameStore.setTodayAsCompletionDate(gameId);
      break;
    case 'move':
      toggleMoveMode(gameId);
      break;
    case 'delete':
      // Gem gameId i gameToDelete ref og vis modalen
      gameToDelete.value = gameId;
      showDeleteConfirmModal.value = true;
      break;
  }

  // Luk kun menuen hvis vi ikke går i flyttilstand eller sletning
  if (action !== 'move' && action !== 'delete') {
    activeEditMenu.value = null;
  }
}

function confirmDelete() {
  if (gameToDelete.value) {
    gameStore.deleteGame(gameToDelete.value);
    activeEditMenu.value = null; // Luk også edit-menuen efter sletning
    gameToDelete.value = null;
    showDeleteConfirmModal.value = false;
  }
}

function saveEditedDate() {
  if (editingDateGameId.value) {
    gameStore.setCompletionDate(editingDateGameId.value, editingDate.value);
    showEditDateModal.value = false;
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
  const platform = categoryStore.platforms.find(p => p.id === platformId);
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

function openAddGameModal() {
  showAddGameModal.value = true;
}

function openPlatformModal() {
  showPlatformModal.value = true;
}
</script>

<template>
  <div class="game-track-app">
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
      <button v-for="platform in categoryStore.platforms" :key="platform.id" class="change-platform-btn"
        @click="changePlatform(activePlatformMenu.gameId, platform.id)">
        {{ platform.name }}
      </button>
    </div>

    <SimplerModal :isOpen="showAddGameModal" :title="`Tilføj nyt ${mediaTypeStore.config.itemName}`"
      @close="showAddGameModal = false">
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

      <template #footer>
        <button @click="addGame" class="btn btn-primary">{{ mediaTypeStore.config.addButtonText }}</button>
      </template>
    </SimplerModal>

    <!-- Platform Modal -->
    <SimplerModal :isOpen="showPlatformModal" :title="`Administrer ${mediaTypeStore.config.categoryNamePlural}`" @close="showPlatformModal = false">
      <PlatformManager @close="showPlatformModal = false" />
    </SimplerModal>

    <!-- Settings Modal -->
    <SimplerModal :isOpen="showSettingsModal" title="Indstillinger" @close="showSettingsModal = false">
      <SettingsManager @close="showSettingsModal = false" />
    </SimplerModal>

    <SimplerModal :isOpen="showDeleteConfirmModal" title="Bekræft sletning" @close="showDeleteConfirmModal = false">
      <p>Er du sikker på, at du vil slette denne {{ mediaTypeStore.config.itemName }}?</p>
      <template #footer>
        <button @click="showDeleteConfirmModal = false"
          style="padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; background-color: #444; color: white; margin-right: 8px;">Annuller</button>
        <button @click="confirmDelete"
          style="padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; background-color: #f44336; color: white;">Slet</button>
      </template>
    </SimplerModal>

    <SimplerModal :isOpen="showEditTitleModal" title="Rediger titel" @close="showEditTitleModal = false">
      <form @submit.prevent="saveEditedTitle">
        <div class="form-group">
          <label for="gameTitle">Titel:</label>
          <input type="text" id="gameTitle" v-model="editingGameTitle" required />
        </div>
      </form>

      <template #footer>
        <button @click="saveEditedTitle" class="btn btn-primary">Gem</button>
      </template>
    </SimplerModal>

    <SimplerModal :isOpen="showEditDateModal" :title="mediaTypeStore.config.completionDateLabel" @close="showEditDateModal = false">
      <form @submit.prevent="saveEditedDate">
        <div class="form-group">
          <label for="gameDate">Dato (DD-MM-ÅÅÅÅ):</label>
          <input type="text" id="gameDate" v-model="editingDate" placeholder="DD-MM-ÅÅÅÅ" />
        </div>
      </form>

      <template #footer>
        <button @click="saveEditedDate" class="btn btn-primary">Gem</button>
      </template>
    </SimplerModal>
  </div>
</template>

<style scoped>
#app {
  padding: 1rem;
  padding-top: 1rem;
  /* min-height: calc(100vh); */
}

#listsContainer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
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
  
  .platform-tag-menu {
    position: absolute !important;
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
    max-height: calc(100vh - 60px);
    min-height: calc(100vh - 60px);
    overflow: auto;
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