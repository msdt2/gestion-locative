const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('__dirname + '/../index.html'','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.org/'});
const {window}=dom;const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
let captured=null;const RealBlob=window.Blob;
window.Blob=function(parts,opts){captured=parts[0];return new RealBlob(parts,opts);};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};window.scrollTo=()=>{};
function byText(t,scope){const b=Array.from((scope||doc).querySelectorAll('button')).find(x=>x.textContent.trim()===t);if(!b)throw new Error('bouton absent: '+t);b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function set(id,v){const e=doc.getElementById(id);if(!e)throw new Error('champ '+id);e.value=v;}
function check(id,v){doc.getElementById(id).checked=v;}
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}
function vue(){return doc.getElementById('view').textContent.replace(/\s+/g,' ');}

setTimeout(()=>{
  byText('Réglages');set('set-nom','SCI des Tilleuls');set('set-adresse','3 rue des Peupliers');set('set-ville','Gavrelle');byText('Enregistrer');
  byText('Tableau de bord');byText('Charger un jeu de démonstration');

  // ---- révision du loyer
  byText('Baux');byText('Documents');
  const loyerAvant=etat().baux[0].loyer;
  set('rev-ref','145,47');set('rev-nouveau','148,09');set('rev-effet','2026-12-01');
  byText('Calculer et appliquer');
  let st=etat();
  const attendu=Math.round(loyerAvant*(148.09/145.47));
  ok(st.baux[0].loyer===attendu,'loyer révisé: '+st.baux[0].loyer+' attendu '+attendu);
  ok(st.baux[0].revisions.length===1,'révision historisée');
  ok(st.baux[0].revisions[0].ancienLoyer===loyerAvant,'ancien loyer conservé');
  // une échéance déjà payée n'est pas recalculée
  const payee=st.echeances.find(e=>e.bailId===st.baux[0].id && e.paiements.length);
  ok(payee.loyer===loyerAvant,'échéance déjà payée non recalculée');
  byText('Courrier de la dernière révision');
  fs.writeFileSync(__dirname+'/sorties/revision.pdf'',Buffer.from(captured));

  // ---- régularisation des charges
  const annee=String(new Date().getFullYear());
  set('reg-annee',annee);set('reg-reelles','480');set('reg-detail','Eau froide : 180 €\nOrdures ménagères : 80 €');
  byText('Enregistrer la régularisation');
  st=etat();
  const reg=st.regularisations[0];
  ok(!!reg,'régularisation enregistrée');
  ok(reg.provisions>0,'provisions calculées depuis les échéances: '+reg.provisions);
  ok(reg.reelles===48000,'charges réelles en centimes');
  byText('Décompte');
  fs.writeFileSync(__dirname+'/sorties/decompte.pdf'',Buffer.from(captured));

  // ---- relance impayé
  byText('Tableau de bord');
  byText('Relance');
  ok(/Relancer ce loyer impayé/.test(doc.getElementById('modal').textContent),'fenêtre de relance ouverte');
  byText('Rappel amiable',doc.getElementById('modal'));
  st=etat();
  ok(st.relances.length===1 && st.relances[0].palier==='amiable','relance amiable enregistrée');
  fs.writeFileSync(__dirname+'/sorties/relance.pdf'',Buffer.from(captured));
  byText('Relancer');
  byText('Mise en demeure',doc.getElementById('modal'));
  ok(etat().relances.length===2,'mise en demeure enregistrée');
  fs.writeFileSync(__dirname+'/sorties/mise-en-demeure.pdf'',Buffer.from(captured));

  // ---- rappels d'entretien
  byText('Parc');
  const lot=etat().lots[0];
  set('rappel-libelle-'+lot.id,'Entretien de la chaudière');
  const dans30=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  set('rappel-date-'+lot.id,dans30);
  byText('Ajouter ce rappel');
  ok((etat().lots[0].rappels||[]).length===1,'rappel ajouté');
  byText('Tableau de bord');
  ok(/Échéances à surveiller/.test(vue()),'rappel affiché sur le tableau de bord');
  ok(/Entretien de la chaudière/.test(vue()),'libellé du rappel affiché');
  byText('Parc');byText('Fait');
  ok(etat().lots[0].rappels[0].date.slice(0,4)===String(parseInt(dans30.slice(0,4))+1),'rappel reporté d\'un an: '+etat().lots[0].rappels[0].date);

  // ---- fin de bail et dépôt de garantie
  byText('Baux');byText('Date de sortie');
  const fin=new Date().toISOString().slice(0,10);
  set('fin-date',fin);byText('Enregistrer',doc.getElementById('modal'));
  byText('Documents');
  ok(/Fin de bail et dépôt de garantie/.test(vue()),'panneau de restitution affiché');
  byText('Préparer la restitution');
  set('ret-libelle','Remise en état du mur du séjour');set('ret-montant','120');
  byText('Ajouter la retenue');
  st=etat();
  ok(st.restitutions[0].retenues.length===1,'retenue enregistrée');
  ok(st.restitutions[0].retenues[0].montant===12000,'montant de la retenue en centimes');
  ok(/À restituer/.test(vue()),'solde affiché');
  byText('Courrier de restitution');
  fs.writeFileSync(__dirname+'/sorties/restitution.pdf'',Buffer.from(captured));

  // ---- bilan
  byText('Bilan');
  ok(/Taux d'encaissement/.test(vue()),'bilan annuel affiché');
  ok(/Par logement/.test(vue()),'détail par logement affiché');
  byText('Exporter cette année (CSV)');
  ok(/appele_euros/.test(captured),'export CSV du bilan');
  console.log('PDF générés.');
},300);
