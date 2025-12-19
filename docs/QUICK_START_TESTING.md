# Quick Start: Testing the New Firebase Structure

Hej Mikkel! Her er hurtig guide til at teste den nye struktur.

## Workflow

### Step 1: Export Your Data

Den nye export bruger v3.0 format (pre-grouped by status). Hvis du vil backup alt:

```
1. Gå til Games i appen
2. Tryk "Export Data" (i Settings)
3. Gem filen: mediatrack-backup-2025-10-31.json (v3.0 format)

Gentag for Movies og Books hvis du vil:
4. Gå til Movies → Export
5. Gå til Books → Export
```

**Note**: Du kan også bare exportere Games først - det er det vigtigste data.

### Step 2: Test With Current Structure (Backwards Compatibility)

```
1. Login og se dine Games
2. Check Console (F12 → Console)
3. Du skulle se: "Using old Firebase structure (v2.0)"
4. Test: Tilføj et spil, rediger, slet, osv.
5. Alt skulle virke som før ✅
```

### Step 3: Import the Data

```
1. Gå til Settings → "Import Data"
2. Vælg filen: mediatrack-backup-2025-10-31.json
3. Vælg: "Replace existing data" (eller ikke, import merger som default)
4. Tryk "Import"
5. Vent på færdig
```

**Hvad sker der**:
- Ny struktur oprettes: `users/{uid}/data/lists`
- Gamle struktur (`games/`) bliver
- Data vises under begge strukturer

### Step 4: Test With New Structure

```
1. Refresh siden (F5)
2. Check Console igen
3. Du skulle nu se: "Using new Firebase structure (v3.0)"
4. Test samme operationer som før:
   - Tilføj spil
   - Rediger titel
   - Flyt til anden status
   - Slet spil
5. Alt skulle virke + være hurtigere ✅
```

### Step 5: Check Firebase

For at se den nye struktur:

```
1. Firebase Console → Firestore Database
2. Collections → users → [your-uid] → data
3. Du skulle se to documents:
   ✓ lists (indeholder games/movies/books)
   ✓ metadata (indeholder platforms/genres/authors)
```

Structure ser sådan ud:

```
users/{uid}/data/
  ├── lists
  │   └── game
  │       ├── upcoming: [items]
  │       ├── willplay: [items]
  │       ├── playing: [items]
  │       ├── completed: [items]
  │       ├── paused: [items]
  │       └── dropped: [items]
  └── metadata
      └── platforms: [categories]
```

## Expected Results

### ✅ Success Indicators

1. **Old structure works**: Spil loader som før
2. **New structure works**: Efter import, bruger app ny struktur
3. **No errors**: Console er clean, ingen fejl
4. **Data preserved**: Alle 247 spil er der stadig
5. **Faster loading**: Bemærk færre API calls (Network tab)
6. **All CRUD works**: Add, edit, move, delete - alt virker i begge strukturer

### 🔄 Performance Check

```
Network tab (F12 → Network):
- Old structure: ~250+ requests (1 per game)
- New structure: ~1 request (alle games på en gang)
```

## If Something Goes Wrong

### Issue: Stadig "Using old Firebase structure"
```
1. Check: Import successfully? (Import dialog said "Success"?)
2. Check Firebase: users/{uid}/data/lists exists?
3. Løsning: Luk browserens cache (Ctrl+Shift+Delete)
4. Luk app og åbn igen
```

### Issue: Import fejler
```
1. Check: JSON format valid? (Prøv i VS Code)
2. Check: Exported fra samme bruger?
3. Prøv igen med mindre fil først
```

### Issue: Data mangler efter import
```
1. Check: Import sagde hvor mange items importeret?
2. Check Firebase: Data der i ny struktur?
3. Rollback: Slet users/{uid}/data/ - app vender tilbage til old structure
```

## Rollback (If Needed)

Hvis noget går galt, bare:

```
1. Firebase Console → Firestore
2. users → [your-uid] → data
3. Delete hele data dokumentet
4. Refresh app
5. App vender tilbage til old struktur ✅
```

Alt er der stadig, intet data tabt!

## Files to Know About

- `src/firebase/db-new-structure.service.js` - Ny service
- `src/firebase/db-adapter.service.js` - Switcher mellem old/new
- `src/composables/useDataExport.js` - Updated export
- `TESTING_GUIDE.md` - Detaljeret testing guide
- `MIGRATION_STATUS.md` - Status rapport

## Questions?

Hvis noget ikke virker som forventet, check:
1. Browser console for fejl
2. Firebase console for data
3. TESTING_GUIDE.md for detaljer
4. Check at Firebase regler tillader skrivning

---

**Ready to test?** Go ahead and try the steps above!
