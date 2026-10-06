package rest.service.impl.rh;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Presence d'un employe sur une journee (plan d'octobre, section 3, lot L11b), sans base de donnees : pointages
 * apparies en entrees / sorties, presence, retard, depart anticipe, heures supplementaires et incoherences.
 *
 * <p>
 * Incoherences detectees : DOUBLON (meme pointage a moins de 2 minutes), DEUX_ENTREES, SORTIE_SANS_ENTREE,
 * ENTREE_SANS_SORTIE, JOURNEE_LONGUE (au-dela du seuil et d'une heure de plus que le prevu), POINTAGE_EN_CONGE (absence
 * validee), ABSENT (journee prevue sans pointage ni absence), HORS_PLANNING (presence un jour de repos ou sans
 * planning).
 */
public final class AnalysePresence {

    public static final String ENTREE = "ENTREE";
    public static final String SORTIE = "SORTIE";
    public static final String INCONNU = "INCONNU";
    static final int ECART_DOUBLON_MIN = 2;
    /** Une garde de nuit garde les pointages du lendemain jusqu'a sa fin + 4 h. */
    static final int MARGE_GARDE_H = 4;

    private AnalysePresence() {
    }

    /** Planning du jour (null = rien de prevu). */
    public static final class Prevu {
        public final String type;
        public final LocalTime debut;
        public final LocalTime fin;
        public final int pause;

        public Prevu(String type, LocalTime debut, LocalTime fin, int pause) {
            this.type = type;
            this.debut = debut;
            this.fin = fin;
            this.pause = pause;
        }

        boolean travaille() {
            return !"REPOS".equals(type) && debut != null && fin != null;
        }

        boolean deNuit() {
            return travaille() && !fin.isAfter(debut);
        }

        int minutes() {
            return travaille() ? RegleRh.minutes(debut, fin, pause) : 0;
        }
    }

    /** Un pointage. */
    public static final class Pointage {
        public final LocalDateTime t;
        public final String sens;

        public Pointage(LocalDateTime t, String sens) {
            this.t = t;
            this.sens = sens == null ? INCONNU : sens;
        }
    }

    /** Le resultat d'une journee. */
    public static final class Journee {
        public LocalDate jour;
        public LocalDateTime entree;
        public LocalDateTime sortie;
        public int presence;
        public int prevu;
        public int retard;
        public int departAnticipe;
        public int heuresSup;
        public String absence;
        public final List<String> anomalies = new ArrayList<>();
        public final List<Pointage> retenus = new ArrayList<>();

        public boolean absent() {
            return anomalies.contains("ABSENT");
        }
    }

    /** Jour auquel rattacher un pointage : la veille si la garde de nuit de la veille n'est pas finie (+ 4 h). */
    public static LocalDate rattachement(LocalDateTime t, Prevu veille) {
        if (veille != null && veille.deNuit() && !t.toLocalTime().isAfter(veille.fin.plusHours(MARGE_GARDE_H))
                && t.toLocalTime().isBefore(veille.debut)) {
            return t.toLocalDate().minusDays(1);
        }
        return t.toLocalDate();
    }

    /**
     * @param absenceValidee
     *            type de l'absence validee ce jour-la, ou null
     * @param tolerance
     *            minutes de tolerance avant de compter un retard (ou un depart anticipe)
     * @param journeeMaxMin
     *            presence au-dela de laquelle la journee est signalee
     */
    public static Journee analyser(LocalDate jour, Prevu prevu, List<Pointage> pointages, String absenceValidee,
            int tolerance, int journeeMaxMin) {
        Journee j = new Journee();
        j.jour = jour;
        j.absence = absenceValidee;
        j.prevu = prevu == null ? 0 : prevu.minutes();
        List<Pointage> pts = new ArrayList<>(pointages == null ? new ArrayList<>() : pointages);
        pts.sort(Comparator.comparing(p -> p.t));
        /* 1. doublons */
        List<Pointage> uniques = new ArrayList<>();
        for (Pointage p : pts) {
            Pointage der = uniques.isEmpty() ? null : uniques.get(uniques.size() - 1);
            if (der != null && Duration.between(der.t, p.t).toMinutes() < ECART_DOUBLON_MIN
                    && (der.sens.equals(p.sens) || INCONNU.equals(p.sens) || INCONNU.equals(der.sens))) {
                ajouter(j, "DOUBLON");
                continue;
            }
            uniques.add(p);
        }
        /* 2. sens inconnu : alternance entree / sortie */
        String attendu = ENTREE;
        List<Pointage> sens = new ArrayList<>();
        for (Pointage p : uniques) {
            String s = INCONNU.equals(p.sens) ? attendu : p.sens;
            sens.add(new Pointage(p.t, s));
            attendu = ENTREE.equals(s) ? SORTIE : ENTREE;
        }
        j.retenus.addAll(sens);
        /* 3. appariement */
        LocalDateTime ouverte = null;
        long minutes = 0;
        for (Pointage p : sens) {
            if (ENTREE.equals(p.sens)) {
                if (ouverte != null) {
                    ajouter(j, "DEUX_ENTREES");
                    continue;
                }
                ouverte = p.t;
                if (j.entree == null) {
                    j.entree = p.t;
                }
            } else {
                if (ouverte == null) {
                    ajouter(j, "SORTIE_SANS_ENTREE");
                    continue;
                }
                minutes += Duration.between(ouverte, p.t).toMinutes();
                ouverte = null;
                j.sortie = p.t;
            }
        }
        if (ouverte != null) {
            ajouter(j, "ENTREE_SANS_SORTIE");
        }
        j.presence = (int) minutes;
        /* 4. ecarts au planning */
        if (absenceValidee != null && !sens.isEmpty()) {
            ajouter(j, "POINTAGE_EN_CONGE");
        }
        if (prevu != null && prevu.travaille()) {
            if (sens.isEmpty() && absenceValidee == null) {
                ajouter(j, "ABSENT");
            }
            LocalDateTime debutPrevu = jour.atTime(prevu.debut);
            LocalDateTime finPrevue = prevu.deNuit() ? jour.plusDays(1).atTime(prevu.fin) : jour.atTime(prevu.fin);
            if (j.entree != null) {
                long r = Duration.between(debutPrevu, j.entree).toMinutes();
                j.retard = r > tolerance ? (int) r : 0;
            }
            if (j.sortie != null) {
                long a = Duration.between(j.sortie, finPrevue).toMinutes();
                j.departAnticipe = a > tolerance ? (int) a : 0;
            }
            j.heuresSup = Math.max(0, j.presence - j.prevu);
        } else if (j.presence > 0 && absenceValidee == null) {
            ajouter(j, "HORS_PLANNING");
            j.heuresSup = j.presence;
        }
        /*
         * longue : au-dela du seuil ET de plus d'une heure au-dela du prevu (une garde de 12 h prevue n'est pas
         * anormale)
         */
        if (journeeMaxMin > 0 && j.presence > Math.max(journeeMaxMin, j.prevu + 60)) {
            ajouter(j, "JOURNEE_LONGUE");
        }
        return j;
    }

    private static void ajouter(Journee j, String a) {
        if (!j.anomalies.contains(a)) {
            j.anomalies.add(a);
        }
    }
}
