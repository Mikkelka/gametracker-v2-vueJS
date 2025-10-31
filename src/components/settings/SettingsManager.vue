<!-- Forenklet SettingsManager.vue -->
<script setup>
import { useSettingsStore } from '../../stores/settings';
import { useMediaTypeStore } from '../../stores/mediaType';

const settingsStore = useSettingsStore();
const _mediaTypeStore = useMediaTypeStore();
const emit = defineEmits(['close']);

function saveSettings() {
  settingsStore.saveSettings();
  emit('close');
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
</style>
