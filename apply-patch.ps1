# Script PowerShell pour appliquer les corrections importantes sur tmp.html -> medflix-admin.html

$src = [System.IO.File]::ReadAllText('c:\Users\EDG3\Downloads\medflix-v4\tmp.html', [System.Text.Encoding]::UTF8)
Write-Host "Source: $($src.Length) bytes"

# FIX 1: Admin login screen - ne pas bloquer les clics quand masque
$src = $src.Replace(
    'id="admin-login-screen" style="position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center;">',
    'id="admin-login-screen" style="position:fixed;inset:0;z-index:9999;background:var(--bg);display:none;align-items:center;justify-content:center;pointer-events:none;">'
)
Write-Host "FIX 1: login screen done"

# FIX 2: Ajouter bouton Renouvellements dans la sidebar
$src = $src.Replace(
    "    <div class=`"ns`">Facturation</div>`n    <button class=`"ni`" id=`"ni-abonnements`" onclick=`"nav('abonnements')`">💳 Abonnements</button>",
    "    <div class=`"ns`">Facturation</div>`n    <button class=`"ni`" id=`"ni-abonnements`" onclick=`"nav('abonnements')`">💳 Abonnements</button>`n    <button class=`"ni`" id=`"ni-renouvellements`" onclick=`"nav('renouvellements')`">🔄 Renouvellements</button>"
)
Write-Host "FIX 2: renouvellements button done"

# FIX 3: renderActivation - supprimer le 'return' prématuré qui bloquait l'historique
$src = $src.Replace(
    "  if (!pending.length) { tbody.innerHTML = '<tr class=`"empty-row`"><td colspan=`"6`">✅ Aucun compte en attente — tout est à jour !</td></tr>'; return; }`n  tbody.innerHTML = pending.map(function(u){",
    "  if (!pending.length) { tbody.innerHTML = '<tr class=`"empty-row`"><td colspan=`"6`">✅ Aucun compte en attente — tout est à jour !</td></tr>'; }`n  else tbody.innerHTML = pending.map(function(u){"
)
Write-Host "FIX 3: renderActivation early return done"

# FIX 4: _smAllAbosCache variable manquante
$src = $src.Replace(
    "var _smActiveAbosCache = [];`nvar _smPendingAbosCache = [];`n`nasync function openStudentModal",
    "var _smActiveAbosCache = [];`nvar _smPendingAbosCache = [];`nvar _smAllAbosCache = [];`n`nasync function openStudentModal"
)
Write-Host "FIX 4: _smAllAbosCache done"

# FIX 5: Filtres abonnements plus robustes
$src = $src.Replace(
    "  _smPendingAbosCache = abos.filter(function(a){ return a.email === email && a.statut === 'En attente'; });`n  _smActiveAbosCache = abos.filter(function(a){ return a.email === email && a.statut === 'Actif'; });",
    "  _smAllAbosCache = abos.filter(function(a){ return a.email === email; });`n  _smPendingAbosCache = _smAllAbosCache.filter(function(a){ return a.statut === 'En attente'; });`n  _smActiveAbosCache = _smAllAbosCache.filter(function(a){ return a.statut === 'Actif'; });"
)
Write-Host "FIX 5: abonnements filters done"

# FIX 6: colspan 5 -> 6 car colonne admin ajoutee
$src = $src.Replace(
    "tbody.innerHTML += '<tr><td colspan=`"5`" style=`"text-align:center;padding:1.5rem;`"><button class=`"btn-grn`" onclick=`"smActivatePending",
    "tbody.innerHTML += '<tr><td colspan=`"6`" style=`"text-align:center;padding:1.5rem;`"><button class=`"btn-grn`" onclick=`"smActivatePending"
)
Write-Host "FIX 6: colspan done"

# FIX 7: openDateModal - fallback pour les abonnements sans id
$src = $src.Replace(
    "  var sub = user.paidDetails.find(function(p){ return p.id === subId; });",
    "  var sub = user.paidDetails.find(function(p){ return p.id === subId || (!p.id && p.sem === subId); });"
)
Write-Host "FIX 7: openDateModal find fallback done"

# FIX 8: saveDateModal - fallback pour les abonnements sans id  
$src = $src.Replace(
    "    if(pd[i].id === _dmSubId) {",
    "    if(pd[i].id === _dmSubId || (!pd[i].id && pd[i].sem === _dmSubId)) {"
)
Write-Host "FIX 8: saveDateModal loop fallback done"

Write-Host "Final: $($src.Length) bytes"

[System.IO.File]::WriteAllText('c:\Users\EDG3\Downloads\medflix-v4\medflix-admin.html', $src, [System.Text.Encoding]::UTF8)
Write-Host "Written to medflix-admin.html ✅"
