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
- Export CSV des encaissements, sauvegarde et restauration au format JSON

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

## Sauvegardes

Les données vivent dans le navigateur. Elles disparaissent si l'historique et les données de site sont effacés, ou si le navigateur est réinstallé.

**Réglages → Sauvegarder (fichier)** produit un fichier JSON à conserver ailleurs. **Restaurer une sauvegarde** le relit. À faire au moins une fois par mois, et avant tout nettoyage du navigateur.

Pour retrouver les mêmes données sur plusieurs appareils, il faudra un serveur de synchronisation : c'est l'étape suivante, déjà prévue dans le code (`initStockage`).

## Mettre à jour

Remplacer `index.html` dans le dépôt. Au rechargement suivant, la nouvelle version est prise en compte (le service worker sert le réseau en premier). Les données déjà saisies ne sont pas touchées.

En cas de changement du format de données, incrémenter `CACHE` dans `sw.js` pour forcer le renouvellement du cache.

## Développement

Aucune dépendance, aucune compilation : ouvrir `index.html` dans un navigateur, ou servir le dossier localement.

```bash
python3 -m http.server 8080
```

Le service worker et l'installation nécessitent `http://localhost` ou du HTTPS.
