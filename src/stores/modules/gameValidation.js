// src/stores/modules/gameValidation.js
import { useMediaTypeStore } from '../mediaType';

/**
 * Validation and business logic module for games
 */
export function useGameValidation() {
  const mediaTypeStore = useMediaTypeStore();

  /**
   * Validate game title
   * @param {string} title - Game title to validate
   * @returns {string} - Cleaned title
   * @throws {Error} - If validation fails
   */
  function validateGameTitle(title) {
    if (!title?.trim()) {
      throw new Error('Titel er påkrævet');
    }
    
    const cleanTitle = title.trim();
    
    if (cleanTitle.length > 200) {
      throw new Error('Titel må ikke overstige 200 tegn');
    }
    
    if (cleanTitle.length < 1) {
      throw new Error('Titel må ikke være tom');
    }
    
    return cleanTitle;
  }

  /**
   * Validate completion date format
   * @param {string} date - Date string to validate (DD-MM-YYYY)
   * @returns {string|null} - Cleaned date or null if empty
   * @throws {Error} - If date format is invalid
   */
  function validateCompletionDate(date) {
    if (!date || date.trim() === '') {
      return null;
    }
    
    const cleanDate = date.trim();
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
    
    if (!dateRegex.test(cleanDate)) {
      throw new Error('Forkert datoformat. Brug DD-MM-ÅÅÅÅ');
    }
    
    // Additional validation: check if it's a valid date
    const [day, month, year] = cleanDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    if (dateObj.getDate() !== day || 
        dateObj.getMonth() !== month - 1 || 
        dateObj.getFullYear() !== year) {
      throw new Error('Ugyldig dato. Kontrollér dag, måned og år.');
    }
    
    return cleanDate;
  }

  /**
   * Validate platform data
   * @param {Object} platformData - Platform object with name and color
   * @returns {Object} - Validated platform data
   * @throws {Error} - If validation fails
   */
  function validatePlatformData(platformData) {
    if (!platformData || typeof platformData !== 'object') {
      throw new Error('Platform data er påkrævet');
    }
    
    if (!platformData.name?.trim()) {
      throw new Error('Platform navn er påkrævet');
    }
    
    if (!platformData.color?.trim()) {
      throw new Error('Platform farve er påkrævet');
    }
    
    return {
      name: platformData.name.trim(),
      color: platformData.color.trim()
    };
  }

  /**
   * Validate game status against allowed statuses
   * @param {string} status - Status to validate
   * @returns {string} - Validated status
   * @throws {Error} - If status is invalid
   */
  function validateGameStatus(status) {
    const validStatuses = mediaTypeStore.config.statusList.map(s => s.id);
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Ugyldig status: ${status}. Gyldige statuses: ${validStatuses.join(', ')}`);
    }
    
    return status;
  }

  /**
   * Validate order value
   * @param {number|string} order - Order value to validate
   * @returns {number} - Validated order as number
   */
  function validateOrder(order) {
    const orderNum = Number(order) || 0;
    
    if (orderNum < 0) {
      return 0;
    }
    
    if (orderNum > 999999) {
      return 999999;
    }
    
    return orderNum;
  }

  /**
   * Check if user has reached game limit
   * @param {number} currentGameCount - Current number of games
   * @returns {boolean} - True if limit is reached
   */
  function hasReachedGameLimit(currentGameCount) {
    const maxGames = parseInt(import.meta.env.VITE_MAX_GAMES_PER_USER);
    
    // If environment variable is not set or invalid, no limit
    if (isNaN(maxGames)) {
      return false;
    }
    
    return currentGameCount >= maxGames;
  }

  /**
   * Get the default "will" status for current media type
   * @returns {string} - Default status ID
   */
  function getDefaultWillStatus() {
    const willStatus = mediaTypeStore.config.statusList.find(s =>
      s.name.toLowerCase().startsWith('vil ')
    );
    
    return willStatus ? willStatus.id : 'willplay'; // fallback
  }

  /**
   * Generate today's date in DD-MM-YYYY format
   * @returns {string} - Formatted date string
   */
  function getTodayDateString() {
    const today = new Date();
    return `${today.getDate().toString().padStart(2, "0")}-${(
      today.getMonth() + 1
    ).toString().padStart(2, "0")}-${today.getFullYear()}`;
  }

  /**
   * Sanitize game data for storage
   * @param {Object} gameData - Raw game data
   * @returns {Object} - Sanitized game data
   */
  function sanitizeGameData(gameData) {
    const sanitized = { ...gameData };
    
    // Clean strings
    if (sanitized.title) {
      sanitized.title = sanitized.title.trim();
    }
    
    if (sanitized.platform) {
      sanitized.platform = sanitized.platform.trim();
    }
    
    if (sanitized.completionDate) {
      sanitized.completionDate = sanitized.completionDate.trim();
    }
    
    // Ensure boolean values
    sanitized.favorite = Boolean(sanitized.favorite);
    
    // Ensure numeric order
    sanitized.order = validateOrder(sanitized.order);
    
    // Add timestamps
    sanitized.updatedAt = Date.now();
    
    return sanitized;
  }

  /**
   * Validate complete game object
   * @param {Object} gameData - Game data to validate
   * @returns {Object} - Validated and sanitized game data
   * @throws {Error} - If validation fails
   */
  function validateGameData(gameData) {
    if (!gameData || typeof gameData !== 'object') {
      throw new Error('Game data er påkrævet');
    }
    
    const validated = {
      ...gameData,
      title: validateGameTitle(gameData.title),
      status: validateGameStatus(gameData.status),
      order: validateOrder(gameData.order)
    };
    
    if (gameData.completionDate) {
      validated.completionDate = validateCompletionDate(gameData.completionDate);
    }
    
    return sanitizeGameData(validated);
  }

  return {
    validateGameTitle,
    validateCompletionDate,
    validatePlatformData,
    validateGameStatus,
    validateOrder,
    hasReachedGameLimit,
    getDefaultWillStatus,
    getTodayDateString,
    sanitizeGameData,
    validateGameData
  };
}