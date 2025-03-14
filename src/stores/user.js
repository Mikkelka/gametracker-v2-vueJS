// stores/user.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useFirebaseAuth } from '../firebase/auth.service';

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref(null);
  const displayName = ref(null);
  const isLoading = ref(true);
  
  // Computed properties
  const isLoggedIn = computed(() => currentUser.value !== null);
  
  // Firebase auth service
  const authService = useFirebaseAuth();
  
  // Indlæs bruger ved startup
  async function initUser() {
    return new Promise((resolve) => {
      const unsubscribe = authService.initAuthListener(async (user) => {
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
      const result = await authService.loginWithGoogle();
      
      if (result.success) {
        currentUser.value = result.user;
        await createOrUpdateUser();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }
  
  // Log ud
  async function logout() {
    try {
      const result = await authService.logout();
      
      if (result.success) {
        currentUser.value = null;
        displayName.value = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
  
  // Opret eller opdater bruger i Firestore
  async function createOrUpdateUser(newDisplayName = null) {
    if (!currentUser.value) return false;
    
    try {
      const profileData = newDisplayName ? { displayName: newDisplayName } : {};
      const result = await authService.saveUserProfile(currentUser.value, profileData);
      
      if (result.success) {
        displayName.value = result.data.displayName;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return false;
    }
  }
  
  // Indlæs brugerens profil
  async function loadUserProfile() {
    if (!currentUser.value) return null;
    
    try {
      const result = await authService.getUserProfile(currentUser.value.uid);
      
      if (result.success) {
        displayName.value = result.data.displayName;
        return result.data;
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