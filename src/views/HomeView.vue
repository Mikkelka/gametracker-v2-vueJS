<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed, defineAsyncComponent, watch } from "vue";
import { useMediaTypeStore } from "../stores/mediaType";
import { useGameStore } from "../stores/game.store";
import { useCategoryStore } from "../stores/category";
import { useDragAndDrop } from "../composables/useDragAndDrop";
import GameList from "../components/game/GameList.vue";
import SimplerModal from "../components/ui/SimplerModal.vue";
// Lazy load heavy components
const PlatformManager = defineAsyncComponent(() => import("../components/platform/PlatformManager.vue"));
const SettingsManager = defineAsyncComponent(() => import("../components/settings/SettingsManager.vue"));

const mediaTypeStore = useMediaTypeStore();
const gameStore = useGameStore();
const categoryStore = useCategoryStore();
const searchTerm = ref("");
const platformButtonRef = ref(null);

// Memory leak prevention
const isComponentDestroyed = ref(false);
const activeEventListeners = new Set();

const activeEditMenu = ref(null);
const activePlatformMenu = ref(null);
const newGameTitle = ref("");
const selectedPlatform = ref("");
const _syncStatusDisplay = computed(() => gameStore.syncStatus);
const _moveMode = ref(null);
const cardToMove = ref(null);

// Note modal state
const showNoteModal = ref(false);
const gameIdWithNote = ref(null);
const noteText = ref("");
const isEditingNote = ref(false);
const editingNoteText = ref("");

// Modtag modalt-state fra props eller brug inject
const props = defineProps({
  showAddGameModal: Boolean,
  showPlatformModal: Boolean,
  showSettingsModal: Boolean,
});

const emit = defineEmits([
  "update:show-add-game-modal",
  "update:show-platform-modal",
  "update:show-settings-modal",
]);

// Use computed properties to reactively follow props
const showAddGameModal = computed(() => props.showAddGameModal);
const showPlatformModal = computed(() => props.showPlatformModal);
const showSettingsModal = computed(() => props.showSettingsModal);

const showDeleteConfirmModal = ref(false);
const gameToDelete = ref(null);

const showEditTitleModal = ref(false);
const editingGameId = ref(null);
const editingGameTitle = ref("");

const showEditDateModal = ref(false);
const editingDateGameId = ref(null);
const editingDate = ref("");

// Initialize drag and drop with memory leak protection
const dragAndDropCleanup = useDragAndDrop();

// Event handler functions - stored in variables for proper cleanup
const handleClickOutside = (event) => {
  if (isComponentDestroyed.value) return;

  // Håndterer Edit Menu
  if (
    activeEditMenu.value &&
    !event.target.closest(".edit-menu") &&
    !event.target.classList.contains("edit-btn")
  ) {
    activeEditMenu.value = null;
  }

  // Håndterer Platform Menu
  if (
    activePlatformMenu.value &&
    !event.target.closest(".platform-tag-menu") &&
    !event.target.classList.contains("platform-pill")
  ) {
    activePlatformMenu.value = null;
  }

  if (
    cardToMove.value &&
    !event.target.closest(".move-arrows") &&
    !event.target.classList.contains("move-btn")
  ) {
    disableMoveMode();
  }
};

const handleScroll = () => {
  if (isComponentDestroyed.value) return;

  if (activePlatformMenu.value && platformButtonRef.value) {
    const rect = platformButtonRef.value.getBoundingClientRect();
    // Opdater positionen baseret på knappens nye position efter scroll
    activePlatformMenu.value.x = rect.left;
    activePlatformMenu.value.y = rect.top;
  }
};

// Lyt efter søgninger fra sidebar - improved with proper cleanup
const handleAppSearch = (event) => {
  if (isComponentDestroyed.value) return;

  searchTerm.value = event.detail.term;
};

// Utility function to add event listener with tracking
function addTrackedEventListener(target, event, handler, options = false) {
  if (isComponentDestroyed.value) return;

  target.addEventListener(event, handler, options);

  // Store cleanup function
  const cleanup = () => target.removeEventListener(event, handler, options);
  activeEventListeners.add(cleanup);

  return cleanup;
}

// Component lifecycle
onMounted(async () => {
  isComponentDestroyed.value = false;

  document.title = mediaTypeStore.config.name;
  await gameStore.loadGames();
  await categoryStore.loadPlatforms();

  // Event listeners - konsolideret til én onMounted hook med proper tracking
  addTrackedEventListener(document, "click", handleClickOutside);
  addTrackedEventListener(window, "scroll", handleScroll);
  addTrackedEventListener(window, "app-search", handleAppSearch);
});

// Comprehensive cleanup function
function cleanup() {
  isComponentDestroyed.value = true;

  // Clean up all tracked event listeners
  activeEventListeners.forEach((cleanupFn) => {
    try {
      cleanupFn();
    } catch (error) {
      console.warn("Error removing event listener:", error);
    }
  });
  activeEventListeners.clear();

  // Clean up drag and drop
  if (dragAndDropCleanup && typeof dragAndDropCleanup.cleanup === "function") {
    dragAndDropCleanup.cleanup();
  }

  // Reset component state
  activeEditMenu.value = null;
  activePlatformMenu.value = null;
  cardToMove.value = null;
}

onBeforeUnmount(() => {
  cleanup();
});

// Emergency cleanup
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanup);
}

// Watch for sync status changes with component state check
watch(
  () => gameStore.syncStatus,
  (newStatus) => {
    if (!isComponentDestroyed.value) {
      console.warn("Sync status changed:", newStatus);
    }
  },
  { deep: true }
);

// Søgefunktion
function _handleSearch(term) {
  if (isComponentDestroyed.value) return;
  searchTerm.value = term;
}

// Generisk funktion til at vise kontekstmenuer
function showContextMenu(menuType, gameId, x, y, element) {
  if (isComponentDestroyed.value) return;

  // Luk eksisterende menuer
  activeEditMenu.value = null;
  activePlatformMenu.value = null;

  // Åbn ny menu
  nextTick(() => {
    if (isComponentDestroyed.value) return;

    if (menuType === "edit") {
      activeEditMenu.value = { gameId, x, y, element };
    } else if (menuType === "platform") {
      activePlatformMenu.value = { gameId, platform: x, x: y, y: element };
    }
  });
}

// Wrapper-funktion for edit menu
function showEditMenu(gameId, x, y, element) {
  showContextMenu("edit", gameId, x, y, element);
}

// Wrapper-funktion for platform menu
function showPlatformMenu(gameId, platform, x, y, element) {
  platformButtonRef.value = element;
  showContextMenu("platform", gameId, platform, x, y);
}

function saveEditedTitle() {
  if (isComponentDestroyed.value) return;

  if (editingGameTitle.value.trim() !== "") {
    gameStore.updateGameTitle(editingGameId.value, editingGameTitle.value);
    showEditTitleModal.value = false;
  }
}

// Menu actions
function performEditMenuAction(action, gameId) {
  if (isComponentDestroyed.value) return;

  const game = gameStore.games.find((g) => g.id === gameId);
  if (!game) return;

  switch (action) {
    case "favorite":
      gameStore.toggleFavorite(gameId);
      break;
    case "note":
      gameIdWithNote.value = gameId;
      loadGameNote(gameId);
      showNoteModal.value = true;
      break;
    case "edit-title": {
      const gameToEdit = gameStore.games.find((g) => g.id === gameId);
      editingGameId.value = gameId;
      editingGameTitle.value = gameToEdit.title || "";
      showEditTitleModal.value = true;
      break;
    }
    case "edit-date": {
      const gameToEditDate = gameStore.games.find((g) => g.id === gameId);
      editingDateGameId.value = gameId;
      editingDate.value = gameToEditDate.completionDate || "";
      showEditDateModal.value = true;
      break;
    }
    case "today-date":
      gameStore.setTodayAsCompletionDate(gameId);
      break;
    case "move":
      toggleMoveMode(gameId);
      break;
    case "delete":
      // Gem gameId i gameToDelete ref og vis modalen
      gameToDelete.value = gameId;
      showDeleteConfirmModal.value = true;
      break;
  }

  // Luk kun menuen hvis vi ikke går i flyttilstand eller sletning
  if (action !== "move" && action !== "delete") {
    activeEditMenu.value = null;
  }
}

// Note funktioner
async function loadGameNote(gameId) {
  try {
    const loadedNote = await gameStore.loadNote(gameId);
    noteText.value = loadedNote || "";
    isEditingNote.value = false;
    editingNoteText.value = "";
  } catch (error) {
    console.error("Error loading note:", error);
    noteText.value = "";
  }
}

function startEditingNote() {
  if (isComponentDestroyed.value) return;

  editingNoteText.value = noteText.value;
  isEditingNote.value = true;
}

function cancelEditingNote() {
  if (isComponentDestroyed.value) return;

  isEditingNote.value = false;
  editingNoteText.value = "";
}

async function saveGameNote() {
  if (isComponentDestroyed.value || !gameIdWithNote.value) return;

  const success = await gameStore.saveNote(
    gameIdWithNote.value,
    editingNoteText.value
  );

  if (success) {
    noteText.value = editingNoteText.value.trim();
    isEditingNote.value = false;
    editingNoteText.value = "";

    // Luk edit menuen hvis den stadig er åben
    activeEditMenu.value = null;
  }
}

async function deleteGameNote() {
  if (isComponentDestroyed.value || !gameIdWithNote.value) return;

  const success = await gameStore.deleteNote(gameIdWithNote.value);

  if (success) {
    noteText.value = "";
    showNoteModal.value = false;
    activeEditMenu.value = null;
  }
}

async function copyNoteToClipboard() {
  if (noteText.value) {
    await gameStore.copyNoteToClipboard(noteText.value);
  }
}

function closeNoteModal() {
  if (isComponentDestroyed.value) return;
  
  showNoteModal.value = false;
  isEditingNote.value = false;
  gameIdWithNote.value = null;
  noteText.value = '';
  editingNoteText.value = '';
}

function confirmDelete() {
  if (isComponentDestroyed.value) return;

  if (gameToDelete.value) {
    gameStore.deleteGame(gameToDelete.value);
    activeEditMenu.value = null; // Luk også edit-menuen efter sletning
    gameToDelete.value = null;
    showDeleteConfirmModal.value = false;
  }
}

function saveEditedDate() {
  if (isComponentDestroyed.value) return;

  if (editingDateGameId.value) {
    gameStore.setCompletionDate(editingDateGameId.value, editingDate.value);
    showEditDateModal.value = false;
  }
}

// Implementér toggleMoveMode funktionen
function toggleMoveMode(gameId) {
  if (isComponentDestroyed.value) return;

  if (cardToMove.value === gameId) {
    // Deaktiver flyttilstand
    disableMoveMode();
  } else {
    // Aktiver flyttilstand for dette kort
    cardToMove.value = gameId;
    activeEditMenu.value = null;

    // Fremhæv det kort der skal flyttes og vis pile på alle andre kort
    const cards = document.querySelectorAll(".card");
    cards.forEach((card) => {
      if (card.dataset.id === gameId) {
        card.classList.add("card-to-move");
      } else {
        const arrows = card.querySelector(".move-arrows");
        if (arrows) {
          arrows.style.display = "flex";

          // Tilføj event listeners til pilene
          const upBtn = arrows.querySelector(".move-up");
          const downBtn = arrows.querySelector(".move-down");

          if (upBtn) {
            upBtn.onclick = (e) => {
              e.stopPropagation();
              moveCardRelative(gameId, card.dataset.id, "before");
            };
          }
          if (downBtn) {
            downBtn.onclick = (e) => {
              e.stopPropagation();
              moveCardRelative(gameId, card.dataset.id, "after");
            };
          }
        }
      }
    });
  }
}

function handleNoteBackdropClick() {
  if (isComponentDestroyed.value) return;
  
  if (isEditingNote.value) {
    const hasChanges = editingNoteText.value.trim() !== noteText.value.trim();
    
    if (hasChanges) {
      if (confirm('Du har usgemte ændringer. Vil du lukke uden at gemme?')) {
        closeNoteModal();
      }
    } else {
      closeNoteModal();
    }
  }
}

function disableMoveMode() {
  if (isComponentDestroyed.value) return;

  cardToMove.value = null;

  // Fjern markeringer og skjul pile på alle kort
  document.querySelectorAll(".card").forEach((card) => {
    card.classList.remove("card-to-move");
    const arrows = card.querySelector(".move-arrows");
    if (arrows) {
      arrows.style.display = "none";
    }
  });
}

// Implementér moveCardRelative funktionen for at flytte et kort relativt til et andet
async function moveCardRelative(sourceGameId, targetGameId, position) {
  if (isComponentDestroyed.value) return;

  const sourceGame = gameStore.games.find((g) => g.id === sourceGameId);
  const targetGame = gameStore.games.find((g) => g.id === targetGameId);

  if (!sourceGame || !targetGame) return;

  // Hvis vi flytter til en anden liste, brug moveGameToStatus
  if (sourceGame.status !== targetGame.status) {
    const specificPosition =
      position === "before" ? targetGame.order - 0.5 : targetGame.order + 0.5;

    await gameStore.moveGameToStatus(
      sourceGameId,
      targetGame.status,
      specificPosition
    );
  } else {
    // Ellers opdater rækkefølgen inden for den samme liste
    // Find alle spil i samme status-liste
    const _gamesInSameList = gameStore.games
      .filter((g) => g.status === targetGame.status)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Beregn ny ordre
    let newOrder;
    if (position === "before") {
      newOrder = targetGame.order - 0.5;
    } else {
      newOrder = targetGame.order + 0.5;
    }

    // Opret array til updateGameOrder
    const updatedGame = {
      id: sourceGameId,
      order: newOrder,
      status: targetGame.status,
    };

    await gameStore.updateGameOrder([updatedGame]);
  }

  // Deaktiver flyttilstand
  disableMoveMode();
}

// Implementér moveCard funktionen
async function _moveCard(gameId, direction) {
  if (isComponentDestroyed.value) return;

  const game = gameStore.games.find((g) => g.id === gameId);
  if (!game) return;

  // Find alle spil i samme status-liste
  const gamesInSameList = gameStore.games
    .filter((g) => g.status === game.status)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Find indeks for det aktuelle spil
  const currentIndex = gamesInSameList.findIndex((g) => g.id === gameId);

  // Beregn nyt indeks
  let newIndex;
  if (direction === "up" && currentIndex > 0) {
    newIndex = currentIndex - 1;
  } else if (
    direction === "down" &&
    currentIndex < gamesInSameList.length - 1
  ) {
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
    { id: gameToSwapWith.id, order: tempOrder, status: gameToSwapWith.status },
  ];

  // Opdater rækkefølgen
  await gameStore.updateGameOrder(updatedGames);
}

// Platform menu action
function changePlatform(gameId, platformId) {
  if (isComponentDestroyed.value) return;

  const platform = categoryStore.platforms.find((p) => p.id === platformId);
  if (platform) {
    gameStore.changePlatform(gameId, platform);
  }
  activePlatformMenu.value = null;
}

// Tilføj nyt spil
async function addGame() {
  if (isComponentDestroyed.value) return;

  if (!newGameTitle.value || !selectedPlatform.value) return;

  // Skift fra .categories til .platforms
  const platform = categoryStore.platforms.find(
    (p) => p.id === selectedPlatform.value
  );
  if (!platform) return;

  await gameStore.addGame(newGameTitle.value, platform);

  newGameTitle.value = "";
  selectedPlatform.value = "";
  emit('update:show-add-game-modal', false);
}

// Modal functions removed - handled through props/events system
</script>

<template>
  <div class="game-track-app">
    <!-- Sync notification -->
    <div
      v-if="gameStore.syncStatus.status !== 'idle'"
      class="sync-notification"
      :class="gameStore.syncStatus.status"
    >
      {{ gameStore.syncStatus.message }}
    </div>

    <main id="app">
      <div id="listIndicator"></div>
      <div id="listsContainer">
        <!-- Brug statusList fra mediaTypeStore -->
        <GameList
          v-for="status in mediaTypeStore.config.statusList"
          :key="status.id"
          :title="status.name"
          :status="status.id"
          :games="gameStore.gamesByStatus[status.id] || []"
          :search-term="searchTerm"
          @edit-menu="showEditMenu"
          @platform-menu="showPlatformMenu"
        />
      </div>
    </main>

    <!-- Edit Menu - Erstat hele din edit-menu sektion med dette -->
    <div
      v-if="activeEditMenu"
      class="edit-menu"
      :style="{
        position: 'fixed',
        left: `${activeEditMenu.x}px`,
        top: `${activeEditMenu.y + 30}px`,
        zIndex: 1000,
      }"
    >
      <!-- Action buttons - favorit og slet øverst -->
      <div class="edit-menu-actions">
        <button
          class="icon-btn favorite-btn"
          :class="{ 'is-favorited': gameStore.games.find(g => g.id === activeEditMenu.gameId)?.favorite }"
          @click="performEditMenuAction('favorite', activeEditMenu.gameId)"
          :title="gameStore.games.find(g => g.id === activeEditMenu.gameId)?.favorite ? 'Fjern favorit' : 'Marker som favorit'"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
        
        <button
          class="icon-btn delete-btn"
          @click="performEditMenuAction('delete', activeEditMenu.gameId)"
          title="Slet"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          </svg>
        </button>
      </div>

      <!-- Regular menu buttons - kun tekst, ingen ikoner -->
      <button
        class="menu-btn note-btn"
        @click="performEditMenuAction('note', activeEditMenu.gameId)"
      >
        {{
          gameStore.games.find((g) => g.id === activeEditMenu.gameId)?.hasNote
            ? "Rediger note"
            : "Tilføj note"
        }}
      </button>
      
      <button
        class="menu-btn edit-title-btn"
        @click="performEditMenuAction('edit-title', activeEditMenu.gameId)"
      >
        Rediger titel
      </button>
      
      <button
        class="menu-btn edit-date-btn"
        @click="performEditMenuAction('edit-date', activeEditMenu.gameId)"
      >
        Rediger dato
      </button>
      
      <button
        class="menu-btn today-date-btn"
        @click="performEditMenuAction('today-date', activeEditMenu.gameId)"
      >
        Dagens dato
      </button>
      
      <button
        class="menu-btn move-btn"
        @click="performEditMenuAction('move', activeEditMenu.gameId)"
      >
        Flyt kort
      </button>
    </div>

    <!-- Platform Menu -->
    <div
      v-if="activePlatformMenu"
      class="platform-tag-menu"
      :style="{
        position: 'fixed',
        left: `${activePlatformMenu.x}px`,
        top: `${activePlatformMenu.y + 30}px`,
        zIndex: 1000,
      }"
    >
      <button
        v-for="platform in categoryStore.platforms"
        :key="platform.id"
        class="change-platform-btn"
        @click="changePlatform(activePlatformMenu.gameId, platform.id)"
      >
        {{ platform.name }}
      </button>
    </div>

    <SimplerModal
      :isOpen="showAddGameModal"
      :title="`Tilføj nyt ${mediaTypeStore.config.itemName}`"
      @close="emit('update:show-add-game-modal', false)"
    >
      <form @submit.prevent="addGame" class="game-form">
        <div class="form-group">
          <label :for="mediaTypeStore.config.itemName + 'Title'"
            >{{ mediaTypeStore.config.itemName }}-titel:</label
          >
          <input
            type="text"
            :id="mediaTypeStore.config.itemName + 'Title'"
            v-model="newGameTitle"
            required
          />
        </div>
        <div class="form-group">
          <label :for="mediaTypeStore.config.itemName + 'Platform'"
            >{{ mediaTypeStore.config.categoryName }}:</label
          >
          <select
            :id="mediaTypeStore.config.itemName + 'Platform'"
            v-model="selectedPlatform"
            required
          >
            <option value="" disabled>
              Vælg {{ mediaTypeStore.config.categoryName.toLowerCase() }}
            </option>
            <option
              v-for="platform in categoryStore.platforms"
              :key="platform.id"
              :value="platform.id"
            >
              {{ platform.name }}
            </option>
          </select>
        </div>
      </form>

      <template #footer>
        <button @click="addGame" class="btn btn-primary">
          {{ mediaTypeStore.config.addButtonText }}
        </button>
      </template>
    </SimplerModal>

    <!-- Platform Modal -->
    <SimplerModal
      :isOpen="showPlatformModal"
      :title="`Administrer ${mediaTypeStore.config.categoryNamePlural}`"
      @close="emit('update:show-platform-modal', false)"
    >
      <PlatformManager @close="emit('update:show-platform-modal', false)" />
    </SimplerModal>

    <!-- Settings Modal -->
    <SimplerModal
      :isOpen="showSettingsModal"
      title="Indstillinger"
      @close="emit('update:show-settings-modal', false)"
    >
      <SettingsManager @close="emit('update:show-settings-modal', false)" />
    </SimplerModal>

    <SimplerModal
      :isOpen="showDeleteConfirmModal"
      title="Bekræft sletning"
      @close="showDeleteConfirmModal = false"
    >
      <p>
        Er du sikker på, at du vil slette denne
        {{ mediaTypeStore.config.itemName }}?
      </p>
      <template #footer>
        <button
          @click="showDeleteConfirmModal = false"
          style="
            padding: 8px 15px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            background-color: #444;
            color: white;
            margin-right: 8px;
          "
        >
          Annuller
        </button>
        <button
          @click="confirmDelete"
          style="
            padding: 8px 15px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            background-color: #f44336;
            color: white;
          "
        >
          Slet
        </button>
      </template>
    </SimplerModal>

    <SimplerModal
      :isOpen="showEditTitleModal"
      title="Rediger titel"
      @close="showEditTitleModal = false"
    >
      <form @submit.prevent="saveEditedTitle">
        <div class="form-group">
          <label for="gameTitle">Titel:</label>
          <input
            type="text"
            id="gameTitle"
            v-model="editingGameTitle"
            required
          />
        </div>
      </form>

      <template #footer>
        <button @click="saveEditedTitle" class="btn btn-primary">Gem</button>
      </template>
    </SimplerModal>

    <SimplerModal
      :isOpen="showEditDateModal"
      :title="mediaTypeStore.config.completionDateLabel"
      @close="showEditDateModal = false"
    >
      <form @submit.prevent="saveEditedDate">
        <div class="form-group">
          <label for="gameDate">Dato (DD-MM-ÅÅÅÅ):</label>
          <input
            type="text"
            id="gameDate"
            v-model="editingDate"
            placeholder="DD-MM-ÅÅÅÅ"
          />
        </div>
      </form>

      <template #footer>
        <button @click="saveEditedDate" class="btn btn-primary">Gem</button>
      </template>
    </SimplerModal>

    <!-- Note Modal -->
    <SimplerModal 
      :isOpen="showNoteModal" 
      title="Note" 
      @close="closeNoteModal"
      @backdrop-click="handleNoteBackdropClick"
      width="700px"
      :preventBackdropClose="isEditingNote"
    >
      <!-- Read mode (default) -->
      <div v-if="!isEditingNote" class="note-read-mode">
        <div v-if="noteText" class="note-content">{{ noteText }}</div>
        <div v-else class="no-note-message">Ingen note endnu...</div>

        <div class="note-actions">
          <button @click="startEditingNote" class="btn btn-primary">
            {{ noteText ? "📝 Rediger note" : "📝 Tilføj note" }}
          </button>
          <button
            v-if="noteText"
            @click="copyNoteToClipboard"
            class="btn btn-secondary btn-icon"
            title="Kopier til udklipsholder"
          >
            📋
          </button>
          <button
            v-if="noteText"
            @click="deleteGameNote"
            class="btn btn-danger btn-icon"
            title="Slet note"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- Edit mode -->
      <div v-else class="note-edit-mode">
        <textarea
          v-model="editingNoteText"
          placeholder="Skriv din note her..."
          class="note-textarea"
          rows="6"
        ></textarea>
      </div>

      <template #footer v-if="isEditingNote">
        <button @click="saveGameNote" class="btn btn-primary">Gem</button>
        <button @click="cancelEditingNote" class="btn btn-secondary">
          Annuller
        </button>
      </template>
    </SimplerModal>
  </div>
</template>

<style scoped>
#app {
  background: #101314;
  min-height: 100vh;
  padding: 0;
}

#listsContainer {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
}

/* ===== EDIT MENU ===== */
.edit-menu {
  background: #1f2937;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 1rem;
  z-index: 1000;
  width: 180px;
  max-width: calc(100% - 20px);
  position: relative;
}


.edit-menu-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.edit-menu .icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}



.edit-menu .icon-btn svg {
  width: 16px;
  height: 16px;
}

.edit-menu .favorite-btn {
  background: #fbbf24;
  color: white;
}

.edit-menu .favorite-btn:hover {
  background: #f59e0b;
}

.edit-menu .favorite-btn.is-favorited {
  background: #f59e0b;
}

.edit-menu .delete-btn {
  background: #ef4444;
  color: white;
}

.edit-menu .delete-btn:hover {
  background: #dc2626;
}

.edit-menu .menu-btn {
  display: flex;
  align-items: center;
  width: 100%;
  height: 44px;
  padding: 0 1rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-color);
  font-size: 0.9rem;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-bottom: 2px;
}



.edit-menu .menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}


.edit-menu .note-btn {
  color: var(--primary-color);
}


.edit-menu .move-btn {
  color: var(--text-color);
}


/* ===== PLATFORM MENU ===== */
.platform-tag-menu {
  background: #1f2937;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px;
  z-index: 1000;
  width: 180px;
  max-width: calc(100% - 20px);
}

.platform-tag-menu button {
  display: block;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: all 0.2s ease;
}

.platform-tag-menu button:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* ===== FORMS ===== */
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
  border-radius: 3px;
  background-color: var(--card-bg);
  color: var(--text-color);
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 3px;
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

/* ===== SYNC NOTIFICATION ===== */
.sync-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 15px;
  border-radius: 3px;
  background-color: var(--card-bg);
  color: var(--text-color);
  box-shadow: var(--shadow);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.sync-notification.syncing {
  background-color: #2196f3;
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

/* ===== MOVE MODE STYLING ===== */
.card.card-to-move {
  border: 2px dashed var(--button-bg);
  background-color: rgba(76, 175, 80, 0.1);
  transform: scale(0.98);
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.2);
}

.move-arrows {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: none;
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
  border-radius: 3px;
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

/* ===== NOTE MODAL STYLING ===== */
.note-read-mode {
  min-height: 200px;
}

.note-content {
  white-space: pre-wrap;
  background-color: var(--list-bg);
  padding: 1.5rem;
  border-radius: 3px;
  margin-bottom: 1.5rem;
  font-family: inherit;
  line-height: 1.6;
  min-height: 400px;
  user-select: text;
  border: 1px solid var(--card-border);
  word-wrap: break-word;
  font-size: 1rem;
}

.no-note-message {
  background-color: var(--list-bg);
  padding: 3rem;
  border-radius: 3px;
  text-align: center;
  color: var(--text-color);
  opacity: 0.6;
  font-style: italic;
  margin-bottom: 1.5rem;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.note-edit-mode {
  min-height: 200px;
}

.note-textarea {
  width: 100%;
  min-height: 250px;
  padding: 1.5rem;
  border: 1px solid var(--card-border);
  border-radius: 3px;
  background-color: var(--card-bg);
  color: var(--text-color);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
}

.note-textarea:focus {
  outline: none;
  border-color: var(--button-bg);
}

.btn-icon {
  padding: 8px 12px;
  font-size: 1.2rem;
  min-width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary {
  background-color: #666;
  color: white;
}

.btn-secondary:hover {
  background-color: #555;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-danger:hover {
  background-color: #d32f2f;
}

/* ===== RESPONSIVE DESIGN ===== */
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
    padding: 0;
    background: #111827;
  }

  #listsContainer {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    justify-content: space-between;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    gap: 0;
    width: 100%;
    max-height: calc(100vh - 60px);
    min-height: calc(100vh - 60px);
    overflow: auto;
    padding: 0;
  }

  .edit-menu {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 0 !important;
    padding: 1.5rem 1rem !important;
  }

  .edit-menu-actions {
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
  }
  
  .edit-menu .icon-btn {
    width: 56px;
    height: 56px;
    border-radius: 6px;
  }
  
  .edit-menu .icon-btn svg {
    width: 24px;
    height: 24px;
  }

  .edit-menu .menu-btn {
    height: 52px;
    padding: 0 1.25rem;
    font-size: 1rem;
    border-radius: 6px;
    margin-bottom: 4px;
    display: flex !important;
    align-items: center !important;
  }

  .platform-tag-menu {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 0;
    padding: 15px 0;
  }

  .platform-tag-menu button {
    padding: 12px 20px;
    font-size: 16px;
    border-bottom: 1px solid var(--card-border);
  }

  .platform-tag-menu button:last-child {
    border-bottom: none;
  }

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

  .note-read-mode {
    min-height: 400px;
  }

  .note-content {
    min-height: 400px;
    padding: 1rem;
  }

  .note-edit-mode {
    min-height: auto;
  }

  .note-textarea {
    min-height: 350px;
    padding: 1rem;
  }

  .no-note-message {
    min-height: 300px;
    padding: 2rem 1rem;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes slideUpMobile {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
}

@media (hover: hover) {
  .edit-menu .menu-btn:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
}
</style>