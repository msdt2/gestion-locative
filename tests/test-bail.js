const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('__dirname + '/../index.html'','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.org/'});
const {window}=dom;const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
let captured=null;const RealBlob=window.Blob;
window.Blob=function(parts,opts){captured=parts[0];return new RealBlob(parts,opts);};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};
window.scrollTo=()=>{};
function byText(t,scope){const b=Array.from((scope||doc).querySelectorAll('button')).find(x=>x.textContent.trim()===t);if(!b)throw new Error('bouton absent: '+t);b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function set(id,v){const e=doc.getElementById(id);if(!e)throw new Error('champ '+id);e.value=v;}
function check(id,v){doc.getElementById(id).checked=v;}
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}

setTimeout(()=>{
  byText('Réglages');set('set-nom','SCI des Tilleuls');set('set-adresse','3 rue des Peupliers, 62580 Gavrelle');set('set-ville','Gavrelle');set('set-tel','06 11 22 33 44');byText('Enregistrer');
  byText('Parc');set('bien-nom','Immeuble Jean Bart');set('bien-adresse','12 rue Jean Bart, 59300 Valenciennes');byText('Ajouter le bien');
  const b=etat().biens[0].id;set('lot-nom-'+b,'Appartement 2');set('lot-surface-'+b,'35');byText('Ajouter un lot');
  byText('Locataires');set('loc-nom','Camille Hervieu');set('loc-email','camille@exemple.fr');byText('Ajouter');
  set('loc-nom','Théo Barennes');set('loc-email','theo@exemple.fr');byText('Ajouter');

  // bail en colocation
  byText('Baux');
  doc.getElementById('bail-type-libelle').value='Colocation à bail unique';
  set('bail-debut','2026-10-01');set('bail-loyer','620');set('bail-charges','55');
  doc.getElementById('bail-consent').checked=true;
  byText('Créer le bail');
  ok(etat().baux[0].type==='colocation','type de bail enregistré');

  byText('Documents');
  ok(/Documents du bail/.test(doc.getElementById('view').textContent),'vue Documents affichée');

  // colocataire + détails
  const multi=doc.getElementById('det-colocataires');
  multi.options[0].selected=true;
  set('det-surface','62');set('det-nbPieces','3');set('det-dpeClasse','D');set('det-dpeConso','215');
  set('det-idFiscal','5901234567A');set('det-depot','620');set('det-duree','36');set('det-irl','2e trimestre 2026');
  check('det-copro',true);check('det-residencePrincipale',true);
  set('det-piecesEdl','Entrée\nSéjour\nCuisine\nChambre 1\nChambre 2\nSalle de bains\nWC');
  byText('Enregistrer');
  const st=etat();
  ok(st.baux[0].colocataires.length===1,'colocataire rattaché');
  ok(st.baux[0].details.depot===62000,'dépôt enregistré en centimes: '+st.baux[0].details.depot);
  ok(st.baux[0].details.copro===true,'copropriété cochée');

  // génération
  byText('Bail');
  fs.writeFileSync(__dirname+'/sorties/bail.pdf'',Buffer.from(captured));
  byText('Annexes à joindre');
  fs.writeFileSync(__dirname+'/sorties/annexes.pdf'',Buffer.from(captured));
  byText("État des lieux d'entrée");
  fs.writeFileSync(__dirname+'/sorties/edl.pdf'',Buffer.from(captured));
  byText('Tout en un seul PDF');
  fs.writeFileSync(__dirname+'/sorties/dossier.pdf'',Buffer.from(captured));
  console.log('PDF générés.');
},300);
