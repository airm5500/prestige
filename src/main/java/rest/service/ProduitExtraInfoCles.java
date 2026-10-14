package rest.service;

/**
 * Cle des infos complementaires d'un produit (produit|emplacement). Hors de l'interface EJB
 * {@link ProduitExtraInfoService} : une methode statique dans une interface @Local n'a pas de methode correspondante
 * dans le bean ; Payara l'ecrit dans le journal a chaque demarrage (journaux du 13/10) et peut refuser les appels au
 * service (voir {@link PreferenceCles}).
 */
public final class ProduitExtraInfoCles {

    private ProduitExtraInfoCles() {
    }

    public static String cle(String familleId, String emplacementId) {
        return familleId + "|" + emplacementId;
    }
}
