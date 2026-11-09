package rest.service.extranet.commun;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Regles de normalisation du plan du 07/11 (§17) :
 * <ul>
 * <li>references et CIP restent des chaines, sans longueur supposee ;</li>
 * <li>null (absent), "" (vide), liste vide, zero et inconnu (« N/A ») restent distincts : une valeur inconnue donne
 * null, jamais 0 ;</li>
 * <li>dates francaises au format explicite, sans heure inventee ;</li>
 * <li>montants : la valeur brute est gardee a cote du decimal ({@link BigDecimal}).</li>
 * </ul>
 */
public final class Normalisation {

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/uuuu")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter JOUR_HEURE = DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter JOUR_HEURE_SEC = DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm:ss")
            .withResolverStyle(ResolverStyle.STRICT);

    private Normalisation() {
    }

    /** Espaces insecables et blancs multiples ramenes a un espace, bords retires. null reste null. */
    public static String texte(String s) {
        if (s == null) {
            return null;
        }
        return s.replace(' ', ' ').replace(' ', ' ').replaceAll("\\s+", " ").trim();
    }

    /** « N/A », « NA », « n.a. » : valeur non renseignee (a ne pas confondre avec zero ni avec vide). */
    public static boolean inconnu(String s) {
        String t = texte(s);
        if (t == null) {
            return false;
        }
        String c = t.replace(".", "").replace("/", "").toUpperCase();
        return "NA".equals(c);
    }

    /** Date seule jj/mm/aaaa ; null si absente, vide, inconnue ou invalide. */
    public static LocalDate date(String s) {
        String t = texte(s);
        if (t == null || t.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(t, JOUR);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Date et heure, seulement si l'heure est ecrite dans la source ; null sinon (jamais d'heure inventee). */
    public static LocalDateTime dateHeure(String s) {
        String t = texte(s);
        if (t == null || t.isEmpty()) {
            return null;
        }
        for (DateTimeFormatter f : new DateTimeFormatter[] { JOUR_HEURE_SEC, JOUR_HEURE }) {
            try {
                return LocalDateTime.parse(t, f);
            } catch (DateTimeParseException e) {
                // format suivant
            }
        }
        return null;
    }

    /**
     * Montant affiche (« 2 736 CFA », « 6431 », « 1 234,50 ») ; null si absent, inconnu ou illisible. Les lettres
     * (devise) sont ignorees ; la devise n'est pas deduite.
     */
    public static BigDecimal montant(String s) {
        String t = texte(s);
        if (t == null || t.isEmpty() || inconnu(t)) {
            return null;
        }
        String n = t.replaceAll("[^0-9,.\\-]", "");
        if (n.isEmpty() || "-".equals(n)) {
            return null;
        }
        int v = n.lastIndexOf(','), p = n.lastIndexOf('.');
        if (v >= 0 && p >= 0) {
            char dec = v > p ? ',' : '.';
            char mil = dec == ',' ? '.' : ',';
            n = n.replace(String.valueOf(mil), "").replace(dec, '.');
        } else if (v >= 0) {
            n = n.replace(',', '.');
        }
        if (n.indexOf('.') != n.lastIndexOf('.') || n.lastIndexOf('-') > 0) {
            return null;
        }
        try {
            return new BigDecimal(n);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Entier (stock, quantite) ; null si absent, inconnu ou non entier. */
    public static Integer entier(String s) {
        BigDecimal b = montant(s);
        if (b == null) {
            return null;
        }
        try {
            return b.intValueExact();
        } catch (ArithmeticException e) {
            return null;
        }
    }

    /**
     * Liste de colisages affichee (« 120, 140 ») : null si inconnue (« N/A ») ou absente, liste vide si le texte est
     * vide, sinon chaque valeur lue. Une valeur illisible rend toute la liste inconnue (on garde le brut a cote).
     */
    public static List<Integer> colisages(String s) {
        String t = texte(s);
        if (t == null || inconnu(t)) {
            return null;
        }
        if (t.isEmpty()) {
            return Collections.emptyList();
        }
        List<Integer> l = new ArrayList<>();
        for (String m : t.split("[,;/]")) {
            String x = m.trim();
            if (x.isEmpty()) {
                continue;
            }
            if (!x.matches("\\d+")) {
                return null;
            }
            l.add(Integer.valueOf(x));
        }
        return l;
    }
}
