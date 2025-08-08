// src/firebase/notes.service.js
import { db } from './firebase';
import { 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { useMediaTypeStore } from '../stores/mediaType';

export function useNotesService() {
  function getNotesCollectionPath() {
    try {
      const mediaTypeStore = useMediaTypeStore();
      const mediaType = mediaTypeStore.currentType;
      
      if (mediaType === 'game') {
        return 'notes';
      } else {
        return `mediaTypes/${mediaType}/notes`;
      }
    } catch (error) {
      console.warn('MediaTypeStore not available, defaulting to notes collection', error);
      return 'notes';
    }
  }
  
  async function safeOperation(operation, errorMsg) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      console.error(errorMsg, error);
      return { success: false, error: error.message || errorMsg };
    }
  }
  
  async function getNote(gameId) {
    return safeOperation(async () => {
      const collectionPath = getNotesCollectionPath();
      const docRef = doc(db, collectionPath, gameId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      
      return null; // No note exists
    }, `Error getting note for game ${gameId}`);
  }
  
 
  async function saveNote(gameId, noteText, userId) {
    if (!gameId || !userId) {
      return { success: false, error: 'Game ID and User ID are required' };
    }
    
    return safeOperation(async () => {
      const collectionPath = getNotesCollectionPath();
      const docRef = doc(db, collectionPath, gameId);
      
      const noteData = {
        gameId,
        userId,
        note: noteText.trim(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp() 
      };
      
      await setDoc(docRef, noteData, { merge: true });
      
      return { 
        id: gameId,
        ...noteData,
        createdAt: noteData.createdAt || new Date(),
        updatedAt: noteData.updatedAt || new Date()
      };
    }, `Error saving note for game ${gameId}`);
  }
  

  async function deleteNote(gameId) {
    return safeOperation(async () => {
      const collectionPath = getNotesCollectionPath();
      const docRef = doc(db, collectionPath, gameId);
      await deleteDoc(docRef);
      return { id: gameId };
    }, `Error deleting note for game ${gameId}`);
  }
  
  return {
    getNote,
    saveNote,
    deleteNote
  };
}