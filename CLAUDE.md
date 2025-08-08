# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build

## Project Architecture

### Media Type System
MediaTrack v2.1 is a multi-media tracking application that supports games, movies, and books through a unified architecture:

- **Media Type Store** (`src/stores/mediaType.js`): Central configuration system that defines terminology, status lists, and collection names for each media type (game/movie/book). Each type has customized labels and Firebase collection paths.

- **Dynamic Collections**: Firebase collections are determined by media type:
  - Games: `games` collection with `platforms` categories
  - Movies: `movies` collection with `genres` categories  
  - Books: `books` collection with `authors` categories

### Store Architecture (Pinia)
The main game store (`src/stores/game.store.js`) uses a modular pattern:

- **Core Store**: Central state management and coordination
- **Modules** (`src/stores/modules/`):
  - `gameSync.js`: Firebase real-time synchronization
  - `gameOperations.js`: CRUD operations  
  - `gameValidation.js`: Data validation
  - `gameNotes.js`: Note-taking functionality

Each module is independently initialized and managed, with proper cleanup on user logout.

### Firebase Integration
- **Authentication**: Firebase Auth for user management
- **Database**: Firestore with real-time listeners
- **Configuration**: Environment variables via Vite (VITE_FIREBASE_*)
- **Collections**: Dynamic based on current media type

### Component Structure
- **Layout Components**: `AppSidebar.vue`, `MobileNavigation.vue` for navigation
- **Media Components**: `GameCard.vue`, `GameList.vue` for displaying items
- **Management Components**: `PlatformManager.vue`, `SettingsManager.vue` for configuration
- **UI Components**: `SimplerModal.vue` for modal dialogs

### Key Patterns
- **Composition API**: All components use `<script setup>` syntax
- **Reactive State**: Extensive use of Vue 3 reactivity with computed properties
- **Lifecycle Management**: Proper cleanup of Firebase listeners and store state
- **Multi-language Support**: Danish UI text throughout the application
- **PWA Ready**: Service worker registration with auto-update capabilities

### State Management Lifecycle
1. User authentication triggers store initialization
2. Media type selection determines Firebase collection paths
3. Real-time listeners established for selected media type
4. Cleanup occurs on logout or navigation away from media type

### Development Notes
- Application uses Danish language for UI elements
- Firebase collections are dynamically determined by media type
- Store modules handle their own lifecycle and cleanup
- Real-time synchronization with optimistic updates