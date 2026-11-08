# Monnaie sur les tickets d'une vente assurance avec vente comptant liée : analyse et proposition

Cette notice part du ticket 1630805530, vu le 07/11 sur le poste local.

**État au 08/11 : validé (« Oui, comme proposé », avec le ticket combiné ressorti à la réimpression), codé et testé**
sur `integration/recette-2026-10-29` (`994ad399c`, `0a76ae1a5`), déployé sur le poste local (domain1). Voir la
section 4.

## 1. Ce qui s'est passé

À l'écran, une seule opération a été saisie. La vente assurance contient des lignes cochées « C ». À la clôture, elle
est coupée en deux ventes liées.

| Vente | Référence | Ticket | Prix | À payer par le client |
|---|---|---|---|---|
| Assurance (VO) | 261107_00134 | 1630805530 | 1 570 | part client 370 |
| Comptant liée (VNO) | 261107_00135 | 1630973369 | 1 210 | 1 210 |
| **Opération** | | | | **1 580** |

Le client a donné 2 000. La monnaie juste est donc 2 000 − 1 580 = **420**, rendue une seule fois.

### En base : juste au total, mais réparti arbitrairement

| Vente | Payé | Versé enregistré | Monnaie qui s'en déduit |
|---|---|---|---|
| VO | 370 | 790 | 420 |
| VNO | 1 210 | 1 210 | 0 |
| **Total** | **1 580** | **2 000** | **420** |

À la clôture, `LigneComptant.parametresVenteComptant` impute d'abord le net du comptant (1 210) sur les espèces. Le
reste (790) et la monnaie (420) restent sur la vente assurance. Les recettes et la caisse sont justes : 370 + 1 210.

### Première impression : un ticket faux

| Ticket | Net | Versé | Monnaie | Juste ? |
|---|---|---|---|---|
| Ticket assurance (VO) | 370 | **2 000** | **1 630** | **non** |
| Ticket client combiné (VO + VNO) | 1 580 | 2 000 | 420 | oui |

Pourquoi le ticket assurance est faux :
- après la clôture, l'écran rappelle l'impression avec ses propres paramètres, dont « versé = 2 000 » ;
- `generateDataSummaryVo(…, ClotureVenteParams)` calcule alors 2 000 − 370 = 1 630 ;
- il ne tient compte ni de la vente comptant liée, ni du versé réparti en base.

Les deux tickets semblent donc rendre 1 630 + 420 = 2 050 F, ce qui est votre constat.

### Réimpression : juste en base, mais déroutante

Elle relit la base :

| Ticket | Net | Versé | Monnaie |
|---|---|---|---|
| Ticket assurance (VO) | 370 | 790 | 420 |
| Ticket comptant (VNO) | 1 210 | 1 210 | 0 |

Ce n'est pas faux au total, mais le client n'a jamais versé 790. De plus, la réimpression ne ressort pas le ticket
combiné (décision du 05/11 : seulement le ticket de la vente choisie). Le client ne retrouve donc jamais ses chiffres
réels : 1 580, 2 000, 420.

## 2. Proposition

**Règle unique :** pour une opération à vente liée, le versé et la monnaie ne figurent qu'une fois, sur le ticket
client combiné. Les tickets propres à chaque vente montrent ce qu'elle a réglé, sans monnaie, et renvoient à l'autre
vente.

1. **Ticket client combiné**, à la première impression comme à la réimpression :
   - net = part client VO + net VNO (1 580) ;
   - versé = somme des versés en base (2 000) ;
   - monnaie = versé − net (420).

   C'est déjà le cas aujourd'hui. Seul ce ticket porte « Monnaie ».
2. **Ticket assurance (VO)**, à la première impression et à la réimpression :
   - « Net à payer 370 », « Réglé 370 » ;
   - plus de « Montant versé » ni de « Monnaie » ;
   - une ligne « Payé avec la vente comptant liée n° 261107_00135 (ticket client) ».

   Toutes les valeurs sont lues en base, et plus jamais dans les paramètres de l'écran. Les deux impressions
   deviennent ainsi identiques.
3. **Ticket comptant (VNO) réimprimé seul** : même principe. On imprime « Net 1 210, Réglé 1 210 » et le renvoi à la
   vente assurance n° 261107_00134.
4. **Réimpression depuis Ventes terminées** d'une vente liée (VO ou VNO), à trancher :
   - **[proposé]** ressortir aussi le ticket client combiné, pour que le client retrouve 1 580, 2 000 et 420 ;
   - ou garder la décision du 05/11 (seulement le ticket de la vente), avec le renvoi du point 3.
5. **Base : rien ne change.**
   - Recettes, caisse, ticket Z et règlements restent tels quels. Le total (payé 1 580, versé 2 000) est juste en
     base ; le test de bilan le contrôlera sur le ticket Z.
   - La répartition du versé (790 et 1 210) reste interne. Elle n'est plus imprimée vente par vente.

Ventes sans vente liée : rien ne change.

## 3. Tests prévus

Chaque test échoue d'abord sur le code actuel.

- **Rapprochement (e2e, vrai chemin de l'écran).** On fait une vente assurance avec des lignes « C », puis :
  - on compare l'écran (versé saisi, monnaie affichée), le ticket combiné à la première impression et à la
    réimpression, le ticket assurance à la première impression et à la réimpression, le ticket comptant réimprimé,
    et la base (`mvttransaction`, `vente_reglement`, `t_cash_transaction`) ;
  - attendu : la monnaie apparaît sur un seul ticket et vaut celle de l'écran ; les tickets assurance sont identiques
    à l'impression et à la réimpression.
- **Cohérence (unitaire, milliers de cas tirés au hasard avec une graine fixe).**
  - Monnaie = versé − (part client + net comptant), jamais négative.
  - Versé VO + versé VNO = versé saisi.
  - Payé VO + payé VNO = net de l'opération.
  - Somme des monnaies imprimées = monnaie de l'écran, comptée une seule fois.
- **Bilan avant / après.** Une seule recette par vente, aux bons montants. Une seule sortie de caisse pour la monnaie.
  Rien de plus en base qu'aujourd'hui.
- **Cas.**
  - Versé exact.
  - Versé supérieur, comme ici.
  - Espèces et mobile.
  - Différé.
  - Remise.
  - Part client 0 (assurance à 100 %).
  - Plusieurs tiers-payants (plusieurs exemplaires).
  - Paramètre « ticket unique » à 0 et à 1.

## 4. Réalisation (08/11)

### Ce qui change

- `rest/service/ticket/MonnaieVenteLiee` : la règle unique, pure.
  - Le récapitulatif d'une vente liée perd « Montant versé » et « Monnaie ».
  - Il gagne « Réglé » (= net, sauf différé ou net nul) et « Vente liée : n° … ».
  - La monnaie de l'opération vaut versé − (part client + comptant), jamais négative. Le ticket combiné utilise la
    même fonction.
- `GenerateTicketServiceImpl` :
  - la règle est appliquée à tous les récapitulatifs, à la première impression comme à la réimpression ;
  - elle ne change rien pour une vente sans vente liée ;
  - la réimpression d'une vente assurance liée, ou de sa vente comptant, ressort aussi le ticket client combiné.
- `ConversionTicket` : « Réglé » et « Vente liée » s'impriment après le mode de règlement, sans le masquer
  (« Règlement : Espèces », « Règlement : Différé »).
- Base, caisse, recettes et règlements : rien ne change.
- Réimpression d'une vente liée : deux tickets, le ticket de la vente puis le ticket combiné, jamais trois. Cela
  remplace la décision du 05/11. `retours/test-reedition-un-ticket.js` a été mis à jour en conséquence.
- Aperçu réservé aux tests : `POST vente/ticket/vo/apercu-cloture`. Il prend le corps exact envoyé par l'écran à la
  première impression et construit les tickets sans imprimer.

### Où la donnée apparaît, et le test qui compare

Test de rapprochement : `retours/test-monnaie-vente-liee-0811.js`, joué par le vrai chemin de l'écran.

Il compare :
- l'écran : net et monnaie affichée ;
- la première impression : ticket assurance et ticket combiné ;
- la réimpression de la vente assurance : son ticket et le combiné ;
- la réimpression de la vente comptant : son ticket et le combiné ;
- la base : `mvttransaction`, `vente_reglement`, `t_recettes`.

Résultats : 10/26 sur l'ancien code (monnaie imprimée deux fois, pas de combiné à la réimpression), puis **30/30**.

### Règles et test de cohérence

`MonnaieVenteLieeCoherenceTest` : 5 000 opérations tirées au hasard, avec une graine fixe. Chaque ticket passe par la
conversion réelle.

Règles vérifiées :
- monnaie = versé − net, jamais négative ;
- versé de la vente assurance + versé de la vente comptant = montant tendu ;
- « Monnaie rendue » est imprimée une seule fois, sur le combiné, sauf en différé ;
- le versé n'apparaît que sur le combiné ;
- « Réglé » = net ;
- un seul renvoi « Vente liée », vers l'autre vente ;
- le mode de règlement reste imprimé ;
- les autres lignes sont gardées, dans le même ordre.

Preuves que le test voit les défauts :
- rejoué avec l'ancien ticket, il voit la monnaie comptée plusieurs fois sur chaque opération payée ;
- rejoué avec la première version de la conversion, il voit « Règlement : Espèces » manquant (2 échecs).

Résultat final : 4/4.

### Traces attendues et test de bilan

Dans `test-monnaie-vente-liee-0811.js`, pour chaque vente, il y a exactement :
- un mouvement de caisse ;
- un règlement ;
- une recette, égale au payé.

Le versé total en base est égal au montant tendu, et la monnaie en base (versé − payé) à celle de l'écran.
L'impression n'écrit rien en base.

### Cas couverts

- Test d'écran :
  - opération A : quantité 2 côté assurance et 1 cochée, client qui tend plus que le net (monnaie 1 910) ;
  - opération B : quantité 1 et 3 cochées, client qui tend le net exact (monnaie 0).
- Test de cohérence :
  - espèces seules, espèces et mobile ;
  - différé ;
  - part client 0 ;
  - montant tendu égal au net, au-dessus du net, ou au millier supérieur ;
  - numéros de ticket tout en chiffres, ou références.
- Non-régression : différé d'une vente liée (`test-ticket-differe.js`).
- **Non couverts par un test dédié :**
  - plusieurs organismes sur une vente liée ;
  - le paramètre « ticket unique » (`KEY_NOMBRE_TICKETS_VNO`) à 0 et à 1.

  Le code ne dépend pas de ces deux points : la règle porte sur le récapitulatif, imprimé à l'identique sur chaque
  exemplaire.

### Non-régression rejouée après la correction

16 tests d'écran, joués un à un, tous verts :

| Test | Résultat |
|---|---|
| `retours/test-monnaie-vente-liee-0811.js` | 30/30 |
| `retours/test-reedition-un-ticket.js` | 7/7 |
| `ligne-comptant/test-rapprochement-ligne-comptant.js` | 19/19 |
| `ligne-comptant/test-bilan-ligne-comptant.js` | 23/23 |
| `ligne-comptant/test-une-ligne-cochee.js` | 24/24 |
| `ligne-comptant/test-ticket-differe.js` | 14/14 |
| `ligne-comptant/test-non-regression-cloture.js` | 11/11 |
| `ligne-comptant/test-parametre-0-identique.js` | 12/12 |
| `ligne-comptant/test-attente-reprise.js` | 9/9 |
| `ligne-comptant/test-promotion-et-carnet.js` | 10/10 |
| `prix-reference/test-rapprochement-ticket.js` | 19/19 |
| `prix-reference/test-base-par-tp-rapprochement-ticket.js` | 23/23 |
| `retours/test-caisse-vente-scindee.js` | 11/11 |
| `retours/test-modeles-ticket.js` | 15/15 |
| `audits/test-ecran-promotion-rapprochement.js` | 39/39 |
| `retours/test-promotion-palier-0811.js` | 33/33 |

Tests unitaires des tickets et de la vente liée : 129 tests, aucun échec.

Changement d'un contrôle existant : dans `test-rapprochement-ligne-comptant.js`, la règle « aucune mention de la vente
comptant » sur le ticket assurance devient « aucune ligne de la vente comptant, renvoi Vente liée à sa référence ».
C'est la conséquence de la décision du 08/11.

Cahier : `CAHIER_RECETTE_2026-11-08.xlsx`, feuille « Monnaie ventes liées 08-11 » : cas MON-01 OK, non-régression 15
sur 15.

### Mise en officine

Une méthode a été ajoutée à `GenerateTicketService`. Il faut donc suivre la procédure JACC :
1. undeploy ;
2. supprimer `generated/policy/prestige` ;
3. deploy.

Pas de migration.
