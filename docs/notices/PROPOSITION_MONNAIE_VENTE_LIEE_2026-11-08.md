# Monnaie sur les tickets d'une vente assurance avec vente comptant liée : analyse et proposition

Cette notice part du ticket 1630805530, vu le 07/11 sur le poste local. Rien n'est codé : c'est à valider.

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
