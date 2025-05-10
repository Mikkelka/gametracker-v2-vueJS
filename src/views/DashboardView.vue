<!-- src/views/DashboardView.vue -->
<script setup>
import { onMounted, computed, ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useMediaTypeStore } from '../stores/mediaType';
import { useGameStore } from '../stores/game.store';
import SimplerModal from '../components/ui/SimplerModal.vue';

const router = useRouter();
const userStore = useUserStore();
const mediaTypeStore = useMediaTypeStore();
const gameStore = useGameStore();

// Tilføj state for navn-redigering
const showEditNameModal = ref(false);
const newName = ref('');

// Prøv at få modals via inject hvis tilgængelig
const injectedModals = inject('modals', null);

function navigateTo(type) {
  mediaTypeStore.setMediaType(type);
  router.push({ name: 'home' });
}

// Funktion til at åbne modal og indstille startværdi
function openEditNameModal() {
  newName.value = userStore.displayName || '';
  showEditNameModal.value = true;
}

// Funktion til at opdatere brugernavn
async function updateName() {
  if (newName.value.trim()) {
    await userStore.updateDisplayName(newName.value.trim());
    showEditNameModal.value = false;
  }
}

// Log ud funktion
async function logout() {
  try {
    // Synkroniser først hvis der er ændringer
    await gameStore.syncWithFirebase?.();
    
    // Log ud
    await userStore.logout();
    
    // Naviger til login
    router.push({ name: 'login' });
  } catch (error) {
    console.error('Fejl ved log ud:', error);
  }
}

onMounted(() => {
  document.title = 'Dashboard';
});
</script>

<template>
  <div class="dashboard-page">
    <main class="dashboard-container">
      <h1>Velkommen, {{ userStore.displayName }}</h1>
      <p>Vælg hvilket medie du vil spore:</p>

      <div class="tracker-grid">
        <div class="tracker-card" @click="navigateTo('game')">
          <div class="card-icon">🎮</div>
          <h2>GameTrack</h2>
          <p>Hold styr på dine spil</p>
        </div>

        <div class="tracker-card" @click="navigateTo('movie')">
          <div class="card-icon">🎬</div>
          <h2>MovieTrack</h2>
          <p>Hold styr på dine film</p>
        </div>

        <div class="tracker-card" @click="navigateTo('book')">
          <div class="card-icon">📚</div>
          <h2>BookTrack</h2>
          <p>Hold styr på dine bøger</p>
        </div>
      </div>
      
      <!-- Opdateret log ud sektion med to knapper -->
      <div class="user-actions">
        <button class="edit-name-button" @click="openEditNameModal">
          Rediger navn
        </button>
        <button class="logout-button" @click="logout">
          Log ud
        </button>
      </div>
    </main>

    <!-- Tilføj modal til redigering af navn -->
    <SimplerModal :isOpen="showEditNameModal" title="Rediger navn" @close="showEditNameModal = false">
      <form @submit.prevent="updateName" class="name-form">
        <div class="form-group">
          <label for="displayName">Navn:</label>
          <input type="text" id="displayName" v-model="newName" required />
        </div>
      </form>

      <template #footer>
        <button @click="updateName" class="btn btn-primary">Gem</button>
      </template>
    </SimplerModal>
  </div>
</template>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: calc(100vh);
}

.tracker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.tracker-card {
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: var(--shadow);
}

.tracker-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.3);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.tracker-card h2 {
  margin: 0.5rem 0;
  color: var(--primary-color);
}

.tracker-card p {
  color: var(--text-color);
  opacity: 0.8;
}

/* User actions styling */
.user-actions {
  margin-top: 3rem;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.logout-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.logout-button:hover {
  background-color: #d32f2f;
}

.edit-name-button {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.edit-name-button:hover {
  background-color: #0b7dda;
}

/* Form styling for modal */
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
  min-width: 120px;
}

.btn-primary:hover {
  background-color: var(--button-hover);
}

@media (max-width: 768px) {
  .tracker-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .tracker-card {
    padding: 1rem;
  }

  .card-icon {
    font-size: 2.5rem;
    margin-bottom: 0;
  }

  .tracker-card h2 {
    margin: 0;
  }

  .user-actions {
    margin-top: 2rem;
    margin-bottom: 1rem;
    flex-direction: column;
    align-items: center;
  }

  .edit-name-button,
  .logout-button {
    width: 100%;
    max-width: 200px;
  }
}
</style>