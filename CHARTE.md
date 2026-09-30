# Charte graphique — « Registre »

Une application de gestion locative se manipule entre deux portes, souvent sur un téléphone, parfois dans un logement vide. La charte suit trois règles : lisible avant d'être jolie, un seul accent, et des chiffres qu'on lit d'un coup d'œil.

Tout est défini en variables CSS dans `index.html`, en tête de la feuille de style. Pour changer l'identité, il suffit de toucher ce bloc.

## Couleurs

Le fond est un papier légèrement chaud, jamais blanc pur : c'est ce qui repose l'œil sur une longue saisie. Les surfaces (panneaux, champs) remontent vers le blanc pour créer la profondeur, sans ombre appuyée.

| Rôle | Variable | Clair | Sombre |
|---|---|---|---|
| Fond de page | `--fond` | `#f4f3ef` | `#121614` |
| Surface | `--surface` | `#ffffff` | `#1a201d` |
| Surface secondaire (champs) | `--surface-2` | `#faf9f5` | `#212823` |
| Encre principale | `--encre` | `#16201d` | `#e9eeeb` |
| Encre secondaire | `--encre-2` | `#4c5a55` | `#adb9b4` |
| Encre tertiaire (métadonnées) | `--encre-3` | `#7a8781` | `#8b9792` |
| Filets | `--trait` / `--trait-fort` | `#e3e0d8` / `#cbc7bb` | `#2b332f` / `#3d4741` |
| Accent | `--accent` | `#0e6a57` | `#5fc0a6` |
| Alerte (retard, impayé) | `--alerte` | `#9a3324` | `#e79a8a` |
| Attention (sauvegarde, plafond) | `--attention` | `#8a5a12` | `#d9b168` |

Le vert est le seul accent : boutons principaux, statut payé, focus. Le rouge n'apparaît que pour un vrai problème d'argent, l'ambre pour un avertissement qui n'est pas une faute. Aucune couleur ne porte seule une information : un statut a toujours son libellé écrit.

Le mode sombre suit la préférence du système, sans réglage à faire.

## Typographie

Deux familles, chargées depuis Google Fonts.

**Instrument Serif** pour les titres de vue, les montants et les noms de pièces. Elle donne le ton « document » sans tomber dans le juridique poussiéreux.

**Instrument Sans** pour toute l'interface : libellés, tableaux, boutons, formulaires.

L'échelle : 34 px pour un titre de vue (28 px sur mobile), 24 px pour un titre de dialogue ou un mois, 16 px pour un titre de panneau, 15,5 px pour le texte courant, 14,5 px dans les tableaux, 13 px pour les libellés de champ, 12,5 px pour les métadonnées.

Les montants et les index de compteurs utilisent `font-variant-numeric: tabular-nums` : les colonnes de chiffres s'alignent, une erreur de saisie se voit.

## Rythme et formes

Espacements par multiples de 4 : `--e1` à `--e6` (4, 8, 12, 20, 32, 48 px). Rayons : 8 px pour les champs, 12 px pour un dialogue sur mobile, 18 px pour les panneaux, complètement arrondi pour les boutons et les étiquettes.

Une seule ombre, très discrète, pour décoller les panneaux du papier. Les dialogues en reçoivent une plus marquée, parce qu'ils flottent vraiment.

## Composants

**Boutons.** Trois niveaux seulement : plein (l'action principale de l'écran, une seule par bloc), contour (les actions secondaires), discret (les actions destructrices ou rares). Hauteur minimale de 44 px partout, y compris sur ordinateur : c'est la taille d'une pastille de doigt.

**Panneaux.** Chaque écran est une pile de panneaux titrés. Un panneau = un sujet = une action.

**Tableaux.** Filets horizontaux uniquement, en-têtes en petite capitale douce, nombres à droite. Sur mobile, le tableau défile horizontalement dans son propre conteneur, jamais la page.

**Étiquettes de statut.** Vert pour payé, ambre neutre pour partiel, rouge pour en attente ou en retard.

**Bandeau.** Fond ambre, réservé à ce qui doit être fait maintenant : sauvegarde trop ancienne, dépôt de garantie au-dessus du plafond.

**Champs.** Fond légèrement enfoncé, bordure qui se teinte à la mise au point avec un halo vert de 3 px. Un champ désactivé est pâli, jamais grisé au point d'être illisible : un état des lieux clôturé doit rester lisible.

## Navigation

Un rang d'onglets arrondis, avec une icône au trait de 1,6 px. Il reste collé en haut et défile horizontalement sur mobile. L'onglet actif s'inverse en encre pleine, sans dépendre de la couleur.

## Accessibilité

Contrastes vérifiés sur fond clair et sombre pour le texte courant. Le focus clavier est toujours visible, en vert, avec un décalage de 2 px. `prefers-reduced-motion` coupe les transitions. Les icônes sont décoratives et portent `aria-hidden`.

## Documents PDF

Les PDF ne suivent pas cette charte : ils sont en noir sur blanc, en Helvetica, sans aplat de couleur. Un bail ou une quittance doit rester lisible après une photocopie, un fax d'huissier ou une impression en niveaux de gris.
