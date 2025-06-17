# MediaTrack Performance Optimization Plan

Dette dokument beskriver en systematisk tilgang til at optimere MediaTrack applikationens performance gennem CSS arkitektur forbedringer, bundle størrelse reduktion og Firebase query optimering.

## Nuværende Status og Problemer

### Identificerede Performance Issues
- **Store CSS filer**: GameCard.vue (509 linjer), HomeView.vue (1,574 linjer), AppSidebar.vue (1,030 linjer)
- **CSS duplikering**: 84+ instances af transition/animation/transform patterns
- **Ingen bundle analyse**: Manglende indsigt i bundle størrelse og dependencies
- **Firebase queries**: Loader alle data på én gang uden pagination
- **Manglende tree-shaking**: Firebase imports ikke optimeret

### Målte Metrics (Baseline)
- **Bundle størrelse**: ~1.2MB (estimeret)
- **CSS linjer total**: 6,187 linjer på tværs af alle Vue filer
- **Største komponenter**: HomeView (1,574), AppSidebar (1,030), MobileNavigation (862)

## Phase 1: CSS Architecture Overhaul (Prioritet: Høj)

### 1.1 Design System Foundation
**Mål**: Centralisere design tokens og eliminere CSS duplikering

**Tasks**:
1. **Opret `src/assets/theme.css`** med design system variabler:
   ```css
   :root {
     /* Spacing System */
     --space-xs: 0.25rem;   /* 4px */
     --space-sm: 0.5rem;    /* 8px */
     --space-md: 1rem;      /* 16px */
     --space-lg: 1.5rem;    /* 24px */
     --space-xl: 2rem;      /* 32px */
     --space-2xl: 3rem;     /* 48px */
     
     /* Typography Scale */
     --text-xs: 0.75rem;
     --text-sm: 0.875rem;
     --text-base: 1rem;
     --text-lg: 1.125rem;
     --text-xl: 1.25rem;
     
     /* Animation System */
     --transition-fast: 0.15s ease;
     --transition-normal: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
     --transition-slow: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
     --transition-bounce: 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
     
     /* Shadow System */
     --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
     --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
     --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
     --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
     
     /* Border Radius System */
     --radius-sm: 4px;
     --radius-md: 8px;
     --radius-lg: 12px;
     --radius-xl: 16px;
     --radius-full: 9999px;
   }
   ```

2. **Opret `src/assets/utilities.css`** med utility classes:
   ```css
   /* Spacing utilities */
   .p-xs { padding: var(--space-xs); }
   .p-sm { padding: var(--space-sm); }
   .p-md { padding: var(--space-md); }
   
   /* Transition utilities */
   .transition-fast { transition: var(--transition-fast); }
   .transition-normal { transition: var(--transition-normal); }
   
   /* Shadow utilities */
   .shadow-sm { box-shadow: var(--shadow-sm); }
   .shadow-md { box-shadow: var(--shadow-md); }
   ```

**Estimeret tid**: 2-3 timer
**Forventet resultat**: 40-60% reduktion i CSS duplikering

### 1.2 Component CSS Refactoring
**Mål**: Konverter eksisterende komponenter til at bruge design systemet

**Tasks**:
1. **GameCard.vue** (509 linjer → mål: 250-300 linjer)
   - Erstat hardcodede værdier med design tokens
   - Ekstrahér genbrugte mønstre til utility classes
   - Optimér responsive design patterns

2. **HomeView.vue** (1,574 linjer → mål: 800-1000 linjer)
   - Split CSS op i logiske sektioner
   - Konverter til design system variabler
   - Ekstrahér modal og menu styling til separate moduler

3. **AppSidebar.vue** (1,030 linjer → mål: 500-700 linjer)
   - Standardisér navigation patterns
   - Konsolidér responsive breakpoints
   - Bruge utility classes for layout

**Estimeret tid**: 4-6 timer
**Forventet resultat**: 50% reduktion i component CSS størrelse

## Phase 2: Bundle Size Optimization (Prioritet: Høj)

### 2.1 Vite Configuration Enhancement
**Mål**: Optimere build output og få indsigt i bundle sammensætning

**Tasks**:
1. **Installer og konfigurer bundle analyzer**:
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   ```

2. **Opdater `vite.config.js`**:
   ```javascript
   import { visualizer } from 'rollup-plugin-visualizer';
   
   export default defineConfig({
     plugins: [
       vue(),
       VitePWA({...}),
       visualizer({
         filename: 'dist/stats.html',
         open: true,
         gzipSize: true
       })
     ],
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'vendor-vue': ['vue', 'vue-router', 'pinia'],
             'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
             'vendor-ui': ['@/components/ui']
           }
         }
       },
       chunkSizeWarningLimit: 600
     }
   });
   ```

**Estimeret tid**: 2-3 timer
**Forventet resultat**: 20-30% reduktion i main bundle størrelse

### 2.2 Firebase Tree-Shaking
**Mål**: Reducere Firebase bundle størrelse ved kun at importere brugte funktioner

**Tasks**:
1. **Audit Firebase imports** i `src/firebase/` moduler
2. **Implementer modular imports**:
   ```javascript
   // Før
   import firebase from 'firebase/app';
   
   // Efter
   import { initializeApp } from 'firebase/app';
   import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
   import { getFirestore, collection, doc } from 'firebase/firestore';
   ```

**Estimeret tid**: 1-2 timer
**Forventet resultat**: 15-25% reduktion i Firebase bundle størrelse

## Phase 3: Firebase Query Optimization (Prioritet: Medium)

### 3.1 Implement Pagination
**Mål**: Reducere initial load tid ved at implementere pagination

**Tasks**:
1. **Opdater `db.service.js`** med pagination support:
   ```javascript
   export async function getItemsPaginated(userId, options = {}) {
     const pageSize = options.pageSize || 20;
     const lastDoc = options.lastDocument;
     
     let q = query(
       collection(db, getCollectionPath()),
       where('userId', '==', userId),
       orderBy('order'),
       limit(pageSize)
     );
     
     if (lastDoc) {
       q = query(q, startAfter(lastDoc));
     }
     
     return getDocs(q);
   }
   ```

2. **Implementer virtual scrolling** i GameList.vue for store datasæt

**Estimeret tid**: 3-4 timer
**Forventet resultat**: 70-80% hurtigere initial load for brugere med mange items

### 3.2 Query Result Caching
**Mål**: Reducere Firebase requests gennem intelligent caching

**Tasks**:
1. **Implementer query result cache** med TTL
2. **Add offline persistence** for kritiske data
3. **Optimér real-time listeners** med query constraints

**Estimeret tid**: 2-3 timer
**Forventet resultat**: 50% færre Firebase requests

## Phase 4: Performance Monitoring (Prioritet: Medium)

### 4.1 Performance Budgets
**Mål**: Forhindre performance regressioner

**Tasks**:
1. **Tilføj performance budgets** til Vite config
2. **Implementer CI checks** for bundle størrelse
3. **Opret performance dashboard** med Lighthouse metrics

**Estimeret tid**: 2 timer
**Forventet resultat**: Automatisk detection af performance issues

## Implementation Timeline

### Uge 1: CSS Foundation
- [ ] Dag 1-2: Design system foundation (Phase 1.1)
- [ ] Dag 3-4: GameCard og utility refactoring
- [ ] Dag 5: HomeView CSS optimization

### Uge 2: Bundle Optimization
- [ ] Dag 1: Vite configuration og bundle analyzer
- [ ] Dag 2: Firebase tree-shaking
- [ ] Dag 3: Manual chunking implementation
- [ ] Dag 4-5: AppSidebar og remaining component optimization

### Uge 3: Firebase og Monitoring
- [ ] Dag 1-2: Firebase query pagination
- [ ] Dag 3: Query result caching
- [ ] Dag 4: Performance monitoring setup
- [ ] Dag 5: Testing og dokumentation

## Success Metrics

### Bundle Size Targets
- **Main bundle**: < 800KB (fra ~1.2MB)
- **CSS total**: < 3,000 linjer (fra 6,187 linjer)
- **Firebase chunk**: < 200KB

### Performance Targets
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3s

### Development Experience
- **Build time**: < 10s for development builds
- **Hot reload**: < 500ms
- **Bundle analysis**: Integrated i build process

## Risks og Mitigations

### Højt Prioriterede Risici
1. **CSS refactoring breaking changes**
   - *Mitigation*: Gradual migration, component-by-component
   - *Testing*: Visual regression testing

2. **Firebase pagination complexity**
   - *Mitigation*: Implementer feature flags for gradual rollout
   - *Testing*: Extensive testing med store datasæt

3. **Bundle splitting breaking lazy loading**
   - *Mitigation*: Omhyggelig testing af alle routes og komponenter
   - *Testing*: E2E tests for alle app flows

### Medium Prioriterede Risici
1. **Performance optimization trade-offs**
   - *Mitigation*: Kontinuerlig måling og monitoring
   - *Testing*: A/B testing af performance ændringer

## Next Steps

Efter godkendelse af denne plan:

1. **Opret tracking issues** for hver major task
2. **Setup performance baseline** måling
3. **Opret feature branch**: `performance-optimization`
4. **Start med Phase 1.1**: Design system foundation

## Resources

### Tools
- **Bundle Analyzer**: rollup-plugin-visualizer
- **Performance Testing**: Lighthouse CI
- **CSS Analysis**: PurgeCSS for unused styles detection

### Documentation
- [Vue 3 Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Firebase Performance Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

*Dette dokument opdateres løbende baseret på implementering og resultater.*