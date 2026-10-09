const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.org/'});
const {window}=dom;const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
let captured=null;const RealBlob=window.Blob;
window.Blob=function(parts,opts){captured=parts[0];return new RealBlob(parts,opts);};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};window.scrollTo=()=>{};
function byText(t,scope){const b=Array.from((scope||doc).querySelectorAll('button')).find(x=>x.textContent.trim()===t);if(!b)throw new Error('bouton absent: '+t+' || '+Array.from((scope||doc).querySelectorAll('button')).map(x=>x.textContent.trim()).join(' | '));b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function set(id,v){doc.getElementById(id).value=v;}
function setRef(ref,v){const e=doc.querySelector('[data-edl="'+ref+'"]');if(!e)throw new Error('champ '+ref);e.value=v;e.dispatchEvent(new window.Event('change',{bubbles:true}));}
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}

setTimeout(()=>{
  byText('Réglages');set('set-nom','SCI des Tilleuls');set('set-adresse','3 rue des Peupliers');set('set-ville','Gavrelle');byText('Enregistrer');
  byText('Tableau de bord');byText('Charger un jeu de démonstration');
  byText('Baux');byText('Documents');

  // sortie refusée avant entrée
  byText('Nouvel état des lieux de sortie');
  ok(/entrée/.test(doc.getElementById('toast').textContent),'sortie bloquée sans entrée: '+doc.getElementById('toast').textContent);

  byText("Nouvel état des lieux d'entrée");
  ok(etat().etatsDesLieux.length===1,'état des lieux créé');
  ok(/État des lieux d'entrée/.test(doc.getElementById('view').textContent),'écran de saisie ouvert');

  setRef('champ|presents','Marc Soudant et Camille Hervieu');
  setRef('compteur|electricite','14 320 kWh');
  setRef('champ|cles','2 clés + boîte aux lettres');
  setRef('piece|0|0|etat','Bon');
  setRef('piece|0|0|obs','Rayure près de la porte');
  setRef('piece|1|2|etat','Neuf');
  let st=etat().etatsDesLieux[0];
  ok(st.presents==='Marc Soudant et Camille Hervieu','saisie enregistrée sans bouton');
  ok(st.pieces[0].lignes[0].etat==='Bon' && st.pieces[0].lignes[0].obs==='Rayure près de la porte','état et observation enregistrés');
  ok(st.compteurs.electricite==='14 320 kWh','compteur enregistré');

  set('edl-piece-nom','Chambre 2');byText('Ajouter');
  ok(etat().etatsDesLieux[0].pieces.length===7,'pièce ajoutée: '+etat().etatsDesLieux[0].pieces.length);

  byText('Télécharger le PDF');
  require('fs').mkdirSync(__dirname+'/sorties',{recursive:true});fs.writeFileSync(__dirname+'/sorties/edl-rempli.pdf',Buffer.from(captured));

  byText('Clôturer');byText('Confirmer',doc.getElementById('modal'));
  ok(!!etat().etatsDesLieux[0].clotureLe,'clôture enregistrée');
  ok(doc.querySelector('[data-edl="champ|presents"]').disabled===true,'champs figés après clôture');

  // état des lieux de sortie pré-rempli
  byText('Retour aux documents');
  byText('Nouvel état des lieux de sortie');
  const sortie=etat().etatsDesLieux[1];
  ok(sortie.sens==='sortie','sortie créée');
  ok(sortie.pieces.length===7,'pièces reprises de l\'entrée: '+sortie.pieces.length);
  ok(sortie.pieces[0].lignes[0].etatEntree==='Bon','état d\'entrée repris pour comparaison');
  ok(/entrée : Bon/.test(doc.getElementById('view').textContent),'état d\'entrée affiché à l\'écran');
  setRef('piece|0|0|etat','Mauvais');
  byText('Télécharger le PDF');
  require('fs').mkdirSync(__dirname+'/sorties',{recursive:true});fs.writeFileSync(__dirname+'/sorties/edl-sortie.pdf',Buffer.from(captured));
  console.log('PDF générés.');
},300);
