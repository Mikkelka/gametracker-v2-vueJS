// vue/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Opret app instance
const app = createApp(App)

// Tilføj Pinia state management
app.use(createPinia())

// Tilføj router
app.use(router)

// Montér app
app.mount('#app')
