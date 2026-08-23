/*
 * Finanšu pārvaldnieks (BudzetsIMT)
 * Copyright (c) 2026 Mārtiņš Barons. Visas tiesības paturētas.
 * Skatīt LICENSE failu repozitorija saknē.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, onSnapshot, setDoc, getDoc, getDocs, deleteDoc, collection, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithCredential, getRedirectResult, onAuthStateChanged, signOut, deleteUser, reauthenticateWithPopup, initializeAuth, indexedDBLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider, getToken as getAppCheckToken } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';
import { CHANGELOG } from './changelog.js';

// Capacitor runtime + native Firebase Authentication plugin (bundler-free copies
// in js/, wired up via the import map in index.html). On the public web the
// plugin is inert — the native sign-in path is only used inside the Capacitor
// WebView, where window.open() based popups do not work.
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { LocalNotifications } from '@capacitor/local-notifications';

import { initI18n, getLang, setLang, t, SUPPORTED_LANGS, applyStaticTranslations, onLangChange, currentLocale } from './js/i18n.js';
initI18n();
applyStaticTranslations();
onLangChange(() => applyStaticTranslations());

/* ═══════════════════════════════════════════════════════════════
   1. KONFIGURĀCIJA — Firebase, App Check, versija, changelog
   Faila augšā glabājas visas galvenās konstantes.
   VERSION un CHANGELOG jāatjaunina KATRĀ izmaiņā.
   ═══════════════════════════════════════════════════════════════ */

// ---- Firebase config (embedded) ----
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDNHrObS8v_US22wzuqKnAI_PuI7P1JVlw",
  authDomain: "budzets-c5d39.firebaseapp.com",
  projectId: "budzets-c5d39",
  storageBucket: "budzets-c5d39.firebasestorage.app",
  messagingSenderId: "862378422626",
  appId: "1:862378422626:web:6f7da765c63f158fd43c3b"
};

// ---- App Check (reCAPTCHA Enterprise) ----
// Šī atslēga ir publiska pēc dizaina — aizsardzība balstās uz domēna
// pārbaudi Google pusē, ne uz atslēgas slēpšanu.
const RECAPTCHA_SITE_KEY = '6LeK61gtAAAAABRdlySKloEkIl5F1mq-rQDmYPmx';

// ---- Version (atvasināta no changelog.js) ----
const VERSION = CHANGELOG[0].v;

/* ═══════════════════════════════════════════════════════════════
   2. PALĪGFUNKCIJAS UN STĀVOKLIS (state)
   Formatēšana (€), rēķinu/kredītu aprēķini, kategorijas,
   noklusējuma dati un mainīgais `state`, kas tur visu lietotnes info.
   ═══════════════════════════════════════════════════════════════ */

const fmt = n => '€ ' + (Number(n)||0).toLocaleString(currentLocale(),{minimumFractionDigits:2,maximumFractionDigits:2});
// Rounded, no-decimals version for the compact topbar pace indicator (full precision stays in the popover)
const fmtCompact = n => '€' + Math.round(Number(n)||0).toLocaleString(currentLocale(),{maximumFractionDigits:0});
// Actual spent for a summing bill = sum of entries; for normal bill = its amount
function billSpent(b){
  if(b && b.type==='summing') return (b.entries||[]).reduce((s,e)=>s+(Number(e.amount)||0),0);
  return Number(b.amount)||0;
}
// Budget amount used in "Kopā rēķini" etc: summing bill with a limit uses the limit,
// unless actual spending has exceeded it — then the real spent amount is used instead.
function billAmount(b){
  if(b && b.type==='summing'){
    const lim = Number(b.limit);
    const spent = billSpent(b);
    if(lim>0) return Math.max(lim, spent);
    return spent;
  }
  return Number(b.amount)||0;
}
// Summing bills (fuel etc.) have no single deferred payment — each entry is money already
// spent at the time it was logged, so they're always treated as "paid" for totals/sorting.
function isBillPaid(b){ return b && b.type==='summing' ? true : !!b.paid; }
// Papildus (neregulāri, neprognozējami) ienākumi šim mēnesim — summējas klāt bāzes
// ienākumam (state.income) visos aprēķinos (Paliek, Vēl jāmaksā, tēriņu temps u.c.).
function extraIncomeTotal(){ return (state.extraIncome||[]).reduce((s,e)=>s+(Number(e.amount)||0),0); }
function totalIncome(){ return (Number(state.income)||0) + extraIncomeTotal(); }
// Reāli iztērētais TIEŠI šodien: parastam rēķinam — ja apzīmēts "Samaksāts" ŠODIEN
// (paidDate), summējošam rēķinam — epizodes ar šodienas datumu (tām jau ir savs datums).
function spentToday(){
  const today = todayStr();
  return (state.bills||[]).reduce((total,b)=>{
    if(b.type==='summing'){
      return total + (b.entries||[]).filter(e=>e.date===today).reduce((s,e)=>s+(Number(e.amount)||0),0);
    }
    return total + (b.paid && b.paidDate===today ? (Number(b.amount)||0) : 0);
  }, 0);
}
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
// Stable random id for bills/reminders — lets reminders reference a bill across
// reorders, renames, and "Jauns mēnesis" resets (which only touch amount/paid/entries).
function genId(){ return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,9); }
function goalById(id){ return (state.savingsGoals||[]).find(g=>g.id===id); }
// Aptuvenais atlikušais laiks/datums, balstīts uz ATLIKUŠAJIEM (vēl neapmaksātajiem)
// maksājumiem no ŠODIENAS — nevis fiksētu, izveides brīdī aprēķinātu datumu, jo izlaists
// maksājums mērķi nobīda uz priekšu (sk. lēmumu Nr.3 diskusijā par šo funkciju).
function goalProjectedEndDate(remainingInstallments){
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth()+Math.max(remainingInstallments,0), now.getDate());
  return next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0');
}

// ---- Reminder date logic ----
// Linked reminders (billId set) store only a day-of-month ("day"); the actual due date
// is always computed against the REAL current calendar month, so it stays correct
// automatically after "Jauns mēnesis" without any extra bookkeeping.
function daysInMonth(year, month){ return new Date(year, month+1, 0).getDate(); } // month: 0-11
function reminderDueDate(r){
  if(r.billId){
    const day = Math.min(Math.max(parseInt(r.day,10)||1,1),31);
    const now = new Date();
    const clamped = Math.min(day, daysInMonth(now.getFullYear(), now.getMonth()));
    return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(clamped).padStart(2,'0');
  }
  return r.date || '';
}
// Nākamā mēneša termiņš tam pašam day — izmanto, lai parādītu korektu "nākamreiz" datumu
// jau atrisinātam (apmaksātam) atgādinājumam, kura reminderDueDate() vēl rāda šo mēnesi.
function reminderNextMonthDueDate(r){
  if(!r.billId) return reminderDueDate(r);
  const day = Math.min(Math.max(parseInt(r.day,10)||1,1),31);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth()+1, 1);
  const clamped = Math.min(day, daysInMonth(next.getFullYear(), next.getMonth()));
  return next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(clamped).padStart(2,'0');
}
// 'overdue' | 'today' | 'upcoming' | null (no valid date)
function reminderStatus(r){
  const due = reminderDueDate(r);
  if(!due) return null;
  const today = todayStr();
  if(due < today) return 'overdue';
  if(due === today) return 'today';
  return 'upcoming';
}
function billById(id){ return (state.bills||[]).find(b=>b.id===id); }
// Bill-linked atgādinājums, kura rēķins jau atzīmēts "Samaksāts", šim ciklam
// tiek uzskatīts par atrisinātu (nerādās Šodien/Nokavēts, kamēr rēķins nav "atpazīmēts"
// vai nav sācies jauns mēnesis, kas paid atiestata uz false). Summējošiem rēķiniem
// (kuriem nav "paid" lauka vispār) šī pārbaude nekad neaktivizējas — bill.paid ir
// vienmēr falsy — tāpēc to atgādinājumi (ja tādi palikuši no laika pirms šī ierobežojuma)
// turpina rādīties tīri pēc datuma, bez izmaiņām.
function reminderIsResolved(r){
  if(!r.billId) return false;
  const b = billById(r.billId);
  return !!(b && b.paid);
}
function reminderDisplayName(r){
  if(r.billId){ const b = billById(r.billId); return b ? (b.name||t('common.no_name')) : (r.name || t('common.deleted_bill')); }
  return r.name || t('common.no_name');
}

// ---- Native paziņojumi priekš atgādinājumiem (tikai Android/iOS, ne web/PWA) ----
// LocalNotifications prasa skaitlisku id, bet mūsu genId() ģenerē teksta virkni —
// šī ir stabila 32-bit hash funkcija, kas no viena un tā paša r.id vienmēr atgriež
// to pašu skaitli (vajadzīgs, lai varētu atcelt/pārrakstīt konkrētu paziņojumu).
function reminderNotifId(id){
  let h = 0;
  const s = String(id);
  for(let i=0;i<s.length;i++){ h = ((h<<5)-h + s.charCodeAt(i))|0; }
  return Math.abs(h) || 1;
}

// Pieprasa paziņojumu atļauju vienreiz (ja vēl nav lūgta/atteikta) un pēc tam
// pilnībā pārplāno visus native paziņojumus atbilstoši pašreizējam state.reminders.
// Ar rēķinu saistīti atgādinājumi (billId+day) → atkārtojas katru mēnesi tajā
// pašā dienā (schedule.on), tāpat kā UI aprēķina due date pret reālo kalendāru.
// Brīvie atgādinājumi (date) → vienreizējs paziņojums tajā datumā.
async function scheduleReminderNotifications(){
  if(!IS_NATIVE) return;
  try {
    let perm = await LocalNotifications.checkPermissions();
    if(perm.display === 'prompt' || perm.display === 'prompt-with-rationale'){
      perm = await LocalNotifications.requestPermissions();
    }
    if(perm.display !== 'granted') return;

    const pending = await LocalNotifications.getPending();
    if(pending.notifications.length){
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n=>({ id:n.id })) });
    }

    const [notifHour, notifMinute] = getReminderNotifTime().split(':').map(n=>parseInt(n,10));
    const notifications = [];
    (state.reminders||[]).filter(r=>r.active).forEach(r=>{
      const id = reminderNotifId(r.id);
      const title = t('notif.reminder_title');
      const body = reminderDisplayName(r);
      if(r.billId){
        const day = Math.min(Math.max(parseInt(r.day,10)||1,1),31);
        // Katra mēneša reālais garums atšķiras (28-31 diena). Native atkārtojošais
        // `on:{day}` trigeris VIENKĀRŠI NEKAD neuzdodas mēnešos, kam nav šīs dienas
        // (piem. 31. datums februārī/aprīlī/jūnijā/septembrī/novembrī) — tā vietā
        // ieplānojam vienreizējus paziņojumus tuvākajiem 2 mēnešiem, katru ar TO PAŠU
        // clamp loģiku, ko jau izmanto reminderDueDate() ekrānā. Šī funkcija tāpat tiek
        // pārsaukta pēc katras sinhronizācijas, tāpēc 2 mēnešu priekšstats ir droši
        // pietiekams, lai nekad neizsīktu starp diviem app palaišanas reizēm.
        const now = new Date();
        for(let m=0; m<2; m++){
          const clampedDay = Math.min(day, daysInMonth(now.getFullYear(), now.getMonth()+m));
          const at = new Date(now.getFullYear(), now.getMonth()+m, clampedDay, notifHour, notifMinute, 0);
          if(at.getTime() <= Date.now()) continue;
          notifications.push({ id: id+m, title, body, schedule: { at, allowWhileIdle:true } });
        }
      } else if(r.date){
        let at = new Date(r.date + 'T' + getReminderNotifTime() + ':00');
        if(isNaN(at)) return;
        // Ja izvēlētais laiks šodien jau pagājis (bet datums vēl nav pagātnē),
        // paziņo tuvākajā minūtē, nevis izlaiž pavisam — citādi lietotājs, kas
        // pievieno "šodienas" atgādinājumu pēc plkst. 9:00, paziņojumu nesaņemtu.
        const today = new Date(); today.setHours(0,0,0,0);
        const remDate = new Date(r.date + 'T00:00:00');
        if(at.getTime() <= Date.now()){
          if(remDate.getTime() === today.getTime()) at = new Date(Date.now() + 60000);
          else return; // datums pats ir pagātnē — neko nesūtām
        }
        notifications.push({ id, title, body, schedule: { at, allowWhileIdle:true } });
      }
    });
    if(notifications.length){
      await LocalNotifications.schedule({ notifications });
    }
  } catch(e){
    console.warn('Atgādinājumu paziņojumu plānošana neizdevās:', e);
  }
}
// Time-based credit progress from start/end dates. Returns null if dates missing/invalid.
function creditProgress(c){
  if(!c || !c.start || !c.end) return null;
  const s = new Date(c.start+'T00:00:00'), e = new Date(c.end+'T00:00:00'), now = new Date();
  if(isNaN(s) || isNaN(e) || e<=s) return null;
  const totalMs = e - s;
  const elapsedMs = Math.min(Math.max(now - s, 0), totalMs);
  const pct = totalMs>0 ? (elapsedMs/totalMs*100) : 0;
  // Months remaining (rounded up), 0 if past end
  const msRemaining = Math.max(e - now, 0);
  const monthsRemaining = Math.ceil(msRemaining / (1000*60*60*24*30.44));
  const totalMonths = Math.round(totalMs / (1000*60*60*24*30.44));
  const done = now >= e;
  return { pct: Math.min(pct,100), monthsRemaining, totalMonths, done };
}
// Default categories — now editable and stored in Firebase. 'cits' is protected (fallback).
const DEFAULT_CATEGORIES = [
  { key:'partika', name:'Pārtika', color:'#c76b5a' },
  { key:'ire', name:'Īre', color:'#5a8ca8' },
  { key:'komunalie', name:'Komunālie', color:'#4a7c59' },
  { key:'kredits', name:'Kredīts', color:'#8d6e8f' },
  { key:'transports', name:'Transports', color:'#c8923a' },
  { key:'abonementi', name:'Abonementi', color:'#5b7a99' },
  { key:'uzkrajumi', name:'Uzkrājumi', color:'#3f8f7a' },
  { key:'cits', name:'Cits', color:'#8a8576' },
];
const DEFAULT_CATEGORIES_EN = [
  { key:'partika', name:'Groceries', color:'#c76b5a' },
  { key:'ire', name:'Rent', color:'#5a8ca8' },
  { key:'komunalie', name:'Utilities', color:'#4a7c59' },
  { key:'kredits', name:'Credit', color:'#8d6e8f' },
  { key:'transports', name:'Transport', color:'#c8923a' },
  { key:'abonementi', name:'Subscriptions', color:'#5b7a99' },
  { key:'uzkrajumi', name:'Savings', color:'#3f8f7a' },
  { key:'cits', name:'Other', color:'#8a8576' },
];
// Keys/colors are identical across languages (they're data IDs, not UI text) — only
// `name` differs, so nothing that matches on `key` needs to know which language seeded it.
function defaultCategories(){ return structuredClone(getLang()==='en' ? DEFAULT_CATEGORIES_EN : DEFAULT_CATEGORIES); }
// Live lookups derived from state.categories
function catList(){ return (state.categories && state.categories.length) ? state.categories : defaultCategories(); }
function catName(key){ const c = catList().find(x=>x.key===key); return c ? c.name : 'Cits'; }
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
// Vienots aizsardzības punkts: jebkura kategorijas krāsa, kas nonāk DOM inline style
// atribūtā, vispirms iet caur šo — neatkarīgi no tā, vai tā nāk no color picker,
// JSON importa vai sinhronizācijas no citas ierīces (piem., ja tur nonāktu dati,
// kas apietu Firestore rules validāciju, piem. no vecākas app versijas).
function safeColor(c){ return (typeof c==='string' && HEX_COLOR_RE.test(c)) ? c : '#8a8576'; }
function catColor(key){ const c = catList().find(x=>x.key===key); return safeColor(c ? c.color : '#8a8576'); }

// Jauna konta/atiestatīta konta sākuma stāvoklis — APZINĀTI TUKŠS (bez demo rēķiniem/
// kredītiem/ienākuma). Iepriekš seit bija piemēra dati (algas summa + 4 rēķini +
// 3 kredīti), bet reāla testera atsauksme (2026-08-20): ar noklusējuma ienākumu
// nesakrītošas demo summas radīja mulsinošu, dažkārt SARKANU/negatīvu bilanci pašā
// pirmajā iespaidā, un lietotājam vēl bija manuāli jādzēš piemēra ieraksti, pirms
// varēja sākt reāli lietot. Kategorijas PALIEK (strukturāli noklusējumi, ne skaitliski
// dati — nekad nerada "mīnusā" pārsteigumu), tāpēc tās vienīgās sēj tālāk.
const DEFAULT = {
  income: 0,
  periodName: '',
  bills: [],
  credits: [],
  categories: structuredClone(DEFAULT_CATEGORIES),
  reminders: [],
  extraIncome: [],
  salaryDay: null,
  savingsGoals: []
};
const DEFAULT_EN = {
  income: 0,
  periodName: '',
  bills: [],
  credits: [],
  categories: structuredClone(DEFAULT_CATEGORIES_EN),
  reminders: [],
  extraIncome: [],
  salaryDay: null,
  savingsGoals: []
};
// Picked fresh at every seed point (not baked into a constant) so it also respects a
// language change made just before a brand-new account's first sign-in.
function defaultSeed(){ return structuredClone(getLang()==='en' ? DEFAULT_EN : DEFAULT); }

let state = structuredClone(defaultSeed());
let db, auth, docRef, roomId, applyingRemote=false, saveTimer=null, localDirty=false;
let lastSentJSON = null, pendingSnapshot = null, pendingReload = false;
let currentUser = null, snapshotUnsub = null, categoriesUnsub = null;
let creditsUnsub = null, extraIncomeUnsub = null, remindersUnsub = null;
let billsUnsub = null, savingsGoalsUnsub = null;
let lastSyncedCredits = [], lastSyncedExtraIncome = [], lastSyncedReminders = [];
let lastSyncedBills = [], lastSyncedSavingsGoals = [];
let pendingCreditsSnapshot = null, pendingExtraIncomeSnapshot = null, pendingRemindersSnapshot = null;
let pendingBillsSnapshot = null, pendingSavingsGoalsSnapshot = null;

const $ = id => document.getElementById(id);

// Reset ALL account-scoped in-memory caches — not just `state` — so a different user
// signing in within the same tab (no page reload) never inherits the previous account's
// data. Broader than an earlier fix that only reset `state`: also clears the debounced-save
// timer, every deferred pending*Snapshot, the sync diff baselines, and the archive cache,
// since any of these surviving a sign-out could leak/corrupt the next account's data (an
// orphaned pushNow() write landing in the new account's document, a deferred snapshot from
// the old account applied after the switch, stale archive entries shown before the new
// account's archive loads, etc.).
function resetAccountState(){
  clearTimeout(saveTimer); saveTimer = null;
  localDirty = false;
  lastSentJSON = null;
  pendingSnapshot = null;
  pendingCreditsSnapshot = null;
  pendingExtraIncomeSnapshot = null;
  pendingRemindersSnapshot = null;
  pendingBillsSnapshot = null;
  pendingSavingsGoalsSnapshot = null;
  lastSyncedCredits = [];
  lastSyncedExtraIncome = [];
  lastSyncedReminders = [];
  lastSyncedBills = [];
  lastSyncedSavingsGoals = [];
  archiveCache = [];
  state = structuredClone(defaultSeed());
}

/* ═══════════════════════════════════════════════════════════════
   3. FIREBASE — inicializācija, App Check, pieteikšanās/izrakstīšanās
   Šeit startē Firebase, notiek Google Sign-In, un tiek izveidots
   savienojums ar lietotāja datiem mākonī (Firestore sinhronizācija).
   ═══════════════════════════════════════════════════════════════ */

// ---- Firebase init + Google auth ----
const fbApp = initializeApp(FIREBASE_CONFIG);
// True inside the Capacitor WebView; false on the public web.
const IS_NATIVE = !!Capacitor.isNativePlatform();

// App Check IESLĒGTS KLIENTA PUSĒ (2026-08-13, Fāze 1) — pēc Billing konta pievienošanas
// un reCAPTCHA Enterprise API/IAM lomu apstiprināšanas Google Cloud Console.
// ROOT CAUSE ATRASTS UN ATRISINĀTS (2026-08-17, Firebase Support): `request.app` NAV
// derīgs lauks Firestore Security Rules `request` objektā (tas eksistē TIKAI Cloud
// Functions Callable kontekstā) — tāpēc rules līmeņa `appChecked()` NEKAD nevarēja
// strādāt un tika APZINĀTI atstāts neizmantots `firestore.rules`. Pareizais enforcement
// mehānisms Firestore priekš ir Firebase Console → App Check → APIs → Cloud Firestore
// "Enforce" poga (infrastruktūras līmenī, PIRMS pieprasījums sasniedz rules) — tas
// IESLĒGTS 2026-08-17. Sk. BUDZETSIMT_MASTER_INSTRUKCIJA.md faila sākuma 2026-08-17
// ierakstu pilnam aprakstam.
// NATIVE Play Integrity (2026-08-17, mēģinājums): @capacitor-firebase/app-check
// spraudnis (bundler-free kopija js/app-check/, tas pats modelis kā firebase-auth,
// CustomProvider bridge — oficiāli dokumentēts capawesome-team/capacitor-firebase
// integrācijas modelis) TIKA UZBŪVĒTS un ir kodā, BET reālā ierīces testā
// (2026-08-17) VIENMĒR atgriež `403 App attestation failed` no
// `exchangePlayIntegrityToken`, arī pēc pareiza debug keystore SHA-256 pievienošanas
// App Check konsolē. Hipotēze (NAV apstiprināta): Play Integrity servera puse
// pilnībā neatpazīst app, kas nekad nav bijis Play Console (reģistrācija vēl nav
// sākta). Rezultātā šis salauza reālu Firestore piekļuvi native app (App Check
// enforcement noraidīja placeholder tokenu) — tāpēc TAD bija PAGAIDĀM IZSLĒGTS.
// 2026-08-20: Play Console reģistrācija tagad IR pabeigta (app ieraksts
// `lv.mrbir.budzetsimt` eksistē), kas bija trūkstošais priekšnoteikums hipotēzei —
// atkārtoti IESLĒGTS izmēģināšanai internal testing būvējumā.
const NATIVE_APP_CHECK_PLAY_INTEGRITY = true;
// Kamēr karogs ir false, native platforma (Capacitor WebView, kas serverē no
// https://localhost) izmanto TIEŠI TO PAŠU ceļu, kas zemāk — `location.hostname`
// pārbaude jau dabiski aptver arī native gadījumu.
// appCheckReady: connectForUser() to nogaida PIRMS Firestore klausītāja atvēršanas.
// Bez tā initializeAppCheck() ir "fire-and-forget" — ja lietotājam jau ir saglabāta
// sesija, onAuthStateChanged var nostrādāt ātrāk nekā App Check tokena tīkla
// pieprasījums, un pirmais onSnapshot() pieprasījums aizceļo BEZ tokena — ar Enforce
// ieslēgtu tas nozīmētu tūlītēju noraidījumu Firebase infrastruktūras līmenī, no kā
// Firestore SDK pats no jauna nemēģina pieslēgties.
// Timeout (3s) nodrošina, ka lietotne netiek bloķēta, ja App Check pats nestrādā.
let appCheckReady = Promise.resolve();
try {
  if(IS_NATIVE && NATIVE_APP_CHECK_PLAY_INTEGRITY){
    const initPromise = FirebaseAppCheck.initialize().then(()=>{
      const provider = new CustomProvider({
        getToken: () => FirebaseAppCheck.getToken()
      });
      const appCheckInstance = initializeAppCheck(fbApp, {
        provider,
        isTokenAutoRefreshEnabled: true
      });
      return getAppCheckToken(appCheckInstance);
    }).catch(e=>{
      console.warn('App Check (native/Play Integrity) inicializācija neizdevās:', e);
    });
    appCheckReady = Promise.race([initPromise, new Promise(resolve=>setTimeout(resolve, 3000))]);
  } else {
    if(location.hostname === 'localhost' || location.hostname === '127.0.0.1'){
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const appCheckInstance = initializeAppCheck(fbApp, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    const tokenPromise = getAppCheckToken(appCheckInstance).catch(e=>{
      console.warn('App Check tokena iegūšana neizdevās:', e);
    });
    appCheckReady = Promise.race([tokenPromise, new Promise(resolve=>setTimeout(resolve, 3000))]);
  }
} catch(e){
  // App Check kļūme nedrīkst apturēt lietotni, kamēr enforcement nav ieslēgts
  console.warn('App Check inicializācija neizdevās:', e);
}

// Offline atbalsts: IndexedDB lokālais kešs ļauj datiem palikt lasāmi/rediģējami
// bez interneta (SDK automātiski rindo rakstīšanas un nosūta tās, tiklīdz savienojums
// atgriežas). persistentMultipleTabManager, jo lietotājs var atvērt vairākas cilnes
// vienā pārlūkā — bez tā persistence strādātu tikai VIENĀ cilnē uzreiz. Ar drošu
// fallback uz parasto (tikai atmiņas) kešu, ja IndexedDB nav pieejams (piem., dažu
// pārlūku privātais režīms).
try {
  db = initializeFirestore(fbApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch(e){
  console.warn('Firestore offline persistence neizdevās, izmanto tikai-atmiņas kešu:', e);
  db = getFirestore(fbApp);
}
// In the WebView the native plugin performs Google sign-in; the web SDK is then
// told to persist its session in IndexedDB (sessionStorage/localStorage are
// unreliable there). On the public web default getAuth() behavior is used.
auth = IS_NATIVE ? initializeAuth(fbApp, { persistence: indexedDBLocalPersistence }) : getAuth(fbApp);
const provider = new GoogleAuthProvider();

// Native Google sign-in via the @capacitor-firebase/authentication plugin. Returns
// a web-SDK AuthCredential built from the native ID token; rejects if the user
// cancels or fails in the native account chooser. Only used on Android/iOS.
async function nativeGoogleCredential(){
  const res = await FirebaseAuthentication.signInWithGoogle();
  const idToken = res.credential && res.credential.idToken;
  if(!idToken) throw new Error(t('auth.google_not_confirmed'));
  return GoogleAuthProvider.credential(idToken);
}

$('signInBtn').addEventListener('click', async ()=>{
  $('gateErr').textContent = '';
  try {
    if(IS_NATIVE){
      // WebView path: window.open()-based popups and full-page redirects do not
      // work inside the Capacitor WebView, so sign in natively and bridge the
      // resulting ID token into the web SDK.
      await signInWithCredential(auth, await nativeGoogleCredential());
    } else {
      // Popup is Firebase's recommended flow — avoids the third-party storage
      // partitioning that breaks signInWithRedirect in Chrome M115+/Brave.
      await signInWithPopup(auth, provider);
    }
  } catch(e){
    if(IS_NATIVE){
      $('gateErr').textContent = t('auth.signin_failed', {msg: e?.message || e});
    } else if(e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment' || e.code === 'auth/cancelled-popup-request')){
      // Popup blocked or unsupported (e.g. some mobile PWAs) → fall back to redirect
      try { await signInWithRedirect(auth, provider); }
      catch(e2){ $('gateErr').textContent = t('auth.signin_failed', {msg: e2.message}); }
    } else if(e && e.code === 'auth/popup-closed-by-user'){
      // User closed the popup — no error message needed
    } else {
      $('gateErr').textContent = t('auth.signin_failed', {msg: e?.message || e});
    }
  }
});

// Still handle redirect result, in case the fallback redirect flow was used on web
if(!IS_NATIVE){
  getRedirectResult(auth).catch(e=>{
    if(e && e.code !== 'auth/no-auth-event'){ $('gateErr').textContent = t('auth.signin_error', {msg: e.message}); }
  });
}

// React to auth state changes
onAuthStateChanged(auth, user=>{
  if(user){
    currentUser = user;
    connectForUser(user.uid);
  } else {
    currentUser = null;
    // Reset in-memory state on sign-out so a different user signing in within the same
    // tab (no page reload) never inherits the previous account's data — otherwise the
    // "new user, no doc yet" branch in subscribeSnapshot() would push these stale
    // bills/credits/categories/etc. straight into the new account's Firestore document.
    resetAccountState();
    if(snapshotUnsub){ snapshotUnsub(); snapshotUnsub = null; }
    if(categoriesUnsub){ categoriesUnsub(); categoriesUnsub = null; }
    if(creditsUnsub){ creditsUnsub(); creditsUnsub = null; }
    if(extraIncomeUnsub){ extraIncomeUnsub(); extraIncomeUnsub = null; }
    if(remindersUnsub){ remindersUnsub(); remindersUnsub = null; }
    if(billsUnsub){ billsUnsub(); billsUnsub = null; }
    if(savingsGoalsUnsub){ savingsGoalsUnsub(); savingsGoalsUnsub = null; }
    $('app').classList.add('hidden');
    $('gate').classList.remove('hidden');
    $('modalRoot').innerHTML = ''; // close any open modal (e.g. Iestatījumi after account deletion)
    const splashEl = $('splash'); if(splashEl) splashEl.classList.add('hidden');
    if(window.__clearSplashWatchdog) window.__clearSplashWatchdog();
  }
});

async function connectForUser(uid){
  roomId = uid;
  docRef = doc(db, 'budgets', uid);
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  const splashEl = $('splash'); if(splashEl) splashEl.classList.add('hidden');
  if(window.__clearSplashWatchdog) window.__clearSplashWatchdog();
  const nameEl = $('userName'); if(nameEl) nameEl.textContent = currentUser?.displayName || currentUser?.email || '';
  setSync('saving', t('drawer.sync_connecting'));
  loadArchive();

  await appCheckReady;
  if(roomId !== uid) return; // lietotājs izgājis/nomainījies, kamēr gaidījām tokenu
  subscribeSnapshot(uid, false);
  subscribeCategoriesSnapshot(uid);
  subscribeCreditsSnapshot(uid);
  subscribeExtraIncomeSnapshot(uid);
  subscribeRemindersSnapshot(uid);
  subscribeBillsSnapshot(uid);
  subscribeSavingsGoalsSnapshot(uid);
}

// isRetry: true, ja šis ir pašdziedinošais atkārtotais mēģinājums pēc permission-denied
// (sk. connectForUser augstāk) — ierobežo uz VIENU atkārtojumu, lai reāls piekļuves
// noraidījums (piem. izlogošanās starplaikā) neradītu bezgalīgu ciklu.
function subscribeSnapshot(uid, isRetry){
  if(snapshotUnsub){ snapshotUnsub(); }
  snapshotUnsub = onSnapshot(docRef, snap=>{
    if(snap.exists()){
      const d = snap.data();
      const incoming = {
        income: d.income ?? DEFAULT.income,
        periodName: d.periodName || '',
        bills: state.bills,
        credits: state.credits,
        categories: state.categories,
        reminders: state.reminders,
        extraIncome: state.extraIncome,
        salaryDay: (d.salaryDay !== undefined && d.salaryDay !== null) ? Number(d.salaryDay) : null,
        savingsGoals: state.savingsGoals
      };
      const incomingJSON = JSON.stringify({ income: incoming.income, periodName: incoming.periodName, salaryDay: incoming.salaryDay });
      if(incomingJSON === lastSentJSON){ setSync('ok', t('sync.synced')); return; }
      // localDirty: kamēr lokālā izmaiņa vēl nav veiksmīgi nosūtīta uz Firestore (600ms
      // debounce + pats setDoc), NEKAD nepārrakstīt state ar ienākošo snapshot — tas ir
      // veca datu kopija, kas šo lokālo izmaiņu vēl neredz. Pretējā gadījumā jauns ieraksts
      // (piem. atgādinājums) uzmirgo un momentā pazūd. isEditingActive() vien nepietiek, jo
      // tā pārbauda tikai fokusu — modālis var jau būt aizvērts, kad snapshot pienāk.
      if(isEditingActive() || localDirty){ pendingSnapshot = incoming; setSync('ok', t('sync.synced')); return; }
      applyRemote(incoming);
    } else {
      // New user: start with empty-ish defaults (no personal data). `categories`/`credits`/
      // `extraIncome`/`reminders`/`bills`/`savingsGoals` NAV šeit — tos pārvalda savi
      // neatkarīgie subkolekciju klausītāji.
      const incoming = { income: 0, periodName: '', bills: state.bills, credits: state.credits, categories: state.categories, reminders: state.reminders, extraIncome: state.extraIncome, salaryDay: null, savingsGoals: state.savingsGoals };
      // Tas pats drošības aizsargs, ko izmanto "dokuments eksistē" zars augstāk — šis
      // zars var nostrādāt arī tad, ja galvenais dokuments tiek dzēsts KAMĒR lietotājs
      // aktīvi rediģē (piem. paralēla konta dzēšana citā cilnē) — bez šī tas uzreiz
      // pārrakstītu viņa nesaglabātās izmaiņas ar tukšiem noklusējumiem.
      if(isEditingActive() || localDirty){ pendingSnapshot = incoming; setSync('ok', t('sync.synced')); return; }
      state = incoming;
      render(); pushNow();
    }
  }, err=>{
    setSync('err', t('sync.error', {code: err.code}));
    if(err.code === 'permission-denied' && !isRetry){
      // Ja App Check tokens paspēja piesaistīties tikai PĒC šī pieprasījuma (sacensība
      // ar onAuthStateChanged), Firestore klausītājs pats no jauna nepieslēgsies —
      // vienu reizi mēģinām atjaunot pēc īsas pauzes.
      setTimeout(()=>{ if(currentUser && currentUser.uid === uid) subscribeSnapshot(uid, true); }, 2000);
    }
  });
}

// Kategoriju subkolekcija (budgets/{uid}/categories/{key}) — atsevišķs klausītājs no
// galvenā dokumenta. Kategorijas migrētas prom no state.categories masīva uz Firestore
// apakškolekciju, lai rules varētu validēt katru kategoriju atsevišķi (pa dokumentam),
// nevis nedrošo masīva-izmēra-tikai pārbaudi. DROŠI BEZ localDirty/pendingSnapshot
// aizsardzības, kas vajadzīga galvenajam dokumentam: kategoriju redaktors
// (openCategoriesModal) rediģē LOKĀLU `draft[]` kopiju un commito visu uzreiz TIKAI uz
// "Saglabāt" klikšķi — ienākošs attālais snapshot nekad neredz pusē-rediģētu stāvokli,
// tāpēc var droši pārrakstīt state.categories jebkurā brīdī.
function subscribeCategoriesSnapshot(uid, isRetry){
  if(categoriesUnsub){ categoriesUnsub(); }
  categoriesUnsub = onSnapshot(collection(db, 'budgets', uid, 'categories'), snap=>{
    let cats = snap.docs.map(d=>({ key: d.id, ...d.data() }));
    if(cats.length===0){
      // Jauns lietotājs VAI vēl nemigrēti veci dati — sēj noklusējuma kategorijas.
      cats = defaultCategories();
      seedCategories(uid, cats);
    } else {
      // Backfill lietotājiem, kas sinhronizējuši PIRMS kāda no PAŠREIZĒJĀM noklusējuma
      // kategorijām tika ieviesta — diff pret VISU noklusējuma sarakstu (nevis vienu
      // burtiski hardkodētu atslēgu), lai jebkura NĀKAMĀ jauna noklusējuma kategorija
      // automātiski nonāktu arī pie esošajiem kontiem, bez vajadzības pievienot vēl vienu
      // manuālu backfill zaru katru reizi, kad saraksts paplašinās.
      const existingKeys = new Set(cats.map(c=>c.key));
      const missing = defaultCategories().filter(c=>!existingKeys.has(c.key));
      if(missing.length){
        cats = cats.concat(missing);
        seedCategories(uid, missing);
      }
    }
    state.categories = cats;
    render();
  }, err=>{
    console.error('Kļūda ielādējot kategorijas:', err);
    // Tas pats pašdziedinošais atkārtojums, ko izmanto subscribeSnapshot() — visi 7
    // klausītāji startē uzreiz pēc tā paša appCheckReady, tāpēc vienlīdz pakļauti tai
    // pašai App Check tokena sacensībai, ne tikai galvenais dokuments.
    if(err.code === 'permission-denied' && !isRetry){
      setTimeout(()=>{ if(currentUser && currentUser.uid === uid) subscribeCategoriesSnapshot(uid, true); }, 2000);
    }
  });
}

// credits/extraIncome subkolekcijas — atšķirībā no categories, šie saraksti TIEK dzīvi
// rediģēti (katra rakstzīme/klikšķis, sk. syncListSubcollection komentāru), tāpēc VAJAG
// to pašu localDirty/isEditingActive() atliktā-snapshot aizsardzību, kas jau strādā
// galvenajam dokumentam (subscribeSnapshot augstāk) — pretējā gadījumā cita ierīce/cilne
// varētu pārrakstīt tikko ievadītu, vēl nenosūtītu izmaiņu. Atliktais snapshot pielietots
// vai nu nākamajā veiksmīgajā pushNow() (sk. turpat), vai focusout handlerī zemāk.
function subscribeCreditsSnapshot(uid, isRetry){
  if(creditsUnsub){ creditsUnsub(); }
  creditsUnsub = onSnapshot(collection(db, 'budgets', uid, 'credits'), snap=>{
    const list = snap.docs.map(d=>({ id: d.id, ...d.data() })).sort((a,b)=>(a.order??0)-(b.order??0));
    // Seed the diff baseline from every remote snapshot (not just after a successful local
    // push) — otherwise a delete as the FIRST edit of a session diffs against an empty
    // lastSyncedCredits, so syncListSubcollection() never issues a batch.delete() for it and
    // the "deleted" item silently survives in Firestore, reappearing on next reload.
    lastSyncedCredits = structuredClone(list);
    if(isEditingActive() || localDirty){ pendingCreditsSnapshot = list; return; }
    state.credits = list; render();
  }, err=>{
    console.error('Kļūda ielādējot kredītus:', err);
    if(err.code === 'permission-denied' && !isRetry){
      setTimeout(()=>{ if(currentUser && currentUser.uid === uid) subscribeCreditsSnapshot(uid, true); }, 2000);
    }
  });
}

function subscribeExtraIncomeSnapshot(uid, isRetry){
  if(extraIncomeUnsub){ extraIncomeUnsub(); }
  extraIncomeUnsub = onSnapshot(collection(db, 'budgets', uid, 'extraIncome'), snap=>{
    const list = snap.docs.map(d=>({ id: d.id, ...d.data() })).sort((a,b)=>(a.order??0)-(b.order??0));
    // See subscribeCreditsSnapshot() comment — seeds the delete-diff baseline from every
    // remote snapshot, not just after a successful local push.
    lastSyncedExtraIncome = structuredClone(list);
    if(isEditingActive() || localDirty){ pendingExtraIncomeSnapshot = list; return; }
    state.extraIncome = list; render();
  }, err=>{
    console.error('Kļūda ielādējot papildu ienākumus:', err);
    if(err.code === 'permission-denied' && !isRetry){
      setTimeout(()=>{ if(currentUser && currentUser.uid === uid) subscribeExtraIncomeSnapshot(uid, true); }, 2000);
    }
  });
}

function subscribeRemindersSnapshot(uid, isRetry){
  if(remindersUnsub){ remindersUnsub(); }
  remindersUnsub = onSnapshot(collection(db, 'budgets', uid, 'reminders'), snap=>{
    const list = snap.docs.map(d=>({ id: d.id, ...d.data() })).sort((a,b)=>(a.order??0)-(b.order??0));
    // See subscribeCreditsSnapshot() comment — seeds the delete-diff baseline from every
    // remote snapshot, not just after a successful local push.
    lastSyncedReminders = structuredClone(list);
    if(isEditingActive() || localDirty){ pendingRemindersSnapshot = list; return; }
    state.reminders = list; render(); scheduleReminderNotifications();
  }, err=>{
    console.error('Kļūda ielādējot atgādinājumus:', err);
    if(err.code === 'permission-denied' && !isRetry){
      setTimeout(()=>{ if(currentUser && currentUser.uid === uid) subscribeRemindersSnapshot(uid, true); }, 2000);
    }
  });
}

function subscribeBillsSnapshot(uid, isRetry){
  if(billsUnsub){ billsUnsub(); }
  billsUnsub = onSnapshot(collection(db, 'budgets', uid, 'bills'), snap=>{
    const list = snap.docs.map(d=>({ id: d.id, ...d.data() })).sort((a,b)=>(a.order??0)-(b.order??0));
    // See subscribeCreditsSnapshot() comment — seeds the delete-diff baseline from every
    // remote snapshot, not just after a successful local push.
    lastSyncedBills = structuredClone(list);
    if(isEditingActive() || localDirty){ pendingBillsSnapshot = list; return; }
    state.bills = list; render();
  }, err=>{
    console.error('Kļūda ielādējot rēķinus:', err);
    if(err.code === 'permission-denied' && !isRetry){
      setTimeout(()=>{ if(currentUser && currentUser.uid === uid) subscribeBillsSnapshot(uid, true); }, 2000);
    }
  });
}

function subscribeSavingsGoalsSnapshot(uid, isRetry){
  if(savingsGoalsUnsub){ savingsGoalsUnsub(); }
  savingsGoalsUnsub = onSnapshot(collection(db, 'budgets', uid, 'savingsGoals'), snap=>{
    const list = snap.docs.map(d=>({ id: d.id, ...d.data() })).sort((a,b)=>(a.order??0)-(b.order??0));
    // See subscribeCreditsSnapshot() comment — seeds the delete-diff baseline from every
    // remote snapshot, not just after a successful local push.
    lastSyncedSavingsGoals = structuredClone(list);
    if(isEditingActive() || localDirty){ pendingSavingsGoalsSnapshot = list; return; }
    state.savingsGoals = list; render();
  }, err=>{
    console.error('Kļūda ielādējot uzkrājuma mērķus:', err);
    if(err.code === 'permission-denied' && !isRetry){
      setTimeout(()=>{ if(currentUser && currentUser.uid === uid) subscribeSavingsGoalsSnapshot(uid, true); }, 2000);
    }
  });
}

// Vienkāršs batch-raksts jaunām/trūkstošām kategorijām (seed/backfill gadījumi augstāk).
async function seedCategories(uid, cats){
  try {
    const batch = writeBatch(db);
    cats.forEach(c=>{ batch.set(doc(db, 'budgets', uid, 'categories', c.key), { name: c.name, color: safeColor(c.color) }); });
    await batch.commit();
  } catch(e){
    console.error('Kļūda sējot noklusējuma kategorijas:', e);
  }
}

// Batch-raksta pilnu kategoriju saraksta izmaiņu (pievienots/rediģēts/dzēsts) kā vienu
// atomāru writeBatch — izsaukts TIKAI no apzinātas "Saglabāt" darbības (categoriju
// redaktors, JSON imports), nevis no scheduleSave() debounce ķēdes.
async function saveCategoriesBatch(oldList, newList){
  const batch = writeBatch(db);
  const oldKeys = new Set((oldList||[]).map(c=>c.key));
  const newKeys = new Set(newList.map(c=>c.key));
  oldKeys.forEach(key=>{ if(!newKeys.has(key)) batch.delete(doc(db, 'budgets', roomId, 'categories', key)); });
  newList.forEach(c=>{ batch.set(doc(db, 'budgets', roomId, 'categories', c.key), { name: c.name, color: safeColor(c.color) }); });
  await batch.commit();
}

// Vispārīgs diff-batch sinhronizētājs sarakstiem, kas TIEK dzīvi rediģēti (atšķirībā no
// categories, kam ir "draft, saglabā uz klikšķi" modelis) — izmanto `pushNow()` katrai
// debounced saglabāšanai, lai `credits`/`extraIncome` subkolekcijas paliktu sinhronā ar
// `state.X`. `order` (masīva pozīcija rakstīšanas brīdī) ierakstīts katram dokumentam, lai
// `credits` vilkšanas-pārkārtošana un `extraIncome` pievienošanas secība saglabātos —
// subkolekcijai nav iebūvētas secības, tāpēc tā VIENMĒR jāatvasina no pašreizējās
// `state.X` masīva kārtības, nevis jāuztur atsevišķi.
async function syncListSubcollection(listName, oldList, newList){
  const batch = writeBatch(db);
  const oldIds = new Set((oldList||[]).map(x=>x.id));
  const newIds = new Set(newList.map(x=>x.id));
  oldIds.forEach(id=>{ if(!newIds.has(id)) batch.delete(doc(db, 'budgets', roomId, listName, id)); });
  newList.forEach((item,i)=>{
    const { id, ...rest } = item;
    batch.set(doc(db, 'budgets', roomId, listName, id), { ...rest, order: i });
  });
  await batch.commit();
}



function applyRemote(incoming){
  applyingRemote = true;
  state = incoming;
  render();
  applyingRemote = false;
  pendingSnapshot = null;
  setSync('ok', t('sync.synced'));
  scheduleReminderNotifications();
}

// Permanently deletes all Firestore data for a user: the archive subcollection
// docs, then the main budgets/{uid} document. Does NOT touch the Auth account —
// that's a separate step (see deleteAccountBtn handler) since it can fail with
// auth/requires-recent-login and needs its own retry path.
async function deleteAllUserData(uid){
  for(const sub of ['archive', 'categories', 'credits', 'extraIncome', 'reminders', 'bills', 'savingsGoals']){
    const snap = await getDocs(collection(db, 'budgets', uid, sub));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  }
  await deleteDoc(doc(db, 'budgets', uid));
}

// True if focus is in a bill/credit/income input on the main view (not the archive modal)
function isEditingActive(){
  const el = document.activeElement;
  if(!el) return false;
  if(el.closest && el.closest('#modalRoot')) return true; // archive editor open
  return !!(el.closest && el.closest('#billsList, #creditsList, #extraIncomeList')) || el.id==='income';
}

// When the user leaves a field, apply any deferred remote update
document.addEventListener('focusout', ()=>{
  setTimeout(()=>{
    if(pendingSnapshot && !isEditingActive() && !localDirty){
      applyRemote(pendingSnapshot);
    }
    if(pendingCreditsSnapshot && !isEditingActive() && !localDirty){
      state.credits = pendingCreditsSnapshot; pendingCreditsSnapshot = null; render();
    }
    if(pendingExtraIncomeSnapshot && !isEditingActive() && !localDirty){
      state.extraIncome = pendingExtraIncomeSnapshot; pendingExtraIncomeSnapshot = null; render();
    }
    if(pendingRemindersSnapshot && !isEditingActive() && !localDirty){
      state.reminders = pendingRemindersSnapshot; pendingRemindersSnapshot = null; render();
    }
    if(pendingBillsSnapshot && !isEditingActive() && !localDirty){
      state.bills = pendingBillsSnapshot; pendingBillsSnapshot = null; render();
    }
    if(pendingSavingsGoalsSnapshot && !isEditingActive() && !localDirty){
      state.savingsGoals = pendingSavingsGoalsSnapshot; pendingSavingsGoalsSnapshot = null; render();
    }
    if(pendingReload && !isEditingActive()){
      window.location.reload();
    }
  }, 150);
});

function setSync(cls, text){
  const dot = $('syncDot');
  dot.className = 'dot ' + cls;
  $('syncText').textContent = text;
}

function scheduleSave(){
  if(applyingRemote) return;
  localDirty = true;
  setSync('saving', t('sync.saving'));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushNow, 600);
}

async function pushNow(){
  try {
    // 1. STINGRĀ DATU SANITIZĀCIJA (lai atbilstu firebase.rules)
    const safeIncome = Math.min(Math.max(Number(state.income) || 0, 0), 1000000);
    const safePeriodName = String(state.periodName || '').slice(0, 60);

    // Kategorijas kopš šīs versijas dzīvo budgets/{uid}/categories/{key} subkolekcijā
    // (sk. saveCategoriesBatch/subscribeCategoriesSnapshot), NEVIS šī dokumenta laukā —
    // tāpēc te vairs netiek sanitizētas/sūtītas.

    // Atgādinājumiem jābūt tieši 7 laukiem un korektam datumam/dienai
    const safeReminders = (state.reminders || []).map(r => {
      let parsedDay = parseInt(r.day, 10);
      return {
        id: r.id ? String(r.id).slice(0, 40) : genId(),
        billId: (r.billId !== undefined && r.billId !== null) ? String(r.billId).slice(0, 40) : null,
        name: r.name ? String(r.name).slice(0, 80) : '',
        day: (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) ? parsedDay : null,
        date: (r.date !== undefined && r.date !== null) ? String(r.date).slice(0, 10) : null,
        active: r.active !== undefined ? Boolean(r.active) : true,
        dismissedFor: (r.dismissedFor !== undefined && r.dismissedFor !== null) ? String(r.dismissedFor).slice(0, 10) : null
      };
    }).slice(0, 50);

    // Papildus ienākumiem jābūt tieši 4 laukiem, pareiziem tipiem (analoģiski reminders)
    const safeExtraIncome = (Array.isArray(state.extraIncome) ? state.extraIncome : []).slice(0, 100).map(e => ({
      id: e.id ? String(e.id).slice(0, 40) : genId(),
      name: String(e.name || '').slice(0, 120),
      amount: Math.min(Math.max(Number(e.amount) || 0, 0), 1000000),
      date: String(e.date || '').slice(0, 10)
    }));

    // Rēķinu un kredītu sanitizācija (2026-08-10) — pēc tā paša principa, kā jau tiek
    // darīts categories/reminders: piespiežam pareizus tipus, lai UI kļūda (piem., amount
    // kā teksts) nevarētu nokļūt Firebase un salauzt aprēķinus. SVARĪGI: limit/monthly ir
    // NEOBLIGĀTI lauki ar nozīmi "nav iestatīts" (atšķiras no "iestatīts uz 0" —
    // sk. kredīta "Mēneša maksājums" lauku, kas rāda tukšu vietu vs "0"), tāpēc, ja lauks
    // nebija klāt, to arī NEPIEVIENOJAM, nevis piespiežam uz 0.
    const safeBills = (Array.isArray(state.bills) ? state.bills : []).slice(0, 200).map(b => {
      const out = {
        id: String(b.id || genId()),
        name: String(b.name || '').slice(0, 120),
        amount: Number(b.amount) || 0,
        cat: String(b.cat || 'cits').slice(0, 20)
      };
      if (b.goalId !== undefined && b.goalId !== null) out.goalId = String(b.goalId).slice(0, 40);
      if (b.type === 'summing') {
        out.type = 'summing';
        out.entries = (Array.isArray(b.entries) ? b.entries : []).slice(0, 200).map(e => ({
          amount: Number(e.amount) || 0,
          note: String(e.note || '').slice(0, 200),
          date: String(e.date || '').slice(0, 10)
        }));
        if (b.limit !== undefined && b.limit !== null && b.limit !== '') out.limit = Number(b.limit) || 0;
      } else {
        out.paid = Boolean(b.paid);
        if (out.paid && b.paidDate) out.paidDate = String(b.paidDate).slice(0, 10);
      }
      return out;
    });
    const safeCredits = (Array.isArray(state.credits) ? state.credits : []).slice(0, 100).map(c => {
      const out = {
        id: c.id ? String(c.id).slice(0, 40) : genId(),
        name: String(c.name || '').slice(0, 120),
        amount: Number(c.amount) || 0
      };
      if (c.monthly !== undefined && c.monthly !== null && c.monthly !== '') out.monthly = Number(c.monthly) || 0;
      if (c.start) out.start = String(c.start).slice(0, 10);
      if (c.end) out.end = String(c.end).slice(0, 10);
      return out;
    });

    // Uzkrājuma mērķiem jābūt tieši 9 laukiem, pareiziem tipiem (analoģiski reminders/extraIncome)
    const safeSavingsGoals = (Array.isArray(state.savingsGoals) ? state.savingsGoals : []).slice(0, 50).map(g => ({
      id: g.id ? String(g.id).slice(0, 40) : genId(),
      name: String(g.name || '').slice(0, 120),
      targetAmount: Math.min(Math.max(Number(g.targetAmount) || 0, 0), 1000000),
      months: Number(g.months) || 0,
      monthlyAmount: Math.min(Math.max(Number(g.monthlyAmount) || 0, 0), 1000000),
      billId: (g.billId !== undefined && g.billId !== null) ? String(g.billId).slice(0, 40) : null,
      paidInstallments: Math.min(Math.max(Number(g.paidInstallments) || 0, 0), 200),
      achieved: Boolean(g.achieved),
      achievedAt: (g.achievedAt !== undefined && g.achievedAt !== null) ? String(g.achievedAt).slice(0, 10) : null
    }));

    // Sagatavojam tīru sūtījumu. `credits`/`extraIncome`/`reminders`/`bills`/`savingsGoals`
    // kopš šīs versijas dzīvo budgets/{uid}/{list}/{id} subkolekcijās (sk.
    // syncListSubcollection), NEVIS šī dokumenta laukos — tāpēc te vairs netiek iekļauti.
    // Galvenajā dokumentā tagad paliek TIKAI skalārie lauki.
    const payload = {
      income: safeIncome,
      periodName: safePeriodName,
      updated: Date.now()
    };
    // salaryDay ir neobligāts (analoģiski periodName) — ja nav iestatīts, lauku VISPĀR
    // nesūtām, nevis sūtām null (Firestore rules validē to kā skaitli 1-31).
    if(state.salaryDay !== undefined && state.salaryDay !== null && state.salaryDay !== ''){
      payload.salaryDay = Math.min(Math.max(parseInt(state.salaryDay,10)||1, 1), 31);
    }

    lastSentJSON = JSON.stringify({
      income: payload.income,
      periodName: payload.periodName,
      salaryDay: payload.salaryDay ?? null
    });

    // 2. SŪTĀM UZ MĀKONI
    await Promise.all([
      setDoc(docRef, payload),
      syncListSubcollection('credits', lastSyncedCredits, safeCredits),
      syncListSubcollection('extraIncome', lastSyncedExtraIncome, safeExtraIncome),
      syncListSubcollection('reminders', lastSyncedReminders, safeReminders),
      syncListSubcollection('bills', lastSyncedBills, safeBills),
      syncListSubcollection('savingsGoals', lastSyncedSavingsGoals, safeSavingsGoals)
    ]);
    lastSyncedCredits = safeCredits;
    lastSyncedExtraIncome = safeExtraIncome;
    lastSyncedReminders = safeReminders;
    lastSyncedBills = safeBills;
    lastSyncedSavingsGoals = safeSavingsGoals;

    localDirty = false;
    setSync('ok', t('sync.synced'));
    scheduleReminderNotifications();

    if(pendingSnapshot && !isEditingActive()){
      applyRemote(pendingSnapshot);
    }
    if(pendingCreditsSnapshot && !isEditingActive()){
      state.credits = pendingCreditsSnapshot; pendingCreditsSnapshot = null; render();
    }
    if(pendingExtraIncomeSnapshot && !isEditingActive()){
      state.extraIncome = pendingExtraIncomeSnapshot; pendingExtraIncomeSnapshot = null; render();
    }
    if(pendingRemindersSnapshot && !isEditingActive()){
      state.reminders = pendingRemindersSnapshot; pendingRemindersSnapshot = null; render();
    }
    if(pendingBillsSnapshot && !isEditingActive()){
      state.bills = pendingBillsSnapshot; pendingBillsSnapshot = null; render();
    }
    if(pendingSavingsGoalsSnapshot && !isEditingActive()){
      state.savingsGoals = pendingSavingsGoalsSnapshot; pendingSavingsGoalsSnapshot = null; render();
    }
  } catch(e){
    console.error('Kļūda saglabājot datus Firebase:', e);
    setSync('err', t('sync.save_failed'));
    // Ja neatiestatām, localDirty paliek `true` uz visiem laikiem — visi turpmākie
    // onSnapshot klausītāji uzskata šo klientu par "vidū rediģēšanā" un mūžīgi atliek
    // ienākošos attālinātos atjauninājumus. Nākamais scheduleSave() jebkurā gadījumā to
    // atkal uzstādīs uz `true`, ja lietotājs turpina rediģēt.
    localDirty = false;
  }
}

/* ═══════════════════════════════════════════════════════════════
   4. ATTĒLOŠANA (rendering) — Budžeta sadaļa
   Zīmē rēķinu sarakstu, kopsummas (alga/paliek/jāmaksā),
   progresa joslu un kategoriju donut diagrammu.
   ═══════════════════════════════════════════════════════════════ */

// ---- Rendering ----
function catOptions(sel){ return catList().map(c=>`<option value="${c.key}"${c.key===sel?' selected':''}>${escapeHtml(c.name)}</option>`).join(''); }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// Which summing bills have their entries list collapsed. Index-based and
// intentionally not persisted — resets on reload, same as any accordion UI.
const collapsedBills = new Set();

// ---- Working month label (shown next to "Rēķini", editable) ----
function currentPeriodLabel(){ return (state.periodName||'').trim() || monthLabel(monthKey()); }
function renderPeriodLabel(){ const el = $('periodLabel'); if(el) el.textContent = '· ' + currentPeriodLabel(); }
function openPeriodLabelEdit(){
  const span = $('periodLabel'), input = $('periodLabelInput');
  if(!span || !input) return;
  input.value = (state.periodName||'').trim() || currentPeriodLabel();
  span.classList.add('hidden');
  input.classList.remove('hidden');
  input.focus(); input.select();
}
function closePeriodLabelEdit(save){
  const span = $('periodLabel'), input = $('periodLabelInput');
  if(!span || !input) return;
  if(save){
    const val = input.value.trim().slice(0,60);
    if(val !== (state.periodName||'').trim()){ state.periodName = val; scheduleSave(); }
  }
  renderPeriodLabel();
  input.classList.add('hidden');
  span.classList.remove('hidden');
}
$('periodLabel').addEventListener('click', openPeriodLabelEdit);
$('periodLabel').addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openPeriodLabelEdit(); } });
$('periodLabelInput').addEventListener('blur', ()=>closePeriodLabelEdit(true));
$('periodLabelInput').addEventListener('keydown', e=>{
  if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); }
  if(e.key==='Escape'){ e.preventDefault(); closePeriodLabelEdit(false); }
});

function render(){
  renderPeriodLabel();
  const income = totalIncome();
  $('income').value = state.income;
  renderExtraIncome();
  const list = $('billsList'); list.innerHTML='';
  (state.bills||[]).forEach((b,i)=>{
    const amt = billAmount(b);
    const pct = income>0 ? (amt/income*100) : 0;
    const isSum = b.type==='summing';
    const spent = isSum ? billSpent(b) : 0;
    const lim = isSum ? (Number(b.limit)||0) : 0;
    const row = document.createElement('div');
    row.className='bill' + (b.paid?' paid':'') + (isSum?' summing':''); row.dataset.cat=b.cat||'cits'; row.dataset.idx=i;
    const amountCell = isSum
      ? `<div class="amount-wrap"><span class="eur">€</span><span class="amount amount-ro" title="${lim>0?t('bills.planned_limit_title'):t('bills.sum_from_entries_title')}">${amt.toFixed(2)}</span><button class="add-entry" data-addentry="${i}" title="${t('bills.add_entry_title')}">+</button></div>`
      : `<div class="amount-wrap"><span class="eur">€</span><input class="amount" type="number" step="0.01" inputmode="decimal" value="${Number(b.amount)||0}" data-i="${i}" data-f="amount"></div>`;
    row.innerHTML = `
      <div class="drag-handle" data-drag="${i}" title="${t('bills.drag_title')}" aria-label="${t('bills.move_aria')}" style="border-left-color:${catColor(b.cat||'cits')}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
      </div>
      ${isSum
        ? `<div class="pay-check pay-check-auto" title="${t('bills.summing_auto_title')}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`
        : `<button class="pay-check" data-pay="${i}" title="${t('bills.mark_paid_title')}" aria-label="${t('bills.paid_aria')}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`}
      <input class="name" value="${escapeHtml(b.name)}" data-i="${i}" data-f="name" placeholder="${t('bills.name_placeholder')}">
      ${amountCell}
      <div class="pct">${pct.toFixed(2)} %</div>
      <select data-i="${i}" data-f="cat">${catOptions(b.cat||'cits')}</select>
      ${b.goalId
        ? `<span class="del del-locked" title="${t('bills.delete_locked_title')}">🔒</span>`
        : `<button class="del" data-del="${i}" title="${t('bills.delete_title')}">×</button>`}`;
    list.appendChild(row);
    // Summing bill detail block: limit progress + entries
    if(isSum){
      const sub = document.createElement('div');
      sub.className = 'entries';
      const over = lim>0 && spent>lim;
      const ratio = lim>0 ? Math.min(spent/lim,1) : 0;
      const collapsed = collapsedBills.has(i);
      const labelHtml = lim>0
        ? `${t('bills.spent_prefix')} <strong>${fmt(spent)}</strong> ${t('bills.spent_of', {limit: fmt(lim)})}${over?` · <span class="over">${t('bills.overspent',{amount:fmt(spent-lim)})}</span>`:''}`
        : `${t('bills.spent_prefix')} <strong>${fmt(spent)}</strong> · ${t('bills.no_limit_suffix')}`;
      const limitLine = `
        <div class="limit-row">
          <button class="entries-toggle" data-toggle="${i}" aria-expanded="${collapsed?'false':'true'}" title="${collapsed?t('bills.show_entries_title'):t('bills.collapse_entries_title')}">
            <svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            <span class="limit-label">${labelHtml}</span>
          </button>
          <button class="limit-edit" data-limit="${i}" title="${lim>0?t('bills.change_limit'):t('bills.set_limit')}">${lim>0?t('bills.change_limit'):t('bills.set_limit')}</button>
        </div>
        ${lim>0 ? `<div class="limit-track"><div class="limit-fill" style="width:${ratio*100}%;background:${over?'var(--red)':'var(--green)'}"></div></div>` : ''}`;
      const entriesHtml = (b.entries||[]).length
        ? (b.entries||[]).map((e,ei)=>`
          <div class="entry-row">
            <span class="entry-date">${escapeHtml(e.date||'')}</span>
            <span class="entry-note">${escapeHtml(e.note||'')}</span>
            <span class="entry-amt">${fmt(e.amount)}</span>
            <button class="entry-del" data-entrydel="${i}" data-entryidx="${ei}" title="${t('bills.delete_entry_title')}">×</button>
          </div>`).join('')
        : `<div class="entry-empty">${t('bills.no_entries_yet')}</div>`;
      sub.innerHTML = limitLine + `<div class="entries-list${collapsed?' collapsed':''}">${entriesHtml}</div>`;
      list.appendChild(sub);
    }
  });
  const cl = $('creditsList'); cl.innerHTML='';
  (state.credits||[]).forEach((c,i)=>{
    const row = document.createElement('div'); row.className='credit'; row.dataset.idx=i;
    const hasDates = c.start && c.end;
    row.innerHTML = `
      <div class="cdrag" data-cdrag="${i}" title="${t('credits.drag_title')}" aria-label="${t('credits.move_aria')}"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
      <input class="cname" value="${escapeHtml(c.name)}" data-ci="${i}" data-f="name" placeholder="${t('credits.name_placeholder')}">
      <div class="camount-wrap"><span class="eur">€</span><input class="camount" type="number" step="0.01" inputmode="decimal" value="${(Number(c.amount)||0).toFixed(2)}" data-ci="${i}" data-f="amount"></div>
      <button class="del" data-cdel="${i}" title="${t('credits.delete_title')}">×</button>`;
    cl.appendChild(row);
    // Progress block (time-based) when dates are set; otherwise a small "set dates" link
    const prog = creditProgress(c);
    const sub = document.createElement('div');
    sub.className = 'credit-detail';
    let datesHtml;
    if(prog){
      const pctTxt = prog.pct.toFixed(0);
      const remTxt = prog.done ? t('credits.paid_off') : t('credits.remaining_months', {count: prog.monthsRemaining});
      datesHtml = `
        <div class="cd-row">
          <span class="cd-label"><strong>${pctTxt}%</strong> ${t('credits.pct_paid_suffix', {rest: remTxt})}</span>
          <button class="cd-edit" data-cdate="${i}">${t('credits.change_dates')}</button>
        </div>
        <div class="cd-track"><div class="cd-fill" style="width:${prog.pct}%"></div></div>`;
    } else {
      datesHtml = `
        <div class="cd-row">
          <span class="cd-label cd-muted">${t('credits.no_deadline')}</span>
          <button class="cd-edit" data-cdate="${i}">${t('credits.set_dates')}</button>
        </div>`;
    }
    // Monthly payment control: [-] [amount] [+]
    const pay = Number(c.monthly)||0;
    const payHtml = `
      <div class="cd-pay-row">
        <span class="cd-pay-label">${t('credits.monthly_payment_label')}</span>
        <div class="cd-pay-controls">
          <button class="cd-pay-btn minus" data-cpay-minus="${i}" title="${t('credits.minus_title')}" ${pay>0?'':'disabled'}>−</button>
          <div class="cd-pay-amt-wrap"><span class="cd-pay-eur">€</span><input class="cd-pay-amt" type="number" step="0.01" inputmode="decimal" value="${c.monthly!=null?(Number(c.monthly)||0):''}" data-cpay="${i}" placeholder="0.00"></div>
          <button class="cd-pay-btn plus" data-cpay-plus="${i}" title="${t('credits.plus_title')}" ${pay>0?'':'disabled'}>+</button>
        </div>
      </div>`;
    sub.innerHTML = datesHtml + payHtml;
    cl.appendChild(sub);
  });
  updateTotals();
  renderReminders();
  renderSavingsGoals();
}

// Papildus ienākumu saraksts ("Papildus ienākumi" panelis) — epizodes ar datumu,
// nosaukumu un summu, kas šim mēnesim summējas klāt bāzes ienākumam.
function renderExtraIncome(){
  const list = $('extraIncomeList');
  if(!list) return;
  list.innerHTML = '';
  const items = state.extraIncome || [];
  items.forEach((it,i)=>{
    const row = document.createElement('div');
    row.className = 'extra-income-row';
    row.dataset.idx = i;
    row.innerHTML = `
      <input type="date" class="eidate" value="${escapeHtml(it.date||'')}" data-ei="${i}" data-f="date">
      <input class="einame" value="${escapeHtml(it.name||'')}" data-ei="${i}" data-f="name" placeholder="${t('extra_income.name_placeholder')}">
      <div class="eamount-wrap"><span class="eur">€</span><input class="eamount" type="number" step="0.01" inputmode="decimal" value="${(Number(it.amount)||0).toFixed(2)}" data-ei="${i}" data-f="amount"></div>
      <button class="del" data-eidel="${i}" title="${t('extra_income.delete_title')}">×</button>`;
    list.appendChild(row);
  });
  const empty = $('extraIncomeEmptyNote');
  if(empty) empty.classList.toggle('hidden', items.length>0);
}

function formatDateLocale(iso){
  if(!iso) return '';
  // Agrāk vienmēr LV formātā (dd.mm.gggg) neatkarīgi no valodas — pārgājām uz
  // toLocaleDateString(currentLocale()), to pašu palīgfunkciju, ko jau lieto arhīva
  // skats, lai EN lietotāji šeit arī redzētu pareizi lokalizētu datumu.
  const d = new Date(iso + 'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString(currentLocale());
}

// Renders the Atgādinājumi section lists + the always-visible nav badge/banner.
// Called from render() so it stays in sync with every state change automatically.
function renderReminders(){
  const reminders = state.reminders || [];
  const dueBox = $('remListDue'), upBox = $('remListUpcoming'), pauseBox = $('remListPaused');
  const pauseGroup = $('remGroupPaused'), emptyNote = $('remEmptyNote');
  if(dueBox && upBox && pauseBox){
    dueBox.innerHTML=''; upBox.innerHTML=''; pauseBox.innerHTML='';
    const dueRows=[], upRows=[], pausedRows=[];
    reminders.forEach((r,i)=>{
      const status = reminderStatus(r);
      if(!r.active){ pausedRows.push({r,i,status}); return; }
      const resolved = reminderIsResolved(r);
      if(!resolved && (status==='overdue' || status==='today')) dueRows.push({r,i,status,resolved});
      else upRows.push({r,i,status,resolved});
    });
    dueRows.sort((a,b)=> reminderDueDate(a.r) < reminderDueDate(b.r) ? -1 : 1);
    upRows.sort((a,b)=> reminderDueDate(a.r) < reminderDueDate(b.r) ? -1 : 1);

    const rowHtml = (r,i,status,paused,resolved)=>{
      const due = reminderDueDate(r);
      const name = reminderDisplayName(r);
      let subHtml;
      if(paused) subHtml = `<span class="rem-sub">${t('reminders.paused_suffix')}${r.billId?t('reminders.paused_bill_inactive'):''}</span>`;
      else if(resolved){
        const nextDue = (status==='overdue'||status==='today') ? reminderNextMonthDueDate(r) : due;
        subHtml = `<span class="rem-sub">${t('reminders.paid_next', {date: formatDateLocale(nextDue)})}</span>`;
      }
      else if(status==='today') subHtml = `<span class="rem-sub due-text">${t('reminders.due_today')}</span>`;
      else if(status==='overdue') subHtml = `<span class="rem-sub due-text">${t('reminders.overdue', {date: formatDateLocale(due)})}</span>`;
      else if(r.billId) subHtml = `<span class="rem-sub">${t('reminders.monthly_around', {day: Math.min(Math.max(parseInt(r.day,10)||1,1),31), date: formatDateLocale(due)})}</span>`;
      else subHtml = `<span class="rem-sub">${t('reminders.due_date', {date: formatDateLocale(due)})}</span>`;
      return `
        <div class="rem-row${(status==='today'||status==='overdue')&&!paused&&!resolved?' due':''}${paused?' paused':''}" data-remidx="${i}">
          <div class="rem-main">
            <span class="rem-name">${escapeHtml(name)}</span>
            ${subHtml}
          </div>
          <button class="rem-toggle" data-remtoggle="${i}">${paused?t('reminders.resume'):t('reminders.pause')}</button>
          <button class="rem-del" data-remdel="${i}" title="${t('common.delete_title')}">×</button>
        </div>`;
    };

    dueBox.innerHTML = dueRows.map(x=>rowHtml(x.r,x.i,x.status,false,x.resolved)).join('');
    upBox.innerHTML = upRows.map(x=>rowHtml(x.r,x.i,x.status,false,x.resolved)).join('') || `<div class="empty-note" style="padding:14px;">${t('reminders.none_upcoming')}</div>`;
    pauseBox.innerHTML = pausedRows.map(x=>rowHtml(x.r,x.i,x.status,true,false)).join('');
    if(pauseGroup) pauseGroup.classList.toggle('hidden', pausedRows.length===0);
    if(emptyNote) emptyNote.classList.toggle('hidden', reminders.length>0);
    $('remGroupDue')?.classList.toggle('hidden', reminders.length===0);
    $('remGroupUpcoming')?.classList.toggle('hidden', reminders.length===0);
  }

  // ---- Badge + banner (visible in ALL sections, not just Atgādinājumi) ----
  const activeDue = reminders.filter(r=>r.active && (reminderStatus(r)==='overdue'||reminderStatus(r)==='today') && !reminderIsResolved(r));
  const badge = $('remindersBadge');
  if(badge){
    if(activeDue.length>0){ badge.textContent = String(activeDue.length); badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
  const undismissed = activeDue.filter(r=>r.dismissedFor !== reminderDueDate(r));
  const banner = $('reminderBanner');
  if(banner){
    if(undismissed.length>0){
      const names = undismissed.slice(0,2).map(r=>reminderDisplayName(r)).join(', ');
      const extra = undismissed.length>2 ? ` +${undismissed.length-2}` : '';
      const textEl = $('reminderBannerText');
      if(textEl) textEl.textContent = undismissed.length===1 ? t('reminders.due_today_banner', {names}) : t('reminders.due_multi_banner', {count: undismissed.length, names, extra});
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }
}

// Renders the Uzkrājuma mērķi section: aktīvie mērķi (ar progresu) + sasniegtie (arhīva stilā,
// pēc Atgādinājumu grupu parauga). Katra aktīvā mērķa "šomēnes samaksāts" statuss nāk tieši
// no saistītā rēķina `paid` lauka — progress pats (paidInstallments) mainās TIKAI "Jauns
// mēnesis" solī, sk. advanceGoalBill().
function renderSavingsGoals(){
  const activeBox = $('goalListActive'), achievedBox = $('goalListAchieved');
  const achievedGroup = $('goalGroupAchieved'), emptyNote = $('goalEmptyNote');
  if(!activeBox || !achievedBox) return;
  const goals = state.savingsGoals || [];
  const active = goals.filter(g=>!g.achieved);
  const achieved = goals.filter(g=>g.achieved);

  activeBox.innerHTML = active.map(g=>{
    const i = goals.indexOf(g);
    const pct = g.months>0 ? Math.min((g.paidInstallments/g.months)*100, 100) : 0;
    const bill = g.billId ? billById(g.billId) : null;
    const paidThisMonth = !!(bill && bill.paid);
    const remaining = Math.max(g.months - g.paidInstallments, 0);
    const etaTxt = remaining>0 ? t('goals.remaining', {count: remaining, date: formatDateLocale(goalProjectedEndDate(remaining))}) : '';
    const statusTxt = paidThisMonth ? t('goals.paid_this_month') : (bill ? t('goals.not_paid_this_month') : '');
    return `
      <div class="goal-card" data-goalidx="${i}">
        <div class="goal-main">
          <span class="goal-name">${escapeHtml(g.name||t('common.no_name'))}</span>
          <span class="goal-sub">${t('goals.per_month_of', {monthly: fmt(g.monthlyAmount), target: fmt(g.targetAmount), paid: g.paidInstallments, months: g.months})}</span>
        </div>
        <div class="goal-track"><div class="goal-fill" style="width:${pct}%"></div></div>
        <div class="goal-foot">
          <span class="goal-status${paidThisMonth?' paid':''}">${statusTxt}</span>
          <span class="goal-eta">${etaTxt}</span>
        </div>
        <button class="goal-del" data-goaldel="${i}" title="${t('goals.delete_title')}">×</button>
      </div>`;
  }).join('') || '';

  achievedBox.innerHTML = achieved.map(g=>{
    const i = goals.indexOf(g);
    return `
      <div class="goal-card achieved" data-goalidx="${i}">
        <div class="goal-main">
          <span class="goal-name">${escapeHtml(g.name||t('common.no_name'))}</span>
          <span class="goal-sub">${t('goals.achieved_suffix', {amount: fmt(g.targetAmount)})}${g.achievedAt?t('goals.achieved_date_suffix', {date: formatDateLocale(g.achievedAt)}):''}</span>
        </div>
        <button class="goal-del" data-goaldel="${i}" title="${t('goals.delete_from_list_title')}">×</button>
      </div>`;
  }).join('');

  if(achievedGroup) achievedGroup.classList.toggle('hidden', achieved.length===0);
  if(emptyNote) emptyNote.classList.toggle('hidden', goals.length>0);
}

['goalListActive','goalListAchieved'].forEach(id=>{
  $(id)?.addEventListener('click', e=>{
    const delBtn = e.target.closest('[data-goaldel]');
    if(!delBtn) return;
    const i = +delBtn.dataset.goaldel;
    const g = state.savingsGoals[i];
    if(!g) return;
    const msg = g.achieved
      ? t('goals.confirm_delete_achieved', {name: g.name||t('common.no_name')})
      : t('goals.confirm_delete', {name: g.name||t('common.no_name')});
    if(confirm(msg)){
      if(g.billId){
        const bi = state.bills.findIndex(b=>b.id===g.billId);
        if(bi>=0) state.bills.splice(bi,1);
        // Tāpat kā parastā rēķina dzēšana — atslēdz (nevis dzēš) jebkuru atgādinājumu, kas
        // bija piesaistīts šim rēķinam, lai tas nepaliktu mūžīgi "nokavēts" neeksistējošam
        // rēķinam.
        (state.reminders||[]).forEach(r=>{ if(r.billId===g.billId) r.active=false; });
      }
      state.savingsGoals.splice(i,1);
      render(); scheduleSave();
    }
  });
});

function openAddSavingsGoalModal(){
  const root = $('modalRoot');
  const MONTH_OPTIONS = [3,6,12,24,36,48,72];
  root.innerHTML = `
    <div class="modal-back" id="agBack">
      <div class="modal" style="max-width:440px;">
        <button class="modal-close" id="agClose">×</button>
        <h3>${t('goal_modal.title')}</h3>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">${t('goal_modal.name_label')}</label>
        <input id="agName" type="text" placeholder="${t('goal_modal.name_placeholder')}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);">
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">${t('goal_modal.amount_label')}</label>
        <div class="amount-wrap"><span class="eur">€</span><input id="agAmount" type="number" step="0.01" inputmode="decimal" min="0" style="width:100%;font:inherit;font-size:18px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);"></div>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">${t('goal_modal.months_label')}</label>
        <div class="rem-type-toggle goal-months-toggle" id="agMonths">
          ${MONTH_OPTIONS.map(m=>`<button class="rem-type-btn" type="button" data-months="${m}">${m}</button>`).join('')}
        </div>
        <div class="goal-ag-preview" id="agPreview"></div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="agCancel">${t('common.cancel')}</button>
          <button class="btn" id="agSave">${t('common.add')}</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('agBack').addEventListener('click', e=>{ if(e.target.id==='agBack') close(); });
  $('agClose').addEventListener('click', close);
  $('agCancel').addEventListener('click', close);

  let selectedMonths = null;
  const updatePreview = ()=>{
    const amount = parseFloat($('agAmount').value)||0;
    const preview = $('agPreview');
    if(!selectedMonths || amount<=0){ preview.textContent=''; return; }
    const monthly = Math.round((amount/selectedMonths)*100)/100;
    preview.textContent = t('goal_modal.monthly_preview', {amount: fmt(monthly), date: formatDateLocale(goalProjectedEndDate(selectedMonths))});
  };
  $('agMonths').addEventListener('click', e=>{
    const btn = e.target.closest('[data-months]'); if(!btn) return;
    selectedMonths = +btn.dataset.months;
    $('agMonths').querySelectorAll('.rem-type-btn').forEach(b=>b.classList.toggle('active', b===btn));
    updatePreview();
  });
  $('agAmount').addEventListener('input', updatePreview);

  $('agSave').addEventListener('click', ()=>{
    const name = $('agName').value.trim();
    const amount = Math.round((parseFloat($('agAmount').value)||0)*100)/100;
    if(!name){ alert(t('goal_modal.name_required')); return; }
    if(amount<=0){ alert(t('goal_modal.amount_required')); return; }
    if(!selectedMonths){ alert(t('goal_modal.months_required')); return; }
    const monthlyAmount = Math.round((amount/selectedMonths)*100)/100;
    const goalId = genId(), billId = genId();
    if(!state.savingsGoals) state.savingsGoals = [];
    state.savingsGoals.push({
      id: goalId, name, targetAmount: amount, months: selectedMonths, monthlyAmount,
      billId, paidInstallments: 0, achieved: false, achievedAt: null, createdAt: todayStr()
    });
    state.bills.push({ id: billId, name, amount: monthlyAmount, cat: 'uzkrajumi', goalId, paid: false });
    close(); render(); scheduleSave();
  });
}
$('addGoalBtn')?.addEventListener('click', openAddSavingsGoalModal);

function updateTotals(){
  const income = totalIncome();
  const bills = state.bills||[];
  const total = bills.reduce((s,b)=>s+billAmount(b),0);
  const ctotal = (state.credits||[]).reduce((s,c)=>s+(Number(c.amount)||0),0);
  const paidSum = bills.filter(isBillPaid).reduce((s,b)=>s+billAmount(b),0);
  const toPay = total - paidSum;
  const paidCount = bills.filter(isBillPaid).length;
  const extraTotal = extraIncomeTotal();
  const incomeBreakdown = $('incomeBreakdown');
  if(incomeBreakdown){
    if(extraTotal>0){
      incomeBreakdown.textContent = t('summary.base_plus_extra', {base: fmt(Number(state.income)||0), extra: fmt(extraTotal)});
      incomeBreakdown.classList.remove('hidden');
    } else {
      incomeBreakdown.textContent = '';
      incomeBreakdown.classList.add('hidden');
    }
  }
  const eFoot = $('extraIncomeFootTotal');
  if(eFoot) eFoot.textContent = fmt(extraTotal);
  $('sumTotal').textContent = fmt(total);
  $('sumPct').textContent = t('summary.pct_of_income', {pct: income>0?(total/income*100).toFixed(1):'0'});
  // Show "iztērēts" only when it differs from the planned total (i.e. summing bills with limits exist)
  const spentTotal = bills.reduce((s,b)=>s+billSpent(b),0);
  const hasLimits = bills.some(b=>b.type==='summing' && (Number(b.limit)||0)>0);
  $('sumSpent').textContent = hasLimits ? t('summary.spent_prefix', {amount: fmt(spentTotal)}) : '';
  $('billsFootTotal').textContent = fmt(total);
  $('creditsFootTotal').textContent = fmt(ctotal);
  const monthlyTotal = (state.credits||[]).reduce((s,c)=>s+(Number(c.monthly)||0),0);
  const monthlyFoot = $('creditsMonthlyFoot');
  if(monthlyFoot){
    if(monthlyTotal>0){ monthlyFoot.style.display=''; $('creditsMonthlyTotal').textContent = fmt(monthlyTotal); }
    else { monthlyFoot.style.display='none'; }
  }
  $('toPay').textContent = fmt(toPay);
  $('paidHint').textContent = t('summary.paid_count', {paid: paidCount, total: bills.length, sum: fmt(paidSum)});
  const remaining = income-total;
  const rem = $('remaining');
  rem.textContent = fmt(remaining); rem.className='value '+(remaining>=0?'pos':'neg');
  $('remHint').textContent = remaining>=0?t('summary.remaining_over'):t('summary.remaining_under');
  // Overspend warning: summing bills where actual spending exceeds the set limit
  const overBills = bills.filter(b=>b.type==='summing' && (Number(b.limit)||0)>0 && billSpent(b)>Number(b.limit));
  const overTitle = overBills.length
    ? t('summary.overspent_prefix') + overBills.map(b=>t('summary.overspent_item', {name: b.name||t('default_bill_name'), amount: fmt(billSpent(b)-Number(b.limit))})).join(', ')
    : '';
  [$('remOverBadge'), $('payOverBadge')].forEach(badge=>{
    if(!badge) return;
    badge.classList.toggle('hidden', overBills.length===0);
    badge.title = overTitle;
  });
  document.querySelectorAll('#billsList .bill').forEach((row,idx)=>{
    const bi = +row.dataset.idx;
    const pct = income>0?(billAmount(state.bills[bi])/income*100):0;
    row.querySelector('.pct').textContent = pct.toFixed(2)+' %';
  });
  const bar=$('bar'); const ratio=income>0?Math.min(total/income,1):0;
  bar.style.width=(ratio*100)+'%';
  bar.style.background = total>income?'var(--red)':total>income*0.8?'var(--amber)':'var(--green)';
  renderCategories(total);
  updatePace();
}

// Cik dienu atlicis LĪDZ NĀKAMAJAI ALGAS DIENAI. Algas datums VIENMĒR nozīmē šo
// dienu NĀKAMAJĀ mēnesī (nekad aktuālajā, pat ja diena šomēnes vēl nav pienākusi) —
// tā lietotājs to definējis. Precīzāk par "līdz mēneša beigām", jo pēc mēneša
// beigām vēl jānodzīvo līdz algai.
function daysUntilNextSalary(day){
  const d = parseInt(day, 10);
  if(!d || d<1 || d>31) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ny = now.getFullYear() + (now.getMonth()===11 ? 1 : 0);
  const nm = (now.getMonth()+1) % 12;
  const candidate = new Date(ny, nm, Math.min(d, daysInMonth(ny, nm)));
  return Math.max(Math.round((candidate - today) / 86400000), 1);
}

// Spending-pace indicator: PaceDaily rāda ŠODIEN reāli iztērēto (nevis vidējo/dienā),
// PaceAvailable — cik nauda pieejama TAGAD, PaceSafe — droša summa/dienā līdz nākamajai
// algai (ja "Algas datums" iestatīts iestatījumos) vai līdz mēneša beigām (ja nav).
// Dot salīdzina šodienas tēriņu pret šo drošo dienas apjomu.
function updatePace(){
  const group = $('topbarPace');
  if(!group) return;
  const income = totalIncome();
  const bills = state.bills||[];
  const spentSoFar = bills.filter(isBillPaid).reduce((s,b)=>s+billSpent(b),0);
  const spentTodayAmt = spentToday();
  const now = new Date();
  const daysInMonthNow = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysElapsed = Math.min(now.getDate(), daysInMonthNow);
  const daysRemaining = state.salaryDay
    ? daysUntilNextSalary(state.salaryDay)
    : Math.max(daysInMonthNow - daysElapsed, 1);
  const available = income - spentSoFar;
  const safeDaily = available / daysRemaining;

  // Compact topbar values (rounded, no labels — full precision lives in the popover)
  $('paceDaily').textContent = fmtCompact(spentTodayAmt);
  $('paceDaily').title = t('pace.spent_today_title', {amount: fmt(spentTodayAmt)});
  $('paceAvailable').textContent = fmtCompact(available);
  $('paceAvailable').title = t('pace.available_now_title', {amount: fmt(available)});
  $('paceSafe').textContent = fmtCompact(safeDaily);
  $('paceSafe').title = t('pace.safe_per_day_title', {amount: fmt(safeDaily)});
  const daysLeftKey = state.salaryDay ? 'pace.days_left_payday_title' : 'pace.days_left_month_title';
  $('paceDaysLeft').textContent = String(daysRemaining);
  $('paceDaysLeft').title = t(daysLeftKey, {count: daysRemaining});

  // Full-precision popover values
  $('paceDailyFull').textContent = fmt(spentTodayAmt);
  $('paceAvailableFull').textContent = fmt(available);
  $('paceSafeFull').textContent = fmt(safeDaily) + t('pace.per_day_suffix');
  $('paceDaysLeftLabel').textContent = t(state.salaryDay ? 'popover.days_left_payday' : 'popover.days_left_month');
  $('paceDaysLeftFull').textContent = String(daysRemaining);

  const dot = $('paceDot');
  const status = $('pacePopStatus');
  if(dot){
    dot.classList.remove('under','over');
    if(income>0){
      const under = spentTodayAmt<=safeDaily;
      dot.classList.add(under ? 'under' : 'over');
      const statusText = under
        ? t('pace.under_status', {amount: fmt(safeDaily)})
        : t('pace.over_status', {amount: fmt(safeDaily)});
      dot.title = statusText;
      if(status) status.textContent = statusText;
    } else {
      dot.title = '';
      if(status) status.textContent = '';
    }
  }
}

// Donut segment hover/tap tooltip — shown above the chart with the category's
// swatch, name, amount, and share of the total. Mouse gets true hover
// (pointerenter/pointerleave); touch gets tap-to-pin (see click handler below)
// since pointerenter/pointerleave fire too unreliably on touch to use alone.
let donutPinnedCat = null;
function showDonutTooltip(key, amount, pct){
  const tip = $('donutTooltip');
  if(!tip) return;
  $('dtSwatch').style.background = catColor(key);
  $('dtName').textContent = catName(key);
  $('dtAmt').textContent = `${fmt(amount)} · ${pct.toFixed(1)}%`;
  tip.classList.remove('hidden');
  $('donut').querySelectorAll('circle.donut-seg').forEach(s=>{
    s.classList.toggle('dimmed', s.getAttribute('data-cat') !== key);
  });
}
function hideDonutTooltip(){
  donutPinnedCat = null;
  const tip = $('donutTooltip');
  if(!tip) return;
  tip.classList.add('hidden');
  $('donut').querySelectorAll('circle.donut-seg').forEach(s=>s.classList.remove('dimmed'));
}
// Tap anywhere outside the donut to dismiss a pinned (tapped) tooltip. Bound
// once at module load — must NOT go inside renderCategories(), which reruns
// on every state change and would otherwise stack up duplicate listeners.
document.addEventListener('click', (e)=>{
  if(donutPinnedCat && !e.target.closest('.donut')) hideDonutTooltip();
});

function renderCategories(total){
  const sums = {};
  catList().forEach(c=>sums[c.key]=0);
  (state.bills||[]).forEach(b=>{ const c=b.cat||'cits'; sums[c]=(sums[c]||0)+billAmount(b); });
  const entries = Object.entries(sums).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]);

  // Segments are rebuilt from scratch below, taking any hover state with them —
  // reset the tooltip so a re-render mid-hover (e.g. a remote sync landing while
  // the user's pointer is still over the chart) can't leave it stuck open.
  hideDonutTooltip();

  // Donut
  const svg = $('donut');
  svg.innerHTML = '';
  const r = 38, c = 2*Math.PI*r;
  let offset = 0;
  if(total<=0){
    svg.innerHTML = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--line)" stroke-width="14"/>`;
  } else {
    entries.forEach(([k,v])=>{
      const frac = v/total;
      const pct = total>0 ? v/total*100 : 0;
      const seg = document.createElementNS('http://www.w3.org/2000/svg','circle');
      seg.setAttribute('cx','50'); seg.setAttribute('cy','50'); seg.setAttribute('r',r);
      seg.setAttribute('fill','none'); seg.setAttribute('stroke',catColor(k));
      seg.setAttribute('stroke-width','14');
      seg.setAttribute('stroke-dasharray',`${frac*c} ${c}`);
      seg.setAttribute('stroke-dashoffset',`${-offset*c}`);
      seg.setAttribute('class','donut-seg');
      seg.setAttribute('data-cat', k);
      // Desktop: true hover, mouse only — pointerenter/pointerleave fire on
      // touch too, but too unreliably (no real "leave" on tap) to build a
      // touch interaction on top of them.
      seg.addEventListener('pointerenter', (e)=>{ if(e.pointerType==='mouse') showDonutTooltip(k, v, pct); });
      seg.addEventListener('pointerleave', (e)=>{ if(e.pointerType==='mouse') hideDonutTooltip(); });
      // Touch (and click in general): tap to pin the tooltip open, tap the
      // same segment again to close it (tapping elsewhere closes it too, see
      // the document-level listener next to hideDonutTooltip above).
      seg.addEventListener('click', ()=>{
        if(donutPinnedCat === k){ hideDonutTooltip(); }
        else { donutPinnedCat = k; showDonutTooltip(k, v, pct); }
      });
      svg.appendChild(seg);
      offset += frac;
    });
  }
  $('donutTotal').textContent = '€ ' + Math.round(total).toLocaleString(currentLocale());

  // Legend with mini bars
  const legend = $('catLegend');
  legend.innerHTML = '';
  if(entries.length===0){ legend.innerHTML = `<div class="cat-pct">${t('categories.none')}</div>`; return; }
  entries.forEach(([k,v])=>{
    const pct = total>0 ? v/total*100 : 0;
    const div = document.createElement('div');
    div.className = 'cat-row';
    div.innerHTML = `
      <span class="cat-swatch" style="background:${catColor(k)}"></span>
      <span class="cat-name">${escapeHtml(catName(k))}</span>
      <span class="cat-amount">${fmt(v)}</span>
      <span class="cat-pct">${pct.toFixed(1)} %</span>`;
    legend.appendChild(div);
  });
}

/* ═══════════════════════════════════════════════════════════════
   5. MĒNEŠU ARHĪVS
   Mēneša aizvēršana → momentuzņēmums Firestore apakškolekcijā.
   Arhīva ielāde, attēlošana, rediģēšana, dublēšana, dzēšana.
   ═══════════════════════════════════════════════════════════════ */

// ---- Archive ----
let archiveCache = [];

function monthKey(d=new Date()){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function monthLabel(key){
  const m = /^(\d{4})-(\d{2})$/.exec(key||'');
  if(!m) return t('archive.default_entry_name');
  return t('months.'+(+m[2])) + ' ' + m[1];
}
function archName(a){ return (a.name && a.name.trim()) ? a.name.trim() : monthLabel(a.id); }

async function loadArchive(){
  try {
    const snap = await getDocs(collection(db, 'budgets', roomId, 'archive'));
    archiveCache = [];
    snap.forEach(d => archiveCache.push({ id: d.id, ...d.data() }));
    archiveCache.sort((a,b)=> (b.archivedAt||0) - (a.archivedAt||0) || String(b.id).localeCompare(String(a.id)));
    renderArchive();
  } catch(e){
    $('archiveList').innerHTML = `<div class="empty-note">${t('archive.load_failed', {code: e.code})}</div>`;
  }
}

function renderArchive(){
  const list = $('archiveList');
  if(archiveCache.length===0){
    list.innerHTML = `<div class="empty-note">${t('archive.empty')}</div>`;
    return;
  }
  list.innerHTML = '';
  archiveCache.forEach(a=>{
    const total = (a.bills||[]).reduce((s,b)=>s+billAmount(b),0);
    const extraTotal = (a.extraIncome||[]).reduce((s,e)=>s+(Number(e.amount)||0),0);
    const archIncome = (Number(a.income)||0) + extraTotal;
    const remaining = archIncome - total;
    const row = document.createElement('div');
    row.className = 'arch-row';
    row.innerHTML = `
      <div><div class="arch-month">${escapeHtml(archName(a))}</div><div class="arch-sub">${t('archive.bills_count', {count: (a.bills||[]).length, income: fmt(archIncome)})}${extraTotal>0?t('archive.income_breakdown', {base: fmt(a.income), extra: fmt(extraTotal)}):''}</div></div>
      <div class="arch-figure"><span class="lbl">${t('archive.bills_label')}</span>${fmt(total)}</div>
      <div class="arch-figure ${remaining>=0?'rem-pos':'rem-neg'}"><span class="lbl">${t('archive.remaining_label')}</span>${fmt(remaining)}</div>
      <div class="arch-actions">
        <button class="btn ghost sm" data-view="${a.id}">${t('archive.view')}</button>
        <button class="btn ghost sm" data-adup="${a.id}">${t('archive.duplicate')}</button>
        <button class="btn ghost sm" data-adel="${a.id}">×</button>
      </div>`;
    list.appendChild(row);
  });
}

$('closeMonthBtn').addEventListener('click', async ()=>{
  const key = monthKey();
  const existing = archiveCache.find(a=>a.id===key);
  const label = (state.periodName||'').trim();
  const displayLabel = label || monthLabel(key);
  const msg = existing
    ? t('archive.confirm_overwrite', {label: displayLabel})
    : t('archive.confirm_save', {label: displayLabel});
  if(!confirm(msg)) return;
  try {
    const snapshot = {
      income: state.income,
      bills: structuredClone(state.bills),
      credits: structuredClone(state.credits),
      extraIncome: structuredClone(state.extraIncome||[]),
      archivedAt: Date.now()
    };
    if(label) snapshot.name = label;
    else if(existing && existing.name) snapshot.name = existing.name;
    await setDoc(doc(db, 'budgets', roomId, 'archive', key), snapshot);
    await loadArchive();
    alert(t('archive.saved', {label: displayLabel}));
  } catch(e){
    alert(t('archive.save_failed', {msg: e.message}));
  }
});

$('archiveList').addEventListener('click', async e=>{
  if(e.target.dataset.view){ openArchiveModal(e.target.dataset.view); }
  if(e.target.dataset.adup){
    const src = archiveCache.find(x=>x.id===e.target.dataset.adup);
    if(!src) return;
    const newId = 'kopija-' + Date.now();
    const baseName = archName(src);
    const copy = {
      name: baseName + t('archive.duplicate_suffix'),
      income: src.income,
      bills: structuredClone(src.bills||[]),
      credits: structuredClone(src.credits||[]),
      extraIncome: structuredClone(src.extraIncome||[]),
      archivedAt: Date.now()
    };
    e.target.textContent = t('archive.duplicating');
    try {
      await setDoc(doc(db, 'budgets', roomId, 'archive', newId), copy);
      await loadArchive();
      openArchiveModal(newId);
    } catch(err){
      e.target.textContent = t('archive.duplicate');
      alert(t('archive.duplicate_failed', {msg: err.message}));
    }
  }
  if(e.target.dataset.adel){
    const key = e.target.dataset.adel;
    const label = archName(archiveCache.find(x=>x.id===key)||{id:key});
    if(confirm(t('archive.confirm_delete', {label}))){
      try { await deleteDoc(doc(db, 'budgets', roomId, 'archive', key)); await loadArchive(); }
      catch(err){ alert(t('archive.delete_failed', {msg: err.message})); }
    }
  }
});

function openArchiveModal(key){
  const a = archiveCache.find(x=>x.id===key);
  if(!a) return;
  // Work on a draft copy; only persist on "Saglabāt izmaiņas"
  let draft = {
    name: (a.name||'').trim(),
    income: Number(a.income)||0,
    bills: structuredClone(a.bills||[]),
    credits: structuredClone(a.credits||[])
  };
  let dirty = false;
  let locked = true;

  const root = $('modalRoot');
  root.innerHTML = `
    <div class="modal-back" id="modalBack">
      <div class="modal">
        <button class="modal-close" id="modalClose">×</button>
        <div class="arch-name-edit">
          <input id="archNameInput" value="${escapeHtml(archName(a))}" placeholder="${escapeHtml(monthLabel(key))}">
        </div>
        <div class="msub">${/^\d{4}-\d{2}$/.test(key) ? monthLabel(key)+' · ' : ''}${t('archive_modal.archived_on', {date: a.archivedAt ? new Date(a.archivedAt).toLocaleDateString(currentLocale()) : ''})}</div>

        <div class="mini-summary" id="mMini"></div>

        <h4 style="margin:0 0 4px;font-family:Georgia,serif;">${t('archive_modal.income_title')}</h4>
        <div class="m-income">€ <input id="mIncome" type="number" step="0.01" inputmode="decimal" value="${Number(draft.income)||0}"></div>

        <h4 style="margin:18px 0 4px;font-family:Georgia,serif;display:flex;justify-content:space-between;align-items:baseline;">${t('archive_modal.bills_title')} <span id="mPaidInfo" style="font-family:inherit;font-size:12px;font-weight:400;color:var(--muted);"></span></h4>
        <div id="mBills"></div>
        <button class="btn ghost sm add-line" id="mAddBill">${t('archive_modal.add_bill')}</button>

        <h4 style="margin:18px 0 4px;font-family:Georgia,serif;">${t('archive_modal.credits_title')}</h4>
        <div id="mCredits"></div>
        <button class="btn ghost sm add-line" id="mAddCredit">${t('archive_modal.add_credit')}</button>

        <div class="m-savebar">
          <span class="status" id="mStatus">${t('archive_modal.view_only')}</span>
          <span class="spacer"></span>
          <button class="btn ghost sm" id="mCancel">${t('common.close')}</button>
          <button class="btn" id="mSave">${t('archive_modal.edit')}</button>
        </div>
      </div>
    </div>`;

  const catOpts = sel => { let opts = catList().map(c=>`<option value="${c.key}"${c.key===sel?' selected':''}>${escapeHtml(c.name)}</option>`).join(''); if(sel && !catList().some(c=>c.key===sel)) opts = `<option value="${sel}" selected>${escapeHtml(sel)}</option>` + opts; return opts; };

  function markDirty(){ dirty = true; $('mStatus').textContent = t('archive_modal.unsaved'); $('mStatus').style.color = 'var(--amber)'; }

  function renderMini(){
    const extraTotal = (a.extraIncome||[]).reduce((s,e)=>s+(Number(e.amount)||0),0);
    const income = (Number(draft.income)||0) + extraTotal;
    const total = draft.bills.reduce((s,b)=>s+billAmount(b),0);
    const remaining = income - total;
    $('mMini').innerHTML = `
      <div class="ms"><div class="l">${t('budget.income_label')}</div><div class="v">${fmt(income)}</div></div>
      <div class="ms"><div class="l">${t('archive_modal.bills_title')}</div><div class="v">${fmt(total)}</div></div>
      <div class="ms"><div class="l">${t('budget.remaining_label')}</div><div class="v" style="color:${remaining>=0?'var(--green)':'var(--red)'}">${fmt(remaining)}</div></div>`;
    const paidCount = draft.bills.filter(isBillPaid).length;
    const paidSum = draft.bills.filter(isBillPaid).reduce((s,b)=>s+billAmount(b),0);
    $('mPaidInfo').textContent = t('archive_modal.paid_count', {paid: paidCount, total: draft.bills.length, sum: fmt(paidSum)});
  }

  function renderBills(){
    const c = $('mBills'); c.innerHTML = '';
    draft.bills.forEach((b,i)=>{
      const row = document.createElement('div');
      const isSumB = b.type==='summing';
      row.className = 'ebill' + (b.paid?' paid':''); row.dataset.cat = b.cat||'cits'; row.dataset.idx = i;
      row.innerHTML = `
        <div class="ehandle" data-edrag="${i}" title="${t('archive_modal.drag_title')}" style="border-left-color:${catColor(b.cat||'cits')}"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
        ${isSumB
          ? `<div class="echk echk-auto" title="${t('archive_modal.summing_auto_title')}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`
          : `<button class="echk" data-echk="${i}" title="${t('archive_modal.paid_title')}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`}
        <input class="ename" value="${escapeHtml(b.name||'')}" data-ei="${i}" data-ef="name" placeholder="${t('bills.name_placeholder')}">
        <span class="pay-badge ${isBillPaid(b)?'yes':'no'}">${isSumB?t('archive_modal.auto_paid_badge'):(b.paid?t('archive_modal.paid_badge'):t('archive_modal.unpaid_badge'))}</span>
        <div class="eamt-wrap"><span class="e-eur">€</span>${b.type==='summing' ? `<span class="eamt" style="display:inline-block;" title="${t('archive_modal.sum_from_entries_title', {count: (b.entries||[]).length})}">${billAmount(b).toFixed(2)}</span>` : `<input class="eamt" type="number" step="0.01" inputmode="decimal" value="${Number(b.amount)||0}" data-ei="${i}" data-ef="amount">`}</div>
        <div style="display:flex;gap:4px;align-items:center;">
          <select class="ecat" data-ei="${i}" data-ef="cat">${catOpts(b.cat||'cits')}</select>
          <button class="edel" data-edel="${i}" title="${t('common.delete_title')}">×</button>
        </div>`;
      c.appendChild(row);
    });
  }

  function renderCredits(){
    const c = $('mCredits'); c.innerHTML = '';
    draft.credits.forEach((cr,i)=>{
      const row = document.createElement('div');
      row.className = 'ecredit';
      row.innerHTML = `
        <input class="ec-name" value="${escapeHtml(cr.name||'')}" data-ci="${i}" data-cf="name" placeholder="${t('credits.name_placeholder')}">
        <div class="eamt-wrap"><span class="e-eur">€</span><input class="ec-amt" type="number" step="0.01" inputmode="decimal" value="${Number(cr.amount)||0}" data-ci="${i}" data-cf="amount"></div>
        <button class="edel" data-cdel="${i}" title="${t('common.delete_title')}">×</button>`;
      c.appendChild(row);
    });
    if(draft.credits.length){
      const ctotal = draft.credits.reduce((s,cr)=>s+(Number(cr.amount)||0),0);
      const foot = document.createElement('div');
      foot.className = 'ecredit-foot';
      foot.innerHTML = `<span>${t('archive_modal.total_label')}</span><span class="ec-total">${fmt(ctotal)}</span>`;
      c.appendChild(foot);
    }
  }

  function renderAll(){ renderMini(); renderBills(); renderCredits(); applyLock(); }
  function applyLock(){
    const modalEl = root.querySelector('.modal');
    if(modalEl) modalEl.classList.toggle('locked', locked);
    const nameInp = $('archNameInput'); if(nameInp) nameInp.readOnly = locked;
  }
  renderAll();

  // Income
  $('mIncome').addEventListener('input', e=>{ draft.income = parseFloat(e.target.value)||0; renderMini(); markDirty(); });
  $('archNameInput').addEventListener('input', ()=>markDirty());

  // Bills input
  $('mBills').addEventListener('input', e=>{
    const i=e.target.dataset.ei, f=e.target.dataset.ef; if(i===undefined) return;
    if(f==='amount') draft.bills[i].amount = parseFloat(e.target.value)||0; else draft.bills[i].name = e.target.value;
    if(f==='amount') renderMini(); markDirty();
  });
  $('mBills').addEventListener('change', e=>{
    if(e.target.dataset.ef==='cat'){ const i=e.target.dataset.ei; draft.bills[i].cat=e.target.value; const rowEl=e.target.closest('.ebill'); rowEl.dataset.cat=e.target.value; const h=rowEl.querySelector('.ehandle'); if(h) h.style.borderLeftColor=catColor(e.target.value); markDirty(); }
  });
  $('mBills').addEventListener('click', e=>{
    const del=e.target.closest('[data-edel]'); const chk=e.target.closest('[data-echk]');
    if(del){ const i=+del.dataset.edel; const nm=(draft.bills[i].name||'').trim(); if(confirm(nm?t('archive_modal.confirm_delete_bill_named',{name:nm}):t('archive_modal.confirm_delete_bill'))){ draft.bills.splice(i,1); renderAll(); markDirty(); } return; }
    if(chk){ const i=+chk.dataset.echk; draft.bills[i].paid=!draft.bills[i].paid; renderAll(); markDirty(); }
  });
  $('mAddBill').addEventListener('click', ()=>{ draft.bills.push({name:'',amount:0,cat:'cits'}); renderAll(); markDirty(); });

  // Credits input
  $('mCredits').addEventListener('input', e=>{
    const i=e.target.dataset.ci, f=e.target.dataset.cf; if(i===undefined) return;
    if(f==='amount') draft.credits[i].amount = parseFloat(e.target.value)||0; else draft.credits[i].name = e.target.value;
    markDirty();
  });
  $('mCredits').addEventListener('click', e=>{
    const del=e.target.closest('[data-cdel]');
    if(del){ const i=+del.dataset.cdel; const nm=(draft.credits[i].name||'').trim(); if(confirm(nm?t('archive_modal.confirm_delete_credit_named',{name:nm}):t('archive_modal.confirm_delete_credit'))){ draft.credits.splice(i,1); renderCredits(); markDirty(); } }
  });
  $('mAddCredit').addEventListener('click', ()=>{ draft.credits.push({name:'',amount:0}); renderCredits(); markDirty(); });

  // Drag reorder in modal
  let dFrom=null, dRow=null;
  const clearMarks=()=>document.querySelectorAll('#mBills .ebill').forEach(r=>r.classList.remove('drag-over','dragging'));
  $('mBills').addEventListener('pointerdown', e=>{
    const h=e.target.closest('.ehandle'); if(!h) return;
    e.preventDefault(); dRow=h.closest('.ebill'); dFrom=+dRow.dataset.idx; dRow.classList.add('dragging'); dRow.setPointerCapture?.(e.pointerId);
  });
  $('mBills').addEventListener('pointermove', e=>{
    if(dFrom===null) return;
    const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#mBills .ebill');
    document.querySelectorAll('#mBills .ebill').forEach(r=>{ if(r!==dRow) r.classList.remove('drag-over'); });
    if(t && t!==dRow) t.classList.add('drag-over');
  });
  $('mBills').addEventListener('pointerup', e=>{
    if(dFrom===null) return;
    const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#mBills .ebill');
    if(t && t!==dRow){ const to=+t.dataset.idx; const [m]=draft.bills.splice(dFrom,1); draft.bills.splice(to,0,m); renderAll(); markDirty(); }
    clearMarks(); dFrom=null; dRow=null;
  });
  $('mBills').addEventListener('pointercancel', ()=>{ clearMarks(); dFrom=null; dRow=null; });

  // Close / cancel with dirty guard
  function tryClose(){
    if(dirty && !confirm(t('archive_modal.discard_confirm'))) return;
    root.innerHTML='';
  }
  $('modalBack').addEventListener('click', e=>{ if(e.target.id==='modalBack') tryClose(); });
  $('modalClose').addEventListener('click', tryClose);
  $('mCancel').addEventListener('click', tryClose);

  // Save
  $('mSave').addEventListener('click', async ()=>{
    // First click while locked → enter edit mode
    if(locked){
      locked = false;
      applyLock();
      $('mSave').textContent = t('archive_modal.save_changes');
      $('mStatus').textContent = t('archive_modal.edit_mode');
      $('mStatus').style.color = 'var(--muted)';
      $('mIncome')?.focus();
      return;
    }
    // Editing → save
    const nameRaw = $('archNameInput').value.trim();
    const nameVal = nameRaw === monthLabel(key) ? '' : nameRaw;
    const payload = {
      name: nameVal,
      income: draft.income,
      bills: draft.bills.map(b=> b.type==='summing'
        ? ({ name:b.name||'', type:'summing', limit:Number(b.limit)||0, entries:(b.entries||[]).map(e=>({amount:Number(e.amount)||0, note:e.note||'', date:e.date||''})), cat:b.cat||'cits', paid:!!b.paid })
        : ({ name:b.name||'', amount:Number(b.amount)||0, cat:b.cat||'cits', paid:!!b.paid })),
      credits: draft.credits.map(c=>({ name:c.name||'', amount:Number(c.amount)||0 })),
      extraIncome: a.extraIncome || [],
      archivedAt: a.archivedAt || Date.now()
    };
    const btn = $('mSave'); btn.textContent=t('archive_modal.saving'); btn.disabled=true;
    try {
      await setDoc(doc(db, 'budgets', roomId, 'archive', key), payload);
      const cached = archiveCache.find(x=>x.id===key);
      if(cached) Object.assign(cached, payload);
      renderArchive();
      dirty=false;
      // Return to view-only mode
      locked = true;
      applyLock();
      $('mStatus').textContent=t('archive_modal.saved'); $('mStatus').style.color='var(--green)';
      btn.textContent=t('archive_modal.edit'); btn.disabled=false;
    } catch(err){
      btn.textContent=t('archive_modal.save_changes'); btn.disabled=false;
      alert(t('archive_modal.save_failed', {msg: err.message}));
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   6. RĒĶINI — notikumi un logi
   Algas ievade, rēķinu rediģēšana galvenajā skatā, summējošo
   rēķinu epizožu pievienošana un limita iestatīšana.
   ═══════════════════════════════════════════════════════════════ */

// ---- Events ----
$('income').addEventListener('input', e=>{ state.income=parseFloat(e.target.value)||0; updateTotals(); scheduleSave(); });
$('billsList').addEventListener('input', e=>{
  const i=e.target.dataset.i, f=e.target.dataset.f; if(i===undefined) return;
  if(f==='amount') state.bills[i][f]=parseFloat(e.target.value)||0; else state.bills[i][f]=e.target.value;
  if(f==='amount') updateTotals(); scheduleSave();
});
$('billsList').addEventListener('change', e=>{
  if(e.target.dataset.f==='cat'){ const i=e.target.dataset.i; state.bills[i].cat=e.target.value; const rowEl=e.target.closest('.bill'); rowEl.dataset.cat=e.target.value; const h=rowEl.querySelector('.drag-handle'); if(h) h.style.borderLeftColor=catColor(e.target.value); renderCategories(state.bills.reduce((s,b)=>s+billAmount(b),0)); scheduleSave(); }
});
$('billsList').addEventListener('click', e=>{
  const delBtn = e.target.closest('[data-del]');
  const payBtn = e.target.closest('[data-pay]');
  const addEntryBtn = e.target.closest('[data-addentry]');
  const entryDelBtn = e.target.closest('[data-entrydel]');
  const limitBtn = e.target.closest('[data-limit]');
  const toggleBtn = e.target.closest('[data-toggle]');
  if(delBtn){
    const i=+delBtn.dataset.del;
    if(state.bills[i].goalId){ alert(t('bills.cant_delete_goal_linked')); return; }
    const nm=(state.bills[i].name||'').trim();
    if(confirm(nm?t('bills.confirm_delete_named',{name:nm}):t('bills.confirm_delete'))){
      const removedId = state.bills[i].id;
      state.bills.splice(i,1);
      (state.reminders||[]).forEach(r=>{ if(r.billId===removedId) r.active=false; });
      render(); scheduleSave();
    }
    return;
  }
  if(payBtn){
    const i=+payBtn.dataset.pay;
    state.bills[i].paid = !state.bills[i].paid;
    // paidDate: kad rēķins atzīmēts kā samaksāts, fiksējam ŠODIENAS datumu — vienīgais
    // veids, kā "Iztērēts šodien" (topbar pace) var zināt, kuri (ne-summējošie) rēķini
    // reāli apmaksāti tieši šodien, nevis kādā citā dienā šomēnes.
    if(state.bills[i].paid) state.bills[i].paidDate = todayStr();
    else delete state.bills[i].paidDate;
    render(); updateTotals(); scheduleSave(); return;
  }
  if(addEntryBtn){ openAddEntry(+addEntryBtn.dataset.addentry); return; }
  if(limitBtn){ openSetLimit(+limitBtn.dataset.limit); return; }
  if(toggleBtn){
    const i = +toggleBtn.dataset.toggle;
    const nowCollapsed = !collapsedBills.has(i);
    if(nowCollapsed) collapsedBills.add(i); else collapsedBills.delete(i);
    const entriesListEl = toggleBtn.closest('.entries').querySelector('.entries-list');
    if(entriesListEl) entriesListEl.classList.toggle('collapsed', nowCollapsed);
    toggleBtn.setAttribute('aria-expanded', String(!nowCollapsed));
    toggleBtn.title = nowCollapsed ? t('bills.show_entries_title') : t('bills.collapse_entries_title');
    return;
  }
  if(entryDelBtn){
    const bi=+entryDelBtn.dataset.entrydel, ei=+entryDelBtn.dataset.entryidx;
    const ent = state.bills[bi].entries[ei];
    if(confirm(t('bills.confirm_delete_entry', {amount: fmt(ent.amount), date: ent.date?' ('+ent.date+')':''}))){
      state.bills[bi].entries.splice(ei,1); render(); scheduleSave();
    }
    return;
  }
});

function openAddEntry(bi){
  const b = state.bills[bi];
  const root = $('modalRoot');
  root.innerHTML = `
    <div class="modal-back" id="aeBack">
      <div class="modal" style="max-width:420px;">
        <button class="modal-close" id="aeClose">×</button>
        <h3>${t('entry_modal.title')}</h3>
        <div class="msub">${t('entry_modal.subtitle', {name: escapeHtml(b.name||t('default_bill_name')), amount: fmt(billAmount(b))})}</div>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">${t('entry_modal.amount_label')}</label>
        <input id="aeAmount" type="number" step="0.01" inputmode="decimal" placeholder="0.00" style="width:100%;font:inherit;font-size:18px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">${t('entry_modal.note_label')}</label>
        <input id="aeNote" type="text" placeholder="${t('entry_modal.note_placeholder')}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">${t('entry_modal.date_label')}</label>
        <input id="aeDate" type="date" value="${todayStr()}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="aeCancel">${t('common.cancel')}</button>
          <button class="btn" id="aeSave">${t('common.add')}</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('aeBack').addEventListener('click', e=>{ if(e.target.id==='aeBack') close(); });
  $('aeClose').addEventListener('click', close);
  $('aeCancel').addEventListener('click', close);
  setTimeout(()=>$('aeAmount')?.focus(), 50);
  const doSave = ()=>{
    const amt = parseFloat($('aeAmount').value);
    if(!amt || amt<=0){ alert(t('entry_modal.amount_required')); return; }
    if(!state.bills[bi].entries) state.bills[bi].entries = [];
    state.bills[bi].entries.push({ amount: amt, note: $('aeNote').value.trim(), date: $('aeDate').value || todayStr() });
    close(); render(); scheduleSave();
  };
  $('aeSave').addEventListener('click', doSave);
  $('aeAmount').addEventListener('keydown', e=>{ if(e.key==='Enter') doSave(); });
}

function openSetLimit(bi){
  const b = state.bills[bi];
  const cur = Number(b.limit)||0;
  const root = $('modalRoot');
  root.innerHTML = `
    <div class="modal-back" id="slBack">
      <div class="modal" style="max-width:420px;">
        <button class="modal-close" id="slClose">×</button>
        <h3>${t('limit_modal.title')}</h3>
        <div class="msub">${t('limit_modal.subtitle', {name: escapeHtml(b.name||t('default_bill_name'))})}</div>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">${t('limit_modal.amount_label')}</label>
        <input id="slAmount" type="number" step="0.01" inputmode="decimal" value="${cur>0?cur:''}" placeholder="piem. 100" style="width:100%;font:inherit;font-size:18px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <div style="font-size:12px;color:var(--muted);margin-top:8px;">${t('limit_modal.hint')}</div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="slCancel">${t('common.cancel')}</button>
          <button class="btn" id="slSave">${t('common.save')}</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('slBack').addEventListener('click', e=>{ if(e.target.id==='slBack') close(); });
  $('slClose').addEventListener('click', close);
  $('slCancel').addEventListener('click', close);
  setTimeout(()=>$('slAmount')?.focus(), 50);
  const doSave = ()=>{
    const val = $('slAmount').value.trim();
    if(val===''){ delete state.bills[bi].limit; }
    else { const n=parseFloat(val); if(isNaN(n)||n<0){ alert(t('limit_modal.invalid_amount')); return; } state.bills[bi].limit = n; }
    close(); render(); scheduleSave();
  };
  $('slSave').addEventListener('click', doSave);
  $('slAmount').addEventListener('keydown', e=>{ if(e.key==='Enter') doSave(); });
}

// Progresē vienu uzkrājuma mērķa maksājumu "Jauns mēnesis" solī. Ja saistītais rēķins bija
// atzīmēts "Samaksāts", palielina paidInstallments — un, ja tas bija pēdējais maksājums,
// atzīmē mērķi kā sasniegtu un rēķins pazūd no saraksta (atgriež null). Ja NEBIJA samaksāts,
// progress NEmainās (izlaists maksājums — mērķis nobīdās, nevis turpina pēc kalendāra),
// rēķins vienkārši atkārtojas nākammēnes ar to pašu summu. Pēdējais maksājums vienmēr ir
// atlikums (starpība), nevis vienmērīga daļa, lai noapaļošana nekrātos.
function advanceGoalBill(bill){
  const goal = goalById(bill.goalId);
  if(!goal) return null;
  if(bill.paid){
    goal.paidInstallments = Math.min(goal.paidInstallments + 1, goal.months);
    if(goal.paidInstallments >= goal.months){
      goal.achieved = true;
      goal.achievedAt = todayStr();
      goal.billId = null;
      // Rēķins pazūd uz visiem laikiem (mērķis sasniegts) — atslēdz arī jebkuru tam
      // piesaistīto atgādinājumu, tāpat kā dara parastā rēķina dzēšana un pārējā
      // "Jauns mēnesis" tīrīšana — citādi tas paliktu mūžīgi "nokavēts" neeksistējošam
      // rēķinam.
      (state.reminders||[]).forEach(r=>{ if(r.billId===bill.id) r.active=false; });
      return null;
    }
  }
  const remaining = goal.months - goal.paidInstallments;
  const amount = remaining === 1
    ? Math.round((goal.targetAmount - goal.monthlyAmount * goal.paidInstallments) * 100) / 100
    : goal.monthlyAmount;
  return { ...bill, amount, paid: false, paidDate: null };
}

function openNewMonthModal(){
  if(!state.bills.length){ alert(t('new_month.no_bills')); return; }
  const root = $('modalRoot');
  const hasGoalBills = state.bills.some(b=>b.goalId);
  // Uzkrājumu mērķu rēķini apzināti IZSLĒGTI no šī checkbox saraksta — tie vienmēr tiek
  // pārcelti automātiski (sk. advanceGoalBill), lietotājs tos šeit nevar netīšām atzīmēt
  // dzēšanai. data-i saglabā ORIĢINĀLO indeksu state.bills, lai keepIdx zemāk sakristu.
  const rowsHtml = state.bills.map((b,i)=> b.goalId ? '' : `
    <label class="nm-row">
      <input type="checkbox" class="nm-keep" data-i="${i}" checked>
      <span class="nm-name">${escapeHtml(b.name||t('common.no_name'))}</span>
      <span class="nm-amt">${fmt(billAmount(b))}</span>
    </label>`).join('');
  const hintHtml = t('new_month.hint') + '<br><br>'
    + t('new_month.hint_archive', {label: `<strong>${escapeHtml(currentPeriodLabel())}</strong>`}) + ' '
    + t('new_month.hint_rename', {label: `<strong>${escapeHtml(monthLabel(monthKey()))}</strong>`})
    + (hasGoalBills ? t('new_month.hint_goals') : '');
  root.innerHTML = `
    <div class="modal-back" id="nmBack">
      <div class="modal" style="max-width:460px;">
        <button class="modal-close" id="nmClose">×</button>
        <h3>${t('new_month.title')}</h3>
        <div class="msub">${hintHtml}</div>
        <div class="nm-list">${rowsHtml}</div>
        <label class="nm-archive-opt"><input type="checkbox" id="nmArchiveFirst" checked> ${t('new_month.archive_first')}</label>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="nmCancel">${t('common.cancel')}</button>
          <button class="btn" id="nmConfirm">${t('new_month.confirm_btn')}</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('nmBack').addEventListener('click', e=>{ if(e.target.id==='nmBack') close(); });
  $('nmClose').addEventListener('click', close);
  $('nmCancel').addEventListener('click', close);
  $('nmConfirm').addEventListener('click', async ()=>{
    const keepIdx = new Set([...root.querySelectorAll('.nm-keep:checked')].map(el=>+el.dataset.i));
    const removedCount = state.bills.filter(b=>!b.goalId).length - keepIdx.size;
    if(!confirm(t('new_month.confirm_removal', {count: removedCount}))) return;
    if($('nmArchiveFirst').checked){
      try {
        const key = monthKey();
        const existing = archiveCache.find(a=>a.id===key);
        const label = (state.periodName||'').trim();
        const snapshot = {
          income: state.income,
          bills: structuredClone(state.bills),
          credits: structuredClone(state.credits),
          extraIncome: structuredClone(state.extraIncome||[]),
          archivedAt: Date.now()
        };
        if(label) snapshot.name = label;
        else if(existing && existing.name) snapshot.name = existing.name;
        await setDoc(doc(db, 'budgets', roomId, 'archive', key), snapshot);
        await loadArchive();
      } catch(e){
        alert(t('new_month.archive_failed', {msg: e.message}));
        return;
      }
    }
    const removedIds = state.bills.filter((b,i)=>!b.goalId && !keepIdx.has(i)).map(b=>b.id);
    state.bills = state.bills
      .filter((b,i)=> b.goalId || keepIdx.has(i))
      .map(b=> b.goalId ? advanceGoalBill(b) : (b.type==='summing' ? { ...b, entries: [] } : { ...b, paid: false, paidDate: null }))
      .filter(Boolean);
    // Reminders linked to a bill that wasn't kept are paused, not deleted — the
    // data stays in case the bill reappears later. Reminders on KEPT bills need no
    // change here: their due date is computed live from the real calendar month.
    (state.reminders||[]).forEach(r=>{ if(r.billId && removedIds.includes(r.billId)) r.active=false; });
    // Papildus ienākumi ir piesaistīti konkrētajam mēnesim (kā rēķinu epizodes) —
    // arhivēti augstāk, tagad notīrīti jaunajam mēnesim.
    state.extraIncome = [];
    state.periodName = monthLabel(monthKey());
    close(); render(); updateTotals(); scheduleSave();
    alert(t('new_month.done'));
  });
}

$('newMonthBtn').addEventListener('click', openNewMonthModal);

/* ═══════════════════════════════════════════════════════════════
   6.5 ATGĀDINĀJUMI — pievienošanas modālis + saraksta darbības
   Atgādinājums var būt piesaistīts esošam rēķinam (atkārtojas katru
   mēnesi pēc izvēlētās dienas — pārdzīvo "Jauns mēnesis") vai brīvs
   (fiksēts vienreizējs datums, nesaistīts ar rēķinu).
   ═══════════════════════════════════════════════════════════════ */

function openAddReminderModal(){
  const root = $('modalRoot');
  const linkableBills = (state.bills||[]).filter(b=>b.type!=='summing');
  const billsOptions = linkableBills.map(b=>`<option value="${b.id}">${escapeHtml(b.name||t('common.no_name'))}</option>`).join('');
  const hasBills = linkableBills.length>0;
  root.innerHTML = `
    <div class="modal-back" id="arBack">
      <div class="modal" style="max-width:440px;">
        <button class="modal-close" id="arClose">×</button>
        <h3>${t('reminder_modal.title')}</h3>
        <div class="rem-type-toggle">
          <button class="rem-type-btn${hasBills?' active':''}" id="arTypeLinked" type="button" ${hasBills?'':'disabled'}>${t('reminder_modal.linked_tab')}</button>
          <button class="rem-type-btn${hasBills?'':' active'}" id="arTypeFree" type="button">${t('reminder_modal.free_tab')}</button>
        </div>

        <div id="arLinkedFields" class="${hasBills?'':'hidden'}">
          <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">${t('reminder_modal.bill_label')}</label>
          <select id="arBillSelect" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);">${billsOptions}</select>
          <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">${t('reminder_modal.day_label')}</label>
          <input id="arDay" type="number" min="1" max="31" step="1" value="15" style="width:100%;font:inherit;font-size:18px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
          <div style="font-size:12px;color:var(--muted);margin-top:8px;">${t('reminder_modal.day_hint')}</div>
        </div>

        <div id="arFreeFields" class="${hasBills?'hidden':''}">
          <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">${t('reminder_modal.name_label')}</label>
          <input id="arName" type="text" placeholder="${t('reminder_modal.name_placeholder')}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
          <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">${t('reminder_modal.date_label')}</label>
          <input id="arDate" type="date" value="${todayStr()}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        </div>

        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="arCancel">${t('common.cancel')}</button>
          <button class="btn" id="arSave">${t('common.add')}</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('arBack').addEventListener('click', e=>{ if(e.target.id==='arBack') close(); });
  $('arClose').addEventListener('click', close);
  $('arCancel').addEventListener('click', close);

  let mode = hasBills ? 'linked' : 'free';
  const setMode = m=>{
    mode = m;
    $('arTypeLinked').classList.toggle('active', m==='linked');
    $('arTypeFree').classList.toggle('active', m==='free');
    $('arLinkedFields').classList.toggle('hidden', m!=='linked');
    $('arFreeFields').classList.toggle('hidden', m!=='free');
  };
  $('arTypeLinked').addEventListener('click', ()=>{ if(hasBills) setMode('linked'); });
  $('arTypeFree').addEventListener('click', ()=>setMode('free'));

  $('arSave').addEventListener('click', ()=>{
    if(!state.reminders) state.reminders = [];
    if(mode==='linked'){
      const billId = $('arBillSelect').value;
      const bill = billById(billId);
      let day = parseInt($('arDay').value,10);
      if(!day || day<1 || day>31){ alert(t('reminder_modal.invalid_day')); return; }
      state.reminders.push({ id: genId(), billId, name: bill?bill.name:'', day, date:null, active:true, dismissedFor:null });
    } else {
      const name = $('arName').value.trim();
      const date = $('arDate').value;
      if(!name){ alert(t('reminder_modal.name_required')); return; }
      if(!date){ alert(t('reminder_modal.date_required')); return; }
      state.reminders.push({ id: genId(), billId:null, name, day:null, date, active:true, dismissedFor:null });
    }
    close(); render(); scheduleSave();
  });
}
$('addReminderBtn')?.addEventListener('click', openAddReminderModal);

// Reminder list clicks: pause/resume, delete
['remListDue','remListUpcoming','remListPaused'].forEach(id=>{
  $(id)?.addEventListener('click', e=>{
    const toggleBtn = e.target.closest('[data-remtoggle]');
    const delBtn = e.target.closest('[data-remdel]');
    if(toggleBtn){
      const i = +toggleBtn.dataset.remtoggle;
      const r = state.reminders[i];
      if(r){ r.active = !r.active; if(r.active) r.dismissedFor = null; render(); scheduleSave(); }
      return;
    }
    if(delBtn){
      const i = +delBtn.dataset.remdel;
      const r = state.reminders[i];
      if(r && confirm(t('reminders.confirm_delete', {name: reminderDisplayName(r)}))){
        state.reminders.splice(i,1); render(); scheduleSave();
      }
      return;
    }
  });
});

// Banner: "Skatīt" jumps to the section, "✓" dismisses today's/overdue reminders
// (per-reminder dismissedFor, so it reappears automatically once the due date moves on)
$('reminderBannerView')?.addEventListener('click', ()=>{ showSection('reminders'); });
$('reminderBannerDismiss')?.addEventListener('click', ()=>{
  (state.reminders||[]).forEach(r=>{
    if(r.active){ const st = reminderStatus(r); if(st==='overdue'||st==='today') r.dismissedFor = reminderDueDate(r); }
  });
  renderReminders(); scheduleSave();
});

/* ═══════════════════════════════════════════════════════════════
   7. KĀRTOŠANA AR VILKŠANU (drag & drop) + KREDĪTI
   Rēķinu un kredītu pārkārtošana ar pirkstu/peli, kredītu
   rediģēšana un kredīta termiņu (sākums/beigas) logs.
   ═══════════════════════════════════════════════════════════════ */

// ---- Drag to reorder bills ----
let dragFrom = null, dragRow = null;
function clearDragMarks(){ document.querySelectorAll('#billsList .bill').forEach(r=>r.classList.remove('drag-over','dragging')); }

$('billsList').addEventListener('pointerdown', e=>{
  const handle = e.target.closest('.drag-handle');
  if(!handle) return;
  e.preventDefault();
  dragRow = handle.closest('.bill');
  dragFrom = +dragRow.dataset.idx;
  dragRow.classList.add('dragging');
  dragRow.setPointerCapture?.(e.pointerId);
});

$('billsList').addEventListener('pointermove', e=>{
  if(dragFrom===null) return;
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('#billsList .bill');
  document.querySelectorAll('#billsList .bill').forEach(r=>{ if(r!==dragRow) r.classList.remove('drag-over'); });
  if(target && target!==dragRow) target.classList.add('drag-over');
});

$('billsList').addEventListener('pointerup', e=>{
  if(dragFrom===null) return;
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('#billsList .bill');
  if(target && target!==dragRow){
    const to = +target.dataset.idx;
    const [moved] = state.bills.splice(dragFrom,1);
    state.bills.splice(to,0,moved);
    render(); scheduleSave();
  }
  clearDragMarks();
  dragFrom = null; dragRow = null;
});

$('billsList').addEventListener('pointercancel', ()=>{ clearDragMarks(); dragFrom=null; dragRow=null; });

$('creditsList').addEventListener('input', e=>{
  if(e.target.dataset.cpay!==undefined){
    const i=+e.target.dataset.cpay;
    const v=e.target.value.trim();
    if(v==='') delete state.credits[i].monthly; else state.credits[i].monthly=parseFloat(v)||0;
    const pay=Number(state.credits[i].monthly)||0;
    const row=e.target.closest('.credit-detail');
    row.querySelectorAll('.cd-pay-btn').forEach(b=>b.disabled = !(pay>0));
    updateTotals();
    scheduleSave();
    return;
  }
  const i=e.target.dataset.ci, f=e.target.dataset.f; if(i===undefined) return;
  if(f==='amount') state.credits[i][f]=Math.round((parseFloat(e.target.value)||0)*100)/100; else state.credits[i][f]=e.target.value;
  if(f==='amount') updateTotals(); scheduleSave();
});
$('creditsList').addEventListener('click', e=>{
  const del=e.target.closest('[data-cdel]');
  const dateBtn=e.target.closest('[data-cdate]');
  const minusBtn=e.target.closest('[data-cpay-minus]');
  const plusBtn=e.target.closest('[data-cpay-plus]');
  if(del){ const i=+del.dataset.cdel; const nm=(state.credits[i].name||'').trim(); if(confirm(nm?t('credits.confirm_delete_named',{name:nm}):t('credits.confirm_delete'))){ state.credits.splice(i,1); render(); scheduleSave(); } return; }
  if(dateBtn){ openCreditDates(+dateBtn.dataset.cdate); return; }
  if(minusBtn){ const i=+minusBtn.dataset.cpayMinus; const pay=Number(state.credits[i].monthly)||0; if(pay>0){ state.credits[i].amount=Math.round(Math.max((Number(state.credits[i].amount)||0)-pay,0)*100)/100; render(); scheduleSave(); } return; }
  if(plusBtn){ const i=+plusBtn.dataset.cpayPlus; const pay=Number(state.credits[i].monthly)||0; if(pay>0){ state.credits[i].amount=Math.round(((Number(state.credits[i].amount)||0)+pay)*100)/100; render(); scheduleSave(); } return; }
});

function openCreditDates(ci){
  const c = state.credits[ci];
  const root = $('modalRoot');
  root.innerHTML = `
    <div class="modal-back" id="cdBack">
      <div class="modal" style="max-width:420px;">
        <button class="modal-close" id="cdClose">×</button>
        <h3>${t('credit_dates_modal.title')}</h3>
        <div class="msub">${t('credit_dates_modal.subtitle', {name: escapeHtml(c.name||t('default_credit_name'))})}</div>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">${t('credit_dates_modal.start_label')}</label>
        <input id="cdStart" type="date" value="${c.start||''}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">${t('credit_dates_modal.end_label')}</label>
        <input id="cdEnd" type="date" value="${c.end||''}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <div style="font-size:12px;color:var(--muted);margin-top:8px;">${t('credit_dates_modal.hint')}</div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="cdCancel">${t('common.cancel')}</button>
          <button class="btn" id="cdSave">${t('common.save')}</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('cdBack').addEventListener('click', e=>{ if(e.target.id==='cdBack') close(); });
  $('cdClose').addEventListener('click', close);
  $('cdCancel').addEventListener('click', close);
  $('cdSave').addEventListener('click', ()=>{
    const s = $('cdStart').value, e = $('cdEnd').value;
    if(s && e && new Date(e) <= new Date(s)){ alert(t('credit_dates_modal.end_before_start')); return; }
    if(s){ state.credits[ci].start = s; } else { delete state.credits[ci].start; }
    if(e){ state.credits[ci].end = e; } else { delete state.credits[ci].end; }
    close(); render(); scheduleSave();
  });
}

// ---- Drag to reorder credits ----
let cDragFrom = null, cDragRow = null;
function clearCreditMarks(){ document.querySelectorAll('#creditsList .credit').forEach(r=>r.classList.remove('drag-over','dragging')); }
$('creditsList').addEventListener('pointerdown', e=>{
  const handle = e.target.closest('.cdrag'); if(!handle) return;
  e.preventDefault();
  cDragRow = handle.closest('.credit');
  cDragFrom = +cDragRow.dataset.idx;
  cDragRow.classList.add('dragging');
  cDragRow.setPointerCapture?.(e.pointerId);
});
$('creditsList').addEventListener('pointermove', e=>{
  if(cDragFrom===null) return;
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('#creditsList .credit');
  document.querySelectorAll('#creditsList .credit').forEach(r=>{ if(r!==cDragRow) r.classList.remove('drag-over'); });
  if(target && target!==cDragRow) target.classList.add('drag-over');
});
$('creditsList').addEventListener('pointerup', e=>{
  if(cDragFrom===null) return;
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('#creditsList .credit');
  if(target && target!==cDragRow){
    const to = +target.dataset.idx;
    const [moved] = state.credits.splice(cDragFrom,1);
    state.credits.splice(to,0,moved);
    render(); scheduleSave();
  }
  clearCreditMarks();
  cDragFrom = null; cDragRow = null;
});
$('creditsList').addEventListener('pointercancel', ()=>{ clearCreditMarks(); cDragFrom=null; cDragRow=null; });

/* ═══════════════════════════════════════════════════════════════
   8. POGAS UN RĪKJOSLA
   Pievienot rēķinu/kredītu, sakārtot, notīrīt ķeksīšus,
   eksports (JSON/CSV), imports, sākt no jauna, izrakstīties.
   ═══════════════════════════════════════════════════════════════ */

$('addBill').addEventListener('click', ()=>{
  const root = $('modalRoot');
  root.innerHTML = `
    <div class="modal-back" id="nbBack">
      <div class="modal" style="max-width:440px;">
        <button class="modal-close" id="nbClose">×</button>
        <h3>${t('bills.new_bill_title')}</h3>
        <div class="msub">${t('bills.new_bill_subtitle')}</div>
        <button class="btn ghost" id="nbNormal" style="width:100%;text-align:left;padding:14px;margin-top:8px;display:block;">
          <strong style="display:block;color:var(--ink);">${t('bills.normal_title')}</strong>
          <span style="font-size:13px;color:var(--muted);">${t('bills.normal_desc')}</span>
        </button>
        <button class="btn ghost" id="nbSumming" style="width:100%;text-align:left;padding:14px;margin-top:10px;display:block;">
          <strong style="display:block;color:var(--ink);">${t('bills.summing_title')}</strong>
          <span style="font-size:13px;color:var(--muted);">${t('bills.summing_desc')}</span>
        </button>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('nbBack').addEventListener('click', e=>{ if(e.target.id==='nbBack') close(); });
  $('nbClose').addEventListener('click', close);
  $('nbNormal').addEventListener('click', ()=>{
    close(); state.bills.push({id:genId(),name:'',amount:0,cat:'cits'}); render(); scheduleSave();
    const n=document.querySelectorAll('#billsList .name'); n[n.length-1]?.focus();
  });
  $('nbSumming').addEventListener('click', ()=>{
    close(); state.bills.push({id:genId(),name:'',type:'summing',entries:[],cat:'cits'}); render(); scheduleSave();
    const n=document.querySelectorAll('#billsList .name'); n[n.length-1]?.focus();
  });
});
$('sortBillsBtn').addEventListener('click', ()=>{
  state.bills.sort((a,b)=> billAmount(b) - billAmount(a));
  render(); scheduleSave();
});
$('addCredit').addEventListener('click', ()=>{ state.credits.push({id:genId(),name:'',amount:0}); render(); scheduleSave(); const n=document.querySelectorAll('#creditsList .cname'); n[n.length-1]?.focus(); });

// ---- Papildus ienākumi (list edit) ----
$('extraIncomeList').addEventListener('input', e=>{
  const i=e.target.dataset.ei, f=e.target.dataset.f; if(i===undefined) return;
  if(f==='amount') state.extraIncome[i][f]=Math.round((parseFloat(e.target.value)||0)*100)/100;
  else state.extraIncome[i][f]=e.target.value;
  if(f==='amount') updateTotals();
  scheduleSave();
});
$('extraIncomeList').addEventListener('click', e=>{
  const del=e.target.closest('[data-eidel]');
  if(!del) return;
  const i=+del.dataset.eidel;
  const nm=(state.extraIncome[i].name||'').trim();
  if(confirm(nm?t('extra_income.confirm_delete_named',{name:nm}):t('extra_income.confirm_delete'))){
    state.extraIncome.splice(i,1); render(); scheduleSave();
  }
});
$('addExtraIncomeBtn').addEventListener('click', ()=>{
  if(!state.extraIncome) state.extraIncome = [];
  state.extraIncome.push({id:genId(), name:'', amount:0, date:todayStr()});
  render(); scheduleSave();
  const n=document.querySelectorAll('#extraIncomeList .einame'); n[n.length-1]?.focus();
});

$('exportBtn').addEventListener('click', ()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='finanses-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
});
$('exportCsvBtn')?.addEventListener('click', ()=>{
  const rows = [[t('export.csv_header_type'),t('export.csv_header_name'),t('export.csv_header_amount'),t('export.csv_header_category'),t('export.csv_header_paid')]];
  state.bills.forEach(b=>rows.push([t('export.csv_type_bill'), b.name||'', billAmount(b).toFixed(2), catName(b.cat||'cits'), isBillPaid(b)?t('export.csv_yes'):t('export.csv_no')]));
  state.credits.forEach(c=>rows.push([t('export.csv_type_credit'), c.name||'', (Number(c.amount)||0).toFixed(2), '', '']));
  (state.extraIncome||[]).forEach(e=>rows.push([t('export.csv_type_extra_income'), e.name||'', (Number(e.amount)||0).toFixed(2), e.date||'', '']));
  const esc = v => /[";\n]/.test(v) ? '"'+String(v).replace(/"/g,'""')+'"' : v;
  const csv = '\uFEFF' + rows.map(r=>r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'finanses-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
});
$('importBtn').addEventListener('click', ()=>$('fileIn').click());
$('fileIn').addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file) return;
  const r = new FileReader();
  r.onload = async ()=>{
    let data;
    try { data = JSON.parse(r.result); }
    catch(err){ alert(t('import.invalid_json')); $('fileIn').value=''; return; }
    if(typeof data !== 'object' || data===null || !Array.isArray(data.bills)){
      alert(t('import.invalid_data')); $('fileIn').value=''; return;
    }
    if(!confirm(t('import.confirm'))){ $('fileIn').value=''; return; }
    const importedCategories = (Array.isArray(data.categories)&&data.categories.length)
      ? data.categories.map(c=>({ key: String(c.key||'cits').slice(0,20), name: String(c.name||'Cits').slice(0,40), color: safeColor(c.color) }))
      : defaultCategories();
    // Ensure 'cits' fallback category always exists
    if(!importedCategories.some(c=>c.key==='cits')) importedCategories.push({key:'cits',name:'Cits',color:'#8a8576'});
    try {
      await saveCategoriesBatch(state.categories, importedCategories);
    } catch(err){
      console.error('Kļūda importējot kategorijas:', err);
      alert(t('categories.save_failed', {msg: err?.message || err}));
      $('fileIn').value=''; return;
    }
    // Sākam ar `...state` bāzi (nevis tukšu objektu), lai lauki, ko šis imports
    // neaptver (piem. veca eksporta fails no PIRMS reminders/savingsGoals/salaryDay
    // pastāvēja), paliktu neskarti, nevis klusi izdzēstos nākamajā pushNow().
    state = {
      ...state,
      income: Number(data.income)||0,
      periodName: (typeof data.periodName==='string') ? data.periodName : (state.periodName||''),
      bills: Array.isArray(data.bills)?data.bills:[],
      credits: Array.isArray(data.credits)?data.credits:[],
      categories: importedCategories,
      extraIncome: Array.isArray(data.extraIncome)?data.extraIncome:[],
      reminders: Array.isArray(data.reminders)?data.reminders:(state.reminders||[]),
      savingsGoals: Array.isArray(data.savingsGoals)?data.savingsGoals:(state.savingsGoals||[]),
      salaryDay: (data.salaryDay!==undefined && data.salaryDay!==null) ? data.salaryDay : state.salaryDay
    };
    render(); pushNow();
    $('fileIn').value='';
    alert(t('import.done'));
  };
  r.readAsText(file);
});

$('signOutBtn').addEventListener('click', async ()=>{
  if(!confirm(t('auth.signout_confirm'))) return;
  try {
    if(IS_NATIVE) await FirebaseAuthentication.signOut();
    await signOut(auth);
  } catch(e){
    alert(t('auth.signout_failed', {msg: e.message}));
  }
});

/* ═══════════════════════════════════════════════════════════════
   9. KATEGORIJU PĀRVALDNIEKS
   Logs, kur pievienot/rediģēt/dzēst kategorijas un to krāsas.
   ═══════════════════════════════════════════════════════════════ */

// ---- Category manager ----
function slugify(s){
  const base = (s||'').toLowerCase()
    .replace(/[āĀ]/g,'a').replace(/[čČ]/g,'c').replace(/[ēĒ]/g,'e').replace(/[ģĢ]/g,'g')
    .replace(/[īĪ]/g,'i').replace(/[ķĶ]/g,'k').replace(/[ļĻ]/g,'l').replace(/[ņŅ]/g,'n')
    .replace(/[šŠ]/g,'s').replace(/[ūŪ]/g,'u').replace(/[žŽ]/g,'z')
    .replace(/[^a-z0-9]+/g,'').slice(0,20);
  return base || 'kat';
}

$('manageCatBtn').addEventListener('click', openCategoryManager);

function openCategoryManager(){
  // Work on a draft of categories
  let draft = structuredClone(catList());
  const root = $('modalRoot');

  function usageCount(key){ return (state.bills||[]).filter(b=>(b.cat||'cits')===key).length; }

  function rowsHtml(){
    return draft.map((c,i)=>{
      const used = usageCount(c.key);
      const isCits = c.key==='cits';
      return `
        <div class="cat-mgr-row" data-i="${i}">
          <input type="color" value="${c.color}" data-cmcolor="${i}" ${isCits?'':''}>
          <input class="cm-name" value="${escapeHtml(c.name)}" data-cmname="${i}" placeholder="${t('categories.name_placeholder')}">
          <span class="cm-count">${t('categories.usage_count', {count: used})}</span>
          <button class="cm-del" data-cmdel="${i}" ${isCits?`disabled title="${t('categories.delete_protected_title')}"`:`title="${t('categories.delete_title')}"`}>×</button>
        </div>`;
    }).join('');
  }

  root.innerHTML = `
    <div class="modal-back" id="catBack">
      <div class="modal">
        <button class="modal-close" id="catClose">×</button>
        <h3>${t('categories.manager_title')}</h3>
        <div class="msub">${t('categories.manager_hint')}</div>
        <div id="catRows">${rowsHtml()}</div>
        <button class="btn ghost sm add-line" id="catAdd">${t('categories.add')}</button>
        <div class="m-savebar">
          <span class="status" id="catStatus">${t('categories.unsaved_hint')}</span>
          <span class="spacer"></span>
          <button class="btn ghost sm" id="catCancel">${t('common.close')}</button>
          <button class="btn" id="catSave">${t('common.save')}</button>
        </div>
      </div>
    </div>`;

  let dirty = false;
  const mark = ()=>{ dirty=true; $('catStatus').textContent=t('categories.unsaved_status'); $('catStatus').style.color='var(--amber)'; };
  function rerender(){ $('catRows').innerHTML = rowsHtml(); }

  $('catRows').addEventListener('input', e=>{
    const ci=e.target.dataset.cmcolor, ni=e.target.dataset.cmname;
    if(ci!==undefined){ draft[ci].color = e.target.value; mark(); }
    if(ni!==undefined){ draft[ni].name = e.target.value; mark(); }
  });
  $('catRows').addEventListener('click', e=>{
    const del = e.target.closest('[data-cmdel]');
    if(del && !del.disabled){
      const i = +del.dataset.cmdel;
      const used = usageCount(draft[i].key);
      const msg = used>0
        ? t('categories.confirm_delete_used', {name: draft[i].name, count: used})
        : t('categories.confirm_delete', {name: draft[i].name});
      if(confirm(msg)){ draft.splice(i,1); rerender(); mark(); }
    }
  });
  $('catAdd').addEventListener('click', ()=>{
    draft.push({ key: 'kat-'+Date.now(), name: '', color: '#7a9bb0' });
    rerender(); mark();
    const inputs = $('catRows').querySelectorAll('.cm-name');
    inputs[inputs.length-1]?.focus();
  });

  function tryClose(){ if(dirty && !confirm(t('categories.discard_confirm'))) return; root.innerHTML=''; }
  $('catBack').addEventListener('click', e=>{ if(e.target.id==='catBack') tryClose(); });
  $('catClose').addEventListener('click', tryClose);
  $('catCancel').addEventListener('click', tryClose);

  $('catSave').addEventListener('click', async ()=>{
    // Validate: names non-empty, ensure 'cits' still present
    const cleaned = draft
      .map(c=>({ key:c.key, name:(c.name||'').trim(), color:safeColor(c.color) }))
      .filter(c=>c.name.length>0);
    if(!cleaned.some(c=>c.key==='cits')){
      cleaned.push({ key:'cits', name:'Cits', color:'#8a8576' });
    }
    if(cleaned.length===0){ alert(t('categories.name_required')); return; }
    // Reassign bills whose category was removed → 'cits'
    const validKeys = new Set(cleaned.map(c=>c.key));
    (state.bills||[]).forEach(b=>{ if(!validKeys.has(b.cat||'cits')) b.cat='cits'; });
    const saveBtn = $('catSave'); saveBtn.disabled = true;
    try {
      await saveCategoriesBatch(state.categories, cleaned);
      state.categories = cleaned;
      render(); scheduleSave(); // scheduleSave šeit tikai priekš bills.cat pārcelšanas augstāk, categories vairs NAV daļa no galvenā dokumenta
      dirty=false;
      $('catStatus').textContent=t('categories.saved_status'); $('catStatus').style.color='var(--green)';
      setTimeout(()=>{ root.innerHTML=''; }, 500);
    } catch(e){
      console.error('Kļūda saglabājot kategorijas:', e);
      $('catStatus').textContent=t('categories.save_failed', {msg: e?.message || e}); $('catStatus').style.color='var(--red)';
      saveBtn.disabled = false;
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   10. TĒMA, NAVIGĀCIJA, PWA, IESTATĪJUMI
   Gaišā/tumšā tēma, sadaļu pārslēgšana (Budžets/Kredīti/...),
   lietotnes instalēšana + service worker, iestatījumu modālis.
   ═══════════════════════════════════════════════════════════════ */

// ---- Version ----
document.title = t('app.name') + ' v' + VERSION;
onLangChange(() => { document.title = t('app.name') + ' v' + VERSION; });

// ---- Theme (light/dark), saved locally per device ----
function currentTheme(){ return document.documentElement.getAttribute('data-theme')==='dark' ? 'dark' : 'light'; }
function applyTheme(theme){
  if(theme==='dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('theme', theme); } catch(e){}
}
(function initTheme(){
  let saved='light';
  try { saved = localStorage.getItem('theme') || 'light'; } catch(e){}
  if(saved==='dark') document.documentElement.setAttribute('data-theme','dark');
})();

// ---- Atgādinājumu native paziņojumu laiks, saglabāts lokāli šajā ierīcē ----
function getReminderNotifTime(){
  let t = '09:00';
  try { t = localStorage.getItem('reminderNotifTime') || '09:00'; } catch(e){}
  return /^\d{2}:\d{2}$/.test(t) ? t : '09:00';
}
function setReminderNotifTime(t){
  try { localStorage.setItem('reminderNotifTime', t); } catch(e){}
}

// ---- Summary pin (sticky compact overview below the compact top bar) ----
(function initSummaryPin(){
  const wrap = document.querySelector('.summary-wrap');
  const summaryEl = document.querySelector('.summary');
  const btn = $('summaryPinBtn');
  const nav = $('topbar');
  if(!wrap || !summaryEl || !btn) return;

  function updateNavHeightVar(){
    if(nav) document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
  }
  function setPinned(pinned){
    summaryEl.classList.toggle('pinned', pinned);
    wrap.classList.toggle('pinned', pinned);
    btn.classList.toggle('active', pinned);
    btn.setAttribute('aria-pressed', String(pinned));
    btn.title = pinned ? t('budget.summary_unpin_title') : t('budget.summary_pin_title');
    try { localStorage.setItem('summaryPinned', pinned ? '1' : '0'); } catch(e){}
  }

  updateNavHeightVar();
  if('ResizeObserver' in window && nav){
    new ResizeObserver(updateNavHeightVar).observe(nav);
  } else {
    window.addEventListener('resize', updateNavHeightVar);
  }

  btn.addEventListener('click', ()=> setPinned(!summaryEl.classList.contains('pinned')));

  let savedPinned = false;
  try { savedPinned = localStorage.getItem('summaryPinned') === '1'; } catch(e){}
  setPinned(savedPinned);
})();

// ---- Section navigation (inside the drawer) ----
const SECTIONS = ['budget','extra-income','credits','reminders','savings'];
function showSection(name){
  if(!SECTIONS.includes(name)) return;
  document.querySelectorAll('.panel').forEach(p=>{
    p.classList.toggle('hidden', p.id !== 'panel-' + name);
  });
  document.querySelectorAll('.drawer-nav-item').forEach(b=>{
    b.classList.toggle('active', b.dataset.section === name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('drawerNav').addEventListener('click', e=>{
  const btn = e.target.closest('.drawer-nav-item');
  if(!btn) return;
  showSection(btn.dataset.section);
  closeDrawer();
});

// ---- Hamburger drawer: open/close, backdrop, Escape ----
const hamburgerBtn = $('hamburgerBtn');
const drawerEl = $('drawer');
const drawerBackdrop = $('drawerBackdrop');
function openDrawer(){
  drawerEl.classList.add('open');
  drawerBackdrop.classList.add('open');
  drawerEl.setAttribute('aria-hidden', 'false');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
}
function closeDrawer(){
  drawerEl.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  drawerEl.setAttribute('aria-hidden', 'true');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
}
hamburgerBtn.addEventListener('click', ()=>{
  if(drawerEl.classList.contains('open')) closeDrawer(); else openDrawer();
});
$('drawerClose').addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && drawerEl.classList.contains('open')) closeDrawer();
});

// ---- Pace popover (topbar ⓘ button): open/close, outside click, Escape ----
const paceInfoBtn = $('paceInfoBtn');
const pacePopover = $('pacePopover');
function openPacePopover(){
  pacePopover.classList.remove('hidden');
  paceInfoBtn.setAttribute('aria-expanded', 'true');
}
function closePacePopover(){
  pacePopover.classList.add('hidden');
  paceInfoBtn.setAttribute('aria-expanded', 'false');
}
paceInfoBtn.addEventListener('click', e=>{
  e.stopPropagation();
  if(pacePopover.classList.contains('hidden')) openPacePopover(); else closePacePopover();
});
document.addEventListener('click', e=>{
  if(!pacePopover.classList.contains('hidden') && !pacePopover.contains(e.target) && e.target !== paceInfoBtn){
    closePacePopover();
  }
});
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && !pacePopover.classList.contains('hidden')) closePacePopover();
});

// ---- PWA: install prompt + service worker ----
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredInstall = e;
  $('installBtn')?.classList.remove('hidden');
});
$('installBtn')?.addEventListener('click', async ()=>{
  closeDrawer();
  if(!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  $('installBtn')?.classList.add('hidden');
});
window.addEventListener('appinstalled', ()=>{ $('installBtn')?.classList.add('hidden'); });

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
  // Listen for cache updates from service worker
  navigator.serviceWorker.addEventListener('message', event => {
    if(event.data.type === 'CACHE_UPDATED'){
      if(isEditingActive()){
        console.log('SW: Cache updated — reload atlikts, lietotājs tobrīd raksta');
        pendingReload = true;
        return;
      }
      console.log('SW: Cache updated — reloading page');
      setTimeout(() => window.location.reload(), 500);
    }
  });
  // Fallback: ja atliktais reload nekad neatbrīvojas caur focusout (piem., lietotājs
  // aizver modāli ar peli, nevis pamet lauku), pārbauda ik pa 5s, kamēr nav rediģēšanas.
  setInterval(()=>{
    if(pendingReload && !isEditingActive()) window.location.reload();
  }, 5000);
}
// ---- Settings modal ----
function openChangelog(){
  const root = $('modalRoot');
  const entries = CHANGELOG.map(c=>{
    const notes = (getLang()==='en' && c.notesEn) ? c.notesEn : c.notes;
    return `
    <div class="cl-entry">
      <div><span class="cl-ver">v${c.v}</span><span class="cl-date">${c.date||''}</span></div>
      <ul class="cl-list">${notes.map(n=>`<li>${escapeHtml(n)}</li>`).join('')}</ul>
    </div>`;
  }).join('');
  root.innerHTML = `
    <div class="modal-back" id="clBack">
      <div class="modal">
        <button class="modal-close" id="clClose">×</button>
        <h3>${t('changelog.title')}</h3>
        <div class="msub">${t('changelog.subtitle', {version: VERSION})}</div>
        ${entries}
      </div>
    </div>`;
  $('clBack').addEventListener('click', e=>{ if(e.target.id==='clBack') root.innerHTML=''; });
  $('clClose').addEventListener('click', ()=>{ root.innerHTML=''; });
}

// Shows a standalone HTML document (privacy policy, terms of use) inline in a
// modal via an iframe, so the page content has a single source of truth — the
// same file also serves as the public URL required by Play Store / GDPR.
function openDocModal(title, url){
  const root = $('modalRoot');
  root.innerHTML = `
    <div class="modal-back" id="docBack">
      <div class="modal modal-doc">
        <button class="modal-close" id="docClose">×</button>
        <h3>${escapeHtml(title)}</h3>
        <iframe class="doc-frame" src="${url}" title="${escapeHtml(title)}"></iframe>
      </div>
    </div>`;
  $('docBack').addEventListener('click', e=>{ if(e.target.id==='docBack') root.innerHTML=''; });
  $('docClose').addEventListener('click', ()=>{ root.innerHTML=''; });
}

function renderSettingsModal(){
  const root = $('modalRoot');
  const dark = currentTheme()==='dark';
  const lang = getLang();
  root.innerHTML = `
    <div class="modal-back" id="setBack">
      <div class="modal" style="max-width:460px;">
        <button class="modal-close" id="setClose">×</button>
        <div class="brand" style="margin-bottom:14px;"><span class="eyebrow">${t('settings.brand_eyebrow')}</span> · <span class="app-name">${t('app.name')}</span></div>
        <h3>${t('settings.title')}</h3>
        <div class="msub">${t('settings.subtitle')}</div>

        <div class="set-row">
          <div>
            <div class="set-label">${t('settings.language')}</div>
            <div class="set-hint">${t('settings.language_hint')}</div>
          </div>
          <div class="theme-switch" id="langSwitch">
            ${SUPPORTED_LANGS.map(l=>`<button class="ts-opt ${lang===l?'active':''}" data-lang-opt="${l}" type="button">${t('lang.'+l)}</button>`).join('')}
          </div>
        </div>

        <div class="set-row">
          <div>
            <div class="set-label">${t('settings.theme_label')}</div>
            <div class="set-hint">${t('settings.theme_hint')}</div>
          </div>
          <div class="theme-switch" id="themeSwitch">
            <button class="ts-opt ${dark?'':'active'}" data-theme-opt="light" type="button">${t('settings.theme_light')}</button>
            <button class="ts-opt ${dark?'active':''}" data-theme-opt="dark" type="button">${t('settings.theme_dark')}</button>
          </div>
        </div>

        <div class="set-row">
          <div>
            <div class="set-label">${t('settings.salary_day_label')}</div>
            <div class="set-hint">${t('settings.salary_day_hint')}</div>
          </div>
          <select id="salaryDaySelect" style="font:inherit;font-size:14px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);">
            <option value="">${t('settings.salary_day_none')}</option>
            ${Array.from({length:31}, (_,i)=>i+1).map(n=>`<option value="${n}" ${state.salaryDay===n?'selected':''}>${n}.</option>`).join('')}
          </select>
        </div>

        ${IS_NATIVE ? `
        <div class="set-row">
          <div>
            <div class="set-label">${t('settings.reminder_time_label')}</div>
            <div class="set-hint">${t('settings.reminder_time_hint')}</div>
          </div>
          <input type="time" id="reminderTimeInput" value="${getReminderNotifTime()}" style="font:inherit;font-size:14px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);">
        </div>
        ` : ''}

        <div class="set-row">
          <div>
            <div class="set-label">${t('settings.version_label')}</div>
            <div class="set-hint">v${VERSION}</div>
          </div>
          <button class="btn ghost sm" id="setChangelog" type="button">${t('settings.changelog_button')}</button>
        </div>

        <div class="set-row">
          <div>
            <div class="set-label">${t('settings.privacy_label')}</div>
            <div class="set-hint">${t('settings.privacy_hint')}</div>
          </div>
          <button class="btn ghost sm" id="privacyPolicyBtn" type="button">${t('settings.privacy_button')}</button>
        </div>

        <div class="set-row">
          <div>
            <div class="set-label">${t('settings.terms_label')}</div>
            <div class="set-hint">${t('settings.terms_hint')}</div>
          </div>
          <button class="btn ghost sm" id="termsBtn" type="button">${t('settings.terms_button')}</button>
        </div>

        <div class="set-danger">
          <div class="set-row">
            <div>
              <div class="set-label">${t('settings.delete_account_label')}</div>
              <div class="set-hint">${t('settings.delete_account_hint')}</div>
            </div>
            <button class="btn danger sm" id="deleteAccountBtn" type="button">${t('settings.delete_account_button')}</button>
          </div>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('setBack').addEventListener('click', e=>{ if(e.target.id==='setBack') close(); });
  $('setClose').addEventListener('click', close);
  $('themeSwitch').addEventListener('click', e=>{
    const opt = e.target.closest('[data-theme-opt]');
    if(!opt) return;
    applyTheme(opt.dataset.themeOpt);
    $('themeSwitch').querySelectorAll('.ts-opt').forEach(b=>{
      b.classList.toggle('active', b.dataset.themeOpt === opt.dataset.themeOpt);
    });
  });
  $('langSwitch').addEventListener('click', e=>{
    const opt = e.target.closest('[data-lang-opt]');
    if(!opt || opt.dataset.langOpt === getLang()) return;
    setLang(opt.dataset.langOpt);
    renderSettingsModal();
  });
  $('salaryDaySelect').addEventListener('change', e=>{
    const val = e.target.value;
    state.salaryDay = val ? parseInt(val,10) : null;
    updatePace();
    scheduleSave();
  });
  $('setChangelog').addEventListener('click', openChangelog);
  $('privacyPolicyBtn').addEventListener('click', ()=> openDocModal(t('settings.privacy_button'), getLang()==='en' ? 'privacy-policy.html' : 'privatuma-politika.html'));
  $('termsBtn').addEventListener('click', ()=> openDocModal(t('settings.terms_button'), getLang()==='en' ? 'terms-of-use.html' : 'lietosanas-noteikumi.html'));
  $('reminderTimeInput')?.addEventListener('change', e=>{
    const val = e.target.value;
    if(/^\d{2}:\d{2}$/.test(val)){
      setReminderNotifTime(val);
      scheduleReminderNotifications();
    }
  });

  $('deleteAccountBtn').addEventListener('click', async ()=>{
    if(!confirm(t('settings.delete_account_confirm1'))) return;
    if(!confirm(t('settings.delete_account_confirm2'))) return;

    const btn = $('deleteAccountBtn');
    btn.disabled = true; btn.textContent = t('settings.deleting');

    // Detach every live listener BEFORE deleting anything — otherwise they react to the
    // deletes in real time (e.g. the categories listener's empty-collection auto-seed)
    // and silently recreate documents while deleteAllUserData() is still running.
    if(snapshotUnsub){ snapshotUnsub(); snapshotUnsub = null; }
    if(categoriesUnsub){ categoriesUnsub(); categoriesUnsub = null; }
    if(creditsUnsub){ creditsUnsub(); creditsUnsub = null; }
    if(extraIncomeUnsub){ extraIncomeUnsub(); extraIncomeUnsub = null; }
    if(remindersUnsub){ remindersUnsub(); remindersUnsub = null; }
    if(billsUnsub){ billsUnsub(); billsUnsub = null; }
    if(savingsGoalsUnsub){ savingsGoalsUnsub(); savingsGoalsUnsub = null; }

    const uid = currentUser.uid;
    try {
      await deleteAllUserData(uid);
      await deleteUser(currentUser);
      // onAuthStateChanged (user=null) automatically shows the sign-in gate and closes this modal.
    } catch(e){
      if(e && e.code === 'auth/requires-recent-login'){
        // Firebase requires a fresh sign-in for account deletion; re-prompt Google, then retry once.
        btn.textContent = t('settings.reauth_required');
        try {
          if(IS_NATIVE){
            // Same flow as the initial sign-in: native chooser, then bridge the
            // fresh ID token into the web SDK to reauthenticate the current user.
            await signInWithCredential(auth, await nativeGoogleCredential());
          } else {
            await reauthenticateWithPopup(currentUser, provider);
          }
          await deleteAllUserData(uid);
          await deleteUser(currentUser);
        } catch(e2){
          alert(t('settings.delete_account_failed', {msg: e2?.message || e2}));
          btn.disabled = false; btn.textContent = t('settings.delete_account_button');
        }
      } else {
        alert(t('settings.delete_account_failed', {msg: e?.message || e}));
        btn.disabled = false; btn.textContent = t('settings.delete_account_button');
      }
    }
  });
}
$('settingsBtn').addEventListener('click', ()=>{
  closeDrawer();
  renderSettingsModal();
});

// ---- Boot ----
// onAuthStateChanged (above) handles showing the app once the user is signed in.
// Nothing else needed here — the sign-in gate is visible by default.