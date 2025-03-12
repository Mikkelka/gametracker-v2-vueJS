<!-- vue/src/components/game/GameList.vue -->
<script setup>
import { computed } from 'vue';
import GameCard from './GameCard.vue';
import { useSettingsStore } from '../../stores/settings';

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
  if (props.status === 'upcoming' && !settingsStore.showUpcoming) return false;
  if (props.status === 'paused' && !settingsStore.showPaused) return false;
  if (props.status === 'dropped' && !settingsStore.showDropped) return false;
  return true;
});
</script>

<template>
  <div v-if="shouldShow" class="list" :id="status">
    <h2>{{ title }}</h2>
    
    <template v-if="filteredGames.length > 0">
      <GameCard 
        v-for="game in filteredGames" 
        :key="game.id" 
        :game="game"
        @edit-menu="onEditMenu"
        @platform-menu="onPlatformMenu"
      />
    </template>
    
    <p v-else-if="searchTerm" class="empty-list-message">
      Ingen spil matcher din søgning
    </p>
    
    <p v-else class="empty-list-message">
      Ingen spil i denne liste
    </p>
  </div>
</template>

<style scoped>
.list {
  background-color: var(--list-bg);
  border-radius: 8px;
  padding: 1rem;
  width: 280px;
  box-shadow: var(--shadow);
}

.list h2 {
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--text-color);
  font-size: 1.2rem;
}

.empty-list-message {
  color: var(--text-color);
  opacity: 0.6;
  text-align: center;
  font-style: italic;
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .list {
    flex: 0 0 100%;
    scroll-snap-align: center;
    width: 100%;
    min-width: 280px;
  }
}
</style>