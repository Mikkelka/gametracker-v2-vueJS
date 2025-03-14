<!-- vue/src/components/layout/AppHeader.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/user';
import { useGameStore } from '../../stores/game.store';

const props = defineProps({
  showSearchToggle: {
    type: Boolean,
    default: true
  }
});

const userStore = useUserStore();
const gameStore = useGameStore();
const router = useRouter();

const isDropdownOpen = ref(false);
const isSearchActive = ref(false);
const searchInput = ref('');
const showEditNameModal = ref(false);
const newName = ref('');

// Søgefunktionalitet
function clearSearch() {
  searchInput.value = '';
  emit('search', '');
}

// Emit search events når søgefeltet ændres
const emit = defineEmits(['search']);
function handleSearchInput() {
  emit('search', searchInput.value);
}

// Toggle søgefelt på mobil
function toggleSearch() {
  isSearchActive.value = !isSearchActive.value;
  if (isSearchActive.value) {
    // Fokuser på søgefeltet når det vises
    nextTick(() => {
      document.getElementById('searchInput')?.focus();
    });
  }
}

// Toggle dropdown-menu
function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

// Luk dropdown hvis der klikkes udenfor
function handleClickOutside(event) {
  if (isDropdownOpen.value && !event.target.closest('.dropdown')) {
    isDropdownOpen.value = false;
  }
}

// Initier edit name modal
function openEditNameModal() {
  newName.value = userStore.displayName || '';
  showEditNameModal.value = true;
}

// Opdater brugernavn
async function updateName() {
  if (newName.value.trim()) {
    await userStore.updateDisplayName(newName.value.trim());
    showEditNameModal.value = false;
  }
}

// Log ud
async function logout() {
  await gameStore.syncWithFirebase?.();
  await userStore.logout();
  router.push({ name: 'login' });
}

// Event listener for klik udenfor dropdown
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <header>
    <h1>
      <span class="logo-container">
        GameTrack <span class="version">v2.0</span>
      </span>

      <span class="header-separator">|</span>

      <!-- Søgeknap på mobil -->
      <button 
        v-if="showSearchToggle" 
        id="searchToggleBtn" 
        class="search-toggle-btn" 
        aria-label="Vis søgning"
        @click="toggleSearch"
      >
        🔍
      </button>

      <span class="user-name-container" v-if="userStore.isLoggedIn">
        <span id="userNameDisplay">{{ userStore.displayName }}</span>
        <button 
          id="editNameBtn" 
          class="edit-name-btn" 
          title="Rediger navn"
          @click="openEditNameModal"
        >
          ✏️
        </button>
      </span>
    </h1>
    
    <!-- Søgefelt -->
    <div class="search-container" :class="{ active: isSearchActive }">
      <input 
        type="text" 
        id="searchInput" 
        v-model="searchInput"
        @input="handleSearchInput"
        placeholder="Søg efter spil eller 'favorit'" 
        aria-label="Søg efter spil"
      >
      <button 
        id="clearSearchBtn" 
        v-show="searchInput"
        class="clear-search-btn" 
        aria-label="Ryd søgning"
        @click="clearSearch"
      >
        ✕
      </button>
    </div>
    
    <!-- Header knapper -->
    <div class="header-buttons">
      <button id="platformBtn" @click="$emit('openPlatformModal')">Platforme</button>
      <button id="addGameBtn" @click="$emit('openAddGameModal')">Tilføj Spil</button>
      <div class="dropdown">
        <button id="dropdownBtn" class="dropbtn" @click="toggleDropdown">
          Mere {{ isDropdownOpen ? '▲' : '▼' }}
        </button>
        <div id="dropdownContent" class="dropdown-content" :class="{ show: isDropdownOpen }">
          <button id="exportBtn" class="dropdown-btn" @click="gameStore.exportGames()">Eksportér</button>
          <button id="importBtn" class="dropdown-btn" @click="$emit('openImportModal')">Importér</button>
          <button id="settingsBtn" class="dropdown-btn" @click="$emit('openSettingsModal')">Indstillinger</button>
          <button id="logoutBtn" class="dropdown-btn" @click="logout">Log ud</button>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Edit name modal -->
  <div v-if="showEditNameModal" class="modal">
    <div class="modal-content">
      <span class="close" @click="showEditNameModal = false">&times;</span>
      <h2>Rediger dit navn</h2>
      <form @submit.prevent="updateName">
        <div class="form-group">
          <label for="newName">Nyt navn:</label>
          <input type="text" id="newName" v-model="newName" required />
        </div>
        <button type="submit" class="btn btn-primary">Gem</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
header {
  background-color: var(--header-bg);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background-color 0.3s ease;
}

h1 {
  margin: 0;
  font-size: 2rem;
  display: flex;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 1rem;
}

.header-separator {
  margin: 0 15px;
  font-weight: normal;
  color: var(--text-color);
  opacity: 0.5;
}

.version {
  font-size: 0.6em;
  vertical-align: super;
  margin-left: 5px;
  opacity: 0.7;
  font-weight: normal;
}

.user-name-container {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
}

#userNameDisplay {
  font-weight: bold;
  margin: 0 5px;
}

.edit-name-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  color: var(--text-color);
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.edit-name-btn:hover {
  opacity: 1;
}

.search-container {
  display: flex;
  align-items: center;
  position: relative;
  margin: 0 20px;
}

#searchInput {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #444;
  border-radius: 4px;
  background-color: #222;
  color: white;
  font-size: 0.9rem;
}

#searchInput:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-toggle-btn {
  display: none;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
}

/* Dropdown styling */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropbtn {
  background-color: var(--button-bg);
  color: white;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

.dropbtn:hover,
.dropbtn:focus {
  background-color: var(--button-hover);
}

.dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  background-color: var(--card-bg);
  min-width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 5px;
  padding: 5px;
}

.dropdown-content.show {
  display: block;
}

.dropdown-btn {
  color: var(--text-color);
  padding: 10px 15px;
  text-decoration: none;
  display: block;
  background-color: var(--button-bg);
  border: none;
  width: 100%;
  text-align: center;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border-radius: 5px;
  margin-bottom: 5px;
}

.dropdown-btn:last-child {
  margin-bottom: 0;
}

.dropdown-btn:hover {
  background-color: var(--button-hover);
  color: white;
}

#logoutBtn {
  background-color: #f44336;
  color: white;
}

#logoutBtn:hover {
  background-color: #d32f2f;
}

/* Stil for knapper */
#addGameBtn,
#platformBtn {
  padding: 0.8rem 1.5rem;
  background-color: var(--button-bg);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
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

.form-group input[type="text"] {
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

/* Mobile responsiveness */
@media (max-width: 768px) {
  .search-toggle-btn {
    display: block;
    right: 70px;
    top: 15px;
  }

  header {
    flex-wrap: wrap;
    padding: 10px;
  }
  
  h1 {
    font-size: 1.2rem;
  }
  
  .search-container {
    display: none;
    width: 100%;
    margin: 10px 0 0;
    order: 3;
  }
  
  .search-container.active {
    display: flex;
  }
  
  #searchInput {
    width: 100%;
  }
  
  .header-buttons {
    width: 100%;
    margin-top: 10px;
    justify-content: space-between;
  }
  
  #addGameBtn,
  #platformBtn,
  .dropbtn {
    padding: 8px 5px;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }
  
  .header-buttons {
    display: grid;
    grid-template-columns: 40% 40% 20%;
    gap: 8px;
  }
}
</style>