/*
 * Finanšu pārvaldnieks (BudzetsIMT)
 * Copyright (c) 2026 Mārtiņš Barons. Visas tiesības paturētas.
 * Skatīt LICENSE failu repozitorija saknē.
 */
// changelog.js — pilna versiju vēsture (ES modulis)
// VERSION app.js failā tiek atvasināts no CHANGELOG[0].v — pievienojot jaunu
// ierakstu, tas AUTOMĀTISKI kļūst par jauno lietotnes versiju.

export const CHANGELOG = [
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
