// src/stores/modules/gameOperations.js
// Vue utilities not needed in this module

export function useGameOperations(games, gameSync, gameValidation, mediaTypeStore, userStore) {
  
  async function addGame(title, platformData) {
    if (gameSync.isDestroyed.value) return null;
    
    try {
      // Validate inputs
      const cleanTitle = gameValidation.validateGameTitle(title);
      const validatedPlatform = gameValidation.validatePlatformData(platformData);
      
      // Check game limit
      if (gameValidation.hasReachedGameLimit(games.value.length)) {
        const maxGames = parseInt(import.meta.env.VITE_MAX_GAMES_PER_USER);
        gameSync.updateSyncStatus('error', 'limitReached', maxGames);
        return null;
      }

      gameSync.updateSyncStatus('syncing', 'adding');

      // Get default status for current media type
      const statusId = gameValidation.getDefaultWillStatus();

      // Calculate order for new game
      const maxOrder = Math.max(
        ...games.value
          .filter(g => g.status === statusId)
          .map(g => g.order || 0),
        -1
      );

      const newGame = {
        id: Date.now().toString(),
        title: cleanTitle,
        platform: validatedPlatform.name,
        platformColor: validatedPlatform.color,
        status: statusId,
        favorite: false,
        createdAt: Date.now(),
        order: maxOrder + 1,
        userId: userStore.currentUser.uid
      };

      // Use direct Firebase add for new games
      const result = await gameSync.addGameDirectly(newGame);

      if (result && !gameSync.isDestroyed.value) {
        games.value.push(result);
        gameSync.updateSyncStatus('success', 'added');
        return result;
      } else {
        gameSync.updateSyncStatus('error', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error adding game:', error);
      gameSync.updateSyncStatus('error', error.message || 'error');
      return null;
    }
  }

  
  async function updateGameTitle(gameId, newTitle) {
    if (gameSync.isDestroyed.value) return false;
    
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    try {
      const cleanTitle = gameValidation.validateGameTitle(newTitle);
      
      gameSync.updateSyncStatus('syncing', 'updatingTitle');

      // Update locally first
      game.title = cleanTitle;
      game.updatedAt = Date.now();

      // Queue change for batch sync
      gameSync.queueChange('update', gameId, {
        title: cleanTitle,
        updatedAt: Date.now()
      });

      gameSync.updateSyncStatus('success', 'titleUpdated');
      return game;
    } catch (error) {
      console.error('Error updating game title:', error);
      gameSync.updateSyncStatus('error', error.message || 'error');
      return false;
    }
  }

  
  async function deleteGame(gameId) {
    if (!userStore.currentUser || gameSync.isDestroyed.value) return false;

    gameSync.updateSyncStatus('syncing', 'deleting');

    try {
      // Remove from local state first
      const index = games.value.findIndex(g => g.id === gameId);
      if (index >= 0) {
        games.value.splice(index, 1);
      }

      // Queue deletion for batch sync
      gameSync.queueChange('delete', gameId);

      gameSync.updateSyncStatus('success', 'deleted');
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      gameSync.updateSyncStatus('error', 'error');
      return false;
    }
  }

  
  async function moveGameToStatus(gameId, newStatus, specificPosition = null) {
    if (gameSync.isDestroyed.value) return false;
    
    const game = games.value.find(g => g.id === gameId);
    if (!game || game.status === newStatus) {
      gameSync.updateSyncStatus('idle', '', false);
      return false;
    }

    try {
      gameValidation.validateGameStatus(newStatus);
      
      gameSync.updateSyncStatus('syncing', 'moving');

      let newOrder;
      if (specificPosition !== null) {
        newOrder = gameValidation.validateOrder(specificPosition);
      } else {
        // Place at end of list
        const maxOrder = Math.max(
          ...games.value
            .filter(g => g.status === newStatus)
            .map(g => g.order || 0),
          -1
        );
        newOrder = maxOrder + 1;
      }

      // Update local state first
      game.status = newStatus;
      game.order = newOrder;
      game.updatedAt = Date.now();

      // Queue change for batch sync
      gameSync.queueChange('update', gameId, {
        status: newStatus,
        order: newOrder,
        updatedAt: Date.now()
      });

      // If specific position, reorder other games
      if (specificPosition !== null) {
        const gamesInSameList = games.value
          .filter(g => g.status === newStatus && g.id !== gameId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        [...gamesInSameList, game]
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .forEach((g, index) => {
            if (g.id !== gameId) {
              g.order = index;
              gameSync.queueChange('update', g.id, {
                order: index,
                updatedAt: Date.now()
              });
            }
          });
      }

      gameSync.updateSyncStatus('success', 'moved');
      return game;
    } catch (error) {
      console.error('Error moving game:', error);
      gameSync.updateSyncStatus('error', error.message || 'error');
      return false;
    }
  }

 
  async function toggleFavorite(gameId) {
    if (gameSync.isDestroyed.value) return false;
    
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    gameSync.updateSyncStatus('syncing', 'updatingFavorite');

    try {
      // Update locally first
      game.favorite = !game.favorite;
      game.updatedAt = Date.now();

      // Queue change for batch sync
      gameSync.queueChange('update', gameId, {
        favorite: game.favorite,
        updatedAt: Date.now()
      });

      gameSync.updateSyncStatus('success', game.favorite ? 'favoritedTrue' : 'favoritedFalse');
      return game;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      gameSync.updateSyncStatus('error', 'error');
      return false;
    }
  }

 
  async function setCompletionDate(gameId, date) {
    if (gameSync.isDestroyed.value) return false;
    
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    try {
      gameSync.updateSyncStatus('syncing', 'updatingDate');

      const validatedDate = gameValidation.validateCompletionDate(date);
      
      // Update locally first
      const updateData = {
        updatedAt: Date.now()
      };

      if (validatedDate) {
        game.completionDate = validatedDate;
        updateData.completionDate = validatedDate;
      } else {
        delete game.completionDate;
        updateData.completionDate = null;
      }

      // Queue change for batch sync
      gameSync.queueChange('update', gameId, updateData);

      gameSync.updateSyncStatus('success', 'dateUpdated');
      return game;
    } catch (error) {
      console.error('Error setting completion date:', error);
      gameSync.updateSyncStatus('error', error.message || 'error');
      return false;
    }
  }

 
  async function setTodayAsCompletionDate(gameId) {
    if (gameSync.isDestroyed.value) return false;
    
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    gameSync.updateSyncStatus('syncing', 'addingDate');

    try {
      const formattedDate = gameValidation.getTodayDateString();

      // Update locally first
      game.completionDate = formattedDate;
      game.updatedAt = Date.now();

      // Queue change for batch sync
      gameSync.queueChange('update', gameId, {
        completionDate: formattedDate,
        updatedAt: Date.now()
      });

      gameSync.updateSyncStatus('success', 'dateAdded');
      return game;
    } catch (error) {
      console.error('Error setting today as completion date:', error);
      gameSync.updateSyncStatus('error', 'error');
      return false;
    }
  }

 
  async function changePlatform(gameId, platformData) {
    if (gameSync.isDestroyed.value) return false;
    
    const game = games.value.find(g => g.id === gameId);
    if (!game) return false;

    try {
      const validatedPlatform = gameValidation.validatePlatformData(platformData);
      
      gameSync.updateSyncStatus('syncing', 'changingCategory');

      // Update locally first
      game.platform = validatedPlatform.name;
      game.platformColor = validatedPlatform.color;
      game.updatedAt = Date.now();

      // Queue change for batch sync
      gameSync.queueChange('update', gameId, {
        platform: validatedPlatform.name,
        platformColor: validatedPlatform.color,
        updatedAt: Date.now()
      });

      gameSync.updateSyncStatus('success', 'categoryChanged', validatedPlatform.name);
      return game;
    } catch (error) {
      console.error('Error changing platform:', error);
      gameSync.updateSyncStatus('error', error.message || 'error');
      return false;
    }
  }

 
  async function updateGameOrder(changedGames) {
    if (!userStore.currentUser || gameSync.isDestroyed.value) return false;

    gameSync.updateSyncStatus('syncing', 'updatingOrder');

    try {
      // Update locally first and queue changes
      changedGames.forEach(change => {
        const validatedOrder = gameValidation.validateOrder(change.order);
        const validatedStatus = gameValidation.validateGameStatus(change.status);
        
        const index = games.value.findIndex(g => g.id === change.id);
        if (index >= 0) {
          games.value[index].order = validatedOrder;
          games.value[index].status = validatedStatus;

          // Queue change
          gameSync.queueChange('update', change.id, {
            order: validatedOrder,
            status: validatedStatus,
            updatedAt: Date.now()
          });
        }
      });

      // Re-sort list
      const statusOrder = mediaTypeStore.config.statusList.map(status => status.id);
      games.value.sort((a, b) => {
        if (a.status !== b.status) {
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        }
        return (a.order || 0) - (b.order || 0);
      });

      gameSync.updateSyncStatus('success', 'orderUpdated');
      return true;
    } catch (error) {
      console.error('Error updating game order:', error);
      gameSync.updateSyncStatus('error', error.message || 'error');
      return false;
    }
  }

 
  function exportGames() {
    if (gameSync.isDestroyed.value) return;
    
    try {
      const jsonData = JSON.stringify(games.value, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "gametrack_data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting games:', error);
      gameSync.updateSyncStatus('error', 'error');
    }
  }

 
  async function importGames(jsonData) {
    if (!userStore.currentUser || gameSync.isDestroyed.value) return false;

    gameSync.updateSyncStatus('syncing', 'importing');

    try {
      const importedGames = JSON.parse(jsonData);

      // Validate and sanitize imported games
      const validatedGames = importedGames.map(game => {
        try {
          return gameValidation.validateGameData({
            ...game,
            userId: userStore.currentUser.uid
          });
        } catch (error) {
          console.warn(`Skipping invalid game: ${game.title || 'Unknown'}`, error);
          return null;
        }
      }).filter(Boolean);

      if (validatedGames.length === 0) {
        gameSync.updateSyncStatus('error', 'Ingen gyldige spil fundet i import data');
        return false;
      }

      const result = await gameSync.importGamesDirectly(validatedGames);

      if (result && !gameSync.isDestroyed.value) {
        gameSync.updateSyncStatus('success', 'imported', validatedGames.length);
        return true;
      } else {
        gameSync.updateSyncStatus('error', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error importing games:', error);
      gameSync.updateSyncStatus('error', error.message || 'error');
      return false;
    }
  }

  return {
    addGame,
    updateGameTitle,
    deleteGame,
    moveGameToStatus,
    toggleFavorite,
    setCompletionDate,
    setTodayAsCompletionDate,
    changePlatform,
    updateGameOrder,
    exportGames,
    importGames
  };
}