# Firebase Migration Testing Guide

This guide explains how to test the migration from the old Firebase structure (v2.0) to the new pre-grouped structure (v3.0).

## Overview

The app now uses a dual-mode adapter (`db-adapter.service.js`) that:
1. **Detects** which structure exists for the current user
2. **Automatically switches** between old structure (root-level collections) and new structure (users/{uid}/data/)
3. **Maintains full backwards compatibility** while allowing gradual migration

## Architecture Changes

### New Service Files
- **`db-new-structure.service.js`**: Handles reads/writes to the new `users/{uid}/data/lists` structure
- **`db-adapter.service.js`**: Intelligently switches between old and new services based on what exists
- **`db.service.js`**: Original service (unchanged, still used for old structure)

### Updated Files
- **`gameSync.js`**: Now uses adapter instead of direct Firebase service
- **`game.store.js`**: Updated `loadGames()` to be async for structure detection

## Testing Workflow

### Phase 1: Test with Old Structure (Backwards Compatibility)

1. **Current State**: Your app has data in the old structure
   - Games in `games/` collection
   - Platforms in `platforms/` collection
   - Notes in subcollections

2. **What Happens**:
   - App detects old structure exists
   - Uses original `db.service.js` for all operations
   - Everything works as before ✅

3. **Test Steps**:
   ```
   1. Login to the app
   2. Verify games load (should be fast)
   3. Try each CRUD operation:
      - Add new game ✅
      - Update title ✅
      - Change platform ✅
      - Move to different status ✅
      - Delete game ✅
   4. Check browser console - should see: "Using old Firebase structure (v2.0)"
   ```

### Phase 2: Import Transformed Data

1. **Transform Your Backup**:
   ```bash
   # Use the test-transformation.js script
   node test-transformation.js "C:\Users\mikke\Downloads\mediatrack-backup-2025-10-31.json"
   ```

2. **This Creates**:
   - `mediatrack-backup-2025-10-31-transformed.json` (v3.0 format)
   - Transformation report showing data preservation

3. **Import in App**:
   - Open Settings → Data Management
   - Click "Import Data"
   - Upload the transformed JSON file
   - Check "Replace existing data" (optional)
   - Click Import

4. **Result**:
   - New structure created: `users/{uid}/data/lists`
   - Old structure remains unchanged (for safety)
   - `users/{uid}/data/metadata` contains categories

### Phase 3: Test with New Structure

1. **Current State**: Both old and new structures exist
   - Old: `games/`, `platforms/`, etc.
   - New: `users/{uid}/data/lists`, `users/{uid}/data/metadata`

2. **What Happens**:
   - App detects new structure exists first
   - Uses `db-new-structure.service.js`
   - Old structure is ignored

3. **Test Steps** (with imported data):
   ```
   1. Refresh the app
   2. Verify games load from new structure
   3. Check browser console - should see: "Using new Firebase structure (v3.0)"
   4. Run same CRUD operations:
      - Add new game ✅
      - Update title ✅
      - Change platform ✅
      - Move to different status ✅
      - Delete game ✅
   5. Verify changes appear in Firebase under users/{uid}/data/lists
   ```

## Detailed Test Cases

### CRUD Operations

#### Add Game
```javascript
// Expected Flow:
1. User enters title and platform
2. Game added to appropriate status (default: "willplay"/"upcoming")
3. Appears in game list immediately
4. Firebase write completes in background
```

#### Update Title
```javascript
// Expected Flow:
1. User clicks game title to edit
2. Title updates in UI immediately (optimistic)
3. Change queued for batch sync
4. After 5 seconds, change synced to Firebase
```

#### Move Between Status Lists
```javascript
// Expected Flow (New Structure):
1. User drags game to new status
2. Item removed from old status array
3. Item added to new status array
4. Order recalculated within new status
5. Change synced to Firebase
```

#### Delete Game
```javascript
// Expected Flow:
1. User confirms deletion
2. Game removed from local state
3. Removal queued for Firebase
4. After sync, should not appear on refresh
```

## Performance Testing

### Before Migration (Old Structure)
```
- Load 250 games: 250+ API calls (1 per game)
- Each status: 50+ calls per status
- Notes: Additional call per game
```

### After Migration (New Structure)
```
- Load 250 games: 1 API call
- Real-time updates: 1 listener
- Total bandwidth: ~90% reduction
```

**To measure**:
1. Open DevTools → Network tab
2. Refresh page with old structure
3. Count API calls
4. Import data and refresh with new structure
5. Compare call counts

## Verification Checklist

### Phase 1: Backwards Compatibility
- [ ] Old data loads successfully
- [ ] All CRUD operations work
- [ ] Console shows "Using old Firebase structure"
- [ ] No errors in console

### Phase 2: Data Import
- [ ] Transformation completes without errors
- [ ] Import dialog shows correct counts
- [ ] New structure visible in Firebase
- [ ] Import progress displays correctly

### Phase 3: New Structure Usage
- [ ] Console shows "Using new Firebase structure"
- [ ] Data loads with 1 API call
- [ ] All CRUD operations work with new structure
- [ ] Changes persist in new structure
- [ ] No data loss after operations

### Phase 4: Edge Cases
- [ ] Switching between media types (game/movie/book) works
- [ ] Notes attach correctly to items
- [ ] Categories/Platforms load and update correctly
- [ ] Logout and login preserves data
- [ ] Page refresh loads correct data

## Troubleshooting

### Issue: Still using old structure after import
**Solution**:
1. Verify import succeeded (check Firebase console)
2. Manually check: `users/{uid}/data/lists` exists
3. Clear browser cache and refresh
4. Check browser console for error messages

### Issue: Missing data after import
**Solution**:
1. Run transformation report again
2. Check if movie/book data were in original export
3. Verify import showed correct counts
4. Check Firebase `users/{uid}/data/lists` for correct structure

### Issue: CRUD operations fail with new structure
**Solution**:
1. Check Firebase security rules updated correctly
2. Verify `users/{uid}/data/{document=**}` rule exists
3. Check browser console for specific error
4. Verify data format matches new structure

### Issue: Performance not improved
**Solution**:
1. Verify using new structure (console message)
2. Check Network tab - should see 1 API call instead of 250+
3. Verify metadata loading separately if needed
4. Check that listener is on single document, not collection

## Rollback Procedure

If issues occur:

1. **Keep old structure**: Old collections (`games/`, `platforms/`) remain untouched
2. **Disable new structure**: Delete `users/{uid}/data/` document
3. **App automatically reverts**: Detects old structure and uses it
4. **No data loss**: All original data remains in old collections

To manually rollback:
```
1. Firebase Console → Firestore
2. Navigate to users/{uid}/data
3. Delete the entire document
4. Refresh app - should revert to old structure
```

## Success Criteria

✅ **Migration successful** when:
- Old structure data loads and works
- New structure data imports without errors
- App automatically detects and uses correct structure
- All CRUD operations work in both structures
- Performance metrics show improvement (fewer API calls)
- No data loss detected
- No error messages in console

## Files Modified/Created

### New Files
- `src/firebase/db-new-structure.service.js` (247 lines)
- `src/firebase/db-adapter.service.js` (196 lines)
- `TESTING_GUIDE.md` (this file)

### Modified Files
- `src/stores/modules/gameSync.js`
  - Changed to use adapter
  - Made setupGamesListener async
- `src/stores/game.store.js`
  - Added await to setupGamesListener call

### Unchanged Files
- `src/firebase/db.service.js` (still used for old structure)
- All Vue components (no changes needed)
- All other modules (compatible)

## Next Steps

After successful testing:
1. Delete old collections from Firebase (`games/`, `platforms/`)
2. Remove old structure fallback from adapter
3. Simplify code to use new structure only
4. Commit changes to git
5. Deploy to production

## Questions?

Check the:
- Migration plan: `MIGRATION_PLAN.md`
- Firebase structure backup: `FIREBASE_STRUCTURE_BACKUP.md`
- Transformation logic: `src/utils/dataMigration.js`
