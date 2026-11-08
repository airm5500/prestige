package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Rapprochement d'un produit Ubipharm avec les articles de Prestige (analyse du 07/11, §4.1). LECTURE SEULE : aucun
 * article n'est cree ni modifie ; le resultat est une proposition a valider.
 * <ol>
 * <li>{@link Statut#PSCODE} : un article dont la reference Ubipharm de la fiche ({@code t_famille.str_PSCODE}) = pscode
 * (prioritaire). Reponse de l'utilisateur du 07/11 : le PSCODE est range sur la fiche article, comme le code EAN 13, et
 * pas dans {@code t_famille_grossiste} ;</li>
 * <li>{@link Statut#CIP} : un seul article dont int_CIP, int_CIP2 a int_CIP4 ou int_EAN13 = un des codes Ubipharm
 * ;</li>
 * <li>{@link Statut#PLUSIEURS} : plusieurs candidats a la meme etape, tous listes ;</li>
 * <li>{@link Statut#INTROUVABLE}.</li>
 * </ol>
 * Comparaison de chaines exacte apres suppression des blancs (« 0123 » et « 123 » different) ; un code vide ne
 * rapproche jamais. Les articles supprimes (str_STATUT = 'delete', convention de {@code util.Constant.STATUT_DELETE})
 * sont exclus ; les articles desactives ('disable') restent candidats, avec leur statut, pour que l'utilisateur
 * tranche.
 * <p>
 * La decision ({@link #decider}) est une fonction pure, testee sans base ; les requetes ne font qu'un pre-filtre.
 */
public final class RapprochementProduits {

    public enum Statut {
        PSCODE, CIP, PLUSIEURS, INTROUVABLE
    }

    /** Statut d'un article supprime dans t_famille / t_famille_grossiste. */
    public static final String SUPPRIME = "delete";

    /** Article de Prestige candidat, tel que lu en base. */
    public static final class Article {
        final String familleId;
        final String nom;
        final String statutArticle;
        final String referenceUbipharm;
        final List<String> codes;

        /**
         * @param referenceUbipharm
         *            t_famille.str_PSCODE (PSCODE de la fiche), ou null
         * @param codes
         *            int_CIP, int_CIP2, int_CIP3, int_CIP4, int_EAN13 (null permis)
         */
        public Article(String familleId, String nom, String statutArticle, String referenceUbipharm,
                List<String> codes) {
            this.familleId = familleId;
            this.nom = nom;
            this.statutArticle = statutArticle;
            this.referenceUbipharm = referenceUbipharm;
            this.codes = codes == null ? Collections.emptyList() : Collections.unmodifiableList(new ArrayList<>(codes));
        }

        public String familleId() {
            return familleId;
        }

        public String nom() {
            return nom;
        }

        public String statutArticle() {
            return statutArticle;
        }

        public String referenceUbipharm() {
            return referenceUbipharm;
        }

        public List<String> codes() {
            return codes;
        }

        JSONObject toJson() {
            return new JSONObject().put("familleId", familleId).put("nom", nul(nom))
                    .put("statutArticle", nul(statutArticle)).put("referenceUbipharm", nul(referenceUbipharm))
                    .put("codes", new JSONArray(codes.stream().map(RapprochementProduits::nul).toArray()));
        }
    }

    /** Resultat du rapprochement d'un produit. */
    public static final class Resultat {
        final String pscode;
        final Statut statut;
        final List<Article> candidats;
        final String critere;

        Resultat(String pscode, Statut statut, List<Article> candidats, String critere) {
            this.pscode = pscode;
            this.statut = statut;
            this.candidats = Collections.unmodifiableList(candidats);
            this.critere = critere;
        }

        public String pscode() {
            return pscode;
        }

        public Statut statut() {
            return statut;
        }

        /** Un candidat pour PSCODE et CIP, tous pour PLUSIEURS, aucun pour INTROUVABLE. */
        public List<Article> candidats() {
            return candidats;
        }

        /** Etape qui a trouve : PSCODE ou CIP ; null si introuvable. */
        public String critere() {
            return critere;
        }

        public JSONObject toJson() {
            JSONArray c = new JSONArray();
            candidats.forEach(a -> c.put(a.toJson()));
            return new JSONObject().put("pscode", nul(pscode)).put("statut", statut.name()).put("critere", nul(critere))
                    .put("candidats", c);
        }
    }

    /** Produit Ubipharm a rapprocher. */
    public static final class Demande {
        final String pscode;
        final List<String> codes;

        public Demande(String pscode, Collection<String> codes) {
            this.pscode = pscode;
            this.codes = codes == null ? Collections.emptyList() : new ArrayList<>(codes);
        }
    }

    /* ------------------------------------------------------- logique pure */

    /** Blancs supprimes ; null si absent ou vide (un code vide ne rapproche jamais). */
    static String code(String s) {
        if (s == null) {
            return null;
        }
        String t = s.replaceAll("[\\s\\u00A0\\u202F]+", "");
        return t.isEmpty() ? null : t;
    }

    /**
     * Decision a partir des candidats lus (pre-filtres ou non : la comparaison exacte est refaite ici).
     *
     * @param parReference
     *            articles avec leur reference Ubipharm (t_famille.str_PSCODE)
     * @param parCodes
     *            articles avec leurs CIP / EAN13
     */
    public static Resultat decider(String pscode, Collection<String> codes, List<Article> parReference,
            List<Article> parCodes) {
        String p = code(pscode);
        if (p != null && parReference != null) {
            List<Article> l = distincts(parReference,
                    a -> p.equalsIgnoreCase(String.valueOf(code(a.referenceUbipharm))));
            if (!l.isEmpty()) {
                return new Resultat(pscode, l.size() == 1 ? Statut.PSCODE : Statut.PLUSIEURS, l, Statut.PSCODE.name());
            }
        }
        Set<String> cherches = new LinkedHashSet<>();
        if (codes != null) {
            codes.forEach(c -> {
                String x = code(c);
                if (x != null) {
                    cherches.add(x);
                }
            });
        }
        if (!cherches.isEmpty() && parCodes != null) {
            List<Article> l = distincts(parCodes, a -> a.codes.stream().map(RapprochementProduits::code)
                    .anyMatch(x -> x != null && cherches.contains(x)));
            if (!l.isEmpty()) {
                return new Resultat(pscode, l.size() == 1 ? Statut.CIP : Statut.PLUSIEURS, l, Statut.CIP.name());
            }
        }
        return new Resultat(pscode, Statut.INTROUVABLE, Collections.emptyList(), null);
    }

    private static List<Article> distincts(List<Article> l, java.util.function.Predicate<Article> garde) {
        Map<String, Article> m = new LinkedHashMap<>();
        for (Article a : l) {
            if (a == null || a.familleId == null || SUPPRIME.equalsIgnoreCase(trim(a.statutArticle))) {
                continue;
            }
            if (garde.test(a)) {
                m.putIfAbsent(a.familleId, a);
            }
        }
        return new ArrayList<>(m.values());
    }

    /* ----------------------------------------------------------- requetes */

    /*
     * str_PSCODE (V7.2.39) : saisi en majuscules sur la fiche ; comparaison par l'index, sans tenir compte de la casse
     */
    static final String PAR_REFERENCE = "SELECT f.lg_FAMILLE_ID, f.str_NAME, f.str_STATUT, f.str_PSCODE"
            + " FROM t_famille f WHERE f.str_PSCODE IN (:p) AND COALESCE(f.str_STATUT, '') <> 'delete'"
            + " ORDER BY f.str_NAME, f.lg_FAMILLE_ID";
    static final String PAR_CODES = "SELECT f.lg_FAMILLE_ID, f.str_NAME, f.str_STATUT, f.int_CIP, f.int_CIP2,"
            + " f.int_CIP3, f.int_CIP4, f.int_EAN13 FROM t_famille f WHERE COALESCE(f.str_STATUT, '') <> 'delete' AND ("
            + " REPLACE(f.int_CIP, ' ', '') IN (:c) OR REPLACE(f.int_CIP2, ' ', '') IN (:c)"
            + " OR REPLACE(f.int_CIP3, ' ', '') IN (:c) OR REPLACE(f.int_CIP4, ' ', '') IN (:c)"
            + " OR REPLACE(f.int_EAN13, ' ', '') IN (:c)) ORDER BY f.str_NAME, f.lg_FAMILLE_ID";

    private final EntityManager em;

    public RapprochementProduits(EntityManager em) {
        this.em = em;
    }

    /** Rapproche un produit. */
    public Resultat rapprocher(String pscode, Collection<String> codes) {
        return rapprocher(Collections.singletonList(new Demande(pscode, codes))).get(0);
    }

    /** Rapproche une liste de produits avec deux requetes en tout ; resultats dans l'ordre des demandes. */
    @SuppressWarnings("unchecked")
    public List<Resultat> rapprocher(List<Demande> demandes) {
        Set<String> pscodes = new LinkedHashSet<>(), codes = new LinkedHashSet<>();
        for (Demande d : demandes) {
            String p = code(d.pscode);
            if (p != null) {
                pscodes.add(p);
            }
            d.codes.forEach(c -> {
                String x = code(c);
                if (x != null) {
                    codes.add(x);
                }
            });
        }
        List<Article> parReference = new ArrayList<>(), parCodes = new ArrayList<>();
        if (!pscodes.isEmpty()) {
            for (Object[] o : (List<Object[]>) em.createNativeQuery(PAR_REFERENCE)
                    .setParameter("p", new ArrayList<>(pscodes)).getResultList()) {
                parReference.add(new Article((String) o[0], (String) o[1], (String) o[2], (String) o[3], null));
            }
        }
        if (!codes.isEmpty()) {
            for (Object[] o : (List<Object[]>) em.createNativeQuery(PAR_CODES).setParameter("c", new ArrayList<>(codes))
                    .getResultList()) {
                parCodes.add(new Article((String) o[0], (String) o[1], (String) o[2], null,
                        Arrays.asList((String) o[3], (String) o[4], (String) o[5], (String) o[6], (String) o[7])));
            }
        }
        List<Resultat> r = new ArrayList<>();
        for (Demande d : demandes) {
            r.add(decider(d.pscode, d.codes, parReference, parCodes));
        }
        return r;
    }

    /** Rapprochement des lignes d'une page « Nouveaux produits » (code = CIP lu). */
    public List<Resultat> rapprocherLignes(List<NouveauProduitUbipharm> lignes) {
        List<Demande> d = new ArrayList<>();
        for (NouveauProduitUbipharm p : lignes) {
            d.add(new Demande(p.pscode(),
                    p.cip() == null ? Collections.emptyList() : Collections.singletonList(p.cip())));
        }
        return rapprocher(d);
    }

    private static String trim(String s) {
        return s == null ? null : s.trim();
    }

    static Object nul(Object o) {
        return o == null ? JSONObject.NULL : o;
    }
}
