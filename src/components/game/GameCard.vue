<!-- vue/src/components/game/GameCard.vue - Refined Design -->
<script setup>
import { ref, computed } from 'vue';
import { useGameStore } from '../../stores/game.store';
import { usePlatformStore } from '../../stores/platform';

const props = defineProps({
  game: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['edit-menu', 'platform-menu']);
const gameStore = useGameStore();
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

    <!-- Hover overlay for subtle interaction feedback -->
    <div class="hover-overlay"></div>
  </div>
</template>

<style scoped>
.card {
  --card-radius: 12px;
  --card-padding: 1rem;
  --transition-smooth: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-moderate: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-strong: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  
  position: relative;
  background: linear-gradient(145deg, var(--card-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  margin-bottom: 0.75rem;
  cursor: move;
  transition: var(--transition-smooth);
  box-shadow: var(--shadow-subtle);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: var(--shadow-strong);
  border-color: rgba(255, 255, 255, 0.15);
}

.card:hover::before {
  opacity: 1;
}

/* Favorite styling - kun kant */
.card.favorite {
  border-color: #fbbf24;
  border-width: 2px;
  box-shadow: 
    var(--shadow-moderate),
    0 0 0 1px rgba(251, 191, 36, 0.3),
    0 0 20px rgba(251, 191, 36, 0.15);
}

.card.favorite:hover {
  box-shadow: 
    var(--shadow-strong),
    0 0 0 1px rgba(251, 191, 36, 0.4),
    0 0 25px rgba(251, 191, 36, 0.2);
}

/* Note indicator - subtil hjørne gradient */
.card.has-note::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, var(--primary-color), rgba(76, 175, 80, 0.8));
  border-radius: 16px 0 var(--card-radius) 0;
  border: 2px solid var(--card-bg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 3;
}

/* Card content */
.card-content {
  position: relative;
  z-index: 5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
  position: relative;
  z-index: 10;
}

.game-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-color);
  flex: 1;
  min-width: 0; /* For text truncation */
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
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
  background-color: rgba(255, 255, 255, 0.1);
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
  gap: 0.5rem;
  flex-wrap: wrap;
}

.platform-pill {
  background: var(--platform-color, var(--primary-color));
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: var(--transition-smooth);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  display: inline-block;
  z-index: 10;
}

.platform-pill::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.platform-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  filter: brightness(1.1);
}

.platform-pill:hover::before {
  left: 100%;
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
  border: 1px solid var(--card-border);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  color: var(--text-color);
  transition: var(--transition-smooth);
  box-shadow: var(--shadow-subtle);
  backdrop-filter: blur(10px);
}

.move-button svg {
  width: 16px;
  height: 16px;
}

.move-button:hover {
  background: var(--primary-color);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-moderate);
}

/* Drag states */
.card.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: rotate(2deg) scale(0.95);
  box-shadow: var(--shadow-strong);
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
    box-shadow: var(--shadow-moderate);
  }
  50% { 
    border-color: rgba(76, 175, 80, 0.6);
    box-shadow: var(--shadow-strong), 0 0 0 2px rgba(76, 175, 80, 0.2);
  }
}

/* Move mode styling */
.card.card-to-move {
  border: 2px dashed var(--primary-color);
  background: linear-gradient(145deg, 
    rgba(76, 175, 80, 0.05), 
    rgba(76, 175, 80, 0.02)
  );
  transform: scale(0.98);
  box-shadow: 
    var(--shadow-moderate),
    0 0 0 4px rgba(76, 175, 80, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: move-mode-pulse 2s ease-in-out infinite;
}

@keyframes move-mode-pulse {
  0%, 100% { 
    box-shadow: 
      var(--shadow-moderate),
      0 0 0 4px rgba(76, 175, 80, 0.1);
  }
  50% { 
    box-shadow: 
      var(--shadow-strong),
      0 0 0 6px rgba(76, 175, 80, 0.2);
  }
}

/* Hover overlay for interaction feedback */
.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.05), 
    rgba(255, 255, 255, 0.01)
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: var(--card-radius);
  z-index: 1;
}

.card:hover .hover-overlay {
  opacity: 1;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .card {
    --card-padding: 1rem;
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
  
  .card:hover {
    transform: none;
  }
  
  .card.card-to-move {
    animation: none;
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