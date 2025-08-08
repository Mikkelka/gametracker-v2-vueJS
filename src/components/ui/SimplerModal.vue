<!-- src/components/ui/SimplerModal.vue -->
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
  preventBackdropClose: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'backdrop-click']);

function handleKeydown(event) {
  if (props.isOpen && event.key === 'Escape') {
    emit('close');
  }
}

function handleClickOutside(event) {
  if (props.isOpen && event.target.classList.contains('modal-overlay')) {
    if (props.preventBackdropClose) {
      emit('backdrop-click');
    } else {
      emit('close');
    }
  }
}

// Tilføj/fjern event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
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
    <div v-if="isOpen" class="modal-overlay" @click="handleClickOutside">
      <div class="modal-container" :style="{ maxWidth: width }">
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button class="close-button" @click="$emit('close')">&times;</button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-container {
  background: #1f2937;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
}


.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}


.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color);
  letter-spacing: 0.25px;
}

.close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  cursor: pointer;
  padding: 0;
  font-size: 1.1rem;
  line-height: 1;
  transition: all 0.2s ease;
  opacity: 0.8;
}

.close-button:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.8);
  color: white;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 120px);
  position: relative;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
  padding: 0.75rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  letter-spacing: 0.25px;
}


.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}


/* Mobile responsiveness */
@media (max-width: 768px) {
  .modal-container {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .modal-header {
    padding: 1rem 1.25rem;
  }

  .modal-header h2 {
    font-size: 1.1rem;
  }

  .modal-body {
    padding: 1.25rem;
    max-height: calc(100vh - 140px);
  }

  .modal-footer {
    padding: 1rem 1.25rem;
    flex-direction: column-reverse;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    width: 100%;
    justify-content: center;
  }
}

/* Prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .close-button,
  .btn {
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .modal-container {
    border-width: 2px;
    border-color: var(--text-color);
  }

  .modal-header,
  .modal-footer {
    border-color: var(--text-color);
  }
}
</style>