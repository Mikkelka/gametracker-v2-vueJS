<!-- src/views/DashboardView.vue -->
<script setup>
import { onMounted, computed, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useMediaTypeStore } from '../stores/mediaType';


const router = useRouter();
const userStore = useUserStore();
const mediaTypeStore = useMediaTypeStore();

// Prøv at få modals via inject hvis tilgængelig
const injectedModals = inject('modals', null);

function navigateTo(type) {
  mediaTypeStore.setMediaType(type);
  router.push({ name: 'home' });
}

onMounted(() => {
  document.title = 'Dashboard';
});
</script>

<template>
  <div class="dashboard-page">
    <!-- Fjernet AppHeader og AppFooter -->

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
    </main>

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
}
</style>