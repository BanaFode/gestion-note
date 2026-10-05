# Serveur Gestion des Notes

## Déploiement Railway avec le client Vercel

Configurez ces variables dans Railway :

```env
NODE_ENV=production
CLIENT_URL=https://gestion-note-e8kc7iwg4-banafode24-6170.vercel.app
```

Le serveur utilise cette URL Vercel par défaut en l’absence de `CLIENT_URL`.
Pour les prévisualisations Vercel, configurez leur URL exacte dans `CLIENT_URL`.
L’URL publique de l’API est `https://gestion-note-backend-production.up.railway.app`.

## Premier démarrage

1. Copiez `.env.example` vers `.env`, puis configurez MongoDB et un secret JWT aléatoire.
2. Renseignez temporairement `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`. Ce compte est le premier compte de l’application et son rôle est `ADMIN` (Administrateur général). Le mot de passe initial doit contenir au moins 12 caractères.
3. Depuis le dossier `server`, lancez `npm run bootstrap:admin` une seule fois, avant toute création d’autre compte.
4. Supprimez ensuite `ADMIN_PASSWORD` du fichier `.env`, puis lancez `npm run dev`.

Le bootstrap refuse une base qui contient déjà des utilisateurs sans ADMIN et n’écrase aucun compte. Le premier Administrateur général devra changer son mot de passe après sa première connexion.

## Routes d’authentification et comptes

- `POST /api/auth/login` : connexion avec email et mot de passe.
- `POST /api/auth/change-password` : changement du mot de passe courant.
- `POST /api/auth/forgot-password` et `POST /api/auth/reset-password` : demande et confirmation d’une réinitialisation par lien email à usage unique (valable une heure).
- `POST /api/auth/register-student` : création de compte élève après approbation de son inscription.
- L’inscription autonome d’un élève vérifie le matricule, l’inscription approuvée et l’adresse email enregistrée dans son dossier.
- `GET /api/students/me` : profil et inscriptions approuvées de l’élève connecté.
- `GET /api/users` : liste des comptes, ADMIN uniquement.
- `POST /api/users` : création d’un compte du personnel par un ADMIN. La réponse contient le mot de passe temporaire, à transmettre de façon sécurisée.
- `PATCH /api/users/:id/status` : activation, blocage ou désactivation par un ADMIN.
- `POST /api/users/teachers` : création d’un compte enseignant par le Directeur des études.
- `GET /api/users/teachers` : liste des comptes enseignants actifs, ADMIN ou Directeur des études.
- `/api/subjects` et `PUT /api/subjects/configurations` : matières et paramètres par année, programme et niveau. Le barème d’une configuration ne peut plus changer une fois une évaluation créée pour cette matière.
- `PATCH /api/programs/:id/status` et `PATCH /api/classes/:id/status` : activation ou désactivation des référentiels par l’ADMIN ou le Directeur des études; les changements sont audités.
- `/api/academic-settings` : barème global, seuil d’admission et règles de calcul par année, programme et niveau.
- `/api/teaching-assignments` : affectations aux enseignants ; un enseignant ne voit que les siennes.
- `/api/evaluations` : évaluations `NORMAL` ou `RETAKE` liées à une affectation.
- `PATCH /api/evaluations/:id/close` : clôture d’une évaluation par le Directeur des études, avec audit.
- `GET /api/evaluations/:id/roster` : liste des élèves approuvés de la classe, visible au Directeur des études et à l’enseignant affecté.
- `/api/evaluations/:id/grades` et `/api/evaluations/:id/submit` : saisie et soumission des notes par l’enseignant affecté.
- `/api/grades/:id/review` et `/api/grades/:id/lock` : contrôle et verrouillage par le Directeur des études.
- `POST /api/grades/:id/correction-requests` : demande motivée de réouverture d’une note verrouillée par le Directeur des études.
- `GET /api/grades/correction-requests` et `PATCH /api/grades/:id/correction-requests/:requestId/review` : file des demandes réservée à l’ADMIN; l’autorisation rouvre la note à l’enseignant affecté, le refus la laisse verrouillée, et chaque décision est auditée.
- `/api/results/my` : résultats de l’élève connecté ; les résultats provisoires sont calculés avec les seules notes saisies, et les résultats définitifs exigent la validation complète.
- `POST /api/results/finalize` : validation et verrouillage en lot par le Directeur des études, limités à une année et éventuellement une classe.
- `GET /api/audit-logs` : journal des actions sensibles, ADMIN uniquement.
- `GET /api/dashboard/me` : indicateurs adaptés au rôle de l’utilisateur connecté.

Toutes les routes protégées utilisent un jeton `Bearer`. Les comptes bloqués ou désactivés ne peuvent pas se connecter. Les comptes avec `mustChangePassword` ne peuvent pas utiliser les routes métier avant d’avoir changé leur mot de passe.

### Envoi des liens de réinitialisation

Configurez `RESEND_API_KEY` et `MAIL_FROM` dans le `.env` du serveur. `MAIL_FROM` doit être une adresse autorisée par Resend. Le `.env.example` contient les deux variables à compléter. La demande affiche toujours la même réponse afin de ne pas révéler si une adresse est enregistrée.

Les règles de rattrapage ne sont pas calculées tant que leur formule officielle n’est pas définie. Un résultat associé à une évaluation de rattrapage reste provisoire ; le système ne remplace pas la note normale et ne combine pas les notes de sa propre initiative.
