# Pré-saisie des bons de livraison (phase 1)

Plan avoir du 08/11, point 6. Menu **GESTION DES COMMANDES > Pré-saisie des BL**, à côté de « Commande en cours ».

## À quoi ça sert

On préenregistre chaque BL reçu, une seule fois, pour qu'aucun employé ne le saisisse deux fois.

- Un BL pré-saisi est **« À saisir »**.
- Quand ce BL est créé depuis « Commande en cours » (même grossiste, même numéro), il passe à **« Traité »**. Il
  disparaît alors de la liste « À saisir ». On garde la date, l'opérateur et le lien vers le BL créé.
- Phase 1 (« pas encore actif ») : on saisit et on consulte. Rien ne change dans « Commande en cours ».
- Phase 2, après validation de la procédure : dans « Commande en cours », on choisira le BL pré-saisi au lieu de le
  ressaisir.

## Procédure

1. Ouvrir **Pré-saisie des BL**.
2. À gauche, remplir **Saisie du bon de livraison** :
   - grossiste ;
   - commande, facultative (seules les commandes en cours du grossiste sont proposées) ;
   - numéro du BL, N° de séquence (facultatif), date, montant HT, montant TVA. Ce sont les champs de la fenêtre de
     création du BL. Le TTC se calcule seul.
3. Cliquer **Enregistrer**. Le grossiste reste choisi pour enchaîner les BL du même grossiste.
4. Un même grossiste et un même numéro ne se pré-saisissent qu'une fois. Un doublon est refusé avec un message. Les
   majuscules et les espaces ne comptent pas. Le même numéro chez un autre grossiste est permis.
5. Un BL déjà créé dans Prestige est refusé : il n'y a rien à pré-saisir.

## Consulter

- Filtres : grossiste, état (À saisir, Traité, Supprimé, À saisir et traités), période sur la date du BL, numéro.
- Par défaut, la liste montre les BL « À saisir ».
- Le bandeau du bas donne le nombre de BL et les totaux HT, TVA et TTC des filtres.
- Un clic sur une ligne l'ouvre à gauche. Un BL « Traité » ou « Supprimé » s'affiche en lecture seule, avec son
  historique.

## Modifier ou supprimer

Seulement tant que le BL est « À saisir ». Aucune fenêtre ne s'ouvre : la confirmation se fait dans le bouton.

- **Modifier :** cliquer la ligne, corriger, puis **Enregistrer les modifications**. Le bouton devient « Confirmer la
  modification » (rouge) : cliquer de nouveau dans les 5 secondes.
- **Supprimer :** cliquer la ligne et saisir le motif (obligatoire). Cliquer **Supprimer**, puis « Confirmer la
  suppression ». La ligne reste en base, état « Supprimé », avec le motif. Le même BL peut ensuite être pré-saisi de
  nouveau.

## Droit

Nouveau privilège **P_SM_PRESAISIE_BL**. La migration le donne :

- aux rôles qui peuvent déjà créer un BL, c'est-à-dire ceux qui ont P_BL_MOBILE_SCANNER (droit exigé par la création
  du BL) ;
- aux profils pharmacien et administrateur ;
- au rôle du compte administrateur.

## Technique

- Table `t_presaisie_bl` (migration `V7.2.95__presaisie_bl.sql`).
  - L'unicité grossiste + numéro est garantie par un index unique.
  - Les lignes supprimées n'en font pas partie.
- API : `api/v1/presaisie-bl`.
  - `GET` (filtres `grossiste`, `etat`, `du`, `au`, `numero`), `POST`, `PUT {id}`, `POST {id}/suppression`.
  - `GET grossistes` et `GET commandes?grossiste=`.
- Passage à « Traité » : une seule écriture ajoutée à la fin de la création du BL (`OrderServiceImpl.creerBonLivraison`,
  route `commande/creerbl`). Le reste de la création ne change pas.
- Hors phase 1 :
  - un BL créé par un autre chemin que « Commande en cours » ne change pas la pré-saisie ;
  - un BL annulé ensuite ne remet pas sa pré-saisie « À saisir ».
- Tests :
  - `src/test/e2e/retours/test-presaisie-bl.js` (écran, rapprochement, bilan, droits) ;
  - `PresaisieBlReglesCoherenceTest` (5 000 saisies tirées au hasard).
