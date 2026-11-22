package util;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Plan du 21/11, point 16.1 : lecture de la date de peremption tapee au clavier en commande en cours.
 *
 * <p>
 * Formes reconnues (reponses du 22/11) :
 * <ul>
 * <li>{@code MM/AA} ({@code 01/27}) et {@code MM/AAAA} : mois et annee seulement, donc le DERNIER jour du mois
 * (31/01/2027), comme le DataMatrix et les boites ;</li>
 * <li>4 chiffres : {@code MMAA} ({@code 0127} = 31/01/2027, reponse du 22/11), dernier jour du mois ;</li>
 * <li>6 chiffres finissant par 20AA : {@code MMAAAA} ({@code 012027}), dernier jour du mois aussi ;</li>
 * <li>autres 6 chiffres : {@code JJMMAA} ({@code 010127} = 01/01/2027) ; les deux formes ne se confondent pas : en
 * JJMMAA, les 3e et 4e chiffres sont un mois (01 a 12), jamais « 20 » ;</li>
 * <li>8 chiffres : {@code JJMMAAAA} ;</li>
 * <li>{@code JJ-MM-AA}, {@code JJ/MM/AA}, {@code JJ.MM.AA}, et les memes avec l'annee sur 4 chiffres.</li>
 * </ul>
 * Refus avec un motif : date impossible (13/27, 32/01/27), date passee, saisie non reconnue. Une annee sur 2 chiffres
 * est 20AA.
 */
public final class PeremptionSaisie {

    private static final Pattern MOIS_ANNEE = Pattern.compile("(\\d{1,2})[/.\\-](\\d{2}|\\d{4})");
    private static final Pattern JOUR_MOIS_ANNEE = Pattern.compile("(\\d{1,2})[/.\\-](\\d{1,2})[/.\\-](\\d{2}|\\d{4})");

    /** Resultat : la date, ou le motif du refus. */
    public static final class Resultat {

        private final LocalDate date;
        private final String motif;

        private Resultat(LocalDate date, String motif) {
            this.date = date;
            this.motif = motif;
        }

        public boolean isValide() {
            return date != null;
        }

        public LocalDate getDate() {
            return date;
        }

        public String getMotif() {
            return motif;
        }
    }

    private PeremptionSaisie() {
    }

    /** Lecture de la saisie ; {@code aujourdhui} sert a refuser une date passee. Saisie vide : refus « vide ». */
    public static Resultat lire(String saisie, LocalDate aujourdhui) {
        String s = saisie == null ? "" : saisie.trim();
        if (s.isEmpty()) {
            return refus("Date de péremption vide.");
        }
        LocalDate d;
        try {
            d = interpreter(s);
        } catch (DateTimeException | NumberFormatException e) {
            return refus("Date impossible : « " + s + " ».");
        }
        if (d == null) {
            return refus("Date non reconnue : « " + s + " ». Exemples : 01/27, 0127, 012027, 010127, 01/01/2027.");
        }
        if (d.isBefore(aujourdhui)) {
            return refus("Date passée : "
                    + String.format("%02d/%02d/%04d", d.getDayOfMonth(), d.getMonthValue(), d.getYear()) + ".");
        }
        return new Resultat(d, null);
    }

    /** La date lue, null si la forme n'est pas reconnue ; DateTimeException si elle est impossible. */
    static LocalDate interpreter(String s) {
        if (s.matches("\\d{4}")) {
            return finDeMois(Integer.parseInt(s.substring(0, 2)), annee(s.substring(2)));
        }
        if (s.matches("\\d{6}")) {
            if (s.startsWith("20", 2)) {
                return finDeMois(Integer.parseInt(s.substring(0, 2)), Integer.parseInt(s.substring(2)));
            }
            return LocalDate.of(annee(s.substring(4)), Integer.parseInt(s.substring(2, 4)),
                    Integer.parseInt(s.substring(0, 2)));
        }
        if (s.matches("\\d{8}")) {
            return LocalDate.of(Integer.parseInt(s.substring(4)), Integer.parseInt(s.substring(2, 4)),
                    Integer.parseInt(s.substring(0, 2)));
        }
        Matcher m = JOUR_MOIS_ANNEE.matcher(s);
        if (m.matches()) {
            return LocalDate.of(annee(m.group(3)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
        }
        m = MOIS_ANNEE.matcher(s);
        if (m.matches()) {
            return finDeMois(Integer.parseInt(m.group(1)), annee(m.group(2)));
        }
        return null;
    }

    private static int annee(String a) {
        return a.length() == 2 ? 2000 + Integer.parseInt(a) : Integer.parseInt(a);
    }

    private static LocalDate finDeMois(int mois, int annee) {
        return YearMonth.of(annee, mois).atEndOfMonth();
    }

    private static Resultat refus(String motif) {
        return new Resultat(null, motif);
    }
}
