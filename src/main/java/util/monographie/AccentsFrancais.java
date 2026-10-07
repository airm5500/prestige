package util.monographie;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Retablit les lettres accentuees remplacees par « ? » dans certaines pages du service (ex. « Parac?tamol » -> «
 * Paracétamol », « apr?s » -> « après », « faire ? distance » -> « faire à distance »).
 * <ol>
 * <li>mots et racines connus (ô, ê, î, û, ç, œ, è...) : « contr?l » -> « contrôl », « arr?t » -> « arrêt »...</li>
 * <li>sinon, regle generale du francais : « ? » suivi de consonne(s) puis d'un « e » final -> è (« syst?me », « mod?le
 * », « fi?vre »), autrement -> é (« m?dicament », « efficacit? », « ?ventuelle »)</li>
 * <li>« ? » isole entre deux mots en minuscules -> « à »</li>
 * </ol>
 * La casse est respectee (« M?DICAMENT » -> « MÉDICAMENT »). Un « ? » de ponctuation (precede d'une espace, ou en fin
 * de phrase apres une espace) n'est pas touche.
 */
public final class AccentsFrancais {

    /** Racines (en minuscules, « ? » = lettre perdue) ; « ^ » = mot entier (ou son pluriel). */
    private static final Map<String, String> RACINES = new LinkedHashMap<>();

    static {
        String[][] r = {
                /* è dans des mots en -ès */
                { "^apr?s", "après" }, { "^tr?s", "très" }, { "^pr?s", "près" }, { "^acc?s", "accès" },
                { "^exc?s", "excès" }, { "^succ?s", "succès" }, { "^progr?s", "progrès" }, { "^d?s", "dès" },
                { "^abc?s", "abcès" }, { "^proc?s", "procès" }, { "^d?c?s", "décès" }, { "^aupr?s", "auprès" },
                { "^expr?s", "exprès" },
                /* à */
                { "d?j?", "déjà" }, { "^voil?", "voilà" }, { "au-del?", "au-delà" }, { "^o?", "où" },
                /* ô */
                { "contr?l", "contrôl" }, { "^r?le", "rôle" }, { "plut?t", "plutôt" }, { "^t?t", "tôt" },
                { "c?t?", "côté" }, { "h?pita", "hôpita" }, { "dipl?m", "diplôm" }, { "sympt?m", "symptôm" },
                { "c?ne", "cône" }, { "aussit?t", "aussitôt" }, { "bient?t", "bientôt" }, { "r?ti", "rôti" },
                /* ê */
                { "arr?t", "arrêt" }, { "^m?me", "même" }, { "fen?tre", "fenêtre" }, { "^pr?t", "prêt" },
                { "^t?te", "tête" }, { "extr?m", "extrêm" }, { "int?r?t", "intérêt" }, { "enqu?te", "enquête" },
                { "requ?te", "requête" }, { "^r?ve", "rêve" }, { "^f?te", "fête" }, { "^b?te", "bête" },
                { "for?t", "forêt" }, { "?tre", "être" }, { "?tes", "êtes" }, { "m?l", "mêl" },
                /* î, ï */
                { "conna?t", "connaît" }, { "para?t", "paraît" }, { "ma?tr", "maîtr" }, { "cha?n", "chaîn" },
                { "entra?n", "entraîn" }, { "tra?n", "traîn" }, { "pla?t", "plaît" }, { "fra?ch", "fraîch" },
                { "a?eul", "aïeul" }, { "na?f", "naïf" }, { "na?ve", "naïve" }, { "ca?n", "caïn" }, { "^?le", "île" },
                { "go?tre", "goitre" },
                /* û */
                { "^s?r", "sûr" }, { "co?t", "coût" }, { "go?t", "goût" }, { "ao?t", "août" }, { "d?ment", "dûment" },
                { "br?l", "brûl" }, { "^m?r", "mûr" }, { "fl?te", "flûte" },
                /* ç */
                { "fa?on", "façon" }, { "re?u", "reçu" }, { "re?o", "reço" }, { "aper?u", "aperçu" },
                { "d??u", "déçu" }, { "le?on", "leçon" }, { "gar?on", "garçon" }, { "fran?ai", "françai" },
                { "commen?", "commenç" }, { "lan?a", "lança" }, { "pla?a", "plaça" }, { "for?a", "força" },
                { "rempla?", "remplaç" }, { "per?u", "perçu" }, { "con?u", "conçu" }, { "con?oi", "conçoi" },
                { "gla?on", "glaçon" }, { "su?ant", "suçant" }, { "su?er", "sucer" },
                /* œ */
                { "?d?m", "œdèm" }, { "c?ur", "cœur" }, { "s?ur", "sœur" }, { "man?uvr", "manœuvr" }, { "^?uf", "œuf" },
                { "b?uf", "bœuf" }, { "^?il", "œil" }, { "?sophag", "œsophag" }, { "?strog", "œstrog" },
                { "f?tus", "fœtus" }, { "f?tal", "fœtal" }, { "^v?u", "vœu" }, { "?uvre", "œuvre" },
                { "c?liaqu", "cœliaqu" } };
        for (String[] x : r) {
            RACINES.put(x[0], x[1]);
        }
    }

    /** Un mot contenant au moins un « ? » colle a une lettre. */
    private static final Pattern MOT = Pattern
            .compile("[\\p{L}?]*\\p{L}[\\p{L}?]*\\?[\\p{L}?]*|\\?[\\p{L}?]*\\p{L}[\\p{L}?]*");
    /** « ? » isole entre deux mots, le suivant en minuscule : « à ». */
    private static final Pattern A_ISOLE = Pattern.compile("(?<=\\p{L}[,]? )\\?(?= \\p{Ll})");
    /** « jusqu'? », « qu'? » : « à » apres une apostrophe. */
    private static final Pattern A_APOSTROPHE = Pattern.compile("(?<=\\p{L}['’])\\?(?![\\p{L}?])");
    /**
     * Majuscules ecrites sans accent par la source (« A prendre en compte », « Eviter ») : debut de phrase seulement.
     */
    private static final String[][] MAJUSCULES = { { "A prendre", "À prendre" }, { "A éviter", "À éviter" },
            { "A surveiller", "À surveiller" }, { "A noter", "À noter" }, { "A partir", "À partir" },
            { "A forte", "À forte" }, { "A faible", "À faible" }, { "A dose", "À dose" }, { "Eviter", "Éviter" },
            { "Etre", "Être" }, { "Egalement", "Également" }, { "Eventuellement", "Éventuellement" },
            { "Etant", "Étant" }, { "Etat", "État" }, { "Elimination", "Élimination" }, { "Equilibre", "Équilibre" } };
    private static final Pattern GRAVE = Pattern.compile("\\?(?=[bcdfghjklmnpqrstvwxz]{1,2}es?$)");

    private AccentsFrancais() {
    }

    public static String reparer(String s) {
        if (s == null) {
            return null;
        }
        s = majuscules(s);
        if (s.indexOf('?') < 0) {
            return s;
        }
        s = A_APOSTROPHE.matcher(s).replaceAll("à");
        Matcher m = MOT.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            m.appendReplacement(sb, Matcher.quoteReplacement(mot(m.group())));
        }
        m.appendTail(sb);
        return A_ISOLE.matcher(sb.toString()).replaceAll("à");
    }

    static String majuscules(String s) {
        for (String[] m : MAJUSCULES) {
            s = s.replaceAll("(^|[.!:;]\\s+|\\n)" + Pattern.quote(m[0]) + "\\b", "$1" + Matcher.quoteReplacement(m[1]));
        }
        return s;
    }

    static String mot(String brut) {
        String bas = brut.toLowerCase();
        for (Map.Entry<String, String> e : RACINES.entrySet()) {
            /* « ^ » : mot entier seulement (« tr?s » ne doit pas toucher « administr?s ») */
            boolean entier = e.getKey().startsWith("^");
            String cle = entier ? e.getKey().substring(1) : e.getKey();
            if (entier) {
                if (bas.equals(cle) || bas.equals(cle + "s")) {
                    bas = e.getValue() + bas.substring(cle.length());
                }
                continue;
            }
            int i = bas.indexOf(cle);
            while (i >= 0) {
                bas = bas.substring(0, i) + e.getValue() + bas.substring(i + cle.length());
                i = bas.indexOf(cle, i + e.getValue().length());
            }
        }
        StringBuilder r = new StringBuilder(bas);
        for (int i = 0; i < r.length(); i++) {
            if (r.charAt(i) == '?') {
                r.setCharAt(i, GRAVE.matcher(r.substring(i)).lookingAt() ? 'è' : 'é');
            }
        }
        return casse(brut, r.toString());
    }

    /** Reporte la casse du mot d'origine (les lettres retablies prennent la casse de leur voisine). */
    private static String casse(String brut, String bas) {
        if (brut.length() != bas.length()) {
            /* œ -> une lettre de plus ou de moins n'arrive pas : meme longueur garantie ; prudence quand meme */
            return Character.isUpperCase(firstLetter(brut)) ? Character.toUpperCase(bas.charAt(0)) + bas.substring(1)
                    : bas;
        }
        boolean toutMaj = brut.chars().filter(Character::isLetter).allMatch(Character::isUpperCase)
                && brut.chars().filter(Character::isLetter).count() > 1;
        StringBuilder r = new StringBuilder();
        for (int i = 0; i < bas.length(); i++) {
            char b = brut.charAt(i), c = bas.charAt(i);
            boolean maj = b == '?' ? toutMaj : Character.isUpperCase(b);
            r.append(maj ? Character.toUpperCase(c) : c);
        }
        return r.toString();
    }

    private static char firstLetter(String s) {
        for (char c : s.toCharArray()) {
            if (Character.isLetter(c)) {
                return c;
            }
        }
        return 'a';
    }
}
