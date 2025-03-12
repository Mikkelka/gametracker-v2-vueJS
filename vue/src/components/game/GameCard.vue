<!-- vue/src/components/game/GameCard.vue -->
<script setup>
import { ref } from 'vue';
import { useGameStore } from '../../stores/game';
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

// Håndter klik på redigeringsknappen
function showEditMenu(event) {
  const rect = event.target.getBoundingClientRect();
  emit('edit-menu', props.game.id, rect.left, rect.top);
}

// Håndter klik på platform-badge
function showPlatformMenu(event) {
  const rect = event.target.getBoundingClientRect();
  emit('platform-menu', props.game.id, props.game.platform, rect.left, rect.top);
}
</script>

<template>
  <div 
    class="card" 
    :class="{ favorite: game.favorite }" 
    :data-id="game.id"
    :data-order="game.order || 0"
    draggable="true"
  >
    <div class="card-header">
      <h3>{{ game.title }}</h3>
      <button class="edit-btn" @click="showEditMenu" :data-id="game.id">⋮</button>
    </div>
    <div class="card-details">
      <span 
        class="platform-pill" 
        :style="{ backgroundColor: game.platformColor }" 
        @click="showPlatformMenu"
        :data-platform-name="game.platform" 
        :data-game-id="game.id"
      >
        {{ game.platform }}
      </span>
      <span v-if="game.completionDate" class="completion-date">
        {{ game.completionDate }}
      </span>
    </div>
    <!-- Move arrows, vises kun i move-mode -->
    <div class="move-arrows" style="display: none;">
      <button class="move-up" aria-label="Flyt op">⬆️</button>
      <button class="move-down" aria-label="Flyt ned">⬇️</button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 0.8rem;
  margin-bottom: 0.8rem;
  cursor: move;
  transition: all 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
  position: relative;
  z-index: 1;
}

.card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  z-index: 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card h3 {
  margin: 0 0 5px 0;
  font-size: 1rem;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: var(--text-color);
  padding: 0;
  margin: 0;
  line-height: 1;
  position: relative;
  z-index: 3;
}

.card-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.platform-pill {
  background-color: var(--button-bg);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  text-transform: uppercase;
  cursor: pointer;
  position: relative;
  z-index: 3;
}

.completion-date {
  font-size: 0.9em;
  color: var(--text-color);
  opacity: 0.8;
}

.card.favorite {
  border-color: gold;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.move-arrows {
  position: absolute;
  right: 0%;
  bottom: 5%;
  display: flex;
  flex-direction: row;
}

.move-arrows button {
  background: none;
  border: none;
  font-size: 26px;
  cursor: pointer;
  padding: 0px;
  color: #ffffff;
}

.move-arrows button:hover {
  color: #4caf50;
}

/* Drag and drop styles */
.card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.card.drag-over-top {
  border-top: solid 10px var(--button-bg);
}

.card.drag-over-bottom {
  border-bottom: solid 10px var(--button-bg);
}

</style>