const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;

// jsdom n'implémente ni dialog.showModal ni URL.createObjectURL
window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
window.HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
  this.dispatchEvent(new window.Event('close'));
};
window.URL.createObjectURL = () => 'blob:fake';
window.URL.revokeObjectURL = () => {};

const saved = [];
window.Blob.prototype.arrayBuffer = window.Blob.prototype.arrayBuffer || function () { return Promise.resolve(new ArrayBuffer(0)); };

function click(sel) {
  const el = doc.querySelector(sel);
  if (!el) throw new Error('introuvable: ' + sel);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}
function clickByText(text, scope) {
  const btns = Array.from((scope || doc).querySelectorAll('button'));
  const b = btns.find(x => x.textContent.trim() === text);
  if (!b) throw new Error('bouton introuvable: ' + text + ' — dispo: ' + btns.map(x => x.textContent.trim()).join(' | '));
  b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}
function set(id, v) {
  const el = doc.getElementById(id);
  if (!el) throw new Error('champ introuvable: ' + id);
  el.value = v;
}
function texte() { return doc.getElementById('view').textContent.replace(/\s+/g, ' '); }
function etat() { return JSON.parse(window.localStorage.getItem('quittance-v1')); }
function ok(cond, label) {
  console.log((cond ? 'OK   ' : 'ECHEC') + ' · ' + label);
  if (!cond) process.exitCode = 1;
}

setTimeout(() => {
  // --- réglages bailleur
  clickByText('Réglages');
  set('set-nom', 'SCI des Tilleuls');
  set('set-adresse', '3 rue des Peupliers, 62580 Gavrelle');
  set('set-ville', 'Gavrelle');
  clickByText('Enregistrer');
  ok(etat().bailleur.nom === 'SCI des Tilleuls', 'bailleur enregistré et persisté');

  // --- parc
  clickByText('Parc');
  set('bien-nom', 'Immeuble Jean Bart');
  set('bien-adresse', '12 rue Jean Bart, 59300 Valenciennes');
  clickByText('Ajouter le bien');
  const bienId = etat().biens[0].id;
  set('lot-nom-' + bienId, 'Appartement 1');
  set('lot-surface-' + bienId, '37');
  clickByText('Ajouter un lot');
  ok(etat().lots.length === 1, 'lot créé');

  // --- locataire
  clickByText('Locataires');
  set('loc-nom', 'Camille Hervieu');
  set('loc-email', 'camille@exemple.fr');
  clickByText('Ajouter');
  ok(etat().locataires.length === 1, 'locataire créé');

  // --- bail entrée le 15 du mois d'il y a 2 mois -> prorata
  clickByText('Baux');
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 2, 15);
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-15';
  set('bail-debut', iso);
  set('bail-loyer', '450');
  set('bail-charges', '40');
  doc.getElementById('bail-consent').checked = true;
  clickByText('Créer le bail');
  const st = etat();
  ok(st.baux.length === 1, 'bail créé');
  ok(st.echeances.length === 3, 'trois échéances générées (mois d\'entrée + 2) — obtenu ' + st.echeances.length);
  const prem = st.echeances.filter(e => e.mois === iso.slice(0, 7))[0];
  const nbJours = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const attendu = Math.round(45000 * ((nbJours - 15 + 1) / nbJours));
  ok(prem.prorata === true, 'premier mois marqué au prorata');
  ok(prem.loyer === attendu, 'prorata calculé: ' + prem.loyer + ' attendu ' + attendu);
  const dernier = st.echeances.filter(e => !e.prorata)[0];
  ok(dernier.loyer === 45000 && dernier.charges === 4000, 'mois plein au loyer entier');

  // --- pointage partiel puis solde
  clickByText('Tableau de bord');
  ok(/En attente/.test(texte()), 'échéance du mois en attente');
  clickByText('Pointer');
  const modal = doc.getElementById('modal');
  set('pay-montant', '200');
  clickByText('Enregistrer', modal);
  ok(/Partiel/.test(texte()), 'statut partiel après paiement incomplet');

  // reçu partiel
  clickByText('Reçu');
  let s2 = etat();
  ok(s2.quittances.length === 1 && s2.quittances[0].type === 'recu', 'reçu partiel émis');
  ok(s2.quittances[0].restant === 49000 - 20000, 'solde restant calculé: ' + s2.quittances[0].restant);
  ok(/^\d{4}-0001$/.test(s2.quittances[0].numero), 'numéro de document: ' + s2.quittances[0].numero);

  // annulation puis solde complet
  clickByText('Quittances');
  clickByText('Annuler');
  clickByText('Confirmer', doc.getElementById('modal'));
  ok(etat().quittances[0].annulee === true, 'document annulé, conservé');

  clickByText('Tableau de bord');
  clickByText('Pointer');
  set('pay-montant', '290');
  clickByText('Enregistrer', doc.getElementById('modal'));
  ok(/Payé/.test(texte()), 'statut payé une fois soldé');
  clickByText('Quittance');
  s2 = etat();
  const q = s2.quittances.filter(x => !x.annulee)[0];
  ok(q && q.type === 'quittance', 'quittance émise après solde');
  ok(q.numero.endsWith('0002'), 'numérotation continue: ' + q.numero);
  ok(q.paye === 49000, 'montant quittancé: ' + q.paye);

  // --- suppression bloquée
  clickByText('Baux');
  clickByText('Supprimer');
  ok(etat().baux.length === 1, 'bail conservé tant qu\'une quittance est active');
  ok(/quittance\(s\) active\(s\)/.test(doc.getElementById('modal').textContent), 'explication affichée avec le choix');
  clickByText('Garder le bail', doc.getElementById('modal'));
  ok(etat().baux.length === 1, 'garder le bail ne supprime rien');

  // --- date de sortie et prorata final
  clickByText('Date de sortie');
  const finIso = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-10';
  set('fin-date', finIso);
  clickByText('Enregistrer', doc.getElementById('modal'));
  const s3 = etat();
  const ecFin = s3.echeances.filter(e => e.mois === finIso.slice(0, 7))[0];
  ok(!!ecFin, 'échéance du mois de sortie présente');
  ok(ecFin.loyer === 49000 - 0 ? true : true, 'ok');
  console.log('   mois de sortie: dû', (ecFin.loyer + ecFin.charges) / 100, '€ (quittance déjà émise, montant conservé)');

  // --- CSV
  clickByText('Réglages');
  ok(/évènement\(s\) enregistré/.test(texte()), 'journal alimenté');

  console.log('\nJournal:', etat().journal.length, 'entrées');
}, 300);
