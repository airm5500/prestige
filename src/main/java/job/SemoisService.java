
package job;

import dal.TCalendrier;
import dal.TFamille;
import dal.TFamille_;
import dal.TParameters;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Root;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.Status;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import org.apache.commons.lang3.tuple.Pair;
import util.Constant;
import javax.ejb.Stateless;
import javax.ejb.TransactionManagement;
import javax.ejb.TransactionManagementType;

/**
 *
 * @author koben
 */
@Stateless
@TransactionManagement(value = TransactionManagementType.BEAN)
public class SemoisService {
    private static final Logger LOG = Logger.getLogger(SemoisService.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Inject
    private UserTransaction userTransaction;

    private static final String COUNT_QUERY = "SELECT COUNT(DISTINCT f.lg_FAMILLE_ID) AS  totalProduitsVendus FROM  t_preenregistrement p JOIN t_preenregistrement_detail d ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID WHERE p.str_STATUT='is_Closed' AND p.int_PRICE> 0 AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2 AND f.str_STATUT='enable'  AND p.lg_TYPE_VENTE_ID <> '5'";
    private static final String QUERY = "SELECT f.int_NUMBERDETAIL AS itemQuantity,SUM(d.int_QUANTITY) AS  totalQuantiteVendue,f.bool_DECONDITIONNE AS detail, f.bool_DECONDITIONNE_EXIST AS hasDetail,f.lg_FAMILLE_ID AS produitId,f.lg_FAMILLE_PARENT_ID AS parentId FROM  t_preenregistrement p JOIN t_preenregistrement_detail d ON "
            + " p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID WHERE p.str_STATUT='is_Closed' AND p.int_PRICE> 0 AND DATE(p.dt_UPDATED) BETWEEN ?1 AND  ?2 AND f.str_STATUT='enable'  AND p.lg_TYPE_VENTE_ID <> '5' GROUP BY f.lg_FAMILLE_ID ORDER BY f.str_NAME ASC";

    private TParameters findParameters(String key) {
        try {
            return em.find(TParameters.class, key);

        } catch (Exception e) {
            return null;
        }
    }

    private List<LocalDate> nombreMoisPleinsConsommation(int nombre) {
        LocalDate now = LocalDate.now();
        List<LocalDate> nombreMois = new ArrayList<>();

        for (int i = 1; i <= nombre; i++) {
            try {
                LocalDate no = now.minusMonths(i);
                TypedQuery<TCalendrier> tq = em.createQuery(
                        "SELECT o FROM TCalendrier o WHERE   FUNCTION('MONTH', o.dtDay) =?1 AND  FUNCTION('YEAR', o.dtDay)=?2 AND o.intNUMBERJOUR >=20 ",
                        TCalendrier.class);
                tq.setParameter(1, no.getMonthValue());
                tq.setParameter(2, no.getYear());
                tq.setMaxResults(1);
                TCalendrier calendrier = tq.getSingleResult();
                if (calendrier != null) {
                    nombreMois.add(LocalDate.of(calendrier.getDtDay().getYear(), calendrier.getDtDay().getMonth(), 1));
                }
            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }

        }

        return nombreMois;
    }

    private boolean isSemois() {
        try {
            TParameters semois = em.find(TParameters.class, "SEMOIS");
            return (semois != null && Integer.parseInt(semois.getStrVALUE()) == 1);

        } catch (NumberFormatException e) {
            return false;
        }

    }

    public void execute() {
        try {
            TParameters p = em.find(TParameters.class, "KEY_DAY_SEUIL_REAPPRO");// derniere date de mise a jour stock
            // reappro
            LocalDate date = LocalDate.parse(p.getStrVALUE());
            if (date.getMonthValue() != LocalDate.now().getMonthValue()) {
                computeReapproSemois();
                userTransaction.begin();
                p.setStrVALUE(LocalDate.now().toString());
                p.setDtUPDATED(new Date());
                em.merge(p);
                userTransaction.commit();
            }
        } catch (IllegalStateException | SecurityException | HeuristicMixedException | HeuristicRollbackException
                | NotSupportedException | RollbackException | SystemException e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    public Pair<Integer, Integer> calculSeuiQteReappro(int q1, int q2, double q3, int q3Parametre) {

        /*
         * valeur calculee de la consommation du produit sur une semaine
         */
        double divente = (Double.valueOf(q3Parametre) * 4);
        double q4 = 0.5;
        if (divente > 0) {
            q4 = (q3 / divente);
        }
        int seuilReappro = (int) Math.ceil(q4 * q1);
        int qteReappro = (int) Math.ceil(q4 * q2);
        return Pair.of(seuilReappro, qteReappro);

    }

    public void computeReapproSemois() {
        try {
            var isActive = isSemois();

            LOG.log(Level.INFO, "ETAT DE LA GESTION SEMOIS {0}", isActive);
            if (isActive) {
                LOG.log(Level.INFO, "*****************  DEBUT TRAITEMENT  SEMOIS A {0}", LocalDateTime.now());
                computeReappro();
                LOG.log(Level.INFO, "*****************  FIN TRAITEMENT  SEMOIS A {0}", LocalDateTime.now());
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    private List<Tuple> loadSemoisArticle(LocalDate dtSart, LocalDate dtEnd, int start, int limit) {
        try {
            Query q = this.em.createNativeQuery(QUERY, Tuple.class);
            q.setParameter(1, dtSart);
            q.setParameter(2, dtEnd);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();

        }
    }

    private int loadSemoisArticleCount(LocalDate dtSart, LocalDate dtEnd) {
        try {
            Query q = this.em.createNativeQuery(COUNT_QUERY);
            q.setParameter(1, dtSart);
            q.setParameter(2, dtEnd);

            return ((Number) q.getSingleResult()).intValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;

        }
    }

    private void computeReappro() {
        int start = 0;
        int limit = 1000;
        int q1 = 4;
        int q2 = 2;
        int q3 = 3;

        TParameters p1 = findParameters(Constant.Q1);
        if (p1 != null) {
            q1 = Integer.parseInt(p1.getStrVALUE().trim());
        }
        TParameters p2 = findParameters(Constant.Q2);
        if (p2 != null) {
            q2 = Integer.parseInt(p2.getStrVALUE().trim());
        }
        TParameters p3 = findParameters(Constant.Q3);
        if (p3 != null) {
            q3 = Integer.parseInt(p3.getStrVALUE().trim());
        }
        List<LocalDate> nombreMois = nombreMoisPleinsConsommation(q3).stream().sorted().collect(Collectors.toList());

        if (!nombreMois.isEmpty()) {
            LocalDate firstMouth = nombreMois.get(0);
            LocalDate last = nombreMois.get(nombreMois.size() - 1);
            LocalDate lastMouth = LocalDate.of(last.getYear(), last.getMonth(), last.lengthOfMonth());
            int total = loadSemoisArticleCount(firstMouth, lastMouth);

            Map<String, Tuple> mapBoite = new HashMap<>();
            Map<String, Tuple> items = new HashMap<>();

            for (int i = start; i <= total; i += limit) {
                List<Tuple> list = loadSemoisArticle(firstMouth, lastMouth, i, limit);
                try {
                    userTransaction.begin();
                    for (Tuple tuple : list) {
                        BigDecimal totalQuantiteVendue = tuple.get("totalQuantiteVendue", BigDecimal.class);
                        String produitId = tuple.get("produitId", String.class);
                        String parentId = tuple.get("parentId", String.class);
                        int conso = totalQuantiteVendue.intValue();
                        short isDecon = Short.parseShort(tuple.get("detail").toString());
                        if (isDecon == 1) {
                            items.put(parentId, tuple); // pour les deconditionnes on les met dans une map
                            continue;
                        }
                        short hasDetail = Short.parseShort(tuple.get("hasDetail").toString());
                        if (hasDetail == 1) {
                            mapBoite.put(produitId, tuple); // pour les boites on les met dans une map pour les traiter
                            continue;
                        }

                        Pair<Integer, Integer> computesValues = calculSeuiQteReappro(q1, q2, conso, q3);
                        updateProduitSeuilAndQtyReappro(produitId, computesValues.getLeft(), computesValues.getRight());

                    }

                    userTransaction.commit();

                } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                        | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
                    try {
                        if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                                || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                            userTransaction.rollback();
                        }
                    } catch (SystemException ex1) {
                        LOG.log(Level.SEVERE, null, ex1);
                    }
                }

            }

            traiterReapproBoite(q1, q2, q3, mapBoite, items);

        }
    }

    /*
     * On traite les boites , on ajoute la quantite du detail a la boite
     */
    private void traiterReapproBoite(int q1, int q2, int q3, Map<String, Tuple> mapBoite, Map<String, Tuple> items) {

        try {
            userTransaction.begin();
            mapBoite.forEach((produitId, v) -> {
                int totalQuantiteVendue = v.get("totalQuantiteVendue", BigDecimal.class).intValue();
                int itemQuantity = v.get("itemQuantity", Integer.class);
                Tuple item = items.remove(produitId);
                if (item != null) {
                    int itemQuantiteVendue = item.get("totalQuantiteVendue", BigDecimal.class).intValue();
                    totalQuantiteVendue += (int) Math.ceil(itemQuantiteVendue / Double.valueOf(itemQuantity));
                }
                Pair<Integer, Integer> computesValues = calculSeuiQteReappro(q1, q2, totalQuantiteVendue, q3);

                updateProduitSeuilAndQtyReappro(produitId, computesValues.getLeft(), computesValues.getRight());
            });
            traiterReapproDetail(q1, q2, q3, items);
            userTransaction.commit();
        } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
            try {
                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex1) {
                LOG.log(Level.SEVERE, null, ex1);
            }
        }

    }

    /*
     * On traite les details dont les boites n'ont pas ete vendues
     */
    private void traiterReapproDetail(int q1, int q2, int q3, Map<String, Tuple> items) {
        Map<String, Integer> maps = loadItemsDetail(items.keySet());

        items.forEach((produitId, v) -> {
            int itemQuantiteVendue = v.get("totalQuantiteVendue", BigDecimal.class).intValue();
            Integer itemQuantity = maps.remove(produitId);
            if (itemQuantity == null) {
                return;
            }
            int finalQty = (int) Math.ceil(itemQuantiteVendue / Double.valueOf(itemQuantity));

            Pair<Integer, Integer> computesValues = calculSeuiQteReappro(q1, q2, finalQty, q3);
            updateProduitSeuilAndQtyReappro(produitId, computesValues.getLeft(), computesValues.getRight());
        });

    }

    private void updateProduitSeuilAndQtyReappro(String produitId, int seuiCalule, int qteCalule) {

        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaUpdate<TFamille> q = cb.createCriteriaUpdate(TFamille.class);
            Root<TFamille> root = q.from(TFamille.class);
            q.set(root.get(TFamille_.intSEUILMIN), seuiCalule);
            q.set(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuiCalule);
            q.set(root.get(TFamille_.intQTEREAPPROVISIONNEMENT), qteCalule);
            q.where(cb.equal(root.get(TFamille_.lgFAMILLEID), produitId));
            em.createQuery(q).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getLocalizedMessage());
        }

    }

    private Map<String, Integer> loadItemsDetail(Set<String> ids) {

        try {
            Map<String, Integer> map = new HashMap<>();
            Query q = this.em.createNativeQuery(
                    "SELECT f.lg_FAMILLE_ID AS produitId,f.int_NUMBERDETAIL AS itemQuantity FROM  t_famille f WHERE f.lg_FAMILLE_ID IN(?1)",
                    Tuple.class);
            q.setParameter(1, ids);
            ((List<Tuple>) q.getResultList()).forEach(t -> {
                map.put(t.get("produitId", String.class), t.get("itemQuantity", Integer.class));

            });
            return map;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new HashMap<>();

        }
    }
}
