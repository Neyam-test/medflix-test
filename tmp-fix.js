var fs = require('fs');
var path = 'c:/Users/EDG3/Downloads/medflix-v4/medflix-admin.html';
var content = fs.readFileSync(path, 'utf8');

var search = `   var sem = targetSemestre || user.semester;

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

   if (aboId) {
     // Si la demande existe déjà dans les abonnements (ex: Ajout semestre), on la modifie
     await dbUpdateAbonnement(aboId, { statut: 'Actif', expiration: expDate });
   } else {
     // S'il n'y avait pas de ligne ou 1ère activation, on crée la trace
     await dbAddAbonnement({ nom:user.name, email:email, semestre:sem, montant:199, methode:'Validé admin', statut:'Actif', expiration:expDate });
   }`;

var replacement = `   var sem = targetSemestre || user.semester;

   var methode = 'Validé admin';
   var pr = prompt("Méthode de paiement:\\n\\nTapez 1 pour : RIB Banque\\nTapez 2 pour : Billeterie.ma\\nOu saisissez une autre méthode:", "1");
   if (pr === null) return;
   if (pr.trim() === '1') methode = 'RIB Banque';
   else if (pr.trim() === '2') methode = 'Billeterie.ma';
   else if (pr.trim() !== '') methode = pr.trim();

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

   if (aboId) {
     await dbUpdateAbonnement(aboId, { statut: 'Actif', expiration: expDate, methode: methode });
   } else {
     await dbAddAbonnement({ nom:user.name, email:email, semestre:sem, montant:199, methode:methode, statut:'Actif', expiration:expDate });
   }`;

if (content.includes(search)) {
    content = content.replace(search, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("SUCCESS!");
} else {
    console.log("Search block not found.");
}
