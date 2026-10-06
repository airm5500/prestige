package rest.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.EquivalentsDciSuggestionService;
import rest.service.impl.CouvertureEquivalentsDci.Ligne;
import rest.service.impl.CouvertureEquivalentsDci.Produit;
import rest.service.impl.CouvertureEquivalentsDci.Resultat;
import rest.service.impl.CouvertureEquivalentsDci.Substitut;

/**
 * EQUIVALENTS DCI D'UNE SUGGESTION : quatre requetes pour toute la suggestion (lignes, cles de DCI, candidats en stock,
 * dernieres entrees / ventes), puis le calcul de {@link CouvertureEquivalentsDci}. Rien n'est ecrit.
 */
@Stateless
public class EquivalentsDciSuggestionServiceImpl implements EquivalentsDciSuggestionService {

    private static final Logger LOG = Logger.getLogger(EquivalentsDciSuggestionServiceImpl.class.getName());

    /** Un lien produit-DCI actif : le statut est parfois vide sur les liens anciens (meme regle que les substituts). */
    private static final String LIEN_ACTIF = " (fd.str_STATUT IS NULL OR fd.str_STATUT = '' OR fd.str_STATUT = 'enable') ";

    private static final String CLE = "GROUP_CONCAT(DISTINCT fd.lg_DCI_ID ORDER BY fd.lg_DCI_ID SEPARATOR ',')";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }

    private static String texte(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    /** Ce que l'analyse a lu en base, avant calcul. */
    private static class Donnees {

        final List<Ligne> lignes = new ArrayList<>();
        final Map<String, List<Produit>> candidats = new HashMap<>();
        final Set<String> familles = new HashSet<>();
        String reference, grossiste;
    }

    @SuppressWarnings("unchecked")
    private Donnees lire(String suggestionId, String emplacementId) {
        Donnees d = new Donnees();
        List<Tuple> entete = em
                .createNativeQuery("SELECT s.str_REF AS ref, g.str_LIBELLE AS grossiste"
                        + " FROM t_suggestion_order s LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = s.lg_GROSSISTE_ID"
                        + " WHERE s.lg_SUGGESTION_ORDER_ID = :id", Tuple.class)
                .setParameter("id", suggestionId).getResultList();
        if (entete.isEmpty()) {
            return null;
        }
        d.reference = texte(entete.get(0).get("ref"));
        d.grossiste = texte(entete.get(0).get("grossiste"));
        List<Tuple> lignes = em.createNativeQuery("SELECT sd.lg_SUGGESTION_ORDER_DETAILS_ID AS item,"
                + " f.lg_FAMILLE_ID AS id, f.str_NAME AS nom, f.int_CIP AS cip, f.int_PRICE AS prix, f.int_PAF AS paf,"
                + " COALESCE(f.bool_DECONDITIONNE, 0) AS detail, COALESCE(sd.int_NUMBER, 0) AS qte,"
                + " COALESCE(sd.int_PAF_DETAIL, f.int_PAF) AS pafLigne,"
                + " (SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) FROM t_famille_stock s"
                + "   WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = :emp) AS stock"
                + " FROM t_suggestion_order_details sd JOIN t_famille f ON f.lg_FAMILLE_ID = sd.lg_FAMILLE_ID"
                + " WHERE sd.lg_SUGGESTION_ORDER_ID = :id ORDER BY f.str_NAME", Tuple.class)
                .setParameter("id", suggestionId).setParameter("emp", emplacementId).getResultList();
        Map<String, Produit> parId = new LinkedHashMap<>();
        for (Tuple t : lignes) {
            Produit p = produit(t);
            parId.put(p.id, p);
            d.familles.add(p.id);
            d.lignes.add(new Ligne(texte(t.get("item")), p, entier(t.get("qte")), entier(t.get("pafLigne"))));
        }
        if (parId.isEmpty()) {
            return d;
        }
        /* Cle de DCI (liste triee des identifiants) et noms des DCI des produits suggeres. */
        List<Tuple> cles = em
                .createNativeQuery("SELECT fd.lg_FAMILLE_ID AS id, " + CLE + " AS cle,"
                        + " GROUP_CONCAT(DISTINCT dc.str_NAME ORDER BY dc.str_NAME SEPARATOR ' + ') AS dci"
                        + " FROM t_famille_dci fd JOIN t_dci dc ON dc.lg_DCI_ID = fd.lg_DCI_ID WHERE" + LIEN_ACTIF
                        + " AND fd.lg_FAMILLE_ID IN (:ids) GROUP BY fd.lg_FAMILLE_ID", Tuple.class)
                .setParameter("ids", parId.keySet()).getResultList();
        Set<String> toutesCles = new HashSet<>();
        Set<String> dcis = new HashSet<>();
        for (Tuple t : cles) {
            Produit p = parId.get(texte(t.get("id")));
            if (p != null && t.get("cle") != null) {
                p.cle = texte(t.get("cle"));
                p.dci = texte(t.get("dci"));
                toutesCles.add(p.cle);
                for (String x : p.cle.split(",")) {
                    dcis.add(x);
                }
            }
        }
        Map<String, Produit> tous = new HashMap<>(parId);
        if (!toutesCles.isEmpty()) {
            /* Candidats EN STOCK ayant exactement l'une de ces cles. */
            List<Tuple> cands = em
                    .createNativeQuery("SELECT * FROM (SELECT f.lg_FAMILLE_ID AS id, f.str_NAME AS nom,"
                            + " f.int_CIP AS cip, f.int_PRICE AS prix, f.int_PAF AS paf,"
                            + " COALESCE(f.bool_DECONDITIONNE, 0) AS detail, k.cle AS cle,"
                            + " (SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) FROM t_famille_stock s"
                            + "   WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = :emp) AS stock"
                            + " FROM t_famille f JOIN (SELECT fd.lg_FAMILLE_ID AS famille, " + CLE + " AS cle"
                            + "   FROM t_famille_dci fd WHERE" + LIEN_ACTIF + " AND fd.lg_FAMILLE_ID IN"
                            + "     (SELECT x.lg_FAMILLE_ID FROM t_famille_dci x WHERE x.lg_DCI_ID IN (:dcis))"
                            + "   GROUP BY fd.lg_FAMILLE_ID) k ON k.famille = f.lg_FAMILLE_ID"
                            + " WHERE k.cle IN (:cles) AND f.str_STATUT = 'enable') c WHERE c.stock > 0", Tuple.class)
                    .setParameter("emp", emplacementId).setParameter("dcis", dcis).setParameter("cles", toutesCles)
                    .getResultList();
            for (Tuple t : cands) {
                Produit c = tous.containsKey(texte(t.get("id"))) ? tous.get(texte(t.get("id"))) : produit(t);
                c.cle = texte(t.get("cle"));
                tous.put(c.id, c);
                d.candidats.computeIfAbsent(c.cle, k -> new ArrayList<>()).add(c);
            }
        }
        derniersMouvements(tous);
        return d;
    }

    private static Produit produit(Tuple t) {
        Produit p = new Produit(texte(t.get("id")), StringUtils.trimToEmpty(texte(t.get("nom"))));
        p.cip = texte(t.get("cip"));
        p.prix = entier(t.get("prix"));
        p.paf = entier(t.get("paf"));
        p.detail = entier(t.get("detail")) != 0;
        p.stock = entier(t.get("stock"));
        return p;
    }

    /** Derniere entree en stock (BL cloture) et derniere vente (cloturee, non annulee), date et quantite. */
    @SuppressWarnings("unchecked")
    private void derniersMouvements(Map<String, Produit> produits) {
        Collection<String> ids = produits.keySet();
        if (ids.isEmpty()) {
            return;
        }
        List<Object[]> entrees = em.createNativeQuery("SELECT x.f, DATE_FORMAT(x.dt, '%Y-%m-%d %H:%i:%s'),"
                + " SUM(COALESCE(bd.int_QTE_RECUE, 0)) FROM (SELECT bd.lg_FAMILLE_ID AS f, MAX(b.dt_UPDATED) AS dt"
                + "   FROM t_bon_livraison_detail bd JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = bd.lg_BON_LIVRAISON_ID"
                + "   WHERE bd.lg_FAMILLE_ID IN (:ids) AND b.str_STATUT = 'is_Closed' GROUP BY bd.lg_FAMILLE_ID) x"
                + " JOIN t_bon_livraison_detail bd ON bd.lg_FAMILLE_ID = x.f"
                + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = bd.lg_BON_LIVRAISON_ID AND b.dt_UPDATED = x.dt"
                + " AND b.str_STATUT = 'is_Closed' GROUP BY x.f, x.dt").setParameter("ids", ids).getResultList();
        for (Object[] r : entrees) {
            Produit p = produits.get(texte(r[0]));
            if (p != null) {
                p.derniereEntree = texte(r[1]);
                p.qteDerniereEntree = entier(r[2]);
            }
        }
        List<Object[]> ventes = em.createNativeQuery("SELECT x.f, DATE_FORMAT(x.dt, '%Y-%m-%d %H:%i:%s'),"
                + " SUM(COALESCE(d.int_QUANTITY, 0)) FROM (SELECT d.lg_FAMILLE_ID AS f, MAX(v.dt_UPDATED) AS dt"
                + "   FROM t_preenregistrement_detail d JOIN t_preenregistrement v"
                + "     ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + "   WHERE d.lg_FAMILLE_ID IN (:ids) AND v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0"
                + "   AND v.int_PRICE > 0 GROUP BY d.lg_FAMILLE_ID) x"
                + " JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = x.f"
                + " JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + " AND v.dt_UPDATED = x.dt AND v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0"
                + " GROUP BY x.f, x.dt").setParameter("ids", ids).getResultList();
        for (Object[] r : ventes) {
            Produit p = produits.get(texte(r[0]));
            if (p != null) {
                p.derniereVente = texte(r[1]);
                p.qteDerniereVente = entier(r[2]);
            }
        }
    }

    private static String jourMois(String date) {
        /* yyyy-MM-dd HH:mm:ss -> dd/MM/yyyy */
        return date == null || date.length() < 10 ? ""
                : date.substring(8, 10) + "/" + date.substring(5, 7) + "/" + date.substring(0, 4);
    }

    private static JSONObject json(Produit p) {
        return new JSONObject().put("id", p.id).put("nom", p.nom).put("cip", StringUtils.defaultString(p.cip))
                .put("stock", p.stock).put("prix", p.prix).put("paf", p.paf)
                .put("derniereEntree", jourMois(p.derniereEntree)).put("qteDerniereEntree", p.qteDerniereEntree)
                .put("derniereVente", jourMois(p.derniereVente)).put("qteDerniereVente", p.qteDerniereVente);
    }

    @Override
    public JSONObject analyser(String suggestionId, String emplacementId, String itemId) {
        try {
            long debut = System.currentTimeMillis();
            Donnees d = lire(suggestionId, emplacementId);
            if (d == null) {
                return new JSONObject().put("success", false).put("msg", "Suggestion introuvable");
            }
            List<Resultat> res = CouvertureEquivalentsDci.calculer(d.lignes, d.candidats, d.familles);
            long valeurAchat = 0, valeurVente = 0, couvAchat = 0, couvVente = 0;
            int unites = 0, concernes = 0, sansDci = 0;
            for (Ligne l : d.lignes) {
                valeurAchat += (long) l.pafLigne * l.qteSuggeree;
                valeurVente += (long) l.produit.prix * l.qteSuggeree;
                if (l.produit.cle == null) {
                    sansDci++;
                }
            }
            JSONArray data = new JSONArray();
            for (Resultat r : res) {
                if (itemId != null && !itemId.equals(r.ligne.itemId)) {
                    continue;
                }
                JSONArray subs = new JSONArray();
                for (Substitut s : r.substituts) {
                    subs.put(json(s.produit).put("niveau", s.niveau).put("raison", s.raison)
                            .put("dansSuggestion", s.dansSuggestion).put("detail", s.produit.detail)
                            .put("compte", s.compte()).put("utilise", s.utilise));
                }
                if (r.couverte > 0) {
                    concernes++;
                    unites += r.couverte;
                    couvAchat += (long) r.ligne.pafLigne * r.couverte;
                    couvVente += (long) r.ligne.produit.prix * r.couverte;
                }
                data.put(new JSONObject().put("itemId", r.ligne.itemId)
                        .put("produit",
                                json(r.ligne.produit).put("dci", StringUtils.defaultString(r.ligne.produit.dci)))
                        .put("qteSuggeree", r.ligne.qteSuggeree).put("couverte", r.couverte).put("reste", r.reste())
                        .put("substituts", subs));
            }
            JSONObject tuiles = new JSONObject().put("lignes", d.lignes.size()).put("avecSubstitut", res.size())
                    .put("concernes", concernes).put("unitesCouvertes", unites).put("valeurCouverteAchat", couvAchat)
                    .put("valeurCouverteVente", couvVente).put("valeurAvantAchat", valeurAchat)
                    .put("valeurApresAchat", valeurAchat - couvAchat).put("valeurAvantVente", valeurVente)
                    .put("valeurApresVente", valeurVente - couvVente).put("sansDci", sansDci);
            return new JSONObject().put("success", true).put("reference", d.reference)
                    .put("grossiste", StringUtils.defaultString(d.grossiste)).put("tuiles", tuiles).put("data", data)
                    .put("duree", System.currentTimeMillis() - debut);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "equivalents DCI d'une suggestion", e);
            return new JSONObject().put("success", false).put("msg", "L'analyse n'a pas pu être faite.");
        }
    }

    @Override
    public List<Map<String, Object>> lignesImpression(String suggestionId, String emplacementId) {
        List<Map<String, Object>> sortie = new ArrayList<>();
        Donnees d = lire(suggestionId, emplacementId);
        if (d == null) {
            return sortie;
        }
        for (Resultat r : CouvertureEquivalentsDci.calculer(d.lignes, d.candidats, d.familles)) {
            for (Substitut s : r.substituts) {
                Map<String, Object> m = new HashMap<>();
                m.put("cip", StringUtils.defaultString(r.ligne.produit.cip));
                m.put("produit", r.ligne.produit.nom);
                m.put("dci", StringUtils.defaultString(r.ligne.produit.dci));
                m.put("qteSuggeree", r.ligne.qteSuggeree);
                m.put("couverte", r.couverte);
                m.put("stockProduit", r.ligne.produit.stock);
                m.put("substitutCip", StringUtils.defaultString(s.produit.cip));
                m.put("substitut", s.produit.nom);
                m.put("niveau", SubstitutionArticle.DIRECT.equals(s.niveau) ? "Direct" : "À adapter");
                m.put("stock", s.produit.stock);
                m.put("prix", s.produit.prix);
                m.put("derniereVente", jourMois(s.produit.derniereVente));
                m.put("derniereEntree", jourMois(s.produit.derniereEntree));
                sortie.add(m);
            }
        }
        return sortie;
    }

    @Override
    public Map<String, Integer> reliquats(String suggestionId, String emplacementId, List<String> itemIds) {
        Map<String, Integer> sortie = new LinkedHashMap<>();
        Donnees d = lire(suggestionId, emplacementId);
        if (d == null || itemIds == null) {
            return sortie;
        }
        for (Resultat r : CouvertureEquivalentsDci.calculer(d.lignes, d.candidats, d.familles)) {
            if (itemIds.contains(r.ligne.itemId) && r.couverte > 0) {
                sortie.put(r.ligne.itemId, r.reste());
            }
        }
        return sortie;
    }
}
