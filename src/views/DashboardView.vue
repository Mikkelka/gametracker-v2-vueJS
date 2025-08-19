<!-- src/views/DashboardView.vue -->
<script setup>
import { onMounted, ref, inject } from 'vue';
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
const _injectedModals = inject('modals', null);

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

      <div class="version">
        v 3.0.0
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
.dashboard-page {
  min-height: 100vh;
  background: var(--bg-color);
  position: relative;
}


.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem;
  position: relative;
  z-index: 1;
}

.dashboard-container h1 {
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  letter-spacing: -0.5px;
}

.dashboard-container p {
  text-align: center;
  font-size: 1.1rem;
  color: var(--text-color);
  opacity: 0.8;
  margin-bottom: 3rem;
  font-weight: 500;
}

.tracker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.tracker-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 2.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}



.tracker-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}



.card-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}


.tracker-card h2 {
  margin: 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: 0.5px;
}

.tracker-card p {
  color: var(--text-color);
  opacity: 0.8;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
}

/* User actions styling */
.user-actions {
  margin-top: 4rem;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.logout-button,
.edit-name-button {
  padding: 0.875rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
  min-width: 140px;
}



.edit-name-button {
  background: var(--primary-color);
  color: white;
}

.edit-name-button:hover {
  background: #45a049;
}

.logout-button {
  background: #ef4444;
  color: white;
}

.logout-button:hover {
  background: #dc2626;
}

/* Form styling for modal */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color);
  letter-spacing: 0.25px;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-color);
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.form-group input[type="text"]::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.1);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  letter-spacing: 0.25px;
}



.btn-primary {
  background: var(--primary-color);
  color: white;
  min-width: 140px;
}

.btn-primary:hover {
  background: #45a049;
}

/* Version styling */
.version {
  margin-top: 3rem;
  margin-bottom: 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.8;
  max-width: 120px;
  margin-left: auto;
  margin-right: auto;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.version:hover {
  opacity: 1;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 1.5rem;
  }
  
  .dashboard-container h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  
  .dashboard-container p {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .tracker-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .tracker-card {
    padding: 2rem 1.5rem;
    border-radius: 4px;
  }

  .card-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .tracker-card h2 {
    font-size: 1.3rem;
    margin: 0.5rem 0;
  }

  .tracker-card p {
    font-size: 0.9rem;
  }

  .user-actions {
    margin-top: 3rem;
    margin-bottom: 2rem;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .edit-name-button,
  .logout-button {
    width: 100%;
    max-width: 280px;
    padding: 1rem 2rem;
    font-size: 1rem;
  }
  
  .version {
    margin-top: 2rem;
    margin-bottom: 1.5rem;
  }
}

/* Tablet optimizations */
@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard-container {
    padding: 2rem;
  }
  
  .tracker-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .tracker-card {
    padding: 2rem;
  }
}

/* Large screen optimizations */
@media (min-width: 1400px) {
  .dashboard-container {
    max-width: 1400px;
    padding: 3rem;
  }
  
  .tracker-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2.5rem;
  }
  
  .tracker-card {
    padding: 3rem;
  }
  
  .card-icon {
    font-size: 4.5rem;
  }
  
  .tracker-card h2 {
    font-size: 1.75rem;
  }
}

/* Prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .tracker-card,
  .edit-name-button,
  .logout-button,
  .btn,
  .version,
  .form-group input {
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .dashboard-page {
    background: var(--bg-color);
  }
  
  .tracker-card {
    border-width: 2px;
    border-color: var(--text-color);
  }
  
  .edit-name-button,
  .logout-button,
  .btn-primary {
    border-width: 2px;
    background: var(--text-color);
    color: var(--bg-color);
  }
  
  .version {
    border-width: 2px;
    border-color: var(--text-color);
  }
}
</style>