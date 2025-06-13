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
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-moderate: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-strong: 0 10px 25px rgba(0, 0, 0, 0.2);
  --modal-radius: 16px;

  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(0, 0, 0, 0.4), 
    rgba(0, 0, 0, 0.6)
  );
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: overlayFadeIn 0.3s ease;
}

.modal-container {
  background: linear-gradient(145deg, var(--list-bg), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--modal-radius);
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--shadow-strong);
  backdrop-filter: blur(20px);
  animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.modal-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08), 
    rgba(255, 255, 255, 0.04)
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.modal-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    var(--primary-color), 
    rgba(76, 175, 80, 0.6)
  );
  opacity: 0.8;
  box-shadow: 0 0 8px var(--primary-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.close-button {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  cursor: pointer;
  padding: 0;
  font-size: 1.2rem;
  line-height: 1;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
  opacity: 0.8;
}

.close-button:hover {
  opacity: 1;
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.8), 
    rgba(239, 68, 68, 0.6)
  );
  border-color: rgba(239, 68, 68, 0.3);
  color: white;
  transform: translateY(-1px) scale(1.05);
  box-shadow: var(--shadow-moderate);
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
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.05), 
    rgba(255, 255, 255, 0.02)
  );
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.btn {
  padding: 0.6rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
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
  box-shadow: var(--shadow-subtle);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-moderate);
  filter: brightness(1.1);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, rgba(239, 68, 68, 0.8));
  color: white;
  box-shadow: var(--shadow-subtle);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-moderate);
  filter: brightness(1.1);
}

.btn-secondary {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
  color: var(--text-color);
}

.btn-secondary:hover {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15), 
    rgba(255, 255, 255, 0.08)
  );
  transform: translateY(-1px);
  box-shadow: var(--shadow-subtle);
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .modal-container {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
    --modal-radius: 12px;
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
  .modal-overlay,
  .modal-container,
  .close-button,
  .btn {
    animation: none;
    transition: none;
  }

  .close-button:hover,
  .btn:hover {
    transform: none;
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