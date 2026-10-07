# Règle qualité : tests obligatoires (demande du 07/10)

> « Les tests de contrôle de saisie de données pour éviter des plantages ou incohérences, tests d'ergonomie de page,
> tests de mise en page, tests de cohérence de données sont à ajouter pour les futurs développements : je veux un
> logiciel propre. »

Tout nouveau développement (écran, fenêtre, service, migration) est livré **avec** les tests ci-dessous, et le lot
n'est terminé que lorsque **tous** passent sur la base d'essai. Les contrôles généraux (familles 1 à 4) se relancent
d'une commande : `src/test/e2e/retours/lancer-controles.sh`.

## 1. Contrôle de saisie (« n'importe quoi dans un champ »)

| Niveau | Test | Ce qui est vérifié |
|---|---|---|
| Écran | `test-saisie-ecrans.js` | Valeurs absurdes **tapées au clavier** dans chaque champ de chaque écran et de chaque fenêtre de création (lettres, négatif, 31/02, apostrophe, balise, 3 000 caractères). Aucune erreur JavaScript, date impossible refusée, pas de lettres dans un nombre. Les écritures sont interceptées : rien n'est enregistré. |
| Lecture (API) | `test-saisie-api.js` | Toutes les lectures de l'API (relevées dans le code Java) reçoivent 9 jeux de valeurs absurdes : jamais d'erreur interne (HTTP 500), jamais plus de 30 s, **aucune table modifiée** (garde-fou : une lecture qui écrit est un défaut). |
| Enregistrement | `test-saisie-enregistrements.js` (+ un test par nouvel enregistrement) | Les valeurs impossibles sont **refusées avec un message** (nom vide, prix en lettres ou négatif, dates inversées, texte trop long pour la colonne) ; ce qui est accepté est enregistré tel quel. Données d'essai retirées. |

Côté serveur, utiliser `util.ControleSaisie` (montant, longueur, date) : le serveur ne compte jamais sur l'écran. Une
lecture ne doit jamais écrire (pas de `GET` qui crée, recalcule ou supprime).

## 2. Mise en page

`test-defilement-ecrans.js` : chaque grille de chaque écran et onglet reçoit 80 lignes factices ; la dernière doit
rester atteignable (défilement), visible et non recouverte. Fenêtre de 1366 × 768.

## 3. Ergonomie

`test-ergonomie-ecrans.js` : à 1366 × 768, aucun élément de barre d'outils coupé au bord, aucun libellé tronqué ou
sur deux lignes, aucun texte de bouton coupé. Pour un nouvel écran : textes d'aide (placeholders) dans les champs de
saisie, longueur maximale égale à celle de la colonne (`maxLength` + `enforceMaxLength`), nouveau design (thème
appliqué partout : `PrestigeAffichage.THEME_PARTOUT`, sauf écrans à dessin propre).

## 4. Cohérence des données

Chaque chiffre affiché est recoupé par une requête SQL indépendante dans le test e2e de l'écran (exemples :
`test-analyse-commande.js` — taux de rupture, invendus, quantité recommandée refaite à la main ;
`test-tableau-bord.js` — tuiles et cartes = base). Un nouvel indicateur sans recoupement n'est pas terminé.

## 5. Tests unitaires

La logique de calcul est écrite en classe pure (sans base), testée en JUnit 5 (`src/test/java`) ou `node --test`
(`outils/whatsapp-web`). Exemples : `Prevision`, `AlertesLigne`, `ControleSaisie`, `SaisieInvalide`,
`ModeleWhatsApp`, `regles.js`, `file.js`.

## Rappels permanents

- Jamais d'écriture sur la base de production ; les essais retirent leurs données.
- Pas de fenêtre surgissante pour les éditions : PDF dans un onglet.
- Aucun secret (jetons, mots de passe) ni texte de message dans les journaux ou renvoyé au navigateur.
