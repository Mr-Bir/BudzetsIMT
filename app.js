/*
 * Finanšu pārvaldnieks (BudzetsIMT)
 * Copyright (c) 2026 Mārtiņš Barons. Visas tiesības paturētas.
 * Skatīt LICENSE failu repozitorija saknē.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, getDocs, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, deleteUser, reauthenticateWithPopup } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';
import { CHANGELOG } from './changelog.js';

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

const fmt = n => '€ ' + (Number(n)||0).toLocaleString('lv-LV',{minimumFractionDigits:2,maximumFractionDigits:2});
// Rounded, no-decimals version for the compact topbar pace indicator (full precision stays in the popover)
const fmtCompact = n => '€' + Math.round(Number(n)||0).toLocaleString('lv-LV',{maximumFractionDigits:0});
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
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
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
  { key:'cits', name:'Cits', color:'#8a8576' },
];
// Live lookups derived from state.categories
function catList(){ return (state.categories && state.categories.length) ? state.categories : DEFAULT_CATEGORIES; }
function catName(key){ const c = catList().find(x=>x.key===key); return c ? c.name : 'Cits'; }
function catColor(key){ const c = catList().find(x=>x.key===key); return c ? c.color : '#8a8576'; }

const DEFAULT = {
  income: 1850,
  periodName: '',
  bills: [
    {name:'Pārtika', amount:380, cat:'partika'},
    {name:'Īre', amount:650, cat:'ire'},
    {name:'Komunālie pakalpojumi', amount:150, cat:'komunalie'},
    {name:'Degviela', type:'summing', entries:[], cat:'transports'},
  ],
  credits: [
    {name:'In Credit', amount:550},
    {name:'Swedbank patēriņa kredīts', amount:2500},
    {name:'Privātpersonas A. Bērziņa aizdevums', amount:1585},
  ],
  categories: structuredClone(DEFAULT_CATEGORIES)
};

let state = structuredClone(DEFAULT);
let db, auth, docRef, roomId, applyingRemote=false, saveTimer=null;
let lastSentJSON = null, pendingSnapshot = null;
let currentUser = null, snapshotUnsub = null;

const $ = id => document.getElementById(id);

/* ═══════════════════════════════════════════════════════════════
   3. FIREBASE — inicializācija, App Check, pieteikšanās/izrakstīšanās
   Šeit startē Firebase, notiek Google Sign-In, un tiek izveidots
   savienojums ar lietotāja datiem mākonī (Firestore sinhronizācija).
   ═══════════════════════════════════════════════════════════════ */

// ---- Firebase init + Google auth ----
const fbApp = initializeApp(FIREBASE_CONFIG);

// App Check jāinicializē PIRMS Firestore/Auth lietošanas.
// Lokālā izstrādē (localhost) lieto debug token — konsolē parādīsies
// UUID, kas jāreģistrē Firebase Console → App Check → Manage debug tokens.
try {
  if(location.hostname === 'localhost' || location.hostname === '127.0.0.1'){
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(fbApp, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
} catch(e){
  // App Check kļūme nedrīkst apturēt lietotni, kamēr enforcement nav ieslēgts
  console.warn('App Check inicializācija neizdevās:', e);
}

db = getFirestore(fbApp);
auth = getAuth(fbApp);
const provider = new GoogleAuthProvider();

$('signInBtn').addEventListener('click', async ()=>{
  $('gateErr').textContent = '';
  try {
    // Popup is Firebase's recommended flow — avoids the third-party storage
    // partitioning that breaks signInWithRedirect in Chrome M115+/Brave.
    await signInWithPopup(auth, provider);
  } catch(e){
    // Popup blocked or unsupported (e.g. some mobile PWAs) → fall back to redirect
    if(e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment' || e.code === 'auth/cancelled-popup-request')){
      try { await signInWithRedirect(auth, provider); }
      catch(e2){ $('gateErr').textContent = 'Neizdevās pieteikties: ' + e2.message; }
    } else if(e && e.code === 'auth/popup-closed-by-user'){
      // User closed the popup — no error message needed
    } else {
      $('gateErr').textContent = 'Neizdevās pieteikties: ' + (e?.message || e);
    }
  }
});

// Still handle redirect result, in case the fallback redirect flow was used
getRedirectResult(auth).catch(e=>{
  if(e && e.code !== 'auth/no-auth-event'){ $('gateErr').textContent = 'Pieteikšanās kļūda: ' + e.message; }
});

// React to auth state changes
onAuthStateChanged(auth, user=>{
  if(user){
    currentUser = user;
    connectForUser(user.uid);
  } else {
    currentUser = null;
    if(snapshotUnsub){ snapshotUnsub(); snapshotUnsub = null; }
    $('app').classList.add('hidden');
    $('gate').classList.remove('hidden');
    $('modalRoot').innerHTML = ''; // close any open modal (e.g. Iestatījumi after account deletion)
    const splashEl = $('splash'); if(splashEl) splashEl.classList.add('hidden');
    if(window.__clearSplashWatchdog) window.__clearSplashWatchdog();
  }
});

function connectForUser(uid){
  roomId = uid;
  docRef = doc(db, 'budgets', uid);
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  const splashEl = $('splash'); if(splashEl) splashEl.classList.add('hidden');
  if(window.__clearSplashWatchdog) window.__clearSplashWatchdog();
  const nameEl = $('userName'); if(nameEl) nameEl.textContent = currentUser?.displayName || currentUser?.email || '';
  setSync('saving','Savienojas…');
  loadArchive();

  if(snapshotUnsub){ snapshotUnsub(); }
  snapshotUnsub = onSnapshot(docRef, snap=>{
    if(snap.exists()){
      const d = snap.data();
      const incoming = { income: d.income ?? DEFAULT.income, periodName: d.periodName || '', bills: d.bills ?? [], credits: d.credits ?? [], categories: (d.categories && d.categories.length) ? d.categories : structuredClone(DEFAULT_CATEGORIES) };
      const incomingJSON = JSON.stringify({ income: incoming.income, periodName: incoming.periodName, bills: incoming.bills, credits: incoming.credits, categories: incoming.categories });
      if(incomingJSON === lastSentJSON){ setSync('ok','Sinhronizēts'); return; }
      if(isEditingActive()){ pendingSnapshot = incoming; setSync('ok','Sinhronizēts'); return; }
      applyRemote(incoming);
    } else {
      // New user: start with empty-ish defaults (no personal data)
      state = { income: 0, periodName: '', bills: [], credits: [], categories: structuredClone(DEFAULT_CATEGORIES) };
      render(); pushNow();
    }
  }, err=>{
    setSync('err','Kļūda: ' + err.code);
  });
}

function applyRemote(incoming){
  applyingRemote = true;
  state = incoming;
  render();
  applyingRemote = false;
  pendingSnapshot = null;
  setSync('ok','Sinhronizēts');
}

// Permanently deletes all Firestore data for a user: the archive subcollection
// docs, then the main budgets/{uid} document. Does NOT touch the Auth account —
// that's a separate step (see deleteAccountBtn handler) since it can fail with
// auth/requires-recent-login and needs its own retry path.
async function deleteAllUserData(uid){
  const archiveSnap = await getDocs(collection(db, 'budgets', uid, 'archive'));
  await Promise.all(archiveSnap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'budgets', uid));
}

// True if focus is in a bill/credit/income input on the main view (not the archive modal)
function isEditingActive(){
  const el = document.activeElement;
  if(!el) return false;
  if(el.closest && el.closest('#modalRoot')) return true; // archive editor open
  return !!(el.closest && el.closest('#billsList, #creditsList')) || el.id==='income';
}

// When the user leaves a field, apply any deferred remote update
document.addEventListener('focusout', ()=>{
  setTimeout(()=>{
    if(pendingSnapshot && !isEditingActive()){
      applyRemote(pendingSnapshot);
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
  setSync('saving','Saglabā…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushNow, 600);
}
async function pushNow(){
  try {
    lastSentJSON = JSON.stringify({ income: state.income, periodName: state.periodName||'', bills: state.bills, credits: state.credits, categories: state.categories });
    await setDoc(docRef, { income: state.income, periodName: state.periodName||'', bills: state.bills, credits: state.credits, categories: state.categories, updated: Date.now() });
    setSync('ok','Sinhronizēts');
  } catch(e){
    setSync('err','Saglabāšana neizdevās');
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
  const income = Number(state.income)||0;
  $('income').value = state.income;
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
      ? `<div class="amount-wrap"><span class="eur">€</span><span class="amount amount-ro" title="${lim>0?'Plānotais limits':'Kopsumma no epizodēm'}">${amt.toFixed(2)}</span><button class="add-entry" data-addentry="${i}" title="Pievienot epizodi">+</button></div>`
      : `<div class="amount-wrap"><span class="eur">€</span><input class="amount" type="number" step="0.01" inputmode="decimal" value="${Number(b.amount)||0}" data-i="${i}" data-f="amount"></div>`;
    row.innerHTML = `
      <div class="drag-handle" data-drag="${i}" title="Vilkt, lai pārkārtotu" aria-label="Pārvietot" style="border-left-color:${catColor(b.cat||'cits')}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
      </div>
      ${isSum
        ? `<div class="pay-check pay-check-auto" title="Summējošs rēķins — katra epizode jau ir apmaksāta"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`
        : `<button class="pay-check" data-pay="${i}" title="Atzīmēt kā samaksātu" aria-label="Samaksāts"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`}
      <input class="name" value="${escapeHtml(b.name)}" data-i="${i}" data-f="name" placeholder="Nosaukums">
      ${amountCell}
      <div class="pct">${pct.toFixed(2)} %</div>
      <select data-i="${i}" data-f="cat">${catOptions(b.cat||'cits')}</select>
      <button class="del" data-del="${i}" title="Dzēst">×</button>`;
    list.appendChild(row);
    // Summing bill detail block: limit progress + entries
    if(isSum){
      const sub = document.createElement('div');
      sub.className = 'entries';
      const over = lim>0 && spent>lim;
      const ratio = lim>0 ? Math.min(spent/lim,1) : 0;
      const collapsed = collapsedBills.has(i);
      const labelHtml = lim>0
        ? `Iztērēts <strong>${fmt(spent)}</strong> no ${fmt(lim)}${over?` · <span class="over">pārtērēts ${fmt(spent-lim)}</span>`:''}`
        : `Iztērēts <strong>${fmt(spent)}</strong> · bez limita`;
      const limitLine = `
        <div class="limit-row">
          <button class="entries-toggle" data-toggle="${i}" aria-expanded="${collapsed?'false':'true'}" title="${collapsed?'Rādīt epizodes':'Sakļaut epizodes'}">
            <svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            <span class="limit-label">${labelHtml}</span>
          </button>
          <button class="limit-edit" data-limit="${i}" title="${lim>0?'Mainīt limitu':'Uzlikt limitu'}">${lim>0?'Mainīt limitu':'Uzlikt limitu'}</button>
        </div>
        ${lim>0 ? `<div class="limit-track"><div class="limit-fill" style="width:${ratio*100}%;background:${over?'var(--red)':'var(--green)'}"></div></div>` : ''}`;
      const entriesHtml = (b.entries||[]).length
        ? (b.entries||[]).map((e,ei)=>`
          <div class="entry-row">
            <span class="entry-date">${escapeHtml(e.date||'')}</span>
            <span class="entry-note">${escapeHtml(e.note||'')}</span>
            <span class="entry-amt">${fmt(e.amount)}</span>
            <button class="entry-del" data-entrydel="${i}" data-entryidx="${ei}" title="Dzēst epizodi">×</button>
          </div>`).join('')
        : `<div class="entry-empty">Vēl nav epizožu — pievieno ar "+"</div>`;
      sub.innerHTML = limitLine + `<div class="entries-list${collapsed?' collapsed':''}">${entriesHtml}</div>`;
      list.appendChild(sub);
    }
  });
  const cl = $('creditsList'); cl.innerHTML='';
  (state.credits||[]).forEach((c,i)=>{
    const row = document.createElement('div'); row.className='credit'; row.dataset.idx=i;
    const hasDates = c.start && c.end;
    row.innerHTML = `
      <div class="cdrag" data-cdrag="${i}" title="Vilkt, lai pārkārtotu" aria-label="Pārvietot"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
      <input class="cname" value="${escapeHtml(c.name)}" data-ci="${i}" data-f="name" placeholder="Kredīta nosaukums">
      <div class="camount-wrap"><span class="eur">€</span><input class="camount" type="number" step="0.01" inputmode="decimal" value="${(Number(c.amount)||0).toFixed(2)}" data-ci="${i}" data-f="amount"></div>
      <button class="del" data-cdel="${i}" title="Dzēst">×</button>`;
    cl.appendChild(row);
    // Progress block (time-based) when dates are set; otherwise a small "set dates" link
    const prog = creditProgress(c);
    const sub = document.createElement('div');
    sub.className = 'credit-detail';
    let datesHtml;
    if(prog){
      const pctTxt = prog.pct.toFixed(0);
      const remTxt = prog.done ? 'nomaksāts' : `atlikuši ${prog.monthsRemaining} mēn.`;
      datesHtml = `
        <div class="cd-row">
          <span class="cd-label"><strong>${pctTxt}%</strong> nomaksāts · ${remTxt}</span>
          <button class="cd-edit" data-cdate="${i}">Mainīt datumus</button>
        </div>
        <div class="cd-track"><div class="cd-fill" style="width:${prog.pct}%"></div></div>`;
    } else {
      datesHtml = `
        <div class="cd-row">
          <span class="cd-label cd-muted">Bez termiņa</span>
          <button class="cd-edit" data-cdate="${i}">Uzlikt datumus</button>
        </div>`;
    }
    // Monthly payment control: [-] [amount] [+]
    const pay = Number(c.monthly)||0;
    const payHtml = `
      <div class="cd-pay-row">
        <span class="cd-pay-label">Mēneša maksājums</span>
        <div class="cd-pay-controls">
          <button class="cd-pay-btn minus" data-cpay-minus="${i}" title="Atņemt no atlikuma" ${pay>0?'':'disabled'}>−</button>
          <div class="cd-pay-amt-wrap"><span class="cd-pay-eur">€</span><input class="cd-pay-amt" type="number" step="0.01" inputmode="decimal" value="${c.monthly!=null?(Number(c.monthly)||0):''}" data-cpay="${i}" placeholder="0.00"></div>
          <button class="cd-pay-btn plus" data-cpay-plus="${i}" title="Pieskaitīt atlikumam (atsaukt)" ${pay>0?'':'disabled'}>+</button>
        </div>
      </div>`;
    sub.innerHTML = datesHtml + payHtml;
    cl.appendChild(sub);
  });
  updateTotals();
}

function updateTotals(){
  const income = Number(state.income)||0;
  const bills = state.bills||[];
  const total = bills.reduce((s,b)=>s+billAmount(b),0);
  const ctotal = (state.credits||[]).reduce((s,c)=>s+(Number(c.amount)||0),0);
  const paidSum = bills.filter(isBillPaid).reduce((s,b)=>s+billAmount(b),0);
  const toPay = total - paidSum;
  const paidCount = bills.filter(isBillPaid).length;
  $('sumTotal').textContent = fmt(total);
  $('sumPct').textContent = (income>0?(total/income*100).toFixed(1):'0')+' % no ieņēmumiem';
  // Show "iztērēts" only when it differs from the planned total (i.e. summing bills with limits exist)
  const spentTotal = bills.reduce((s,b)=>s+billSpent(b),0);
  const hasLimits = bills.some(b=>b.type==='summing' && (Number(b.limit)||0)>0);
  $('sumSpent').textContent = hasLimits ? `iztērēts: ${fmt(spentTotal)}` : '';
  $('billsFootTotal').textContent = fmt(total);
  $('creditsFootTotal').textContent = fmt(ctotal);
  const monthlyTotal = (state.credits||[]).reduce((s,c)=>s+(Number(c.monthly)||0),0);
  const monthlyFoot = $('creditsMonthlyFoot');
  if(monthlyFoot){
    if(monthlyTotal>0){ monthlyFoot.style.display=''; $('creditsMonthlyTotal').textContent = fmt(monthlyTotal); }
    else { monthlyFoot.style.display='none'; }
  }
  $('toPay').textContent = fmt(toPay);
  $('paidHint').textContent = `${paidCount} no ${bills.length} samaksāti · ${fmt(paidSum)}`;
  const remaining = income-total;
  const rem = $('remaining');
  rem.textContent = fmt(remaining); rem.className='value '+(remaining>=0?'pos':'neg');
  $('remHint').textContent = remaining>=0?'pāri pēc rēķiniem':'iztrūkums';
  // Overspend warning: summing bills where actual spending exceeds the set limit
  const overBills = bills.filter(b=>b.type==='summing' && (Number(b.limit)||0)>0 && billSpent(b)>Number(b.limit));
  const overTitle = overBills.length
    ? 'Pārtērēts: ' + overBills.map(b=>`${b.name||'Rēķins'} (+${fmt(billSpent(b)-Number(b.limit))})`).join(', ')
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

// Spending-pace indicator: how fast money is actually going out this month,
// based on real spending (paid bills + summing-bill entries), not the budgeted/limit total.
function updatePace(){
  const group = $('topbarPace');
  if(!group) return;
  const income = Number(state.income)||0;
  const bills = state.bills||[];
  const spentSoFar = bills.filter(isBillPaid).reduce((s,b)=>s+billSpent(b),0);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysElapsed = Math.min(now.getDate(), daysInMonth);
  const daysRemaining = Math.max(daysInMonth - daysElapsed, 1);
  const dailyAvg = spentSoFar / daysElapsed;
  const available = income - spentSoFar;
  const safeDaily = available / daysRemaining;
  const targetDaily = daysInMonth>0 ? income / daysInMonth : 0;

  // Compact topbar values (rounded, no labels — full precision lives in the popover)
  $('paceDaily').textContent = fmtCompact(dailyAvg);
  $('paceDaily').title = 'Tēriņš/dienā: ' + fmt(dailyAvg) + ' / d.';
  $('paceAvailable').textContent = fmtCompact(available);
  $('paceAvailable').title = 'Pieejams tagad: ' + fmt(available);
  $('paceSafe').textContent = fmtCompact(safeDaily);
  $('paceSafe').title = 'Droša summa/dienā: ' + fmt(safeDaily) + ' / d.';

  // Full-precision popover values
  $('paceDailyFull').textContent = fmt(dailyAvg) + ' / d.';
  $('paceAvailableFull').textContent = fmt(available);
  $('paceSafeFull').textContent = fmt(safeDaily) + ' / d.';

  const dot = $('paceDot');
  const status = $('pacePopStatus');
  if(dot){
    dot.classList.remove('under','over');
    if(income>0){
      const under = dailyAvg<=targetDaily;
      dot.classList.add(under ? 'under' : 'over');
      const statusText = under
        ? `Tērē lēnāk nekā drošais temps (${fmt(targetDaily)}/d.)`
        : `Tērē ātrāk nekā drošais temps (${fmt(targetDaily)}/d.)`;
      dot.title = statusText;
      if(status) status.textContent = statusText;
    } else {
      dot.title = '';
      if(status) status.textContent = '';
    }
  }
}

function renderCategories(total){
  const sums = {};
  catList().forEach(c=>sums[c.key]=0);
  (state.bills||[]).forEach(b=>{ const c=b.cat||'cits'; sums[c]=(sums[c]||0)+billAmount(b); });
  const entries = Object.entries(sums).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]);

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
      const seg = document.createElementNS('http://www.w3.org/2000/svg','circle');
      seg.setAttribute('cx','50'); seg.setAttribute('cy','50'); seg.setAttribute('r',r);
      seg.setAttribute('fill','none'); seg.setAttribute('stroke',catColor(k));
      seg.setAttribute('stroke-width','14');
      seg.setAttribute('stroke-dasharray',`${frac*c} ${c}`);
      seg.setAttribute('stroke-dashoffset',`${-offset*c}`);
      svg.appendChild(seg);
      offset += frac;
    });
  }
  $('donutTotal').textContent = '€ ' + Math.round(total).toLocaleString('lv-LV');

  // Legend with mini bars
  const legend = $('catLegend');
  legend.innerHTML = '';
  if(entries.length===0){ legend.innerHTML = '<div class="cat-pct">Nav datu</div>'; return; }
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
  if(!m) return 'Arhīva ieraksts';
  const names = ['Janvāris','Februāris','Marts','Aprīlis','Maijs','Jūnijs','Jūlijs','Augusts','Septembris','Oktobris','Novembris','Decembris'];
  return names[+m[2]-1] + ' ' + m[1];
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
    $('archiveList').innerHTML = '<div class="empty-note">Neizdevās ielādēt arhīvu: '+e.code+'</div>';
  }
}

function renderArchive(){
  const list = $('archiveList');
  if(archiveCache.length===0){
    list.innerHTML = '<div class="empty-note">Vēl nav arhivētu mēnešu. Mēneša beigās spied "Aizvērt mēnesi → arhīvā".</div>';
    return;
  }
  list.innerHTML = '';
  archiveCache.forEach(a=>{
    const total = (a.bills||[]).reduce((s,b)=>s+billAmount(b),0);
    const remaining = (Number(a.income)||0) - total;
    const row = document.createElement('div');
    row.className = 'arch-row';
    row.innerHTML = `
      <div><div class="arch-month">${escapeHtml(archName(a))}</div><div class="arch-sub">${(a.bills||[]).length} rēķini · alga ${fmt(a.income)}</div></div>
      <div class="arch-figure"><span class="lbl">Rēķini</span>${fmt(total)}</div>
      <div class="arch-figure ${remaining>=0?'rem-pos':'rem-neg'}"><span class="lbl">Paliek</span>${fmt(remaining)}</div>
      <div class="arch-actions">
        <button class="btn ghost sm" data-view="${a.id}">Skatīt</button>
        <button class="btn ghost sm" data-adup="${a.id}">Dublēt</button>
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
    ? `Mēnesis ${displayLabel} jau ir arhīvā. Pārrakstīt to ar pašreizējiem datiem?`
    : `Saglabāt ${displayLabel} arhīvā? Pašreizējie dati paliks aktuālajā mēnesī, un arhīvā izveidosies momentuzņēmums.`;
  if(!confirm(msg)) return;
  try {
    const snapshot = {
      income: state.income,
      bills: structuredClone(state.bills),
      credits: structuredClone(state.credits),
      archivedAt: Date.now()
    };
    if(label) snapshot.name = label;
    else if(existing && existing.name) snapshot.name = existing.name;
    await setDoc(doc(db, 'budgets', roomId, 'archive', key), snapshot);
    await loadArchive();
    alert(`${displayLabel} saglabāts arhīvā ✓`);
  } catch(e){
    alert('Neizdevās saglabāt: ' + e.message);
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
      name: baseName + ' (kopija)',
      income: src.income,
      bills: structuredClone(src.bills||[]),
      credits: structuredClone(src.credits||[]),
      archivedAt: Date.now()
    };
    e.target.textContent = 'Dublē…';
    try {
      await setDoc(doc(db, 'budgets', roomId, 'archive', newId), copy);
      await loadArchive();
      openArchiveModal(newId);
    } catch(err){
      e.target.textContent = 'Dublēt';
      alert('Neizdevās dublēt: ' + err.message);
    }
  }
  if(e.target.dataset.adel){
    const key = e.target.dataset.adel;
    const label = archName(archiveCache.find(x=>x.id===key)||{id:key});
    if(confirm(`Dzēst "${label}" no arhīva? To nevar atsaukt.`)){
      try { await deleteDoc(doc(db, 'budgets', roomId, 'archive', key)); await loadArchive(); }
      catch(err){ alert('Neizdevās dzēst: ' + err.message); }
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
        <div class="msub">${/^\d{4}-\d{2}$/.test(key) ? monthLabel(key)+' · ' : ''}Arhivēts ${a.archivedAt ? new Date(a.archivedAt).toLocaleDateString('lv-LV') : ''}</div>

        <div class="mini-summary" id="mMini"></div>

        <h4 style="margin:0 0 4px;font-family:Georgia,serif;">Alga</h4>
        <div class="m-income">€ <input id="mIncome" type="number" step="0.01" inputmode="decimal" value="${Number(draft.income)||0}"></div>

        <h4 style="margin:18px 0 4px;font-family:Georgia,serif;display:flex;justify-content:space-between;align-items:baseline;">Rēķini <span id="mPaidInfo" style="font-family:inherit;font-size:12px;font-weight:400;color:var(--muted);"></span></h4>
        <div id="mBills"></div>
        <button class="btn ghost sm add-line" id="mAddBill">+ Pievienot rēķinu</button>

        <h4 style="margin:18px 0 4px;font-family:Georgia,serif;">Kredītu atlikumi</h4>
        <div id="mCredits"></div>
        <button class="btn ghost sm add-line" id="mAddCredit">+ Kredīts</button>

        <div class="m-savebar">
          <span class="status" id="mStatus">Tikai skatīšana</span>
          <span class="spacer"></span>
          <button class="btn ghost sm" id="mCancel">Aizvērt</button>
          <button class="btn" id="mSave">Labot</button>
        </div>
      </div>
    </div>`;

  const catOpts = sel => { let opts = catList().map(c=>`<option value="${c.key}"${c.key===sel?' selected':''}>${escapeHtml(c.name)}</option>`).join(''); if(sel && !catList().some(c=>c.key===sel)) opts = `<option value="${sel}" selected>${escapeHtml(sel)}</option>` + opts; return opts; };

  function markDirty(){ dirty = true; $('mStatus').textContent = 'Ir nesaglabātas izmaiņas'; $('mStatus').style.color = 'var(--amber)'; }

  function renderMini(){
    const income = Number(draft.income)||0;
    const total = draft.bills.reduce((s,b)=>s+billAmount(b),0);
    const remaining = income - total;
    $('mMini').innerHTML = `
      <div class="ms"><div class="l">Alga</div><div class="v">${fmt(income)}</div></div>
      <div class="ms"><div class="l">Rēķini</div><div class="v">${fmt(total)}</div></div>
      <div class="ms"><div class="l">Paliek</div><div class="v" style="color:${remaining>=0?'var(--green)':'var(--red)'}">${fmt(remaining)}</div></div>`;
    const paidCount = draft.bills.filter(isBillPaid).length;
    const paidSum = draft.bills.filter(isBillPaid).reduce((s,b)=>s+billAmount(b),0);
    $('mPaidInfo').textContent = `${paidCount} no ${draft.bills.length} samaksāti · ${fmt(paidSum)}`;
  }

  function renderBills(){
    const c = $('mBills'); c.innerHTML = '';
    draft.bills.forEach((b,i)=>{
      const row = document.createElement('div');
      const isSumB = b.type==='summing';
      row.className = 'ebill' + (b.paid?' paid':''); row.dataset.cat = b.cat||'cits'; row.dataset.idx = i;
      row.innerHTML = `
        <div class="ehandle" data-edrag="${i}" title="Vilkt" style="border-left-color:${catColor(b.cat||'cits')}"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
        ${isSumB
          ? `<div class="echk echk-auto" title="Summējošs rēķins — katra epizode jau ir apmaksāta"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`
          : `<button class="echk" data-echk="${i}" title="Samaksāts"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`}
        <input class="ename" value="${escapeHtml(b.name||'')}" data-ei="${i}" data-ef="name" placeholder="Nosaukums">
        <span class="pay-badge ${isBillPaid(b)?'yes':'no'}">${isSumB?'Apmaksāts (automātiski)':(b.paid?'Samaksāts':'Nav samaksāts')}</span>
        <div class="eamt-wrap"><span class="e-eur">€</span>${b.type==='summing' ? `<span class="eamt" style="display:inline-block;" title="Kopsumma no ${(b.entries||[]).length} epizodēm">${billAmount(b).toFixed(2)}</span>` : `<input class="eamt" type="number" step="0.01" inputmode="decimal" value="${Number(b.amount)||0}" data-ei="${i}" data-ef="amount">`}</div>
        <div style="display:flex;gap:4px;align-items:center;">
          <select class="ecat" data-ei="${i}" data-ef="cat">${catOpts(b.cat||'cits')}</select>
          <button class="edel" data-edel="${i}" title="Dzēst">×</button>
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
        <input class="ec-name" value="${escapeHtml(cr.name||'')}" data-ci="${i}" data-cf="name" placeholder="Kredīta nosaukums">
        <div class="eamt-wrap"><span class="e-eur">€</span><input class="ec-amt" type="number" step="0.01" inputmode="decimal" value="${Number(cr.amount)||0}" data-ci="${i}" data-cf="amount"></div>
        <button class="edel" data-cdel="${i}" title="Dzēst">×</button>`;
      c.appendChild(row);
    });
    if(draft.credits.length){
      const ctotal = draft.credits.reduce((s,cr)=>s+(Number(cr.amount)||0),0);
      const foot = document.createElement('div');
      foot.className = 'ecredit-foot';
      foot.innerHTML = `<span>Atlikums kopā</span><span class="ec-total">${fmt(ctotal)}</span>`;
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
    if(del){ const i=+del.dataset.edel; const nm=(draft.bills[i].name||'').trim(); if(confirm(nm?`Dzēst rēķinu "${nm}"?`:'Dzēst šo rēķinu?')){ draft.bills.splice(i,1); renderAll(); markDirty(); } return; }
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
    if(del){ const i=+del.dataset.cdel; const nm=(draft.credits[i].name||'').trim(); if(confirm(nm?`Dzēst kredīta atlikumu "${nm}"?`:'Dzēst šo kredīta atlikumu?')){ draft.credits.splice(i,1); renderCredits(); markDirty(); } }
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
    if(dirty && !confirm('Ir nesaglabātas izmaiņas. Aizvērt bez saglabāšanas?')) return;
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
      $('mSave').textContent = 'Saglabāt izmaiņas';
      $('mStatus').textContent = 'Rediģēšanas režīms';
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
      archivedAt: a.archivedAt || Date.now()
    };
    const btn = $('mSave'); btn.textContent='Saglabā…'; btn.disabled=true;
    try {
      await setDoc(doc(db, 'budgets', roomId, 'archive', key), payload);
      const cached = archiveCache.find(x=>x.id===key);
      if(cached) Object.assign(cached, payload);
      renderArchive();
      dirty=false;
      // Return to view-only mode
      locked = true;
      applyLock();
      $('mStatus').textContent='Saglabāts ✓'; $('mStatus').style.color='var(--green)';
      btn.textContent='Labot'; btn.disabled=false;
    } catch(err){
      btn.textContent='Saglabāt izmaiņas'; btn.disabled=false;
      alert('Neizdevās saglabāt: ' + err.message);
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
  if(delBtn){ const i=+delBtn.dataset.del; const nm=(state.bills[i].name||'').trim(); if(confirm(nm?`Dzēst rēķinu "${nm}"?`:'Dzēst šo rēķinu?')){ state.bills.splice(i,1); render(); scheduleSave(); } return; }
  if(payBtn){ const i=+payBtn.dataset.pay; state.bills[i].paid = !state.bills[i].paid; render(); updateTotals(); scheduleSave(); return; }
  if(addEntryBtn){ openAddEntry(+addEntryBtn.dataset.addentry); return; }
  if(limitBtn){ openSetLimit(+limitBtn.dataset.limit); return; }
  if(toggleBtn){
    const i = +toggleBtn.dataset.toggle;
    const nowCollapsed = !collapsedBills.has(i);
    if(nowCollapsed) collapsedBills.add(i); else collapsedBills.delete(i);
    const entriesListEl = toggleBtn.closest('.entries').querySelector('.entries-list');
    if(entriesListEl) entriesListEl.classList.toggle('collapsed', nowCollapsed);
    toggleBtn.setAttribute('aria-expanded', String(!nowCollapsed));
    toggleBtn.title = nowCollapsed ? 'Rādīt epizodes' : 'Sakļaut epizodes';
    return;
  }
  if(entryDelBtn){
    const bi=+entryDelBtn.dataset.entrydel, ei=+entryDelBtn.dataset.entryidx;
    const ent = state.bills[bi].entries[ei];
    if(confirm(`Dzēst epizodi ${fmt(ent.amount)}${ent.date?' ('+ent.date+')':''}?`)){
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
        <h3>Pievienot epizodi</h3>
        <div class="msub">${escapeHtml(b.name||'Rēķins')} — pašreiz ${fmt(billAmount(b))}</div>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">Summa €</label>
        <input id="aeAmount" type="number" step="0.01" inputmode="decimal" placeholder="0.00" style="width:100%;font:inherit;font-size:18px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">Piezīme (nav obligāta)</label>
        <input id="aeNote" type="text" placeholder="piem. degvielas uzpilde" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">Datums</label>
        <input id="aeDate" type="date" value="${todayStr()}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="aeCancel">Atcelt</button>
          <button class="btn" id="aeSave">Pievienot</button>
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
    if(!amt || amt<=0){ alert('Ievadi summu, kas lielāka par 0.'); return; }
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
        <h3>Mēneša limits</h3>
        <div class="msub">${escapeHtml(b.name||'Rēķins')} — plānotais maksimums mēnesī</div>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">Limits € (atstāj tukšu, lai noņemtu)</label>
        <input id="slAmount" type="number" step="0.01" inputmode="decimal" value="${cur>0?cur:''}" placeholder="piem. 100" style="width:100%;font:inherit;font-size:18px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <div style="font-size:12px;color:var(--muted);margin-top:8px;">Ja uzliec limitu, "Kopā rēķini" izmantos šo summu (plānoto), nevis reāli iztērēto.</div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="slCancel">Atcelt</button>
          <button class="btn" id="slSave">Saglabāt</button>
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
    else { const n=parseFloat(val); if(isNaN(n)||n<0){ alert('Ievadi derīgu summu.'); return; } state.bills[bi].limit = n; }
    close(); render(); scheduleSave();
  };
  $('slSave').addEventListener('click', doSave);
  $('slAmount').addEventListener('keydown', e=>{ if(e.key==='Enter') doSave(); });
}

function openNewMonthModal(){
  if(!state.bills.length){ alert('Nav neviena rēķina, ko atiestatīt.'); return; }
  const root = $('modalRoot');
  const rowsHtml = state.bills.map((b,i)=>`
    <label class="nm-row">
      <input type="checkbox" class="nm-keep" data-i="${i}" checked>
      <span class="nm-name">${escapeHtml(b.name||'(bez nosaukuma)')}</span>
      <span class="nm-amt">${fmt(billAmount(b))}</span>
    </label>`).join('');
  root.innerHTML = `
    <div class="modal-back" id="nmBack">
      <div class="modal" style="max-width:460px;">
        <button class="modal-close" id="nmClose">×</button>
        <h3>Jauns mēnesis</h3>
        <div class="msub">Atzīmē rēķinus, kas atkārtojas katru mēnesi un jāpatur. Neatzīmētie tiks izdzēsti. Summējošiem rēķiniem tiks dzēstas epizodes (limits paliks nemainīgs), un visiem paturētajiem rēķiniem "Samaksāts" ķeksīši tiks noņemti.<br><br>Ja saglabāsi arhīvā, tas tiks nosaukts "<strong>${escapeHtml(currentPeriodLabel())}</strong>". Pēc atiestatīšanas darba perioda nosaukums tiks automātiski mainīts uz "<strong>${escapeHtml(monthLabel(monthKey()))}</strong>" — vēlāk to vari pārrakstīt, klikšķinot uz nosaukuma pie "Rēķini".</div>
        <div class="nm-list">${rowsHtml}</div>
        <label class="nm-archive-opt"><input type="checkbox" id="nmArchiveFirst" checked> Vispirms saglabāt šo mēnesi arhīvā</label>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="nmCancel">Atcelt</button>
          <button class="btn" id="nmConfirm">Sākt jaunu mēnesi</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('nmBack').addEventListener('click', e=>{ if(e.target.id==='nmBack') close(); });
  $('nmClose').addEventListener('click', close);
  $('nmCancel').addEventListener('click', close);
  $('nmConfirm').addEventListener('click', async ()=>{
    const keepIdx = new Set([...root.querySelectorAll('.nm-keep:checked')].map(el=>+el.dataset.i));
    const removedCount = state.bills.length - keepIdx.size;
    if(!confirm(`Sākt jaunu mēnesi? ${removedCount} rēķins(-i) tiks izdzēsts(-i) neatgriezeniski.`)) return;
    if($('nmArchiveFirst').checked){
      try {
        const key = monthKey();
        const existing = archiveCache.find(a=>a.id===key);
        const label = (state.periodName||'').trim();
        const snapshot = {
          income: state.income,
          bills: structuredClone(state.bills),
          credits: structuredClone(state.credits),
          archivedAt: Date.now()
        };
        if(label) snapshot.name = label;
        else if(existing && existing.name) snapshot.name = existing.name;
        await setDoc(doc(db, 'budgets', roomId, 'archive', key), snapshot);
        await loadArchive();
      } catch(e){
        alert('Neizdevās saglabāt arhīvā: ' + e.message + ' — mēneša atiestatīšana pārtraukta, lai nezaudētu datus.');
        return;
      }
    }
    state.bills = state.bills
      .filter((b,i)=>keepIdx.has(i))
      .map(b=> b.type==='summing' ? { ...b, entries: [] } : { ...b, paid: false });
    state.periodName = monthLabel(monthKey());
    close(); render(); updateTotals(); scheduleSave();
    alert('Jauns mēnesis sagatavots ✓');
  });
}

$('newMonthBtn').addEventListener('click', openNewMonthModal);

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
  if(del){ const i=+del.dataset.cdel; const nm=(state.credits[i].name||'').trim(); if(confirm(nm?`Dzēst kredīta atlikumu "${nm}"?`:'Dzēst šo kredīta atlikumu?')){ state.credits.splice(i,1); render(); scheduleSave(); } return; }
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
        <h3>Kredīta termiņš</h3>
        <div class="msub">${escapeHtml(c.name||'Kredīts')} — sākuma un beigu datums parāda nomaksas progresu</div>
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:6px 0;">Sākuma datums</label>
        <input id="cdStart" type="date" value="${c.start||''}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <label style="display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px;">Beigu datums</label>
        <input id="cdEnd" type="date" value="${c.end||''}" style="width:100%;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);">
        <div style="font-size:12px;color:var(--muted);margin-top:8px;">Progress tiek rēķināts pēc laika (cik no termiņa pagājis). Atstāj tukšu, lai noņemtu termiņu.</div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button class="btn ghost sm" id="cdCancel">Atcelt</button>
          <button class="btn" id="cdSave">Saglabāt</button>
        </div>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('cdBack').addEventListener('click', e=>{ if(e.target.id==='cdBack') close(); });
  $('cdClose').addEventListener('click', close);
  $('cdCancel').addEventListener('click', close);
  $('cdSave').addEventListener('click', ()=>{
    const s = $('cdStart').value, e = $('cdEnd').value;
    if(s && e && new Date(e) <= new Date(s)){ alert('Beigu datumam jābūt pēc sākuma datuma.'); return; }
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
        <h3>Jauns rēķins</h3>
        <div class="msub">Izvēlies rēķina veidu</div>
        <button class="btn ghost" id="nbNormal" style="width:100%;text-align:left;padding:14px;margin-top:8px;display:block;">
          <strong style="display:block;color:var(--ink);">Parasts rēķins</strong>
          <span style="font-size:13px;color:var(--muted);">Fiksēta summa mēnesī (piem. īre, komunālie)</span>
        </button>
        <button class="btn ghost" id="nbSumming" style="width:100%;text-align:left;padding:14px;margin-top:10px;display:block;">
          <strong style="display:block;color:var(--ink);">Summējošs rēķins</strong>
          <span style="font-size:13px;color:var(--muted);">Krājas visu mēnesi, pievieno epizodes ar "+" (piem. degviela)</span>
        </button>
      </div>
    </div>`;
  const close = ()=>{ root.innerHTML=''; };
  $('nbBack').addEventListener('click', e=>{ if(e.target.id==='nbBack') close(); });
  $('nbClose').addEventListener('click', close);
  $('nbNormal').addEventListener('click', ()=>{
    close(); state.bills.push({name:'',amount:0,cat:'cits'}); render(); scheduleSave();
    const n=document.querySelectorAll('#billsList .name'); n[n.length-1]?.focus();
  });
  $('nbSumming').addEventListener('click', ()=>{
    close(); state.bills.push({name:'',type:'summing',entries:[],cat:'cits'}); render(); scheduleSave();
    const n=document.querySelectorAll('#billsList .name'); n[n.length-1]?.focus();
  });
});
$('sortBillsBtn').addEventListener('click', ()=>{
  state.bills.sort((a,b)=> billAmount(b) - billAmount(a));
  render(); scheduleSave();
});
$('addCredit').addEventListener('click', ()=>{ state.credits.push({name:'',amount:0}); render(); scheduleSave(); const n=document.querySelectorAll('#creditsList .cname'); n[n.length-1]?.focus(); });
$('exportBtn').addEventListener('click', ()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='finanses-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
});
$('exportCsvBtn')?.addEventListener('click', ()=>{
  const rows = [['Tips','Nosaukums','Summa','Kategorija','Samaksāts']];
  state.bills.forEach(b=>rows.push(['Rēķins', b.name||'', billAmount(b).toFixed(2), catName(b.cat||'cits'), isBillPaid(b)?'Jā':'Nē']));
  state.credits.forEach(c=>rows.push(['Kredīts', c.name||'', (Number(c.amount)||0).toFixed(2), '', '']));
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
  r.onload = ()=>{
    let data;
    try { data = JSON.parse(r.result); }
    catch(err){ alert('Nederīgs fails — neizdevās nolasīt JSON.'); $('fileIn').value=''; return; }
    if(typeof data !== 'object' || data===null || !Array.isArray(data.bills)){
      alert('Šis neizskatās pēc derīga finanšu faila (trūkst rēķinu).'); $('fileIn').value=''; return;
    }
    if(!confirm('Importēt šos datus? Tas pārrakstīs pašreizējos rēķinus, kredītus un kategorijas — arī mākonī un citās ierīcēs. (Arhīvs netiek skarts.)')){ $('fileIn').value=''; return; }
    state = {
      income: Number(data.income)||0,
      periodName: (typeof data.periodName==='string') ? data.periodName : (state.periodName||''),
      bills: Array.isArray(data.bills)?data.bills:[],
      credits: Array.isArray(data.credits)?data.credits:[],
      categories: (Array.isArray(data.categories)&&data.categories.length)?data.categories:structuredClone(DEFAULT_CATEGORIES)
    };
    // Ensure 'cits' fallback category always exists
    if(!state.categories.some(c=>c.key==='cits')) state.categories.push({key:'cits',name:'Cits',color:'#8a8576'});
    render(); pushNow();
    $('fileIn').value='';
    alert('Dati importēti ✓');
  };
  r.readAsText(file);
});

$('signOutBtn').addEventListener('click', ()=>{
  if(confirm('Izrakstīties? Nākamreiz atkal būs jāpiesakās ar Google.')){
    signOut(auth).catch(e=>alert('Neizdevās izrakstīties: '+e.message));
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
          <input class="cm-name" value="${escapeHtml(c.name)}" data-cmname="${i}" placeholder="Kategorijas nosaukums">
          <span class="cm-count">${used} rēķini</span>
          <button class="cm-del" data-cmdel="${i}" ${isCits?'disabled title="Pamatkategoriju nevar dzēst"':'title="Dzēst"'}>×</button>
        </div>`;
    }).join('');
  }

  root.innerHTML = `
    <div class="modal-back" id="catBack">
      <div class="modal">
        <button class="modal-close" id="catClose">×</button>
        <h3>Kategorijas</h3>
        <div class="msub">Pievieno, pārsauc, maini krāsu vai dzēs. "Cits" ir pamatkategorija — dzēšot citu, tās rēķini pāriet uz to.</div>
        <div id="catRows">${rowsHtml()}</div>
        <button class="btn ghost sm add-line" id="catAdd">+ Pievienot kategoriju</button>
        <div class="m-savebar">
          <span class="status" id="catStatus">Nesaglabātas izmaiņas netiek pielietotas</span>
          <span class="spacer"></span>
          <button class="btn ghost sm" id="catCancel">Aizvērt</button>
          <button class="btn" id="catSave">Saglabāt</button>
        </div>
      </div>
    </div>`;

  let dirty = false;
  const mark = ()=>{ dirty=true; $('catStatus').textContent='Ir nesaglabātas izmaiņas'; $('catStatus').style.color='var(--amber)'; };
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
        ? `Dzēst "${draft[i].name}"? ${used} rēķini pāries uz "Cits".`
        : `Dzēst "${draft[i].name}"?`;
      if(confirm(msg)){ draft.splice(i,1); rerender(); mark(); }
    }
  });
  $('catAdd').addEventListener('click', ()=>{
    draft.push({ key: 'kat-'+Date.now(), name: '', color: '#7a9bb0' });
    rerender(); mark();
    const inputs = $('catRows').querySelectorAll('.cm-name');
    inputs[inputs.length-1]?.focus();
  });

  function tryClose(){ if(dirty && !confirm('Ir nesaglabātas izmaiņas. Aizvērt bez saglabāšanas?')) return; root.innerHTML=''; }
  $('catBack').addEventListener('click', e=>{ if(e.target.id==='catBack') tryClose(); });
  $('catClose').addEventListener('click', tryClose);
  $('catCancel').addEventListener('click', tryClose);

  $('catSave').addEventListener('click', ()=>{
    // Validate: names non-empty, ensure 'cits' still present
    const cleaned = draft
      .map(c=>({ key:c.key, name:(c.name||'').trim(), color:c.color }))
      .filter(c=>c.name.length>0);
    if(!cleaned.some(c=>c.key==='cits')){
      cleaned.push({ key:'cits', name:'Cits', color:'#8a8576' });
    }
    if(cleaned.length===0){ alert('Vismaz vienai kategorijai jābūt.'); return; }
    // Reassign bills whose category was removed → 'cits'
    const validKeys = new Set(cleaned.map(c=>c.key));
    (state.bills||[]).forEach(b=>{ if(!validKeys.has(b.cat||'cits')) b.cat='cits'; });
    state.categories = cleaned;
    render(); scheduleSave();
    dirty=false;
    $('catStatus').textContent='Saglabāts ✓'; $('catStatus').style.color='var(--green)';
    setTimeout(()=>{ root.innerHTML=''; }, 500);
  });
}

/* ═══════════════════════════════════════════════════════════════
   10. TĒMA, NAVIGĀCIJA, PWA, IESTATĪJUMI
   Gaišā/tumšā tēma, sadaļu pārslēgšana (Budžets/Kredīti/...),
   lietotnes instalēšana + service worker, iestatījumu modālis.
   ═══════════════════════════════════════════════════════════════ */

// ---- Version ----
document.title = 'Finanšu pārvaldnieks v' + VERSION;

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
    btn.title = pinned ? 'Atspraust kopsavilkumu' : 'Piespraust kopsavilkumu';
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
const SECTIONS = ['budget','credits','reminders','savings'];
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
      console.log('SW: Cache updated — reloading page');
      setTimeout(() => window.location.reload(), 500);
    }
  });
}
// ---- Settings modal ----
function openChangelog(){
  const root = $('modalRoot');
  const entries = CHANGELOG.map(c=>`
    <div class="cl-entry">
      <div><span class="cl-ver">v${c.v}</span><span class="cl-date">${c.date||''}</span></div>
      <ul class="cl-list">${c.notes.map(n=>`<li>${escapeHtml(n)}</li>`).join('')}</ul>
    </div>`).join('');
  root.innerHTML = `
    <div class="modal-back" id="clBack">
      <div class="modal">
        <button class="modal-close" id="clClose">×</button>
        <h3>Kas jauns</h3>
        <div class="msub">Izmaiņu vēsture · pašreizējā versija v${VERSION}</div>
        ${entries}
      </div>
    </div>`;
  $('clBack').addEventListener('click', e=>{ if(e.target.id==='clBack') root.innerHTML=''; });
  $('clClose').addEventListener('click', ()=>{ root.innerHTML=''; });
}

$('settingsBtn').addEventListener('click', ()=>{
  closeDrawer();
  const root = $('modalRoot');
  const dark = currentTheme()==='dark';
  root.innerHTML = `
    <div class="modal-back" id="setBack">
      <div class="modal" style="max-width:460px;">
        <button class="modal-close" id="setClose">×</button>
        <div class="brand" style="margin-bottom:14px;"><span class="eyebrow">Personīgais budžets</span> · <span class="app-name">Finanšu pārvaldnieks</span></div>
        <h3>Iestatījumi</h3>
        <div class="msub">Lietotnes izskats un informācija</div>

        <div class="set-row">
          <div>
            <div class="set-label">Krāsu tēma</div>
            <div class="set-hint">Saglabājas šajā ierīcē</div>
          </div>
          <div class="theme-switch" id="themeSwitch">
            <button class="ts-opt ${dark?'':'active'}" data-theme-opt="light" type="button">🌙 Gaišā</button>
            <button class="ts-opt ${dark?'active':''}" data-theme-opt="dark" type="button">☀️ Tumšā</button>
          </div>
        </div>

        <div class="set-row">
          <div>
            <div class="set-label">Versija</div>
            <div class="set-hint">v${VERSION}</div>
          </div>
          <button class="btn ghost sm" id="setChangelog" type="button">Kas jauns</button>
        </div>

        <div class="set-row">
          <div>
            <div class="set-label">Privātums</div>
            <div class="set-hint">Kādi dati tiek vākti un kā tos pārvaldīt</div>
          </div>
          <a class="btn ghost sm" href="privatuma-politika.html" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;">Privātuma politika</a>
        </div>

        <div class="set-danger">
          <div class="set-row">
            <div>
              <div class="set-label">Dzēst kontu</div>
              <div class="set-hint">Neatgriezeniski dzēš kontu un visus datus</div>
            </div>
            <button class="btn danger sm" id="deleteAccountBtn" type="button">Dzēst kontu</button>
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
  $('setChangelog').addEventListener('click', openChangelog);

  $('deleteAccountBtn').addEventListener('click', async ()=>{
    if(!confirm('Vai tiešām vēlies neatgriezeniski dzēst savu kontu? Tiks dzēsti VISI dati — rēķini, kredīti, kategorijas un mēnešu arhīvs.')) return;
    if(!confirm('Pilnīgi droši? Šo darbību nevar atsaukt, un dati pazudīs no visām ierīcēm.')) return;

    const btn = $('deleteAccountBtn');
    btn.disabled = true; btn.textContent = 'Dzēš…';

    const uid = currentUser.uid;
    try {
      await deleteAllUserData(uid);
      await deleteUser(currentUser);
      // onAuthStateChanged (user=null) automatically shows the sign-in gate and closes this modal.
    } catch(e){
      if(e && e.code === 'auth/requires-recent-login'){
        // Firebase requires a fresh sign-in for account deletion; re-prompt Google popup, then retry once.
        btn.textContent = 'Nepieciešams apstiprināt no jauna…';
        try {
          await reauthenticateWithPopup(currentUser, provider);
          await deleteAllUserData(uid);
          await deleteUser(currentUser);
        } catch(e2){
          alert('Neizdevās dzēst kontu: ' + (e2?.message || e2));
          btn.disabled = false; btn.textContent = 'Dzēst kontu';
        }
      } else {
        alert('Neizdevās dzēst kontu: ' + (e?.message || e));
        btn.disabled = false; btn.textContent = 'Dzēst kontu';
      }
    }
  });
});

// ---- Boot ----
// onAuthStateChanged (above) handles showing the app once the user is signed in.
// Nothing else needed here — the sign-in gate is visible by default.
