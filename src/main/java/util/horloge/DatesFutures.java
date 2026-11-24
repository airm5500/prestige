package util.horloge;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Cahier des charges du 24/11, point 1 : une date saisie dans le futur est refusée au serveur (date de règlement d'un
 * différé, modification de la date d'une vente), pas seulement par le calendrier de l'écran. La référence est l'heure
 * réelle suivie par le serveur (jamais l'horloge du poste). Fonctions pures : rendent le message de refus, ou null.
 */
public final class DatesFutures {

    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FR_HEURE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private DatesFutures() {
    }

    /** Jour au format 2026-11-24, 2026-11-24T…, ou 24/11/2026 ; null si illisible. */
    public static LocalDate jour(String v) {
        if (v == null || v.trim().isEmpty()) {
            return null;
        }
        String s = v.trim();
        try {
            if (s.matches("\\d{2}/\\d{2}/\\d{4}")) {
                return LocalDate.parse(s, FR);
            }
            return LocalDate.parse(s.length() > 10 ? s.substring(0, 10) : s);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Date et heure (HH:mm ou HH:mm:ss) ; null si illisible. */
    public static LocalDateTime instant(String date, String heure) {
        LocalDate d = jour(date);
        if (d == null || heure == null) {
            return null;
        }
        try {
            return LocalDateTime.of(d, LocalTime.parse(heure.trim()));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Refus d'un jour postérieur à aujourd'hui (heure réelle) ; null si accepté. */
    public static String refusJour(LocalDate saisi, LocalDate aujourdhui, String quoi) {
        if (saisi == null) {
            return "Date de " + quoi + " absente ou illisible.";
        }
        if (saisi.isAfter(aujourdhui)) {
            return "Date de " + quoi + " refusée : le " + saisi.format(FR) + " est dans le futur (nous sommes le "
                    + aujourdhui.format(FR) + ").";
        }
        return null;
    }

    /** Refus d'une date et heure postérieure à la minute en cours (heure réelle) ; null si accepté. */
    public static String refusInstant(LocalDateTime saisi, LocalDateTime maintenant, String quoi) {
        if (saisi == null) {
            return "Date de " + quoi + " absente ou illisible.";
        }
        if (saisi.isAfter(maintenant.withSecond(59).withNano(0))) {
            return "Date de " + quoi + " refusée : le " + saisi.format(FR_HEURE) + " est dans le futur (il est "
                    + maintenant.format(FR_HEURE) + ").";
        }
        return null;
    }
}
