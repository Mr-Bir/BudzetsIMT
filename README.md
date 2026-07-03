# Finanšu pārvaldnieks

Personīgais budžeta un tēriņu pārvaldnieks ar sinhronizāciju starp ierīcēm (Firebase Firestore), mēnešu arhīvu, kategoriju sadalījumu un maksājumu izsekošanu. Instalējama kā PWA (Progressive Web App).

## Failu struktūra

```
finanses-pwa/
├── index.html          lapas struktūra
├── style.css            dizains
├── app.js                loģika + Firebase sinhronizācija
├── manifest.json     PWA konfigurācija
├── sw.js                  service worker (nodrošina instalējamību un ātru ielādi)
├── icons/               lietotnes ikonas
└── README.md
```
