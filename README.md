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
Kas jauns
Izmaiņu vēsture · pašreizējā versija v1.4.0
v1.4.02026-07-02
Dzēšot rēķinu, kredīta atlikumu vai kategoriju, tagad tiek prasīts apstiprinājums
v1.3.02026-07-02
Pievienota "Importēt" poga — eksportēto JSON rezerves kopiju var ielādēt atpakaļ
v1.2.02026-07-02
Pievienota versijas numura rādīšana zem virsraksta un "Kas jauns" (changelog) logs
v1.1.22026-07-02
Atjauninātas noklusētās paraugvērtības jauniem lietotājiem (neitrāli dati)
Pievienotas "Pārtika" un "Īre" noklusētās kategorijas
v1.1.12026-07-02
Kredītu atlikumiem pievienota pārkārtošana (drag & drop) un vienots dzēšanas dizains
v1.1.02026-07-02
Kategorijas tagad pilnībā pārvaldāmas: pievienot, pārsaukt, mainīt krāsu, dzēst
Kategorijas glabājas Firebase un sinhronizējas starp ierīcēm
v1.0.62026-07-02
Novērsta problēma, kad ātri rakstot kursors izlēca no lauka (sinhronizācija vairs netraucē rakstīšanai)
v1.0.52026-07-02
Arhīva rediģētājs: pievienota "Labot" poga — lauki sākotnēji tikai skatāmi, atbloķējas pēc nospiešanas
Atgriezta samaksas statusa atzīme ("Samaksāts" / "Nav samaksāts") un € zīme summām
v1.0.42026-07-02
Arhīva ieraksts kļuvis pilnībā rediģējams (alga, rēķini, kredīti, secība) ar melnraksta aizsardzību
Pievienota arhīva ierakstu dublēšana un pārsaucams nosaukums
v1.0.32026-07-02
Rēķiniem pievienota pārkārtošana ar drag & drop
Pievienota maksājumu izsekošana ar ķeksīšiem ("Vēl jāmaksā")
v1.0.22026-07-02
Pievienots mēnešu arhīvs ("Aizvērt mēnesi" → momentuzņēmums)
Pievienoti grafiki (sadalījums pa kategorijām) ar riņķa diagrammu
v1.0.12026-07-02
Vairāki izkārtojuma labojumi (dzēšanas × pozīcija, viena kolonna datorā)
v1.0.02026-07-02
Pirmā versija: rēķini, kredītu atlikumi, alga, "Paliek" aprēķins
Datu sinhronizācija starp ierīcēm caur Firebase
