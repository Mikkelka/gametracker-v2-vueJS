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
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-moderate: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-strong: 0 10px 25px rgba(0, 0, 0, 0.2);
  --card-radius: 16px;
  
  min-height: 100vh;
  background: linear-gradient(135deg, 
    var(--bg-color), 
    rgba(255, 255, 255, 0.02)
  );
  position: relative;
}

.dashboard-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(76, 175, 80, 0.03) 0%, transparent 50%);
  pointer-events: none;
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
  background: linear-gradient(135deg, var(--text-color), rgba(255, 255, 255, 0.8));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  background: linear-gradient(145deg, var(--card-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--card-radius);
  padding: 2.5rem;
  text-align: center;
  cursor: pointer;
  transition: var(--transition-spring);
  box-shadow: var(--shadow-moderate);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
}

.tracker-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tracker-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease;
  pointer-events: none;
}

.tracker-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--shadow-strong);
  border-color: rgba(255, 255, 255, 0.25);
}

.tracker-card:hover::before {
  opacity: 1;
}

.tracker-card:hover::after {
  left: 100%;
}

.card-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  animation: gentle-float 6s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

@keyframes gentle-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(1deg); }
  50% { transform: translateY(-6px) rotate(0deg); }
  75% { transform: translateY(-3px) rotate(-1deg); }
}

.tracker-card h2 {
  margin: 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), rgba(76, 175, 80, 0.8));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 2;
}

.tracker-card p {
  color: var(--text-color);
  opacity: 0.8;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
  position: relative;
  z-index: 2;
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
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  min-width: 140px;
}

.logout-button::before,
.edit-name-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.logout-button:hover::before,
.edit-name-button:hover::before {
  left: 100%;
}

.edit-name-button {
  background: linear-gradient(135deg, var(--primary-color), rgba(76, 175, 80, 0.8));
  color: white;
  box-shadow: var(--shadow-subtle);
}

.edit-name-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-moderate);
  filter: brightness(1.1);
}

.logout-button {
  background: linear-gradient(135deg, #ef4444, rgba(239, 68, 68, 0.8));
  color: white;
  box-shadow: var(--shadow-subtle);
}

.logout-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-moderate);
  filter: brightness(1.1);
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
  border-radius: 10px;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  color: var(--text-color);
  font-size: 0.95rem;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-subtle);
}

.form-group input[type="text"]::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: var(--primary-color);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  box-shadow: 
    var(--shadow-moderate),
    0 0 0 2px rgba(76, 175, 80, 0.2);
  transform: translateY(-1px);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.25px;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), rgba(76, 175, 80, 0.8));
  color: white;
  min-width: 140px;
  box-shadow: var(--shadow-subtle);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-moderate);
  filter: brightness(1.1);
}

/* Version styling */
.version {
  margin-top: 3rem;
  margin-bottom: 2rem;
  text-align: center;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 0.75rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.8;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-subtle);
  max-width: 120px;
  margin-left: auto;
  margin-right: auto;
  letter-spacing: 0.5px;
  transition: var(--transition-smooth);
}

.version:hover {
  opacity: 1;
  transform: translateY(-1px);
  box-shadow: var(--shadow-moderate);
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
    border-radius: 12px;
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
  .dashboard-page,
  .tracker-card,
  .card-icon,
  .edit-name-button,
  .logout-button,
  .btn,
  .version,
  .form-group input {
    animation: none;
    transition: none;
  }
  
  .tracker-card:hover,
  .edit-name-button:hover,
  .logout-button:hover,
  .btn:hover,
  .version:hover,
  .form-group input:focus {
    transform: none;
  }
  
  .tracker-card::after,
  .edit-name-button::before,
  .logout-button::before,
  .btn::before {
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
  
  .tracker-card h2 {
    color: var(--text-color);
    background: none;
    -webkit-text-fill-color: unset;
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