<!-- vue/src/components/game/GameList.vue - Improved version -->
<script setup>
import { computed } from 'vue';
import GameCard from './GameCard.vue';
import { useSettingsStore } from '../../stores/settings';
import { useMediaTypeStore } from '../../stores/mediaType';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  games: {
    type: Array,
    default: () => []
  },
  status: {
    type: String,
    required: true
  },
  searchTerm: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['edit-menu', 'platform-menu']);
const settingsStore = useSettingsStore();
const mediaTypeStore = useMediaTypeStore();

// Filter games baseret på søgning
const filteredGames = computed(() => {
  if (!props.searchTerm) return props.games;

  const searchLower = props.searchTerm.toLowerCase();
  
  // Tjek om vi søger efter favoritter
  const favoriteKeywords = ['favorit', 'favorite', 'fav', 'stjerne', 'star'];
  const isFavoriteSearch = favoriteKeywords.some(keyword => 
    searchLower.includes(keyword)
  );

  return props.games.filter(game => {
    const title = game.title.toLowerCase();
    const platform = game.platform.toLowerCase();
    const isFavorite = game.favorite;

    // Hvis søgningen indeholder 'favorit' eller lignende
    if (isFavoriteSearch) {
      const searchWithoutFavorite = searchLower.replace(
        /favorit|favorite|fav|stjerne|star/g, ''
      ).trim();
      
      // Kun favoritsøgning
      if (!searchWithoutFavorite) {
        return isFavorite;
      }
      
      // Favoritsøgning + andre termer
      return isFavorite && (
        title.includes(searchWithoutFavorite) || 
        platform.includes(searchWithoutFavorite)
      );
    }
    
    // Almindelig søgning
    return title.includes(searchLower) || platform.includes(searchLower);
  });
});

// Show edit menu
function onEditMenu(gameId, x, y) {
  emit('edit-menu', gameId, x, y);
}

// Show platform menu
function onPlatformMenu(gameId, platform, x, y) {
  emit('platform-menu', gameId, platform, x, y);
}

// Beregn om listen skal vises baseret på indstillinger
const shouldShow = computed(() => {
  // Uanset medietype - tjek om statussen skal vises
  if (props.status === 'upcoming' && !settingsStore.showUpcoming) return false;
  if (props.status === 'paused' && !settingsStore.showPaused) return false;
  if (props.status === 'dropped' && !settingsStore.showDropped) return false;
  
  return true;
});

// Beregn status-relaterede egenskaber
const statusConfig = computed(() => {
  const configs = {
    upcoming: { icon: '🔮', color: '#8b5cf6', gradient: 'from-purple-500 to-purple-600' },
    willplay: { icon: '📝', color: '#3b82f6', gradient: 'from-blue-500 to-blue-600' },
    willwatch: { icon: '📝', color: '#3b82f6', gradient: 'from-blue-500 to-blue-600' },
    willread: { icon: '📝', color: '#3b82f6', gradient: 'from-blue-500 to-blue-600' },
    playing: { icon: '🎮', color: '#10b981', gradient: 'from-green-500 to-green-600' },
    watching: { icon: '👀', color: '#10b981', gradient: 'from-green-500 to-green-600' },
    reading: { icon: '📖', color: '#10b981', gradient: 'from-green-500 to-green-600' },
    completed: { icon: '✅', color: '#06b6d4', gradient: 'from-cyan-500 to-cyan-600' },
    paused: { icon: '⏸️', color: '#f59e0b', gradient: 'from-amber-500 to-amber-600' },
    dropped: { icon: '❌', color: '#ef4444', gradient: 'from-red-500 to-red-600' }
  };
  
  return configs[props.status] || { icon: '📱', color: 'var(--primary-color)', gradient: 'from-gray-500 to-gray-600' };
});
</script>

<template>
  <div v-if="shouldShow" class="list game-list" :id="status">
    <!-- Poleret header -->
    <div class="list-header">
      <div class="header-content">
        <div class="header-main">
          <span class="status-icon">{{ statusConfig.icon }}</span>
          <h2 class="list-title">{{ title }}</h2>
        </div>
        <div class="list-count" v-if="filteredGames.length > 0">
          <span class="count-badge">{{ filteredGames.length }}</span>
        </div>
      </div>
      <div class="header-line" :style="{ backgroundColor: statusConfig.color }"></div>
    </div>
    
    <!-- Games container -->
    <div class="games-container">
      <template v-if="filteredGames.length > 0">
        <GameCard 
          v-for="game in filteredGames" 
          :key="game.id" 
          :game="game"
          @edit-menu="onEditMenu"
          @platform-menu="onPlatformMenu"
        />
      </template>
      
      <!-- Empty states -->
      <div v-else-if="searchTerm" class="empty-state search-empty">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">Ingen resultater</p>
        <p class="empty-message">{{ mediaTypeStore.config.noSearchResultsMessage }}</p>
      </div>
      
      <div v-else class="empty-state default-empty">
        <div class="empty-icon">{{ statusConfig.icon }}</div>
        <p class="empty-title">Ingen {{ mediaTypeStore.config.itemNamePlural }}</p>
        <p class="empty-message">{{ mediaTypeStore.config.emptyListMessage }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list.game-list {
  --list-width: 280px;
  --header-height: 60px;
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-moderate: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  background: linear-gradient(145deg, var(--list-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: var(--list-width);
  box-shadow: var(--shadow-subtle);
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: var(--transition-smooth);
  position: relative;
}

.list.game-list::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
}

.list.game-list:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-moderate);
  border-color: rgba(255, 255, 255, 0.15);
}

/* ===== POLERET HEADER ===== */
.list-header {
  position: relative;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08), 
    rgba(255, 255, 255, 0.04)
  );
  padding: 1rem 1.25rem;
  min-height: var(--header-height);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-icon {
  font-size: 1.25rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  animation: subtle-bounce 2s ease-in-out infinite;
}

@keyframes subtle-bounce {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-1px); }
}

.list-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.list-count {
  opacity: 0.8;
}

.count-badge {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  color: var(--text-color);
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-color);
  opacity: 0.8;
  box-shadow: 0 0 8px currentColor;
}

/* ===== GAMES CONTAINER ===== */
.games-container {
  padding: 1rem;
  min-height: 200px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  scroll-behavior: smooth;
}

.games-container::-webkit-scrollbar {
  width: 6px;
}

.games-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.games-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.games-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ===== FORBEDREDE EMPTY STATES ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  min-height: 180px;
  opacity: 0.8;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  opacity: 0.6;
  animation: gentle-float 3s ease-in-out infinite;
}

@keyframes gentle-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}

.empty-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.9;
}

.empty-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color);
  opacity: 0.6;
  line-height: 1.4;
}

.search-empty .empty-icon {
  animation: search-pulse 2s ease-in-out infinite;
}

@keyframes search-pulse {
  0%, 100% { 
    transform: scale(1); 
    opacity: 0.6; 
  }
  50% { 
    transform: scale(1.05); 
    opacity: 0.8; 
  }
}

/* ===== RESPONSIV DESIGN - FORBEDRET FLOW ===== */
@media (max-width: 768px) {
  .list.game-list {
    --list-width: 100%;
    border-radius: 0;
    border-left: none;
    border-right: none;
    scroll-snap-align: center;
    min-height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
  }

  .list-header {
    padding: 1.25rem 1.5rem;
    min-height: 70px;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(20px);
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .header-main {
    gap: 1rem;
  }

  .status-icon {
    font-size: 1.5rem;
  }

  .list-title {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .count-badge {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    border-radius: 16px;
  }

  .games-container {
    flex: 1;
    padding: .5rem;
    max-height: calc(100vh - 150px);
    overflow-y: scroll;
  }

  .empty-state {
    padding: 3rem 2rem;
    min-height: 250px;
  }

  .empty-icon {
    font-size: 3.5rem;
    margin-bottom: 1.5rem;
  }

  .empty-title {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .empty-message {
    font-size: 1rem;
    line-height: 1.5;
  }

  /* Smooth scroll snap på mobil */
  .list.game-list:hover {
    transform: none;
  }
  
  /* Better mobile transitions */
  .list.game-list {
    transition: opacity 0.3s ease;
  }
}

/* ===== TABLET OPTIMIZATION ===== */
@media (min-width: 769px) and (max-width: 1024px) {
  .list.game-list {
    --list-width: 260px;
  }
  
  .list-header {
    padding: 0.875rem 1rem;
  }
}

/* ===== LARGE SCREEN OPTIMIZATION ===== */
@media (min-width: 1400px) {
  .list.game-list {
    --list-width: 300px;
  }
  
  .list-header {
    padding: 1.25rem 1.5rem;
  }
  
  .games-container {
    overflow-y: scroll;
  }
}

/* ===== HOVER INTERACTIONS ===== */
@media (hover: hover) {
  .count-badge:hover {
    background: linear-gradient(135deg, 
      rgba(255, 255, 255, 0.2), 
      rgba(255, 255, 255, 0.12)
    );
    transform: scale(1.05);
  }
}

/* ===== PREFERS REDUCED MOTION ===== */
@media (prefers-reduced-motion: reduce) {
  .list.game-list,
  .status-icon,
  .empty-icon,
  .count-badge {
    animation: none;
    transition: none;
  }
  
  .list.game-list:hover {
    transform: none;
  }
}
</style>