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

const _emit = defineEmits(['close']);

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
    <button @click="showDeletePlatformModal = false" class="btn btn-secondary">Annuller</button>
    <button @click="confirmDeletePlatform" class="btn btn-danger">Slet</button>
  </template>
</SimplerModal>

</template>

<style scoped>
.platform-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-color);
  letter-spacing: 0.25px;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-color);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.1);
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
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  margin-left: 0.75rem;
  transition: all 0.2s ease;
}

.color-preview:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.platform-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.platform-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.platform-list li:hover {
  background: rgba(255, 255, 255, 0.08);
}

.color-picker-wrapper {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.color-picker-wrapper:hover {
  border-color: rgba(255, 255, 255, 0.2);
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
  font-weight: 500;
  flex-grow: 1;
  margin-left: 0.75rem;
  color: var(--text-color);
  font-size: 0.875rem;
}

.delete-platform {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.delete-platform:hover {
  background: #dc2626;
}
</style>