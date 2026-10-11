package rest.report.pdf;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Codes etendus d'Etiquettage Pro (hors vente : commande, reception, inventaire, controle de rayon). Les codes
 * existants (QR et DataMatrix GS1, code-barres du CIP) ne changent pas.
 * <ul>
 * <li><b>DataMatrix+</b> : la chaine GS1 habituelle — (01) GTIN, (17) peremption, (10) lot, (240) CIP — que toute
 * douchette comprend, suivie des champs « usage interne » de la norme (jeu de caracteres GS1 strict : espace ecrit « _
 * ») : (91) le marqueur {@value #MARQUEUR}, puis (92) designation, (93) prix, (94) pharmacie, (95) grossiste, (96) code
 * geo, (97) code de l'etiquette.</li>
 * <li><b>QR+</b> : un texte clair sur une ligne, lisible par un telephone :
 * {@code EP1|CIP:3400930000014|NOM:DOLIPRANE 1000MG|PRIX:1250|LOT:A2410B|PER:31/12/2027|PHA:...|GEO:B-04}.</li>
 * </ul>
 * Le marqueur rend ces codes reconnaissables sans ambiguite : un fabricant qui utiliserait lui-meme les champs 91 a 99
 * n'est pas pris pour un code etendu. Les accents sont retires (les douchettes les deforment) et chaque information est
 * bornee en longueur, ce qui borne aussi la taille du code.
 */
public final class ContenuEtendu {

    public static final String MARQUEUR = "EPLUS1";
    public static final String PREFIXE_QR = "EP1|";

    /** Informations d'un code etendu (cle -> valeur) ; les cles sont celles du QR+. */
    public static final String CIP = "CIP", NOM = "NOM", PRIX = "PRIX", LOT = "LOT", PER = "PER", PHA = "PHA",
            GEO = "GEO", GRO = "GRO", COD = "COD", EAN = "EAN";

    /** Champ GS1 interne de chaque information du DataMatrix+, et sa longueur maximale. */
    private static final String[][] CHAMPS_DM = { { NOM, "92", "40" }, { PRIX, "93", "12" }, { PHA, "94", "30" },
            { GRO, "95", "25" }, { GEO, "96", "15" }, { COD, "97", "10" } };

    private ContenuEtendu() {
    }

    /** Longueur maximale d'une information dans un code etendu. */
    public static int longueurMax(String cle) {
        for (String[] c : CHAMPS_DM) {
            if (c[0].equals(cle)) {
                return Integer.parseInt(c[2]);
            }
        }
        return CIP.equals(cle) || EAN.equals(cle) ? 30 : LOT.equals(cle) ? 20 : 10;
    }

    /**
     * Texte sans accent, limite aux caracteres que les douchettes transmettent sans les deformer (lettres, chiffres,
     * espace, ponctuation simple) ; ni « | » ni parentheses (separateurs).
     */
    public static String nettoyer(String v, int max) {
        if (v == null) {
            return null;
        }
        String s = java.text.Normalizer.normalize(v.trim(), java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9 !\"%&'*+,\\-./:;<=>?_]", "").replaceAll("\\s+", " ").trim();
        if (s.length() > max) {
            s = s.substring(0, max).trim();
        }
        return s.isEmpty() ? null : s;
    }

    /** Prix en chiffres : « 1 250 CFA » -> 1250, « 12,50 EUR » -> 12.50. */
    public static String prixChiffres(String prixAffiche) {
        if (prixAffiche == null) {
            return null;
        }
        String s = prixAffiche.replaceAll("[^0-9,.]", "").replace(',', '.');
        return s.isEmpty() ? null : s;
    }

    /**
     * Contenu du DataMatrix+ : la chaine GS1 brute ({@link Gs1#brute}) puis les informations demandees (cles de cette
     * classe), chacune dans son champ interne, separees par GS.
     */
    public static String dataMatrixPlus(String gs1Brute, Map<String, String> infos) {
        StringBuilder s = new StringBuilder(gs1Brute == null ? "" : gs1Brute);
        if (s.length() > 0) {
            s.append(Gs1.GS);
        }
        s.append("91").append(MARQUEUR);
        for (String[] c : CHAMPS_DM) {
            /*
             * jeu de caracteres GS1 strict : l'espace n'en fait pas partie (un lecteur GS1 s'arreterait la), il devient
             * « _ » ; Prestige le remet en espace a la lecture
             */
            String v = nettoyer(infos.get(c[0]), Integer.parseInt(c[2]));
            v = v == null ? null : v.replace(' ', '_');
            if (v != null) {
                s.append(Gs1.GS).append(c[1]).append(v);
            }
        }
        return s.toString();
    }

    /** Contenu du QR+ : texte clair, une information par segment « CLE:valeur », dans un ordre fixe. */
    public static String qrPlus(Map<String, String> infos) {
        StringBuilder s = new StringBuilder(PREFIXE_QR.substring(0, 3));
        for (String cle : new String[] { CIP, NOM, PRIX, LOT, PER, PHA, GEO, GRO, COD, EAN }) {
            String v = nettoyer(infos.get(cle), longueurMax(cle));
            if (v != null) {
                s.append('|').append(cle).append(':').append(v);
            }
        }
        return s.toString();
    }

    /** Vrai si la saisie est un code etendu (DataMatrix+ ou QR+). */
    public static boolean estEtendu(String saisie) {
        return lire(saisie) != null;
    }

    /**
     * Lit un code etendu : informations (cles de cette classe ; PER au format jj/mm/aaaa), plus « TYPE » = DATAMATRIX+
     * ou QR+ ; null si ce n'est pas un code etendu.
     */
    public static Map<String, String> lire(String saisie) {
        if (saisie == null) {
            return null;
        }
        String s = saisie.trim();
        for (String prefixe : new String[] { "]d2", "]Q3", "]Q1", "]C1", "]e0" }) {
            if (s.startsWith(prefixe)) {
                s = s.substring(prefixe.length());
            }
        }
        Map<String, String> r = new LinkedHashMap<>();
        if (s.toUpperCase(java.util.Locale.ROOT).startsWith(PREFIXE_QR)) {
            for (String segment : s.substring(PREFIXE_QR.length()).split("\\|")) {
                int i = segment.indexOf(':');
                if (i > 0) {
                    String cle = segment.substring(0, i).trim().toUpperCase(java.util.Locale.ROOT);
                    String v = segment.substring(i + 1).trim();
                    if (!v.isEmpty()) {
                        r.put(cle, v);
                    }
                }
            }
            r.put("TYPE", "QR+");
            return r.containsKey(CIP) ? r : null;
        }
        /* DataMatrix+ : forme lisible « (91)EPLUS1 » ou brute, GS sous ses diverses formes de douchette */
        String g = s.replace("<GS>", String.valueOf(Gs1.GS)).replace("^]", String.valueOf(Gs1.GS))
                .replace("~1", String.valueOf(Gs1.GS)).replace('|', Gs1.GS);
        int debut;
        String suite;
        if (g.startsWith("(")) {
            debut = g.indexOf("(91)" + MARQUEUR);
            if (debut < 0) {
                return null;
            }
            suite = g.substring(debut + 4 + MARQUEUR.length());
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\((9[2-7])\\)([^(]*)").matcher(suite);
            while (m.find()) {
                ranger(r, m.group(1), m.group(2));
            }
        } else {
            debut = g.indexOf(Gs1.GS + "91" + MARQUEUR);
            int longueur = 3 + MARQUEUR.length();
            if (debut < 0 && g.startsWith("91" + MARQUEUR)) {
                debut = 0;
                longueur = 2 + MARQUEUR.length();
            }
            if (debut < 0) {
                return null;
            }
            suite = g.substring(debut + longueur);
            for (String element : suite.split(String.valueOf(Gs1.GS))) {
                if (element.length() > 2) {
                    ranger(r, element.substring(0, 2), element.substring(2));
                }
            }
        }
        Gs1.Contenu c = Gs1.lire(g.substring(0, debut));
        if (c.cip != null) {
            r.put(CIP, c.cip);
        }
        if (c.lot != null) {
            r.put(LOT, c.lot);
        }
        if (c.peremption != null) {
            r.put(PER, c.peremption.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }
        if (c.gtin != null) {
            r.put(EAN, Gs1.ean13(c.gtin));
        }
        r.put("TYPE", "DATAMATRIX+");
        return r;
    }

    private static void ranger(Map<String, String> r, String ai, String valeur) {
        for (String[] c : CHAMPS_DM) {
            if (c[1].equals(ai) && !valeur.replace(String.valueOf(Gs1.GS), "").trim().isEmpty()) {
                r.put(c[0], valeur.replace(String.valueOf(Gs1.GS), "").replace('_', ' ').trim());
            }
        }
    }
}
