<!-- vue/src/components/game/ImportManager.vue -->
<script setup>
import { ref } from 'vue';
import { useGameStore } from '../../stores/game.store';

const gameStore = useGameStore();
const importFile = ref(null);
const importStatus = ref('');
const emit = defineEmits(['close']);

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  importStatus.value = 'Importerer...';
  
  try {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const success = await gameStore.importGames(e.target.result);
        if (success) {
          importStatus.value = 'Import gennemført!';
          setTimeout(() => {
            emit('close');
          }, 2000);
        } else {
          importStatus.value = 'Import fejlede. Prøv igen.';
        }
      } catch (error) {
        console.error('Error importing games:', error);
        importStatus.value = 'Import fejlede: ' + error.message;
      }
    };
    
    reader.readAsText(file);
  } catch (error) {
    console.error('Error reading file:', error);
    importStatus.value = 'Fejl ved læsning af fil.';
  }
}
</script>

<template>
  <div class="import-container">
    <p>Vælg en JSON-fil med GameTrack-data for at importere:</p>
    
    <div class="import-actions">
      <label for="importFileInput" class="file-input-label">
        Vælg fil
        <input 
          type="file" 
          id="importFileInput"
          accept=".json"
          @change="handleFileSelect"
          class="file-input"
        >
      </label>
    </div>
    
    <p v-if="importStatus" class="import-status" :class="{ 
      'success': importStatus.includes('gennemført'), 
      'error': importStatus.includes('fejlede') 
    }">
      {{ importStatus }}
    </p>
  </div>
</template>

<style scoped>
.import-container {
  padding: 1rem 0;
}

.import-actions {
  margin: 1.5rem 0;
  display: flex;
  justify-content: center;
}

.file-input-label {
  background-color: var(--button-bg);
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: inline-block;
}

.file-input-label:hover {
  background-color: var(--button-hover);
}

.file-input {
  display: none;
}

.import-status {
  text-align: center;
  margin-top: 1rem;
  padding: 10px;
  border-radius: 4px;
}

.import-status.success {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.import-status.error {
  background-color: rgba(244, 67, 54, 0.2);
  color: #f44336;
}
</style>