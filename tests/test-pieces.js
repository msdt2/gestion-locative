// Nécessite fake-indexeddb : npm install fake-indexeddb
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
let FDBFactory,FDBKeyRange;
try{FDBFactory=require('fake-indexeddb/lib/FDBFactory');FDBKeyRange=require('fake-indexeddb/lib/FDBKeyRange');}
catch(e){console.log('IGNORÉ · installez fake-indexeddb pour tester le coffre à fichiers');process.exit(0);}
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'});
const {window}=dom;
window.indexedDB=new FDBFactory();window.IDBKeyRange=FDBKeyRange;
// on injecte le script après avoir installé IndexedDB
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
let captured=null;const RealBlob=window.Blob;
window.Blob=function(parts,opts){captured=parts[0];return new RealBlob(parts,opts);};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};window.scrollTo=()=>{};
window.eval(script);
function byText(t,scope){const b=Array.from((scope||doc).querySelectorAll('button')).find(x=>x.textContent.trim()===t);if(!b)throw new Error('bouton absent: '+t);b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function set(id,v){doc.getElementById(id).value=v;}
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}
function vue(){return doc.getElementById('view').textContent.replace(/\s+/g,' ');}
function attendre(ms){return new Promise(r=>setTimeout(r,ms));}

(async()=>{
  await attendre(300);
  byText('Réglages');set('set-nom','SCI des Tilleuls');set('set-adresse','3 rue');set('set-ville','Gavrelle');byText('Enregistrer');
  byText('Tableau de bord');byText('Charger un jeu de démonstration');
  byText('Parc');
  ok(!/ne permet pas de conserver des fichiers/.test(vue()),'coffre disponible avec IndexedDB');

  const input=doc.querySelector('input[data-pieces^="lot|"]');
  ok(!!input,'champ de dépôt de fichier présent');
  const fichier=new window.File([new Uint8Array([37,80,68,70,45])],'dpe-appartement-1.pdf',{type:'application/pdf'});
  Object.defineProperty(input,'files',{value:[fichier],configurable:true});
  input.dispatchEvent(new window.Event('change',{bubbles:true}));
  await attendre(400);

  let st=etat();
  ok(st.pieces.length===1,'pièce jointe enregistrée: '+st.pieces.length);
  ok(st.pieces[0].nom==='dpe-appartement-1.pdf','nom du fichier conservé');
  ok(st.pieces[0].cibleType==='lot','fichier rattaché au logement');
  ok(/dpe-appartement-1.pdf/.test(vue()),'fichier listé à l\'écran');

  // export des pièces jointes
  byText('Réglages');
  ok(/Sauvegarder les 1 pièce/.test(vue()),'bouton de sauvegarde des fichiers affiché');
  captured=null;
  byText('Sauvegarder les 1 pièce(s) jointe(s)');
  await attendre(1500);
  const sortie=captured?JSON.parse(captured):null;
  ok(!!sortie && sortie.type==='pieces-jointes','fichier de sauvegarde des pièces produit');
  if(sortie && !sortie.fichiers.length){
    console.log("IGNORÉ · contenu des fichiers : la base simulée ne restitue pas de Blob, à vérifier dans un vrai navigateur");
  } else if(sortie){
    ok(sortie.fichiers[0].data.length>0,'contenu encodé dans la sauvegarde');
  }

  // suppression
  byText('Parc');
  byText('Retirer',doc.getElementById('view'));
  byText('Confirmer',doc.getElementById('modal'));
  await attendre(300);
  ok(etat().pieces.length===0,'pièce jointe retirée');
})();
