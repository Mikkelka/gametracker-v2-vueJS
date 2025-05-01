// src/stores/mediaType.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useMediaTypeStore = defineStore('mediaType', () => {
  // Nuværende medietype (game, movie, book)
  const currentType = ref('game');

  // Konfiguration for hver medietype
  const mediaTypeConfig = {
    game: {
      name: 'GameTrack',
      icon: '🎮',
      statusList: [
        { id: "upcoming", name: "Ser frem til" },
        { id: "willplay", name: "Vil spille" },
        { id: "playing", name: "Spiller nu" },
        { id: "completed", name: "Gennemført" },
        { id: "paused", name: "På pause" },
        { id: "dropped", name: "Droppet" }
      ],
      itemName: 'spil',
      itemNamePlural: 'spil',
      collections: {
        items: 'games',
        categories: 'platforms'
      },
      categoryName: 'Platform',
      categoryNamePlural: 'Platforme',
      completionText: 'Gennemført',
      completionDateLabel: 'Gennemførelsesdato',
      addButtonText: 'Tilføj Spil',
      emptyListMessage: 'Ingen spil i denne liste',
      noSearchResultsMessage: 'Ingen spil matcher din søgning'
    },
    movie: {
      name: 'MovieTrack',
      icon: '🎬',
      statusList: [
        { id: "upcoming", name: "Ser frem til" },
        { id: "willwatch", name: "Vil se" },
        { id: "watching", name: "Ser nu" },
        { id: "completed", name: "Set" },
        { id: "paused", name: "På pause" },
        { id: "dropped", name: "Droppet" }
      ],
      itemName: 'film',
      itemNamePlural: 'film',
      collections: {
        items: 'movies',
        categories: 'genres'
      },
      categoryName: 'Genre',
      categoryNamePlural: 'Genrer',
      completionText: 'Set',
      completionDateLabel: 'Set den',
      addButtonText: 'Tilføj Film',
      emptyListMessage: 'Ingen film i denne liste',
      noSearchResultsMessage: 'Ingen film matcher din søgning'
    },
    book: {
      name: 'BookTrack',
      icon: '📚',
      statusList: [
        { id: "upcoming", name: "Ser frem til" },
        { id: "willread", name: "Vil læse" },
        { id: "reading", name: "Læser nu" },
        { id: "completed", name: "Læst" },
        { id: "paused", name: "På pause" },
        { id: "dropped", name: "Droppet" }
      ],
      itemName: 'bog',
      itemNamePlural: 'bøger',
      collections: {
        items: 'books',
        categories: 'authors'
      },
      categoryName: 'Forfatter',
      categoryNamePlural: 'Forfattere',
      completionText: 'Læst',
      completionDateLabel: 'Læst færdig den',
      addButtonText: 'Tilføj Bog',
      emptyListMessage: 'Ingen bøger i denne liste',
      noSearchResultsMessage: 'Ingen bøger matcher din søgning'
    }
  };

  // Computed for at få konfigurationen for den aktuelle type
  const config = computed(() => mediaTypeConfig[currentType.value]);

  // Metode til at skifte medietype
  function setMediaType(type) {
    if (mediaTypeConfig[type]) {
      currentType.value = type;
      return true;
    }
    return false;
  }

  // Metode til at få kollektionsnavnet baseret på type
  function getCollectionName(collectionType) {
    if (!config.value || !config.value.collections || !config.value.collections[collectionType]) {
      return collectionType; // Fallback til collectionType hvis ikke fundet
    }
    return config.value.collections[collectionType];
  }

  return {
    currentType,
    config,
    mediaTypeConfig,
    setMediaType,
    getCollectionName
  };
});