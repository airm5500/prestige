package rest.service.correspondance;

import javax.persistence.EntityManager;

/**
 * Lot 2 : trace d'une ligne de fichier grossiste importee (servlet d'import des commandes et BL). Ecrite dans la
 * transaction de l'import : la ligne de commande et sa trace sont enregistrees ensemble ou pas du tout. Le rang est
 * l'ordre de la ligne dans le fichier, pour cette commande. Relue par {@link CorrespondanceGrossisteService} (clotures
 * de BL, API).
 */
public final class TraceImportGrossiste {

    private TraceImportGrossiste() {
    }

    private static String couper(String s, int n) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.length() > n ? t.substring(0, n) : t;
    }

    /**
     * @param familleId
     *            fiche retenue par l'import, ou null si la ligne n'a pas ete reconnue
     * @param detailId
     *            ligne de commande creee ou completee, ou null
     */
    public static void tracer(EntityManager em, String commandeId, String grossisteId, String code, String designation,
            String familleId, String detailId, Integer quantite, Integer prixAchat) {
        String normalise = CorrespondanceRegles.normaliser(code);
        em.createNativeQuery(
                "INSERT INTO ligne_import_grossiste (lg_ORDER_ID, lg_ORDERDETAIL_ID, lg_GROSSISTE_ID, rang,"
                        + " code_brut, code_normalise, designation_brute, lg_FAMILLE_ID, quantite, prix_achat, dt_import)"
                        + " SELECT ?1, ?2, ?3, COALESCE(MAX(rang), 0) + 1, ?4, ?5, ?6, ?7, ?8, ?9, NOW(3)"
                        + " FROM ligne_import_grossiste WHERE lg_ORDER_ID = ?10")
                .setParameter(1, commandeId).setParameter(10, commandeId).setParameter(2, detailId)
                .setParameter(3, grossisteId).setParameter(4, couper(code, 60))
                .setParameter(5, normalise.isEmpty() ? null : couper(normalise, 60))
                .setParameter(6, couper(designation, 200)).setParameter(7, familleId).setParameter(8, quantite)
                .setParameter(9, prixAchat).executeUpdate();
    }
}
