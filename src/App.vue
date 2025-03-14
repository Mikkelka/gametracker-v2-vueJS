<!-- vue/src/App.vue -->
<script setup>
import { onMounted, provide, ref, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from './stores/user';

const userStore = useUserStore();
const router = useRouter();
const isLoading = ref(true);

// CSS variabler
const cssVariables = {
  '--bg-color': '#1a1a1a',
  '--text-color': '#e0e0e0',
  '--header-bg': '#2c2c2c',
  '--list-bg': '#2c2c2c',
  '--card-bg': '#3a3a3a',
  '--card-border': '#4a4a4a',
  '--button-bg': '#4caf50',
  '--button-hover': '#45a049',
  '--shadow': '0 4px 6px rgba(0, 0, 0, 0.3)',
  '--primary-color': '#4caf50'
};

// Tilføj CSS variabler til :root
function applyCssVariables() {
  const root = document.documentElement;
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Initialisér app
onMounted(async () => {
  applyCssVariables();
  try {
    // Initialisér bruger og vend router til home hvis allerede logget ind
    await userStore.initUser();
  } catch (error) {
    console.error('Failed to initialize user:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="app-container">
    <div v-if="isLoading" class="loading-screen">
      <div class="loader"></div>
      <span>Indlæser GameTrack...</span>
    </div>
    
    <router-view v-else />
  </div>
</template>

<style>
/* Base styles, similar to base.css */
* {
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
  box-sizing: border-box;
}

/* Loading animation */
.loading-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--bg-color);
}

.loader {
  border: 5px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 5px solid var(--button-bg);
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>