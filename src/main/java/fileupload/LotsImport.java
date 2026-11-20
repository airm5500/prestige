package fileupload;

import dal.OrderDetailLot;
import java.util.List;
import java.util.Objects;

/**
 * Retour du 11/11 (base de Tiassale, BL R20285250) : un produit present deux fois dans le fichier du grossiste donnait
 * une seule ligne de commande, mais deux lots, sans numero ni date (modele DPCI). L'ecran ne montre et ne complete
 * qu'un lot par ligne : le second restait sans date, invisible, et l'entree en stock etait refusee.
 * <p>
 * Regle : deux lots du meme numero et de la meme date (vides compris) sont un seul lot, leurs quantites s'additionnent
 * ; des lots differents restent separes. Verifie par {@code LotsImportCoherenceTest}.
 */
public final class LotsImport {

    private LotsImport() {
    }

    /** Ajoute une quantite au lot de meme numero et de meme date, ou cree le lot. */
    public static void ajouter(List<OrderDetailLot> lots, String numeroLot, String datePeremption, int quantite) {
        ajouter(lots, numeroLot, datePeremption, quantite, 0);
    }

    /**
     * Plan du 19/11, point 2 : meme regle, avec les unites gratuites de la ligne ({@code quantityGratuit} du lot). La
     * quantite du lot reste celle des boites payees ; a la creation du BL, le lot entre pour payees + gratuites.
     */
    public static void ajouter(List<OrderDetailLot> lots, String numeroLot, String datePeremption, int quantite,
            int gratuit) {
        String numero = vide(numeroLot), date = vide(datePeremption);
        for (OrderDetailLot l : lots) {
            if (Objects.equals(vide(l.getNumeroLot()), numero) && Objects.equals(vide(l.getDatePeremption()), date)) {
                l.setQuantity(l.getQuantity() + quantite);
                l.setQuantityGratuit(l.getQuantityGratuit() + gratuit);
                return;
            }
        }
        OrderDetailLot lot = new OrderDetailLot(numeroLot, datePeremption, quantite);
        lot.setQuantityGratuit(gratuit);
        lots.add(lot);
    }

    private static String vide(String s) {
        return s == null || s.trim().isEmpty() ? null : s.trim();
    }
}
