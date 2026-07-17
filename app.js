import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, getDocs, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ---- Firebase config (embedded) ----
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDNHrObS8v_US22wzuqKnAI_PuI7P1JVlw",
  authDomain: "budzets-c5d39.firebaseapp.com",
  projectId: "budzets-c5d39",
  storageBucket: "budzets-c5d39.firebasestorage.app",
  messagingSenderId: "862378422626",
  appId: "1:862378422626:web:6f7da765c63f158fd43c3b"
};

// ---- Version & changelog ----
const VERSION = '1.14.0';
const CHANGELOG = [
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

const fmt = n => '€ ' + (Number(n)||0).toLocaleString('lv-LV',{minimumFractionDigits:2,maximumFractionDigits:2});
// Actual spent for a summing bill = sum of entries; for normal bill = its amount
function billSpent(b){
  if(b && b.type==='summing') return (b.entries||[]).reduce((s,e)=>s+(Number(e.amount)||0),0);
  return Number(b.amount)||0;
}
// Budget amount used in "Kopā rēķini" etc: summing bill with a limit uses the limit; otherwise the spent amount
function billAmount(b){
  if(b && b.type==='summing'){
    const lim = Number(b.limit);
    if(lim>0) return lim;
    return billSpent(b);
  }
  return Number(b.amount)||0;
}
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

// ---- Firebase init + Google auth ----
const fbApp = initializeApp(FIREBASE_CONFIG);
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
  }
});

function connectForUser(uid){
  roomId = uid;
  docRef = doc(db, 'budgets', uid);
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  const nameEl = $('userName'); if(nameEl) nameEl.textContent = currentUser?.displayName || currentUser?.email || '';
  setSync('saving','Savienojas…');
  loadArchive();

  if(snapshotUnsub){ snapshotUnsub(); }
  snapshotUnsub = onSnapshot(docRef, snap=>{
    if(snap.exists()){
      const d = snap.data();
      const incoming = { income: d.income ?? DEFAULT.income, bills: d.bills ?? [], credits: d.credits ?? [], categories: (d.categories && d.categories.length) ? d.categories : structuredClone(DEFAULT_CATEGORIES) };
      const incomingJSON = JSON.stringify({ income: incoming.income, bills: incoming.bills, credits: incoming.credits, categories: incoming.categories });
      if(incomingJSON === lastSentJSON){ setSync('ok','Sinhronizēts'); return; }
      if(isEditingActive()){ pendingSnapshot = incoming; setSync('ok','Sinhronizēts'); return; }
      applyRemote(incoming);
    } else {
      // New user: start with empty-ish defaults (no personal data)
      state = { income: 0, bills: [], credits: [], categories: structuredClone(DEFAULT_CATEGORIES) };
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
    lastSentJSON = JSON.stringify({ income: state.income, bills: state.bills, credits: state.credits, categories: state.categories });
    await setDoc(docRef, { income: state.income, bills: state.bills, credits: state.credits, categories: state.categories, updated: Date.now() });
    setSync('ok','Sinhronizēts');
  } catch(e){
    setSync('err','Saglabāšana neizdevās');
  }
}

// ---- Rendering ----
function catOptions(sel){ return catList().map(c=>`<option value="${c.key}"${c.key===sel?' selected':''}>${escapeHtml(c.name)}</option>`).join(''); }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function render(){
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
      : `<div class="amount-wrap"><span class="eur">€</span><input class="amount" type="number" step="0.01" inputmode="decimal" value="${b.amount}" data-i="${i}" data-f="amount"></div>`;
    row.innerHTML = `
      <div class="drag-handle" data-drag="${i}" title="Vilkt, lai pārkārtotu" aria-label="Pārvietot" style="border-left-color:${catColor(b.cat||'cits')}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
      </div>
      <button class="pay-check" data-pay="${i}" title="Atzīmēt kā samaksātu" aria-label="Samaksāts"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
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
      const limitLine = lim>0
        ? `<div class="limit-row">
             <span class="limit-label">Iztērēts <strong>${fmt(spent)}</strong> no ${fmt(lim)}${over?` · <span class="over">pārtērēts ${fmt(spent-lim)}</span>`:''}</span>
             <button class="limit-edit" data-limit="${i}" title="Mainīt limitu">${lim>0?'Mainīt limitu':'Uzlikt limitu'}</button>
           </div>
           <div class="limit-track"><div class="limit-fill" style="width:${ratio*100}%;background:${over?'var(--red)':'var(--green)'}"></div></div>`
        : `<div class="limit-row">
             <span class="limit-label">Iztērēts <strong>${fmt(spent)}</strong> · bez limita</span>
             <button class="limit-edit" data-limit="${i}" title="Uzlikt limitu">Uzlikt limitu</button>
           </div>`;
      const entriesHtml = (b.entries||[]).length
        ? (b.entries||[]).map((e,ei)=>`
          <div class="entry-row">
            <span class="entry-date">${escapeHtml(e.date||'')}</span>
            <span class="entry-note">${escapeHtml(e.note||'')}</span>
            <span class="entry-amt">${fmt(e.amount)}</span>
            <button class="entry-del" data-entrydel="${i}" data-entryidx="${ei}" title="Dzēst epizodi">×</button>
          </div>`).join('')
        : `<div class="entry-empty">Vēl nav epizožu — pievieno ar "+"</div>`;
      sub.innerHTML = limitLine + entriesHtml;
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
          <div class="cd-pay-amt-wrap"><span class="cd-pay-eur">€</span><input class="cd-pay-amt" type="number" step="0.01" inputmode="decimal" value="${c.monthly!=null?c.monthly:''}" data-cpay="${i}" placeholder="0.00"></div>
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
  const paidSum = bills.filter(b=>b.paid).reduce((s,b)=>s+billAmount(b),0);
  const toPay = total - paidSum;
  const paidCount = bills.filter(b=>b.paid).length;
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
  document.querySelectorAll('#billsList .bill').forEach((row,idx)=>{
    const bi = +row.dataset.idx;
    const pct = income>0?(billAmount(state.bills[bi])/income*100):0;
    row.querySelector('.pct').textContent = pct.toFixed(2)+' %';
  });
  const bar=$('bar'); const ratio=income>0?Math.min(total/income,1):0;
  bar.style.width=(ratio*100)+'%';
  bar.style.background = total>income?'var(--red)':total>income*0.8?'var(--amber)':'var(--green)';
  renderCategories(total);
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
      <div><div class="arch-month">${escapeHtml(archName(a))}</div><div class="arch-sub">${(a.name && a.name.trim() && /^\d{4}-\d{2}$/.test(a.id)) ? monthLabel(a.id)+' · ' : ''}${(a.bills||[]).length} rēķini · alga ${fmt(a.income)}</div></div>
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
  const msg = existing
    ? `Mēnesis ${monthLabel(key)} jau ir arhīvā. Pārrakstīt to ar pašreizējiem datiem?`
    : `Saglabāt ${monthLabel(key)} arhīvā? Pašreizējie dati paliks aktuālajā mēnesī, un arhīvā izveidosies momentuzņēmums.`;
  if(!confirm(msg)) return;
  try {
    const snapshot = {
      income: state.income,
      bills: structuredClone(state.bills),
      credits: structuredClone(state.credits),
      archivedAt: Date.now()
    };
    if(existing && existing.name) snapshot.name = existing.name;
    await setDoc(doc(db, 'budgets', roomId, 'archive', key), snapshot);
    await loadArchive();
    alert(`${monthLabel(key)} saglabāts arhīvā ✓`);
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
        <div class="m-income">€ <input id="mIncome" type="number" step="0.01" inputmode="decimal" value="${draft.income}"></div>

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
    const paidCount = draft.bills.filter(b=>b.paid).length;
    const paidSum = draft.bills.filter(b=>b.paid).reduce((s,b)=>s+billAmount(b),0);
    $('mPaidInfo').textContent = `${paidCount} no ${draft.bills.length} samaksāti · ${fmt(paidSum)}`;
  }

  function renderBills(){
    const c = $('mBills'); c.innerHTML = '';
    draft.bills.forEach((b,i)=>{
      const row = document.createElement('div');
      row.className = 'ebill' + (b.paid?' paid':''); row.dataset.cat = b.cat||'cits'; row.dataset.idx = i;
      row.innerHTML = `
        <div class="ehandle" data-edrag="${i}" title="Vilkt" style="border-left-color:${catColor(b.cat||'cits')}"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
        <button class="echk" data-echk="${i}" title="Samaksāts"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
        <input class="ename" value="${escapeHtml(b.name||'')}" data-ei="${i}" data-ef="name" placeholder="Nosaukums">
        <span class="pay-badge ${b.paid?'yes':'no'}">${b.paid?'Samaksāts':'Nav samaksāts'}</span>
        <div class="eamt-wrap"><span class="e-eur">€</span>${b.type==='summing' ? `<span class="eamt" style="display:inline-block;" title="Kopsumma no ${(b.entries||[]).length} epizodēm">${billAmount(b).toFixed(2)}</span>` : `<input class="eamt" type="number" step="0.01" inputmode="decimal" value="${b.amount}" data-ei="${i}" data-ef="amount">`}</div>
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
        <div class="eamt-wrap"><span class="e-eur">€</span><input class="ec-amt" type="number" step="0.01" inputmode="decimal" value="${cr.amount}" data-ci="${i}" data-cf="amount"></div>
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
  if(delBtn){ const i=+delBtn.dataset.del; const nm=(state.bills[i].name||'').trim(); if(confirm(nm?`Dzēst rēķinu "${nm}"?`:'Dzēst šo rēķinu?')){ state.bills.splice(i,1); render(); scheduleSave(); } return; }
  if(payBtn){ const i=+payBtn.dataset.pay; state.bills[i].paid = !state.bills[i].paid; render(); updateTotals(); scheduleSave(); return; }
  if(addEntryBtn){ openAddEntry(+addEntryBtn.dataset.addentry); return; }
  if(limitBtn){ openSetLimit(+limitBtn.dataset.limit); return; }
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
  state.bills.sort((a,b)=>{
    // Primary: paid first (paid=true before paid=false)
    const pa = a.paid?1:0, pb = b.paid?1:0;
    if(pa!==pb) return pb-pa;
    // Secondary: larger amount first
    return billAmount(b) - billAmount(a);
  });
  render(); scheduleSave();
});
$('resetPaidBtn').addEventListener('click', ()=>{ if(confirm('Notīrīt visus samaksāts ķeksīšus? (parasti jauna mēneša sākumā)')){ state.bills.forEach(b=>b.paid=false); render(); scheduleSave(); }});
$('addCredit').addEventListener('click', ()=>{ state.credits.push({name:'',amount:0}); render(); scheduleSave(); const n=document.querySelectorAll('#creditsList .cname'); n[n.length-1]?.focus(); });
$('exportBtn').addEventListener('click', ()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='finanses-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
});
$('exportCsvBtn')?.addEventListener('click', ()=>{
  const rows = [['Tips','Nosaukums','Summa','Kategorija','Samaksāts']];
  state.bills.forEach(b=>rows.push(['Rēķins', b.name||'', billAmount(b).toFixed(2), catName(b.cat||'cits'), b.paid?'Jā':'Nē']));
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
$('resetBtn').addEventListener('click', ()=>{ if(confirm('Atjaunot sākotnējos datus? Tas pārrakstīs arī mākonī.')){ state=structuredClone(DEFAULT); render(); pushNow(); }});

$('signOutBtn').addEventListener('click', ()=>{
  if(confirm('Izrakstīties? Nākamreiz atkal būs jāpiesakās ar Google.')){
    signOut(auth).catch(e=>alert('Neizdevās izrakstīties: '+e.message));
  }
});

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

// ---- Section navigation ----
const SECTIONS = ['budget','credits','reminders','savings'];
function showSection(name){
  if(!SECTIONS.includes(name)) return;
  document.querySelectorAll('.panel').forEach(p=>{
    p.classList.toggle('hidden', p.id !== 'panel-' + name);
  });
  document.querySelectorAll('.nav-item').forEach(b=>{
    b.classList.toggle('active', b.dataset.section === name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('sectionNav').addEventListener('click', e=>{
  const btn = e.target.closest('.nav-item');
  if(btn) showSection(btn.dataset.section);
});

// ---- PWA: install prompt + service worker ----
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredInstall = e;
  $('installBtn')?.classList.remove('hidden');
});
$('installBtn')?.addEventListener('click', async ()=>{
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
  const root = $('modalRoot');
  const dark = currentTheme()==='dark';
  root.innerHTML = `
    <div class="modal-back" id="setBack">
      <div class="modal" style="max-width:460px;">
        <button class="modal-close" id="setClose">×</button>
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
});

// ---- Boot ----
// onAuthStateChanged (above) handles showing the app once the user is signed in.
// Nothing else needed here — the sign-in gate is visible by default.
