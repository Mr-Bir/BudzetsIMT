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

## Svarīgi: kāpēc jāizvieto tiešsaistē

Firebase Firestore **nedarbojas**, ja faili atvērti tieši no diska (`file:///...`). Lapai jādarbojas caur īstu `https://` adresi. GitHub Pages to nodrošina bez maksas.

## 1. Kods GitHub

1. Izveido jaunu repozitoriju [github.com/new](https://github.com/new) (var būt privāts vai publisks — privāts neietekmē lietotnes darbību, jo dati tik un tā ir Firebase, ne repozitorijā).
2. Augšupielādē visus šīs mapes failus (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`, `icons/`) — vai nu ar "Add file → Upload files" web saskarnē, vai:

```bash
git init
git add .
git commit -m "Sākotnējā versija"
git branch -M main
git remote add origin https://github.com/TAVS-LIETOTAJVARDS/finanses.git
git push -u origin main
```

## 2. Izvietošana ar GitHub Pages (bez maksas)

1. Repozitorijā ej uz **Settings → Pages**.
2. Sadaļā **Source** izvēlies **Deploy from a branch**, zaru `main`, mapi `/ (root)`.
3. Saglabā. Pēc dažām minūtēm lietotne būs pieejama adresē:
   `https://TAVS-LIETOTAJVARDS.github.io/finanses/`

Šo saiti izmanto uz visām savām ierīcēm — ievadi to pašu Firebase config un telpas ID katrā, lai dati sinhronizētos.

## 3. Instalēšana kā lietotne (PWA)

- **Android (Chrome):** atverot saiti, parādīsies poga "⭳ Instalēt lietotni" lietotnē, vai pārlūka izvēlnē "Pievienot sākuma ekrānam".
- **iPhone (Safari):** Safari nerāda automātisku instalēšanas uzvedni — nospied **Kopīgot** (kvadrāts ar bultu) → **Pievienot sākuma ekrānam**.
- **Dators (Chrome/Edge):** adreses joslas labajā pusē parādīsies instalēšanas ikona, vai izmanto lapā redzamo "Instalēt lietotni" pogu.

Pēc instalēšanas lietotne atveras kā parasta aplikācija, bez pārlūka adreses joslas.

## 4. Ikonas

`icons/` mapē ir automātiski ģenerētas placeholder ikonas (€ zīme uz zaļa fona). Ja gribi savu logotipu, aizvieto `icon-192.png`, `icon-512.png` un maskējamās versijas ar tādiem pašiem izmēriem un failu nosaukumiem.

## Datu eksports

Rīkjoslas apakšā ir divas eksporta pogas:
- **JSON** — pilns dublējums (rēķini, kredīti, kategorijas), ko var izmantot atjaunošanai.
- **CSV** — atver Excel/Google Sheets, ērti tālākai analīzei vai arhivēšanai ārpus lietotnes.

## Firebase drošības noteikumi

Neaizmirsti, ka Firestore **Rules** sadaļā jābūt iestatītam:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /budgets/{room}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Tas ļauj piekļuvi ikvienam ar tavu telpas ID — droši glabā to ID kā paroli.
