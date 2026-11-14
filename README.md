# MELÓMANE — Starter 0.1

Premier socle de plateforme musicale : frontend HTML/CSS/JS, API Node.js/Express et PostgreSQL.

## Fonctionnalités incluses

- Identité visuelle éditoriale luxe, responsive.
- Création de compte et connexion.
- Rôles `user` et `admin` (un nouvel inscrit est toujours `user`).
- Dépôt audio privé, avec limite de 50 Mo.
- Choix du modèle de droits : artiste conserve ses droits / licence de diffusion à MELÓMANE.
- Validation ou refus des propositions par un administrateur.
- Publication dans le catalogue après approbation.
- Lecture des titres publiés pour les utilisateurs connectés.

## Prérequis

- Node.js 20+
- PostgreSQL 15+

## Installation locale

1. Créer une base PostgreSQL et un utilisateur dédiés.
2. Copier `.env.example` vers `.env` et renseigner `DATABASE_URL` et un `SESSION_SECRET` long et aléatoire.
3. Exécuter le schéma :

   ```bash
   psql "$DATABASE_URL" -f schema.sql
   ```

4. Installer les dépendances et démarrer :

   ```bash
   npm install
   npm run dev
   ```

5. Ouvrir http://localhost:3000

## Créer le premier administrateur

Par sécurité, l'inscription publique ne permet jamais de choisir le rôle `admin`.

Créer un compte normalement, puis promouvoir manuellement ce compte depuis une session SQL :

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'ton-adresse@example.com';
```

Déconnecte-toi puis reconnecte-toi pour renouveler la session et charger le rôle.

## Points de sécurité à traiter avant une mise en production

Ce dépôt est un prototype de départ, pas un service prêt à accueillir de vrais utilisateurs.

- Utiliser HTTPS, un secret de session fort et des secrets gérés hors du dépôt.
- Configurer correctement `TRUST_PROXY` si l'application est derrière un reverse proxy.
- Ajouter une protection CSRF adaptée aux formulaires/session, une validation MIME réelle du contenu audio et une analyse antivirus.
- Stocker les fichiers dans un stockage privé objet (S3 compatible), pas sur le disque du serveur à long terme.
- Ajouter quotas, contrôle de débit spécifique aux dépôts, journaux d'audit et sauvegardes testées.
- Ajouter vérification e-mail, réinitialisation de mot de passe, suppression/export de compte et règles de modération.
- Faire valider les contrats et autorisations de diffusion par un juriste. Le choix dans le formulaire est une indication de workflow, pas un contrat de licence.
- Vérifier les droits sur les samples, beats, voix, compositions et enregistrements avant publication.
- Ajouter les contrôles d'abonnement, territoires et droits de diffusion avant d'ouvrir le streaming.
- Le lecteur est un lecteur web de prototype. CarPlay nécessitera une application iOS native autorisée par Apple et une intégration audio dédiée.

## Modèle de droits C

`artist_retains_rights` : l'artiste conserve ses droits et accorde une autorisation de diffusion à formaliser séparément.

`platform_license` : l'artiste souhaite accorder une licence de diffusion à MELÓMANE, selon des conditions contractuelles distinctes.

Dans les deux cas, l'équipe MELÓMANE doit vérifier l'autorisation avant de publier le morceau.
