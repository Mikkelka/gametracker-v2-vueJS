// vue/src/composables/useDragAndDrop.js
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useGameStore } from '../stores/game.store';

export function useDragAndDrop() {
  const gameStore = useGameStore();
  
  // State management - brug refs for bedre reactivity control
  const draggedElement = ref(null);
  const draggedGameId = ref(null);
  const scrollInterval = ref(null);
  const isDestroyed = ref(false); // Flag til at forhindre operations efter unmount

  // Cleanup utility
  function clearScrollInterval() {
    if (scrollInterval.value) {
      clearInterval(scrollInterval.value);
      scrollInterval.value = null;
    }
  }

  // Reset drag state
  function resetDragState() {
    if (draggedElement.value) {
      draggedElement.value.style.opacity = '1';
      draggedElement.value.classList.remove('dragging');
      draggedElement.value = null;
    }
    draggedGameId.value = null;
    clearScrollInterval();
    
    // Clean up all visual indicators
    document.querySelectorAll('.card').forEach(card => {
      card.style.borderTop = '';
      card.style.borderBottom = '';
    });
  }

  function handleDragStart(event) {
    // Guard against operations on destroyed component
    if (isDestroyed.value) return;
    
    const card = event.target.closest('.card');
    if (!card) return;

    draggedGameId.value = card.dataset.id;
    draggedElement.value = card;

    try {
      event.dataTransfer.setData('text/plain', draggedGameId.value);
      card.style.opacity = '0.5';
      card.classList.add('dragging');
    } catch (error) {
      console.warn('Drag start error:', error);
      resetDragState();
    }
  }

  function handleDragEnd(event) {
    if (isDestroyed.value) return;
    
    // Always cleanup, even if there are errors
    try {
      resetDragState();
    } catch (error) {
      console.warn('Drag end cleanup error:', error);
      // Force cleanup even if there's an error
      clearScrollInterval();
      draggedElement.value = null;
      draggedGameId.value = null;
    }
  }

  function handleDragOver(event) {
    if (isDestroyed.value) return;
    
    event.preventDefault();

    const dropTarget = event.target.closest('.card') || event.target.closest('.list');
    if (!dropTarget) return;

    // Reset borders på alle kort - wrap in try/catch
    try {
      document.querySelectorAll('.card').forEach(card => {
        if (card !== dropTarget) {
          card.style.borderTop = '';
          card.style.borderBottom = '';
        }
      });

      // Hvis vi er over et kort (ikke hele listen)
      if (dropTarget.classList.contains('card') && dropTarget !== draggedElement.value) {
        const rect = dropTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (event.clientY < midY) {
          dropTarget.style.borderTop = 'solid 4px var(--button-bg)';
          dropTarget.style.borderBottom = '';
        } else {
          dropTarget.style.borderTop = '';
          dropTarget.style.borderBottom = 'solid 4px var(--button-bg)';
        }
      }

      // Auto-scroll håndtering - wrap i try/catch
      handleAutoScroll(event);
    } catch (error) {
      console.warn('Drag over error:', error);
    }
  }

  function handleDragLeave(event) {
    if (isDestroyed.value) return;
    
    try {
      const card = event.target.closest('.card');
      if (card) {
        card.style.borderTop = '';
        card.style.borderBottom = '';
      }
    } catch (error) {
      console.warn('Drag leave error:', error);
    }
  }

  async function handleDrop(event) {
    if (isDestroyed.value) return;
    
    event.preventDefault();
    
    try {
      // Cleanup først - garanterer at der ikke er memory leaks selvom drop fejler
      clearScrollInterval();
      
      // Fjern alle border-indikatorer
      document.querySelectorAll('.card').forEach(card => {
        card.style.borderTop = '';
        card.style.borderBottom = '';
      });
      
      if (!draggedGameId.value) {
        resetDragState();
        return;
      }
      
      const dropTarget = event.target.closest('.card') || event.target.closest('.list');
      if (!dropTarget) {
        resetDragState();
        return;
      }
      
      const list = dropTarget.closest('.list');
      if (!list) {
        resetDragState();
        return;
      }
      
      // Find den nye status
      const newStatus = list.id;
      
      // Find det game-objekt vi flytter
      const game = gameStore.games.find(g => g.id === draggedGameId.value);
      if (!game) {
        resetDragState();
        return;
      }
      
      // Perform the actual move operation
      if (game.status === newStatus && dropTarget.classList.contains('card')) {
        await handleSameListMove(game, dropTarget, event);
      } else if (game.status !== newStatus) {
        await handleDifferentListMove(game, dropTarget, newStatus, event);
      }
      
    } catch (error) {
      console.error('Drop operation error:', error);
      // Vis fejl til brugeren hvis gameStore har error handling
      gameStore.updateSyncStatus?.('error', 'error');
    } finally {
      // Always reset state, even if there was an error
      resetDragState();
    }
  }

  // Udskil kompleks logik i separate funktioner for bedre error handling
  async function handleSameListMove(game, dropTarget, event) {
    const dropTargetGame = gameStore.games.find(g => g.id === dropTarget.dataset.id);
    if (!dropTargetGame) return;
    
    const rect = dropTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBefore = event.clientY < midY;
    
    const newOrder = insertBefore ? 
      dropTargetGame.order - 0.5 : 
      dropTargetGame.order + 0.5;
    
    const gamesInSameList = gameStore.games
      .filter(g => g.status === game.status)
      .sort((a, b) => {
        if (a.id === game.id) return (a.order = newOrder) - b.order;
        if (b.id === game.id) return a.order - (b.order = newOrder);
        return a.order - b.order;
      })
      .map((g, index) => ({ id: g.id, order: index, status: game.status }));
    
    await gameStore.updateGameOrder(gamesInSameList);
  }

  async function handleDifferentListMove(game, dropTarget, newStatus, event) {
    if (dropTarget.classList.contains('card')) {
      const dropTargetGame = gameStore.games.find(g => g.id === dropTarget.dataset.id);
      if (dropTargetGame) {
        const rect = dropTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = event.clientY < midY;
        
        const specificPosition = insertBefore ? 
          dropTargetGame.order - 0.5 : 
          dropTargetGame.order + 0.5;
        
        await gameStore.moveGameToStatus(draggedGameId.value, newStatus, specificPosition);
      } else {
        await gameStore.moveGameToStatus(draggedGameId.value, newStatus);
      }
    } else {
      await gameStore.moveGameToStatus(draggedGameId.value, newStatus);
    }
  }

  function handleAutoScroll(event) {
    if (isDestroyed.value) return;
    
    const scrollZoneSize = 60;
    const scrollSpeed = 10;
    const scrollThreshold = 20;

    // Stop eksisterende interval først
    clearScrollInterval();

    // Beregn afstand til top og bund af vinduet
    const distanceToTop = event.clientY;
    const distanceToBottom = window.innerHeight - event.clientY;

    // Scroll op
    if (distanceToTop < scrollZoneSize) {
      const speed = Math.max(1, (scrollZoneSize - distanceToTop) / scrollThreshold) * scrollSpeed;
      scrollInterval.value = setInterval(() => {
        if (isDestroyed.value) {
          clearScrollInterval();
          return;
        }
        window.scrollBy(0, -speed);
      }, 16);
    }
    // Scroll ned
    else if (distanceToBottom < scrollZoneSize) {
      const speed = Math.max(1, (scrollZoneSize - distanceToBottom) / scrollThreshold) * scrollSpeed;
      scrollInterval.value = setInterval(() => {
        if (isDestroyed.value) {
          clearScrollInterval();
          return;
        }
        window.scrollBy(0, speed);
      }, 16);
    }
  }

  // Comprehensive cleanup function
  function cleanup() {
    isDestroyed.value = true;
    clearScrollInterval();
    resetDragState();
    
    // Remove event listeners
    document.removeEventListener('dragstart', handleDragStart);
    document.removeEventListener('dragend', handleDragEnd);
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('drop', handleDrop);
  }

  onMounted(() => {
    isDestroyed.value = false;
    
    // Add event listeners with passive option where appropriate
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
  });

  onBeforeUnmount(() => {
    cleanup();
  });

  // Emergency cleanup on window unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    // Eksporter cleanup function så parent components kan bruge den hvis nødvendigt
    cleanup
  };
}