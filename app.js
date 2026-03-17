// CONFIG SUPABASE - à remplir après création du projet Supabase
const SUPABASE_URL = 'https://tfiwxtxhiblmqzdlpulf.supabase.co';
const SUPABASE_KEY = 'sb_publishable__Xdsf_yymPy8nJzDV-xScw_XJNPjiMR';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allReunions = [];
let allDossiers = [];

// ─── AUTH ───────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    document.getElementById('login-error').textContent = 'Email ou mot de passe incorrect.';
  } else {
    currentUser = data.user;
    showApp();
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('screen-login').style.display = 'flex';
});

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showApp();
  }
}

function showApp() {
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  loadDashboard();
}

// ─── NAVIGATION ─────────────────────────────────────────
const screenTitles = {
  dashboard: 'Tableau de bord',
  reunions: 'Réunions',
  'reunion-form': 'Nouvelle réunion',
  'reunion-detail': 'Détail réunion',
  dossiers: 'Dossiers collaborateurs',
  'dossier-form': 'Nouveau dossier',
  assistant: 'Assistant juridique',
  docs: 'Documents & Références'
};

let screenHistory = ['dashboard'];

function showScreen(name) {
  document.querySelectorAll('.screen-content').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.getElementById('page-title').textContent = screenTitles[name] || name;

  if (name !== screenHistory[screenHistory.length - 1]) screenHistory.push(name);

  const backBtn = document.getElementById('btn-back');
  backBtn.classList.toggle('hidden', screenHistory.length <= 1);

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navMap = { dashboard: 'nav-dashboard', reunions: 'nav-reunions', dossiers: 'nav-dossiers', assistant: 'nav-assistant', docs: 'nav-docs' };
  if (navMap[name]) document.getElementById(navMap[name]).classList.add('active');

  if (name === 'reunions') loadReunions();
  if (name === 'dossiers') loadDossiers();
}

document.getElementById('btn-back').addEventListener('click', () => {
  if (screenHistory.length > 1) {
    screenHistory.pop();
    const prev = screenHistory[screenHistory.length - 1];
    showScreen(prev);
    screenHistory.pop();
  }
});

// ─── DASHBOARD ──────────────────────────────────────────
async function loadDashboard() {
  const {  reunions } = await supabase.from('reunions').select('*').order('date', { ascending: true });
  const {  dossiers } = await supabase.from('dossiers').select('*').order('created_at', { ascending: false });

  allReunions = reunions || [];
  allDossiers = dossiers || [];

  const upcoming = allReunions.filter(r => r.statut === 'Planifiée').slice(0, 3);
  const upcomingEl = document.getElementById('upcoming-list');
  upcomingEl.innerHTML = upcoming.length
    ? upcoming.map(r => `<div class="reunion-item" onclick="showReunionDetail('${r.id}')">
        <div class="item-info">
          <div class="item-type">${r.type}</div>
          <div class="item-date">${formatDate(r.date)} ${r.heure || ''}</div>
        </div>
        <div class="item-badge">📅</div>
      </div>`).join('')
    : '<p class="empty-state">Aucune réunion planifiée</p>';

  const opened = allDossiers.filter(d => d.statut === 'Ouvert' || d.statut === 'En cours').slice(0, 3);
  const openEl = document.getElementById('open-dossiers-list');
  openEl.innerHTML = opened.length
    ? opened.map(d => `<div class="dossier-item" onclick="showDossierDetail('${d.id}')">
        <div class="item-info">
          <div class="item-type">${d.nature}</div>
          <div class="item-title">${d.agence || 'Agence non précisée'}</div>
          <div class="item-date">${formatDate(d.date_faits)}</div>
        </div>
        <div class="item-badge">${statutBadge(d.statut)}</div>
      </div>`).join('')
    : '<p class="empty-state">Aucun dossier en cours</p>';
}

// ─── RÉUNIONS ────────────────────────────────────────────
async function loadReunions(filter = 'all') {
  const { data } = await supabase.from('reunions').select('*').order('date', { ascending: false });
  allReunions = data || [];
  renderReunions(filter);
}

function renderReunions(filter = 'all') {
  const list = document.getElementById('reunions-list');
  let items = allReunions;
  if (filter !== 'all') items = allReunions.filter(r => r.type.includes(filter));
  list.innerHTML = items.length
    ? items.map(r => `<div class="reunion-item" onclick="showReunionDetail('${r.id}')">
        <div class="item-info">
          <div class="item-type">${r.type}</div>
          <div class="item-title">${r.odj ? r.odj.substring(0, 60) + '...' : 'Pas d\'ordre du jour'}</div>
          <div class="item-date">${formatDate(r.date)}</div>
        </div>
        <div class="item-badge">${statutBadge(r.statut)}</div>
      </div>`).join('')
    : '<p class="empty-state">Aucune réunion trouvée</p>';
}

function filterReunions(type, btn) {
  document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderReunions(type);
}

function showNewReunion() {
  document.getElementById('reunion-form').reset();
  document.getElementById('rf-id').value = '';
  document.getElementById('rf-date').value = new Date().toISOString().split('T')[0];
  showScreen('reunion-form');
  document.getElementById('page-title').textContent = 'Nouvelle réunion';
}

document.getElementById('reunion-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('rf-id').value;
  const payload = {
    type: document.getElementById('rf-type').value,
    date: document.getElementById('rf-date').value,
    heure: document.getElementById('rf-heure').value,
    odj: document.getElementById('rf-odj').value,
    declaration: document.getElementById('rf-declaration').value,
    notes: document.getElementById('rf-notes').value,
    engagements: document.getElementById('rf-engagements').value,
    alertes: document.getElementById('rf-alertes').value,
    statut: document.getElementById('rf-statut').value,
    user_id: currentUser.id
  };
  if (id) {
    await supabase.from('reunions').update(payload).eq('id', id);
  } else {
    await supabase.from('reunions').insert([payload]);
  }
  screenHistory = ['dashboard', 'reunions'];
  showScreen('reunions');
});

function showReunionDetail(id) {
  const r = allReunions.find(x => x.id === id);
  if (!r) return;
  const html = `
    <div class="detail-header">
      <div class="detail-type">${r.type}</div>
      <div class="detail-title">${formatDate(r.date)} ${r.heure || ''}</div>
      <div class="detail-date">${statutBadge(r.statut)} ${r.statut}</div>
    </div>
    ${r.odj ? `<div class="detail-section"><h4>📌 Ordre du jour</h4><p>${r.odj}</p></div>` : ''}
    ${r.declaration ? `<div class="detail-section"><h4>🎤 Déclaration préalable SNE-CGC</h4><p>${r.declaration}</p></div>` : ''}
    ${r.notes ? `<div class="detail-section"><h4>📝 Notes de séance</h4><p>${r.notes}</p></div>` : ''}
    ${r.engagements ? `<div class="detail-section"><h4>✅ Engagements direction</h4><p>${r.engagements}</p></div>` : ''}
    ${r.alertes ? `<div class="detail-section"><h4>⚠️ Points d'alerte</h4><p>${r.alertes}</p></div>` : ''}
    <div class="detail-actions">
      <button class="btn-secondary" onclick="editReunion('${r.id}')">✏️ Modifier</button>
      <button class="btn-danger" onclick="deleteReunion('${r.id}')">🗑️ Supprimer</button>
    </div>`;
  document.getElementById('reunion-detail-content').innerHTML = html;
  showScreen('reunion-detail');
}

function editReunion(id) {
  const r = allReunions.find(x => x.id === id);
  if (!r) return;
  document.getElementById('rf-id').value = r.id;
  document.getElementById('rf-type').value = r.type;
  document.getElementById('rf-date').value = r.date;
  document.getElementById('rf-heure').value = r.heure || '';
  document.getElementById('rf-odj').value = r.odj || '';
  document.getElementById('rf-declaration').value = r.declaration || '';
  document.getElementById('rf-notes').value = r.notes || '';
  document.getElementById('rf-engagements').value = r.engagements || '';
  document.getElementById('rf-alertes').value = r.alertes || '';
  document.getElementById('rf-statut').value = r.statut;
  showScreen('reunion-form');
  document.getElementById('page-title').textContent = 'Modifier réunion';
}

async function deleteReunion(id) {
  if (confirm('Supprimer cette réunion ?')) {
    await supabase.from('reunions').delete().eq('id', id);
    screenHistory = ['dashboard', 'reunions'];
    showScreen('reunions');
  }
}

// ─── DOSSIERS ────────────────────────────────────────────
async function loadDossiers(filter = 'all') {
  const { data } = await supabase.from('dossiers').select('*').order('created_at', { ascending: false });
  allDossiers = data || [];
  renderDossiers(filter);
}

function renderDossiers(filter = 'all') {
  const list = document.getElementById('dossiers-list');
  let items = allDossiers;
  if (filter !== 'all') items = allDossiers.filter(d => d.statut === filter);
  list.innerHTML = items.length
    ? items.map(d => `<div class="dossier-item" onclick="showDossierDetail('${d.id}')">
        <div class="item-info">
          <div class="item-type">${d.nature}</div>
          <div class="item-title">${d.agence || 'Agence non précisée'}</div>
          <div class="item-date">${formatDate(d.date_faits)}</div>
        </div>
        <div class="item-badge">${statutBadge(d.statut)}</div>
      </div>`).join('')
    : '<p class="empty-state">Aucun dossier trouvé</p>';
}

function filterDossiers(type, btn) {
  document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDossiers(type);
}

function showNewDossier() {
  document.getElementById('dossier-form').reset();
  document.getElementById('df-id').value = '';
  document.getElementById('df-date').value = new Date().toISOString().split('T')[0];
  showScreen('dossier-form');
  document.getElementById('page-title').textContent = 'Nouveau dossier';
}

document.getElementById('dossier-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('df-id').value;
  const payload = {
    agence: document.getElementById('df-agence').value,
    nature: document.getElementById('df-nature').value,
    faits: document.getElementById('df-faits').value,
    date_faits: document.getElementById('df-date').value,
    actions: document.getElementById('df-actions').value,
    statut: document.getElementById('df-statut').value,
    user_id: currentUser.id
  };
  if (id) {
    await supabase.from('dossiers').update(payload).eq('id', id);
  } else {
    await supabase.from('dossiers').insert([payload]);
  }
  screenHistory = ['dashboard', 'dossiers'];
  showScreen('dossiers');
});

function showDossierDetail(id) {
  const d = allDossiers.find(x => x.id === id);
  if (!d) return;
  const html = `
    <div class="detail-header" style="background: var(--danger)">
      <div class="detail-type">${d.nature}</div>
      <div class="detail-title">${d.agence || 'Agence non précisée'}</div>
      <div class="detail-date">${statutBadge(d.statut)} ${d.statut}</div>
    </div>
    ${d.faits ? `<div class="detail-section"><h4>📋 Description des faits</h4><p>${d.faits}</p></div>` : ''}
    ${d.date_faits ? `<div class="detail-section"><h4>📅 Date des premiers faits</h4><p>${formatDate(d.date_faits)}</p></div>` : ''}
    ${d.actions ? `<div class="detail-section"><h4>✅ Actions menées</h4><p>${d.actions}</p></div>` : ''}
    <div class="confidential-notice">🔒 Dossier strictement confidentiel.</div>
    <div class="detail-actions">
      <button class="btn-secondary" onclick="editDossier('${d.id}')">✏️ Modifier</button>
      <button class="btn-danger" onclick="deleteDossier('${d.id}')">🗑️ Supprimer</button>
    </div>`;
  document.getElementById('reunion-detail-content').innerHTML = html;
  showScreen('reunion-detail');
}

function editDossier(id) {
  const d = allDossiers.find(x => x.id === id);
  if (!d) return;
  document.getElementById('df-id').value = d.id;
  document.getElementById('df-agence').value = d.agence || '';
  document.getElementById('df-nature').value = d.nature;
  document.getElementById('df-faits').value = d.faits || '';
  document.getElementById('df-date').value = d.date_faits || '';
  document.getElementById('df-actions').value = d.actions || '';
  document.getElementById('df-statut').value = d.statut;
  showScreen('dossier-form');
  document.getElementById('page-title').textContent = 'Modifier dossier';
}

async function deleteDossier(id) {
  if (confirm('Supprimer ce dossier ?')) {
    await supabase.from('dossiers').delete().eq('id', id);
    screenHistory = ['dashboard', 'dossiers'];
    showScreen('dossiers');
  }
}

// ─── ASSISTANT IA ────────────────────────────────────────
const chatMessages = document.getElementById('chat-messages');

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;

  appendMsg('user', question);
  input.value = '';

  const typing = appendMsg('ai', '⏳ Analyse en cours...', true);

  try {
    const res = await fetch('/.netlify/functions/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    typing.remove();
    appendMsg('ai', data.answer || 'Aucune réponse reçue.');
  } catch {
    typing.remove();
    appendMsg('ai', '❌ Erreur de connexion. Vérifiez votre réseau et réessayez.');
  }
}

document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function appendMsg(role, text, typing = false) {
  const div = document.createElement('div');
  div.className = role === 'user' ? 'msg-user' : `msg-ai${typing ? ' msg-typing' : ''}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// ─── DOCUMENTS ───────────────────────────────────────────
function openDoc(type) {
  const urls = {
    'code-travail': 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006072050/',
    'bpce': 'https://www.legifrance.gouv.fr/search/acco?tab_selection=acco&searchField=ALL&query=caisse+epargne+rhone+alpes&page=1&init=true',
    'snecgc': 'https://www.snecgc-ceapc.fr',
    'cfecgc': 'https://www.cfecgc.fr/ressources/guides-pratiques/'
  };
  if (urls[type]) window.open(urls[type], '_blank');
}

// ─── UTILITAIRES ─────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statutBadge(statut) {
  const badges = {
    'Planifiée': '📅', 'En cours': '🔄', 'Terminée': '✅',
    'Ouvert': '🔴', 'Transmis avocat': '📤', 'Clôturé': '✅'
  };
  return badges[statut] || '•';
}

// ─── INIT ─────────────────────────────────────────────────
checkSession();
