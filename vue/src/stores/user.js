// vue/src/stores/user.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth, db } from '@/services/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const useUserStore = defineStore('user', () => {
  const currentUser = ref(null);
  const displayName = ref(null);
  const isLoading = ref(true);
  
  const isLoggedIn = computed(() => currentUser.value !== null);
  
  // Indlæs bruger ved startup
  async function initUser() {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        isLoading.value = true;
        if (user) {
          currentUser.value = user;
          await loadUserProfile();
        } else {
          currentUser.value = null;
          displayName.value = null;
        }
        isLoading.value = false;
        unsubscribe();
        resolve(user);
      });
    });
  }
  
  // Login med Google
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      currentUser.value = result.user;
      await createOrUpdateUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }
  
  // Log ud
  async function logout() {
    try {
      await signOut(auth);
      currentUser.value = null;
      displayName.value = null;
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
  
  // Opret eller opdater bruger i Firestore
  async function createOrUpdateUser(newDisplayName = null) {
    if (!currentUser.value) return false;
    
    const userRef = doc(db, 'users', currentUser.value.uid);
    
    try {
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        // Opret ny bruger
        const userData = {
          email: currentUser.value.email,
          displayName: newDisplayName || currentUser.value.email.split('@')[0],
          createdAt: serverTimestamp()
        };
        
        await setDoc(userRef, userData);
        displayName.value = userData.displayName;
      } else if (newDisplayName) {
        // Opdater eksisterende bruger
        await setDoc(userRef, { displayName: newDisplayName }, { merge: true });
        displayName.value = newDisplayName;
      } else {
        // Indlæs eksisterende display name
        displayName.value = docSnap.data().displayName;
      }
      
      return true;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return false;
    }
  }
  
  // Indlæs brugerens profil
  async function loadUserProfile() {
    if (!currentUser.value) return null;
    
    try {
      const userRef = doc(db, 'users', currentUser.value.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        displayName.value = docSnap.data().displayName;
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }
  
  // Opdater brugernavn
  async function updateDisplayName(newName) {
    if (!currentUser.value) return false;
    
    try {
      await createOrUpdateUser(newName);
      return true;
    } catch (error) {
      console.error('Error updating display name:', error);
      return false;
    }
  }

  return {
    currentUser,
    displayName,
    isLoggedIn,
    isLoading,
    initUser,
    loginWithGoogle,
    logout,
    updateDisplayName
  };
});