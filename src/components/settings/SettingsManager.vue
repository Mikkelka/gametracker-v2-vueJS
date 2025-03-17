<!-- vue/src/components/settings/SettingsManager.vue -->
<script setup>
import { useSettingsStore } from '../../stores/settings';

const settingsStore = useSettingsStore();
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
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--card-border);
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
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
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
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--button-bg);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.btn-primary {
  width: 100%;
  margin-top: 20px;
  background-color: var(--button-bg);
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-primary:hover {
  background-color: var(--button-hover);
}
</style>