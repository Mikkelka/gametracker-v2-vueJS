// src/utils/constants.js
// Centralized constants for the application

/**
 * Sync and debounce timing
 */
export const SYNC_DELAY = 5000; // 5 seconds between Firebase syncs
export const SEARCH_DEBOUNCE_MS = 300; // Search input debounce delay

/**
 * Drag and Drop constants
 */
export const SCROLL_ZONE_SIZE = 60; // Pixels from edge to trigger scroll
export const SCROLL_SPEED = 10; // Base scroll speed
export const SCROLL_THRESHOLD = 20; // Threshold for scroll speed calculation

/**
 * UI and styling constants
 */
export const MIN_CARD_HEIGHT = 90; // Minimum height for game cards in pixels

/**
 * Validation constants
 */
export const MAX_GAME_TITLE_LENGTH = 255; // Maximum characters for game title
export const MIN_GAME_TITLE_LENGTH = 1; // Minimum characters for game title
export const PLATFORM_LOOKUP_CACHE_SIZE = 100; // Max platforms to cache

/**
 * Status constants
 */
export const STATUS_PLAYING = 'playing';
export const STATUS_COMPLETED = 'completed';
export const STATUS_WISHLIST = 'wishlist';
export const STATUS_BACKLOG = 'backlog';
export const STATUS_DROPPED = 'dropped';
export const STATUS_ON_HOLD = 'on-hold';

/**
 * Firebase constants
 */
export const FIREBASE_BATCH_SIZE = 500; // Max items in a Firestore batch operation

/**
 * Performance constants
 */
export const VIRTUAL_SCROLL_THRESHOLD = 20; // Number of items before enabling virtual scroll
export const DEBOUNCE_INPUT_MS = 300; // Default debounce for text inputs
