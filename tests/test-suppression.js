// Suppression d'un bail : bloquée par une quittance active, possible une fois annulée,
// et nettoyage complet de ce qui s'y rattache.
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.org/'});
const {window}=dom;const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
const RealBlob=window.Blob;window.Blob=function(p,o){return new RealBlob(p,o);};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};window.scrollTo=()=>{};
function boutons(scope){return Array.from((scope||doc).querySelectorAll('button'));}
function byText(t,scope,rang){const l=boutons(scope).filter(x=>x.textContent.trim()===t);const b=l[rang||0];if(!b)throw new Error('bouton absent: '+t);b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function set(id,v){doc.getElementById(id).value=v;}
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}
const modal=()=>doc.getElementById('modal');
function supprimerBail(rang){byText('Baux');byText('Supprimer',doc.getElementById('view'),rang||0);}

setTimeout(()=>{
  byText('Réglages');set('set-nom','SCI test');set('set-adresse','3 rue');set('set-ville','Gavrelle');byText('Enregistrer');
  byText('Tableau de bord');byText('Charger un jeu de démonstration');
  // la démonstration a déjà des loyers payés : on émet une quittance sur le premier
  byText('Loyers');byText('Précédent');byText('Précédent');
  const btnQ=boutons(doc.getElementById('view')).find(b=>b.textContent.trim()==='Quittance');
  ok(!!btnQ,'une échéance payée est quittançable');
  btnQ.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  let st=etat();
  ok(st.quittances.length===1,'quittance émise');
  const bailId=st.echeances.find(e=>e.id===st.quittances[0].echeanceId).bailId;
  const rang=st.baux.findIndex(b=>b.id===bailId);

  // 1) avec une quittance active : choix proposé, rien ne disparaît
  supprimerBail(rang);
  ok(/active/.test(modal().textContent),'suppression bloquée par la quittance active, avec explication');
  byText('Garder le bail',modal());
  ok(etat().baux.length===2,'rien supprimé');

  // 2) on annule la quittance à la main, puis on supprime normalement
  byText('Quittances');byText('Annuler');byText('Confirmer',modal());
  ok(etat().quittances[0].annulee===true,'quittance annulée');
  supprimerBail(rang);
  ok(/Supprimer ce bail/.test(modal().textContent),'confirmation simple une fois la quittance annulée');
  byText('Confirmer',modal());
  st=etat();
  ok(st.baux.length===1,'bail supprimé après annulation');
  ok(!st.echeances.some(e=>e.bailId===bailId),'ses échéances sont supprimées');
  ok(st.quittances.length===1 && st.quittances[0].bailSupprime,'la quittance annulée reste archivée');
  byText('Quittances');
  ok(/bail supprimé/.test(doc.getElementById('view').textContent),'mention « bail supprimé » visible');

  // 3) raccourci : annuler et supprimer en une fois, sur un loyer pointé intégralement
  byText('Tableau de bord');
  byText('Pointer');
  byText('Enregistrer',modal());
  byText('Quittance');
  ok(etat().quittances.filter(q=>!q.annulee).length===1,'nouvelle quittance active sur le second bail');
  supprimerBail(0);
  byText('Annuler les quittances et supprimer le bail',modal());
  st=etat();
  ok(st.baux.length===0,'raccourci : bail supprimé');
  ok(st.quittances.every(q=>q.annulee),'raccourci : quittances annulées, aucune effacée');
  ok(st.quittances.length===2,'numérotation conservée : '+st.quittances.map(q=>q.numero).join(', '));

  // 4) le parc se libère ensuite
  byText('Locataires');byText('Supprimer',doc.getElementById('view'));byText('Confirmer',modal());
  ok(etat().locataires.length===1,'locataire supprimable une fois son bail supprimé');
},300);
