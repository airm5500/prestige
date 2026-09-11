package rest.service.impl;

import commonTasks.dto.ArticleAnalyseDTO;
import commonTasks.dto.GardeVenteLigneDTO;
import commonTasks.dto.PaireArticleDTO;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import rest.service.AnalyseArticleService;
import rest.service.GardeService;
import rest.service.SessionHelperService;

/**
 * Analyse article. Les lignes de vente sont celles du service des gardes (meme perimetre que la classification ABC :
 * ventes cloturees, non annulees, de l'emplacement, hors depot extension, hors exclues), le stock celui de la fiche
 * article, les seuils ABC ceux de t_classe_abc. Les paires sont comptees en base, par ticket.
 */
@Stateless
public class AnalyseArticleServiceImpl implements AnalyseArticleService {

    private static final Logger LOG = Logger.getLogger(AnalyseArticleServiceImpl.class.getName());

    /**
     * Les paires de produits presents sur un meme ticket, sur le perimetre des lignes de vente. La jointure « b.produit
     * > a.produit » compte chaque paire une seule fois ; DISTINCT protege des tickets qui portent deux lignes du meme
     * produit.
     */
    // Chaque colonne porte un alias distinct : Hibernate refuse deux colonnes de meme nom dans une requete native.
    private static final String SQL_PAIRES = "SELECT a.lg_FAMILLE_ID AS produit1, fa.int_CIP AS cip1, fa.str_NAME AS libelle1,"
            + " b.lg_FAMILLE_ID AS produit2, fb.int_CIP AS cip2, fb.str_NAME AS libelle2,"
            + " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS tickets"
            + " FROM t_preenregistrement p JOIN t_user up ON up.lg_USER_ID = p.lg_USER_ID"
            + " JOIN t_preenregistrement_detail a ON a.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " JOIN t_preenregistrement_detail b ON b.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " AND b.lg_FAMILLE_ID > a.lg_FAMILLE_ID" + " JOIN t_famille fa ON fa.lg_FAMILLE_ID = a.lg_FAMILLE_ID"
            + " JOIN t_famille fb ON fb.lg_FAMILLE_ID = b.lg_FAMILLE_ID"
            + " WHERE p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2"
            + " AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " AND p.lg_TYPE_VENTE_ID <> '5' AND up.lg_EMPLACEMENT_ID = ?3 AND p.imported = 0"
            + " AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v)"
            + " GROUP BY a.lg_FAMILLE_ID, fa.int_CIP, fa.str_NAME, b.lg_FAMILLE_ID, fb.int_CIP, fb.str_NAME"
            + " HAVING tickets >= ?4 ORDER BY tickets DESC, fa.str_NAME, fb.str_NAME LIMIT ?5";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private GardeService gardeService;

    @EJB
    private SessionHelperService sessionHelperService;

    @Override
    public List<ArticleAnalyseDTO> articles(LocalDate debut, LocalDate fin) {
        if (debut == null || fin == null || fin.isBefore(debut)) {
            return new ArrayList<>();
        }
        List<GardeVenteLigneDTO> lignes = gardeService.lignesDeVente(debut.atStartOfDay(),
                fin.plusDays(1).atStartOfDay());
        long jours = ChronoUnit.DAYS.between(debut, fin) + 1;
        List<ArticleAnalyseDTO> articles = AnalyseArticle.agreger(lignes, jours);
        AnalyseArticle.classerAbc(articles, lignes, seuil("A", AnalyseGarde.SEUIL_A_DEFAUT),
                seuil("B", AnalyseGarde.SEUIL_B_DEFAUT));
        renseignerStock(articles);
        return articles;
    }

    @Override
    public List<PaireArticleDTO> paires(LocalDate debut, LocalDate fin, int minimum, int limite) {
        List<PaireArticleDTO> paires = new ArrayList<>();
        if (debut == null || fin == null || fin.isBefore(debut)) {
            return paires;
        }
        try {
            Query q = em.createNativeQuery(SQL_PAIRES);
            q.setParameter(1, java.sql.Timestamp.valueOf(debut.atStartOfDay()));
            q.setParameter(2, java.sql.Timestamp.valueOf(fin.plusDays(1).atStartOfDay()));
            q.setParameter(3, emplacementCourant());
            q.setParameter(4, Math.max(1, minimum));
            q.setParameter(5, Math.max(1, limite));
            for (Object ligne : q.getResultList()) {
                Object[] c = (Object[]) ligne;
                paires.add(new PaireArticleDTO(texte(c[0]), texte(c[1]), texte(c[2]), texte(c[3]), texte(c[4]),
                        texte(c[5]), entier(c[6])));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "paires de produits", e);
        }
        return paires;
    }

    /** Le stock disponible de la fiche article, a l'emplacement de l'utilisateur, par lots de 500 produits. */
    private void renseignerStock(List<ArticleAnalyseDTO> articles) {
        if (articles.isEmpty()) {
            return;
        }
        try {
            Map<String, Long> stocks = new HashMap<>();
            List<String> ids = new ArrayList<>();
            for (ArticleAnalyseDTO a : articles) {
                ids.add(a.getProduitId());
            }
            for (int depart = 0; depart < ids.size(); depart += 500) {
                List<String> tranche = ids.subList(depart, Math.min(ids.size(), depart + 500));
                Query q = em.createNativeQuery("SELECT t.lg_FAMILLE_ID, COALESCE(SUM(t.int_NUMBER_AVAILABLE),0)"
                        + " FROM t_famille_stock t WHERE t.lg_EMPLACEMENT_ID = :empl AND t.lg_FAMILLE_ID IN (:ids)"
                        + " GROUP BY t.lg_FAMILLE_ID");
                q.setParameter("empl", emplacementCourant()).setParameter("ids", tranche);
                for (Object ligne : q.getResultList()) {
                    Object[] c = (Object[]) ligne;
                    stocks.put(texte(c[0]), entier(c[1]));
                }
            }
            for (ArticleAnalyseDTO a : articles) {
                a.setStock(stocks.getOrDefault(a.getProduitId(), 0L));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "stock des produits analyses", e);
        }
    }

    /** Les seuils ABC parametres dans l'application, jamais recopies en dur. */
    private double seuil(String code, double defaut) {
        try {
            Query q = em.createNativeQuery("SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc"
                    + " WHERE str_CODE = ?1 AND str_STATUT = 'enable' LIMIT 1");
            q.setParameter(1, code);
            List<?> resultat = q.getResultList();
            if (!resultat.isEmpty() && resultat.get(0) instanceof Number) {
                return ((Number) resultat.get(0)).doubleValue();
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "seuil ABC " + code + " illisible, valeur par defaut utilisee", e);
        }
        return defaut;
    }

    private String emplacementCourant() {
        try {
            dal.TUser utilisateur = sessionHelperService.getCurrentUser();
            if (utilisateur != null && utilisateur.getLgEMPLACEMENTID() != null) {
                return utilisateur.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "emplacement de l'utilisateur courant", e);
        }
        return "1";
    }

    private static String texte(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static long entier(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }

}
