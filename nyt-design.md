# MediaTrack v2.1 - Nyt Minimalistisk Design

## Design Vision
Vi redesigner MediaTrack til et rent, minimalistisk interface inspireret af moderne dashboards (Dribbble-stil). Fokus på funktionalitet frem for visuel støj.

## Design Principper

### 1. **Minimal & Flat Design**
- Ingen gradienter eller skygger
- Flad baggrund med enkle farver
- Rene linjer og simpel geometri
- Fokus på indhold frem for dekoration

### 2. **Konsistent Spacing & Typography**
- Kompakt design med mindre padding/margins
- Konsistent spacing system
- Tydelig hierarki i tekststørrelser
- Rene, læsbare skrifttyper

### 3. **Funktionel Navigation**
- Brugerinfo øverst i sidebar (som moderne apps)
- Action-baserede ikoner (+ for tilføj, ⚙️ for indstillinger)
- Direkte adgang til funktioner
- Minimal kognitiv belastning

### 4. **Clean Color Palette**
```css
/* Hovedfarver */
--primary-bg: #1f2937          /* Mørk sidebar baggrund */
--hover-bg: rgba(255,255,255,0.1)  /* Hover tilstande */
--active-bg: rgba(255,255,255,0.15) /* Aktive elementer */
--border: rgba(255,255,255,0.1)     /* Subtile borders */
--text: var(--text-color)           /* Primær tekst */
```

## Gennemførte Komponenter

### ✅ AppSidebar.vue
**Status:** Komplet redesign gennemført

**Ændringer:**
- Fjernet alle gradienter og skygger
- Flyttet brugerinfo til top med action knapper
- Erstattet settings gear (⚙️) med add knapper (➕)
- Fjernet count badges for cleanere look
- Fjernet runde hjørner på sidebar
- Kompakte footer actions (indstillinger + log ud)
- Forenklet hover/active states
- Bevaret al MediaTrack funktionalitet

**Resultat:** Modern, minimal sidebar der matcher Dribbble-inspiration

## Kommende Komponenter (Prioriteret)

### 🔄 GameCard.vue
**Nuværende udfordringer:**
- Komplekse gradienter og skygger
- Tung visual styling
- Ikke konsistent med ny sidebar

**Planlagte ændringer:**
- Flat card design med subtile borders
- Forenklet hover states
- Kompaktere layout
- Konsistent med sidebar styling

### 🔄 GameList.vue
**Fokusområder:**
- List view med minimal spacing
- Konsistent med card design
- Forenklet sort/filter controls

### 🔄 Modal Components
**SimplerModal.vue og relaterede:**
- Flat modal design uden skygger
- Konsistent button styling
- Minimal form layouts

### 🔄 Mobile Navigation
**MobileNavigation.vue:**
- Konsistent med desktop sidebar
- Flat design principper
- Touch-venlige targets

### 🔄 Settings Components
**PlatformManager.vue, SettingsManager.vue:**
- Forenklet form styling
- Konsistent med main design
- Kompakte input fields

## Design Guidelines for Development

### CSS Patterns at Undgå
```css
/* UNDGÅ disse patterns */
background: linear-gradient(...)
box-shadow: var(--shadow-*)
filter: blur(...)
animation: komplekse-animationer
border-radius: store-værdier
```

### CSS Patterns at Bruge
```css
/* BRUG disse patterns */
background: solid-farver eller rgba()
border: 1px solid rgba(255,255,255,0.1)
border-radius: 0 eller max 4px
transition: simple-properties 0.2s
opacity: til hover/focus states
```

### Spacing System
```css
/* Konsistent spacing */
--space-xs: 0.25rem  /* 4px */
--space-sm: 0.5rem   /* 8px */  
--space-md: 0.75rem  /* 12px */
--space-lg: 1rem     /* 16px */
--space-xl: 1.25rem  /* 20px */
```

## Implementation Strategi

1. **Prioriter core components** (GameCard, GameList)
2. **En komponent ad gangen** for at undgå breaking changes
3. **Bevår funktionalitet** - kun visual redesign
4. **Test på mobile** efter hver ændring
5. **Commit små ændringer** for bedre tracking

## Success Metrics

- [ ] Konsistent flat design på tværs af app
- [ ] Reduceret visual støj
- [ ] Bevaret bruger workflow
- [ ] Forbedret mobile experience
- [ ] Hurtigere perceived performance

## Referencer

- **Inspiration:** Dribbble minimal dashboard designs
- **Existing codebase:** MediaTrack v2.1 arkitektur
- **Farver:** Bevar nuværende dark theme palette
- **Funktionalitet:** Ingen ændringer i user flow

---

*Dokumentet opdateres løbende som redesignet skrider frem.*