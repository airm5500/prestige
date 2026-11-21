
package job;

import dal.TCalendrier;
import dal.TClasseAbc;
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

    /**
     * Mois pleins retenus (au moins 20 jours d'activite) ; null si le calendrier est illisible : rien n'est calcule.
     */
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
            } catch (javax.persistence.NoResultException e) {
                // mois de moins de 20 jours d'activite : ecarte, cas normal
            } catch (Exception e) {
                // calendrier illisible : la fenetre serait faussee (un mois perdu rendrait ses produits « non vendus »)
                LOG.log(Level.SEVERE, null, e);
                return null;
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

    /** SEMOIS ABC actif : on calcule seuil/qte avec les parametres de la classe du produit. */
    private boolean isSemoisAbc() {
        try {
            TParameters p = em.find(TParameters.class, "SEMOIS_ABC");
            return (p != null && Integer.parseInt(p.getStrVALUE().trim()) == 1);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Methode de division des trois modes SEMOIS (decision du 21/11) : 1 ou parametre absent = mois reellement presents
     * dans l'historique x 4 semaines ; 0 = ancienne formule, Q3 x 4 semaines.
     */
    private boolean isDiviseurMoisReels() {
        try {
            TParameters p = em.find(TParameters.class, "SEMOIS_DIVISEUR_MOIS_REELS");
            return p == null || p.getStrVALUE() == null || Integer.parseInt(p.getStrVALUE().trim()) != 0;
        } catch (Exception e) {
            return true;
        }
    }

    /** SEMOIS PAR PRODUIT actif : on calcule seuil/qte avec Q1/Q2 de la fiche article. */
    private boolean isSemoisParProduit() {
        try {
            TParameters p = em.find(TParameters.class, "SEMOIS_PAR_PRODUIT");
            return (p != null && Integer.parseInt(p.getStrVALUE().trim()) == 1);
        } catch (Exception e) {
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
            /* Une transaction ouverte a la main ne doit jamais survivre au traitement qui l'a ouverte. */
            annulerTransaction();
        }
    }

    /** Annule la transaction ouverte a la main si elle est encore active. */
    private void annulerTransaction() {
        try {
            int statut = userTransaction.getStatus();
            if (statut == javax.transaction.Status.STATUS_ACTIVE
                    || statut == javax.transaction.Status.STATUS_MARKED_ROLLBACK) {
                userTransaction.rollback();
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "semois : annulation de la transaction", e);
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

    /** Nombre de mois du premier au dernier mois retenu, bornes comprises (liste triee, non vide). */
    static int moisCouverts(List<LocalDate> moisAsc) {
        LocalDate premier = moisAsc.get(0).withDayOfMonth(1);
        LocalDate dernier = moisAsc.get(moisAsc.size() - 1).withDayOfMonth(1);
        return (int) java.time.temporal.ChronoUnit.MONTHS.between(premier, dernier) + 1;
    }

    /** Resultat du calcul d'un produit (modes ABC et par produit). */
    static final class Calcul {
        final double consoTotale;
        final int mois;
        final long jours;
        final double conso;
        final int seuil;
        final int qte;

        Calcul(double consoTotale, int mois, long jours, double conso, int q1, int q2) {
            this.consoTotale = consoTotale;
            this.mois = mois;
            this.jours = jours;
            this.conso = conso;
            this.seuil = (int) Math.ceil(conso * q1);
            this.qte = (int) Math.ceil(conso * q2);
        }
    }

    /**
     * Seuil et quantite d'un produit sur les q3 derniers mois retenus (au plus). La consommation par semaine (ou par
     * jour) est divisee par les mois REELLEMENT retenus, pas par q3 : une officine qui n'a qu'un mois d'historique
     * divise par 4 semaines, pas par 12. Produit sans vente (perMonth null ou vide) : seuil et quantite a zero.
     */
    static Calcul calculProduit(Map<String, Double> perMonth, List<LocalDate> moisAsc, int q1, int q2, int q3,
            boolean jour) {
        return calculProduit(perMonth, moisAsc, q1, q2, q3, jour, true);
    }

    /**
     * Meme calcul ; moisReels = false (parametre SEMOIS_DIVISEUR_MOIS_REELS a 0) : ancienne formule, a la semaine la
     * consommation est divisee par q3 x 4 quel que soit l'historique disponible. Au jour : inchange.
     */
    static Calcul calculProduit(Map<String, Double> perMonth, List<LocalDate> moisAsc, int q1, int q2, int q3,
            boolean jour, boolean moisReels) {
        int from = Math.max(0, moisAsc.size() - Math.max(q3, 1));
        List<LocalDate> fenetre = moisAsc.subList(from, moisAsc.size());
        double consoTotale = 0d;
        long nbJours = 0;
        for (LocalDate m : fenetre) {
            Double v = perMonth == null ? null : perMonth.get(ymKey(m));
            if (v != null) {
                consoTotale += v;
            }
            nbJours += m.lengthOfMonth();
        }
        double semaines = (moisReels ? fenetre.size() : Math.max(q3, 1)) * 4d;
        double conso = jour ? (nbJours > 0 ? consoTotale / nbJours : 0d) : (semaines > 0 ? consoTotale / semaines : 0d);
        return new Calcul(consoTotale, fenetre.size(), nbJours, conso, q1, q2);
    }

    /**
     * Produits a traiter dans les modes ABC et par produit : les produits vendus dans la fenetre (cles de la
     * consommation, comme avant) puis les produits actifs sans vente, qui etaient oublies et gardaient d'anciennes
     * valeurs (Moaye, 21/11). Ordre stable, sans doublon.
     * <p>
     * Garde-fous : lecture des ventes en echec (null) ou aucune vente sur des mois retenus, donc actifs (au moins 20
     * jours d'activite au calendrier) : situation anormale, aucun produit traite. Sinon une erreur de lecture mettrait
     * tout le catalogue a zero.
     */
    static List<String> produitsATraiter(java.util.Collection<String> vendus, java.util.Collection<String> actifs) {
        return produitsATraiter(vendus, actifs, vendus == null ? null : new java.util.HashSet<>(vendus));
    }

    /**
     * Meme liste, avec les produits vendus lus a part (lireProduitsVendus) : un produit actif n'est ajoute (donc remis
     * a zero) que s'il n'y figure pas. Un produit vendu absent de la consommation (vendu seulement par un detail
     * desactive) n'est pas traite et garde ses valeurs, comme avant.
     */
    static List<String> produitsATraiter(java.util.Collection<String> calcules, java.util.Collection<String> actifs,
            Set<String> vendus) {
        if (calcules == null || (vendus != null && vendus.isEmpty())) {
            // consommation illisible, ou aucune vente sur les mois retenus : rien
            return new ArrayList<>();
        }
        java.util.LinkedHashSet<String> ids = new java.util.LinkedHashSet<>(calcules);
        if (vendus == null) {
            // liste des vendus illisible : la consommation lue est recalculee comme avant, aucun produit ajoute a zero
            return new ArrayList<>(ids);
        }
        for (String id : actifs) {
            if (!vendus.contains(id)) {
                ids.add(id);
            }
        }
        return new ArrayList<>(ids);
    }

    /** Mois du premier au dernier, bornes comprises (fenetre continue du SEMOIS standard). */
    static List<LocalDate> moisContinus(LocalDate premier, LocalDate dernier) {
        List<LocalDate> l = new ArrayList<>();
        for (LocalDate m = premier.withDayOfMonth(1); !m.isAfter(dernier.withDayOfMonth(1)); m = m.plusMonths(1)) {
            l.add(m);
        }
        return l;
    }

    /**
     * SEMOIS standard : produits actifs a remettre a seuil 0 et quantite 0, c'est-a-dire non vendus dans la fenetre
     * (decision du 21/11 : « oui aussi en standard »). Ordre des actifs, sans doublon. Lecture des ventes incomplete :
     * aucun, pour ne pas vider le catalogue sur une erreur ; aucune vente lue sur des mois actifs : aucun non plus.
     */
    static List<String> aRemettreAZero(java.util.Collection<String> actifs, Set<String> vendus,
            boolean lectureComplete) {
        if (!lectureComplete || !ventesLisibles(vendus)) {
            return new ArrayList<>();
        }
        java.util.LinkedHashSet<String> ids = new java.util.LinkedHashSet<>(actifs);
        ids.removeAll(vendus);
        return new ArrayList<>(ids);
    }

    /**
     * Les ventes lues peuvent servir a remettre des produits a zero : lecture reussie (non null) et au moins un produit
     * vendu. Les mois retenus ont tous au moins 20 jours d'activite au calendrier : aucune vente y est anormal.
     */
    static boolean ventesLisibles(java.util.Collection<String> vendus) {
        return vendus != null && !vendus.isEmpty();
    }

    /**
     * Produits vendus sur les mois donnes, lus en une seule requete, sans pagination : la boite pour un detail
     * deconditionne, et quel que soit le statut du produit de la ligne (un detail desactive protege sa boite). Memes
     * ventes que le calcul (cloturees, montant positif, hors type 5). null si la lecture echoue. Seul ce resultat
     * decide qu'un produit n'est pas vendu, donc remis a zero.
     */
    private Set<String> lireProduitsVendus(List<LocalDate> mois) {
        if (mois == null || mois.isEmpty()) {
            return null;
        }
        try {
            StringBuilder in = new StringBuilder();
            for (int i = 0; i < mois.size(); i++) {
                in.append(i == 0 ? "" : ",").append('?').append(i + 3);
            }
            Query q = em.createNativeQuery(
                    "SELECT DISTINCT CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL"
                            + " AND f.lg_FAMILLE_PARENT_ID<>'' THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END"
                            + " FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID"
                            + " JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID"
                            + " WHERE p.str_STATUT='is_Closed' AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5'"
                            + " AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2 AND DATE_FORMAT(p.dt_UPDATED,'%Y-%m') IN ("
                            + in + ")")
                    .setFlushMode(javax.persistence.FlushModeType.COMMIT);
            LocalDate premier = mois.get(0), dernier = mois.get(mois.size() - 1);
            q.setParameter(1, premier.withDayOfMonth(1));
            q.setParameter(2, dernier.withDayOfMonth(dernier.lengthOfMonth()));
            for (int i = 0; i < mois.size(); i++) {
                q.setParameter(i + 3, ymKey(mois.get(i)));
            }
            Set<String> r = new java.util.HashSet<>();
            for (Object o : q.getResultList()) {
                if (o != null) {
                    r.add(o.toString());
                }
            }
            return r;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    /** Produits actifs hors details deconditionnes (ceux-ci sont comptes dans leur boite). */
    private List<String> loadProduitsActifs() {
        try {
            List<?> r = em.createNativeQuery(
                    "SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' AND (bool_DECONDITIONNE IS NULL OR bool_DECONDITIONNE=0)")
                    .setFlushMode(javax.persistence.FlushModeType.COMMIT).getResultList();
            return r.stream().filter(java.util.Objects::nonNull).map(Object::toString).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    public void computeReapproSemois() {
        try {
            var isActive = isSemois();

            LOG.log(Level.INFO, "ETAT DE LA GESTION SEMOIS {0}", isActive);
            if (isActive) {
                LOG.log(Level.INFO, "*****************  DEBUT TRAITEMENT  SEMOIS A {0}", LocalDateTime.now());
                computeReappro();
                // MAJ de la date de dernier calcul (utile pour le recalcul manuel ; en debut de mois
                // execute() la repositionne aussi a la meme valeur -> aucun effet de bord)
                markReapproDate();
                LOG.log(Level.INFO, "*****************  FIN TRAITEMENT  SEMOIS A {0}", LocalDateTime.now());
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    /** Positionne KEY_DAY_SEUIL_REAPPRO a aujourd'hui (date de dernier calcul des seuils). */
    private void markReapproDate() {
        try {
            TParameters key = em.find(TParameters.class, "KEY_DAY_SEUIL_REAPPRO");
            if (key == null) {
                return;
            }
            userTransaction.begin();
            key.setStrVALUE(LocalDate.now().toString());
            key.setDtUPDATED(new Date());
            em.merge(key);
            userTransaction.commit();
        } catch (Exception e) {
            try {
                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }
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
            return null; // lecture en echec : distinguee d'une page vide

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
            return -1; // lecture en echec : distinguee d'une fenetre sans vente

        }
    }

    private void computeReappro() {
        // SEMOIS ABC : si actif, on bascule sur le calcul par classe.
        // Sinon, le calcul standard ci-dessous reste strictement inchange.
        if (isSemoisAbc()) {
            computeReapproAbc();
            return;
        }
        if (isSemoisParProduit()) {
            computeReapproParProduit();
            return;
        }
        // Journal de calcul (toujours actif) -> ~/Documents/reappro_logs/semois_normal_<date>.json
        final org.json.JSONArray normalLog = new org.json.JSONArray();
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
        List<LocalDate> moisLus = nombreMoisPleinsConsommation(q3);
        if (moisLus == null) {
            LOG.log(Level.WARNING, "semois standard : calendrier illisible, aucun seuil modifie");
            return;
        }
        List<LocalDate> nombreMois = moisLus.stream().sorted().collect(Collectors.toList());

        if (!nombreMois.isEmpty()) {
            LocalDate firstMouth = nombreMois.get(0);
            LocalDate last = nombreMois.get(nombreMois.size() - 1);
            LocalDate lastMouth = LocalDate.of(last.getYear(), last.getMonth(), last.lengthOfMonth());
            /*
             * Les ventes sont lues du premier au dernier mois retenu : on divise par ces mois-la, pas par Q3 (avant :
             * un seul mois d'historique divise par Q3 x 4 semaines, seuils trois fois trop bas a l'ouverture).
             */
            if (isDiviseurMoisReels()) {
                q3 = moisCouverts(nombreMois); // journal : « q3Mois » = mois reellement couverts par les ventes lues
            }
            int total = loadSemoisArticleCount(firstMouth, lastMouth);
            // produits vendus dans la fenetre (simples, boites, parents des details vendus), lus en une fois sans
            // pagination : les autres actifs passent a zero ; une lecture en echec n'en remet aucun a zero
            Set<String> vendusLus = lireProduitsVendus(moisContinus(firstMouth, last));
            Set<String> vendus = new java.util.HashSet<>();
            if (vendusLus != null) {
                vendus.addAll(vendusLus);
            }
            boolean lectureComplete = total >= 0 && ventesLisibles(vendusLus);
            if (total < 0) {
                total = 0; // comme avant : une page lue quand meme
            }

            Map<String, Tuple> mapBoite = new HashMap<>();
            Map<String, Tuple> items = new HashMap<>();

            for (int i = start; i <= total; i += limit) {
                List<Tuple> list = loadSemoisArticle(firstMouth, lastMouth, i, limit);
                if (list == null) {
                    lectureComplete = false;
                    continue;
                }
                for (Tuple tuple : list) {
                    // detail deconditionne : sa vente compte pour sa boite (comme dans traiterReapproDetail)
                    boolean detail = "1".equals(String.valueOf(tuple.get("detail")));
                    vendus.add(tuple.get(detail ? "parentId" : "produitId", String.class));
                }
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
                        normalLog.put(semoisNormalEntry(produitId, "simple", q1, q2, q3, conso,
                                computesValues.getLeft(), computesValues.getRight()));

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

            traiterReapproBoite(q1, q2, q3, mapBoite, items, normalLog);
            if (!lectureComplete || !ventesLisibles(vendus)) {
                LOG.log(Level.WARNING,
                        "semois standard : ventes illisibles ou absentes sur les mois retenus, aucun produit remis a zero");
            }
            remettreAZeroNonVendus(aRemettreAZero(loadProduitsActifs(), vendus, lectureComplete), q1, q2, q3,
                    normalLog);
            ReapproLogWriter.write(em, "semois_normal", normalLog);

        }
    }

    /**
     * SEMOIS standard : produits actifs sans vente dans la fenetre a seuil 0 et quantite 0 (bool_CALCUL_SEUIL
     * respecte).
     */
    private void remettreAZeroNonVendus(List<String> produitIds, int q1, int q2, int q3, org.json.JSONArray log) {
        int chunk = 1000;
        for (int i = 0; i < produitIds.size(); i += chunk) {
            List<String> sub = produitIds.subList(i, Math.min(produitIds.size(), i + chunk));
            try {
                userTransaction.begin();
                for (String produitId : sub) {
                    updateProduitSeuilAndQtyReappro(produitId, 0, 0);
                    log.put(semoisNormalEntry(produitId, "non vendu", q1, q2, q3, 0, 0, 0));
                }
                userTransaction.commit();
            } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                    | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
                annulerTransaction();
            }
        }
    }

    /** Construit une entree de journal pour le calcul SEMOIS standard. */
    private static org.json.JSONObject semoisNormalEntry(String produitId, String type, int q1, int q2, int q3,
            int conso, int seuil, int qte) {
        double diviseur = q3 * 4d;
        double consoHebdo = diviseur > 0 ? (conso / diviseur) : 0d;
        return new org.json.JSONObject().put("produitId", produitId).put("type", type).put("q1", q1).put("q2", q2)
                .put("q3Mois", q3).put("conso", conso).put("consoHebdo", consoHebdo).put("seuil", seuil)
                .put("quantiteReappro", qte);
    }

    /*
     * On traite les boites , on ajoute la quantite du detail a la boite
     */
    private void traiterReapproBoite(int q1, int q2, int q3, Map<String, Tuple> mapBoite, Map<String, Tuple> items,
            org.json.JSONArray log) {

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
                log.put(semoisNormalEntry(produitId, "boite", q1, q2, q3, totalQuantiteVendue, computesValues.getLeft(),
                        computesValues.getRight()));
            });
            traiterReapproDetail(q1, q2, q3, items, log);
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
    private void traiterReapproDetail(int q1, int q2, int q3, Map<String, Tuple> items, org.json.JSONArray log) {
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
            log.put(semoisNormalEntry(produitId, "detail", q1, q2, q3, finalQty, computesValues.getLeft(),
                    computesValues.getRight()));
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
            // bool_CALCUL_SEUIL = false -> on saute le produit (aucune ligne mise a jour, valeurs intactes)
            // valeurs deja justes -> aucune ecriture : le declencheur de t_famille pose dt_UPDATED et ajoute une ligne
            // d'historique a chaque UPDATE, il ne doit le faire que pour un vrai changement
            q.where(cb.and(cb.equal(root.get(TFamille_.lgFAMILLEID), produitId),
                    cb.or(cb.isNull(root.<Boolean> get("boolCALCULSEUIL")),
                            cb.isTrue(root.<Boolean> get("boolCALCULSEUIL"))),
                    cb.or(cb.isNull(root.get(TFamille_.intSEUILMIN)),
                            cb.notEqual(root.get(TFamille_.intSEUILMIN), seuiCalule),
                            cb.isNull(root.get(TFamille_.intSTOCKREAPROVISONEMENT)),
                            cb.notEqual(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuiCalule),
                            cb.isNull(root.get(TFamille_.intQTEREAPPROVISIONNEMENT)),
                            cb.notEqual(root.get(TFamille_.intQTEREAPPROVISIONNEMENT), qteCalule))));
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

    // =====================================================================
    // SEMOIS ABC : calcul du seuil / quantite avec les parametres de la classe
    // du produit (Q1, Q2, Q3 et unite SEMAINE/JOUR). Fallback SEMOIS standard
    // pour les produits sans classe / classe invalide.
    // =====================================================================

    private static String ymKey(LocalDate firstOfMonth) {
        return String.format("%04d-%02d", firstOfMonth.getYear(), firstOfMonth.getMonthValue());
    }

    /** Conso mensuelle consolidee (equivalent boite), PHARMACIE ENTIERE (pas d'emplacement). */
    private Map<String, Map<String, Double>> loadMonthlyConsoAbc(LocalDate dtStart, LocalDate dtEnd) {
        Map<String, Map<String, Double>> map = new HashMap<>();
        try {
            String sql = "SELECT t.eff_id, t.ym, SUM(t.qty_equiv) FROM ("
                    + "SELECT CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' "
                    + "THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id, "
                    + "DATE_FORMAT(p.dt_UPDATED,'%Y-%m') AS ym, "
                    + "CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' "
                    + "THEN d.int_QUANTITY/COALESCE(NULLIF(parent.int_NUMBERDETAIL,0),1) ELSE d.int_QUANTITY END AS qty_equiv "
                    + "FROM t_preenregistrement p "
                    + "JOIN t_preenregistrement_detail d ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID "
                    + "JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID "
                    + "LEFT JOIN t_famille parent ON parent.lg_FAMILLE_ID=f.lg_FAMILLE_PARENT_ID "
                    + "WHERE p.str_STATUT='is_Closed' AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5' AND f.str_STATUT='enable' "
                    + "AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2" + ") t GROUP BY t.eff_id, t.ym";
            Query q = em.createNativeQuery(sql);
            q.setParameter(1, dtStart);
            q.setParameter(2, dtEnd);
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                String id = (r[0] == null) ? null : r[0].toString();
                String ym = (r[1] == null) ? null : r[1].toString();
                double v = (r[2] instanceof Number) ? ((Number) r[2]).doubleValue() : 0d;
                if (id == null || ym == null) {
                    continue;
                }
                map.computeIfAbsent(id, k -> new HashMap<>()).put(ym, v);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null; // lecture en echec : aucun produit traite (et donc aucun remis a zero)
        }
        return map;
    }

    /** produitId (parent) -> classId, pour les produits ayant une classe ABC. */
    private Map<String, String> loadProduitClasseAbc() {
        Map<String, String> map = new HashMap<>();
        try {
            Query q = em.createNativeQuery(
                    "SELECT lg_FAMILLE_ID, lg_CLASSE_ABC_ID FROM t_famille WHERE lg_CLASSE_ABC_ID IS NOT NULL AND lg_CLASSE_ABC_ID<>'' AND str_STATUT='enable'");
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                if (r[0] != null && r[1] != null) {
                    map.put(r[0].toString(), r[1].toString());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return map;
    }

    /** produitId -> [q1, q2] depuis la fiche article (mode SEMOIS_PAR_PRODUIT). */
    private Map<String, int[]> loadProduitReapproPP() {
        Map<String, int[]> map = new HashMap<>();
        try {
            Query q = em.createNativeQuery(
                    "SELECT lg_FAMILLE_ID, int_Q1_SEUIL_REAPPRO, int_Q2_QTE_REAPPRO FROM t_famille WHERE str_STATUT='enable'");
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                if (r[0] == null) {
                    continue;
                }
                int q1 = (r[1] instanceof Number) ? ((Number) r[1]).intValue() : 0;
                int q2 = (r[2] instanceof Number) ? ((Number) r[2]).intValue() : 0;
                map.put(r[0].toString(), new int[] { q1, q2 });
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return map;
    }

    private int globalParam(String key, int def) {
        TParameters p = findParameters(key);
        if (p != null) {
            try {
                return Integer.parseInt(p.getStrVALUE().trim());
            } catch (NumberFormatException e) {
                return def;
            }
        }
        return def;
    }

    private void computeReapproAbc() {
        try {
            // 1) Classes ABC actives
            Map<String, TClasseAbc> classes = new HashMap<>();
            int maxQ3 = 0;
            for (TClasseAbc c : em
                    .createQuery("SELECT c FROM TClasseAbc c WHERE c.strSTATUT='enable'", TClasseAbc.class)
                    .getResultList()) {
                classes.put(c.getLgCLASSEABCID(), c);
                maxQ3 = Math.max(maxQ3, c.getIntQ3());
            }
            // Parametres globaux (fallback standard)
            int gq1 = globalParam(Constant.Q1, 4);
            int gq2 = globalParam(Constant.Q2, 2);
            int gq3 = globalParam(Constant.Q3, 3);
            maxQ3 = Math.max(maxQ3, gq3);
            if (maxQ3 <= 0) {
                maxQ3 = 3;
            }

            // 2) Fenetre de mois pleins (ordonnee du plus ancien au plus recent)
            List<LocalDate> moisLus = nombreMoisPleinsConsommation(maxQ3);
            if (moisLus == null) {
                LOG.log(Level.WARNING, "semois : calendrier illisible, aucun seuil modifie");
                return;
            }
            List<LocalDate> moisAsc = moisLus.stream().sorted().collect(Collectors.toList());
            if (moisAsc.isEmpty()) {
                return;
            }
            LocalDate firstMonth = moisAsc.get(0);
            LocalDate last = moisAsc.get(moisAsc.size() - 1);
            LocalDate lastMonthEnd = LocalDate.of(last.getYear(), last.getMonth(), last.lengthOfMonth());

            // 3) Conso mensuelle consolidee + classe de chaque produit
            Map<String, Map<String, Double>> conso = loadMonthlyConsoAbc(firstMonth, lastMonthEnd);
            Map<String, String> produitClasse = loadProduitClasseAbc();

            // Journal de calcul (toujours actif) -> ~/Documents/reappro_logs/semois_abc_<date>.json
            final org.json.JSONArray logArr = new org.json.JSONArray();
            final boolean moisReels = isDiviseurMoisReels();

            // 4) Calcul + mise a jour par lots : produits vendus, puis produits actifs sans vente (seuil et qte a 0)
            Set<String> vendus = lireProduitsVendus(moisAsc); // seulement les mois retenus
            List<String> produitIds = produitsATraiter(conso == null ? null : conso.keySet(), loadProduitsActifs(),
                    vendus);
            if (conso == null || (vendus != null && vendus.isEmpty())) {
                LOG.log(Level.WARNING,
                        "semois : ventes illisibles ou absentes sur les mois retenus, aucun seuil modifie");
            } else if (vendus == null) {
                LOG.log(Level.WARNING,
                        "semois : liste des produits vendus illisible, produits vendus recalcules, aucun produit remis a zero");
            }
            int chunk = 1000;
            for (int i = 0; i < produitIds.size(); i += chunk) {
                List<String> sub = produitIds.subList(i, Math.min(produitIds.size(), i + chunk));
                try {
                    userTransaction.begin();
                    for (String produitId : sub) {
                        Map<String, Double> perMonth = conso.get(produitId);
                        // sans classe (vendu ou non) : SEMOIS standard (Q1, Q2, Q3 globaux)
                        TClasseAbc cls = classes.get(produitClasse.get(produitId));

                        int q1, q2, q3w;
                        boolean jour;
                        if (cls != null) {
                            q1 = cls.getIntQ1();
                            q2 = cls.getIntQ2();
                            q3w = cls.getIntQ3() > 0 ? cls.getIntQ3() : gq3;
                            jour = "JOUR".equalsIgnoreCase(cls.getStrUNITECALCUL());
                        } else {
                            // Fallback SEMOIS standard (semaine)
                            q1 = gq1;
                            q2 = gq2;
                            q3w = gq3 > 0 ? gq3 : 3;
                            jour = false;
                        }

                        // Fenetre propre a la classe : les q3w derniers mois retenus
                        Calcul c = calculProduit(perMonth, moisAsc, q1, q2, q3w, jour, moisReels);
                        updateProduitSeuilAndQtyReappro(produitId, c.seuil, c.qte);

                        org.json.JSONObject o = new org.json.JSONObject();
                        o.put("produitId", produitId);
                        o.put("classe", cls != null ? cls.getStrCODE() : "(sans classe)");
                        o.put("unite", jour ? "JOUR" : "SEMAINE");
                        o.put("q1", q1);
                        o.put("q2", q2);
                        o.put("q3Mois", q3w);
                        o.put("moisRetenus", c.mois);
                        o.put("vendu", perMonth != null);
                        o.put("consoTotale", c.consoTotale);
                        o.put(jour ? "nombreJours" : "nombreSemaines",
                                jour ? c.jours : ((moisReels ? c.mois : q3w) * 4));
                        o.put("diviseurMoisReels", moisReels);
                        o.put("conso", c.conso);
                        o.put("seuilMini", c.seuil);
                        o.put("quantiteReappro", c.qte);
                        logArr.put(o);
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

            ReapproLogWriter.write(em, "semois_abc", logArr);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    // SEMOIS PAR PRODUIT : seuil/qte calcules avec Q1/Q2 de la fiche article (fallback
    // parametres globaux Q1/Q2 si non renseignes) et la fenetre du parametre Q3 (semaines).
    private void computeReapproParProduit() {
        try {
            int gq1 = globalParam(Constant.Q1, 4);
            int gq2 = globalParam(Constant.Q2, 2);
            int gq3 = globalParam(Constant.Q3, 3);
            if (gq3 <= 0) {
                gq3 = 3;
            }

            List<LocalDate> moisLus = nombreMoisPleinsConsommation(gq3);
            if (moisLus == null) {
                LOG.log(Level.WARNING, "semois : calendrier illisible, aucun seuil modifie");
                return;
            }
            List<LocalDate> moisAsc = moisLus.stream().sorted().collect(Collectors.toList());
            if (moisAsc.isEmpty()) {
                return;
            }
            LocalDate firstMonth = moisAsc.get(0);
            LocalDate last = moisAsc.get(moisAsc.size() - 1);
            LocalDate lastMonthEnd = LocalDate.of(last.getYear(), last.getMonth(), last.lengthOfMonth());

            Map<String, Map<String, Double>> conso = loadMonthlyConsoAbc(firstMonth, lastMonthEnd);
            Map<String, int[]> ppConfig = loadProduitReapproPP();

            // Journal de calcul -> ~/Documents/reappro_logs/semois_par_produit_<date>.json
            final org.json.JSONArray logArr = new org.json.JSONArray();
            final boolean moisReels = isDiviseurMoisReels();

            // produits vendus, puis produits actifs sans vente (seuil et qte a 0)
            Set<String> vendus = lireProduitsVendus(moisAsc); // seulement les mois retenus
            List<String> produitIds = produitsATraiter(conso == null ? null : conso.keySet(), loadProduitsActifs(),
                    vendus);
            if (conso == null || (vendus != null && vendus.isEmpty())) {
                LOG.log(Level.WARNING,
                        "semois : ventes illisibles ou absentes sur les mois retenus, aucun seuil modifie");
            } else if (vendus == null) {
                LOG.log(Level.WARNING,
                        "semois : liste des produits vendus illisible, produits vendus recalcules, aucun produit remis a zero");
            }
            int chunk = 1000;
            for (int i = 0; i < produitIds.size(); i += chunk) {
                List<String> sub = produitIds.subList(i, Math.min(produitIds.size(), i + chunk));
                try {
                    userTransaction.begin();
                    for (String produitId : sub) {
                        Map<String, Double> perMonth = conso.get(produitId);
                        int[] cfg = ppConfig.get(produitId);
                        int q1 = (cfg != null && cfg[0] > 0) ? cfg[0] : gq1;
                        int q2 = (cfg != null && cfg[1] > 0) ? cfg[1] : gq2;

                        Calcul c = calculProduit(perMonth, moisAsc, q1, q2, gq3, false, moisReels);
                        updateProduitSeuilAndQtyReappro(produitId, c.seuil, c.qte);

                        org.json.JSONObject o = new org.json.JSONObject();
                        o.put("produitId", produitId);
                        o.put("q1", q1);
                        o.put("q2", q2);
                        o.put("q3Mois", gq3);
                        o.put("moisRetenus", c.mois);
                        o.put("vendu", perMonth != null);
                        o.put("consoTotale", c.consoTotale);
                        o.put("nombreSemaines", (moisReels ? c.mois : gq3) * 4);
                        o.put("diviseurMoisReels", moisReels);
                        o.put("conso", c.conso);
                        o.put("seuilMini", c.seuil);
                        o.put("quantiteReappro", c.qte);
                        logArr.put(o);
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
            ReapproLogWriter.write(em, "semois_par_produit", logArr);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }
}
