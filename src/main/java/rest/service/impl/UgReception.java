package rest.service.impl;

import dal.OrderDetailLot;
import java.util.List;

/**
 * Plan du 19/11, point 2 : unites gratuites lues a l'import d'un BL de grossiste (lots de la ligne de commande),
 * jusqu'a la ligne du BL et au stock.
 * <p>
 * Meme regle que la saisie d'un lot dans la gestion des entrees ({@code OrderServiceImpl.addFreeQty}) : un lot compte
 * les boites payees plus les gratuites ; la ligne du BL porte UG = gratuites et recu = payees + gratuites ; la cloture
 * entre min(lots, commande + UG) en stock ({@code LotsBonLivraison.quantiteEntree}).
 */
public final class UgReception {

    private UgReception() {
    }

    /** Total des unites gratuites des lots d'une ligne de commande (0 sans lot). */
    public static int gratuitesDesLots(List<OrderDetailLot> lots) {
        if (lots == null) {
            return 0;
        }
        return lots.stream().mapToInt(l -> Math.max(l.getQuantityGratuit(), 0)).sum();
    }

    /** Quantite du lot cree a la creation du BL : payees + gratuites. */
    public static int quantiteLot(OrderDetailLot lot) {
        return lot.getQuantity() + Math.max(lot.getQuantityGratuit(), 0);
    }
}
