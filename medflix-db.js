// ═══════════════════════════════════════════════════════
//  MEDFLIX — Supabase Database Layer
//  Loaded by all HTML pages before their own <script>
// ═══════════════════════════════════════════════════════

var SB_URL = 'https://hbnqxpwrlpcpicuhekkl.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibnF4cHdybHBjcGljdWhla2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjkxMjcsImV4cCI6MjA5MDMwNTEyN30.EYl-RUUB23nDyM5xVB2L3tyEDDAAyiWC-TQA3saPjDE';
var sb = supabase.createClient(SB_URL, SB_KEY);

// ══════════════════════════════════
//  PROFILES (étudiants)
// ══════════════════════════════════
async function dbGetUsers() {
  var { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { console.error('dbGetUsers:', error); return []; }
  return (data || []).map(dbMapUser);
}

// ══════════════════════════════════
//  EDGE FUNCTIONS (SMS TWILIO)
// ══════════════════════════════════
async function dbSendSms(phone, code) {
  console.log('[SMS] Appel Edge Function send-sms avec:', phone, code);
  try {
    var res = await sb.functions.invoke('send-sms', {
      body: { to: phone, code: code }
    });
    console.log('[SMS] Réponse complète:', JSON.stringify(res));
    
    if (res.error) {
      console.error('[SMS] Erreur Supabase:', res.error.message || res.error);
      // Si l'erreur contient un contexte (body de la réponse)
      if (res.error.context) {
        try {
          var body = await res.error.context.json();
          console.error('[SMS] Détails erreur:', JSON.stringify(body));
        } catch(e) {}
      }
      return false;
    }
    if (res.data && res.data.error) {
      console.error('[SMS] Erreur Twilio:', res.data.error, res.data.details || '');
      return false;
    }
    console.log('[SMS] SMS envoyé avec succès !');
    return true;
  } catch(e) {
    console.error('[SMS] Exception:', e);
    return false;
  }
}

async function dbGetUser(email) {
  var { data, error } = await sb.from('profiles').select('*').eq('email', email).single();
  if (error) return null;
  return dbMapUser(data);
}

async function dbFindUser(email, pass) {
  var { data, error } = await sb.from('profiles').select('*').eq('email', email).eq('pass', pass).single();
  if (error) return null;
  return dbMapUser(data);
}

async function dbCreateUser(u) {
  var payload = {
    email: u.email, name: u.name, pass: u.pass, phone: u.phone || null,
    faculte: u.faculte || 'FMPC', semester: u.semester,
    paid: u.paid || [], activated: u.activated || false,
    resiliated: u.resiliated || false, expiration: u.expiration || null,
    activated_date: u.activatedDate || null,
    paid_details: u.paidDetails || []
  };
  var { data, error } = await sb.from('profiles').insert(payload).select().single();
  
  // Advanced Auto-healing for any missing columns
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : (error.message.includes('paid_details') ? 'paid_details' : null);
    if (col) {
      delete payload[col];
      var retry = await sb.from('profiles').insert(payload).select().single();
      error = retry.error;
      data = retry.data;
    } else {
      break;
    }
  }
  
  if (error) { 
    alert('Erreur Supabase : ' + error.message + ' (Code: ' + error.code + ')');
    console.error('dbCreateUser:', error); 
    return null; 
  }
  return dbMapUser(data);
}

async function dbUpdateUser(email, updates) {
  var mapped = {};
  if ('name' in updates) mapped.name = updates.name;
  if ('pass' in updates) mapped.pass = updates.pass;
  if ('phone' in updates) mapped.phone = updates.phone;
  if ('email' in updates) mapped.email = updates.email;
  if ('semester' in updates) mapped.semester = updates.semester;
  if ('faculte' in updates) mapped.faculte = updates.faculte;
  if ('paid' in updates) mapped.paid = updates.paid;
  if ('activated' in updates) mapped.activated = updates.activated;
  if ('resiliated' in updates) mapped.resiliated = updates.resiliated;
  if ('expiration' in updates) mapped.expiration = updates.expiration || null;
  if ('activatedDate' in updates) mapped.activated_date = updates.activatedDate;
  if ('paidDetails' in updates) mapped.paid_details = updates.paidDetails;
  if ('progress' in updates) mapped.progress = updates.progress;
  
  var { error } = await sb.from('profiles').update(mapped).eq('email', email);
  
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : (error.message.includes('paid_details') ? 'paid_details' : null);
    if (col) {
      delete mapped[col];
      var retry = await sb.from('profiles').update(mapped).eq('email', email);
      error = retry.error;
    } else {
      break;
    }
  }
  
  if (error) {
    console.error('dbUpdateUser:', error);
  }
}

async function dbDeleteUser(email) {
  var { error } = await sb.from('profiles').delete().eq('email', email);
  if (error) console.error('dbDeleteUser:', error);
}

function getNowLocalISO() {
  var d = new Date();
  var offset = d.getTimezoneOffset() * 60000;
  return (new Date(d - offset)).toISOString().slice(0, 16);
}

function getPaidDetailStatus(p) {
  if (p.status === 'resilie') return 'resilie';
  if (!p.exp) return 'actif';
  var now = new Date();
  var exp = new Date(p.exp);
  if (exp <= now) return 'expire';
  return 'actif';
}

// Map DB row → JS object
function dbMapUser(row) {
  if (!row) return null;
  
  var pd = row.paid_details || [];
  
  // Retro compatibility for legacy users OR users where `paid` has elements not in `paid_details`
  if ((row.activated || row.resiliated)) {
    var defaultStart = row.activated_date && row.activated_date.includes('-') ? row.activated_date : (row.created_at ? new Date(row.created_at).toISOString().slice(0, 16) : '2024-01-01T00:00');
    var defaultStatus = row.resiliated ? 'resilie' : 'actif';
    if (row.paid && row.paid.length > 0) {
      row.paid.forEach(function(sem) { 
        var found = false;
        for (var k=0; k<pd.length; k++) { if(pd[k].sem === sem) found = true; }
        if (!found) pd.push({ sem: sem, exp: row.expiration, start: defaultStart, status: defaultStatus }); 
      });
    } else if (pd.length === 0 && row.semester) {
      pd.push({ sem: row.semester, exp: row.expiration, start: defaultStart, status: defaultStatus });
    }
  }
  
  pd = pd.map(function(p, idx) {
    var computedStart = p.start || (row.activated_date && row.activated_date.includes('-') ? row.activated_date : (row.created_at ? new Date(row.created_at).toISOString().slice(0, 16) : '2024-01-01T00:00'));
    // Generate deterministic ID if it's not saved in DB yet to allow finding it from JS DOM
    var uniqueId = p.id || (p.sem + '-' + idx);
    return {
      id: uniqueId,
      sem: p.sem,
      exp: p.exp,
      start: computedStart,
      status: p.status || 'actif',
      by: p.by,
      dateResil: p.dateResil
    };
  });
  
  var validPaid = [];
  if (!row.resiliated && row.activated) {
    pd.forEach(function(p) {
      if (getPaidDetailStatus(p) === 'actif') {
         if (!validPaid.includes(p.sem)) validPaid.push(p.sem);
      }
    });
  }
  
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    pass: row.pass,
    phone: row.phone || null,
    faculte: row.faculte,
    semester: row.semester,
    paid: validPaid, // Strict auto-expiration enforcement
    rawPaid: row.paid || [],
    activated: row.activated || false,
    resiliated: row.resiliated || false,
    expiration: row.expiration || null,
    paidDetails: pd,
    activatedDate: row.activated_date || null,
    date: row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '',
    progress: row.progress || { cours: 0, tp: 0, quiz: 0, score: 0, latest: [] },
    comment_banned_until: row.comment_banned_until || null
  };
}

// ══════════════════════════════════
//  COURS
// ══════════════════════════════════
async function dbGetCours() {
  var { data, error } = await sb.from('courses').select('*').order('created_at', { ascending: false });
  if (error) { console.error('dbGetCours:', error); return []; }
  return (data || []).map(function(r) {
    return { id: r.id, titre: r.titre, semestre: r.semestre, module: r.module, sous_module: r.sous_module || '', annee: r.annee || '', lien: r.lien, desc: r.description, statut: r.statut, date: new Date(r.created_at).toLocaleDateString('fr-FR') };
  });
}

async function dbGetPublishedCours() {
  var { data, error } = await sb.from('courses').select('*').eq('statut', 'Publié').order('created_at', { ascending: false });
  if (error) { console.error('dbGetPublishedCours:', error); return []; }
  return (data || []).map(function(r) {
    return { id: r.id, titre: r.titre, semestre: r.semestre, module: r.module, sous_module: r.sous_module || '', annee: r.annee || '', lien: r.lien, desc: r.description, statut: r.statut };
  });
}

async function dbAddCours(c) {
  var payload = { titre: c.titre, semestre: c.semestre, module: c.module, sous_module: c.sous_module || '', annee: c.annee || '', lien: c.lien, description: c.desc, statut: c.statut };
  var { error } = await sb.from('courses').insert(payload);
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : null;
    if (col) { delete payload[col]; var r=await sb.from('courses').insert(payload); error=r.error; } else break;
  }
  if (error) console.error('dbAddCours:', error);
}

async function dbUpdateCours(id, updates) {
  var { error } = await sb.from('courses').update(updates).eq('id', id);
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : null;
    if (col) { delete updates[col]; var r=await sb.from('courses').update(updates).eq('id', id); error=r.error; } else break;
  }
  if (error) console.error('dbUpdateCours:', error);
}

async function dbDeleteCours(id) {
  var { error } = await sb.from('courses').delete().eq('id', id);
  if (error) console.error('dbDeleteCours:', error);
}

// ══════════════════════════════════
//  TP / EXAMENS
// ══════════════════════════════════
async function dbGetTP() {
  var { data, error } = await sb.from('tp_examens').select('*').order('created_at', { ascending: false });
  if (error) { console.error('dbGetTP:', error); return []; }
  return (data || []).map(function(r) {
    return { id: r.id, titre: r.titre, semestre: r.semestre, module: r.module, sous_module: r.sous_module || '', annee: r.annee || '', type: r.type, lien: r.lien, statut: r.statut, date: new Date(r.created_at).toLocaleDateString('fr-FR') };
  });
}

async function dbGetPublishedTP() {
  var { data, error } = await sb.from('tp_examens').select('*').eq('statut', 'Publié').order('created_at', { ascending: false });
  if (error) { console.error('dbGetPublishedTP:', error); return []; }
  return (data || []).map(function(r) {
    return { id: r.id, titre: r.titre, semestre: r.semestre, module: r.module, sous_module: r.sous_module || '', annee: r.annee || '', type: r.type, lien: r.lien, statut: r.statut };
  });
}

async function dbAddTP(t) {
  var payload = { titre: t.titre, semestre: t.semestre, module: t.module, sous_module: t.sous_module || '', annee: t.annee || '', type: t.type, lien: t.lien, statut: t.statut };
  var { error } = await sb.from('tp_examens').insert(payload);
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : null;
    if (col) { delete payload[col]; var r=await sb.from('tp_examens').insert(payload); error=r.error; } else break;
  }
  if (error) console.error('dbAddTP:', error);
}

async function dbUpdateTP(id, updates) {
  var { error } = await sb.from('tp_examens').update(updates).eq('id', id);
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : null;
    if (col) { delete updates[col]; var r=await sb.from('tp_examens').update(updates).eq('id', id); error=r.error; } else break;
  }
  if (error) console.error('dbUpdateTP:', error);
}

async function dbDeleteTP(id) {
  var { error } = await sb.from('tp_examens').delete().eq('id', id);
  if (error) console.error('dbDeleteTP:', error);
}

// ══════════════════════════════════
//  QCM
// ══════════════════════════════════
async function dbGetQCM() {
  var { data, error } = await sb.from('qcm').select('*').order('created_at', { ascending: false });
  if (error) { console.error('dbGetQCM:', error); return []; }
  return (data || []).map(function(r) {
    return { id: r.id, titre: r.titre, semestre: r.semestre, module: r.module, sous_module: r.sous_module || '', annee: r.annee, questions: r.questions || [], statut: r.statut, date: new Date(r.created_at).toLocaleDateString('fr-FR') };
  });
}

async function dbGetPublishedQCM() {
  var { data, error } = await sb.from('qcm').select('*').eq('statut', 'Publié').order('created_at', { ascending: false });
  if (error) { console.error('dbGetPublishedQCM:', error); return []; }
  return (data || []).map(function(r) {
    return { id: r.id, titre: r.titre, semestre: r.semestre, module: r.module, sous_module: r.sous_module || '', annee: r.annee, questions: r.questions || [], statut: r.statut };
  });
}

async function dbAddQCM(q) {
  var payload = { titre: q.titre, semestre: q.semestre, module: q.module, sous_module: q.sous_module || '', annee: q.annee, questions: q.questions, statut: q.statut };
  var { error } = await sb.from('qcm').insert(payload);
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : null;
    if (col) { delete payload[col]; var r=await sb.from('qcm').insert(payload); error=r.error; } else break;
  }
  if (error) console.error('dbAddQCM:', error);
}

async function dbUpdateQCM(id, updates) {
  var { error } = await sb.from('qcm').update(updates).eq('id', id);
  while (error && (error.code === '42703' || error.code === 'PGRST204')) {
    var match = error.message.match(/column "(.*?)"/) || error.message.match(/the '(.*?)' column/);
    var col = match ? match[1] : null;
    if (col) { delete updates[col]; var r=await sb.from('qcm').update(updates).eq('id', id); error=r.error; } else break;
  }
  if (error) console.error('dbUpdateQCM:', error);
}

async function dbDeleteQCM(id) {
  var { error } = await sb.from('qcm').delete().eq('id', id);
  if (error) console.error('dbDeleteQCM:', error);
}

// ══════════════════════════════════
//  ABONNEMENTS
// ══════════════════════════════════
async function dbGetAbonnements() {
  var { data, error } = await sb.from('abonnements').select('*').order('created_at', { ascending: false });
  if (error) { console.error('dbGetAbonnements:', error); return []; }
  return (data || []).map(function(r) {
    return { id: r.id, nom: r.nom, email: r.email, semestre: r.semestre, montant: r.montant, methode: r.methode, statut: r.statut, expiration: r.expiration, date: new Date(r.created_at).toLocaleDateString('fr-FR'), created_at: r.created_at };
  });
}

async function dbAddAbonnement(a) {
  var { error } = await sb.from('abonnements').insert({
    nom: a.nom, email: a.email, semestre: a.semestre, montant: a.montant || 199, methode: a.methode, statut: a.statut, expiration: a.expiration || null
  });
  if (error) console.error('dbAddAbonnement:', error);
}

async function dbUpdateAbonnement(id, updates) {
  var { error } = await sb.from('abonnements').update(updates).eq('id', id);
  if (error) console.error('dbUpdateAbonnement:', error);
}

async function dbSyncAbonnementsStatus(email, semestre, statut, exp) {
  var updates = { statut: statut };
  if (exp !== undefined) updates.expiration = exp;
  var { error } = await sb.from('abonnements').update(updates).eq('email', email).eq('semestre', semestre);
  if (error) console.error('dbSyncAbonnementsStatus:', error);
}

// ══════════════════════════════════
//  CONFIG
// ══════════════════════════════════
async function dbGetConfig() {
  var { data, error } = await sb.from('config').select('*').eq('key', 'duree_jours').limit(1);
  if (error || !data || data.length === 0) return { dureeJours: 180 };
  return { dureeJours: parseInt(data[0].value) || 180 };
}

async function dbSetConfig(dureeJours) {
  var { data } = await sb.from('config').select('id').eq('key', 'duree_jours');
  if (data && data.length > 0) {
    await sb.from('config').update({ value: JSON.stringify(dureeJours) }).eq('id', data[0].id);
    for (var i = 1; i < data.length; i++) await sb.from('config').delete().eq('id', data[i].id);
  } else {
    var { error } = await sb.from('config').insert({ key: 'duree_jours', value: JSON.stringify(dureeJours) });
    if (error) console.error('dbSetConfig:', error);
  }
}

async function dbGetBannedWords() {
  var { data, error } = await sb.from('config').select('*').eq('key', 'banned_words').limit(1);
  if (error || !data || data.length === 0) return [];
  try { return JSON.parse(data[0].value) || []; } catch(e) { return []; }
}

async function dbSetBannedWords(words) {
  var { data } = await sb.from('config').select('id').eq('key', 'banned_words');
  if (data && data.length > 0) {
    await sb.from('config').update({ value: JSON.stringify(words) }).eq('id', data[0].id);
    for (var i = 1; i < data.length; i++) await sb.from('config').delete().eq('id', data[i].id);
  } else {
    var { error } = await sb.from('config').insert({ key: 'banned_words', value: JSON.stringify(words) });
    if (error) console.error('dbSetBannedWords:', error);
  }
}

// ══════════════════════════════════
//  HELPERS
// ══════════════════════════════════
function calcExpirationFrom(dureeJours) {
  var d = new Date();
  d.setDate(d.getDate() + dureeJours);
  var offset = d.getTimezoneOffset() * 60000;
  return (new Date(d - offset)).toISOString().slice(0, 16);
}

function getTimeRemaining(expDate) {
  if (!expDate) return { text: 'Non défini', cls: 'ba', days: 0 };
  var now = new Date();
  var exp = new Date(expDate); 
  var diffMs = exp - now;
  var diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMs <= 0) return { text: 'Expiré', cls: 'br', days: diff };
  if (diff === 0) return { text: 'Expire aujourd\'hui', cls: 'br', days: 0 };
  if (diff <= 7) return { text: diff + 'j restants', cls: 'br', days: diff };
  if (diff <= 30) return { text: diff + 'j restants', cls: 'ba', days: diff };
  return { text: diff + 'j restants', cls: 'bg', days: diff };
}

// Add a semester subscription to paidDetails
function addSemesterToPaidDetails(paidDetails, semester, expiration, start) {
  if (!start) start = getNowLocalISO();
  var list = (paidDetails || []).slice();
  list.push({ id: Math.random().toString(36).substring(2, 9), sem: semester, start: start, exp: expiration, status: 'actif' });
  return list;
}

// Get global latest expiration from paidDetails (only active ones)
function getLatestExpiration(paidDetails) {
  if (!paidDetails || !paidDetails.length) return null;
  var latest = null;
  paidDetails.forEach(function(p) {
    if (p.status !== 'resilie' && p.exp && (!latest || p.exp > latest)) latest = p.exp;
  });
  return latest;
}

// ══════════════════════════════════
//  COMMENTS
// ══════════════════════════════════
async function dbGetComments(courseId) {
  var { data, error } = await sb.from('comments')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });
  if (error) { console.error('dbGetComments:', error); return []; }
  return data || [];
}

async function dbGetAllComments() {
  var { data, error } = await sb.from('comments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('dbGetAllComments:', error); return []; }
  return data || [];
}

async function dbAddComment(c) {
  var payload = {
    course_id:    c.course_id,
    course_title: c.course_title || '',
    author:       c.author,
    email:        c.email,
    content:      c.content,
    parent_id:    c.parent_id || null,
    upvotes:      0,
    downvotes:    0,
    upvoters:     [],
    downvoters:   []
  };
  var { data, error } = await sb.from('comments').insert(payload).select().single();
  if (error) { console.error('dbAddComment:', error); return null; }
  return data;
}

async function dbVoteComment(id, email, dir) {
  // dir: 'up' | 'down'
  var { data: row, error } = await sb.from('comments').select('upvoters,downvoters,upvotes,downvotes').eq('id', id).single();
  if (error || !row) return;

  var upvoters   = row.upvoters   || [];
  var downvoters = row.downvoters || [];
  var upvotes    = row.upvotes    || 0;
  var downvotes  = row.downvotes  || 0;

  if (dir === 'up') {
    if (upvoters.includes(email)) {
      // toggle off
      upvoters   = upvoters.filter(function(e){ return e !== email; });
      upvotes    = Math.max(0, upvotes - 1);
    } else {
      upvoters.push(email);
      upvotes++;
      // remove downvote if any
      if (downvoters.includes(email)) {
        downvoters = downvoters.filter(function(e){ return e !== email; });
        downvotes  = Math.max(0, downvotes - 1);
      }
    }
  } else {
    if (downvoters.includes(email)) {
      downvoters = downvoters.filter(function(e){ return e !== email; });
      downvotes  = Math.max(0, downvotes - 1);
    } else {
      downvoters.push(email);
      downvotes++;
      if (upvoters.includes(email)) {
        upvoters = upvoters.filter(function(e){ return e !== email; });
        upvotes  = Math.max(0, upvotes - 1);
      }
    }
  }

  await sb.from('comments').update({ upvotes: upvotes, downvotes: downvotes, upvoters: upvoters, downvoters: downvoters }).eq('id', id);
}

async function dbDeleteComment(id) {
  // delete replies too
  await sb.from('comments').delete().eq('parent_id', id);
  var { error } = await sb.from('comments').delete().eq('id', id);
  if (error) console.error('dbDeleteComment:', error);
}
