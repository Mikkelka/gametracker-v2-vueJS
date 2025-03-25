<!-- src/components/ui/Modal.vue -->
<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  width: {
    type: String,
    default: '500px'
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);

// Luk modal når man klikker udenfor indholdet
function handleClickOutside(event) {
  if (props.isOpen && props.closeOnClickOutside && event.target.classList.contains('modal-overlay')) {
    emit('close');
  }
}

// Luk modal når man trykker Escape
function handleKeydown(event) {
  if (props.isOpen && event.key === 'Escape') {
    emit('close');
  }
}

// Tilføj/fjern event listeners
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});

// Tilføj/fjern overflow på body for at forhindre scrolling bag modalen
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<template>
  <teleport to="body">
    <div v-if="isOpen" class="modal-overlay fade-in">
      <div class="modal-container" :style="{ maxWidth: width }">
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button class="close-button" @click="$emit('close')" aria-label="Luk">&times;</button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
  box-sizing: border-box;
  overflow-y: auto;
}

.modal-container {
  background-color: var(--list-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  animation: modalFadeIn 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--card-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-color);
  cursor: pointer;
  padding: 0.5rem;
  margin: -0.5rem;
  line-height: 1;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid var(--card-border);
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease;
}

@media (max-width: 768px) {
  .modal-container {
    max-height: 80vh;
  }
}
</style>