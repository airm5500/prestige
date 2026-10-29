package rest.service.impl;

import dal.TCompteClientTiersPayant;
import dal.TTiersPayant;
import javax.persistence.EntityManager;

/**
 * Encours (consommation non encore facturee) d'un lien client / tiers payant et d'un organisme.
 *
 * <p>
 * Audit des encours, reproduit le 25/10/2026 : l'annulation d'une vente AJOUTAIT la part de l'organisme a son encours
 * (564 -> 1 128 au lieu de 0, CR-01), la modification d'une vente la comptait deux fois (1 692 pour 564, CR-02), le
 * changement d'organisme d'une vente terminee ne suivait pas les encours (CA-09), et la facturation remettait a zero
 * l'encours de TOUS les clients de l'organisme, meme pour les ventes non facturees (F5).
 * </p>
 * <p>
 * Annulation, modification et changement d'organisme retirent ou ajoutent exactement la part en jeu, symetriques de
 * l'increment de la cloture (inchange). Apres une facture definitive, l'organisme et ses liens ordinaires sont
 * RECALCULES depuis leur source : la somme des parts des bons non factures (unpaid), de lignes et de ventes closes, non
 * annulees, de montant positif ; les ventes non facturees restent donc dans l'encours, et les encours deja gonfles se
 * reparent. Un lien « absolu » (b_IsAbsolute), que la facturation ne remettait pas a zero, n'est pas recalcule. Les
 * organismes exclus et les carnets depot, suivis par leur solde (account), ne sont pas concernes.
 * </p>
 */
public final class EncoursTiersPayant {

    private static final String BONS_NON_FACTURES = " FROM TPreenregistrementCompteClientTiersPayent t"
            + " WHERE t.strSTATUTFACTURE = 'unpaid' AND t.strSTATUT = 'is_Closed'"
            + " AND t.lgPREENREGISTREMENTID.strSTATUT = 'is_Closed' AND t.lgPREENREGISTREMENTID.bISCANCEL = FALSE"
            + " AND t.lgPREENREGISTREMENTID.intPRICE > 0";

    private EncoursTiersPayant() {
    }

    /** Organisme suivi par son encours (ni exclu ni carnet depot). */
    public static boolean suiviParEncours(TTiersPayant payant) {
        return payant != null && !Boolean.TRUE.equals(payant.getToBeExclude())
                && !Boolean.TRUE.equals(payant.getIsDepot());
    }

    /**
     * Une part de {@code montant} sort de l'encours (annulation, modification, changement d'organisme) : le lien et
     * l'organisme sont diminues de cette part, sans passer sous zero. C'est le symetrique exact de l'increment fait a
     * la cloture ; un recalcul a ce moment-la serait faux (la copie d'une modification n'est pas encore cloturee).
     */
    public static void retirer(EntityManager em, TCompteClientTiersPayant lien, int montant) {
        ajouter(em, lien, -montant);
    }

    /** Une part de {@code montant} (negatif pour retirer) entre dans l'encours du lien et de son organisme. */
    public static void ajouter(EntityManager em, TCompteClientTiersPayant lien, int montant) {
        if (lien == null || !suiviParEncours(lien.getLgTIERSPAYANTID()) || montant == 0) {
            return;
        }
        int conso = lien.getDbCONSOMMATIONMENSUELLE() == null ? 0 : lien.getDbCONSOMMATIONMENSUELLE();
        appliquer(lien, Math.max(0, conso + montant));
        em.merge(lien);
        TTiersPayant payant = lien.getLgTIERSPAYANTID();
        int consoTp = payant.getDbCONSOMMATIONMENSUELLE() == null ? 0 : payant.getDbCONSOMMATIONMENSUELLE();
        appliquer(payant, Math.max(0, consoTp + montant));
        em.merge(payant);
    }

    /** Recalcule l'encours de l'organisme (tous ses clients) et son indicateur « utilisable » (plafond de credit). */
    public static void recalculer(EntityManager em, TTiersPayant payant) {
        if (!suiviParEncours(payant)) {
            return;
        }
        int encours = somme(em
                .createQuery("SELECT COALESCE(SUM(t.intPRICE), 0)" + BONS_NON_FACTURES
                        + " AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID = :tp")
                .setParameter("tp", payant).getSingleResult());
        appliquer(payant, encours);
        em.merge(payant);
    }

    /**
     * Apres une facture definitive : l'organisme et TOUS ses liens ordinaires sont recalcules (les bons factures
     * sortent de l'encours, les autres y restent) ; les liens absolus ne bougent pas, comme avant. Deux requetes
     * groupees, au lieu de la remise a zero de tous les liens.
     */
    public static void apresFacturation(EntityManager em, TTiersPayant payant) {
        if (!suiviParEncours(payant)) {
            return;
        }
        em.flush();
        em.createNativeQuery("UPDATE t_compte_client_tiers_payant l SET l.db_CONSOMMATION_MENSUELLE = ("
                + " SELECT COALESCE(SUM(t.int_PRICE), 0) FROM t_preenregistrement_compte_client_tiers_payent t"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
                + " WHERE t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                + " AND t.str_STATUT_FACTURE = 'unpaid' AND t.str_STATUT = 'is_Closed' AND p.str_STATUT = 'is_Closed'"
                + " AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0)"
                + " WHERE l.lg_TIERS_PAYANT_ID = ?1 AND COALESCE(l.b_IsAbsolute, 0) = 0")
                .setParameter(1, payant.getLgTIERSPAYANTID()).executeUpdate();
        em.createNativeQuery("UPDATE t_compte_client_tiers_payant l SET l.b_CANBEUSE = CASE"
                + " WHEN COALESCE(l.db_PLAFOND_ENCOURS, 0) <= 0 THEN 1"
                + " WHEN l.db_PLAFOND_ENCOURS > l.db_CONSOMMATION_MENSUELLE THEN 1 ELSE 0 END"
                + " WHERE l.lg_TIERS_PAYANT_ID = ?1 AND COALESCE(l.b_IsAbsolute, 0) = 0")
                .setParameter(1, payant.getLgTIERSPAYANTID()).executeUpdate();
        recalculer(em, payant);
        if (payant.getDblPLAFONDCREDIT() == null || payant.getDblPLAFONDCREDIT().intValue() <= 0) {
            // comme avant : apres facturation, un organisme sans plafond redevient utilisable
            payant.setBCANBEUSE(Boolean.TRUE);
            em.merge(payant);
        }
    }

    private static void appliquer(TCompteClientTiersPayant lien, int encours) {
        lien.setDbCONSOMMATIONMENSUELLE(encours);
        // indicateur « utilisable » recalcule seulement sous plafond, comme a la cloture
        if (lien.getDbPLAFONDENCOURS() != null && lien.getDbPLAFONDENCOURS() > 0) {
            lien.setBCANBEUSE(lien.getDbPLAFONDENCOURS() > encours);
        }
    }

    private static void appliquer(TTiersPayant payant, int encours) {
        payant.setDbCONSOMMATIONMENSUELLE(encours);
        if (payant.getDblPLAFONDCREDIT() != null && payant.getDblPLAFONDCREDIT().intValue() > 0) {
            payant.setBCANBEUSE(payant.getDblPLAFONDCREDIT().intValue() > encours);
        }
    }

    private static int somme(Object resultat) {
        return resultat instanceof Number ? ((Number) resultat).intValue() : 0;
    }
}
