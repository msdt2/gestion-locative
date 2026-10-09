const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('__dirname + '/../index.html'','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.org/'});
const {window}=dom;const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
let captured=null,lastName=null;const RealBlob=window.Blob;
window.Blob=function(parts,opts){captured=parts[0];return new RealBlob(parts,opts);};
const realCreate=doc.createElement.bind(doc);
doc.createElement=function(t){const e=realCreate(t);if(t==='a'){const d=Object.getOwnPropertyDescriptor(window.HTMLAnchorElement.prototype,'download');}return e;};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};window.scrollTo=()=>{};
function byText(t,scope){const b=Array.from((scope||doc).querySelectorAll('button')).find(x=>x.textContent.trim()===t);if(!b)throw new Error('bouton absent: '+t+' || '+Array.from((scope||doc).querySelectorAll('button')).map(x=>x.textContent.trim()).join(' | '));b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function set(id,v){doc.getElementById(id).value=v;}
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}

setTimeout(()=>{
  byText('Réglages');set('set-nom','SCI des Tilleuls');set('set-adresse','3 rue');set('set-ville','Gavrelle');byText('Enregistrer');
  ok(etat().meta && typeof etat().meta.modifs==='number','métadonnées de sauvegarde créées');
  byText('Tableau de bord');byText('Charger un jeu de démonstration');
  const avant=etat().meta.modifs;
  ok(avant>0,'compteur de modifications incrémenté: '+avant);
  ok(/aucune sauvegarde|Dernière sauvegarde/.test(doc.getElementById('view').textContent)===false,'pas de bandeau prématuré');

  // forcer un état "jamais sauvegardé" avec beaucoup de modifications
  const st=etat();st.meta.modifs=40;window.localStorage.setItem('quittance-v1',JSON.stringify(st));
  byText('Loyers');byText('Tableau de bord');
  // l'état en mémoire n'a pas changé : on teste via la vue Réglages
  byText('Réglages');
  ok(/Dernière sauvegarde/.test(doc.getElementById('view').textContent),'panneau de sauvegarde affiché');
  ok(/jamais/.test(doc.getElementById('view').textContent),'statut « jamais » affiché');
  byText('Sauvegarder maintenant');
  ok(!!etat().meta.derniereSauvegarde,'date de sauvegarde enregistrée');
  ok(etat().meta.modifs===0,'compteur remis à zéro');
  const sauvegarde=captured;
  ok(/"biens"/.test(sauvegarde),'contenu JSON exporté');
  ok(/aujourd/.test(doc.getElementById('view').textContent),'statut mis à jour: aujourd\'hui');

  // navigation : icônes présentes
  ok(doc.querySelectorAll('nav.tabs button svg').length===8,'icônes de navigation: '+doc.querySelectorAll('nav.tabs button svg').length);
  console.log('taille sauvegarde:',sauvegarde.length,'octets');
},300);
