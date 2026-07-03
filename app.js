import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, getDocs, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ---- Version & changelog ----
const VERSION = '1.4.0';
const CHANGELOG = [
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
    {name:'Transports', amount:250, cat:'transports'},
  ],
  credits: [
    {name:'In Credit', amount:550},
    {name:'Swedbank patēriņa kredīts', amount:2500},
    {name:'Privātpersonas A. Bērziņa aizdevums', amount:1585},
  ],
  categories: structuredClone(DEFAULT_CATEGORIES)
};

let state = structuredClone(DEFAULT);
let db, docRef, roomId, applyingRemote=false, saveTimer=null;
let lastSentJSON = null, pendingSnapshot = null;

// ---- Setup gate ----
const $ = id => document.getElementById(id);
$('genRoom').addEventListener('click', ()=>{
  $('roomId').value = 'budzets-' + Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b=>b.toString(36)).join('').slice(0,16);
});

function loadSettings(){
  try { return JSON.parse(localStorage.getItem('fb_settings')||'null'); } catch(e){ return null; }
}
$('connectBtn').addEventListener('click', ()=>{
  const raw = $('fbConfig').value.trim();
  const room = $('roomId').value.trim();
  $('gateErr').textContent='';
  let cfg;
  try { cfg = JSON.parse(raw); } catch(e){ $('gateErr').textContent='Firebase config nav derīgs JSON.'; return; }
  if(!cfg.projectId || !cfg.apiKey){ $('gateErr').textContent='Config trūkst apiKey vai projectId.'; return; }
  if(room.length < 8){ $('gateErr').textContent='Telpas ID jābūt vismaz 8 simboli (drošībai garāks).'; return; }
  localStorage.setItem('fb_settings', JSON.stringify({cfg, room}));
  connect(cfg, room);
});

function connect(cfg, room){
  try {
    const fbApp = initializeApp(cfg);
    db = getFirestore(fbApp);
    docRef = doc(db, 'budgets', room);
    roomId = room;
  } catch(e){
    $('gateErr').textContent = 'Neizdevās savienoties: ' + e.message;
    return;
  }
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  setSync('saving','Savienojas…');
  loadArchive();

  onSnapshot(docRef, snap=>{
    if(snap.exists()){
      const d = snap.data();
      const incoming = { income: d.income ?? DEFAULT.income, bills: d.bills ?? [], credits: d.credits ?? [], categories: (d.categories && d.categories.length) ? d.categories : structuredClone(DEFAULT_CATEGORIES) };
      const incomingJSON = JSON.stringify({ income: incoming.income, bills: incoming.bills, credits: incoming.credits, categories: incoming.categories });
      // Ignore the echo of our own write — nothing changed on our side
      if(incomingJSON === lastSentJSON){ setSync('ok','Sinhronizēts'); return; }
      // If the user is actively typing/editing a field, defer applying until they finish
      if(isEditingActive()){ pendingSnapshot = incoming; setSync('ok','Sinhronizēts'); return; }
      applyRemote(incoming);
    } else {
      pushNow();
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
    const pct = income>0 ? ((Number(b.amount)||0)/income*100) : 0;
    const row = document.createElement('div');
    row.className='bill' + (b.paid?' paid':''); row.dataset.cat=b.cat||'cits'; row.dataset.idx=i;
    row.innerHTML = `
      <div class="drag-handle" data-drag="${i}" title="Vilkt, lai pārkārtotu" aria-label="Pārvietot" style="border-left-color:${catColor(b.cat||'cits')}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
      </div>
      <button class="pay-check" data-pay="${i}" title="Atzīmēt kā samaksātu" aria-label="Samaksāts"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
      <input class="name" value="${escapeHtml(b.name)}" data-i="${i}" data-f="name" placeholder="Nosaukums">
      <div class="amount-wrap"><span class="eur">€</span><input class="amount" type="number" step="0.01" inputmode="decimal" value="${b.amount}" data-i="${i}" data-f="amount"></div>
      <div class="pct">${pct.toFixed(2)} %</div>
      <select data-i="${i}" data-f="cat">${catOptions(b.cat||'cits')}</select>
      <button class="del" data-del="${i}" title="Dzēst">×</button>`;
    list.appendChild(row);
  });
  const cl = $('creditsList'); cl.innerHTML='';
  (state.credits||[]).forEach((c,i)=>{
    const row = document.createElement('div'); row.className='credit'; row.dataset.idx=i;
    row.innerHTML = `
      <div class="cdrag" data-cdrag="${i}" title="Vilkt, lai pārkārtotu" aria-label="Pārvietot"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
      <input class="cname" value="${escapeHtml(c.name)}" data-ci="${i}" data-f="name" placeholder="Kredīta nosaukums">
      <div class="camount-wrap"><span class="eur">€</span><input class="camount" type="number" step="0.01" inputmode="decimal" value="${c.amount}" data-ci="${i}" data-f="amount"></div>
      <button class="del" data-cdel="${i}" title="Dzēst">×</button>`;
    cl.appendChild(row);
  });
  updateTotals();
}

function updateTotals(){
  const income = Number(state.income)||0;
  const bills = state.bills||[];
  const total = bills.reduce((s,b)=>s+(Number(b.amount)||0),0);
  const ctotal = (state.credits||[]).reduce((s,c)=>s+(Number(c.amount)||0),0);
  const paidSum = bills.filter(b=>b.paid).reduce((s,b)=>s+(Number(b.amount)||0),0);
  const toPay = total - paidSum;
  const paidCount = bills.filter(b=>b.paid).length;
  $('sumTotal').textContent = fmt(total);
  $('sumPct').textContent = (income>0?(total/income*100).toFixed(1):'0')+' % no ieņēmumiem';
  $('billsFootTotal').textContent = fmt(total);
  $('creditsFootTotal').textContent = fmt(ctotal);
  $('toPay').textContent = fmt(toPay);
  $('paidHint').textContent = `${paidCount} no ${bills.length} samaksāti · ${fmt(paidSum)}`;
  const remaining = income-total;
  const rem = $('remaining');
  rem.textContent = fmt(remaining); rem.className='value '+(remaining>=0?'pos':'neg');
  $('remHint').textContent = remaining>=0?'pāri pēc rēķiniem':'iztrūkums';
  document.querySelectorAll('#billsList .bill').forEach((row,i)=>{
    const pct = income>0?((Number(state.bills[i].amount)||0)/income*100):0;
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
  (state.bills||[]).forEach(b=>{ const c=b.cat||'cits'; sums[c]=(sums[c]||0)+(Number(b.amount)||0); });
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
    const total = (a.bills||[]).reduce((s,b)=>s+(Number(b.amount)||0),0);
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
    const total = draft.bills.reduce((s,b)=>s+(Number(b.amount)||0),0);
    const remaining = income - total;
    $('mMini').innerHTML = `
      <div class="ms"><div class="l">Alga</div><div class="v">${fmt(income)}</div></div>
      <div class="ms"><div class="l">Rēķini</div><div class="v">${fmt(total)}</div></div>
      <div class="ms"><div class="l">Paliek</div><div class="v" style="color:${remaining>=0?'var(--green)':'var(--red)'}">${fmt(remaining)}</div></div>`;
    const paidCount = draft.bills.filter(b=>b.paid).length;
    const paidSum = draft.bills.filter(b=>b.paid).reduce((s,b)=>s+(Number(b.amount)||0),0);
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
        <div class="eamt-wrap"><span class="e-eur">€</span><input class="eamt" type="number" step="0.01" inputmode="decimal" value="${b.amount}" data-ei="${i}" data-ef="amount"></div>
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
      bills: draft.bills.map(b=>({ name:b.name||'', amount:Number(b.amount)||0, cat:b.cat||'cits', paid:!!b.paid })),
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
  if(e.target.dataset.f==='cat'){ const i=e.target.dataset.i; state.bills[i].cat=e.target.value; const rowEl=e.target.closest('.bill'); rowEl.dataset.cat=e.target.value; const h=rowEl.querySelector('.drag-handle'); if(h) h.style.borderLeftColor=catColor(e.target.value); renderCategories(state.bills.reduce((s,b)=>s+(Number(b.amount)||0),0)); scheduleSave(); }
});
$('billsList').addEventListener('click', e=>{
  const delBtn = e.target.closest('[data-del]');
  const payBtn = e.target.closest('[data-pay]');
  if(delBtn){ const i=+delBtn.dataset.del; const nm=(state.bills[i].name||'').trim(); if(confirm(nm?`Dzēst rēķinu "${nm}"?`:'Dzēst šo rēķinu?')){ state.bills.splice(i,1); render(); scheduleSave(); } return; }
  if(payBtn){ const i=+payBtn.dataset.pay; state.bills[i].paid = !state.bills[i].paid; render(); updateTotals(); scheduleSave(); }
});

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
  const i=e.target.dataset.ci, f=e.target.dataset.f; if(i===undefined) return;
  if(f==='amount') state.credits[i][f]=parseFloat(e.target.value)||0; else state.credits[i][f]=e.target.value;
  if(f==='amount') updateTotals(); scheduleSave();
});
$('creditsList').addEventListener('click', e=>{ const del=e.target.closest('[data-cdel]'); if(del){ const i=+del.dataset.cdel; const nm=(state.credits[i].name||'').trim(); if(confirm(nm?`Dzēst kredīta atlikumu "${nm}"?`:'Dzēst šo kredīta atlikumu?')){ state.credits.splice(i,1); render(); scheduleSave(); } }});

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

$('addBill').addEventListener('click', ()=>{ state.bills.push({name:'',amount:0,cat:'cits'}); render(); scheduleSave(); const n=document.querySelectorAll('#billsList .name'); n[n.length-1]?.focus(); });
$('resetPaidBtn').addEventListener('click', ()=>{ if(confirm('Notīrīt visus samaksāts ķeksīšus? (parasti jauna mēneša sākumā)')){ state.bills.forEach(b=>b.paid=false); render(); scheduleSave(); }});
$('addCredit').addEventListener('click', ()=>{ state.credits.push({name:'',amount:0}); render(); scheduleSave(); const n=document.querySelectorAll('#creditsList .cname'); n[n.length-1]?.focus(); });
$('exportBtn').addEventListener('click', ()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='finanses-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
});
$('exportCsvBtn')?.addEventListener('click', ()=>{
  const rows = [['Tips','Nosaukums','Summa','Kategorija','Samaksāts']];
  state.bills.forEach(b=>rows.push(['Rēķins', b.name||'', (Number(b.amount)||0).toFixed(2), catName(b.cat||'cits'), b.paid?'Jā':'Nē']));
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
$('disconnectBtn').addEventListener('click', ()=>{ if(confirm('Atvienot šo ierīci? Dati paliks mākonī, bet būs atkal jāievada config un telpas ID.')){ localStorage.removeItem('fb_settings'); location.reload(); }});

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

// ---- Version display & changelog ----
document.title = 'Finanšu pārvaldnieks v' + VERSION;
$('versionText').textContent = 'v' + VERSION;
$('changelogBtn').addEventListener('click', ()=>{
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
});

// ---- Boot ----
const saved = loadSettings();
if(saved && saved.cfg && saved.room){ connect(saved.cfg, saved.room); }

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
