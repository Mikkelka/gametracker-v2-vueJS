<!-- vue/src/views/StatisticsView.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { useGameStore } from '../stores/game.store';
import AppHeader from '../components/layout/AppHeader.vue';
import AppFooter from '../components/layout/AppFooter.vue';

const gameStore = useGameStore();
const isLoading = ref(true);
const stats = ref({
  totalGames: 0,
  totalCompleted: 0,
  totalPlaying: 0,
  totalWillPlay: 0,
  totalDropped: 0,
  totalPaused: 0,
  totalUpcoming: 0,
  favoriteGames: 0,
  platformStats: []
});

// Beregn statistik
function calculateStats() {
  isLoading.value = true;
  
  if (!gameStore.games.length) {
    isLoading.value = false;
    return;
  }
  
  // Grundlæggende statistik
  stats.value.totalGames = gameStore.games.length;
  stats.value.totalCompleted = gameStore.games.filter(g => g.status === 'completed').length;
  stats.value.totalPlaying = gameStore.games.filter(g => g.status === 'playing').length;
  stats.value.totalWillPlay = gameStore.games.filter(g => g.status === 'willplay').length;
  stats.value.totalDropped = gameStore.games.filter(g => g.status === 'dropped').length;
  stats.value.totalPaused = gameStore.games.filter(g => g.status === 'paused').length;
  stats.value.totalUpcoming = gameStore.games.filter(g => g.status === 'upcoming').length;
  stats.value.favoriteGames = gameStore.games.filter(g => g.favorite).length;
  
  // Platform statistik
  const platforms = {};
  gameStore.games.forEach(game => {
    if (!platforms[game.platform]) {
      platforms[game.platform] = {
        name: game.platform,
        color: game.platformColor,
        count: 0,
        completed: 0
      };
    }
    
    platforms[game.platform].count++;
    
    if (game.status === 'completed') {
      platforms[game.platform].completed++;
    }
  });
  
  stats.value.platformStats = Object.values(platforms)
    .sort((a, b) => b.count - a.count);
    
  isLoading.value = false;
}

onMounted(async () => {
  document.title = 'GameTrack - Statistik';
  
  // Indlæs spil hvis nødvendigt
  if (!gameStore.games.length) {
    await gameStore.loadGames();
  }
  
  calculateStats();
});
</script>

<template>
  <div class="statistics-page">
    <AppHeader />
    
    <div class="stats-container">
      <h1>Statistik</h1>
      
      <div v-if="isLoading" class="loading">
        Indlæser statistik...
      </div>
      
      <div v-else class="stats-content">
        <div class="stats-summary">
          <div class="stat-box">
            <h3>Total Spil</h3>
            <p class="stat-value">{{ stats.totalGames }}</p>
          </div>
          
          <div class="stat-box">
            <h3>Gennemført</h3>
            <p class="stat-value">{{ stats.totalCompleted }}</p>
            <p class="stat-percent" v-if="stats.totalGames > 0">
              {{ Math.round((stats.totalCompleted / stats.totalGames) * 100) }}%
            </p>
          </div>
          
          <div class="stat-box">
            <h3>Spiller Nu</h3>
            <p class="stat-value">{{ stats.totalPlaying }}</p>
          </div>
          
          <div class="stat-box">
            <h3>Vil Spille</h3>
            <p class="stat-value">{{ stats.totalWillPlay }}</p>
          </div>
          
          <div class="stat-box">
            <h3>Favoritter</h3>
            <p class="stat-value">{{ stats.favoriteGames }}</p>
          </div>
        </div>
        
        <h2>Platform Fordeling</h2>
        <div class="platform-stats">
          <div 
            v-for="platform in stats.platformStats" 
            :key="platform.name"
            class="platform-stat"
          >
            <div class="platform-header">
              <span 
                class="platform-color" 
                :style="{ backgroundColor: platform.color }"
              ></span>
              <h3>{{ platform.name }}</h3>
              <span class="platform-count">{{ platform.count }}</span>
            </div>
            <div class="platform-progress">
              <div 
                class="progress-bar" 
                :style="{ 
                  width: `${(platform.completed / platform.count) * 100}%`,
                  backgroundColor: platform.color 
                }"
              ></div>
              <span class="progress-text">
                {{ platform.completed }} gennemført ({{ Math.round((platform.completed / platform.count) * 100) }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <AppFooter />
  </div>
</template>

<style scoped>
.stats-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-box {
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  box-shadow: var(--shadow);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.stat-percent {
  font-size: 1rem;
  color: var(--button-bg);
}

h2 {
  margin: 1.5rem 0 1rem;
}

.platform-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.platform-stat {
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: var(--shadow);
}

.platform-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.platform-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.platform-count {
  margin-left: auto;
  font-weight: bold;
}

.platform-progress {
  height: 20px;
  background-color: var(--list-bg);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
}

.progress-text {
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.7);
  color: white;
}

.loading {
  text-align: center;
  margin: 3rem 0;
  font-style: italic;
  color: var(--text-color);
  opacity: 0.7;
}

@media (max-width: 768px) {
  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>