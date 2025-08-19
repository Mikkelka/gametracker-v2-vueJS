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

### ✅ GameList.vue  
**Status:** Minimalistisk redesign gennemført

### ✅ HomeView.vue
**Status:** Main container redesign gennemført

### ✅ GameCard.vue
**Status:** Minimalistisk redesign gennemført

### ✅ SimplerModal.vue
**Status:** Minimal flat design gennemført

### ✅ MobileNavigation.vue
**Status:** Minimal flat design gennemført

### ✅ PlatformManager.vue
**Status:** Minimal flat design gennemført

### ✅ SettingsManager.vue
**Status:** Minimal flat design gennemført

### ✅ DashboardView.vue
**Status:** Minimal flat design gennemført

### ✅ LoginView.vue
**Status:** Minimal flat design gennemført

### ✅ Edit-menu (HomeView.vue)
**Status:** Minimal flat design gennemført

### ✅ Platform-tag-menu (HomeView.vue) 
**Status:** Minimal flat design gennemført

**Ændringer:**

**AppSidebar.vue:**
- Fjernet alle gradienter og skygger
- Flyttet brugerinfo til top med action knapper  
- Erstattet emoji ikoner med Lucide Vue ikoner
- Fjernet count badges og settings gear ikoner
- Fjernet runde hjørner på sidebar
- Kompakte footer actions
- Forenklet hover states

**GameList.vue:**
- Fjernet komplekse list wrappers og borders
- Forenklet header styling (ingen baggrund/borders)
- Erstattet emoji status ikoner med Lucide ikoner
- Fjernet farvet header linje
- Minimalistiske count badges
- Transparent baggrund

**GameCard.vue:**
- Fjernet alle gradienter, skygger og animationer
- Flat `rgba(255,255,255,0.05)` baggrund
- `border-radius: 0` for konsistent flat design
- Forenklet hover states
- Kompaktere layout

**HomeView.vue:**  
- Main container nu `#111827` baggrund for kontrast
- Fjernet padding fra main, flyttet til listsContainer
- Edge-to-edge layout
- Konsistent styling på tværs af app

**SimplerModal.vue:**
- Fjernet alle gradienter og animationer
- Solid `#1f2937` baggrund
- Forenklet knap styling uden gradienter
- `border-radius: 0` på modal container
- Minimal hover states

**MobileNavigation.vue:**
- Fjernet komplekse gradienter og animationer
- Solid `#1f2937` baggrund
- Forenklet dropdown menuer
- Flat design principper
- Kompaktere toggle switches

**PlatformManager.vue:**
- Forenklet form styling med `rgba` baggrunde
- Konsistent input field design
- Kompakte color pickers
- Minimal list item styling

**SettingsManager.vue:**
- Moderne toggle switches med flat design
- Forenklet form layout
- Konsistent button styling
- Minimal spacing system

**DashboardView.vue:**
- Fjernet alle komplekse gradienter og animationer
- Forenklet tracker cards med `rgba(255,255,255,0.05)` baggrund
- Solid farver på knapper uden gradienter
- Minimal hover states uden transforms
- Forenklet form inputs og version styling

**LoginView.vue:**
- Forenklet login container med minimal styling
- Opdateret Google login knap til fladt design
- Konsistent typografi og spacing
- Forbedret responsive layout

**Edit-menu (HomeView.vue):**
- Fjernet alle gradienter og komplekse animationer
- Solid `#1f2937` baggrund med minimal border
- Forenklet icon knapper uden transforms
- Flat hover states med `rgba(255,255,255,0.1)`
- Konsistent `border-radius: 6px` på desktop, 0 på mobile

**Platform-tag-menu (HomeView.vue):**
- Samme minimal styling som edit-menu
- Fjernet alle gradienter og skygger
- Forenklet hover states uden transforms
- Konsistent border-radius og spacing
- Mobile-optimeret uden animationer

**Resultat:** KOMPLET minimalistisk design system på tværs af HELE applikationen inklusive context menuer

## Redesign Status

✅ **ALLE KOMPONENTER GENNEMFØRT**

MediaTracker applikationen er nu FULDSTÆNDIGT redesignet til et konsistent minimalistisk design system. Dette inkluderer:

- **Layout komponenter**: AppSidebar, MobileNavigation
- **Game komponenter**: GameList, GameCard  
- **UI komponenter**: SimplerModal
- **Management komponenter**: PlatformManager, SettingsManager
- **View komponenter**: HomeView, DashboardView, LoginView
- **Context menuer**: Edit-menu, Platform-tag-menu (i HomeView.vue)

Alle komponenter og menuer følger de samme design principper og bruger identiske styling patterns for et sammenhængende brugeroplevelse på tværs af hele applikationen.

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

- [x] Konsistent flat design på tværs af app
- [x] Reduceret visual støj
- [x] Bevaret bruger workflow
- [x] Forbedret mobile experience
- [x] Hurtigere perceived performance

🎉 **ALLE MÅLSÆTNINGER OPNÅET**

## Referencer

- **Inspiration:** Dribbble minimal dashboard designs
- **Existing codebase:** MediaTrack v2.1 arkitektur
- **Farver:** Bevar nuværende dark theme palette
- **Funktionalitet:** Ingen ændringer i user flow

---

*Dokumentet opdateres løbende som redesignet skrider frem.*