import { useMediaTypeStore } from '../mediaType';

export function useGameValidation() {
  const mediaTypeStore = useMediaTypeStore();

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

  
  function validateGameStatus(status) {
    const validStatuses = mediaTypeStore.config.statusList.map(s => s.id);
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Ugyldig status: ${status}. Gyldige statuses: ${validStatuses.join(', ')}`);
    }
    
    return status;
  }

  
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

  
  function hasReachedGameLimit(currentGameCount) {
    const maxGames = parseInt(import.meta.env.VITE_MAX_GAMES_PER_USER);
    
    // If environment variable is not set or invalid, no limit
    if (isNaN(maxGames)) {
      return false;
    }
    
    return currentGameCount >= maxGames;
  }

 
  function getDefaultWillStatus() {
    const willStatus = mediaTypeStore.config.statusList.find(s =>
      s.name.toLowerCase().startsWith('vil ')
    );
    
    return willStatus ? willStatus.id : 'willplay'; // fallback
  }

  
  function getTodayDateString() {
    const today = new Date();
    return `${today.getDate().toString().padStart(2, "0")}-${(
      today.getMonth() + 1
    ).toString().padStart(2, "0")}-${today.getFullYear()}`;
  }

  
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

  function validateHasNote(hasNote) {
    return Boolean(hasNote);
  }

  function validateGameData(gameData) {
    if (!gameData || typeof gameData !== 'object') {
      throw new Error('Game data er påkrævet');
    }
    
    const validated = {
      ...gameData,
      title: validateGameTitle(gameData.title),
      status: validateGameStatus(gameData.status),
      hasNote: validateHasNote(gameData.hasNote),
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