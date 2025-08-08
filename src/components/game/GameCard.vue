<!-- vue/src/components/game/GameCard.vue - Refined Design -->
<script setup>
import { computed } from 'vue';
import { useGameStore } from '../../stores/game.store';
import { usePlatformStore } from '../../stores/platform';

const props = defineProps({
  game: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['edit-menu', 'platform-menu']);
const _gameStore = useGameStore();
const platformStore = usePlatformStore();

// Computed property der altid henter den aktuelle platformfarve
const platformColor = computed(() => {
  const platform = platformStore.platforms.find(p => p.name === props.game.platform);
  return platform ? platform.color : props.game.platformColor;
});

// Håndter klik på redigeringsknappen
function showEditMenu(event) {
  const rect = event.target.getBoundingClientRect();
  emit('edit-menu', props.game.id, rect.left, rect.top, event.target);
}

// Håndter klik på platform-badge
function showPlatformMenu(event) {
  const rect = event.target.getBoundingClientRect();
  emit('platform-menu', props.game.id, props.game.platform, rect.left, rect.top, event.target);
}
</script>

<template>
  <div 
    class="card" 
    :class="{ 
      'favorite': game.favorite, 
      'has-note': game.hasNote 
    }" 
    :data-id="game.id"
    :data-order="game.order || 0"
    draggable="true"
  >
    <!-- Favorite indicator -->
    <!-- Fjernet - kun kant styling -->

    <!-- Note indicator -->
    <!-- Fjernet - bruger ::after pseudo-element i stedet -->

    <div class="card-content">
      <!-- Header med titel og menu -->
      <div class="card-header">
        <h3 class="game-title">{{ game.title }}</h3>
        <button class="edit-btn" @click="showEditMenu" :data-id="game.id">
          <svg class="menu-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
          </svg>
        </button>
      </div>

      <!-- Details med platform og dato -->
      <div class="card-details">
        <div class="card-meta">
          <span 
            class="platform-pill" 
            :style="{ 
              '--platform-color': platformColor,
              backgroundColor: platformColor 
            }" 
            @click="showPlatformMenu"
            :data-platform-name="game.platform" 
            :data-game-id="game.id"
          >
            <span class="platform-text">{{ game.platform }}</span>
          </span>
          
          <div v-if="game.completionDate" class="completion-date">
            <svg class="calendar-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
            </svg>
            <span class="date-text">{{ game.completionDate }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Move arrows, vises kun i move-mode -->
    <div class="move-arrows" style="display: none;">
      <button class="move-button move-up" aria-label="Flyt op">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M7,14L12,9L17,14H7Z"/>
        </svg>
      </button>
      <button class="move-button move-down" aria-label="Flyt ned">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M7,10L12,15L17,10H7Z"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<style scoped>
.card {
  min-height: 90px;
  
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  cursor: move;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}


.card:hover {
  background: rgba(255, 255, 255, 0.08);
}


/* Favorite styling - minimal */
.card.favorite {
  border-color: #fbbf24;
  border-width: 2px;
}

.card.favorite:hover {
  border-color: #f59e0b;
}

/* Note indicator - minimal */
.card.has-note::after {
  content: '';
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: var(--primary-color);
  border-radius: 50%;
  z-index: 3;
}

/* Card content */
.card-content {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-3);
  gap: var(--space-2);
  position: relative;
  z-index: 10;
}

.game-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  color: var(--text-color);
  flex: 1;
  min-width: 0; /* For text truncation */
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-base);
  color: var(--text-color);
  opacity: 0.6;
  flex-shrink: 0;
  position: relative;
  z-index: 15;
  min-width: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.menu-icon {
  width: 18px;
  height: 18px;
  pointer-events: none;
}

.menu-icon {
  width: 18px;
  height: 18px;
}

/* Card details */
.card-details {
  margin-top: auto;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.platform-pill {
  background: var(--platform-color, var(--primary-color));
  color: white;
  border: none;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-block;
  opacity: 0.9;
  z-index: 10;
}


.platform-pill:hover {
  opacity: 1;
}


.platform-text {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.completion-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-color);
  opacity: 0.7;
  font-size: 0.875rem;
  font-weight: 500;
}

.calendar-icon {
  width: 14px;
  height: 14px;
  opacity: 0.6;
}

.date-text {
  font-variant-numeric: tabular-nums;
}

/* Move arrows */
.move-arrows {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 6px;
  z-index: 5;
}

.move-button {
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  color: var(--text-color);
  transition: all 0.2s ease;
}

.move-button svg {
  width: 16px;
  height: 16px;
}

.move-button:hover {
  background: var(--primary-color);
  color: white;
}

/* Drag states */
.card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.card.drag-over-top {
  border-top: 3px solid var(--primary-color);
  animation: pulse-border 1s ease-in-out infinite;
}

.card.drag-over-bottom {
  border-bottom: 3px solid var(--primary-color);
  animation: pulse-border 1s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { 
    border-color: var(--primary-color);
  }
  50% { 
    border-color: rgba(76, 175, 80, 0.6);
  }
}

/* Move mode styling */
.card.card-to-move {
  border: 2px dashed var(--primary-color);
  background: rgba(76, 175, 80, 0.05);
  opacity: 0.8;
}




/* Mobile optimizations */
@media (max-width: 768px) {
  .card {
    padding: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .move-arrows {
    right: 8px;
    bottom: 8px;
  }
  
  .move-button {
    width: 40px;
    height: 40px;
  }
  
  .move-button svg {
    width: 20px;
    height: 20px;
  }
  
  .game-title {
    font-size: 1rem;
  }
  
  .platform-pill {
    font-size: 0.7rem;
    padding: 0.2rem 0.6rem;
  }
  
  .completion-date {
    font-size: 0.8rem;
  }
}

/* Reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .card,
  .edit-btn,
  .platform-pill,
  .move-button {
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .card {
    border-width: 2px;
  }
  
  .card.favorite {
    border-color: #000;
    background-color: #ffff00;
    color: #000;
  }
}
</style>