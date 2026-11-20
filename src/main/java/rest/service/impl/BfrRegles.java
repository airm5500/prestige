package rest.service.impl;

import java.time.LocalDate;

/**
 * Plan du 19/11 : besoin en fonds de roulement (BFR), calcul pur (BfrCoherenceTest).
 *
 * BFR = stock valorise (achat) + creances clients (differes, factures tiers payant non reglees, parts tiers payant non
 * facturees) - dettes fournisseurs (« A regler » depuis la date de depart du suivi). Les dettes fiscales et sociales et
 * les autres creances ou dettes ne sont pas suivies dans Prestige : 0.
 *
 * En jours de CA HT : BFR / CA HT des 360 derniers jours x 360 ; CA HT nul ou negatif : non calculable (null).
 */
public final class BfrRegles {

    public static final int BASE_JOURS = 360;

    private BfrRegles() {
    }

    public static long creances(long differes, long factures, long parts) {
        return differes + factures + parts;
    }

    public static long bfr(long stock, long creances, long dettes) {
        return stock + creances - dettes;
    }

    /** BFR en jours de CA HT, a une decimale ; null si le CA HT est nul ou negatif. */
    public static Double jours(long bfr, long caHt) {
        if (caHt <= 0) {
            return null;
        }
        return java.math.BigDecimal.valueOf(bfr).multiply(java.math.BigDecimal.valueOf(BASE_JOURS))
                .divide(java.math.BigDecimal.valueOf(caHt), 1, java.math.RoundingMode.HALF_UP).doubleValue();
    }

    /** Premier jour des 360 jours de CA qui finissent le jour donne. */
    public static LocalDate debutCa(LocalDate fin) {
        return fin.minusDays(BASE_JOURS - 1L);
    }
}
