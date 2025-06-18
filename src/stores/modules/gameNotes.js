// src/stores/modules/gameNotes.js
import { ref } from 'vue';
import { useNotesService } from '../../firebase/notes.service';


export function useGameNotes(games, gameSync, userStore) {
  // Cache for loaded notes - Map<gameId, noteData>
  const notesCache = ref(new Map());
  const isDestroyed = ref(false);
  
  // Notes service
  const notesService = useNotesService();


  function hasNote(gameId) {
    const game = games.value.find(g => g.id === gameId);
    return game?.hasNote || false;
  }

  
  async function loadNote(gameId) {
    if (isDestroyed.value || !userStore.currentUser) return null;

    // Check cache first
    if (notesCache.value.has(gameId)) {
      const cachedNote = notesCache.value.get(gameId);
      return cachedNote?.note || null;
    }

    try {
      // Load from Firebase
      const result = await notesService.getNote(gameId);
      
      if (result.success && result.data) {
        // Cache the result
        notesCache.value.set(gameId, result.data);
        return result.data.note;
      } else {
        // Cache empty result to avoid repeated requests
        notesCache.value.set(gameId, null);
        return null;
      }
    } catch (error) {
      console.error('Error loading note:', error);
      return null;
    }
  }

 
  async function saveNote(gameId, noteText) {
    if (isDestroyed.value || !userStore.currentUser) return false;
  
    try {
      gameSync.updateSyncStatus('syncing', 'savingNote'); // ← Ændret
  
      const trimmedNote = noteText.trim();
      
      // If note is empty, delete it
      if (!trimmedNote) {
        return await deleteNote(gameId);
      }
  
      // Save to Firebase
      const result = await notesService.saveNote(
        gameId, 
        trimmedNote, 
        userStore.currentUser.uid
      );
  
      if (result.success) {
        notesCache.value.set(gameId, result.data);
        
        // Update game's hasNote flag
        const game = games.value.find(g => g.id === gameId);
        if (game) {
          game.hasNote = true;
          
          // Queue sync for hasNote flag
          gameSync.queueChange('update', gameId, {
            hasNote: true,
            updatedAt: Date.now()
          });
        }
  
        gameSync.updateSyncStatus('success', 'noteSaved');
        return true;
      } else {
        gameSync.updateSyncStatus('error', 'noteError');
        return false;
      }
    } catch (error) {
      console.error('Error saving note:', error);
      gameSync.updateSyncStatus('error', 'noteError');
      return false;
    }
  }

  
  async function deleteNote(gameId) {
    if (isDestroyed.value || !userStore.currentUser) return false;
  
    try {
      gameSync.updateSyncStatus('syncing', 'noteDeleting'); // ← Ændret
  
      // Delete from Firebase
      const result = await notesService.deleteNote(gameId);
  
      if (result.success) {
        // Remove from cache
        notesCache.value.delete(gameId);
        
        // Update game's hasNote flag
        const game = games.value.find(g => g.id === gameId);
        if (game) {
          game.hasNote = false;
          
          // Queue sync for hasNote flag
          gameSync.queueChange('update', gameId, {
            hasNote: false,
            updatedAt: Date.now()
          });
        }
  
        gameSync.updateSyncStatus('success', 'noteDeleted');
        return true;
      } else {
        gameSync.updateSyncStatus('error', 'noteError');
        return false;
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      gameSync.updateSyncStatus('error', 'noteError');
      return false;
    }
  }

  
  async function copyToClipboard(noteText) {
    if (!noteText) return false;

    try {
      await navigator.clipboard.writeText(noteText);
      gameSync.updateSyncStatus('success', 'Text kopieret til udklipsholder', null, true);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = noteText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        gameSync.updateSyncStatus('success', 'Text kopieret til udklipsholder', null, true);
        return true;
      } catch {
        gameSync.updateSyncStatus('error', 'Kunne ikke kopiere tekst');
        return false;
      }
    }
  }

 
  function clearNoteCache(gameId) {
    notesCache.value.delete(gameId);
  }

  
  function clearAllNotesCache() {
    notesCache.value.clear();
  }

  
  function cleanup() {
    console.log('Cleaning up game notes module...');
    
    isDestroyed.value = true;
    notesCache.value.clear();
  }

  
  function reactivate() {
    isDestroyed.value = false;
  }

  return {
    // State
    notesCache,
    isDestroyed,

    // Methods
    hasNote,
    loadNote,
    saveNote,
    deleteNote,
    copyToClipboard,
    clearNoteCache,
    clearAllNotesCache,
    cleanup,
    reactivate
  };
}