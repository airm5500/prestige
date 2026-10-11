package com.prestige.etiquettage.catalogue;

import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Controle et mise en forme d'une valeur saisie ou importee, selon le type de son champ. Les memes regles servent a la
 * fiche produit et a l'import, avec des messages clairs (« février n'a pas de 31 », « CIP de 6 chiffres »).
 */
public final class Controles {

    public static final DateTimeFormatter JJ_MM_AAAA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Pattern DATE_FR = Pattern.compile("(\\d{1,2})[/.\\-](\\d{1,2})[/.\\-](\\d{2}|\\d{4})");
    private static final Pattern DATE_ISO = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})(?:[T ].*)?");
    private static final Pattern MOIS_ANNEE = Pattern.compile("(\\d{1,2})[/.\\-](\\d{4}|\\d{2})");
    private static final String[] MOIS = { "", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
            "septembre", "octobre", "novembre", "décembre" };

    private Controles() {
    }

    /** Valeur controlee : {@code valeur} mise en forme (null = vide), ou {@code erreur} (message pour l'utilisateur). */
    public record Resultat(String valeur, String erreur) {

        public boolean ok() {
            return erreur == null;
        }

        static Resultat ok(String v) {
            return new Resultat(v, null);
        }

        static Resultat erreur(String m) {
            return new Resultat(null, m);
        }
    }

    public static Resultat controler(Champ c, String brute) {
        String v = brute == null ? "" : brute.replace(' ', ' ').strip();
        if (v.isEmpty()) {
            return c.obligatoire() ? Resultat.erreur(c.libelle() + " obligatoire.") : Resultat.ok(null);
        }
        return switch (c.type()) {
            case CODE -> code(c, v);
            case TEXTE -> texte(c, v);
            case PRIX -> entier(c, v, true);
            case ENTIER -> entier(c, v, false);
            case DATE -> date(c, v);
        };
    }

    static Resultat code(Champ c, String v) {
        String s = v.replace(" ", "");
        if (s.matches("\\d+\\.0+")) {
            /* nombre lu dans un tableur (3400930000014.0) */
            s = s.substring(0, s.indexOf('.'));
        }
        if (!s.matches("\\d+")) {
            return Resultat.erreur(c.libelle() + " « " + v + " » : chiffres seulement.");
        }
        if ("cip".equals(c.nom())) {
            if (s.length() != 7 && s.length() != 13) {
                return Resultat.erreur("CIP " + s + " : " + s.length() + " chiffre" + (s.length() > 1 ? "s" : "")
                        + " (7 ou 13 attendus).");
            }
            return Resultat.ok(s);
        }
        if ("ean".equals(c.nom())) {
            if (s.length() != 8 && s.length() != 13 && s.length() != 14) {
                return Resultat.erreur("EAN " + s + " : " + s.length() + " chiffres (8, 13 ou 14 attendus).");
            }
            if (!cleEanValide(s)) {
                return Resultat.erreur("EAN " + s + " : clé de contrôle incorrecte.");
            }
            return Resultat.ok(s);
        }
        if (s.length() > c.longueurMax()) {
            return Resultat.erreur(c.libelle() + " : " + s.length() + " chiffres, " + c.longueurMax() + " au plus.");
        }
        return Resultat.ok(s);
    }

    /** Cle de controle GS1 (EAN-8, EAN-13, GTIN-14). */
    public static boolean cleEanValide(String s) {
        int somme = 0;
        for (int i = s.length() - 2, poids = 3; i >= 0; i--, poids = 4 - poids) {
            somme += (s.charAt(i) - '0') * poids;
        }
        return (10 - somme % 10) % 10 == s.charAt(s.length() - 1) - '0';
    }

    static Resultat texte(Champ c, String v) {
        String s = v.replaceAll("\\s+", " ");
        if (s.codePoints().anyMatch(cp -> Character.isISOControl(cp))) {
            return Resultat.erreur(c.libelle() + " : caractère de contrôle non autorisé.");
        }
        if ("designation".equals(c.nom())) {
            s = s.toUpperCase(Locale.FRANCE);
        }
        if (s.length() > c.longueurMax()) {
            return Resultat.erreur(c.libelle() + " : " + s.length() + " caractères, " + c.longueurMax() + " au plus.");
        }
        return Resultat.ok(s);
    }

    static Resultat entier(Champ c, String v, boolean prix) {
        String s = v.replaceAll("[\\s ]", "");
        if (prix) {
            s = s.replaceAll("(?i)(f|fcfa|cfa|xof|€|eur|euros?)$", "");
        }
        s = s.replace(',', '.');
        BigDecimal n;
        try {
            n = new BigDecimal(s);
        } catch (NumberFormatException e) {
            return Resultat.erreur(c.libelle() + " « " + v + " » : nombre attendu" + (prix ? " (ex. 1 250)." : "."));
        }
        if (n.signum() < 0) {
            return Resultat.erreur(c.libelle() + " : nombre négatif non autorisé.");
        }
        if (n.stripTrailingZeros().scale() > 0) {
            return Resultat.erreur(c.libelle() + " « " + v + " » : nombre entier attendu.");
        }
        if (n.compareTo(BigDecimal.valueOf(prix ? 999_999_999L : 99_999)) > 0) {
            return Resultat.erreur(c.libelle() + " « " + v + " » : valeur trop grande.");
        }
        if ("nombre".equals(c.nom()) && (n.intValue() < 1 || n.intValue() > 999)) {
            return Resultat.erreur("Nombre d'étiquettes : de 1 à 999.");
        }
        return Resultat.ok(n.toBigInteger().toString());
    }

    /**
     * Date : jj/mm/aaaa (ou jj/mm/aa, separateurs / . -), aaaa-mm-jj, ou mm/aaaa (fin du mois, comme sur les boites).
     * Rend jj/mm/aaaa.
     */
    static Resultat date(Champ c, String v) {
        try {
            Matcher m = DATE_FR.matcher(v);
            if (m.matches()) {
                return jourValide(c, Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), annee(m.group(3)), v);
            }
            m = DATE_ISO.matcher(v);
            if (m.matches()) {
                return jourValide(c, Integer.parseInt(m.group(3)), Integer.parseInt(m.group(2)),
                        Integer.parseInt(m.group(1)), v);
            }
            m = MOIS_ANNEE.matcher(v);
            if (m.matches()) {
                int mois = Integer.parseInt(m.group(1));
                if (mois < 1 || mois > 12) {
                    return Resultat.erreur(c.libelle() + " « " + v + " » : mois " + mois + " invalide.");
                }
                return Resultat.ok(YearMonth.of(annee(m.group(2)), mois).atEndOfMonth().format(JJ_MM_AAAA));
            }
        } catch (DateTimeException | NumberFormatException e) {
            // message ci-dessous
        }
        return Resultat.erreur(c.libelle() + " « " + v + " » : date invalide, format jj/mm/aaaa.");
    }

    private static int annee(String a) {
        int x = Integer.parseInt(a);
        return a.length() == 2 ? 2000 + x : x;
    }

    private static Resultat jourValide(Champ c, int j, int m, int a, String v) {
        if (m < 1 || m > 12) {
            return Resultat.erreur(c.libelle() + " « " + v + " » : mois " + m + " invalide.");
        }
        if (a < 1900 || a > 2199) {
            return Resultat.erreur(c.libelle() + " « " + v + " » : année " + a + " invalide.");
        }
        int max = YearMonth.of(a, m).lengthOfMonth();
        if (j < 1 || j > max) {
            String cause = j > max && j <= 31 ? MOIS[m] + " n'a pas de " + j : "jour " + j + " impossible";
            return Resultat.erreur("Date invalide : " + cause + ". Format jj/mm/aaaa.");
        }
        return Resultat.ok(LocalDate.of(a, m, j).format(JJ_MM_AAAA));
    }
}
