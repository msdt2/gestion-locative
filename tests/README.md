# Tests automatisés

Ils chargent `index.html` dans un DOM simulé, cliquent comme un utilisateur, et vérifient l'état enregistré ainsi que les PDF produits.

## Lancer

```bash
npm install jsdom fake-indexeddb     # une seule fois, à la racine du dépôt
node tests/lancer-tout.js     # toutes les suites, avec détection des plantages
```

Le lanceur affiche une ligne par suite et sort en erreur si une seule n'est pas verte. Les PDF générés sont écrits dans `tests/sorties/` : ouvrez-en un pour contrôler la mise en page.

## Ce que couvre chaque fichier

| Fichier | Couverture |
|---|---|
| `test-app.js` | Parc, locataires, baux, génération des échéances, prorata d'entrée et de sortie, paiements partiels, quittances et reçus, numérotation, annulation, suppressions bloquées |
| `test-bail.js` | Types de bail, colocation, informations complémentaires, génération du bail, des annexes et du dossier complet |
| `test-edl.js` | Création, saisie au fil de l'eau, ajout de pièces, clôture, reprise des états d'entrée dans l'état des lieux de sortie |
| `test-sauvegarde.js` | Compteur de modifications, export daté, remise à zéro, affichage du statut |
| `test-gestion.js` | Révision IRL, régularisation des charges, relances par paliers, rappels d'entretien, retenues sur dépôt de garantie, bilan annuel |
| `test-depenses.js` | Saisie des dépenses, résultat annuel, rubriques 2044, export CSV, reprise des dépenses récupérables dans la régularisation |
| `test-ouverture.js` | Échéances du mois créées dès l'ouverture, démonstration accessible avec des données existantes |
| `test-suppression.js` | Suppression d'un bail : blocage par une quittance active, annulation, archivage, nettoyage complet |
| `test-sync.js` | Synchronisation serveur : connexion, premier envoi, envoi automatique, reprise d'une version distante, conflit, déconnexion. Tourne contre un faux PostgREST, sans réseau |
| `test-pieces.js` | Coffre à fichiers : dépôt, rattachement, sauvegarde, suppression. Demande `npm install fake-indexeddb`, et s'ignore proprement sans lui |

## Ajouter un test

Copiez un fichier existant : l'ossature (jsdom, stubs de `dialog` et de `Blob`, fonctions `byText`, `set`, `ok`) est identique partout. Un test se résume à cliquer, puis à comparer l'état enregistré à ce qu'on attend.
