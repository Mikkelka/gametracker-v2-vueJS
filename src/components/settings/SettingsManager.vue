<!-- Forenklet SettingsManager.vue -->
<script setup>
import { ref } from 'vue';
import { useSettingsStore } from '../../stores/settings';
import { useMediaTypeStore } from '../../stores/mediaType';
import { useUserStore } from '../../stores/user';
import { fixUndefinedStatus } from '../../utils/dataMigration';

const settingsStore = useSettingsStore();
const mediaTypeStore = useMediaTypeStore();
const userStore = useUserStore();
const emit = defineEmits(['close']);

const migrationResult = ref(null);
const isRepairing = ref(false);

function saveSettings() {
  settingsStore.saveSettings();
  emit('close');
}

async function repairMissingItems() {
  if (isRepairing.value) return;

  isRepairing.value = true;
  migrationResult.value = null;

  try {
    const userId = userStore.currentUser?.uid;
    if (!userId) {
      migrationResult.value = { success: false, message: 'Ikke logget ind' };
      return;
    }

    const mediaType = mediaTypeStore.currentType;
    const targetStatus = 'completed'; // Move to completed by default

    const result = await fixUndefinedStatus(userId, mediaType, targetStatus);
    migrationResult.value = result;

    // If items were moved, reload the page to refresh the UI
    if (result.success && result.itemsMoved > 0) {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  } catch (error) {
    console.error('Repair error:', error);
    migrationResult.value = { success: false, message: `Fejl: ${error.message}` };
  } finally {
    isRepairing.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="saveSettings" id="settingsForm">
    <div class="form-group">
      <label>
        Vis "Ser frem til" liste
        <span class="toggle-switch">
          <input type="checkbox" id="showUpcoming" v-model="settingsStore.showUpcoming" />
          <span class="slider"></span>
        </span>
      </label>
    </div>
    <div class="form-group">
      <label>
        Vis "På pause" liste
        <span class="toggle-switch">
          <input type="checkbox" id="showPaused" v-model="settingsStore.showPaused" />
          <span class="slider"></span>
        </span>
      </label>
    </div>
    <div class="form-group">
      <label>
        Vis "Droppet" liste
        <span class="toggle-switch">
          <input type="checkbox" id="showDropped" v-model="settingsStore.showDropped" />
          <span class="slider"></span>
        </span>
      </label>
    </div>
    <button type="submit" class="btn btn-primary">
      Gem indstillinger
    </button>

    <!-- Data Repair Section -->
    <div class="repair-section">
      <h3>Data Reparation</h3>
      <p class="repair-description">
        Hvis items er forsvundet fra UI'en, kan du reparere dem her.
      </p>
      <button
        type="button"
        @click="repairMissingItems"
        class="btn btn-warning"
        :disabled="isRepairing"
      >
        {{ isRepairing ? 'Reparerer...' : 'Reparer forsvundne items' }}
      </button>
      <div v-if="migrationResult" class="migration-result" :class="{ 'success': migrationResult.success, 'error': !migrationResult.success }">
        {{ migrationResult.message }}
      </div>
    </div>
  </form>
</template>

<style scoped>
#settingsForm {
  margin-top: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.form-group:last-child {
  border-bottom: none;
}

.form-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  width: 100%;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
  letter-spacing: 0.25px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 54px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 3px;
  background: white;
  transition: all 0.2s ease;
  border-radius: 50%;
}

input:checked + .slider {
  background: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.btn-primary {
  width: 100%;
  margin-top: 1.25rem;
  background: var(--primary-color);
  color: white;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #45a049;
}

.repair-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
}

.repair-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.75rem;
}

.repair-description {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.btn-warning {
  width: 100%;
  background: #ff9800;
  color: white;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-warning:hover:not(:disabled) {
  background: #fb8c00;
}

.btn-warning:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.migration-result {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  text-align: center;
}

.migration-result.success {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.migration-result.error {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}
</style>
