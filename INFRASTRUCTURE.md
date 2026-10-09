# Infrastructure : sortir du navigateur

Aujourd'hui, les données vivent dans le navigateur. C'est pratique, c'est irréprochable côté RGPD, mais c'est fragile : un nettoyage d'historique et tout disparaît, et rien ne suit d'un appareil à l'autre. Ce document décrit l'infrastructure retenue, pourquoi, et comment la mettre en place.

L'application sait déjà s'y connecter : le client de synchronisation est écrit et testé (`tests/test-sync.js`). Il ne manque que le serveur et deux valeurs à coller dans les réglages.

---

## 1. Le principe retenu : local d'abord, serveur ensuite

Le serveur ne remplace pas le navigateur, il le double.

L'application continue d'écrire dans le navigateur à chaque modification, puis pousse vers le serveur quelques secondes plus tard. À l'ouverture, elle lit le serveur et reprend sa version si elle est plus récente.

Trois raisons de garder ce fonctionnement plutôt qu'un classique « tout sur le serveur » :

Un état des lieux se remplit dans un logement vide, parfois au sous-sol, souvent sans réseau. Avec le local d'abord, la saisie ne s'interrompt jamais et repart toute seule au retour du réseau.

Une panne du serveur, un impayé d'abonnement ou une erreur de ma part ne te coupent pas l'accès à ton parc.

Et le jour où tu changes d'hébergeur, les données sont déjà intégralement sur ta machine.

Le modèle de synchronisation est volontairement simple : **un enregistrement par utilisateur**, contenant tout son registre, avec un numéro de version. Avant d'écrire, l'application annonce la version qu'elle croit être la dernière ; si quelqu'un a écrit entre-temps, le serveur refuse et l'application te demande quoi garder. C'est suffisant pour un usage mono-utilisateur sur deux ou trois appareils, et ça évite d'écrire un schéma relationnel complet avant d'en avoir besoin.

Ce modèle atteindra ses limites le jour de l'espace locataire, où chaque locataire aura son propre compte et ne devra voir que ses quittances. Il faudra alors éclater le document en tables. La section 7 décrit cette bascule.

---

## 2. Le choix de l'hébergement

### Ce qui a été retenu : Supabase

C'est du PostgreSQL managé, avec authentification, stockage de fichiers et politiques de sécurité par ligne, interrogeable directement depuis une page statique. Pas de backend à écrire ni à maintenir, et le front reste sur GitHub Pages.

Le projet se crée en région Paris (`eu-west-3`), ce qui règle la question des transferts hors Union européenne. Et comme Supabase est open source et auto-hébergeable, le jour où tu veux tout rapatrier, c'est le même Postgres et la même API.

Le plan gratuit couvre largement ton usage : 500 Mo de base, 1 Go de fichiers, 5 Go de trafic sortant et 50 000 utilisateurs actifs par mois, avec deux projets actifs. Un parc de quelques logements représente quelques centaines de kilo-octets.

**Un piège à connaître** : sur le plan gratuit, un projet inactif pendant sept jours est mis en pause, et il n'y a pas de sauvegarde automatique. La section 6 donne la parade pour la pause (un réveil automatique) et la sauvegarde (la tienne, qui existe déjà).

Le plan Pro est à 25 dollars par mois. Il devient justifié le jour où d'autres bailleurs utilisent l'outil, pour les sauvegardes automatiques et la fin de la mise en pause. Vérifie les tarifs et les limites avant de t'engager, ils changent régulièrement.

### L'alternative sérieuse : PocketBase sur ton propre serveur

Un binaire unique, en Go, qui embarque base SQLite, authentification, stockage de fichiers et règles d'accès. Il tourne sur le plus petit VPS venu, pour quelques euros par mois, chez un hébergeur français (Scaleway, OVHcloud, Infomaniak).

Les avantages : données en France chez un hébergeur que tu choisis, coût fixe et faible, aucune dépendance à un service tiers, sauvegarde aussi simple que copier un fichier. C'est le choix de la souveraineté, et il te parle probablement plus qu'à d'autres.

Les inconvénients sont réels : c'est une machine que tu dois tenir à jour, surveiller et sauvegarder. Certificat TLS, mises à jour de sécurité, supervision : du travail d'exploitation récurrent, sur un projet qui est déjà un troisième métier.

### Ce que j'ai écarté

**Firebase** : hébergement hors Union européenne par défaut, et un modèle de données qui ne correspond pas à des écritures comptables.

**Un backend Node maison** : tu sais l'écrire, mais tu devrais alors maintenir l'authentification, la réinitialisation des mots de passe, la limitation de débit, les migrations. Tout ce temps ne va pas dans le produit.

**Cloudflare D1 ou Workers** : séduisant et peu cher, mais la localisation des données est moins nette à expliquer à un futur client, et l'authentification reste à écrire.

### Ma recommandation

Commence par **Supabase en région Paris, plan gratuit**, avec le réveil automatique décrit plus bas. Tu auras la synchronisation ce week-end, sans serveur à administrer. Si l'outil s'ouvre à d'autres bailleurs, passe au plan Pro ; si tu veux rapatrier, le chemin vers l'auto-hébergement est ouvert.

---

## 3. Mise en place de Supabase, pas à pas

### 3.1 Créer le projet

1. Créer un compte sur supabase.com, puis **New project**.
2. Nom : `registre-gestion-locative`. **Region : Europe (Paris)**. Choisir un mot de passe de base de données long et le ranger dans ton gestionnaire de mots de passe : il ne sert pas à l'application, mais il est nécessaire pour les restaurations.
3. Attendre deux minutes la fin de la création.

### 3.2 Créer la table et ses règles

Ouvrir **SQL Editor** et exécuter ce script en une fois.

```sql
-- Un registre par utilisateur, versionné.
create table public.registres (
  user_id   uuid primary key references auth.users on delete cascade,
  donnees   jsonb not null default '{}'::jsonb,
  version   integer not null default 0,
  maj       timestamptz not null default now(),
  creele    timestamptz not null default now()
);

-- Chacun ne voit et n'écrit que sa propre ligne.
alter table public.registres enable row level security;

create policy "lecture de son registre"
  on public.registres for select
  using (auth.uid() = user_id);

create policy "creation de son registre"
  on public.registres for insert
  with check (auth.uid() = user_id);

create policy "mise a jour de son registre"
  on public.registres for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Garde-fou : la version ne peut qu'augmenter, jamais reculer.
create or replace function public.verifie_version()
returns trigger language plpgsql as $$
begin
  if new.version <= old.version then
    raise exception 'version obsolete';
  end if;
  new.maj := now();
  return new;
end $$;

create trigger registres_version
  before update on public.registres
  for each row execute function public.verifie_version();
```

La sécurité au niveau des lignes est le point critique : sans elle, n'importe quel utilisateur connecté lirait les registres des autres. Vérifie que le cadenas **RLS enabled** apparaît bien sur la table dans l'onglet Table Editor.

### 3.3 Configurer l'authentification

Dans **Authentication → Providers**, laisser **Email** activé et désactiver tout le reste.

Dans **Authentication → Sign In / Providers → Email** : garder **Confirm email** activé. Tu recevras un courriel de confirmation à la création du compte, et il faudra cliquer avant de pouvoir te connecter.

Dans **Authentication → URL Configuration**, mettre comme Site URL l'adresse de ton application : `https://msdt2.github.io/gestion-locative/`.

Pour un usage à plusieurs plus tard, désactive **Enable sign-ups** une fois ton compte créé : tu créeras les comptes à la main, et personne ne pourra s'inscrire tout seul sur ton projet.

### 3.4 Relier l'application

1. Dans **Project Settings → API**, copier **Project URL** et la clé **anon public**.
2. Dans l'application, **Réglages → Synchronisation entre appareils** : coller les deux valeurs, **Enregistrer l'adresse**.
3. Saisir ton adresse électronique et un mot de passe, puis **Créer le compte**. Confirmer le courriel reçu.
4. Revenir, **Se connecter**.

À la première connexion, le contenu de ce navigateur est envoyé au serveur : commence donc par l'appareil qui contient tes vraies données.

La clé anon est publique par conception : elle ne donne accès à rien sans compte, c'est la sécurité au niveau des lignes qui protège les données. Ne confonds jamais avec la clé `service_role`, qui contourne toutes les règles et ne doit jamais sortir d'un serveur.

### 3.5 Vérifier

Sur le second appareil : ouvrir l'application, coller les deux mêmes valeurs, se connecter. Les données apparaissent.

Modifier quelque chose sur le téléphone, attendre dix secondes, recharger sur l'ordinateur : la modification est là.

Couper le réseau, pointer un loyer, le remettre : la synchronisation repart et le compteur « À envoyer » retombe à zéro.

---

## 4. Ce que fait l'application une fois reliée

Elle enregistre localement à chaque modification, puis pousse vers le serveur quatre secondes plus tard, en groupant les modifications rapprochées.

Le panneau des réglages montre en permanence la version du serveur et le nombre de modifications en attente d'envoi. En haut de l'écran, l'état indique « synchronisé », « synchronisation… » ou « synchronisation impossible ».

Si deux appareils ont divergé, elle ne tranche pas toute seule : elle affiche les deux dates et te demande laquelle garder, en te conseillant de sauvegarder avant.

Si le jeton d'accès a expiré, elle le renouvelle sans rien te demander.

La configuration du projet (adresse et clé) n'est jamais envoyée au serveur : elle reste locale, ce qui évite qu'un registre restauré d'ailleurs vienne reconfigurer l'application.

**Les pièces jointes restent locales à ce stade.** Les photos d'état des lieux et les diagnostics ne montent pas encore dans Supabase Storage : c'est l'étape suivante, décrite en 7.1. En attendant, utilise le bouton de sauvegarde des pièces jointes.

---

## 5. Sécurité

La sécurité au niveau des lignes est la seule barrière entre les registres de deux utilisateurs : c'est le point à tester en premier et à retester après toute modification du schéma. Pour le vérifier, crée un second compte, connecte-toi avec, et constate qu'il voit un registre vide.

Le mot de passe de la base, celui de l'interface Supabase et la clé `service_role` ne doivent exister que dans ton gestionnaire de mots de passe. Active l'authentification à deux facteurs sur ton compte Supabase.

Les jetons de session sont rangés dans le stockage local du navigateur, ce qui est la pratique courante, mais signifie qu'une faille d'injection de script sur la page les exposerait. L'application n'ayant aucune dépendance externe en JavaScript, la surface est minuscule ; garde cette discipline, et n'ajoute pas de bibliothèque chargée depuis un CDN sans raison impérieuse.

Côté RGPD, rien ne change dans ton rôle : pour les données des locataires, tu restes sous-traitant pour le compte du bailleur, et Supabase devient ton sous-traitant ultérieur. Il faudra le mentionner dans le contrat de sous-traitance le jour de l'ouverture à d'autres, et signer leur DPA.

---

## 6. Exploitation

**Le réveil automatique.** Sur le plan gratuit, un projet inactif sept jours est mis en pause. Une action GitHub qui interroge la base tous les trois jours suffit à l'éviter. À créer dans `.github/workflows/reveil.yml`, avec l'URL du projet et la clé anon dans les secrets du dépôt :

```yaml
name: Réveil Supabase
on:
  schedule:
    - cron: "0 6 */3 * *"
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Interroger la base
        run: |
          curl -sS -o /dev/null -w "%{http_code}\n" \
            "${{ secrets.SUPABASE_URL }}/rest/v1/registres?select=version&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON }}"
```

Un code 200 ou 401 signifie que le projet répond, donc qu'il ne dort pas. Les actions planifiées de GitHub sont parfois désactivées après soixante jours d'inactivité du dépôt : si tu ne pousses rien pendant deux mois, relance-la à la main.

**Les sauvegardes.** Le plan gratuit n'en fait aucune. Trois filets, à cumuler : la copie locale dans chaque navigateur utilisé, l'export JSON que tu ranges hors du navigateur une fois par mois, et pour les fichiers joints leur export dédié. Sur le plan Pro, Supabase ajoute des sauvegardes quotidiennes, ce qui ne dispense pas de l'export.

**La surveillance.** Une fois par mois, ouvre le tableau de bord Supabase et regarde la taille de la base et le trafic. Tant que tu es seul, tu seras à quelques pour cent des limites ; une montée brutale signalerait une boucle de synchronisation, qu'il faudrait corriger.

**Les mises à jour de l'application.** Elles ne touchent pas aux données : le format est le même côté serveur et côté navigateur. Après chaque déploiement, recharge deux fois et vérifie que la version du serveur n'a pas bougé toute seule.

---

## 7. La suite

### 7.1 Les pièces jointes sur le serveur

Créer un bucket privé `pieces` dans **Storage**, avec des politiques limitant chaque utilisateur à son propre dossier :

```sql
create policy "lecture de ses fichiers"
  on storage.objects for select
  using (bucket_id = 'pieces' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "depot de ses fichiers"
  on storage.objects for insert
  with check (bucket_id = 'pieces' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "suppression de ses fichiers"
  on storage.objects for delete
  using (bucket_id = 'pieces' and (storage.foldername(name))[1] = auth.uid()::text);
```

Côté application, chaque fichier sera déposé sous `{user_id}/{id_piece}` au moment de l'ajout, et retéléchargé à la demande s'il manque localement. Le travail est d'une journée environ, avec la gestion du mode hors ligne (déposer plus tard ce qui n'a pas pu partir).

Attention à la limite de 1 Go du plan gratuit : à quelques centaines de kilo-octets par photo compressée, cela représente quelques milliers de photos, mais un état des lieux complet en photographie vite plusieurs dizaines.

### 7.2 L'espace locataire

C'est la vraie bascule. Il faudra éclater le document unique en tables (`biens`, `lots`, `baux`, `echeances`, `quittances`, `pieces`), car un locataire doit pouvoir lire ses quittances sans voir le reste du parc. Les règles d'accès deviendront alors des jointures : un locataire voit les quittances dont le bail le désigne.

Tant que cette bascule n'est pas faite, ne promets pas d'espace locataire : c'est une réécriture du modèle de données, pas un écran de plus.

### 7.3 Le rapprochement bancaire

Il demande un agrégateur agréé DSP2 et un secret d'API qui ne doit jamais se trouver dans une page web. Il faudra donc un vrai morceau de serveur, par exemple une Edge Function Supabase, qui détient le secret et expose un résultat déjà filtré. À traiter après l'espace locataire.

---

## 8. Procédure de bascule, le jour J

1. Dans l'application, **Sauvegarder maintenant** et **Sauvegarder les pièces jointes**. Ranger les deux fichiers ailleurs que dans le dossier de téléchargement.
2. Créer le projet Supabase, exécuter le script SQL, configurer l'authentification (sections 3.1 à 3.3).
3. Sur l'appareil qui contient les vraies données : coller l'adresse et la clé, créer le compte, confirmer le courriel, se connecter.
4. Vérifier dans le Table Editor de Supabase que la ligne existe et que `version` vaut 1.
5. Sur le second appareil : même configuration, se connecter, vérifier que le parc apparaît.
6. Dérouler la recette manuelle de `PROCEDURE-DE-TEST.md`, section 2.9, pour la sauvegarde, puis les points de la section 9 ci-dessous.
7. Mettre en place le réveil automatique (section 6).
8. Désactiver les inscriptions dans Supabase.

---

## 9. Recette de la synchronisation

À dérouler après la bascule, puis après toute modification du client de synchronisation.

1. Connexion avec un mauvais mot de passe. **Attendu** : message d'erreur explicite, aucune session ouverte.
2. Première connexion. **Attendu** : la ligne apparaît côté Supabase, version 1, et le compteur « À envoyer » retombe à zéro.
3. Modifier une donnée, attendre dix secondes. **Attendu** : la version du serveur passe à 2.
4. Modifier sur l'appareil A, recharger l'appareil B. **Attendu** : B reprend la version de A.
5. Modifier des deux côtés sans synchroniser, puis synchroniser. **Attendu** : la fenêtre de conflit propose les deux versions, et celle que tu choisis l'emporte.
6. Couper le réseau, modifier, rétablir. **Attendu** : l'envoi repart tout seul, sans perte.
7. Se déconnecter. **Attendu** : les données restent consultables hors ligne dans ce navigateur.
8. Créer un second compte de test et se connecter avec. **Attendu** : registre vide. C'est le test d'isolation, le plus important de tous.
9. Supprimer ensuite ce compte de test dans Supabase.

Les points 1 à 7 sont également couverts automatiquement par `tests/test-sync.js`, contre un serveur simulé. Le point 8 ne peut se vérifier que contre le vrai serveur.
