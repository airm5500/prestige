# Du serveur Prestige à la session de l'application mobile (21/11/2026)

Les demandes 66, 67/68, 70 et 71 sont faites, fusionnées dans l'intégration et réunies dans un seul paquet officine :

- **Fichier** : `prestige-officine-2026-11-21-2f609bc4a.war` (commit `2f609bc4a`, 175 185 942 octets).
- **SHA-256** : `b8fe15bb827a5d7d5811cfbaba689e853c48970db9ab6e995546dbe927514249`.
- **Remplace** les paquets `719f696ed` et `4afc885b4`.
- **Installation** : il n'est pas encore installé en officine, la date reste à fixer avec la pharmacie. Le dernier
  déploiement confirmé reste `76aa5fc1`.

| Demande | Sujet | État |
|---|---|---|
| 66 | Taux des organismes plafonnés à 100 % sur tous les tickets | Dans le paquet |
| 67, 68 et retours | CA crédit paginé (`luLe`, `tiersPayantsRetenus`), carte TVA, `routes` | Dans le paquet |
| 70 | Textes trop fins sur l'image du ticket en 58 mm | Dans le paquet |
| 71 | Analyse Article lente pour les produits très vendus | Dans le paquet |

## Demande 70

En 58 mm, chaque texte non gras est dessiné une seconde fois, décalé d'un point d'imprimante : ses traits font au
moins deux points.

- **Mesures** : sur une vente assurance à deux organismes, à 203 dpi et au seuil 128, les traits d'un seul point
  passent de 33,1 % à 0,7 %. Sur une vente d'appaul, ils sont à 0,6 %.
- **Inchangés** :
  - les dimensions de l'image (384 points) ;
  - la mise en page ;
  - le code-barres et le QR (identiques point par point) ;
  - les textes gras ;
  - le 80 mm, l'aperçu du web et le poste.
- **Votre renforcement « Contraste d'impression »** peut rester tel quel : il ne trouve presque plus de traits à
  doubler.
- **À vérifier de votre côté** : nous n'avons pas pu contrôler le rendu sur papier. Merci de le confirmer sur un
  SUNMI V3.

## Demande 71

La dernière vente est lue d'abord sur les 7 derniers jours, à partir de minuit. L'historique complet n'est relu que
pour les produits sans vente récente. Les réponses sont identiques à l'ancien code, ligne par ligne.

- Sur la copie d'appaul :
  - `v1/info?search=<CIP>` du paracétamol passe de 6,2 s à 0,58 s ;
  - `v1/info` (tout le catalogue) passe de 130 s à 44 s ;
  - `v1/checkproduit` (tout le catalogue) passe de 167 s à 77 s.
- Pool `http-thread-pool` : 8 à 100 fils sur le poste de développement, pas 5. Nous vérifierons la valeur en officine
  au déploiement.

## Second retour sur 67/68

Les écarts de documentation sont corrigés :

- la branche est bien fusionnée, dans `63e9c10cd` puis dans les paquets suivants ;
- `tableau-bord/version` exige une session. Sans session, elle répond 200 avec `success: false`, sans `version` ni
  `routes` ;
- `routes` ne dépend pas de `KEY_TABLEAU_BORD_VERSION`.

## Rien à changer dans l'application

Aucune route, aucun paramètre et aucune forme de réponse ne change. Nous avons bien noté que la demande 69 n'est pas
émise.

## Détails

Dans `docs/notices/` de la branche `integration/recette-2026-10-29` :

- `REPONSE_DEMANDE70_2026-11-21.md` ;
- `REPONSE_DEMANDE71_2026-11-21.md` ;
- `REPONSE_RETOUR_DEMANDES67_68_2026-11-20.md` (mise à jour) ;
- `REPONSE_DEMANDE66_2026-11-20.md`.
