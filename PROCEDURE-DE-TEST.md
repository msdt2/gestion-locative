# Procédure de test

Deux niveaux : les tests automatisés, qui vérifient les calculs et les règles métier en quelques secondes, et cette recette manuelle, qui vérifie ce qu'une machine ne voit pas (lisibilité, impression, usage sur téléphone).

À faire avant chaque mise en ligne d'une nouvelle version.

---

## 1. Tests automatisés

Ils tournent avec Node et jsdom, sans navigateur.

```bash
npm install jsdom
node tests/test-app.js          # parc, baux, échéances, prorata, quittances
node tests/test-bail.js         # types de bail, documents, annexes
node tests/test-edl.js          # états des lieux, clôture, comparaison entrée/sortie
node tests/test-sauvegarde.js   # compteur de modifications, export, restauration
node tests/test-gestion.js      # révision IRL, charges, relances, rappels, dépôt, bilan
node tests/test-depenses.js     # dépenses, résultat annuel, récapitulatif fiscal
node tests/test-pieces.js       # pièces jointes (npm install fake-indexeddb)
node tests/test-sync.js         # synchronisation serveur, contre un serveur simulé
```

Chaque ligne affiche `OK` ou `ECHEC`. **Un seul `ECHEC` bloque la mise en ligne.** Les PDF produits pendant les tests sont écrits sur le disque : ouvrez-en un au hasard, c'est le contrôle visuel le plus rapide.

---

## 2. Recette manuelle

Comptez trente minutes. Faites-la dans une fenêtre de navigation privée, pour partir de données vierges sans perdre les vôtres.

### 2.1 Démarrage

1. Ouvrir l'application. **Attendu** : le tableau de bord propose de créer un bien ou de charger la démonstration.
2. Cliquer sur **Charger un jeu de démonstration**. **Attendu** : deux logements, deux locataires, des échéances déjà générées, dont certaines payées.
3. Aller dans **Réglages**, remplir le bailleur, enregistrer. **Attendu** : message de confirmation, et les champs restent remplis en revenant sur l'onglet.

### 2.2 Loyers et quittances

4. **Loyers**, naviguer d'un mois à l'autre avec Précédent et Suivant. **Attendu** : les échéances changent, le mois en cours est atteignable d'un clic.
5. Sur une échéance en attente, **Pointer**, saisir un montant inférieur au dû. **Attendu** : statut « Partiel ».
6. Cliquer sur **Reçu**. **Attendu** : un PDF se télécharge, intitulé *Reçu de paiement partiel*, avec le solde restant dû.
7. Pointer le complément. **Attendu** : statut « Payé ».
8. Cliquer sur **Quittance**. **Attendu** : un PDF *Quittance de loyer*, numéro suivant le précédent, loyer et charges distingués.
9. Onglet **Quittances**, annuler le reçu partiel. **Attendu** : la ligne reste, grisée, marquée « Annulé ». Elle ne disparaît jamais.
10. Sur une échéance déjà quittancée, essayer de retirer un paiement. **Attendu** : refus explicite, avec invitation à annuler la quittance d'abord.

### 2.3 Baux et documents

11. **Baux**, créer un bail meublé sur un lot libre, avec une date d'entrée en milieu de mois. **Attendu** : la première échéance est au prorata, visible sous le nom du logement.
12. Ouvrir **Documents**, remplir le logement (surface, pièces, DPE), enregistrer, revenir : les valeurs sont conservées.
13. Saisir un dépôt de garantie supérieur à deux mois de loyer. **Attendu** : un avertissement sur le plafond légal.
14. Générer le **bail**. **Attendu** : trois pages environ, les sections I à XI, la clause résolutoire, les bons préavis pour un meublé.
15. Générer les **annexes**. **Attendu** : l'inventaire du mobilier figure dans la liste (bail meublé), le constat plomb seulement si la période de construction est antérieure à 1949.
16. Générer **Tout en un seul PDF**. **Attendu** : bail, annexes et état des lieux à la suite, sans page blanche ni texte coupé.

### 2.4 État des lieux

17. Dans Documents, **Nouvel état des lieux de sortie** avant d'en avoir fait un d'entrée. **Attendu** : refus, avec explication.
18. Créer celui d'**entrée**, renseigner les compteurs, choisir des états, écrire une observation.
19. Recharger la page, rouvrir l'état des lieux. **Attendu** : tout est conservé, sans avoir cliqué sur un bouton d'enregistrement.
20. Ajouter une pièce, en retirer une autre. **Attendu** : la liste suit, et le PDF aussi.
21. **Clôturer**. **Attendu** : tous les champs deviennent inactifs mais restent lisibles, un bandeau indique la date.
22. Créer l'état des lieux de **sortie**. **Attendu** : mêmes pièces, et l'état relevé à l'entrée s'affiche à côté de chaque ligne, à l'écran comme dans le PDF.

### 2.5 Révision, charges, impayés

23. Documents, **Révision annuelle** : saisir deux indices, par exemple 145,47 puis 148,09. **Attendu** : le loyer augmente d'environ 1,8 %, l'historique s'incrémente.
24. Vérifier une échéance déjà payée des mois précédents. **Attendu** : son montant n'a pas bougé.
25. **Régularisation des charges** : choisir une année, saisir un montant réel supérieur aux provisions, enregistrer, éditer le décompte. **Attendu** : le complément à charge du locataire apparaît, le détail saisi figure au courrier.
26. Tableau de bord, sur un impayé, **Relance** puis *Rappel amiable*. **Attendu** : PDF au ton courtois. Relancer à nouveau, *Mise en demeure* : le ton change, le délai de quinze jours et la mention du recommandé apparaissent.

### 2.6 Fin de bail

27. **Baux**, poser une date de sortie en milieu de mois. **Attendu** : la dernière échéance passe au prorata.
28. Documents, **Préparer la restitution**, ajouter une retenue. **Attendu** : le solde à restituer diminue, la date limite est à un mois (état des lieux conforme) ou deux mois (case décochée).
29. Éditer le **courrier de restitution**. **Attendu** : le décompte est détaillé, la date limite correspond à l'écran.

### 2.7 Dépenses et pièces jointes

30b. **Bilan**, saisir une dépense de travaux. **Attendu** : elle apparaît dans la liste, le résultat de l'année baisse d'autant, et la rubrique 2044 correspondante s'affiche dans « Pour votre déclaration ».
30c. Saisir une dépense marquée récupérable, rattachée à un logement. Puis, dans Documents du bail, **Reprendre les dépenses récupérables**. **Attendu** : le montant et le détail se remplissent, et il reste à confirmer.
30d. **Parc**, ajouter un fichier (PDF ou photo) à un logement. **Attendu** : il apparaît dans la liste avec son poids ; le bouton Ouvrir l'affiche dans un nouvel onglet.
30e. Ajouter une photo depuis une pièce d'un état des lieux, sur téléphone de préférence. **Attendu** : la photo est compressée (poids affiché bien inférieur à l'original).
30f. **Réglages**, sauvegarder les pièces jointes, puis effacer un fichier et restaurer ce second fichier de sauvegarde. **Attendu** : le fichier revient.

### 2.8 Parc, rappels, bilan

30. **Parc**, ajouter un rappel d'entretien daté dans moins de deux mois. **Attendu** : il remonte sur le tableau de bord avec le nombre de jours restants.
31. Cliquer **Fait**. **Attendu** : la date est repoussée d'un an si le cycle est annuel, le rappel disparaît si vous aviez choisi « une seule fois ».
32. **Bilan**, changer d'année. **Attendu** : appelé, encaissé, impayé et taux d'encaissement cohérents avec les loyers. Exporter le CSV et l'ouvrir dans un tableur.

### 2.9 Sauvegarde

33. **Réglages** : vérifier le nombre de modifications depuis la dernière sauvegarde.
34. **Sauvegarder maintenant**. **Attendu** : un fichier JSON daté, le compteur revient à zéro, le statut passe à « aujourd'hui ».
35. Charger ce fichier avec **Restaurer une sauvegarde**. **Attendu** : un récapitulatif (biens, baux, quittances) s'affiche **avant** toute modification, et il faut confirmer.
36. Essayer de restaurer un fichier qui n'est pas une sauvegarde. **Attendu** : refus propre, données intactes.
37. Laisser l'application de côté deux semaines, ou tricher en modifiant la date du système. **Attendu** : un bandeau ambre réclame une sauvegarde sur le tableau de bord.

### 2.10 Synchronisation

Uniquement si un serveur est relié. La recette détaillée est au chapitre 9 de `INFRASTRUCTURE.md` ; l'essentiel :

38. Modifier sur un appareil, recharger sur l'autre. **Attendu** : la modification est reprise.
39. Modifier des deux côtés sans synchroniser. **Attendu** : la fenêtre de conflit laisse choisir, et rien n'est écrasé en silence.
40. Se connecter avec un second compte de test. **Attendu** : registre vide. C'est le test d'isolation, à refaire après toute modification du schéma.

---

## 3. Contrôles d'affichage

À faire une fois par version, sur chaque écran principal.

- **Téléphone** : largeur 375 px. Les tableaux défilent dans leur cadre, jamais la page entière. Aucun bouton sous 44 px de haut. L'état des lieux est confortable à remplir d'une main.
- **Mode sombre** : basculer le réglage du système. Tous les boutons restent visibles, y compris les désactivés et les secondaires ; aucun texte gris sur gris.
- **Clavier seul** : parcourir un écran à la touche Tab. Le focus est toujours visible, et l'ordre suit la lecture.
- **Impression** : imprimer un PDF généré en noir et blanc. Tout doit rester lisible : les documents n'utilisent aucune couleur.

---

## 4. Avant chaque mise en ligne

1. Les cinq suites automatisées sont vertes.
2. La recette manuelle est passée au moins sur la partie modifiée.
3. Le numéro de cache dans `sw.js` a été incrémenté si `index.html` a changé.
4. Une sauvegarde de vos données réelles a été prise avant de déployer.
5. Après déploiement : recharger deux fois (la première met le cache à jour), puis vérifier qu'un ancien jeu de données s'ouvre toujours correctement.

---

## 5. Ce que les tests ne couvrent pas

La conformité juridique des documents n'est pas testable automatiquement : le bail, les courriers et le décompte de charges doivent être relus une fois par un juriste, et à nouveau à chaque changement de réglementation.

La génération PDF est vérifiée sur le contenu et le nombre de pages, pas sur l'esthétique : ouvrez un document de chaque type à l'oeil avant une version importante.

Enfin, aucun test ne protège d'un navigateur qui efface ses données de site. Seule la sauvegarde le fait.
