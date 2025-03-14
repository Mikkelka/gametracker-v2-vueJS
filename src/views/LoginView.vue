<!-- vue/src/views/LoginView.vue -->
<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

async function loginWithGoogle() {
  const success = await userStore.loginWithGoogle();
  if (success) {
    router.push({ name: 'home' });
  }
}

onMounted(() => {
  document.title = 'GameTrack - Login';
});
</script>

<template>
  <div class="login-container">
    <h1>GameTrack</h1>
    <p>Log ind for at fortsætte til din spilsamling</p>
    <button @click="loginWithGoogle" class="login-button">
      <div class="google-icon-wrapper">
        <svg class="google-icon" width="18" height="18" viewBox="0 0 48 48">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      </div>
      <span class="login-button-text">Log ind med Google</span>
    </button>
  </div>
</template>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  background-color: var(--card-bg);
  border-radius: 8px;
  text-align: center;
  box-shadow: var(--shadow);
}

.login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 240px;
  margin: 20px auto 0;
  padding: 10px 12px;
  background-color: white;
  color: #757575;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  font-family: "Roboto", sans-serif;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #f1f1f1;
}

.google-icon-wrapper {
  width: 18px;
  height: 18px;
  margin-right: 24px;
}

.google-icon {
  width: 18px;
  height: 18px;
}

.login-button-text {
  padding-right: 24px;
}
</style>