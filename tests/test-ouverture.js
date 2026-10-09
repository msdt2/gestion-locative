// Reproduit le bug du 9 octobre : un registre enregistré en septembre doit avoir
// ses échéances d'octobre dès l'ouverture, sans aucune modification.
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'});
const {window}=dom;const doc=window.document;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
window.URL.createObjectURL=()=>'blob:x';window.URL.revokeObjectURL=()=>{};window.scrollTo=()=>{};
function ok(c,l){console.log((c?'OK   ':'ECHEC')+' · '+l);if(!c)process.exitCode=1;}
function byText(t,scope){const b=Array.from((scope||doc).querySelectorAll('button')).find(x=>x.textContent.trim()===t);if(!b)throw new Error('bouton absent: '+t);b.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
function etat(){return JSON.parse(window.localStorage.getItem('quittance-v1'));}
function vue(){return doc.getElementById('view').textContent.replace(/\s+/g,' ');}

const auj=new Date();
const moisCourant=auj.getFullYear()+'-'+String(auj.getMonth()+1).padStart(2,'0');
const p=new Date(auj.getFullYear(),auj.getMonth()-1,29);
const debut=p.getFullYear()+'-'+String(p.getMonth()+1).padStart(2,'0')+'-29';
const moisPrec=debut.slice(0,7);

// registre tel qu'enregistré le mois dernier : une seule échéance, au prorata
window.localStorage.setItem('quittance-v1',JSON.stringify({
  bailleur:{nom:'SCI test',adresse:'',ville:'',email:''},
  biens:[{id:'b1',nom:'immeuble Valenciennes',adresse:'12 rue Jean Bart'}],
  lots:[{id:'l1',bienId:'b1',nom:'Appt 1',surface:'37'}],
  locataires:[{id:'t1',nom:'Alexandre test',email:'',tel:''}],
  baux:[{id:'x1',lotId:'l1',locataireId:'t1',debut:debut,fin:null,loyer:55000,charges:4000,consentement:false}],
  echeances:[{id:'e1',bailId:'x1',mois:moisPrec,debut:debut,fin:moisPrec+'-30',loyer:3666,charges:0,prorata:true,paiements:[]}],
  quittances:[],numeros:{},journal:[]
}));
window.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1]);

setTimeout(()=>{
  const st=etat();
  const ech=st.echeances.filter(e=>e.mois===moisCourant);
  ok(ech.length===1,'échéance du mois en cours créée à l\'ouverture');
  ok(ech.length===1 && ech[0].loyer===55000 && !ech[0].prorata,'mois plein au loyer entier');
  ok(/Alexandre test/.test(vue()),'le loyer du mois apparaît sur le tableau de bord');
  ok(!/Aucune échéance pour ce mois/.test(vue()),'plus de tableau de bord vide');

  // démonstration accessible malgré des données existantes
  byText('Réglages');
  byText('Charger un jeu de démonstration');
  ok(/Ajouter les données de démonstration/.test(doc.getElementById('modal').textContent),'confirmation demandée si des données existent');
  byText('Confirmer',doc.getElementById('modal'));
  ok(etat().baux.length===3,'démonstration ajoutée aux données existantes: '+etat().baux.length+' baux');
  ok(doc.title==='Registre — gestion locative','titre de l\'onglet corrigé');
},400);
