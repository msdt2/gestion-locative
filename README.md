# Gestion locative — socle v1

Application web d'un seul fichier pour gérer un parc locatif en direct : suivi des loyers, quittances, baux et états des lieux.

Aucun serveur, aucun compte, aucune base de données. **Les données restent dans le navigateur de la personne qui utilise l'application** (stockage local). Rien n'est envoyé ni stocké dans ce dépôt.

## Ce que fait l'application

- Parc : biens, lots, locataires, baux (location nue, meublée, colocation à bail unique)
- Échéances de loyer générées automatiquement chaque mois depuis les baux, avec prorata d'entrée et de sortie
- Pointage des paiements, suivi des impayés et des retards
- Quittances et reçus partiels en PDF, numérotés en continu, jamais supprimés (annulation tracée)
- Préparation de l'e-mail au locataire, avec contrôle de son accord pour l'envoi dématérialisé
- Génération du bail, de la liste des annexes à joindre et des états des lieux d'entrée et de sortie
- États des lieux d'entrée et de sortie remplis directement en ligne, la sortie reprenant les états relevés à l'entrée, puis clôture qui fige le document
- Révision annuelle du loyer sur l'indice de référence des loyers, avec historique et courrier
- Régularisation annuelle des charges et décompte à remettre au locataire
- Relances d'impayés par paliers : rappel amiable puis mise en demeure
- Rappels d'entretien et d'échéances légales par lot, remontés sur le tableau de bord
- Fin de bail : retenues justifiées, calcul du solde et courrier de restitution du dépôt de garantie, avec date limite légale
- Dépenses et travaux par logement, avec catégories, dépenses récupérables et regroupement par rubrique de la déclaration 2044
- Pièces jointes conservées hors ligne : diagnostics et factures par logement, dossier du bail, photos par pièce dans l'état des lieux
- Bilan annuel par logement avec résultat de trésorerie, exportable en CSV
- Export CSV des encaissements, sauvegarde et restauration au format JSON, avec suivi de l'ancienneté de la dernière sauvegarde

Le bail reprend le plan et les mentions du contrat type du décret n° 2015-587 du 29 mai 2015, modifié par le décret n° 2026-596 du 6 juillet 2026 (contrats conclus ou renouvelés à compter du 1er octobre 2026). **À faire relire par un juriste avant tout usage réel.**

## Mise en ligne sur GitHub Pages

1. Créer un dépôt, par exemple `gestion-locative`.
2. Y déposer les fichiers de ce dossier à la racine : `index.html`, `manifest.webmanifest`, `sw.js`, `icone-192.png`, `icone-512.png`.
3. Dans le dépôt : **Settings → Pages**, source « Deploy from a branch », branche `main`, dossier `/ (root)`, puis enregistrer.
4. Après une ou deux minutes, l'application est à l'adresse `https://<votre-compte>.github.io/gestion-locative/`.

Cette adresse ne change plus : les données saisies dans le navigateur y restent d'une session à l'autre.

Le dépôt peut rester public sans risque, puisqu'il ne contient que du code. GitHub Pages n'est disponible pour les dépôts privés qu'avec un compte payant.

## Installation sur téléphone ou ordinateur

L'application est installable (PWA) : ouvrir l'adresse, puis « Ajouter à l'écran d'accueil » sur mobile, ou l'icône d'installation dans la barre d'adresse sur ordinateur. Elle fonctionne ensuite hors ligne.

## Synchronisation entre appareils

Par défaut, l'application fonctionne sans serveur. Pour retrouver le parc sur plusieurs appareils et cesser de dépendre du cache du navigateur, reliez un projet Supabase : la marche à suivre complète, le script SQL et la recette sont dans `INFRASTRUCTURE.md`. Le client est déjà intégré, il ne demande que l'adresse du projet et sa clé publique, dans Réglages.

L'application reste locale d'abord : elle écrit dans le navigateur, puis pousse vers le serveur. Une coupure de réseau n'interrompt jamais une saisie.

## Sauvegardes

Les données vivent dans le navigateur. Elles disparaissent si l'historique et les données de site sont effacés, ou si le navigateur est réinstallé.

**Réglages → Sauvegarder maintenant** produit un fichier JSON daté, à conserver ailleurs. **Restaurer une sauvegarde** le relit, après un récapitulatif de ce qu'il contient. L'application indique depuis combien de temps vous n'avez pas sauvegardé et affiche un bandeau quand cela devient risqué.

Sur Chrome et Edge, **Lier un fichier de sauvegarde** choisit un fichier de votre disque une fois pour toutes : il est réécrit automatiquement quelques secondes après chaque modification. Safari ne le permet pas ; le téléchargement manuel reste la solution, par exemple vers un dossier iCloud Drive.

Pour retrouver les mêmes données sur plusieurs appareils, il faudra un serveur de synchronisation : c'est l'étape suivante, déjà prévue dans le code (`initStockage`).

## Mettre à jour

Remplacer `index.html` dans le dépôt. Au rechargement suivant, la nouvelle version est prise en compte (le service worker sert le réseau en premier). Les données déjà saisies ne sont pas touchées.

En cas de changement du format de données, incrémenter `CACHE` dans `sw.js` pour forcer le renouvellement du cache.

## Documentation

| Fichier | Contenu |
|---|---|
| `INFRASTRUCTURE.md` | Choix d'hébergement, mise en place de Supabase, sécurité, exploitation, bascule |
| `PROCEDURE-DE-TEST.md` | Recette automatisée et manuelle |
| `CHARTE.md` | Couleurs, typographie, composants |

## Tests

`PROCEDURE-DE-TEST.md` décrit la recette complète, automatisée et manuelle. Les scripts sont dans `tests/`.

## Identité visuelle

Les couleurs, la typographie et les composants sont décrits dans `CHARTE.md` et définis en variables CSS en tête de `index.html`.

## Développement

Aucune dépendance, aucune compilation : ouvrir `index.html` dans un navigateur, ou servir le dossier localement.

```bash
python3 -m http.server 8080
```

Le service worker et l'installation nécessitent `http://localhost` ou du HTTPS.
