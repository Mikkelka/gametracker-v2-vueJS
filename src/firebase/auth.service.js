// firebase/auth.service.js
import { auth, db } from './firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Autentificeringsfunktioner for Firebase
 * @returns {Object} Objekter med auth-funktionalitet
 */
export function useFirebaseAuth() {
  /**
   * Initialiserer auth state lytter
   * @param {Function} callback - Callback der køres når auth state ændres
   * @returns {Function} Funktion til at fjerne lytteren
   */
  function initAuthListener(callback) {
    return onAuthStateChanged(auth, callback);
  }
  
  /**
   * Logger ind med Google-provider
   * @returns {Promise<Object>} Firebase user objekt
   */
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Logger bruger ud
   * @returns {Promise<boolean>} Success status
   */
  async function logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Henter brugerens profil fra Firestore
   * @param {string} userId - Bruger ID
   * @returns {Promise<Object>} Brugerdata
   */
  async function getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Opretter eller opdaterer en bruger i Firestore
   * @param {Object} user - Firebase user objekt
   * @param {Object} profileData - Ekstra profildata
   * @returns {Promise<Object>} Success status og brugerdata
   */
  async function saveUserProfile(user, profileData = {}) {
    if (!user || !user.uid) {
      return { success: false, error: 'Invalid user' };
    }
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      
      let userData;
      
      if (!docSnap.exists()) {
        // Opret ny bruger
        userData = {
          email: user.email,
          displayName: profileData.displayName || user.email.split('@')[0],
          createdAt: serverTimestamp(),
          ...profileData
        };
        
        await setDoc(userRef, userData);
      } else {
        // Opdater eksisterende bruger
        userData = docSnap.data();
        
        if (Object.keys(profileData).length > 0) {
          await setDoc(userRef, profileData, { merge: true });
          userData = { ...userData, ...profileData };
        }
      }
      
      return { success: true, data: userData };
    } catch (error) {
      console.error('Error saving user profile:', error);
      return { success: false, error };
    }
  }
  
  return {
    initAuthListener,
    loginWithGoogle,
    logout,
    getUserProfile,
    saveUserProfile,
    currentUser: () => auth.currentUser
  };
}