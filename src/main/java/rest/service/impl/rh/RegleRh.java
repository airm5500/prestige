package rest.service.impl.rh;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

/**
 * Regles RH sans base de donnees (plan d'octobre, section 3, lot L11) : planning de la semaine et absences.
 */
public final class RegleRh {

    public static final List<String> TYPES_PLANNING = Arrays.asList("TRAVAIL", "GARDE", "REPOS");
    public static final List<String> TYPES_ABSENCE = Arrays.asList("CONGE", "REPOS", "MALADIE", "AUTRE");
    public static final List<String> DEMI_JOURNEES = Arrays.asList("MATIN", "APRES_MIDI");

    private RegleRh() {
    }

    /** Lundi de la semaine du jour donne. */
    public static LocalDate lundi(LocalDate jour) {
        return jour.with(DayOfWeek.MONDAY);
    }

    /** « 8:00 », « 08h30 », « 0830 » -> heure ; null si illisible. */
    public static LocalTime heure(String s) {
        if (s == null || s.trim().isEmpty()) {
            return null;
        }
        String t = s.trim().toLowerCase().replace('h', ':').replace('.', ':');
        if (t.matches("\\d{3,4}")) {
            t = t.substring(0, t.length() - 2) + ":" + t.substring(t.length() - 2);
        }
        if (t.endsWith(":")) {
            t = t + "00";
        }
        if (t.matches("\\d{1,2}")) {
            t = t + ":00";
        }
        try {
            String[] p = t.split(":");
            return LocalTime.of(Integer.parseInt(p[0]), Integer.parseInt(p[1]));
        } catch (RuntimeException e) {
            return null;
        }
    }

    /**
     * Minutes de travail prevues : de debut a fin (fin avant debut = le lendemain, garde de nuit), moins la pause ;
     * jamais negatif.
     */
    public static int minutes(LocalTime debut, LocalTime fin, int pause) {
        if (debut == null || fin == null) {
            return 0;
        }
        long m = ChronoUnit.MINUTES.between(debut, fin);
        if (m <= 0) {
            m += 24 * 60;
        }
        return (int) Math.max(0, m - Math.max(0, pause));
    }

    /** Controle d'une case du planning : message d'erreur, ou null si la saisie est correcte. */
    public static String controlerPlanning(String type, String debut, String fin, int pause) {
        if (!TYPES_PLANNING.contains(type)) {
            return "Type inconnu (travail, garde ou repos).";
        }
        if ("REPOS".equals(type)) {
            return null;
        }
        LocalTime d = heure(debut), f = heure(fin);
        if (d == null || f == null) {
            return "Heures de début et de fin obligatoires (ex. 08:00).";
        }
        if (d.equals(f)) {
            return "Le début et la fin sont identiques.";
        }
        if (pause < 0 || pause >= minutes(d, f, 0)) {
            return "La pause doit être plus courte que la journée.";
        }
        return null;
    }

    /** Controle d'une absence : message d'erreur, ou null. */
    public static String controlerAbsence(String type, LocalDate debut, LocalDate fin, String demiJournee) {
        if (!TYPES_ABSENCE.contains(type)) {
            return "Type d'absence inconnu.";
        }
        if (debut == null || fin == null) {
            return "Dates de début et de fin obligatoires.";
        }
        if (fin.isBefore(debut)) {
            return "La fin est avant le début.";
        }
        if (demiJournee != null && !demiJournee.isEmpty()) {
            if (!DEMI_JOURNEES.contains(demiJournee)) {
                return "Demi-journée : matin ou après-midi.";
            }
            if (!debut.equals(fin)) {
                return "Une demi-journée ne porte que sur un seul jour.";
            }
        }
        if (ChronoUnit.DAYS.between(debut, fin) > 366) {
            return "Une absence ne dépasse pas un an.";
        }
        return null;
    }

    /** Nombre de jours (calendaires) d'une absence ; une demi-journee compte 0,5. */
    public static double jours(LocalDate debut, LocalDate fin, String demiJournee) {
        if (demiJournee != null && !demiJournee.isEmpty()) {
            return 0.5;
        }
        return ChronoUnit.DAYS.between(debut, fin) + 1;
    }

    /** Deux periodes [d1, f1] et [d2, f2] se chevauchent-elles ? */
    public static boolean chevauche(LocalDate d1, LocalDate f1, LocalDate d2, LocalDate f2) {
        return !d1.isAfter(f2) && !d2.isAfter(f1);
    }
}
