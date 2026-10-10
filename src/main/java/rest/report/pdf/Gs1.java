package rest.report.pdf;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Retours du 10/10 (point 5, Q5) : codification GS1 des etiquettes 2D (QR code ou DataMatrix), celle des boites
 * pharmaceutiques.
 * <ul>
 * <li>(01) GTIN-14 : le code EAN-13 du fabricant (ou l'EAN du produit) precede d'un 0, s'il est valable ;</li>
 * <li>(17) peremption AAMMJJ ;</li>
 * <li>(10) numero de lot (longueur variable, 20 au plus) ;</li>
 * <li>(240) CIP (identification complementaire, longueur variable, 30 au plus), toujours en dernier.</li>
 * </ul>
 * Les champs de longueur variable sont separes par le caractere GS (0x1D) quand un champ suit. A la lecture, on accepte
 * la forme brute (avec ou sans prefixe d'identification « ]d2 », « ]Q3 », « ]C1 ») et la forme lisible entre
 * parentheses ; les douchettes qui transmettent GS sous une autre forme (« <GS> », « ^] », « ~1 », « | ») sont
 * comprises.
 */
public final class Gs1 {

    public static final char GS = '\u001d';
    private static final DateTimeFormatter AAMMJJ = DateTimeFormatter.ofPattern("yyMMdd");

    /** Contenu d'une etiquette GS1. */
    public static final class Contenu {
        public String gtin, lot, cip;
        public LocalDate peremption;

        @Override
        public String toString() {
            return "gtin=" + gtin + " peremption=" + peremption + " lot=" + lot + " cip=" + cip;
        }
    }

    private Gs1() {
    }

    /** Chiffre de controle GS1 (modulo 10) des chiffres donnes. */
    static int cle(String chiffres) {
        int somme = 0;
        for (int i = chiffres.length() - 1, poids = 3; i >= 0; i--, poids = 4 - poids) {
            somme += (chiffres.charAt(i) - '0') * poids;
        }
        return (10 - somme % 10) % 10;
    }

    /** GTIN-14 d'un EAN-8 / UPC-12 / EAN-13 / GTIN-14 valable (cle juste), sinon null. */
    public static String gtin14(String ean) {
        if (ean == null) {
            return null;
        }
        String e = ean.trim();
        if (!e.matches("\\d{8}|\\d{12}|\\d{13}|\\d{14}")) {
            return null;
        }
        String g = "00000000000000".substring(e.length()) + e;
        return cle(g.substring(0, 13)) == g.charAt(13) - '0' ? g : null;
    }

    private static String nettoyer(String v, int max) {
        if (v == null) {
            return null;
        }
        /* jeu de caracteres GS1 (82 caracteres) : on garde lettres, chiffres et ponctuation simple */
        /* accents retires (é -> e), puis seulement le jeu de caracteres GS1 */
        String s = java.text.Normalizer.normalize(v.trim(), java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9!\"%&'()*+,\\-./:;<=>?_]", "");
        return s.isEmpty() ? null : s.length() > max ? s.substring(0, max) : s;
    }

    /** Chaine d'elements GS1 brute (sans FNC1 initial), GS entre un champ variable et le suivant. */
    public static String brute(String ean, LocalDate peremption, String lot, String cip) {
        StringBuilder s = new StringBuilder();
        String g = gtin14(ean);
        if (g != null) {
            s.append("01").append(g);
        }
        if (peremption != null) {
            s.append("17").append(peremption.format(AAMMJJ));
        }
        String l = nettoyer(lot, 20), c = nettoyer(cip, 30);
        if (l != null) {
            s.append("10").append(l);
            if (c != null) {
                s.append(GS);
            }
        }
        if (c != null) {
            s.append("240").append(c);
        }
        return s.toString();
    }

    /** Forme lisible : (01)…(17)…(10)…(240)… */
    public static String lisible(String brute) {
        Contenu c = lire(brute);
        StringBuilder s = new StringBuilder();
        if (c.gtin != null) {
            s.append("(01)").append(c.gtin);
        }
        if (c.peremption != null) {
            s.append("(17)").append(c.peremption.format(AAMMJJ));
        }
        if (c.lot != null) {
            s.append("(10)").append(c.lot);
        }
        if (c.cip != null) {
            s.append("(240)").append(c.cip);
        }
        return s.toString();
    }

    /** Vrai si la saisie ressemble a un code GS1 (et non a un simple CIP ou EAN). */
    public static boolean estGs1(String saisie) {
        if (saisie == null) {
            return false;
        }
        String s = normaliser(saisie);
        if (s.startsWith("(")) {
            return s.matches("\\((01|17|10|240)\\).*");
        }
        Contenu c = lire(saisie);
        return c.gtin != null && (c.peremption != null || c.lot != null || c.cip != null)
                || c.cip != null && (c.peremption != null || c.lot != null);
    }

    private static String normaliser(String saisie) {
        String s = saisie.trim();
        for (String prefixe : new String[] { "]d2", "]Q3", "]C1", "]e0" }) {
            if (s.startsWith(prefixe)) {
                s = s.substring(prefixe.length());
            }
        }
        return s.replace("<GS>", String.valueOf(GS)).replace("^]", String.valueOf(GS)).replace("~1", String.valueOf(GS))
                .replace('|', GS).replace('è', GS);
    }

    /** Lit une etiquette GS1 (forme brute ou lisible) ; champs absents a null. */
    public static Contenu lire(String saisie) {
        Contenu c = new Contenu();
        if (saisie == null) {
            return c;
        }
        String s = normaliser(saisie);
        Map<String, String> champs = new LinkedHashMap<>();
        if (s.startsWith("(")) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\((\\d{2,4})\\)([^(]*)").matcher(s);
            while (m.find()) {
                champs.put(m.group(1), m.group(2).replace(String.valueOf(GS), ""));
            }
        } else {
            int i = 0;
            while (i < s.length()) {
                if (s.charAt(i) == GS) {
                    i++;
                    continue;
                }
                if (s.startsWith("01", i) && i + 16 <= s.length()) {
                    champs.put("01", s.substring(i + 2, i + 16));
                    i += 16;
                } else if (s.startsWith("17", i) && i + 8 <= s.length()) {
                    champs.put("17", s.substring(i + 2, i + 8));
                    i += 8;
                } else if (s.startsWith("10", i) || s.startsWith("240", i)) {
                    int debut = i + (s.startsWith("240", i) ? 3 : 2);
                    String ai = s.startsWith("240", i) ? "240" : "10";
                    int fin = s.indexOf(GS, debut);
                    fin = fin < 0 ? s.length() : fin;
                    champs.put(ai, s.substring(debut, fin));
                    i = fin;
                } else {
                    break; // identifiant inconnu : on s'arrete (le reste n'est pas lisible sans table complete)
                }
            }
        }
        String g = champs.get("01");
        c.gtin = g != null && g.matches("\\d{14}") ? g : null;
        String p = champs.get("17");
        if (p != null && p.matches("\\d{6}")) {
            int an = 2000 + Integer.parseInt(p.substring(0, 2)), mois = Integer.parseInt(p.substring(2, 4)),
                    jour = Integer.parseInt(p.substring(4, 6));
            try {
                /* jour 00 = dernier jour du mois (regle GS1) */
                c.peremption = jour == 0
                        ? LocalDate.of(an, mois, 1).withDayOfMonth(LocalDate.of(an, mois, 1).lengthOfMonth())
                        : LocalDate.of(an, mois, jour);
            } catch (java.time.DateTimeException e) {
                c.peremption = null;
            }
        }
        c.lot = vide(champs.get("10"));
        c.cip = vide(champs.get("240"));
        return c;
    }

    private static String vide(String v) {
        return v == null || v.trim().isEmpty() ? null : v.trim();
    }

    /** EAN-13 contenu dans un GTIN-14 (sans le 0 initial), sinon le GTIN. */
    public static String ean13(String gtin) {
        return gtin != null && gtin.length() == 14 && gtin.charAt(0) == '0' ? gtin.substring(1) : gtin;
    }
}
