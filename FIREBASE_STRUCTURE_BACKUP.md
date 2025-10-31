# Firebase Structure Documentation & Rollback Plan

**Purpose:** Document current Firebase structure so we can roll back if migration fails
**Created:** 2025-10-31
**Backup Export File:** `mediatrack-backup-2025-10-31.json`

---

## 1. CURRENT FIREBASE STRUCTURE (BEFORE MIGRATION)

### Collections Overview

```
Firestore Database Root
├── games/                          (Collection)
│   ├── game1 { title, status, platform, ... }
│   ├── game2 { title, status, platform, ... }
│   └── ...
│   └── notes/                      (Subcollection per game)
│       ├── note1 { content, ... }
│       └── note2 { content, ... }
│
├── platforms/                      (Collection - categories for games)
│   ├── pc { name, color, ... }
│   ├── steam { name, color, ... }
│   └── ...
│
├── mediaTypes/                     (For future movie/book support)
│   ├── movie/
│   │   ├── movies/                 (Collection)
│   │   │   ├── movie1 { ... }
│   │   │   └── ...
│   │   └── genres/                 (Categories for movies)
│   │       ├── genre1 { ... }
│   │       └── ...
│   │
│   └── book/
│       ├── books/                  (Collection)
│       │   ├── book1 { ... }
│       │   └── ...
│       └── authors/                (Categories for books)
│           ├── author1 { ... }
│           └── ...
│
└── users/                          (User profiles)
    ├── user1 { name, email, ... }
    └── ...
```

### Collection Paths by Media Type

| Media Type | Items Collection | Categories Collection |
|------------|------------------|----------------------|
| **game** | `games` | `platforms` |
| **movie** | `mediaTypes/movie/movies` | `mediaTypes/movie/genres` |
| **book** | `mediaTypes/book/books` | `mediaTypes/book/authors` |

---

## 2. CURRENT DATA SCHEMA

### Games/Items Document Structure

```javascript
{
  id: "KEyxTNqz6K8CV01F13ow",           // Document ID
  title: "The Forever Winter",           // String
  platform: "Steam",                     // String (category name)
  platformColor: "#000000",              // String (hex color)
  status: "upcoming",                    // String (enum)
  favorite: false,                       // Boolean
  order: 0.5,                            // Number (for sorting)
  createdAt: 1727371542786,              // Number (timestamp ms)
  updatedAt: {                           // Firestore Timestamp
    seconds: 1754648782,
    nanoseconds: 88000000
  },
  completionDate: "07-05-2024",          // String (optional)
  userId: "JHMGvahkGRaDGj2ZCOETrxYaK4W2" // String (FK to user)
}
```

### Status Values (for games)

```javascript
// Valid status values
{
  "upcoming": "Ser frem til",
  "willplay": "Vil spille",
  "playing": "Spiller nu",
  "completed": "Gennemført",
  "paused": "På pause",
  "dropped": "Droppet"
}
```

### Categories/Platform Document Structure

```javascript
{
  id: "kdosPSGeURl34K6Phs36",            // Document ID
  name: "Xbox",                          // String
  color: "#0e5d0e",                      // String (hex color)
  userId: "JHMGvahkGRaDGj2ZCOETrxYaK4W2", // String (FK to user)
  createdAt: 1725366619397,              // Number (timestamp ms)
  updatedAt: {                           // Firestore Timestamp
    seconds: 1754648782,
    nanoseconds: 88000000
  }
}
```

### Notes Document Structure (Subcollection)

```javascript
// Path: games/{gameId}/notes/{noteId}
{
  id: "note1",                           // Document ID
  content: "Great game, loved it!",      // String
  userId: "JHMGvahkGRaDGj2ZCOETrxYaK4W2", // String (FK to user)
  createdAt: 1725366619397,              // Number (timestamp ms)
  updatedAt: {                           // Firestore Timestamp
    seconds: 1754648782,
    nanoseconds: 88000000
  }
}
```

---

## 3. CURRENT DATA IN YOUR DATABASE

### Confirmed Data Count (as of 2025-10-31)

```
Games by Status:
├── Ser frem til (upcoming):    6 games
├── Vil spille (willplay):     31 games
├── Spiller nu (playing):       4 games
├── Gennemført (completed):   183 games
├── På pause (paused):         13 games
└── Droppet (dropped):         10 games
                              ─────────
                    TOTAL:     247 games

Platforms/Categories:          11 platforms
├── Steam
├── PlayStation
├── Nintendo Switch
├── Xbox
├── GamePass
├── GOG
├── Epic
├── Stadia
├── EA
├── Andet
└── (1 more)

Notes:                           0 notes
```

---

## 4. CODE STRUCTURE (How Data is Read)

### Firebase Query Path (in `db.service.js`)

```javascript
function getCollectionPath() {
  const mediaTypeStore = useMediaTypeStore();
  const mediaType = mediaTypeStore.currentType; // 'game', 'movie', 'book'

  if (mediaType === 'game') {
    return 'games';  // Direct path
  } else {
    const itemsCollection = mediaTypeStore.config.collections.items;
    const categoryCollection = mediaTypeStore.config.collections.categories;
    return `mediaTypes/${mediaType}/${itemsCollection}`;
  }
}
```

### How App Loads Data

```
User selects media type (game)
    ↓
gameSync.js creates listener
    ↓
Query: collection('games').where('userId', '==', uid)
    ↓
Load all games into games.value array
    ↓
categoryStore loads platforms
    ↓
App displays games by status in HomeView.vue
```

---

## 5. CRITICAL FILES FOR CURRENT STRUCTURE

### Core Files Using This Structure

```
src/stores/modules/gameSync.js          (Reads from games collection)
src/stores/modules/gameOperations.js    (CRUD operations)
src/stores/modules/gameNotes.js         (Notes subcollections)
src/firebase/db.service.js              (Collection path logic)
src/views/HomeView.vue                  (Displays games by status)
src/components/GameList.vue             (Lists games)
src/components/GameCard.vue             (Individual game display)
```

---

## 6. ROLLBACK PROCEDURE (IF MIGRATION FAILS)

### Step 1: Stop the Migration ⚠️

If anything goes wrong:
1. **Stop immediately** - do not continue
2. **Do NOT delete** the old collections
3. **Revert code** to previous working version

### Step 2: Restore Old Code

```bash
# In your IDE
git checkout main

# This reverts:
# - gameSync.js
# - gameOperations.js
# - db.service.js
# - Vue components
# - Back to old structure code
```

### Step 3: Keep Old Firebase Collections

```
DO NOT DELETE:
✓ games/           (keep as is)
✓ platforms/       (keep as is)
✓ mediaTypes/      (keep as is)

You can have BOTH old and new collections
while you debug what went wrong
```

### Step 4: Import Old Backup Using Old App

```
1. Keep your backup file: mediatrack-backup-2025-10-31.json
2. In old app code (reverted), click "Importer data"
3. Select your backup file
4. Choose "Merge" (NOT replace) to add back your data
5. Verify all games appear correctly
```

### Step 5: Diagnose the Problem

```
With old structure working again:
- Review what went wrong in migration
- Check transformation script output
- Verify new Firebase structure was correct
- Test with smaller subset of data next time
```

---

## 7. EMERGENCY FALLBACK (Total Meltdown)

If everything is completely broken:

### Have These Files Safe:

- ✅ `mediatrack-backup-2025-10-31.json` - Your complete backup
- ✅ This document - Current structure documentation
- ✅ Git history - Can revert to any previous commit

### Worst Case Recovery:

```
1. Delete all new Firebase collections
2. Revert code to main branch
3. Use old code with old collections (they still exist)
4. Import backup using old import function
5. Everything back to Oct 31st state
```

---

## 8. SAFETY CHECKLIST BEFORE MIGRATION

- [ ] Backup file created and verified: `mediatrack-backup-2025-10-31.json` ✅
- [ ] Backup file tested to be importable with current code ✅
- [ ] This document saved and reviewed
- [ ] Git branch created for migration work
- [ ] All old code committed to git
- [ ] Firebase collections NOT deleted yet
- [ ] Transformation script created and tested locally
- [ ] Test user created in Firebase for first test
- [ ] Understood: Can rollback at any point

---

## 9. DECISION TREE FOR ROLLBACK

```
If mutation fails at step X:

Step 1-2 (Backup): Rollback is instant
├─ Just revert git commit
├─ Firebase not touched yet
└─ Zero risk

Step 3 (Refactor code): Rollback takes 30 min
├─ Revert code changes
├─ Keep both old + new collections
├─ Test with old collections
├─ Fix and try again

Step 4 (Firebase): Rollback takes 1-2 hours
├─ New collections exist alongside old
├─ Revert code to use old collections
├─ Import backup using old import
├─ Verify old data restored
├─ Debug what went wrong with new structure

Step 5-6 (Testing): Rollback = Start over
├─ New collections in use but broken
├─ Revert code completely
├─ Keep new collections (don't delete)
├─ Import backup
├─ Plan new migration carefully
```

---

## 10. SIGNS YOU NEED TO ROLLBACK

### Stop if any of these happen:

❌ **Critical Issues:**
- App won't load after code changes
- Games disappear or show incorrect data
- Can't create new games
- Search stops working
- Crash on app start

❌ **Data Issues:**
- Data appears corrupted
- Games in wrong status
- Duplicate games appear
- Notes/platforms missing

❌ **Firebase Issues:**
- Firestore writes fail
- Queries return empty
- Permission errors on new collections

❌ **Import/Export Issues:**
- Transformation changes data incorrectly
- Import hangs or crashes
- Old backup can't be imported anymore

### If any of above occur:
1. **Stop immediately** (don't debug further)
2. **Use rollback procedure from Section 6**
3. **Document what went wrong**
4. **Plan fix carefully**

---

## 11. MIGRATION SUCCESS CRITERIA

You can proceed if ALL of these are true:

- ✅ App loads normally
- ✅ All 247 games appear in correct status
- ✅ Can create new game
- ✅ Can delete game
- ✅ Can move game between status lists
- ✅ Platforms/categories work
- ✅ Search still works
- ✅ No errors in console
- ✅ No data corruption
- ✅ Performance improved (fewer API calls)

---

## 12. FILES & LOCATIONS TO KNOW

### Your Backup File
```
Location: C:\Users\mikke\Downloads\mediatrack-backup-2025-10-31 (2).json
Backup:   Keep multiple copies somewhere safe
Size:     ~500KB
Format:   Valid JSON (verified)
```

### This Documentation
```
Location: C:\Users\mikke\Desktop\gametracker-v2-vueJS\FIREBASE_STRUCTURE_BACKUP.md
Purpose:  Restore procedure if needed
Keep:     Always available in repo
```

### Git Branches
```
main:                Current stable code
migration-branch:    Create for migration work
                     So you can switch back easily
```

---

## 13. CONTACT POINTS FOR HELP

If migration fails and you're stuck:

### What to check first:
1. Read this document section 6 (Rollback Procedure)
2. Check git history to see what code changed
3. Verify Firebase collections still exist
4. Try importing old backup to test if old code still works

### Information to have ready:
- What step did it fail at?
- What error appears?
- Did data get corrupted or deleted?
- Which collections exist in Firebase?
- Can you revert code and get old version working?

---

## SUMMARY

| Aspect | Current | Backup |
|--------|---------|--------|
| **Data Location** | Firebase collections | JSON file |
| **Format** | Firestore documents | JSON format |
| **Size** | ~247 games in live DB | ~500KB JSON file |
| **Recovery Time** | N/A (source) | 5 minutes |
| **Rollback Speed** | Instant (revert code) | 30 min import |
| **Risk Level** | Changing structure | None (backup) |

---

**You are prepared! Proceed when ready.** ✅

Next step: Build transformation script to convert old JSON → new JSON structure
