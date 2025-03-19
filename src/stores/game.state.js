// game.state.js
import { ref } from 'vue';

// Centraliseret state som eksporteres separat
export const games = ref([]);
export const isLoading = ref(true);
export const syncStatus = ref({ status: 'idle', message: '' });
export const lastSync = ref(null);
export const unsyncedChanges = ref([]);
export const unsubscribe = ref(null);
export const syncDebounceTimer = ref(null);
export const pendingSync = ref(false);

// Statusliste (statisk værdi)
export const statusList = [
  { id: "upcoming", name: "Ser frem til" },
  { id: "willplay", name: "Vil spille" },
  { id: "playing", name: "Spiller nu" },
  { id: "completed", name: "Gennemført" },
  { id: "paused", name: "På pause" },
  { id: "dropped", name: "Droppet" }
];