package rest.service.correspondance;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;
import rest.service.correspondance.CorrespondanceRegles.Decision;
import rest.service.correspondance.CorrespondanceRegles.Etat;
import rest.service.correspondance.CorrespondanceRegles.Motif;
import rest.service.correspondance.CorrespondanceRegles.Source;

/**
 * Correspondance produits grossistes / Prestige, lot 3 : rapprochement APPROCHE par la designation, logique PURE
 * (aucun acces a la base). Reprend l'essai mesure dans l'etude du 08/11 (precision 98,4 % au seuil 0,7) :
 * <ul>
 * <li>designation normalisee : majuscules, accents retires, abreviations unifiees (CPR, GEL, SP, SUSP, FL, B...),
 * nombres separes de leur unite ;</li>
 * <li>dosages et quantites extraits (« 500 MG », « 200 ML », « 30 ») ;</li>
 * <li>similarite des mots ponderee par leur rarete parmi les fiches actives ;</li>
 * <li>dosage ou quantite differents : score x 0,6 ; marque (premier mot) differente : score x 0,5. Un produit d'une
 * autre marque ou d'un autre dosage n'atteint donc jamais le seuil fort (0,7).</li>
 * </ul>
 * Le resultat est TOUJOURS une proposition a valider (au plus 3 candidats) : rien n'est applique d'office.
 */
public final class CorrespondanceApprochee {

    /** Seuil d'une proposition « forte » (mesure de l'etude : 98,4 % de justes). */
    public static final double SEUIL_FORT = 0.7;
    /** Nombre de candidats gardes pour la file de validation. */
    public static final int NB_CANDIDATS = 3;
    static final double PENALITE_DOSAGE = 0.6;
    static final double PENALITE_MARQUE = 0.5;
    static final double IDF_INCONNU = 8.0;
    /** Mots trop frequents (plus de fiches que cela) : ne servent pas a trouver les candidats, seulement a les noter. */
    static final int FREQUENCE_MAX_INDEX = 400;
    static final int POOL = 60;

    static final Map<String, String> SYNONYMES = new HashMap<>();
    static final Set<String> UNITES = new HashSet<>(
            Arrays.asList("MG", "G", "ML", "L", "MCG", "UG", "UI", "KG", "CL", "%", "M"));
    static final Set<String> VIDES = new HashSet<>(
            Arrays.asList("DE", "DU", "LA", "LE", "LES", "ET", "A", "AU", "AUX", "EN", "POUR", "X"));

    static {
        String[][] s = { { "COMP", "CPR" }, { "COMPRIME", "CPR" }, { "COMPRIMES", "CPR" }, { "CP", "CPR" },
                { "CPRS", "CPR" }, { "GELULE", "GEL" }, { "GELULES", "GEL" }, { "GLE", "GEL" }, { "GLES", "GEL" },
                { "GELU", "GEL" }, { "BTE", "B" }, { "BT", "B" }, { "BOITE", "B" }, { "FLACON", "FL" }, { "FLC", "FL" },
                { "SIROP", "SP" }, { "SIR", "SP" }, { "SPR", "SPRAY" }, { "AMPOULE", "AMP" }, { "AMPOULES", "AMP" },
                { "SACHET", "SACH" }, { "SACHETS", "SACH" }, { "SCH", "SACH" }, { "SUSPENSION", "SUSP" },
                { "SUS", "SUSP" }, { "SOLUTION", "SOL" }, { "INJECTABLE", "INJ" }, { "CREME", "CR" },
                { "POMMADE", "POM" }, { "PDE", "POM" }, { "TUBE", "T" }, { "TB", "T" }, { "PELLICULE", "PELL" },
                { "PEL", "PELL" }, { "EFFERVESCENT", "EFF" }, { "EFFERV", "EFF" }, { "BUVABLE", "BUV" },
                { "MILLIGRAMMES", "MG" }, { "GR", "G" }, { "GRS", "G" }, { "MLS", "ML" }, { "ENFANT", "ENF" },
                { "ENFANTS", "ENF" }, { "ADULTE", "ADU" }, { "ADULTES", "ADU" }, { "ADT", "ADU" }, { "NOUR", "NRS" },
                { "NOURRISSON", "NRS" } };
        for (String[] x : s) {
            SYNONYMES.put(x[0], x[1]);
        }
    }

    private static final Set<String> FORMES = new HashSet<>(SYNONYMES.values());
    private static final Pattern NOMBRE = Pattern.compile("\\d+(\\.\\d+)?");
    private static final Pattern MOT_MARQUE = Pattern.compile("[A-Z][A-Z0-9+\\-]*");

    /** Mots normalises d'une designation. */
    public static List<String> normaliser(String designation) {
        List<String> res = new ArrayList<>();
        if (designation == null) {
            return res;
        }
        String s = Normalizer.normalize(designation.toUpperCase(java.util.Locale.ROOT), Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "");
        s = s.replaceAll("(\\d),(\\d)", "$1.$2").replaceAll("(\\d)([A-Z%])", "$1 $2")
                .replaceAll("([A-Z])(\\d)", "$1 $2").replaceAll("[^A-Z0-9.% ]", " ");
        for (String t : s.trim().split(" +")) {
            if (t.isEmpty() || ".".equals(t)) {
                continue;
            }
            String u = SYNONYMES.getOrDefault(t, t);
            if (!VIDES.contains(u)) {
                res.add(u);
            }
        }
        return res;
    }

    /** Dosages et quantites (avec leur unite, multi-ensemble) et mots (ensemble) d'une designation normalisee. */
    static final class Signature {
        final Map<String, Integer> nombres = new TreeMap<>();
        final Set<String> mots = new HashSet<>();

        int totalNombres() {
            int n = 0;
            for (int v : nombres.values()) {
                n += v;
            }
            return n;
        }

        int nombresCommuns(Signature o) {
            int n = 0;
            for (Map.Entry<String, Integer> e : nombres.entrySet()) {
                n += Math.min(e.getValue(), o.nombres.getOrDefault(e.getKey(), 0));
            }
            return n;
        }
    }

    static Signature signature(List<String> mots) {
        Signature sg = new Signature();
        for (int i = 0; i < mots.size(); i++) {
            String t = mots.get(i);
            if (NOMBRE.matcher(t).matches()) {
                String u = i + 1 < mots.size() && UNITES.contains(mots.get(i + 1)) ? mots.get(i + 1) : "";
                String v = t;
                if (v.contains(".")) {
                    v = v.replaceAll("0+$", "").replaceAll("\\.$", "");
                }
                sg.nombres.merge(v + u, 1, Integer::sum);
            } else if (!UNITES.contains(t)) {
                sg.mots.add(t);
            }
        }
        return sg;
    }

    /** Marque : premier mot qui n'est ni un nombre ni une forme ou une unite abregee. */
    static String marque(String designation) {
        for (String t : normaliser(designation)) {
            if (MOT_MARQUE.matcher(t).matches() && !FORMES.contains(t)) {
                return t;
            }
        }
        return null;
    }

    /** Deux marques proches : egales a une faute de frappe pres (distance d'edition au plus 1). */
    static boolean proches(String a, String b) {
        if (a.equals(b)) {
            return true;
        }
        if (Math.abs(a.length() - b.length()) > 1) {
            return false;
        }
        if (a.length() == b.length()) {
            int d = 0;
            for (int i = 0; i < a.length(); i++) {
                d += a.charAt(i) != b.charAt(i) ? 1 : 0;
            }
            return d <= 1;
        }
        String court = a.length() < b.length() ? a : b, longue = a.length() < b.length() ? b : a;
        for (int i = 0; i < longue.length(); i++) {
            if ((longue.substring(0, i) + longue.substring(i + 1)).equals(court)) {
                return true;
            }
        }
        return false;
    }

    public static final class Candidat {
        public final String familleId;
        public final double score;

        Candidat(String familleId, double score) {
            this.familleId = familleId;
            this.score = score;
        }

        @Override
        public String toString() {
            return familleId + ":" + score;
        }
    }

    private final Map<String, String> designations;
    private final Map<String, Signature> signatures = new HashMap<>();
    private final Map<String, String> marques = new HashMap<>();
    private final Map<String, Double> idf = new HashMap<>();
    private final Map<String, List<String>> index = new HashMap<>();

    /** @param fiches fiches actives : identifiant -> designation (ordre indifferent) */
    public CorrespondanceApprochee(Map<String, String> fiches) {
        this.designations = new LinkedHashMap<>(fiches);
        Map<String, Integer> df = new HashMap<>();
        for (Map.Entry<String, String> f : designations.entrySet()) {
            Signature sg = signature(normaliser(f.getValue()));
            signatures.put(f.getKey(), sg);
            marques.put(f.getKey(), marque(f.getValue()));
            for (String t : sg.mots) {
                df.merge(t, 1, Integer::sum);
            }
        }
        int n = designations.size();
        for (Map.Entry<String, Integer> e : df.entrySet()) {
            idf.put(e.getKey(), Math.log((double) n / (1 + e.getValue())));
        }
        List<String> ids = new ArrayList<>(designations.keySet());
        Collections.sort(ids);
        for (String f : ids) {
            for (String t : signatures.get(f).mots) {
                if (df.get(t) < FREQUENCE_MAX_INDEX) {
                    index.computeIfAbsent(t, k -> new ArrayList<>()).add(f);
                }
            }
        }
    }

    private double poids(String mot) {
        return idf.getOrDefault(mot, IDF_INCONNU);
    }

    /** Score (0 a 1) de la fiche pour la designation lue chez le grossiste. */
    public double score(String designation, String familleId) {
        Signature lu = signature(normaliser(designation));
        return score(lu, marque(designation), familleId);
    }

    private double score(Signature lu, String marqueLue, String familleId) {
        Signature fi = signatures.get(familleId);
        if (fi == null) {
            return 0;
        }
        double inter = 0, union = 0;
        Set<String> tous = new HashSet<>(lu.mots);
        tous.addAll(fi.mots);
        for (String t : tous) {
            double p = poids(t);
            union += p;
            if (lu.mots.contains(t) && fi.mots.contains(t)) {
                inter += p;
            }
        }
        double s = inter / (union == 0 ? 1 : union);
        int nl = lu.totalNombres(), nf = fi.totalNombres();
        if (nl > 0 || nf > 0) {
            int communs = lu.nombresCommuns(fi);
            int tot = Math.max(nl, nf);
            s = 0.6 * s + 0.4 * (tot == 0 ? 0 : (double) communs / tot);
            if (nl > 0 && nf > 0 && communs < Math.min(nl, nf)) {
                s *= PENALITE_DOSAGE;
            }
        }
        String mf = marques.get(familleId);
        if (marqueLue != null && mf != null && !proches(marqueLue, mf)) {
            s *= PENALITE_MARQUE;
        }
        return s;
    }

    /** Au plus {@code n} candidats, du meilleur au moins bon (a score egal, identifiant croissant). */
    public List<Candidat> candidats(String designation, int n) {
        Signature lu = signature(normaliser(designation));
        String marqueLue = marque(designation);
        Map<String, Double> pool = new HashMap<>();
        for (String t : lu.mots) {
            for (String f : index.getOrDefault(t, Collections.emptyList())) {
                pool.merge(f, poids(t), Double::sum);
            }
        }
        List<Map.Entry<String, Double>> tri = new ArrayList<>(pool.entrySet());
        tri.sort((a, b) -> {
            int c = Double.compare(b.getValue(), a.getValue());
            return c != 0 ? c : a.getKey().compareTo(b.getKey());
        });
        List<Candidat> res = new ArrayList<>();
        for (Map.Entry<String, Double> e : tri.subList(0, Math.min(POOL, tri.size()))) {
            res.add(new Candidat(e.getKey(), score(lu, marqueLue, e.getKey())));
        }
        res.sort((a, b) -> {
            int c = Double.compare(b.score, a.score);
            return c != 0 ? c : a.familleId.compareTo(b.familleId);
        });
        return new ArrayList<>(res.subList(0, Math.min(n, res.size())));
    }

    public static BigDecimal arrondi(double score) {
        return BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP);
    }

    /**
     * Decision pour un code lu chez un grossiste, non reconnu a l'import, avec sa designation :
     * <ul>
     * <li>correspondance deja enregistree, autre qu'une proposition par designation : conservee ;</li>
     * <li>sinon a valider (PROPOSEE, source APPROCHE), score du meilleur candidat, au plus 3 candidats ; sans aucun
     * candidat : a valider aussi (motif INTROUVABLE), pour qu'on choisisse le produit a la main ou qu'on rejette.</li>
     * </ul>
     * Jamais AUTO_EXACTE : une designation ne suffit pas a appliquer un rapprochement.
     */
    public static Decision proposer(Etat etatExistant, Source sourceExistante, List<Candidat> candidats) {
        if (etatExistant != null && !(etatExistant == Etat.PROPOSEE && sourceExistante == Source.APPROCHE)) {
            return new Decision(null, null, null, Motif.CONSERVEE, null, Collections.emptyList());
        }
        List<String> ids = new ArrayList<>();
        for (Candidat c : candidats) {
            ids.add(c.familleId);
        }
        if (ids.isEmpty()) {
            return new Decision(Etat.PROPOSEE, null, Source.APPROCHE, Motif.INTROUVABLE, arrondi(0), ids);
        }
        return new Decision(Etat.PROPOSEE, null, Source.APPROCHE, Motif.DESIGNATION, arrondi(candidats.get(0).score),
                ids);
    }
}
