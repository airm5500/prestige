package util;

/**
 * Calculs purs du deconditionnement automatique declenche par une vente de detail. Remplace les boucles while qui
 * mutaient la variable "stock initial" : cette mutation faisait historiser dans h_mvt_produit un qteDebut/qteFinale
 * gonfles du nombre de details deconditionnes (fiche des mouvements affichant par ex. 204 au lieu de 99).
 */
public final class DeconditionnementCalcul {

    private DeconditionnementCalcul() {
    }

    /**
     * Nombre de boites a deconditionner pour couvrir la vente. 0 si le stock detail suffit deja, ou si le nombre de
     * details par boite est invalide (l'ancienne boucle while ne terminait pas dans ce cas).
     */
    public static int boitesNecessaires(int stockDetail, int qteVendue, int qtyDetail) {
        if (stockDetail >= qteVendue || qtyDetail <= 0) {
            return 0;
        }
        int manque = qteVendue - stockDetail;
        return (manque + qtyDetail - 1) / qtyDetail;
    }

    /**
     * Stock reellement vendable d'un produit detail : le stock detail en rayon plus les details encore contenus dans
     * les boites du parent. Un nombre de details par boite invalide neutralise les boites plutot que de fausser le
     * calcul.
     */
    public static int stockVendable(int stockDetail, int stockBoites, int qtyDetail) {
        if (qtyDetail <= 0 || stockBoites <= 0) {
            return stockDetail;
        }
        return stockDetail + (stockBoites * qtyDetail);
    }
}
