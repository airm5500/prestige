package rest.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Substituts d'un article (retour du 23/09) : les produits du catalogue qui ont EXACTEMENT les memes DCI, classes par
 * {@link SubstitutionArticle} en « equivalent direct » ou « a adapter », avec leur stock et leur prix.
 *
 * <p>
 * Lecture seule : rien n'est ecrit, aucune vente n'est touchee. Le logiciel propose, le pharmacien decide.
 */
@Stateless
public class SubstitutionService {

    private static final Logger LOG = Logger.getLogger(SubstitutionService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Un lien produit-DCI actif : le statut est parfois vide sur les liens anciens. */
    private static final String LIEN_ACTIF = " (fd.str_STATUT IS NULL OR fd.str_STATUT = '' OR fd.str_STATUT = 'enable') ";

    /**
     * Les candidats : memes DCI, pas une de plus ni une de moins. La cle est la liste triee des identifiants de DCI ;
     * on ne calcule la cle que des produits qui partagent au moins une DCI avec l'origine.
     */
    static String requeteCandidats(boolean avecEmplacement) {
        return "SELECT f.lg_FAMILLE_ID AS id, f.str_NAME AS nom, f.int_CIP AS cip, f.int_PRICE AS prix,"
                + " COALESCE(f.bool_DECONDITIONNE, 0) AS detail,"
                + " (SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) FROM t_famille_stock s"
                + "   WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                + (avecEmplacement ? " AND s.lg_EMPLACEMENT_ID = :emplacement" : "") + ") AS stock"
                + " FROM t_famille f JOIN (SELECT fd.lg_FAMILLE_ID AS famille,"
                + "   GROUP_CONCAT(DISTINCT fd.lg_DCI_ID ORDER BY fd.lg_DCI_ID SEPARATOR ',') AS cle"
                + "   FROM t_famille_dci fd WHERE" + LIEN_ACTIF + " AND fd.lg_FAMILLE_ID IN"
                + "     (SELECT x.lg_FAMILLE_ID FROM t_famille_dci x WHERE x.lg_DCI_ID IN :dcis)"
                + "   GROUP BY fd.lg_FAMILLE_ID) k ON k.famille = f.lg_FAMILLE_ID"
                + " WHERE k.cle = :cle AND f.str_STATUT = 'enable' AND f.lg_FAMILLE_ID <> :origine";
    }

    @SuppressWarnings("unchecked")
    public JSONObject substituts(String familleId, String emplacementId) {
        JSONObject sortie = new JSONObject().put("success", true).put("data", new JSONArray());
        if (StringUtils.isBlank(familleId)) {
            return sortie.put("success", false).put("message", "Produit inconnu.");
        }
        try {
            List<Tuple> origine = em.createNativeQuery(
                    "SELECT f.str_NAME AS nom, f.int_CIP AS cip FROM t_famille f WHERE f.lg_FAMILLE_ID = :id",
                    Tuple.class).setParameter("id", familleId).getResultList();
            if (origine.isEmpty()) {
                return sortie.put("success", false).put("message", "Produit inconnu.");
            }
            String nomOrigine = StringUtils.trimToEmpty(origine.get(0).get("nom", String.class));
            List<Tuple> dcis = em
                    .createNativeQuery("SELECT d.lg_DCI_ID AS id, d.str_NAME AS nom FROM t_famille_dci fd"
                            + " JOIN t_dci d ON d.lg_DCI_ID = fd.lg_DCI_ID WHERE fd.lg_FAMILLE_ID = :id AND"
                            + LIEN_ACTIF + " ORDER BY d.lg_DCI_ID", Tuple.class)
                    .setParameter("id", familleId).getResultList();
            List<String> ids = new ArrayList<>();
            List<String> noms = new ArrayList<>();
            for (Tuple t : dcis) {
                if (!ids.contains(t.get("id", String.class))) {
                    ids.add(t.get("id", String.class));
                    noms.add(StringUtils.trimToEmpty(t.get("nom", String.class)));
                }
            }
            sortie.put("source",
                    new JSONObject().put("id", familleId).put("nom", nomOrigine).put("dci", new JSONArray(noms))
                            .put("dosage", String.join(" + ", SubstitutionArticle.dosage(nomOrigine)))
                            .put("forme", SubstitutionArticle.libelleForme(SubstitutionArticle.forme(nomOrigine))));
            if (ids.isEmpty()) {
                /* Sans DCI, on ne devine pas : dire pourquoi rien n'est propose. */
                return sortie.put("sansDci", true).put("message", "Aucune DCI n'est renseignée sur la fiche de « "
                        + nomOrigine + " » : renseignez-la pour obtenir ses équivalents.");
            }
            sortie.put("avertissement", SubstitutionArticle.avertissement(noms));
            java.util.Collections.sort(ids);
            boolean avecEmplacement = StringUtils.isNotBlank(emplacementId);
            Query q = em.createNativeQuery(requeteCandidats(avecEmplacement), Tuple.class).setParameter("dcis", ids)
                    .setParameter("cle", String.join(",", ids)).setParameter("origine", familleId);
            if (avecEmplacement) {
                q.setParameter("emplacement", emplacementId);
            }
            List<JSONObject> lignes = new ArrayList<>();
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                String nom = StringUtils.trimToEmpty(t.get("nom", String.class));
                SubstitutionArticle.Verdict v = SubstitutionArticle.comparer(nomOrigine, nom);
                if (v == null) {
                    continue;
                }
                lignes.add(new JSONObject().put("id", t.get("id", String.class)).put("nom", nom)
                        .put("cip", t.get("cip") == null ? "" : String.valueOf(t.get("cip")))
                        .put("prix", entier(t.get("prix"))).put("stock", entier(t.get("stock"))).put("niveau", v.niveau)
                        .put("detail", entier(t.get("detail")) != 0)
                        /*
                         * Un article deconditionne est vendu A L'UNITE : son prix est celui d'une unite, pas d'une
                         * boite. On le dit, sinon il passerait pour le moins cher.
                         */
                        .put("raison", entier(t.get("detail")) != 0
                                ? v.raison + " ; vente à l'unité (déconditionné), prix unitaire" : v.raison));
            }
            /* Equivalents directs d'abord, puis ce qui est en stock, puis le moins cher. */
            lignes.sort(Comparator
                    .<JSONObject> comparingInt(l -> SubstitutionArticle.DIRECT.equals(l.getString("niveau")) ? 0 : 1)
                    .thenComparingInt(l -> l.getInt("stock") > 0 ? 0 : 1)
                    /* Les boites avant la vente a l'unite, dont le prix n'est pas comparable. */
                    .thenComparingInt(l -> l.getBoolean("detail") ? 1 : 0).thenComparingInt(l -> l.getInt("prix"))
                    .thenComparing(l -> l.getString("nom")));
            sortie.put("data", new JSONArray(lignes)).put("total", lignes.size());
            if (lignes.isEmpty()) {
                sortie.put("message", "Aucun autre produit du catalogue n'a exactement la même DCI ("
                        + String.join(" + ", noms) + ").");
            }
            return sortie;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "substituts d'un article", e);
            return new JSONObject().put("success", false).put("data", new JSONArray()).put("message",
                    "Les équivalents n'ont pas pu être recherchés.");
        }
    }

    /**
     * Les produits du rayon qui ont EXACTEMENT une DCI donnee par son nom (« PARACETAMOL ») : ce que l'analyse
     * recommande, rendu concret. En stock d'abord, formes orales solides d'abord, boites avant la vente a l'unite,
     * moins cher d'abord.
     */
    @SuppressWarnings("unchecked")
    public JSONArray produitsDeDci(String nomDci, String emplacementId, int limite) {
        JSONArray sortie = new JSONArray();
        if (StringUtils.isBlank(nomDci)) {
            return sortie;
        }
        try {
            List<String> ids = em
                    .createNativeQuery("SELECT d.lg_DCI_ID FROM t_dci d WHERE UPPER(TRIM(d.str_NAME)) = :nom")
                    .setParameter("nom", nomDci.trim().toUpperCase(java.util.Locale.ROOT)).getResultList();
            List<JSONObject> lignes = new ArrayList<>();
            boolean avecEmplacement = StringUtils.isNotBlank(emplacementId);
            for (String id : ids) {
                Query q = em.createNativeQuery(requeteCandidats(avecEmplacement), Tuple.class)
                        .setParameter("dcis", java.util.Collections.singletonList(id)).setParameter("cle", id)
                        .setParameter("origine", "");
                if (avecEmplacement) {
                    q.setParameter("emplacement", emplacementId);
                }
                for (Tuple t : (List<Tuple>) q.getResultList()) {
                    String nom = StringUtils.trimToEmpty(t.get("nom", String.class));
                    String forme = SubstitutionArticle.forme(nom);
                    lignes.add(new JSONObject().put("id", t.get("id", String.class)).put("nom", nom)
                            .put("cip", t.get("cip") == null ? "" : String.valueOf(t.get("cip")))
                            .put("prix", entier(t.get("prix"))).put("stock", entier(t.get("stock")))
                            .put("detail", entier(t.get("detail")) != 0)
                            .put("forme", SubstitutionArticle.libelleForme(forme))
                            .put("dosage", String.join(" + ", SubstitutionArticle.dosage(nom)))
                            .put("oralSolide", "oral_solide".equals(forme)));
                }
            }
            lignes.sort(Comparator.<JSONObject> comparingInt(l -> l.getInt("stock") > 0 ? 0 : 1)
                    .thenComparingInt(l -> l.getBoolean("oralSolide") ? 0 : 1)
                    .thenComparingInt(l -> l.getBoolean("detail") ? 1 : 0).thenComparingInt(l -> l.getInt("prix"))
                    .thenComparing(l -> l.getString("nom")));
            for (int i = 0; i < lignes.size() && i < limite; i++) {
                sortie.put(lignes.get(i));
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "produits d'une DCI recommandee", e);
        }
        return sortie;
    }

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }
}
