<script setup>
import { ref, onMounted } from 'vue';
import { usePlatformStore } from '../../stores/category';
import { useMediaTypeStore } from '../../stores/mediaType';
import SimplerModal from '../ui/SimplerModal.vue';

const platformStore = usePlatformStore();
const mediaTypeStore = useMediaTypeStore();
const newPlatformName = ref('');
const newPlatformColor = ref('#4caf50');

const colorPreviewRef = ref(null);
const colorInputRef = ref(null);

const showDeletePlatformModal = ref(false);
const platformToDelete = ref(null);

const emit = defineEmits(['close']);

onMounted(async () => {
  await platformStore.loadPlatforms();
});

function previewColor() {
  if (colorPreviewRef.value) {
    colorPreviewRef.value.style.backgroundColor = newPlatformColor.value;
  }
}

async function addPlatform() {
  if (!newPlatformName.value) return;

  await platformStore.addPlatform(
    newPlatformName.value,
    newPlatformColor.value
  );

  newPlatformName.value = '';
  newPlatformColor.value = '#4caf50';
}

async function updatePlatformColor(platformId, newColor) {
  await platformStore.updatePlatformColor(platformId, newColor);
}

async function deletePlatform(platformId) {
  platformToDelete.value = platformId;
  showDeletePlatformModal.value = true;
}

async function confirmDeletePlatform() {
  if (platformToDelete.value) {
    await platformStore.deletePlatform(platformToDelete.value);
    platformToDelete.value = null;
    showDeletePlatformModal.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="addPlatform" class="platform-form">
  <div class="form-group">
    <label for="platformName">{{ mediaTypeStore.config.categoryName }}-navn:</label>
    <input type="text" id="platformName" v-model="newPlatformName" required />
  </div>
  <div class="form-group color-picker">
    <label for="platformColor">Farve:</label>
    <input type="color" id="platformColor" v-model="newPlatformColor" @input="previewColor" required
      ref="colorInputRef" />
    <div class="color-preview" :style="{ backgroundColor: newPlatformColor }" @click="colorInputRef?.click()"
      ref="colorPreviewRef"></div>
  </div>
  <button type="submit" class="btn btn-primary">Tilføj {{ mediaTypeStore.config.categoryName.toLowerCase() }}</button>
</form>

  <ul class="platform-list">
    <li v-for="platform in platformStore.platforms" :key="platform.id">
      <div class="color-picker-wrapper" :style="{ backgroundColor: platform.color }">
        <input type="color" class="color-picker" :value="platform.color"
          @change="e => updatePlatformColor(platform.id, e.target.value)">
      </div>
      <span class="platform-name">{{ platform.name }}</span>
      <button class="delete-platform" @click="deletePlatform(platform.id)">
        Slet
      </button>
    </li>
  </ul>

  <SimplerModal :isOpen="showDeletePlatformModal" title="Bekræft sletning" @close="showDeletePlatformModal = false">
  <p>Er du sikker på, at du vil slette denne {{ mediaTypeStore.config.categoryName.toLowerCase() }}?</p>
  
  <template #footer>
    <button @click="showDeletePlatformModal = false" style="padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; background-color: #444; color: white; margin-right: 8px;">Annuller</button>
    <button @click="confirmDeletePlatform" style="padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; background-color: #f44336; color: white;">Slet</button>
  </template>
</SimplerModal>

</template>

<style scoped>
.platform-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--card-border);
  border-radius: 4px;
  background-color: var(--card-bg);
  color: var(--text-color);
}

.color-picker {
  display: flex;
  align-items: center;
}

.color-picker input[type="color"] {
  width: 0;
  height: 0;
  padding: 0;
  border: none;
  visibility: hidden;
}

.color-preview {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--card-border);
  cursor: pointer;
  margin-left: 10px;
}

.platform-list {
  list-style-type: none;
  padding: 0;
}

.platform-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  background-color: var(--card-bg);
  border-radius: 4px;
}

.color-picker-wrapper {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--card-border);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.color-picker-wrapper input[type="color"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.platform-name {
  font-weight: bold;
  flex-grow: 1;
  margin-left: 10px;
}

.delete-platform {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-platform:hover {
  background-color: #d32f2f;
}
</style>