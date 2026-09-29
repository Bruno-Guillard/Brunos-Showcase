# Bruno’s Showcase

Vitrine publique en lecture seule reliée à Folio.

## Ce qui est visible
- uniquement les objets placés dans `En vente`, `À vendre` ou `A vendre` ;
- nom de la montre ;
- description ;
- photos, dans leur ordre Folio.

Aucun prix d’achat, prix de vente, bénéfice, frais, trésorerie ou autre donnée privée n’est exposé par l’API de la vitrine.

## Mise en route
1. Dans Supabase > SQL Editor > New query, exécuter `SUPABASE-BRUNOS-SHOWCASE.sql` une seule fois.
2. Créer un nouveau dépôt GitHub, par exemple `Brunos-Showcase`.
3. Mettre tous les fichiers de ce dossier à la racine du dépôt.
4. GitHub > Settings > Pages > Deploy from a branch > `main` / `(root)`.
5. Ouvrir l’URL GitHub Pages.

La vitrine interroge Supabase au lancement, au retour sur la page et toutes les 20 secondes. Une montre déplacée hors de `En vente` / `À vendre` disparaît donc automatiquement de la vitrine.

La page contient aussi `noindex,nofollow` afin de demander aux moteurs de recherche de ne pas l’indexer. Cela ne constitue pas un contrôle d’accès : toute personne possédant l’URL peut ouvrir la vitrine.

## V1.1 — Titre d’annonce + Prix

Cette version n'affiche plus le nom interne Folio. Elle utilise uniquement :
- `listing_title` comme titre public ;
- `asking_price`, affiché sous le libellé **Prix** ;
- `description` ;
- les photos autorisées de la montre.

Avant de publier cette version :
1. exécuter `SUPABASE-V6.5-ANNONCES.sql` fourni avec Folio V6.5 ;
2. exécuter `SUPABASE-BRUNOS-SHOWCASE-V1.1.sql` dans Supabase > SQL Editor ;
3. remplacer ensuite les fichiers du dépôt GitHub `Brunos-Showcase`.
