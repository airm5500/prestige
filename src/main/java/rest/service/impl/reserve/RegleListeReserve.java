package rest.service.impl.reserve;

import org.json.JSONObject;

/**
 * Onglet « Liste réserve » (15/11) : regle de la premiere configuration de la reserve, sans base de donnees.
 * <ul>
 * <li>capacite maxi rayon = VMJ x N jours, arrondie au superieur, au moins 1 ; aucune proposition sans vente ;</li>
 * <li>seuil mini rayon = ½ ou ⅔ de la capacite (arrondi au superieur, au moins 1), ou egal a la capacite ;</li>
 * <li>controle de chaque ligne envoyee : un produit qui a du stock en reserve ne sort pas de la reserve ; capacite et
 * seuil entiers positifs, seuil &lt;= capacite ; le retrait garde la capacite et le seuil (reponse du 15/11).</li>
 * </ul>
 * La VMJ est celle du reste de l'application : prevision du mois / 30 (t_prevision_produit).
 */
public final class RegleListeReserve {

    public static final String DEMI = "DEMI";
    public static final String DEUX_TIERS = "DEUX_TIERS";
    public static final String EGAL = "EGAL";

    /** Marge des arrondis : 1,0 x 30 jours vaut 30, pas 31. */
    private static final double EPS = 1e-9;

    private RegleListeReserve() {
    }

    /** Capacite maxi rayon proposee ; null sans vente. */
    public static Integer capacite(Double vmj, int jours) {
        if (vmj == null || vmj <= 0 || jours <= 0) {
            return null;
        }
        return Math.max(1, (int) Math.ceil(vmj * jours - EPS));
    }

    /** Seuil mini rayon propose pour une capacite ; null sans capacite. */
    public static Integer seuil(Integer capacite, String regle) {
        if (capacite == null || capacite <= 0) {
            return null;
        }
        if (EGAL.equals(regle)) {
            return capacite;
        }
        double part = DEMI.equals(regle) ? 1 / 2.0 : 2 / 3.0;
        return Math.min(capacite, Math.max(1, (int) Math.ceil(capacite * part - EPS)));
    }

    /** Regle de seuil lue d'un parametre ; ⅔ par defaut. */
    public static String regleSeuil(String v) {
        return DEMI.equals(v) || EGAL.equals(v) ? v : DEUX_TIERS;
    }

    public enum Action {
        MISE_EN_RESERVE, RETRAIT, REGLAGE, AUCUNE, REFUS
    }

    /** Etat du produit en base avant l'enregistrement. */
    public static final class Etat {
        public final boolean enReserve;
        public final int stockReserve;
        public final Integer capacite;
        public final Integer seuilMini;

        public Etat(boolean enReserve, int stockReserve, Integer capacite, Integer seuilMini) {
            this.enReserve = enReserve;
            this.stockReserve = stockReserve;
            this.capacite = capacite;
            this.seuilMini = seuilMini;
        }
    }

    /** Ce qu'il faut faire d'une ligne : action, valeurs a ecrire, motif d'un refus. */
    public static final class Decision {
        public final Action action;
        public final Integer capacite;
        public final Integer seuilMini;
        public final String motif;

        Decision(Action action, Integer capacite, Integer seuilMini, String motif) {
            this.action = action;
            this.capacite = capacite;
            this.seuilMini = seuilMini;
            this.motif = motif == null ? "" : motif;
        }
    }

    private static Integer entier(JSONObject l, String cle) {
        if (l == null || !l.has(cle) || l.isNull(cle)) {
            return null;
        }
        Object v = l.opt(cle);
        if (v instanceof Number) {
            double d = ((Number) v).doubleValue();
            return d == Math.rint(d) ? (int) d : Integer.MIN_VALUE;
        }
        String s = String.valueOf(v).trim();
        if (s.isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(s);
        } catch (NumberFormatException e) {
            return Integer.MIN_VALUE;
        }
    }

    /**
     * Decision pour une ligne envoyee par l'ecran ({@code enReserve}, {@code capacite}, {@code seuilMini}). Une
     * capacite absente garde celle de la base.
     */
    public static Decision decider(JSONObject ligne, Etat e) {
        boolean apres = ligne.optBoolean("enReserve", e.enReserve);
        Integer cap = entier(ligne, "capacite");
        Integer seuil = entier(ligne, "seuilMini");
        if (e.enReserve && !apres && e.stockReserve > 0) {
            return new Decision(Action.REFUS, e.capacite, e.seuilMini, "Encore " + e.stockReserve
                    + " en réserve : videz d'abord la réserve vers le rayon avant de retirer le produit.");
        }
        if (apres && cap != null) {
            if (cap < 0) {
                return new Decision(Action.REFUS, e.capacite, e.seuilMini,
                        "Capacité maxi rayon invalide : un nombre entier positif est attendu.");
            }
            if (seuil == null || seuil < 0) {
                return new Decision(Action.REFUS, e.capacite, e.seuilMini,
                        "Seuil mini rayon invalide : un nombre entier positif est attendu.");
            }
            if (seuil > cap) {
                return new Decision(Action.REFUS, e.capacite, e.seuilMini,
                        "Le seuil mini rayon (" + seuil + ") dépasse la capacité maxi rayon (" + cap + ").");
            }
        }
        if (!e.enReserve && apres) {
            return new Decision(Action.MISE_EN_RESERVE, cap == null ? e.capacite : cap,
                    cap == null ? e.seuilMini : seuil, null);
        }
        if (e.enReserve && !apres) {
            return new Decision(Action.RETRAIT, e.capacite, e.seuilMini, null);
        }
        if (apres && cap != null && (!cap.equals(e.capacite) || !seuil.equals(e.seuilMini))) {
            return new Decision(Action.REGLAGE, cap, seuil, null);
        }
        return new Decision(Action.AUCUNE, e.capacite, e.seuilMini, null);
    }
}
