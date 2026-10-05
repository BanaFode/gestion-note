# Client — Gestion des notes

Interface React 19 construite avec Vite. Les écrans et les actions disponibles
dépendent du rôle connecté (administrateur, direction des études, direction de
la scolarité, enseignant ou élève).

## Démarrage local

1. Configurez et démarrez d’abord l’API en suivant les instructions de
   [`server/README.md`](../server/README.md).
2. Depuis le dossier `client`, installez les dépendances puis démarrez Vite :

   ```sh
   npm install
   npm run dev
   ```

3. Ouvrez l’adresse indiquée par Vite. Par défaut, l’API utilisée est
   `http://localhost:5000/api`.

Pour utiliser une autre adresse d’API, définissez `VITE_API_URL` dans un fichier
`.env` du client, par exemple :

```env
VITE_API_URL=http://localhost:5000/api
```

En développement, l’API accepte les ports locaux Vite de `5173` à `5199`.
Pour une autre origine ou en production, configurez `CLIENT_URL` dans le
`.env` du serveur.

## Vérifications

- `npm run lint` : analyse ESLint du client.
- `npm run build` : génération de la version de production dans `dist/`.
- `npm run preview` : prévisualisation locale du build.

Le guide fonctionnel destiné aux utilisateurs est intégré à l’application sous
**Guide d’utilisation** et présente le parcours correspondant au rôle connecté.
