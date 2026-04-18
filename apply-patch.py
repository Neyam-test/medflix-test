#!/usr/bin/env python3
"""
Apply key improvements from diff-clean.patch onto tmp.html (c4a5af4 commit).
This script applies each important hunk manually using string replacement.
"""

import re

# Read source file
with open('tmp.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file: {len(content)} bytes")

# ═══════════════════════════════════════════════════════════════
# FIX 1: Admin login screen - fix display:flex -> display:none to avoid blocking clicks
# ═══════════════════════════════════════════════════════════════
old = 'id="admin-login-screen" style="position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center;">'
new = 'id="admin-login-screen" style="position:fixed;inset:0;z-index:9999;background:var(--bg);display:none;align-items:center;justify-content:center;pointer-events:none;">'
if old in content:
    content = content.replace(old, new, 1)
    print("✅ FIX 1: Login screen display fixed")
else:
    print("⚠️  FIX 1: Login screen pattern not found - might already be applied")

# ═══════════════════════════════════════════════════════════════
# FIX 2: activateUser now opens payment validation modal
# ═══════════════════════════════════════════════════════════════
old_activate = '''async function activateUser(email, targetSemestre, aboId) {
  var user = await dbGetUser(email);
  if (!user) { toast('Utilisateur introuvable', 'err'); return; }

  var cfg = await dbGetConfig();
  var expDate = calcExpirationFrom(cfg.dureeJours);

  var sem = targetSemestre || user.semester;

  var paid = user.paid || [];
  if (!paid.includes(sem)) paid.push(sem);

  // Per-semester expiration
  var paidDetails = addSemesterToPaidDetails(user.paidDetails, sem, expDate);
  var latestExp = getLatestExpiration(paidDetails);

  await dbUpdateUser(email, {
    activated: true, resiliated: false,
    activatedDate: new Date().toLocaleDateString('fr-FR'),
    expiration: latestExp, paid: paid, paidDetails: paidDetails
  });

  var expFormatted = new Date(expDate).toLocaleDateString('fr-FR');
  sendEmail('etudiant', user.name, email,
    '✅ Ton accès Medflix est activé !',
    'Bonne nouvelle ' + user.name + ' !\\n\\nTon paiement a été vérifié et ton accès Medflix est maintenant actif.\\n\\nSemestre débloqué : ' + sem + '\\nAccès valable jusqu\\'au : ' + expFormatted + ' (' + cfg.dureeJours + ' jours)\\n\\nConnecte-toi dès maintenant sur medflix.ma !'
  );

  toast('✅ Semestre de ' + user.name + ' activé ! Expire le ' + expFormatted);
  renderActivation();
  refreshDashboard();
}'''

new_activate = '''async function activateUser(email, targetSemestre, aboId) {
    openPayValModal(email, targetSemestre, aboId);
}

async function _doActivateUser(email, targetSemestre, aboId, receiptUrl, methode) {
  var user = await dbGetUser(email);
  if (!user) { toast('Utilisateur introuvable', 'err'); return; }

  var cfg = await dbGetConfig();
  var expDate = calcExpirationFrom(cfg.dureeJours);
  var sem = targetSemestre || user.semester;

  var paid = user.paid || [];
  if (!paid.includes(sem)) paid.push(sem);

  var paidDetails = addSemesterToPaidDetails(user.paidDetails, sem, expDate);
  var latestExp = getLatestExpiration(paidDetails);

  var adminName = (SESS && SESS.name) ? SESS.name : 'Admin';

  await dbUpdateUser(email, {
    activated: true, resiliated: false,
    activatedDate: new Date().toLocaleDateString('fr-FR'),
    expiration: latestExp, paid: paid, paidDetails: paidDetails
  });

  if (aboId) {
    await dbUpdateAbonnement(aboId, { statut: 'Actif', expiration: expDate, methode: methode, recu: receiptUrl, admin: adminName });
  } else {
    await dbAddAbonnement({ nom:user.name, email:email, semestre:sem, montant:199, methode:methode, statut:'Actif', expiration:expDate, recu: receiptUrl, admin: adminName });
  }

  var expFormatted = new Date(expDate).toLocaleDateString('fr-FR');
  sendEmail('etudiant', user.name, email,
    '✅ Ton accès Medflix est activé !',
    'Bonne nouvelle ' + user.name + ' !\\n\\nTon paiement a été vérifié et ton accès Medflix est maintenant actif.\\n\\nSemestre débloqué : ' + sem + '\\nAccès valable jusqu\\'au : ' + expFormatted + ' (' + cfg.dureeJours + ' jours)\\n\\nConnecte-toi dès maintenant sur medflix.ma !'
  );

  toast('✅ Semestre de ' + user.name + ' activé ! Expire le ' + expFormatted);
  renderActivation();
  refreshDashboard();
}'''

if old_activate in content:
    content = content.replace(old_activate, new_activate, 1)
    print("✅ FIX 2: activateUser now uses modal")
else:
    print("⚠️  FIX 2: activateUser pattern not found exactly - checking partial...")
    if 'async function activateUser' in content:
        print("   activateUser function found but different content")

# ═══════════════════════════════════════════════════════════════
# FIX 3: Add ni-renouvellements button in sidebar
# ═══════════════════════════════════════════════════════════════
old_sidebar = '''    <div class="ns">Facturation</div>
    <button class="ni" id="ni-abonnements" onclick="nav('abonnements')">💳 Abonnements</button>'''
new_sidebar = '''    <div class="ns">Facturation</div>
    <button class="ni" id="ni-abonnements" onclick="nav('abonnements')">💳 Abonnements</button>
    <button class="ni" id="ni-renouvellements" onclick="nav('renouvellements')">🔄 Renouvellements</button>'''
if old_sidebar in content:
    content = content.replace(old_sidebar, new_sidebar, 1)
    print("✅ FIX 3: Renouvellements button added to sidebar")
else:
    print("⚠️  FIX 3: Sidebar pattern not found")

# ═══════════════════════════════════════════════════════════════
# FIX 4: Remove early return in renderActivation so history loads
# ═══════════════════════════════════════════════════════════════
old_render = '''  if (!pending.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="6">✅ Aucun compte en attente — tout est à jour !</td></tr>'; return; }
  tbody.innerHTML = pending.map(function(u){'''
new_render = '''  if (!pending.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="6">✅ Aucun compte en attente — tout est à jour !</td></tr>'; }
  else tbody.innerHTML = pending.map(function(u){'''
if old_render in content:
    content = content.replace(old_render, new_render, 1)
    print("✅ FIX 4: renderActivation early return removed (activation history now loads)")
else:
    print("⚠️  FIX 4: renderActivation early return pattern not found")

# ═══════════════════════════════════════════════════════════════
# FIX 5: Add _smAllAbosCache and expand abonnements filtering (more robust modal)
# ═══════════════════════════════════════════════════════════════
old_cache = '''var _smActiveAbosCache = [];
var _smPendingAbosCache = [];

async function openStudentModal(email) {'''
new_cache = '''var _smActiveAbosCache = [];
var _smPendingAbosCache = [];
var _smAllAbosCache = [];

async function openStudentModal(email) {'''
if old_cache in content:
    content = content.replace(old_cache, new_cache, 1)
    print("✅ FIX 5: _smAllAbosCache added")
else:
    print("⚠️  FIX 5: cache vars pattern not found")

old_filter = '''  _smPendingAbosCache = abos.filter(function(a){ return a.email === email && a.statut === 'En attente'; });
  _smActiveAbosCache = abos.filter(function(a){ return a.email === email && a.statut === 'Actif'; });'''
new_filter = '''  _smAllAbosCache = abos.filter(function(a){ return a.email === email; });
  _smPendingAbosCache = _smAllAbosCache.filter(function(a){ return a.statut === 'En attente'; });
  _smActiveAbosCache = _smAllAbosCache.filter(function(a){ return a.statut === 'Actif'; });'''
if old_filter in content:
    content = content.replace(old_filter, new_filter, 1)
    print("✅ FIX 5b: Abonnements filter now uses _smAllAbosCache")
else:
    print("⚠️  FIX 5b: filter pattern not found")

# ═══════════════════════════════════════════════════════════════
# FIX 6: Colspan fix in tbody append (5 -> 6 for new admin column)
# ═══════════════════════════════════════════════════════════════
old_span = "tbody.innerHTML += '<tr><td colspan=\"5\" style=\"text-align:center;padding:1.5rem;\"><button class=\"btn-grn\" onclick=\"smActivatePending"
new_span = "tbody.innerHTML += '<tr><td colspan=\"6\" style=\"text-align:center;padding:1.5rem;\"><button class=\"btn-grn\" onclick=\"smActivatePending"
if old_span in content:
    content = content.replace(old_span, new_span, 1)
    print("✅ FIX 6: colspan updated from 5 to 6")
else:
    print("⚠️  FIX 6: colspan pattern not found")

# ═══════════════════════════════════════════════════════════════
# FIX 7: openDateModal - fallback for missing id (find by sem too)
# ═══════════════════════════════════════════════════════════════
old_find = "  var sub = user.paidDetails.find(function(p){ return p.id === subId; });"
new_find = "  var sub = user.paidDetails.find(function(p){ return p.id === subId || (!p.id && p.sem === subId); });"
if old_find in content:
    content = content.replace(old_find, new_find, 1)
    print("✅ FIX 7: openDateModal - fallback sem find added")
else:
    print("⚠️  FIX 7: openDateModal find pattern not found")

# ═══════════════════════════════════════════════════════════════
# FIX 8: saveDateModal - fallback for missing id (find by sem too)
# ═══════════════════════════════════════════════════════════════
old_loop = "    if(pd[i].id === _dmSubId) {"
new_loop = "    if(pd[i].id === _dmSubId || (!pd[i].id && pd[i].sem === _dmSubId)) {"
if old_loop in content:
    content = content.replace(old_loop, new_loop, 1)
    print("✅ FIX 8: saveDateModal - fallback sem find added")
else:
    print("⚠️  FIX 8: saveDateModal loop pattern not found")

print(f"\nFinal file: {len(content)} bytes")

# Write result
with open('medflix-admin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Written to medflix-admin.html")
