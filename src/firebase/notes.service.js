// src/firebase/notes.service.js
// v3.0 structure: users/{uid}/data/notes document
// Structure: { game: { [itemId]: { text, userId, updatedAt, createdAt } }, movie: {...}, book: {...} }

import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp
} from 'firebase/firestore';
import { useMediaTypeStore } from '../stores/mediaType';

export function useNotesService() {
  /**
   * Get the notes document reference for a user
   */
  function getNotesRef(userId) {
    return doc(db, `users/${userId}/data`, 'notes');
  }

  /**
   * Get current media type
   */
  function getMediaType() {
    try {
      const mediaTypeStore = useMediaTypeStore();
      return mediaTypeStore.currentType;
    } catch (error) {
      console.warn('MediaTypeStore not available, defaulting to game', error);
      return 'game';
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

  /**
   * Get note for a specific item (game, movie, book)
   */
  async function getNote(itemId, userId) {
    return safeOperation(async () => {
      const mediaType = getMediaType();
      const notesRef = getNotesRef(userId);
      const notesSnap = await getDoc(notesRef);

      if (!notesSnap.exists()) {
        return null;
      }

      const notesData = notesSnap.data();
      const mediaTypeNotes = notesData[mediaType] || {};
      const note = mediaTypeNotes[itemId];

      if (note) {
        return {
          id: itemId,
          ...note
        };
      }

      return null; // No note exists for this item
    }, `Error getting note for item ${itemId}`);
  }

  /**
   * Save note for a specific item
   */
  async function saveNote(itemId, noteText, userId) {
    if (!itemId || !userId) {
      return { success: false, error: 'Item ID and User ID are required' };
    }

    return safeOperation(async () => {
      const mediaType = getMediaType();
      const notesRef = getNotesRef(userId);

      // Get current notes document
      const notesSnap = await getDoc(notesRef);
      const notesData = notesSnap.exists() ? notesSnap.data() : {};

      // Ensure media type object exists
      if (!notesData[mediaType]) {
        notesData[mediaType] = {};
      }

      // Create/update note
      const noteData = {
        text: noteText.trim(),
        userId,
        updatedAt: serverTimestamp(),
        createdAt: notesData[mediaType][itemId]?.createdAt || serverTimestamp()
      };

      notesData[mediaType][itemId] = noteData;

      // Write back entire notes document
      await setDoc(notesRef, notesData, { merge: true });

      return {
        id: itemId,
        ...noteData,
        createdAt: noteData.createdAt || new Date(),
        updatedAt: noteData.updatedAt || new Date()
      };
    }, `Error saving note for item ${itemId}`);
  }

  /**
   * Delete note for a specific item
   */
  async function deleteNote(itemId, userId) {
    return safeOperation(async () => {
      const mediaType = getMediaType();
      const notesRef = getNotesRef(userId);

      console.log(`[deleteNote] Deleting note for itemId: ${itemId}, mediaType: ${mediaType}`);

      // Get current notes document
      const notesSnap = await getDoc(notesRef);
      if (!notesSnap.exists()) {
        console.log(`[deleteNote] Notes document does not exist`);
        return { id: itemId }; // No notes document, nothing to delete
      }

      const notesData = notesSnap.data();
      console.log(`[deleteNote] Current notesData:`, notesData);

      // Remove note for this item using deleteField for proper deletion
      if (notesData[mediaType] && notesData[mediaType][itemId]) {
        console.log(`[deleteNote] Found note to delete for ${mediaType}/${itemId}`);

        // Use updateDoc with deleteField to properly remove the nested property
        const updateData = {};
        updateData[`${mediaType}.${itemId}`] = deleteField();

        console.log(`[deleteNote] Deleting field: ${mediaType}.${itemId}`);
        await updateDoc(notesRef, updateData);
        console.log(`[deleteNote] Successfully deleted note from Firebase`);
      } else {
        console.log(`[deleteNote] Note not found for ${mediaType}/${itemId}`);
        console.log(`[deleteNote] Available ${mediaType} notes:`, Object.keys(notesData[mediaType] || {}));
      }

      return { id: itemId };
    }, `Error deleting note for item ${itemId}`);
  }

  /**
   * Get all item IDs that have notes for the current user and media type
   * Used to initialize hasNote property on items
   */
  async function getItemIdsWithNotes(userId) {
    return safeOperation(async () => {
      const mediaType = getMediaType();
      const notesRef = getNotesRef(userId);
      const notesSnap = await getDoc(notesRef);

      if (!notesSnap.exists()) {
        return []; // No notes document
      }

      const notesData = notesSnap.data();
      const mediaTypeNotes = notesData[mediaType] || {};

      // Return all item IDs that have notes for this media type
      return Object.keys(mediaTypeNotes);
    }, 'Error getting item IDs with notes');
  }

  return {
    getNote,
    saveNote,
    deleteNote,
    getItemIdsWithNotes
  };
}
