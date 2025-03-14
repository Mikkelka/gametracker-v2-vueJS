# GameTrack v2.0

![GameTrack Logo](https://via.placeholder.com/150x50?text=GameTrack)

GameTrack er en webapp til at holde styr på din personlige spilsamling og spillehistorik. Applikationen giver dig mulighed for at kategorisere spil efter status, organisere dem efter platform, og holde styr på dine fremskridt.

Dette er version 2.0 af GameTrack, en Vue.js-baseret portering af [den oprindelige GameTracker](https://github.com/Mikkelka/gametracker-v2), som bevarer den samme funktionalitet men nu er bygget med et moderne JavaScript-framework.

## ✨ Funktioner

- **Kategorisering**: Organiser dine spil i seks forskellige kategorier (Vil spille, Spiller nu, Gennemført, På pause, Droppet, Ser frem til)
- **Platformhåndtering**: Tilføj og tilpas platforme med brugerdefinerede farver
- **Drag and drop**: Nem reorganisering af spil via drag and drop
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
- **Styling**: Vanilla CSS (Tilpassede variabler og theming)

## 🚀 Projektstatus

Dette projekt er under aktiv udvikling. En offentlig installationsguide vil blive tilføjet, når projektet er klar til udgivelse.

## 🏗️ Projektstruktur

```
src/
├── assets/          # Statiske filer (CSS, billeder)
├── components/      # Vue komponenter
│   ├── game/        # Spilrelaterede komponenter
│   ├── layout/      # Layout komponenter
│   ├── platform/    # Platform-relaterede komponenter
│   └── settings/    # Indstillingskomponenter
├── composables/     # Genbrugelig funktionalitet (useDragAndDrop, etc.)
├── firebase/        # Firebase konfiguration og services
├── router/          # Vue Router konfiguration
├── stores/          # Pinia stores (spil, platforme, bruger)
├── views/           # Sidevise komponenter
├── App.vue          # Hovedapplikationskomponent
└── main.js          # Applikationsentry point
```

## 🔄 Forbedringer fra v1

Denne version er en portering af den oprindelige GameTracker (som var baseret på ren JavaScript) til Vue.js-frameworket, med samme kernefunktionalitet og brugeroplevelse. Ændringerne inkluderer:

- **Vue.js implementering**: Den samme app, nu bygget med Vue 3
- **Samme funktionalitet**: Alle de funktioner du kender, nu i et moderne framework
- **State management med Pinia**: Opretholdelse af applikationstilstand
- **Firebase integration**: Fortsat brug af Firebase til databaser og autentifikation
- **Samme UI/UX**: Bevarelse af det velkendte brugerinterface
- **Komponentbaseret struktur**: Koden er nu organiseret i Vue-komponenter

## 📝 Kommende funktioner

- [ ] Statistik og visualiseringer
- [ ] Temaer og tilpasning
- [ ] Integration med eksterne spildatabaser

## 📄 Licens

Dette projekt er licenseret under [MIT License](LICENSE).

