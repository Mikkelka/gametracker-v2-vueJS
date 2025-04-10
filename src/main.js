// vue/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { registerSW } from 'virtual:pwa-register'

// Registrer service worker med auto-opdatering
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('Ny version tilgængelig!')
  },
  onOfflineReady() {
    console.log('App er klar til offline brug')
  }
})

// Opret app instance
const app = createApp(App)

// Tilføj Pinia state management
app.use(createPinia())

// Tilføj router
app.use(router)

// Montér app
app.mount('#app')