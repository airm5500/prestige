package rest.service.impl.achats;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Plan du 19/11, point 16 : regles des reglements fournisseurs, sans base (testees par
 * ReglementFournisseurCoherenceTest).
 * <ul>
 * <li>un reglement se repartit sur les BL dans l'ordre donne (les plus anciens d'abord, ou ceux coches) : chaque part =
 * min(reste a repartir, restant du BL) ; la somme des parts = le montant ; un montant au-dela du du est refuse ;</li>
 * <li>les reglements d'un BL s'ajoutent : regle cumule, restant = TTC − regle (jamais negatif), statut derive ;</li>
 * <li>une annulation rend exactement les parts ;</li>
 * <li>age d'un BL : jours depuis sa date ; tranches 0-30, 31-60, 61-90, plus de 90 jours.</li>
 * </ul>
 */
public final class ReglementFournisseurRegles {

    public static final String NON_REGLE = "NON REGLE";
    public static final String REGLE_EN_PARTIE = "REGLE EN PARTIE";
    public static final String REGLE = "REGLE";

    public static final String[] TRANCHES = { "0-30", "31-60", "61-90", ">90" };

    public static final String ESPECES = "ESPECES";
    public static final String CHEQUE = "CHEQUE";
    public static final String VIREMENT = "VIREMENT";
    public static final String MOBILE_MONEY = "MOBILE_MONEY";
    public static final List<String> MODES = List.of(ESPECES, CHEQUE, VIREMENT, MOBILE_MONEY);
    /** Reglement fait par l'ancienne fenetre « Regler les BL » (jamais choisi dans l'onglet). */
    public static final String ANCIEN_ECRAN = "ANCIEN_ECRAN";

    private ReglementFournisseurRegles() {
    }

    /** Un BL vu par les reglements : identifiant, date, TTC, deja regle. */
    public static final class Bl {
        public final String id;
        public final LocalDate date;
        public final int ttc;
        public final int regle;

        public Bl(String id, LocalDate date, int ttc, int regle) {
            this.id = id;
            this.date = date;
            this.ttc = ttc;
            this.regle = regle;
        }

        public int restant() {
            return ReglementFournisseurRegles.restant(ttc, regle);
        }
    }

    /** Refus d'un reglement : le message est montre tel quel a l'ecran. */
    public static final class Refus extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public Refus(String message) {
            super(message);
        }
    }

    public static int restant(int ttc, int regle) {
        return Math.max(0, ttc - Math.max(0, regle));
    }

    /**
     * Montant regle d'un BL tel qu'il est en base : le montant enregistre ; a defaut, tout le TTC pour un BL marque
     * REGLE (ancien reglement sans montant), rien sinon.
     */
    public static int regle(Integer ttc, Integer regleEnBase, String statut) {
        if (regleEnBase != null) {
            return Math.max(0, regleEnBase);
        }
        return REGLE.equals(statut) && ttc != null ? Math.max(0, ttc) : 0;
    }

    public static String statut(int ttc, int regle) {
        if (regle <= 0) {
            return NON_REGLE;
        }
        return regle >= ttc ? REGLE : REGLE_EN_PARTIE;
    }

    /** Les plus anciens d'abord (date, puis identifiant pour un ordre stable). */
    public static List<Bl> plusAnciensDAbord(List<Bl> bls) {
        List<Bl> l = new ArrayList<>(bls);
        l.sort(Comparator.comparing((Bl b) -> b.date == null ? LocalDate.MIN : b.date).thenComparing(b -> b.id));
        return l;
    }

    public static long du(List<Bl> bls) {
        long d = 0;
        for (Bl b : bls) {
            d += b.restant();
        }
        return d;
    }

    /**
     * Repartition d'un montant sur les BL, dans l'ordre donne ; les BL deja regles ne recoivent rien.
     *
     * @return part de chaque BL qui recoit quelque chose, dans l'ordre
     *
     * @throws Refus
     *             montant nul ou negatif, aucun BL a regler, montant superieur au du
     */
    public static Map<String, Integer> repartir(int montant, List<Bl> bls) {
        if (montant <= 0) {
            throw new Refus("Le montant doit être supérieur à 0.");
        }
        long du = du(bls);
        if (du <= 0) {
            throw new Refus("Aucun BL à régler.");
        }
        if (montant > du) {
            throw new Refus("Le montant (" + montant + ") dépasse le total dû (" + du + ").");
        }
        Map<String, Integer> parts = new LinkedHashMap<>();
        int reste = montant;
        for (Bl b : bls) {
            if (reste == 0) {
                break;
            }
            int part = Math.min(reste, b.restant());
            if (part > 0) {
                parts.merge(b.id, part, Integer::sum);
                reste -= part;
            }
        }
        return parts;
    }

    /**
     * Ancienne fenetre « Regler les BL » : elle donne le montant regle VOULU du BL (0, une partie, ou le TTC), pas un
     * versement. Ce qui manque devient un reglement « Regler les BL » ; une baisse n'est permise que si le BL n'a aucun
     * reglement de l'onglet (elle annulerait des parts sans trace) : elle annule alors les reglements « Regler les BL »
     * du BL, et ce qui reste au-dessus de la cible (ancien regle sans historique) est simplement ramene a la cible.
     *
     * @param regle
     *            regle actuel du BL
     * @param partsOnglet
     *            parts actives des reglements de l'onglet
     * @param partsAncien
     *            parts actives des reglements « Regler les BL »
     *
     * @return {0 : parts « Regler les BL » a annuler (toutes : 1, aucune : 0), 1 : nouveau reglement « Regler les BL »,
     *         2 : regle final} ; null si la baisse est refusee
     */
    public static int[] ajustementAncienEcran(int ttc, int regle, int partsOnglet, int partsAncien, int cible) {
        int c = Math.max(0, Math.min(cible, Math.max(0, ttc)));
        if (c >= regle) {
            return new int[] { 0, c - regle, c };
        }
        if (partsOnglet > 0) {
            return null;
        }
        int sansAncien = Math.max(0, regle - partsAncien);
        return new int[] { partsAncien > 0 ? 1 : 0, Math.max(0, c - sansAncien), c };
    }

    /** Tranche d'age d'un BL au jour donne. */
    public static String tranche(LocalDate dateBl, LocalDate jour) {
        long j = dateBl == null ? 0 : Math.max(0, ChronoUnit.DAYS.between(dateBl, jour));
        if (j <= 30) {
            return TRANCHES[0];
        }
        if (j <= 60) {
            return TRANCHES[1];
        }
        return j <= 90 ? TRANCHES[2] : TRANCHES[3];
    }

    /** Un BL est suivi s'il date du jour de depart ou apres ; avant, il est considere comme regle. */
    public static boolean suivi(LocalDate dateBl, LocalDate depart) {
        return depart == null || dateBl == null || !dateBl.isBefore(depart);
    }

    public static String mode(String valeur) {
        String v = valeur == null ? "" : valeur.trim().toUpperCase().replace(' ', '_').replace("È", "E");
        if ("ESPECE".equals(v)) {
            v = ESPECES;
        }
        if (!MODES.contains(v)) {
            throw new Refus("Mode de règlement inconnu : choisissez espèces, chèque, virement ou mobile money.");
        }
        return v;
    }

    public static String libelleMode(String mode) {
        switch (mode == null ? "" : mode) {
        case ESPECES:
            return "Espèces";
        case CHEQUE:
            return "Chèque";
        case VIREMENT:
            return "Virement";
        case MOBILE_MONEY:
            return "Mobile money";
        case ANCIEN_ECRAN:
            return "Régler les BL";
        default:
            return mode == null ? "" : mode;
        }
    }
}
