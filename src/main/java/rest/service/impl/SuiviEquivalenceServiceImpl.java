package rest.service.impl;

import commonTasks.dto.ArticleAnalyseDTO;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import rest.service.AnalyseArticleService;
import rest.service.SuiviEquivalenceService;

/**
 * Suivi equivalence. Les cles de DCI sont celles des equivalents de la suggestion (liste triee des identifiants des DCI
 * actives du produit) ; les ventes viennent de l'analyse article (meme perimetre que la matrice marge x rotation).
 */
@Stateless
public class SuiviEquivalenceServiceImpl implements SuiviEquivalenceService {

    private static final Logger LOG = Logger.getLogger(SuiviEquivalenceServiceImpl.class.getName());
    private static final String LIEN_ACTIF = " (fd.str_STATUT IS NULL OR fd.str_STATUT = '' OR fd.str_STATUT = 'enable') ";

    /** Produits actifs ayant une cle de DCI partagee par au moins un autre produit actif. */
    private static final String SQL_PRODUITS = "SELECT f.lg_FAMILLE_ID AS id, f.str_NAME AS nom, f.int_CIP AS cip,"
            + " COALESCE(f.int_PAF, 0) AS paf, k.cle AS cle, k.dci AS dci,"
            + " (SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) FROM t_famille_stock s"
            + "   WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = :emp) AS stock"
            + " FROM t_famille f JOIN (SELECT fd.lg_FAMILLE_ID AS famille,"
            + "   GROUP_CONCAT(DISTINCT fd.lg_DCI_ID ORDER BY fd.lg_DCI_ID SEPARATOR ',') AS cle,"
            + "   GROUP_CONCAT(DISTINCT dc.str_NAME ORDER BY dc.str_NAME SEPARATOR ' + ') AS dci"
            + "   FROM t_famille_dci fd JOIN t_dci dc ON dc.lg_DCI_ID = fd.lg_DCI_ID WHERE" + LIEN_ACTIF
            + "   GROUP BY fd.lg_FAMILLE_ID) k ON k.famille = f.lg_FAMILLE_ID"
            /*
             * Les articles vendus au detail (deconditionnes) comptent des unites, pas des boites : ils fausseraient le
             * meneur et le classement ; ils restent representes par leur boite.
             */
            + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private AnalyseArticleService analyseArticleService;

    @Override
    public List<SuiviEquivalence.Groupe> groupes(LocalDate debut, LocalDate fin, String emplacementId,
            SuiviEquivalence.Criteres criteres) {
        criteres.jours = ChronoUnit.DAYS.between(debut, fin) + 1;
        try {
            Map<String, SuiviEquivalence.Produit> produits = produits(emplacementId);
            for (ArticleAnalyseDTO a : analyseArticleService.articles(debut, fin)) {
                SuiviEquivalence.Produit p = produits.get(a.getProduitId());
                if (p != null) {
                    p.quantite = a.getQuantite();
                    p.montant = a.getMontant();
                    p.marge = a.getMarge();
                }
            }
            List<SuiviEquivalence.Groupe> groupes = SuiviEquivalence.calculer(new ArrayList<>(produits.values()),
                    criteres);
            Map<String, SuiviEquivalence.Produit> retenus = new HashMap<>();
            for (SuiviEquivalence.Groupe g : groupes) {
                for (SuiviEquivalence.Produit p : g.produits) {
                    retenus.put(p.id, p);
                }
            }
            dernieresVentes(retenus);
            return groupes;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "suivi equivalence", e);
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, SuiviEquivalence.Produit> produits(String emplacementId) {
        List<Tuple> lignes = em.createNativeQuery(SQL_PRODUITS, Tuple.class).setParameter("emp", emplacementId)
                .getResultList();
        Map<String, Integer> parCle = new HashMap<>();
        for (Tuple t : lignes) {
            parCle.merge(texte(t.get("cle")), 1, Integer::sum);
        }
        Map<String, SuiviEquivalence.Produit> produits = new HashMap<>();
        for (Tuple t : lignes) {
            String cle = texte(t.get("cle"));
            if (cle == null || parCle.getOrDefault(cle, 0) < 2) {
                continue;
            }
            SuiviEquivalence.Produit p = new SuiviEquivalence.Produit(texte(t.get("id")), texte(t.get("nom")));
            p.cip = StringUtils.defaultString(texte(t.get("cip")));
            p.cle = cle;
            p.dci = StringUtils.defaultString(texte(t.get("dci")));
            p.stock = entier(t.get("stock"));
            p.prixAchat = (int) entier(t.get("paf"));
            produits.put(p.id, p);
        }
        return produits;
    }

    /** Derniere vente (cloturee, non annulee) de chaque produit retenu, par paquets. */
    @SuppressWarnings("unchecked")
    private void dernieresVentes(Map<String, SuiviEquivalence.Produit> produits) {
        List<String> ids = new ArrayList<>(produits.keySet());
        for (int i = 0; i < ids.size(); i += 1000) {
            List<Object[]> lignes = em
                    .createNativeQuery("SELECT d.lg_FAMILLE_ID, DATE_FORMAT(MAX(v.dt_UPDATED), '%d/%m/%Y')"
                            + " FROM t_preenregistrement_detail d JOIN t_preenregistrement v"
                            + "   ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                            + " WHERE d.lg_FAMILLE_ID IN (:ids) AND v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0"
                            + " AND v.int_PRICE > 0 GROUP BY d.lg_FAMILLE_ID")
                    .setParameter("ids", ids.subList(i, Math.min(ids.size(), i + 1000))).getResultList();
            for (Object[] r : lignes) {
                SuiviEquivalence.Produit p = produits.get(texte(r[0]));
                if (p != null) {
                    p.derniereVente = texte(r[1]);
                }
            }
        }
    }

    private static String texte(Object o) {
        return o == null ? null : o.toString();
    }

    private static long entier(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }
}
