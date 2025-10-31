# Firebase Data Structure Migration Plan

**Status:** Planning
**Date:** 2025-10-31
**Goal:** Optimize Firebase queries - from 1 API call per card to 1 API call per list

---

## Executive Summary

**Current Problem:** Each game card triggers a separate Firebase query = N+1 problem
**Solution:** Restructure data so lists are arrays grouped by status
**Benefit:** 1 query per list instead of 1 per item = significantly fewer API calls

---

## 1. CURRENT STRUCTURE

### Firebase Collections Layout
```
games/
  ├── game1 { title, status: "playing", platform, ... }
  ├── game2 { title, status: "completed", platform, ... }
  └── game3 { title, status: "playing", platform, ... }

platforms/
  ├── pc { name: "PC", color: "#fff", ... }
  └── switch { name: "Switch", color: "#000", ... }

notes/ (or games/{id}/notes subcollections)
  └── note1 { content, itemId, ... }
```

### JavaScript Structure in Store
```javascript
{
  games: [
    { id: "1", title: "Game 1", status: "playing", platform: "PC", notes: [...] },
    { id: "2", title: "Game 2", status: "completed", platform: "Switch", notes: [...] },
    { id: "3", title: "Game 3", status: "playing", platform: "PC", notes: [...] }
  ],
  platforms: [
    { id: "pc", name: "PC", color: "#fff" }
  ]
}
```

### JSON Export Format (Current)
```json
{
  "version": "2.0",
  "exportDate": "2025-10-31T13:28:37.103Z",
  "userEmail": "user@example.com",
  "mediaTypes": {
    "game": {
      "items": [
        { "id": "1", "title": "Game 1", "status": "playing", "platform": "PC", ... },
        { "id": "2", "title": "Game 2", "status": "completed", "platform": "Switch", ... }
      ],
      "categories": [
        { "id": "pc", "name": "PC", "color": "#fff" }
      ],
      "notes": [
        { "id": "n1", "itemId": "1", "content": "..." }
      ]
    }
  },
  "settings": { ... }
}
```

---

## 2. NEW STRUCTURE

### Firebase Collections Layout
```
users/{userId}/data/
  ├── metadata:
  │   ├── platforms[] { name, color, ... }
  │   ├── genres[] { name, color, ... }
  │   └── authors[] { name, color, ... }
  │
  └── lists:
      └── game: {
            "playing": [
              { id, title, platform, platformColor, notes, ... },
              { id, title, platform, platformColor, notes, ... }
            ],
            "completed": [ ... ],
            "upcoming": [ ... ],
            "willplay": [ ... ],
            "paused": [ ... ],
            "dropped": [ ... ]
          }
      └── movie: {
            "playing": [ ... ],
            "completed": [ ... ],
            ...
          }
      └── book: { ... }
```

### JavaScript Structure in Store
```javascript
{
  metadata: {
    platforms: [{ id, name, color, ... }],
    genres: [{ id, name, color, ... }],
    authors: [{ id, name, color, ... }]
  },
  lists: {
    game: {
      playing: [{ id, title, notes, ... }, ...],
      completed: [...],
      upcoming: [...],
      willplay: [...],
      paused: [...],
      dropped: [...]
    },
    movie: { ... },
    book: { ... }
  }
}
```

### JSON Export Format (New)
```json
{
  "version": "3.0",
  "exportDate": "2025-10-31T13:28:37.103Z",
  "userEmail": "user@example.com",
  "data": {
    "metadata": {
      "platforms": [
        { "id": "pc", "name": "PC", "color": "#fff", ... }
      ]
    },
    "lists": {
      "game": {
        "playing": [
          { "id": "1", "title": "Game 1", "platform": "PC", "platformColor": "#fff", "notes": [...], ... }
        ],
        "completed": [
          { "id": "2", "title": "Game 2", "platform": "Switch", "notes": [...], ... }
        ],
        "upcoming": [],
        "willplay": [],
        "paused": [],
        "dropped": []
      }
    }
  },
  "settings": { ... }
}
```

---

## 3. COMPARISON: BEFORE vs AFTER

| Aspect | Current | New |
|--------|---------|-----|
| **API Calls** | 1 call per list + 1 call per card | 1 call per list |
| **Data Redundancy** | Flat list, grouped in JS | Pre-grouped in DB |
| **Query Complexity** | Query by userId + sort | Single document read |
| **Update Pattern** | Update individual docs | Update array elements |
| **Scalability** | Degrades with more cards | Constant performance |

---

## 4. MIGRATION ROADMAP

### Phase 1: Backup & Export
- [x] Create export/import functionality
- [ ] **Export all current data** (keeps as backup)
- [ ] Verify export file has all data

### Phase 2: Create Transformation Layer
- [ ] Build transformation script (old format → new format)
- [ ] Test transformation locally
- [ ] Validate transformed data

### Phase 3: Refactor Code
- [ ] Update `gameSync.js` to use new list structure
- [ ] Update `gameOperations.js` with new CRUD operations
- [ ] Update `gameNotes.js` for notes in items
- [ ] Update all Vue components to work with new structure
- [ ] Update `useDataExport.js` and `useDataImport.js`

### Phase 4: Deploy to Firebase
- [ ] Create new collection structure in Firebase
- [ ] Run transformation + import on test user first
- [ ] Verify test user data looks correct
- [ ] Import your production data using transformation

### Phase 5: Testing & Validation
- [ ] Test all CRUD operations
- [ ] Test search functionality
- [ ] Test filtering by status
- [ ] Test notes functionality
- [ ] Verify API call reduction

### Phase 6: Cleanup
- [ ] Delete old collection structure (after verification)
- [ ] Update backup export format

---

## 5. FILES THAT NEED CHANGES

### Core Logic Changes
```
src/stores/modules/gameSync.js          (Firebase real-time listeners)
src/stores/modules/gameOperations.js    (CRUD operations)
src/stores/modules/gameNotes.js         (Notes handling)
src/stores/modules/gameValidation.js    (Validation rules)
```

### Composables Changes
```
src/composables/useDataExport.js        (New export format)
src/composables/useDataImport.js        (New import format + transformation)
```

### Component Changes
```
src/views/HomeView.vue                  (Restructure game display)
src/components/GameList.vue             (Update to use new structure)
src/components/GameCard.vue             (Minor updates if needed)
```

### Firebase Service
```
src/firebase/db.service.js              (Update collection paths)
```

---

## 6. TRANSFORMATION SCRIPT SPECIFICATION

### Input
```json
{
  "version": "2.0",
  "mediaTypes": {
    "game": {
      "items": [...],
      "categories": [...],
      "notes": [...]
    }
  }
}
```

### Output
```json
{
  "version": "3.0",
  "data": {
    "metadata": {
      "platforms": [...]  // renamed from categories
    },
    "lists": {
      "game": {
        "playing": [...items with status="playing" + notes],
        "completed": [...],
        ...
      }
    }
  }
}
```

### Algorithm
```javascript
function transformData(oldExport) {
  const newData = {
    metadata: {},
    lists: {}
  };

  // For each media type (game, movie, book)
  for (const mediaType of Object.keys(oldExport.mediaTypes)) {
    const oldData = oldExport.mediaTypes[mediaType];

    // Store categories as metadata
    newData.metadata[categoryName] = oldData.categories;

    // Group items by status
    newData.lists[mediaType] = {};

    for (const status of statusList) {
      newData.lists[mediaType][status] = oldData.items
        .filter(item => item.status === status)
        .map(item => ({
          ...item,
          notes: oldData.notes.filter(n => n.itemId === item.id)
        }));
    }
  }

  return newData;
}
```

---

## 7. MIGRATION STEPS (DETAILED)

### Step 1: Export Current Data
```bash
1. Click "Eksporter" button in sidebar
2. Save file as: backup-before-migration-2025-10-31.json
3. Keep this file as emergency backup
```

### Step 2: Build & Test Transformation
```bash
1. Create src/utils/dataMigration.js
2. Implement transformation function
3. Test locally:
   - Load old export JSON
   - Transform it
   - Validate structure
   - Check all data is preserved
```

### Step 3: Create Test User
```bash
1. In Firebase Console, create new test user
2. Log in with test account
3. Add dummy data (small dataset)
4. Export test data
5. Transform it
6. Import it back
7. Verify it works
```

### Step 4: Update Firebase Schema (Test First)
```bash
1. Create new collection structure (test user)
2. Import transformed data
3. Test reads/writes
4. If OK: repeat for production
```

### Step 5: Code Refactoring
```bash
1. Update gameSync.js to read from new structure
2. Update gameOperations.js for new CRUD
3. Update GameList.vue to work with new lists
4. Test thoroughly
```

### Step 6: Final Migration
```bash
1. Export production data
2. Transform it
3. Create backup of old Firebase data (export)
4. Import transformed data to production
5. Test everything works
6. Monitor for 24 hours
7. If OK: delete old collections
```

---

## 8. TESTING STRATEGY

### Unit Tests
- [ ] Transformation function converts data correctly
- [ ] All items and notes are preserved
- [ ] No data loss
- [ ] Categories renamed properly

### Integration Tests
- [ ] Export works with new format
- [ ] Import works with new format
- [ ] CRUD operations work
- [ ] Filtering by status works
- [ ] Search still works
- [ ] Notes functionality preserved

### User Acceptance Tests
- [ ] Add new game → appears in list
- [ ] Delete game → disappears
- [ ] Move game between lists → works
- [ ] Add note → displays
- [ ] Favorite toggle → works
- [ ] Completion date → saved

### Performance Tests
- [ ] Measure API calls before/after
- [ ] Verify reduction in queries
- [ ] Check load time improvement

---

## 9. FALLBACK PROCEDURES

### If Transformation Fails
```
1. Stop immediately
2. Don't import corrupted data
3. Restore from backup export
4. Fix transformation logic
5. Re-test before trying again
```

### If Import Fails
```
1. Keep old Firebase data intact
2. Don't delete old collections
3. Debug import function
4. Fix issues
5. Try with test user again
```

### If App Breaks After Migration
```
1. Revert code to previous version
2. Keep new Firebase structure (don't delete)
3. Fix code issues
4. Re-deploy
5. OR restore from backup if needed
```

### Emergency Rollback
```
1. Keep old export file (backup-before-migration-2025-10-31.json)
2. If everything fails, can import old format again
3. Switch app back to old code
4. Slowly migrate again when ready
```

---

## 10. ROLLBACK PLAN

### Before Starting
- [ ] Export complete backup
- [ ] Git commit all code changes
- [ ] Create branch for migration

### If You Need to Rollback
```bash
1. Switch to old code branch
2. Delete new Firebase collections
3. Restore from old export using old import logic
4. Test everything works
5. Plan what went wrong
6. Fix and try again later
```

---

## 11. TIMELINE ESTIMATE

| Phase | Task | Duration | Difficulty |
|-------|------|----------|-----------|
| 1 | Backup & Export | 15 min | Easy |
| 2 | Build transformation | 2-3 hours | Medium |
| 2 | Test transformation | 1-2 hours | Medium |
| 3 | Code refactoring | 4-6 hours | Hard |
| 4 | Deploy to Firebase | 1 hour | Medium |
| 5 | Testing & validation | 2-3 hours | Medium |
| 6 | Cleanup | 30 min | Easy |
| **Total** | | **10-16 hours** | |

---

## 12. DECISION POINTS

### Before Phase 3 (Code Refactoring)
- [ ] Confirm transformation script works perfectly
- [ ] Confirm test user migration successful
- [ ] Confirm performance improvement is worthwhile
- [ ] Have time to complete and test?

### Before Phase 4 (Firebase Deployment)
- [ ] All code changes tested locally?
- [ ] Backup export file secure?
- [ ] Ready to commit 3-4 hours to migration?

### Before Phase 6 (Cleanup)
- [ ] App works for 24 hours without issues?
- [ ] All features tested and working?
- [ ] No bugs reported?

---

## 13. SUCCESS CRITERIA

- ✅ All data migrated without loss
- ✅ API calls reduced by ~80%
- ✅ App works identical to before (functionally)
- ✅ No performance regressions
- ✅ All CRUD operations work
- ✅ Notes preserved
- ✅ Can export/import again with new format

---

## Next Steps

1. **Review this plan** - any changes needed?
2. **Start Phase 1** - export backup now (safe)
3. **Then Phase 2** - build transformation script
4. **Test locally** before touching Firebase

Ready to proceed?
