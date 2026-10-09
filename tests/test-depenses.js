const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
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
const annee=String(new Date().getFullYear());

setTimeout(()=>{
  byText('Réglages');set('set-nom','SCI des Tilleuls');set('set-adresse','3 rue');set('set-ville','Gavrelle');byText('Enregistrer');
  byText('Tableau de bord');byText('Charger un jeu de démonstration');

  byText('Bilan');
  ok(/Aucune dépense saisie/.test(vue()),'état vide des dépenses');
  set('dep-date',annee+'-03-14');
  set('dep-libelle','Remplacement du ballon d\'eau chaude');
  set('dep-montant','740');
  set('dep-fournisseur','Plomberie Dubois');
  byText('Enregistrer la dépense');
  let st=etat();
  ok(st.depenses.length===1,'dépense enregistrée');
  ok(st.depenses[0].montant===74000,'montant en centimes');
  ok(st.depenses[0].categorie==='Travaux et réparations','catégorie par défaut');

  // dépense récupérable rattachée à un lot
  set('dep-date',annee+'-06-02');set('dep-libelle','Entretien des parties communes');set('dep-montant','220');
  doc.getElementById('dep-categorie').value='Entretien courant';
  doc.getElementById('dep-lot').value=doc.getElementById('dep-lot').options[1].value;
  check('dep-recuperable',true);
  byText('Enregistrer la dépense');
  st=etat();
  ok(st.depenses.length===2,'deuxième dépense');
  ok(st.depenses[1].recuperable===true,'dépense marquée récupérable');
  ok(!!st.depenses[1].lotId,'dépense rattachée à un logement');

  ok(/Résultat/.test(vue()),'résultat affiché');
  ok(/Pour votre déclaration/.test(vue()),'récapitulatif fiscal affiché');
  ok(/Impôts et taxes|Dépenses de réparation/.test(vue()),'rubriques 2044 présentes');

  byText('Exporter les dépenses (CSV)');
  ok(/rubrique_2044/.test(captured),'export CSV des dépenses');
  ok(/Plomberie Dubois/.test(captured),'fournisseur exporté');

  // reprise dans la régularisation
  byText('Baux');byText('Documents');
  set('reg-annee',annee);
  byText('Reprendre les dépenses récupérables');
  const montant=doc.getElementById('reg-reelles').value;
  ok(montant && montant!=='','montant repris: '+montant);
  ok(/Entretien des parties communes/.test(doc.getElementById('reg-detail').value),'détail repris');
  byText('Enregistrer la régularisation');
  ok(etat().regularisations.length===1,'régularisation enregistrée depuis les dépenses');

  // coffre indisponible sans IndexedDB : message, pas de plantage
  byText('Parc');
  ok(/Pièces du logement/.test(vue()),'bloc pièces jointes affiché');
  ok(/ne permet pas de conserver des fichiers/.test(vue()),'message clair si le stockage de fichiers manque');
},300);
