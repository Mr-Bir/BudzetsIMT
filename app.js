import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, getDocs, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const fmt = n => '€ ' + (Number(n)||0).toLocaleString('lv-LV',{minimumFractionDigits:2,maximumFractionDigits:2});
const cats = { komunalie:'Komunālie', kredits:'Kredīts', transports:'Transports', abonementi:'Abonementi', cits:'Cits' };
const catColors = { komunalie:'#4a7c59', kredits:'#8d6e8f', transports:'#c8923a', abonementi:'#5b7a99', cits:'#8a8576' };

const DEFAULT = {
  income: 1150.50,
  bills: [
    {name:'Komunālie', amount:230, cat:'komunalie'},
    {name:'Paika', amount:356.63, cat:'cits'},
    {name:'In Credit - Zāles pļāvējam', amount:106.02, cat:'kredits'},
    {name:'LMT telefona rēķins + tv', amount:69.85, cat:'abonementi'},
    {name:'In Credit - patēriņa kredīts', amount:68.93, cat:'kredits'},
    {name:'Saimniecības lietas + garāža', amount:113.08, cat:'cits'},
    {name:'Garāžas īre', amount:60, cat:'cits'},
    {name:'Swedbank patēriņa kredīts v2', amount:45, cat:'kredits'},
    {name:'Noras un Kurta dāvana', amount:32, cat:'cits'},
    {name:'Mopēds Yinxiang', amount:30.70, cat:'transports'},
    {name:'Degviela', amount:30.23, cat:'transports'},
    {name:'In Credit - TV', amount:29.08, cat:'kredits'},
    {name:'Tet', amount:26.76, cat:'abonementi'},
    {name:'Alibaba Yinxiangam', amount:25.52, cat:'cits'},
    {name:'Mēneša stāvieta C zonā', amount:25, cat:'transports'},
    {name:'Claude AI Pro', amount:21.78, cat:'abonementi'},
    {name:'Swedbank patēriņa kredīts', amount:21.15, cat:'kredits'},
    {name:'Zemes nodoklis', amount:18.79, cat:'cits'},
    {name:'Moika', amount:17.50, cat:'transports'},
    {name:'Aptieka - Nagam', amount:16.49, cat:'cits'},
    {name:'Baibas internets', amount:14.55, cat:'abonementi'},
    {name:'In Credit - Pc Elitebook', amount:13.81, cat:'kredits'},
    {name:'Dropbox', amount:11.99, cat:'abonementi'},
    {name:'Geka', amount:8.65, cat:'cits'},
    {name:'Bolts', amount:7.33, cat:'transports'},
    {name:'Latvenergo', amount:3, cat:'komunalie'},
  ],
  credits: [
    {name:'In Credit - patēriņa kredīts', amount:1677.85},
    {name:'In Credit - Pc Elitebook (Palics)', amount:372.85},
    {name:'In Credit - TV (Palics)', amount:203.60},
  ]
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
      const incoming = { income: d.income ?? DEFAULT.income, bills: d.bills ?? [], credits: d.credits ?? [] };
      const incomingJSON = JSON.stringify(incoming);
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
    lastSentJSON = JSON.stringify({ income: state.income, bills: state.bills, credits: state.credits });
    await setDoc(docRef, { income: state.income, bills: state.bills, credits: state.credits, updated: Date.now() });
    setSync('ok','Sinhronizēts');
  } catch(e){
    setSync('err','Saglabāšana neizdevās');
  }
}

// ---- Rendering ----
function catOptions(sel){ return Object.entries(cats).map(([k,v])=>`<option value="${k}"${k===sel?' selected':''}>${v}</option>`).join(''); }
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
      <div class="drag-handle" data-drag="${i}" title="Vilkt, lai pārkārtotu" aria-label="Pārvietot">
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
    const row = document.createElement('div'); row.className='credit';
    row.innerHTML = `
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
  Object.keys(cats).forEach(k=>sums[k]=0);
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
      seg.setAttribute('fill','none'); seg.setAttribute('stroke',catColors[k]);
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
      <span class="cat-swatch" style="background:${catColors[k]}"></span>
      <span class="cat-name">${cats[k]}</span>
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

  const catOpts = sel => Object.entries(cats).map(([k,v])=>`<option value="${k}"${k===sel?' selected':''}>${v}</option>`).join('');

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
        <div class="ehandle" data-edrag="${i}" title="Vilkt"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></div>
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
    if(e.target.dataset.ef==='cat'){ const i=e.target.dataset.ei; draft.bills[i].cat=e.target.value; e.target.closest('.ebill').dataset.cat=e.target.value; markDirty(); }
  });
  $('mBills').addEventListener('click', e=>{
    const del=e.target.closest('[data-edel]'); const chk=e.target.closest('[data-echk]');
    if(del){ draft.bills.splice(+del.dataset.edel,1); renderAll(); markDirty(); return; }
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
    if(del){ draft.credits.splice(+del.dataset.cdel,1); renderCredits(); markDirty(); }
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
  if(e.target.dataset.f==='cat'){ const i=e.target.dataset.i; state.bills[i].cat=e.target.value; e.target.closest('.bill').dataset.cat=e.target.value; scheduleSave(); }
});
$('billsList').addEventListener('click', e=>{
  const delBtn = e.target.closest('[data-del]');
  const payBtn = e.target.closest('[data-pay]');
  if(delBtn){ state.bills.splice(+delBtn.dataset.del,1); render(); scheduleSave(); return; }
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
$('creditsList').addEventListener('click', e=>{ if(e.target.dataset.cdel!==undefined){ state.credits.splice(+e.target.dataset.cdel,1); render(); scheduleSave(); }});
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
  state.bills.forEach(b=>rows.push(['Rēķins', b.name||'', (Number(b.amount)||0).toFixed(2), cats[b.cat]||b.cat||'', b.paid?'Jā':'Nē']));
  state.credits.forEach(c=>rows.push(['Kredīts', c.name||'', (Number(c.amount)||0).toFixed(2), '', '']));
  const esc = v => /[";\n]/.test(v) ? '"'+String(v).replace(/"/g,'""')+'"' : v;
  const csv = '\uFEFF' + rows.map(r=>r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'finanses-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
});
$('resetBtn').addEventListener('click', ()=>{ if(confirm('Atjaunot sākotnējos datus? Tas pārrakstīs arī mākonī.')){ state=structuredClone(DEFAULT); render(); pushNow(); }});
$('disconnectBtn').addEventListener('click', ()=>{ if(confirm('Atvienot šo ierīci? Dati paliks mākonī, bet būs atkal jāievada config un telpas ID.')){ localStorage.removeItem('fb_settings'); location.reload(); }});

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
