# MediaTrack v2.1

![Lines of Code](https://img.shields.io/badge/lines%20of%20code-3088%20lines-blue)

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
- **Styling**: Vanilla CSS (Tilpassede variabler og theming)

## 🚀 Projektstatus

Dette projekt er under aktiv udvikling. En offentlig installationsguide vil blive tilføjet, når projektet er klar til udgivelse.

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
- [ ] Integration med eksterne mediedatabaser
- [ ] Søgning på tværs af medietyper
- [ ] Anbefalingssystem baseret på dine mediepreferencer

## 📄 Licens

Dette projekt er licenseret under [MIT License](LICENSE).