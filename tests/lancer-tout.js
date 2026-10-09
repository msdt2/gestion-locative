// Lance toutes les suites et échoue si l'une d'elles plante, échoue, ou n'affiche aucun OK.
// Usage : node tests/lancer-tout.js
const {spawnSync}=require('child_process');
const fs=require('fs');const path=require('path');
const suites=fs.readdirSync(__dirname).filter(f=>/^test-.*\.js$/.test(f)).sort();
let mauvais=0;
for(const s of suites){
  const r=spawnSync(process.execPath,[path.join(__dirname,s)],{encoding:'utf8',env:process.env});
  const sortie=(r.stdout||'')+(r.stderr||'');
  const ok=(sortie.match(/^OK /gm)||[]).length;
  const echec=(sortie.match(/^ECHEC/gm)||[]).length;
  const ignore=/^IGNORÉ/m.test(sortie);
  const plante=r.status!==0&&echec===0;
  const vide=ok===0&&!ignore;
  const statut=echec?'ÉCHEC':plante?'PLANTAGE':vide?'AUCUN TEST':'vert';
  if(statut!=='vert')mauvais++;
  console.log(statut.padEnd(10)+s.padEnd(22)+ok+' OK'+(echec?', '+echec+' échec(s)':''));
  if(statut!=='vert')console.log('   '+sortie.split('\n').filter(l=>/^ECHEC|Error/.test(l)).slice(0,3).join('\n   '));
}
console.log(mauvais?'\n'+mauvais+' suite(s) à corriger.':'\nToutes les suites sont vertes.');
process.exit(mauvais?1:0);
