// vue/src/composables/useDragAndDrop.js
import { onMounted, onBeforeUnmount } from 'vue';
import { useGameStore } from '../stores/game';

export function useDragAndDrop() {
  const gameStore = useGameStore();
  let draggedElement = null;
  let draggedGameId = null;
  let scrollInterval = null;

  function handleDragStart(event) {
    const card = event.target.closest('.card');
    if (!card) return;

    draggedGameId = card.dataset.id;
    draggedElement = card;

    event.dataTransfer.setData('text/plain', draggedGameId);
    card.style.opacity = '0.5';

    // Tilføj dragging-klasse for at vise det visuelt
    card.classList.add('dragging');
  }

  function handleDragEnd(event) {
    if (draggedElement) {
      draggedElement.style.opacity = '1';
      draggedElement.classList.remove('dragging');
      draggedElement = null;
    }

    // Stop eventuel auto-scroll
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  }

  function handleDragOver(event) {
    event.preventDefault();

    const dropTarget = event.target.closest('.card') || event.target.closest('.list');

    if (!dropTarget) return;

    // Reset borders på alle kort
    document.querySelectorAll('.card').forEach(card => {
      if (card !== dropTarget) {
        card.style.borderTop = '';
        card.style.borderBottom = '';
      }
    });

    // Hvis vi er over et kort (ikke hele listen)
    if (dropTarget.classList.contains('card') && dropTarget !== draggedElement) {
      const rect = dropTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (event.clientY < midY) {
        // Over midten af kortet - vis markør over
        dropTarget.style.borderTop = 'solid 4px var(--button-bg)';
        dropTarget.style.borderBottom = '';
      } else {
        // Under midten af kortet - vis markør under
        dropTarget.style.borderTop = '';
        dropTarget.style.borderBottom = 'solid 4px var(--button-bg)';
      }
    }

    // Auto-scroll håndtering
    handleAutoScroll(event);
  }

  function handleDragLeave(event) {
    const card = event.target.closest('.card');
    if (card) {
      card.style.borderTop = '';
      card.style.borderBottom = '';
    }
  }

  async function handleDrop(event) {
    event.preventDefault();
    
    // Fjern alle border-indikatorer
    document.querySelectorAll('.card').forEach(card => {
      card.style.borderTop = '';
      card.style.borderBottom = '';
    });
    
    // Stop auto-scroll
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    
    if (!draggedGameId) return;
    
    const dropTarget = event.target.closest('.card') || event.target.closest('.list');
    if (!dropTarget) return;
    
    const list = dropTarget.closest('.list');
    if (!list) return;
    
    // Find den nye status (willplay, playing, etc.)
    const newStatus = list.id;
    
    // Find det game-objekt vi flytter
    const game = gameStore.games.find(g => g.id === draggedGameId);
    if (!game) return;
    
    // Hvis vi ikke ændrer status, men bare rækkefølge inden for samme liste
    if (game.status === newStatus && dropTarget.classList.contains('card')) {
      const dropTargetGame = gameStore.games.find(g => g.id === dropTarget.dataset.id);
      if (!dropTargetGame) return;
      
      // Beregn indsættelsespunkt baseret på musens position
      const rect = dropTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertBefore = event.clientY < midY;
      
      // Find den nye ordre for det flyttede spil
      let newOrder;
      if (insertBefore) {
        newOrder = dropTargetGame.order - 0.5;
      } else {
        newOrder = dropTargetGame.order + 0.5;
      }
      
      // Sortér og lav numerisk orden (1, 2, 3...)
      const gamesInSameList = gameStore.games
        .filter(g => g.status === newStatus)
        .sort((a, b) => {
          if (a.id === game.id) return (a.order = newOrder) - b.order;
          if (b.id === game.id) return a.order - (b.order = newOrder);
          return a.order - b.order;
        })
        .map((g, index) => ({ id: g.id, order: index, status: newStatus }));
      
      // Kun ét kald til updateGameOrder for at undgå dobbelt synkronisering
      await gameStore.updateGameOrder(gamesInSameList);
    } 
    // Hvis vi flytter til en anden liste (ændrer status)
    else if (game.status !== newStatus) {
      // Hvis vi dropper direkte på et kort i den nye liste
      if (dropTarget.classList.contains('card')) {
        const dropTargetGame = gameStore.games.find(g => g.id === dropTarget.dataset.id);
        if (dropTargetGame) {
          // Beregn indsættelsespunkt baseret på musens position
          const rect = dropTarget.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const insertBefore = event.clientY < midY;
          
          // Find den nye ordre for det flyttede spil
          let specificPosition;
          if (insertBefore) {
            specificPosition = dropTargetGame.order - 0.5;
          } else {
            specificPosition = dropTargetGame.order + 0.5;
          }
          
          await gameStore.moveGameToStatus(draggedGameId, newStatus, specificPosition);
        } else {
          await gameStore.moveGameToStatus(draggedGameId, newStatus);
        }
      } 
      // Hvis vi dropper direkte på listen (ikke på et specifikt kort)
      else {
        await gameStore.moveGameToStatus(draggedGameId, newStatus);
      }
    }
    
    // Nulstil
    draggedGameId = null;
  }

  function handleAutoScroll(event) {
    const scrollZoneSize = 60; // px fra top/bund af vinduet
    const scrollSpeed = 10; // px per interval
    const scrollThreshold = 20; // Afstand fra kanten for at starte scroll

    // Stop eksisterende interval
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }

    // Beregn afstand til top og bund af vinduet
    const distanceToTop = event.clientY;
    const distanceToBottom = window.innerHeight - event.clientY;

    // Scroll op
    if (distanceToTop < scrollZoneSize) {
      const speed = Math.max(1, (scrollZoneSize - distanceToTop) / scrollThreshold) * scrollSpeed;
      scrollInterval = setInterval(() => {
        window.scrollBy(0, -speed);
      }, 16); // ~60fps
    }
    // Scroll ned
    else if (distanceToBottom < scrollZoneSize) {
      const speed = Math.max(1, (scrollZoneSize - distanceToBottom) / scrollThreshold) * scrollSpeed;
      scrollInterval = setInterval(() => {
        window.scrollBy(0, speed);
      }, 16);
    }
  }

  onMounted(() => {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('dragstart', handleDragStart);
    document.removeEventListener('dragend', handleDragEnd);
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('drop', handleDrop);

    if (scrollInterval) {
      clearInterval(scrollInterval);
    }
  });

  return {
    // Eksporterer ikke funktioner direkte, da vi bruger event listeners
  };
}