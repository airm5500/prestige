package rest.service.impl.reserve;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Import de codes dans l'onglet « Liste réserve » (16/11) : un fichier Excel ou CSV ne contenant que des CIP ou des
 * EAN13 ; chaque code qui correspond a un produit le fait cocher.
 * <p>
 * Regles (calcul pur, sans base) :
 * <ul>
 * <li>un code est une cellule de chiffres (espaces, apostrophe d'Excel et guillemets retires) ; l'en-tete et le texte
 * sont ignores ;</li>
 * <li>les zeros de tete sont retires des deux cotes : un classeur numerique perd ceux du fichier, alors que la base les
 * garde (218 CIP et 196 EAN de la copie de travail commencent par 0) ;</li>
 * <li>moins de {@link #CHIFFRES_MIN} chiffres apres retrait : pas un code (quantite, numero de ligne) ;</li>
 * <li>un code qui correspond au CIP d'un produit l'emporte sur un code qui correspond a l'EAN13 d'un autre ;</li>
 * <li>plusieurs produits pour un meme code : « ambigu », rien n'est coche ;</li>
 * <li>un code deja lu : « doublon » ; un produit deja reconnu par un autre code : compte une seule fois.</li>
 * </ul>
 * Partition : chaque code distinct du fichier est dans exactement une des listes reconnus, memeProduit, inconnus,
 * ambigus.
 */
public final class ImportCodesReserve {

    public static final int CHIFFRES_MIN = 4;
    public static final int CHIFFRES_MAX = 14;

    private ImportCodesReserve() {
    }

    /** Code ramene a ses chiffres sans zeros de tete ; null si la cellule n'est pas un code. */
    public static String normaliser(String cellule) {
        if (cellule == null) {
            return null;
        }
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < cellule.length(); i++) {
            char c = cellule.charAt(i);
            if (c >= '0' && c <= '9') {
                b.append(c);
            } else if (Character.isWhitespace(c) || Character.isSpaceChar(c) || c == '\'' || c == '"') {
                continue;
            } else {
                return null;
            }
        }
        int z = 0;
        while (z < b.length() && b.charAt(z) == '0') {
            z++;
        }
        String s = b.substring(z);
        return s.length() < CHIFFRES_MIN || s.length() > CHIFFRES_MAX ? null : s;
    }

    /** Codes lus, dans l'ordre du fichier (doublons compris), et nombre de cellules non vides ignorees. */
    public static final class Lecture {
        public final List<String> codes = new ArrayList<>();
        public int ignorees;
    }

    public static Lecture lire(List<List<String>> lignes) {
        Lecture l = new Lecture();
        if (lignes == null) {
            return l;
        }
        for (List<String> ligne : lignes) {
            if (ligne == null) {
                continue;
            }
            for (String c : ligne) {
                if (c == null || c.trim().isEmpty()) {
                    continue;
                }
                String n = normaliser(c);
                if (n == null) {
                    l.ignorees++;
                } else {
                    l.codes.add(n);
                }
            }
        }
        return l;
    }

    /** Produit candidat : identifiant, CIP et EAN13 deja normalises (null si absents). */
    public static final class Produit {
        public final String id;
        public final String cip;
        public final String ean;

        public Produit(String id, String cip, String ean) {
            this.id = id;
            this.cip = cip;
            this.ean = ean;
        }
    }

    public static final class Reconnu {
        public final String code;
        public final String id;
        /** « CIP » ou « EAN13 ». */
        public final String par;

        Reconnu(String code, String id, String par) {
            this.code = code;
            this.id = id;
            this.par = par;
        }
    }

    public static final class Resultat {
        public final List<Reconnu> reconnus = new ArrayList<>();
        /** Codes qui designent un produit deja reconnu par un code precedent. */
        public final List<Reconnu> memeProduit = new ArrayList<>();
        public final List<String> inconnus = new ArrayList<>();
        /** Code -&gt; identifiants des produits qui le portent (au moins deux). */
        public final Map<String, List<String>> ambigus = new LinkedHashMap<>();
        /** Code -&gt; nombre de lectures en trop. */
        public final Map<String, Integer> doublons = new LinkedHashMap<>();
    }

    public static Resultat rapprocher(List<String> codes, List<Produit> produits) {
        Map<String, Set<String>> parCip = new LinkedHashMap<>();
        Map<String, Set<String>> parEan = new LinkedHashMap<>();
        if (produits != null) {
            for (Produit p : produits) {
                if (p.cip != null) {
                    parCip.computeIfAbsent(p.cip, k -> new LinkedHashSet<>()).add(p.id);
                }
                if (p.ean != null) {
                    parEan.computeIfAbsent(p.ean, k -> new LinkedHashSet<>()).add(p.id);
                }
            }
        }
        Resultat r = new Resultat();
        Set<String> vus = new LinkedHashSet<>();
        Set<String> ids = new LinkedHashSet<>();
        for (String code : codes == null ? new ArrayList<String>() : codes) {
            if (!vus.add(code)) {
                r.doublons.merge(code, 1, Integer::sum);
                continue;
            }
            Set<String> c = parCip.get(code);
            String par = "CIP";
            if (c == null || c.isEmpty()) {
                c = parEan.get(code);
                par = "EAN13";
            }
            if (c == null || c.isEmpty()) {
                r.inconnus.add(code);
            } else if (c.size() > 1) {
                r.ambigus.put(code, new ArrayList<>(c));
            } else {
                String id = c.iterator().next();
                Reconnu x = new Reconnu(code, id, par);
                if (ids.add(id)) {
                    r.reconnus.add(x);
                } else {
                    r.memeProduit.add(x);
                }
            }
        }
        return r;
    }

    /**
     * Plan du 19/11, point 9 : un code « en double » du fichier, montre au pharmacien. {@code fois} : lectures du code
     * dans le fichier ; {@code premierCode} : code qui avait deja fait reconnaitre le meme produit (sinon null) ;
     * {@code id} : produit designe (null pour un code inconnu ou ambigu).
     */
    public static final class EnDouble {
        public final String code;
        public final String id;
        public final int fois;
        public final String premierCode;

        EnDouble(String code, String id, int fois, String premierCode) {
            this.code = code;
            this.id = id;
            this.fois = fois;
            this.premierCode = premierCode;
        }
    }

    /**
     * Plan du 19/11, point 9 : liste des codes en double, dans l'ordre du fichier, un code une seule fois : code lu
     * plusieurs fois, ou code d'un produit deja reconnu par un code precedent (les deux a la fois possibles). Le compte
     * affiche a l'ecran (doublons + meme produit) se retrouve : somme des (fois - 1) + nombre de « meme produit ».
     */
    public static List<EnDouble> enDouble(List<String> codes, Resultat r) {
        Map<String, Integer> fois = new LinkedHashMap<>();
        for (String c : codes == null ? new ArrayList<String>() : codes) {
            fois.merge(c, 1, Integer::sum);
        }
        Map<String, String> idParCode = new LinkedHashMap<>();
        Map<String, String> premierParId = new LinkedHashMap<>();
        for (Reconnu x : r.reconnus) {
            idParCode.put(x.code, x.id);
            premierParId.put(x.id, x.code);
        }
        Map<String, String> meme = new LinkedHashMap<>();
        for (Reconnu x : r.memeProduit) {
            idParCode.put(x.code, x.id);
            meme.put(x.code, premierParId.get(x.id));
        }
        List<EnDouble> l = new ArrayList<>();
        for (Map.Entry<String, Integer> e : fois.entrySet()) {
            if (e.getValue() > 1 || meme.containsKey(e.getKey())) {
                l.add(new EnDouble(e.getKey(), idParCode.get(e.getKey()), e.getValue(), meme.get(e.getKey())));
            }
        }
        return l;
    }
}
