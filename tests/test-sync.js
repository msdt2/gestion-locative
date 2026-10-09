// Serveur simulé : PostgREST + GoTrue, assez pour valider le client de synchronisation.
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'});
const {window}=dom;const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};window.scrollTo=()=>{};

// --- faux serveur
const serveur={ligne:null,appels:[]};
window.fetch=function(url,options){
  options=options||{};
  const corps=options.body?JSON.parse(options.body):null;
  serveur.appels.push((options.method||'GET')+' '+url.replace('https://projet.test',''));
  function rep(code,data){return Promise.resolve({ok:code<400,status:code,json:()=>Promise.resolve(data)});}
  if(/\/auth\/v1\/signup/.test(url)) return rep(200,{access_token:'jeton1',refresh_token:'refresh1',user:{id:'u-1',email:corps.email}});
  if(/grant_type=password/.test(url)){
    if(corps.password!=='bonmdp') return rep(400,{msg:'Invalid login credentials'});
    return rep(200,{access_token:'jeton1',refresh_token:'refresh1',user:{id:'u-1',email:corps.email}});
  }
  if(/grant_type=refresh_token/.test(url)) return rep(200,{access_token:'jeton2',refresh_token:'refresh2',user:{id:'u-1',email:'marc@test.fr'}});
  if(/\/rest\/v1\/registres/.test(url)){
    if((options.method||'GET')==='GET') return rep(200,serveur.ligne?[serveur.ligne]:[]);
    if(options.method==='POST'){serveur.ligne={donnees:corps.donnees,version:corps.version,maj:corps.maj};return rep(201,[serveur.ligne]);}
    if(options.method==='PATCH'){
      const m=url.match(/version=eq\.(\d+)/);
      const attendue=m?parseInt(m[1],10):0;
      if(!serveur.ligne||serveur.ligne.version!==attendue) return rep(200,[]); // conflit
      serveur.ligne={donnees:corps.donnees,version:corps.version,maj:corps.maj};
      return rep(200,[serveur.ligne]);
    }
  }
  return rep(404,{});
};
window.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
function byText(t,scope){const b=Array.from((scope||doc).querySelectorAll('button')).find(x=>x.textContent.trim()===t);if(!b)throw new Error('bouton absent: '+t);b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function set(id,v){doc.getElementById(id).value=v;}
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}
function vue(){return doc.getElementById('view').textContent.replace(/\s+/g,' ');}
const attendre=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await attendre(300);
  byText('Réglages');set('set-nom','SCI des Tilleuls');set('set-adresse','3 rue');set('set-ville','Gavrelle');byText('Enregistrer');
  byText('Tableau de bord');byText('Charger un jeu de démonstration');

  byText('Réglages');
  ok(/Synchronisation entre appareils/.test(vue()),'panneau de synchronisation présent');
  set('sync-url','https://projet.test');set('sync-cle','cle-publique');
  byText("Enregistrer l'adresse");
  ok(etat().sync.url==='https://projet.test','adresse du projet enregistrée');
  ok(/Se connecter/.test(vue()),'formulaire de connexion affiché une fois configuré');

  // mauvais mot de passe
  set('sync-email','marc@test.fr');set('sync-mdp','mauvais');
  byText('Se connecter');
  await attendre(200);
  ok(/Invalid login credentials/.test(doc.getElementById('toast').textContent),'erreur de connexion remontée');

  // bonne connexion : premier envoi
  set('sync-email','marc@test.fr');set('sync-mdp','bonmdp');
  byText('Se connecter');
  await attendre(400);
  ok(!!window.localStorage.getItem('registre-session'),'session enregistrée');
  ok(!!serveur.ligne,'registre créé sur le serveur');
  ok(serveur.ligne.version===1,'version 1 côté serveur');
  ok(!!serveur.ligne.donnees.baux.length,'les baux sont bien partis');
  ok(serveur.ligne.donnees.sync===undefined,'la clé du projet n\'est pas envoyée au serveur');
  ok(etat().meta.modifsDepuisSync===0,'compteur de modifications à envoyer remis à zéro');

  // une modification repart toute seule
  byText('Locataires');set('loc-nom','Nouveau locataire');byText('Ajouter');
  ok(etat().meta.modifsDepuisSync>0,'modification en attente d\'envoi');
  await attendre(4600);
  ok(serveur.ligne.version===2,'version incrémentée après envoi automatique: '+serveur.ligne.version);
  ok(serveur.ligne.donnees.locataires.some(l=>l.nom==='Nouveau locataire'),'la modification est sur le serveur');

  // un autre appareil écrit : on reprend sa version
  serveur.ligne={donnees:Object.assign({},serveur.ligne.donnees,{locataires:serveur.ligne.donnees.locataires.concat([{id:'loc-x',nom:'Ajouté ailleurs',email:'',tel:''}])}),version:5,maj:new Date().toISOString()};
  byText('Réglages');byText('Synchroniser maintenant');
  await attendre(400);
  ok(etat().locataires.some(l=>l.nom==='Ajouté ailleurs'),'version distante reprise quand rien n\'est en attente');
  ok(etat().meta.versionDistante===5,'version distante mémorisée');
  ok(etat().sync.url==='https://projet.test','la configuration locale survit à la reprise');

  // conflit : modifications locales + serveur plus récent
  byText('Locataires');set('loc-nom','Modifié ici');byText('Ajouter');
  serveur.ligne.version=9;serveur.ligne.maj=new Date().toISOString();
  byText('Réglages');byText('Synchroniser maintenant');
  await attendre(400);
  ok(/Deux versions différentes/.test(doc.getElementById('modal').textContent),'conflit signalé à l\'utilisateur');
  byText('Envoyer la version de cet appareil',doc.getElementById('modal'));
  await attendre(400);
  ok(serveur.ligne.version===10,'envoi forcé accepté: version '+serveur.ligne.version);
  ok(serveur.ligne.donnees.locataires.some(l=>l.nom==='Modifié ici'),'la version locale est partie');

  // déconnexion
  byText('Réglages');byText('Se déconnecter');
  ok(!window.localStorage.getItem('registre-session'),'session effacée');
  ok(etat().locataires.length>0,'les données restent disponibles hors ligne');
})();
