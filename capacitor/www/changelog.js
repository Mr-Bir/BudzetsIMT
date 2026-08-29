/*
 * Finanšu pārvaldnieks (BudzetsIMT)
 * Copyright (c) 2026 Mārtiņš Barons. Visas tiesības paturētas.
 * Skatīt LICENSE failu repozitorija saknē.
 */
// changelog.js — pilna versiju vēsture (ES modulis)
// VERSION app.js failā tiek atvasināts no CHANGELOG[0].v — pievienojot jaunu
// ierakstu, tas AUTOMĀTISKI kļūst par jauno lietotnes versiju.

export const CHANGELOG = [
  { v:'1.40.0', date:'2026-08-29', notes:[
    'Jauna sadaļa "Tendences" — redzi, kā atlikusī nauda mainījusies mēnesi pa mēnesim, balstoties uz arhivētajiem mēnešiem',
  ], notesEn:[
    'New "Trends" section — see how your remaining balance has changed month by month, based on your archived months',
  ]},
  { v:'1.39.9', date:'2026-08-27', notes:[
    'Nomainīta atgādinājumu paziņojumu ikona telefona statusa joslā — iepriekš rādījās vispārīga izsaukuma zīme',
  ], notesEn:[
    'Changed the reminder notification icon shown in the phone\'s status bar — previously it showed a generic exclamation mark',
  ]},
  { v:'1.39.8', date:'2026-08-21', notes:[
    'Salabota sadalījuma pa kategorijām grafika pieskāriena mijiedarbība tālrunī — iepriekš pieskaroties varēja parādīties dīvains mirgojošs izcēlums',
  ], notesEn:[
    'Fixed the category breakdown chart\'s tap interaction on phones — previously tapping a slice could show a distracting flicker',
  ]},
  { v:'1.39.7', date:'2026-08-20', notes:[
    'Augšējā joslā tagad redzams arī dienu skaits līdz algai (vai līdz mēneša beigām, ja algas datums nav iestatīts)',
    'Sadalījuma pa kategorijām grafikam pievienota mijiedarbība — pieskaroties vai novietojot peli virs kādas sadaļas, redzama tās kategorija, summa un īpatsvars',
  ], notesEn:[
    'The top bar now also shows the number of days until payday (or until the end of the month, if no payday is set)',
    'The category breakdown chart is now interactive — tap or hover a slice to see that category\'s name, amount, and share',
  ]},
  { v:'1.39.6', date:'2026-08-20', notes:[
    'Salabota kļūda, kurā izdzēsts rēķins, kredīts, papildu ienākums, atgādinājums vai uzkrājuma mērķis varēja pēc lapas pārlādes vai atkārtotas pieteikšanās parādīties atpakaļ',
  ], notesEn:[
    'Fixed a bug where a deleted bill, credit, extra income entry, reminder, or savings goal could reappear after reloading the app or signing in again',
  ]},
  { v:'1.39.5', date:'2026-08-20', notes:[
    'Jauna konta sākuma stāvoklis tagad ir tukšs (tikai kategoriju piemēri) — iepriekš pievienotie piemēra rēķini un kredīti varēja radīt mulsinošu, nepareizu bilances attēlojumu pirms savu datu ievadīšanas',
  ], notesEn:[
    'A new account now starts empty (only example categories) — previously included sample bills and credits could show a confusing, incorrect balance before you entered your own data',
  ]},
  { v:'1.39.4', date:'2026-08-20', notes:[
    'Rēķinu atgādinājumu native paziņojumi tagad pareizi uznāk arī uz 29., 30. un 31. datumu (iepriekš klusi neuznāca mēnešos, kuriem šīs dienas nav)',
    'Uzkrājuma mērķa dzēšana vai pabeigšana tagad pareizi aptur tam piesaistīto atgādinājumu',
    'Atgādinājumu un uzkrājumu mērķu datumi angļu valodā tagad rādās pareizajā formātā',
  ], notesEn:[
    'Bill reminder push notifications now correctly fire on the 29th, 30th, and 31st (previously silently skipped in months without that day)',
    'Deleting or completing a savings goal now correctly stops its linked reminder',
    'Reminder and savings goal dates now display in the correct format when using English',
  ]},
  { v:'1.39.3', date:'2026-08-20', notes:[
    'Salabota reta kļūda, kas varēja izraisīt datu sajaukšanos starp kontiem, ja lietotnē pārslēdzas uz citu Google kontu bez lapas pārlādes',
    'Datu importēšana no eksportēta JSON faila vairs nedzēš atgādinājumus, uzkrājumu mērķus un algas datuma iestatījumu',
    'Uzlabota sinhronizācijas uzticamība pēc pagaidu tīkla kļūdām',
  ], notesEn:[
    'Fixed a rare bug that could mix up data between accounts when switching Google accounts without reloading the page',
    'Importing data from an exported JSON backup no longer removes reminders, savings goals, and the salary-day setting',
    'Improved sync reliability after temporary network errors',
  ]},
  { v:'1.39.2', date:'2026-08-17', notes:[
    'Lietotnes valoda pirmajā palaišanas reizē tagad tiek noteikta automātiski pēc ierīces/pārlūka valodas (ja angļu — atveras angliski, citādi latviski) — izvēle Iestatījumos joprojām saglabājas un vienmēr uzvar turpmāk',
    'Android app tagad fiksēta portreta orientācijā (vairs negriežas ainavā)',
    'Ekrāna izkārtojums pielāgots ierīcēm ar displeja izciļņiem (notch), apaļiem stūriem un žestu navigācijas joslu',
    'Neliels vizuāls uzlabojums — smalka apmale ap Iestatījumu logu',
  ], notesEn:[
    'On first launch, the app\'s language is now detected automatically from the device/browser language (English → opens in English, otherwise Latvian) — your choice in Settings is still saved and always wins afterwards',
    'The Android app is now locked to portrait orientation (no longer rotates to landscape)',
    'Layout now adapts to devices with display notches, rounded corners, and gesture navigation bars',
    'Small visual polish — a subtle border around the Settings window',
  ]},
  { v:'1.39.1', date:'2026-08-16', notes:[
    'Privātuma politika un Lietošanas noteikumi tagad pieejami arī angļu valodā — Iestatījumos atveras pareizā valodā atbilstoši izvēlētajai lietotnes valodai',
    '"Kas jauns" (changelog) — jaunākie ~15 versiju ieraksti tagad pieejami arī angļu valodā, vecākā vēsture paliek tikai latviski',
  ], notesEn:[
    'Privacy Policy and Terms of Use are now also available in English — opens in the correct language in Settings, matching the app\'s selected language',
    '"What\'s new" (changelog) — the most recent ~15 version entries are now also available in English, older history remains Latvian-only',
  ]},
  { v:'1.39.0', date:'2026-08-16', notes:[
    'Lietotne tagad pieejama arī angļu valodā — jauns "Valoda" iestatījums (Iestatījumi), pārslēdz uzreiz, saglabājas šajā ierīcē',
    'Iztulkots viss lietotnes teksts: visi paneļi, pogas, dinamiskie ziņojumi, apstiprinājumi un kļūdu paziņojumi',
  ], notesEn:[
    'The app is now also available in English — new "Language" setting (Settings), switches instantly, saved on this device',
    'All app text translated: every panel, button, dynamic message, confirmation, and error notice',
  ]},
  { v:'1.38.0', date:'2026-08-15', notes:[
    'Jauna, pilna sadaļa "Uzkrājuma mērķi" — izvēlies mērķa summu un mēnešu skaitu (3/6/12/24/36/48/72, bankas kalkulatora stilā), un aplikācija automātiski izveido ikmēneša maksājuma rēķinu ar jaunu kategoriju "Uzkrājumi"',
    'Mērķa rēķinu nevar dzēst no Rēķinu saraksta — tikai no "Uzkrājuma mērķi" (tur dzēšana noņem arī saistīto rēķinu)',
    'Progress (cik maksājumu izdarīts) virzās uz priekšu TIKAI "Jauns mēnesis" solī, un TIKAI ja tā mēneša maksājums bija atzīmēts "Samaksāts" — izlaists maksājums progresu neietekmē, mērķis vienkārši nobīdās uz priekšu',
    'Pēdējais maksājums vienmēr ir atlikums (nevis vienmērīga daļa), lai noapaļošanas starpība nekrātos',
    'Sasniegtie mērķi pēc pēdējā maksājuma automātiski pāriet uz atsevišķu "Sasniegtie" grupu sadaļā (rēķins pazūd no Rēķinu saraksta)',
  ], notesEn:[
    'New, full "Savings goals" section — pick a target amount and number of months (3/6/12/24/36/48/72, bank-calculator style), and the app automatically creates a monthly-payment bill with a new "Savings" category',
    'A goal\'s bill can\'t be deleted from the Bills list — only from "Savings goals" (deleting there also removes the linked bill)',
    'Progress (how many payments made) advances ONLY on the "New month" step, and ONLY if that month\'s payment was marked "Paid" — a skipped payment doesn\'t affect progress, the goal simply shifts forward',
    'The last payment is always the remainder (not an even share), so rounding differences don\'t accumulate',
    'Achieved goals automatically move to a separate "Achieved" group after the last payment (the bill disappears from the Bills list)',
  ]},
  { v:'1.37.1', date:'2026-08-14', notes:[
    '"Papildus ienākumi" saraksta rinda pārtaisīta, lai datums, nosaukums, summa un dzēšanas poga vienmēr ietilptu VIENĀ rindā (iepriekš šaurākos ekrānos izlauzās 3 rindās) — garāki nosaukumi tagad tiek nogriezti ar "…", nevis izlauž rindu',
  ], notesEn:[
    'The "Extra income" list row rebuilt so the date, name, amount, and delete button always fit on ONE line (previously wrapped to 3 lines on narrower screens) — longer names are now truncated with "…" instead of wrapping the row',
  ]},
  { v:'1.37.0', date:'2026-08-14', notes:[
    'Jauns iestatījums "Algas datums" (Iestatījumi, vienkārša izvēlne 1.–31.) — ja iestatīts, "Droša summa/dienā" (topbar) rēķinās dienas LĪDZ NĀKAMĀ MĒNEŠA algas datumam (šis datums vienmēr nozīmē nākamo mēnesi, nekad aktuālo), nevis līdz kārtējā mēneša beigām, kas precīzāk atspoguļo, cik ilgi nauda reāli jāizstiepj',
    'Ja "Algas datums" nav iestatīts, aprēķins paliek kā iepriekš (līdz kārtējā mēneša beigām)',
  ], notesEn:[
    'New "Payday" setting (Settings, simple 1–31 picker) — if set, "Safe amount/day" (topbar) is calculated for the days UNTIL NEXT MONTH\'s payday (this date always means next month, never the current one), instead of until the end of the current month, which more accurately reflects how long the money actually needs to stretch',
    'If "Payday" is not set, the calculation stays as before (until the end of the current month)',
  ]},
  { v:'1.36.1', date:'2026-08-14', notes:[
    'Topbar "tēriņa tempa" rādītāji vienkāršoti: pirmais lauciņš tagad rāda "Iztērēts šodien" (tieši šīsdienas apmaksātie rēķini + šīsdienas summējošo rēķinu epizodes), nevis vidējo tēriņu/dienā kopš mēneša sākuma — tas iepriekš izskatījās nereāli sagrozīts, ja lielu rēķinu apmaksā uzreiz mēneša sākumā',
    'Jauns rēķina lauks "paidDate" — fiksē datumu, kad rēķins atzīmēts kā "Samaksāts" (notīrīts, ja atzīmējums noņemts vai sākas "Jauns mēnesis")',
    '"Pieejams tagad" un "Droša summa/dienā" aprēķini nemainīti',
  ], notesEn:[
    'Topbar "spending pace" indicators simplified: the first field now shows "Spent today" (exactly today\'s paid bills + today\'s summing-bill entries), instead of the average spend/day since the start of the month — the latter used to look unrealistically skewed if a large bill was paid right at the start of the month',
    'New bill field "paidDate" — records the date a bill was marked "Paid" (cleared if unmarked or when "New month" starts)',
    '"Available now" and "Safe amount/day" calculations unchanged',
  ]},
  { v:'1.36.0', date:'2026-08-14', notes:[
    'Jauna sadaļa "Papildus ienākumi" (izvēlnē zem "Budžets") — neregulāru, neprognozējamu ienākumu epizožu (datums, nosaukums, summa) žurnāls šim mēnesim. Summa pieskaitās bāzes ienākumam visos aprēķinos (Paliek, Vēl jāmaksā, procenti, tēriņu temps u.c.)',
    '"Ienākumi" lauciņā parādās neliela apakšrindiņa ar sadalījumu "Bāze ... + papildus ..." tad, kad ir kāds papildus ienākums',
    'Papildus ienākumi ir piesaistīti konkrētajam mēnesim — tāpat kā rēķini, tie tiek notīrīti ar "Jauns mēnesis" (un saglabāti arhīvā, ja izvēlēts arhivēt)',
    'Firestore rules (Firebase Console pusē) JĀPAPILDINA ar jaunu lauku "extraIncome" (struktūras/izmēru validācija, pēc "reminders" parauga) — BEZ tā šis lauks netiks saglabāts mākonī',
  ], notesEn:[
    'New "Extra income" section (in the menu under "Budget") — a log of irregular, unpredictable income entries (date, name, amount) for this month. The amount is added to the base income in all calculations (Remaining, Still to pay, percentages, spending pace, etc.)',
    'A small breakdown sub-line "Base ... + extra ..." appears in the "Income" field whenever there is any extra income',
    'Extra income is tied to the specific month — just like bills, it is cleared by "New month" (and saved to the archive if archiving is chosen)',
    'Firestore rules (Firebase Console side) NEEDED a new field "extraIncome" added (structure/size validation, following the "reminders" pattern) — without it this field would not be saved to the cloud',
  ]},
  { v:'1.35.3', date:'2026-08-14', notes:[
    'Iespējams jauns App Check Fāzes 2 (appChecked() Firestore rules) root cause noskaidrots: initializeAppCheck() app.js netika gaidīts (fire-and-forget) pirms Firestore onSnapshot() klausītāja atvēršanas — ja lietotājam jau bija saglabāta sesija, onAuthStateChanged varēja nostrādāt ātrāk par App Check tokena tīkla pieprasījumu, un pirmais Listen pieprasījums aizgāja bez tokena (request.app == null), ko appChecked() noraidīja. App Check konsoles "Enforce" slēdzis Cloud Firestore rindā pārbaudīts un apstiprināts kā vienmēr izslēgts (Nr.1 aizdomās turamais no 2026-08-13 sesijas — atkrīt)',
    'connectForUser() tagad gaida App Check tokenu (ar 3s drošības timeout, ja App Check nestrādā) PIRMS Firestore klausītāja atvēršanas',
    'Jauns pašdziedinošs mehānisms: ja onSnapshot tomēr saņem permission-denied, klausītājs vienu reizi automātiski atjaunojas pēc 2s pauzes (Firestore SDK pats no jauna nepieslēdzas pēc rules noraidījuma) — sk. subscribeSnapshot()',
    'VĒL NAV atkārtoti testēts ar reāli publicētu appChecked() rules — nākamais solis pirms Fāzes 2 atkārtota mēģinājuma',
  ], notesEn:[
    'A possible root cause for App Check Phase 2 (appChecked() Firestore rules) identified: initializeAppCheck() in app.js was not awaited (fire-and-forget) before opening the Firestore onSnapshot() listener — if the user already had a saved session, onAuthStateChanged could fire faster than the App Check token network request, and the first Listen request went out without a token (request.app == null), which appChecked() rejected. The App Check console\'s "Enforce" toggle on the Cloud Firestore row was checked and confirmed always off (suspect #1 from the 2026-08-13 session — ruled out)',
    'connectForUser() now awaits the App Check token (with a 3s safety timeout in case App Check isn\'t working) BEFORE opening the Firestore listener',
    'New self-healing mechanism: if onSnapshot still receives permission-denied, the listener automatically reconnects once after a 2s pause (the Firestore SDK itself does not retry after a rules rejection) — see subscribeSnapshot()',
    'NOT yet re-tested with appChecked() rules actually published — next step before another Phase 2 attempt',
  ]},
  { v:'1.35.2', date:'2026-08-13', notes:[
    'Noņemts pagaidu App Check diagnostikas kods (pievienots v1.35.1: onTokenChanged listener, window.__diagAppCheck(), papildu console.error Firestore kļūdām) — bija paredzēts vienas sesijas izmeklēšanai, tagad noņemts, lai neradītu neskaidrības nākamajā sesijā ar tīru koda bāzi',
    'App Check klienta inicializācija (Fāze 1) PALIEK AKTĪVA un strādā (apstiprināts: tokens veiksmīgi iegūts). Firestore rules PALIEK BEZ appChecked() enforcement — Fāzes 2 mēģinājums 2026-08-13 (appChecked() Firestore rules) izraisīja reālu permission-denied kļūdu, kaut arī App Check → Requests rādīja 68-94% "verified" un klienta tokens tika apstiprināti iegūts; ATGRIEZTS TAJĀ PAŠĀ DIENĀ',
    'Root cause VĒL NAV atrasts — izmeklēšana pārtraukta un turpināsies jaunā, mierīgā sesijā (nevis šajā). Aizdomās turamais Nr.1: App Check konsoles pašas atsevišķais API-līmeņa "Enforce" slēdzis (Cloud Firestore rindā), kas ir NEATKARĪGS no firestore.rules faila — iespējams nejauši aktivizēts blakus esošās "Enforce" pogas dēļ metrikas panelī. Jāpārbauda un, ja aktīvs, jāpārslēdz atpakaļ uz "Monitoring" PIRMS jebkāda nākamā appChecked() mēģinājuma',
  ], notesEn:[
    'Removed temporary App Check diagnostic code (added in v1.35.1: onTokenChanged listener, window.__diagAppCheck(), extra console.error for Firestore errors) — was meant for a single session\'s investigation, now removed to keep the next session\'s codebase clean',
    'App Check client-side initialization (Phase 1) STAYS ACTIVE and working (confirmed: token successfully obtained). Firestore rules STAY WITHOUT appChecked() enforcement — the 2026-08-13 Phase 2 attempt (appChecked() Firestore rules) caused a real permission-denied error, even though App Check → Requests showed 68-94% "verified" and the client token was confirmed obtained; REVERTED THE SAME DAY',
    'Root cause NOT YET found — investigation paused, to continue in a fresh, calm session (not this one). Suspect #1: the App Check console\'s own separate API-level "Enforce" toggle (on the Cloud Firestore row), which is INDEPENDENT of the firestore.rules file — possibly accidentally activated due to the adjacent "Enforce" button in the metrics panel. Needs checking, and if active, switching back to "Monitoring" BEFORE any next appChecked() attempt',
  ]},
  { v:'1.35.1', date:'2026-08-13', notes:[
    'App Check diagnostikas kods pievienots (onTokenChanged listener + window.__diagAppCheck() konsoles funkcija) — palīdzēs noskaidrot, kāpēc Fāzes 2 (Firestore rules appChecked() enforcement) mēģinājums 2026-08-13 salauza reālu saglabāšanu, neskatoties uz "verified" App Check metriku Firebase Console',
    'firestore.rules ATGRIEZTS uz Fāzi 1 (bez enforcement) — sk. rules faila komentāru pilnam aprakstam',
  ], notesEn:[
    'App Check diagnostic code added (onTokenChanged listener + window.__diagAppCheck() console function) — will help find out why the 2026-08-13 Phase 2 (Firestore rules appChecked() enforcement) attempt broke real saving, despite "verified" App Check metrics in the Firebase console',
    'firestore.rules REVERTED to Phase 1 (without enforcement) — see the rules file comment for the full description',
  ]},
  { v:'1.35.0', date:'2026-08-13', notes:[
    'App Check IESLĒGTS klienta pusē (Fāze 1) — pēc Billing konta pievienošanas Firebase projektam un IAM/reCAPTCHA Enterprise API apstiprināšanas Google Cloud Console. Firestore rules līmeņa enforcement (appChecked()) APZINĀTI VĒL NAV pievienots — tas ir atsevišķs, vēlāks solis (Fāze 2), kas seko tikai pēc vairāku dienu stabila "verified" pieprasījumu apstiprinājuma Firebase konsolē',
  ], notesEn:[
    'App Check TURNED ON client-side (Phase 1) — after adding a Billing account to the Firebase project and confirming IAM/reCAPTCHA Enterprise API in Google Cloud Console. Firestore rules-level enforcement (appChecked()) DELIBERATELY NOT added yet — that is a separate, later step (Phase 2), which only follows after several days of stable "verified" request confirmation in the Firebase console',
  ]},
  { v:'1.34.1', date:'2026-08-13', notes:[
    'Labots: apmaksātam, ar rēķinu saistītam atgādinājumam sadaļā "Gaidāmie" rādītais "nākamreiz [datums]" vairs nerāda šī mēneša (jau pagājušo/šodienas) datumu, bet gan korekti pareizu nākamā mēneša termiņu tajā pašā dienā',
  ], notesEn:[
    'Fixed: for a paid, bill-linked reminder shown in "Upcoming", the "next time [date]" label no longer shows this month\'s (already past/today\'s) date, but correctly shows the next month\'s due date on the same day',
  ]},
  { v:'1.34.0', date:'2026-08-13', notes:[
    'Ar rēķinu saistīts atgādinājums vairs nerādās "Šodien/Nokavēts" sarakstā (ne sarkanajā nozīmītē, ne banerī), kad piesaistītais rēķins atzīmēts "Samaksāts" — pāriet uz "Gaidāmie" ar norādi "✓ Samaksāts — nākamreiz [datums]"; atgriežas "Nokavēts" statusā automātiski, kad sākas jauns mēnesis (rēķina "paid" atiestatās uz false) un pienāk nākamā termiņa diena',
    'Summējošie rēķini (bez "Samaksāts" ķeksīša, piem. "Pārtika") vairs nav izvēlami, veidojot jaunu ar rēķinu saistītu atgādinājumu — šis atgādinājumu veids loģiski der tikai rēķiniem ar fiksētu termiņu un samaksas statusu',
    'Native paziņojumi (ieplānoti native OS pusē) turpina sūtīt neatkarīgi no "Samaksāts" statusa — tas ir tikai in-app saraksta/nozīmītes/banera izmaiņa',
  ], notesEn:[
    'A bill-linked reminder no longer appears in the "Today/Overdue" list (neither the red badge nor the banner) once the linked bill is marked "Paid" — it moves to "Upcoming" with a "✓ Paid — next time [date]" note; it automatically returns to "Overdue" status when a new month starts (the bill\'s "paid" resets to false) and the next due date arrives',
    'Summing bills (without a "Paid" checkmark, e.g. "Groceries") can no longer be selected when creating a new bill-linked reminder — this reminder type only makes sense for bills with a fixed due date and payment status',
    'Native notifications (scheduled on the native OS side) continue to fire regardless of "Paid" status — this is only an in-app list/badge/banner change',
  ]},
  { v:'1.33.1', date:'2026-08-12', notes:[
    'Pievienots jauns iestatījums "Atgādinājumu laiks" (Iestatījumi, redzams tikai native lietotnē) — ļauj izvēlēties, cikos dienā parādās native paziņojumi par atgādinājumiem; noklusējums 09:00, saglabājas lokāli šajā ierīcē',
    'Labots gadījums, kad brīvam atgādinājumam ar šodienas datumu izvēlētais paziņojuma laiks jau bija pagājis — iepriekš paziņojums klusi netika ieplānots vispār, tagad tiek nosūtīts tuvākajā minūtē',
  ], notesEn:[
    'Added a new "Reminder time" setting (Settings, visible only in the native app) — lets you choose what time of day native reminder notifications appear; default 09:00, saved locally on this device',
    'Fixed a case where a free-form reminder with today\'s date and a notification time already in the past — previously the notification silently was never scheduled at all, now it is sent within the next minute',
  ]},
  { v:'1.33.0', date:'2026-08-11', notes:[
    'Pievienoti native Android paziņojumi (push-style) priekš Atgādinājumiem — ar rēķinu saistīti atgādinājumi atkārtojas katru mēnesi tajā pašā dienā, brīvie atgādinājumi paziņo vienreiz izvēlētajā datumā; laiks konfigurējams Iestatījumos (skat. v1.33.1); darbojas tikai native lietotnē (Android/iOS), web/PWA versiju neskar',
    'Pieprasa paziņojumu atļauju automātiski pēc pieteikšanās native lietotnē; paziņojumi tiek pārplānoti pēc katras atgādinājuma izmaiņas (pievienošana, dzēšana, pauzēšana, sinhronizācija starp ierīcēm)',
    'Papildus: pievienota RECEIVE_BOOT_COMPLETED atļauja AndroidManifest.xml, lai ieplānotie paziņojumi izdzīvotu pēc ierīces restarta',
  ], notesEn:[
    'Added native Android notifications (push-style) for Reminders — bill-linked reminders repeat every month on the same day, free-form reminders notify once on the chosen date; time configurable in Settings (see v1.33.1); works only in the native app (Android/iOS), does not affect the web/PWA version',
    'Requests notification permission automatically after signing in to the native app; notifications are rescheduled after every reminder change (add, delete, pause, sync across devices)',
    'Also: added the RECEIVE_BOOT_COMPLETED permission to AndroidManifest.xml, so scheduled notifications survive a device restart',
  ]},
  { v:'1.32.5', date:'2026-08-10', notes:[
    'Pievienota rēķinu un kredītu datu sanitizācija pirms katras saglabāšanas (tāpat kā jau bija kategorijām un atgādinājumiem) — pasargā pret iespējamu UI kļūdu, kas varētu nosūtīt nepareiza tipa datus (piem., summu kā tekstu), nesabojājot "nav iestatīts" nozīmi neobligātiem laukiem (piem., kredīta mēneša maksājums)',
  ], notesEn:[
    'Added bill and credit data sanitization before every save (as categories and reminders already had) — protects against a possible UI bug sending the wrong data type (e.g. an amount as text), without breaking the "not set" meaning of optional fields (e.g. a credit\'s monthly payment)',
  ]},
  { v:'1.32.4', date:'2026-08-10', notes:[
    'Salabota Firestore drošības noteikumu sintakses kļūda — Firestore Rules valoda neatbalsta saraksta elementu-pa-elementam pārbaudes sintaksi (list.all()); atgriezta uz pierādīti strādājošu struktūras/izmēru validāciju, papildināta ar drošāku laika lauku pārbaudi (validTime) un tīrāku arhīva noteikumu pierakstu',
  ]},
  { v:'1.32.3', date:'2026-08-10', notes:[
    'Mēģinājums aizvietot "atritināto" (unrolled) validācijas ķēdi ar list.all() — IZRĀDĪJĀS Firestore Rules sintakses kļūda, netika publicēts, sk. v1.32.4',
    'Noņemta pagaidu diagnostikas izvade konsolē',
  ]},
  { v:'1.32.2', date:'2026-08-10', notes:[
    'Atrasts un salabots īstais iemesls, kāpēc nekas nesaglabājās — App Check klienta puses inicializācija (nevis Firestore drošības noteikumi) klusi bloķēja pilnīgi visu saglabāšanu, jo reCAPTCHA Enterprise pieprasījums serverī kļūdojas; App Check pagaidām atslēgts, kamēr tas netiek atrisināts',
    'Pievienota stingra datu sanitizācija pirms katras saglabāšanas (summas, teksta garumi, atgādinājumu lauku tipi) — garantē, ka Firestore vienmēr saņem pareizi formētus datus',
    'Firestore drošības noteikumos atjaunota pilna atgādinājumu un kategoriju lauku validācija (bija īslaicīgi vienkāršota diagnostikas laikā) — droša, jo klients tagad vienmēr sūta pareizu formu',
  ]},
  { v:'1.32.1', date:'2026-08-09', notes:[
    'Salabota kļūda, kad tikko pievienots atgādinājums (vai cita izmaiņa) uz īsu brīdi parādījās un tad pazuda — Firestore reāllaika sinhronizācija varēja pārrakstīt vēl nesaglabātas lokālas izmaiņas ar vecāku datu kopiju',
  ]},
  { v:'1.32.0', date:'2026-08-09', notes:[
    'Pievienota Atgādinājumu sadaļa — var pievienot atgādinājumu, kas piesaistīts esošam rēķinam (atkārtojas katru mēnesi izvēlētajā dienā, automātiski pārdzīvo "Jauns mēnesis") vai brīvu vienreizēju atgādinājumu ar fiksētu datumu',
    'Kad rēķins tiek izslēgts no jaunā mēneša (vai izdzēsts), tam piesaistītais atgādinājums automātiski pāriet pauzes stāvoklī, nevis pazūd — datus var atjaunot, ja rēķins parādās vēlreiz',
    'Pievienots sarkans skaitītājs pie "Atgādinājumi" izvēlnē un baneris visās sadaļās, kad kādam atgādinājumam termiņš ir šodien vai nokavēts',
  ]},
  { v:'1.31.0', date:'2026-08-09', notes:[
    'Kredītu sadaļas ieraksti vizuāli saskaņoti ar Rēķinu sadaļu — vienādas krāsas (fons, apmales, teksts), izmēri un atstarpes; iepriekšējais atsevišķais violetais tonis noņemts',
  ]},
  { v:'1.30.3', date:'2026-08-08', notes:[
    'Drošības uzlabojums — kategoriju krāsu vērtības tagad vienmēr tiek pārbaudītas pirms attēlošanas (aizsardzība pret nederīgu/ļaunprātīgu ievadi, arī importējot rezerves kopiju)',
    'Salabota kļūda, kad lietotnes automātiskā atjaunināšana varēja pārtraukt lietotāju rakstīšanas vidū — tagad atjaunināšana nogaida, kamēr lauks tiek pamests',
    'Firestore drošības noteikumi paplašināti ar padziļinātu datu validāciju (katra rēķina, kredīta un kategorijas lauka līmenī) un App Check pārbaudi',
  ]},
  { v:'1.30.2', date:'2026-08-08', notes:[
    'Pabeigta native Android pieteikšanās/izrakstīšanās funkcionalitāte — pievienoti nepieciešamie palīgmoduļi, lai tā reāli darbotos; web/PWA lietotāju plūsma nemainās',
  ]},
  { v:'1.30.1', date:'2026-08-06', notes:[
    'Pievienots native Android pieteikšanās/izrakstīšanās ceļš (Capacitor) — web/PWA lietotāju plūsma nemainās',
  ]},
  { v:'1.30.0', date:'2026-08-05', notes:[
    'Privātuma politika un Lietošanas noteikumi tagad atveras lietotnē pašā (modālī), nevis jaunā pārlūka cilnē',
  ]},
  { v:'1.29.0', date:'2026-08-05', notes:[
    'Pievienota Lietošanas noteikumu lapa un saite uz to Iestatījumos, blakus Privātuma politikai',
  ]},
  { v:'1.28.0', date:'2026-08-05', notes:[
    'Pievienota "Dzēst kontu" poga Iestatījumos — neatgriezeniski dzēš visus datus (rēķinus, kredītus, kategorijas, arhīvu) un pašu kontu, ar dubultu apstiprinājumu',
    'Pievienota Privātuma politikas lapa un saite uz to Iestatījumos',
  ]},
  { v:'1.27.1', date:'2026-08-05', notes:[
    'Salabota kļūda, kad lēna interneta savienojuma dēļ (nevis novecojuša pārlūka dēļ) parādījās maldīgs "vajag jaunāku pārlūku" ziņojums',
    'Ielādes ekrāna pārbaude tagad nošķir "pārlūks nespēj palaist lietotni" no "lēns savienojums" — otrajā gadījumā rāda precīzāku ziņojumu',
  ]},
  { v:'1.27.0', date:'2026-08-05', notes:[
    'Naudas tērēšanas tempa indikators pārcelts no Budžets sadaļas uz augšējo joslu (topbar) — tagad redzams visās sadaļās',
    'Aplikācijas ikona noņemta no augšējās joslas, lai atbrīvotu vietu tempa indikatoram',
    'Topbar indikators rāda tikai noapaļotas vērtības bez apzīmējumiem; klikšķinot uz jaunās ⓘ pogas, atveras panelis ar pilnu detalizāciju un skaidrojumu',
  ]},
  { v:'1.26.0', date:'2026-08-04', notes:[
    'Jauna kompakta augšējā josla — hamburger izvēlne aizstāj iepriekšējo sadaļu joslu un lietotāja/iestatījumu pogas, kas tagad izbīdās kā sānu panelis',
    'Lietotnes nosaukums pārcelts no augšējās joslas uz Iestatījumu logu',
  ]},
  { v:'1.25.2', date:'2026-08-04', notes:[
    'Iekšēji koda uzlabojumi — izmaiņu vēsture (changelog) pārcelta uz atsevišķu failu, versijas numurs tagad tiek atvasināts automātiski — lietotnes darbība nemainās',
  ]},
  { v:'1.25.1', date:'2026-08-03', notes:[
    'Drošības uzlabojums — rēķinu, kredītu un algas summu lauki tagad vienmēr tiek attēloti kā droši skaitļi, nevis neapstrādāts teksts',
  ]},
  { v:'1.25.0', date:'2026-08-01', notes:[
    'Pievienots naudas tērēšanas tempa indikators — vidējais tēriņš/dienā, reāli pieejamā summa tagad un droša tēriņa summa dienā līdz mēneša beigām, ar krāsainu tempa signālu',
  ]},
  { v:'1.24.1', date:'2026-08-01', notes:[
    '"Sakārtot" poga tagad rēķinus kārto vienkārši pēc summas (dilstoši) — vairs negrupē pēc "Samaksāts" statusa',
  ]},
  { v:'1.24.0', date:'2026-08-01', notes:[
    'Pievienots draudzīgs ziņojums, ja pārlūkprogramma (WebView) ir pārāk vecs un nespēj palaist lietotni — vairs nav bezgalīga ielādes ekrāna',
    'Salabota kļūda, kurā ielādes ekrāns nepazuda neautentificētam lietotājam (pirms pieteikšanās)',
  ]},
  { v:'1.23.1', date:'2026-08-01', notes:[
    'Arhīva ierakstos noņemts dublējošais kalendārā mēneša nosaukums — tagad rādās tikai rēķinu skaits un alga',
  ]},
  { v:'1.23.0', date:'2026-08-01', notes:[
    'Pievienots rediģējams darba perioda nosaukums pie "Rēķini" (piem. "Jūlijs 2026") — klikšķinot uz tā, var mainīt',
    'Arhivēšana ("Saglabāt aktuālo mēnesi → arhīvā" un "Jauns mēnesis") tagad izmanto šo nosaukumu, nevis klikšķa datumu — vairs nesajauc, kuram mēnesim dati pieder',
    'Nospiežot "Jauns mēnesis", perioda nosaukums automātiski atjaunojas uz jauno kalendāro mēnesi',
  ]},
  { v:'1.22.0', date:'2026-08-01', notes:[
    'Pievienota poga "Jauns mēnesis" — ļauj izvēlēties, kurus rēķinus paturēt nākamajam mēnesim; summējošiem rēķiniem dzēš epizodes (limits paliek), pārējiem noņem "Samaksāts" ķeksīti, ar iespēju vispirms saglabāt aktuālo mēnesi arhīvā',
  ]},
  { v:'1.21.0', date:'2026-08-01', notes:[
    'Summējošiem rēķiniem pievienota epizožu saraksta sakļaušana/atvēršana — klikšķinot uz "Iztērēts..." rindas, atsevišķās epizodes paslēpjas, limita informācija paliek redzama',
  ]},
  { v:'1.20.0', date:'2026-08-01', notes:[
    'Sadaļu pogām (Budžets/Kredīti/...) pievienots slīdošs pasvītrojuma indikators, kas animēti seko aktīvajai sadaļai',
    'Pārslēdzoties starp sadaļām, saturs tagad parādās ar mīkstu izbalēšanas un pacēluma animāciju',
    'Rēķinu saraksts padarīts vēl kompaktāks — samazināts rindu iekšējais atkāpums',
  ]},
  { v:'1.19.5', date:'2026-08-01', notes:[
    'Salabota kopsavilkuma piespraušana — pēc pieteikšanās navigācijas augstums tagad tiek pareizi izmērīts, tāpēc piespraustais kopsavilkums vairs nepaslīd zem navigācijas joslas',
  ]},
  { v:'1.19.4', date:'2026-08-01', notes:[
    'Sadaļu nosaukumu fonts samazināts, mobilajā skatā automātiski pielāgojas platumam, lai visi nosaukumi paliktu vienā rindā',
    'Rēķinu saraksts padarīts kompaktāks — mazāks rindu augstums un atstarpe starp tām',
  ]},
  { v:'1.19.3', date:'2026-08-01', notes:[
    'Sadaļu navigācijas joslas (Budžets/Kredīti/…) punktētās līnijas samazinātas no 2px uz 1px',
  ]},
  { v:'1.19.2', date:'2026-08-01', notes:[
    'Mēnešu arhīva ieraksti mobilajā skatā vairs nav saspiesti — pogas (Skatīt/Dublēt/×) tagad pārnestas zem punktētas atdalītājlīnijas',
  ]},
  { v:'1.19.1', date:'2026-07-19', notes:[
    'Salabota kopsavilkuma piespraušana — poga vairs nepazūd un karte tagad tiešām paliek pielipusi, ritinot lapu',
  ]},
  { v:'1.19.0', date:'2026-07-19', notes:[
    'Pievienota poga kopsavilkuma piespraušanai — piespiests, tas paliek redzams (mazākā izmērā) ritinot lapu',
  ]},
  { v:'1.18.1', date:'2026-07-19', notes:[
    'Summējošiem rēķiniem (piem. Degviela) noņemta "Samaksāts" ķeksīša poga — tie automātiski skaitās apmaksāti, jo katra epizode jau ir apmaksāts darījums',
  ]},
  { v:'1.18.0', date:'2026-07-19', notes:[
    'Pārtēriņš summējošos rēķinos ar limitu tagad atspoguļojas arī "Paliek" un "Vēl jāmaksā"',
    'Pievienota brīdinājuma ikona pie "Paliek"/"Vēl jāmaksā", ja kāds limits pārtērēts',
  ]},
  { v:'1.17.3', date:'2026-07-19', notes:[
    'Poga "Aizvērt mēnesi" pārsaukta par "Saglabāt aktuālo mēnesi → arhīvā"',
    'Noņemta poga "Notīrīt ķeksīšus"',
  ]},
  { v:'1.17.2', date:'2026-07-19', notes:[
    'Noņemta poga "Sākt no jauna" (nebija vajadzīga, riskants dzēst funkcionalitāte)',
  ]},
  { v:'1.17.1', date:'2026-07-19', notes:[
    'Service worker automātiski atjaunina kešatmiņu un pārlādē lapu',
  ]},
  { v:'1.17.0', date:'2026-07-19', notes:[
    'Pievienots ielādes ekrāns (splash) autentificētiem lietotājiem',
    'Uzlabots UX: vairs nav nejaušā Google Sign-In loga blinks',
  ]},
  { v:'1.16.0', date:'2026-07-19', notes:[
    'Sadaļu nosaukumi (Budžets, Kredīti u.c.) padarīti lielāki un labāk salasāmi',
    'Sadaļu josla tagad paliek redzama (pielīp augšā), ritinot lapu uz leju',
  ]},
  { v:'1.15.1', date:'2026-07-18', notes:[
    'Iekšēji koda uzlabojumi (sadaļu komentāri) — lietotnes darbība nemainās',
  ]},
  { v:'1.15.0', date:'2026-07-18', notes:[
    'Pievienota papildu aizsardzība pret automatizētu ļaunprātīgu piekļuvi (App Check)',
  ]},
  { v:'1.14.1', date:'2026-07-17', notes:[
    'Novērsta lapas nobīde, pārslēdzoties uz tukšajām sadaļām',
  ]},
  { v:'1.14.0', date:'2026-07-17', notes:[
    'Navigācijas ikonas noņemtas — palikuši tikai teksta nosaukumi',
    'Lietotnes nosaukums pārcelts uz augšējo joslu un vairs nemainās pa sadaļām',
    'Navigācija atdalīta ar punktētajām līnijām augšā un apakšā',
    'Pievienota sadaļa "Uzkrājuma mērķi" (vēl top)',
  ]},
  { v:'1.13.0', date:'2026-07-15', notes:[
    'Konta un lietotnes pogas pārceltas uz augšējo labo malu',
    'Pievienota "Iestatījumi" sadaļa ar tēmas izvēli, versiju un "Kas jauns"',
    'Virsraksts tagad rāda, kurā sadaļā atrodies',
  ]},
  { v:'1.12.0', date:'2026-07-15', notes:[
    'Lietotne sadalīta trīs sadaļās ar ikonu navigāciju augšā',
    'Kredītu atlikumi pārcelti uz atsevišķu sadaļu, lai budžeta skats būtu pārskatāmāks',
    'Pievienota sadaļa "Atgādinājumi" (vēl top)',
  ]},
  { v:'1.11.2', date:'2026-07-15', notes:[
    'Lietotnes krāsa (theme color) saskaņota ar jauno ikonu',
  ]},
  { v:'1.11.1', date:'2026-07-15', notes:[
    'Jauna lietotnes ikona; tā redzama arī virsraksta priekšā',
  ]},
  { v:'1.11.0', date:'2026-07-03', notes:[
    'Pievienota poga "Sakārtot" — kārto rēķinus pēc samaksāts statusa, tad pēc summas (lielākā augšā)',
  ]},
  { v:'1.10.1', date:'2026-07-03', notes:[
    'Salabots: kredīta atlikums pēc "−"/"+" tagad noapaļojas uz 2 cipariem aiz komata',
  ]},
  { v:'1.10.0', date:'2026-07-03', notes:[
    'Kredītiem pievienots mēneša maksājuma lauks ar "−"/"+" pogām atlikuma samazināšanai',
    'Zem kredītiem pievienota mēneša maksājumu kopsumma blakus "Atlikums kopā"',
  ]},
  { v:'1.9.1', date:'2026-07-03', notes:[
    'Salabots: ievadlauku teksts modālajos logos tagad redzams arī tumšajā tēmā',
  ]},
  { v:'1.9.0', date:'2026-07-03', notes:[
    'Pievienota tumšā tēma (Dark Theme) — pārslēdz ar ikonu augšā pie versijas',
    'Tēmas izvēle tiek saglabāta lokāli katrā ierīcē',
  ]},
  { v:'1.8.1', date:'2026-07-03', notes:[
    'Arhīva skatā pievienota kredītu "Atlikums kopā" summa',
  ]},
  { v:'1.8.0', date:'2026-07-03', notes:[
    'Kredītu atlikumiem pievienoti neobligāti sākuma/beigu datumi',
    'Rāda nomaksas progresu pēc laika: cik % nomaksāts un cik mēneši atlikuši',
  ]},
  { v:'1.7.2', date:'2026-07-03', notes:[
    'Noņemta "Importēt vecos datus" poga (migrācija pabeigta)',
  ]},
  { v:'1.7.1', date:'2026-07-03', notes:[
    'Novērsta pieteikšanās problēma — pāreja uz uznirstošo logu (popup), jo pārlūki bloķēja iepriekšējo metodi',
  ]},
  { v:'1.7.0', date:'2026-07-03', notes:[
    'Pieteikšanās ar Google kontu — katram lietotājam savs privāts budžets',
    'Aizvietota vecā telpas ID sistēma; dati aizsargāti ar īstiem drošības noteikumiem',
    'Pievienota "Importēt vecos datus" poga migrācijai no vecās versijas',
  ]},
  { v:'1.6.1', date:'2026-07-03', notes:[
    'Arhīva rediģētāja rinda vertikālā telefonā vairs nav saspiesta — paliek vienā līmenī',
  ]},
  { v:'1.6.0', date:'2026-07-02', notes:[
    'Summējošiem rēķiniem pievienots neobligāts mēneša limits (plānotais maksimums)',
    '"Kopā rēķini" rēķina no limita; pievienota "iztērēts" info un progresa josla pie pozīcijas',
  ]},
  { v:'1.5.0', date:'2026-07-02', notes:[
    'Pievienots summējošs rēķina veids (piem. degviela) — krājas visu mēnesi ar "+" epizodēm',
    'Katra epizode saglabājas ar summu, piezīmi un datumu; atsevišķas epizodes var dzēst',
    'Jaunu rēķinu pievienojot, var izvēlēties veidu: parasts vai summējošs',
  ]},
  { v:'1.4.0', date:'2026-07-02', notes:[
    'Dzēšot rēķinu, kredīta atlikumu vai kategoriju, tagad tiek prasīts apstiprinājums',
  ]},
  { v:'1.3.0', date:'2026-07-02', notes:[
    'Pievienota "Importēt" poga — eksportēto JSON rezerves kopiju var ielādēt atpakaļ',
  ]},
  { v:'1.2.0', date:'2026-07-02', notes:[
    'Pievienota versijas numura rādīšana zem virsraksta un "Kas jauns" (changelog) logs',
  ]},
  { v:'1.1.2', date:'2026-07-02', notes:[
    'Atjauninātas noklusētās paraugvērtības jauniem lietotājiem (neitrāli dati)',
    'Pievienotas "Pārtika" un "Īre" noklusētās kategorijas',
  ]},
  { v:'1.1.1', date:'2026-07-02', notes:[
    'Kredītu atlikumiem pievienota pārkārtošana (drag & drop) un vienots dzēšanas dizains',
  ]},
  { v:'1.1.0', date:'2026-07-02', notes:[
    'Kategorijas tagad pilnībā pārvaldāmas: pievienot, pārsaukt, mainīt krāsu, dzēst',
    'Kategorijas glabājas Firebase un sinhronizējas starp ierīcēm',
  ]},
  { v:'1.0.6', date:'2026-07-02', notes:[
    'Novērsta problēma, kad ātri rakstot kursors izlēca no lauka (sinhronizācija vairs netraucē rakstīšanai)',
  ]},
  { v:'1.0.5', date:'2026-07-02', notes:[
    'Arhīva rediģētājs: pievienota "Labot" poga — lauki sākotnēji tikai skatāmi, atbloķējas pēc nospiešanas',
    'Atgriezta samaksas statusa atzīme ("Samaksāts" / "Nav samaksāts") un € zīme summām',
  ]},
  { v:'1.0.4', date:'2026-07-02', notes:[
    'Arhīva ieraksts kļuvis pilnībā rediģējams (alga, rēķini, kredīti, secība) ar melnraksta aizsardzību',
    'Pievienota arhīva ierakstu dublēšana un pārsaucams nosaukums',
  ]},
  { v:'1.0.3', date:'2026-07-02', notes:[
    'Rēķiniem pievienota pārkārtošana ar drag & drop',
    'Pievienota maksājumu izsekošana ar ķeksīšiem ("Vēl jāmaksā")',
  ]},
  { v:'1.0.2', date:'2026-07-02', notes:[
    'Pievienots mēnešu arhīvs ("Aizvērt mēnesi" → momentuzņēmums)',
    'Pievienoti grafiki (sadalījums pa kategorijām) ar riņķa diagrammu',
  ]},
  { v:'1.0.1', date:'2026-07-02', notes:[
    'Vairāki izkārtojuma labojumi (dzēšanas × pozīcija, viena kolonna datorā)',
  ]},
  { v:'1.0.0', date:'2026-07-02', notes:[
    'Pirmā versija: rēķini, kredītu atlikumi, alga, "Paliek" aprēķins',
    'Datu sinhronizācija starp ierīcēm caur Firebase',
  ]},
];
