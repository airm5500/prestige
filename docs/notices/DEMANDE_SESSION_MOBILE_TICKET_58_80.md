# Demande à l'application mobile : ticket 58 mm (terminal) et 80 mm (tablette), identique au web

**Date** : 19/11/2026
**Destinataire** : la session et la branche de l'application mobile Prestige.
**Émetteur** : la session principale (branche d'intégration `integration/recette-2026-10-29`).

## Le but

Un même ticket doit sortir **pareil** depuis le web et depuis le mobile :
- même contenu ;
- mêmes blocs, dans le même ordre ;
- mêmes réglages ;
- même code-barres ou QR code.

Seule change la largeur du papier :

| Appareil | Imprimante | Largeur du rouleau | Largeur imprimable | Points à 203 dpi |
|---|---|---|---|---|
| Terminal de vente (TPE Android à imprimante intégrée) | intégrée | **58 mm** | 48 mm | 384 |
| Tablette | Bluetooth / USB / réseau, au choix | **58 mm ou 80 mm** | 48 mm ou 72 mm | 384 ou 576 |

La règle de largeur est celle du serveur (`ModeleTicketService.largeurValide`) : 58 mm ou moins donne 58 mm, tout le reste donne 80 mm. Aucune autre largeur n'existe.

## Ce qui existe déjà côté web (à réutiliser, pas à recopier)

1. **Les modèles de ticket.**
   - Le menu « Modèles de ticket » (`v1/modeles-ticket`, droit `P_SM_MODELES_TICKET` pour modifier) règle chaque ticket **par largeur**. Les réglages portent sur la police, la marge, les blocs (position, alignement, taille, largeur) et les options : remise, promotion, lot, récapitulatif, commentaires, signatures, cadre du net.
   - Ils sont enregistrés dans la table `ticket_modele` (une ligne par ticket et par largeur, 58 et 80).
   - Les tickets concernés : `PREVENTE`, `VENTE`, `VENTE_ASSURANCE`, `VENTE_CARNET`, `VENTE_DEPOT`, `VENTE_MIXTE`, `REGLEMENT_DIFFERE`, `REGLEMENT_FACTURE`, `REGLEMENT_CARNET_DEPOT`, `MOUVEMENT_CAISSE`, `TICKET_Z`.
2. **Le contenu du ticket.**
   - Le serveur construit un `TicketDocument` : des blocs nommés, de `ENTETE` à `PIED` (code-barres), tous listés dans `TicketDocument.ORDRE`.
   - Le web l'imprime avec `RenduTicket`, qui a ses propres règles :
     - une taille de base de 8 pt en 58 mm et de 9 pt en 80 mm ;
     - un texte qui ne déborde jamais ;
     - un pied qui reste en place.
3. **Les aperçus sans impression**, en lecture seule. Ils renvoient les blocs et leurs éléments en JSON :
   - `GET v1/vente/ticket/vno/{id}/apercu` ;
   - `GET v1/vente/ticket/vo/{id}/apercu` ;
   - `GET v1/vente/ticket/vo/{id}/apercu-combine` ;
   - `POST v1/vente/ticket/vo/apercu-cloture`.

   Ces aperçus servent aujourd'hui aux tests de rapprochement. Ils ne portent **ni** les réglages (alignement, tailles, police) **ni** l'image du code-barres : ils ne suffisent donc pas à reproduire le ticket à l'identique.

## Décision : le serveur dessine, le mobile imprime l'image

Pour garantir l'uniformité, **le mobile ne recompose pas le ticket**. Il demande au serveur l'image du ticket à la largeur de son imprimante et l'envoie telle quelle à l'imprimante, en raster ESC/POS (`GS v 0`).

Ainsi, une modification du modèle ou des réglages faite dans le menu web vaut aussitôt pour le mobile, sans nouvelle version de l'application. C'est le même principe que l'aperçu du menu « Modèles de ticket », qui renvoie déjà une image PNG dessinée par `RenduTicket`.

### Point d'entrée à créer côté serveur (fait par la session principale)

```
GET v1/vente/ticket/{type}/{id}/image?largeur=58|80&dpi=203
```

| Paramètre | Valeurs |
|---|---|
| `type` | `vno` (comptant), `vo` (assurance, carnet, dépôt), `vo-combine` (vente mixte), `prevente` |
| `largeur` | `58` ou `80` ; toute autre valeur est ramenée par `largeurValide` |
| `dpi` | facultatif ; 203 par défaut |

Réponse :

```json
{ "success": true,
  "largeur": 58,
  "tickets": [ { "modele": "VENTE", "png": "<base64>", "largeurPoints": 384, "hauteurPoints": 1210 } ] }
```

- **Plusieurs tickets** (un par organisme, puis le reçu caisse) : `tickets` les donne **dans l'ordre d'impression**. Le nombre d'exemplaires suit les mêmes paramètres que le web (`KEY_NOMBRE_TICKETS_VNO`, copies) : le mobile imprime chaque élément une fois, sans rien ajouter.
- **Lecture seule :** rien n'est écrit en base, rien n'est envoyé à l'imprimante du serveur.
- **Erreurs :** 401 si la session est absente, 403 `{interdit:true}` sans le droit de voir la vente, `{success:false, msg}` si la vente est introuvable ou n'a pas de mouvement.

**Image :** noir et blanc pur (1 bit, sans gris), d'une largeur exactement égale à `largeurPoints` (384 ou 576), sans marge blanche à droite. La marge du modèle est déjà comprise dans l'image.

## À faire dans l'application

1. **Choisir la largeur par appareil**, dans les réglages de l'appareil (même écran que le nom de l'appareil, voir `DEMANDE_SESSION_MOBILE_NOM_APPAREIL.md`) :
   - **terminal à imprimante intégrée** : 58 mm, imposé, sans choix ;
   - **tablette** : choix « 58 mm » ou « 80 mm », par imprimante appairée ; 80 mm par défaut ; la valeur est gardée sur l'appareil ;
   - une **page de test** affiche la largeur choisie, de bord à bord : elle doit tenir sans être coupée.
2. **Imprimer** après la clôture ou sur « Réimprimer » :
   - appeler `GET …/image?largeur=<largeur de l'appareil>` ;
   - imprimer chaque PNG dans l'ordre, avec une coupe papier entre deux tickets si l'imprimante sait couper.
3. **Ne jamais appeler `POST v1/vente/ticket/vno` ni `ticket/vo` depuis le mobile** : ces appels impriment sur l'imprimante **du serveur**, celle de la caisse, et non sur celle du terminal. C'est aussi ce qui a produit l'erreur « Imprimante inconnue » du 16/11 sur un serveur sans imprimante.
4. **Prévente :**
   - le ticket de prévente (QR code de la vente) passe par le même point d'entrée, avec `type=prevente` ;
   - le QR code est dans l'image : le mobile ne le génère pas lui-même.
5. **Sans réseau :**
   - pas d'impression de secours recomposée sur le téléphone, car le ticket ne serait pas le même que celui du web ;
   - afficher « Ticket non imprimé : réseau indisponible » et proposer « Réimprimer » au retour du réseau.
6. **Échec d'impression locale** (papier, Bluetooth) :
   - afficher le motif ;
   - garder la vente telle quelle, sans l'annuler ni la recréer ;
   - proposer « Réimprimer », qui rappelle le même point d'entrée.
7. **Retirer le gabarit de ticket propre au mobile**, s'il existe, une fois ce point d'entrée en place. Ne pas garder deux mises en page.

## Ce qui reste identique entre web et mobile

| Élément | Source unique |
|---|---|
| Contenu (lignes, montants, parts des organismes, monnaie, crédit) | `GenerateTicketServiceImpl`, même chemin que l'impression web |
| Disposition, police, tailles, options | `ticket_modele`, par ticket et par largeur |
| Dessin | `RenduTicket` (le même que l'aperçu du menu « Modèles de ticket ») |
| Code-barres, QR code, date | bloc `PIED` / `DATE` du document |

## Tests attendus (application et serveur)

- **Rapprochement :**
  - pour une même vente, le texte des blocs de `…/apercu` (JSON) est identique au texte que contient l'image en 58 et en 80 mm ;
  - l'image en 80 mm est la même que l'aperçu du menu web, à réglages égaux.
- **Cas variés :**
  - comptant ;
  - assurance à un et à deux organismes ;
  - vente mixte (assurance plus comptant) ;
  - carnet ;
  - dépôt ;
  - prévente ;
  - quantité supérieure à 1 ;
  - remise ;
  - promotion ;
  - désignation très longue (aucun débordement en 58 mm) ;
  - réimpression.
- **Largeur :**
  - largeur de l'image égale à 384 points en 58 mm et à 576 en 80 mm ;
  - une valeur hors liste (`largeur=57`, `largeur=100`) est ramenée à 58 ou à 80.
- **Aucune trace :**
  - l'appel de l'image n'écrit rien en base (bilan avant / après) ;
  - il n'envoie rien au spouleur du serveur.
- **Mobile :**
  - terminal en 58 mm imposé ;
  - tablette qui bascule de 58 à 80 mm sans redémarrer ;
  - page de test ;
  - réimpression après coupure du Bluetooth.

## Règles rappelées

- Aucun jeton ni secret dans l'application ; aucun texte de ticket ni donnée patient dans les journaux.
- La branche mobile commite et pousse, puis rend compte à la session principale avec : sa branche, ses commits et les résultats de ses tests avant / après.
- La fusion n'a lieu qu'après la validation de l'utilisateur dans la session principale.
