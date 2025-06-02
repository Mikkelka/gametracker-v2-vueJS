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


export function useFirebaseAuth() {
  function initAuthListener(callback) {
    return onAuthStateChanged(auth, callback);
  }
  
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
  
  async function logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error };
    }
  }
  
 
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