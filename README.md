# MediaTrack v2.1

[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](#licens)

![Lines of Code](https://img.shields.io/badge/lines%20of%20code-8909%20lines-blue)

MediaTrack er en webapp til at holde styr på din personlige samling af medier. Applikationen giver dig mulighed for at kategorisere spil, film og bøger efter status, organisere dem efter relevante kategorier, og holde styr på dine fremskridt.

Dette er version 2.1 af MediaTrack, en Vue.js-baseret portering og udvidelse af [den oprindelige GameTracker](https://github.com/Mikkelka/gametracker-v2), som nu understøtter flere forskellige medietyper.

## ✨ Funktioner

- **Multi-medie tracking**: Hold styr på spil (GameTrack), film (MovieTrack) og bøger (BookTrack) i én integreret app
- **Kategorisering**: Organiser dine medier i seks forskellige statusser (Vil spille/se/læse, Spiller/Ser/Læser nu, Gennemført/Set/Læst, osv.)
- **Tilpassede kategorier**: Tilføj og tilpas platforme for spil, genrer for film og forfattere for bøger med brugerdefinerede farver
- **Drag and drop**: Nem reorganisering af elementer via drag and drop
- **Realtidssynkronisering**: Automatisk synkronisering med Firebase
- **Responsivt design**: Optimeret til alle enheder
- **Offline-kapabilitet**: Fortsæt med at bruge appen, selv når du er offline
- **Mørkt tema**: Behageligt design optimeret til langvarig brug
- **Import/Eksport**: Sikkerhedskopier og gendan dine data

## 🛠️ Teknologistack

- **Frontend**: Vue 3 (Composition API med `<script setup>`) + Vite
- **Tilstandshåndtering**: Pinia
- **Routing**: Vue Router
- **Backend/Database**: Firebase (Authentication & Firestore)
- **Styling**: Vanilla CSS (Tilpassede CSS-variabler og design tokens)
- **Ikoner**: Lucide Vue
- **PWA**: Vite PWA Plugin med Workbox
- **Code Quality**: ESLint
- **Build Tool**: Vite
- **Package Manager**: npm

## 🚀 Installation

### Forudsætninger

- Node.js (v16 eller nyere)
- npm
- Firebase-konto (til backend-tjenester)

### Opsætning

1. **Klon repositoriet**
   ```bash
   git clone <repository-url>
   cd gametracker-v2-vueJS
   ```

2. **Installer afhængigheder**
   ```bash
   npm install
   ```

3. **Konfigurer Firebase**
   - Opret et Firebase-projekt på [Firebase Console](https://console.firebase.google.com/)
   - Aktiver Authentication og Firestore Database
   - Opret en `.env.local` fil i projektets rod med dine Firebase-konfigurationsværdier:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start udviklingsserveren**
   ```bash
   npm run dev
   ```

5. **Byg til produktion**
   ```bash
   npm run build
   ```

6. **Forhåndsvis produktionsbuild**
   ```bash
   npm run preview
   ```

## 💻 Anvendelse

1. **Opret en konto** eller log ind med din eksisterende Firebase-konto
2. **Vælg medietype** fra hovedsiden (Spil, Film eller Bøger)
3. **Tilføj medier** til din samling ved at klikke på "Tilføj" knappen
4. **Organiser dine medier** ved hjælp af drag-and-drop mellem forskellige statusser
5. **Tilpas kategorier** (platforme/genrer/forfattere) efter dine behov
6. **Sync på tværs af enheder** - dine data gemmes automatisk i Firebase

## 🏗️ Projektstruktur

```
src/
├── assets/          # Statiske filer (CSS, billeder)
├── components/      # Vue komponenter
│   ├── game/        # Medierelaterede komponenter
│   ├── layout/      # Layout komponenter
│   ├── platform/    # Kategori-relaterede komponenter
│   └── settings/    # Indstillingskomponenter
├── composables/     # Genbrugelig funktionalitet (useDragAndDrop, etc.)
├── firebase/        # Firebase konfiguration og services
├── router/          # Vue Router konfiguration
├── stores/          # Pinia stores (medier, kategorier, bruger)
│   ├── game.store.js # Mediehåndtering
│   ├── platform.js  # Kategori-håndtering 
│   ├── mediaType.js # Medietype-konfiguration
│   └── user.js      # Brugerhåndtering
├── views/           # Sidevise komponenter
├── App.vue          # Hovedapplikationskomponent
└── main.js          # Applikationsentry point
```

## 🔄 Forbedringer fra v2.0

Denne version udvider den tidligere GameTrack-app til at understøtte flere medietyper:

- **Multi-medie tracking**: Udover spil kan du nu holde styr på film og bøger
- **Tilpasset terminologi**: Hver medietype har sine egne tilpassede termer og statusser
- **Forbedret arkitektur**: Mere modulær kodeopbygning til håndtering af forskellige medietyper
- **Dashboardvisning**: Central oversigt til at vælge mellem forskellige medietyper
- **Bevarede kernefunktioner**: Alle de oprindelige GameTrack-funktioner er bevaret, nu tilgængelige for alle medietyper

## 📝 Kommende funktioner

- [ ] Avancerede statistikker og visualiseringer
- [ ] Temaer og tilpasning
- [ ] Integration med externe mediedatabaser
- [ ] Søgning på tværs af medietyper
- [ ] Anbefalingssystem baseret på dine mediepreferencer

## 🤝 Bidrag

Bidrag til projektet er meget velkomne! Her er hvordan du kan hjælpe:

1. **Fork repositoriet** og opret en ny branch til dine ændringer
2. **Følg kodestandarder** - sørg for at køre `npm run lint` før du committer
3. **Test dine ændringer** grundigt på forskellige enheder
4. **Skriv klare commit-beskeder** der beskriver ændringerne
5. **Åbn en Pull Request** med en detaljeret beskrivelse af dine ændringer

### Rapporter bugs eller foreslå funktioner
- Åbn et [GitHub Issue](../../issues) for at rapportere bugs
- Foreslå nye funktioner via Issues med label "enhancement"
- Diskuter større ændringer før implementering

## 📞 Kontakt

- **Projektvedligeholder**: [Mikkel](https://github.com/Mikkelka)
- **GitHub Repository**: [MediaTrack v2.1](../../)

## 📄 Licens

Dette projekt er licenseret under MIT License. Se [LICENSE](LICENSE) filen for detaljer.

**Note**: LICENSE-filen mangler i øjeblikket og skal oprettes.
