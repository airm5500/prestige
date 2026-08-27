package rest.service.impl;

import dal.StockDailyValue;
import dal.StockSnapshot;
import dal.StockSnapshotValue;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TParameters;
import dal.TStockSnapshot;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.logging.*;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import rest.service.SupportEventService;
import rest.service.impl.StockSnapshotDayService.Ligne;
import util.Constant;

/**
 * Releve quotidien du stock, source des valorisations historiques.
 *
 * <p>
 * Le releve est ecrit dans stock_snapshot_day (table relationnelle indexee par journee) et, le temps de la periode de
 * securite, egalement dans stock_snapshot.stock_journalier (document JSON par produit), qui reste la source de lecture
 * des ecrans. Les deux ecritures d'un meme lot partagent la meme transaction courte.
 * </p>
 *
 * <p>
 * Deux traitements historiques ont ete retires.
 * </p>
 *
 * <p>
 * La procedure stockee {@code proc_update_stock_snaps()} parcourait un curseur de tous les produits en inserant ligne a
 * ligne dans t_stock_snapshot, le tout dans une seule transaction, sur une table liee a t_famille par cle etrangere :
 * verrous longs sur les lignes produit et blocage des caisses lorsqu'elle tournait pendant les ventes. Son resultat
 * etait de toute facon redondant avec {@link #updateStock(LocalDate)}, qui releve la meme journee par lots courts.
 * </p>
 *
 * <p>
 * Le vidage de t_stock_snapshot vers l'archive JSON a lui aussi ete retire, et pour une raison plus grave : il datait
 * chaque ligne d'apres la table de transit mais lui appliquait la reserve <em>du jour de son execution</em>, la reserve
 * n'etant nulle part historisee. Il inscrivait donc dans l'historique une reserve qui n'a jamais existe a la date
 * consideree, puis supprimait la ligne d'origine. Or t_stock_snapshot s'est revelee etre, chez les officines installees
 * de longue date, la seule archive fiable : prix, PMP et taux de TVA y sont figes a la date reelle, et aucune colonne
 * de reserve ne peut la corrompre. Elle est desormais la source de la reprise d'historique, et n'est plus consommee par
 * personne.
 * </p>
 *
 * @author koben
 */
@Stateless
public class DailyStockService {

    private static final Logger LOG = Logger.getLogger(DailyStockService.class.getName());

    private static final int BATCH_SIZE = 50;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private DailyStockService self;

    @EJB
    private StockSnapshotDayService stockSnapshotDayService;

    @EJB
    private SupportEventService supportEventService;

    /**
     * Releve du stock d'une journee.
     *
     * @param dateStock
     *            journee relevee
     * @param ignorerSiDejaReleve
     *            {@code true} au demarrage du serveur : si la journee a deja ete relevee, on ne la releve pas une
     *            seconde fois. Le releve est pris a 00:05 et vaut donc stock a la cloture de la veille ; le rejouer a
     *            15 h le remplacerait par un stock de milieu de journee. Le declenchement planifie de 00:05 passe
     *            {@code false} : il doit toujours ecrire.
     */
    @Asynchronous
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void processAsync(LocalDate dateStock, boolean ignorerSiDejaReleve) {
        try {

            if (!isEnabled()) {
                LOG.info("Daily stock disabled.");
                return;
            }

            int dateAsInt = Integer.parseInt(dateStock.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
            if (ignorerSiDejaReleve) {
                long deja = stockSnapshotDayService.compterJournee(dateAsInt);
                if (deja > 0) {
                    LOG.log(Level.INFO, "Journee {0} deja relevee ({1} lignes) : releve ignore au demarrage.",
                            new Object[] { dateAsInt, deja });
                    return;
                }
            }

            LocalDateTime start = LocalDateTime.now();
            LOG.log(Level.INFO, "Daily stock started at {0}", start);

            // Appels via self pour que les @TransactionAttribute soient appliqués par le proxy EJB
            self.updateStock(dateStock);

            LocalDateTime end = LocalDateTime.now();
            LOG.log(Level.INFO, "Daily stock finished at {0} duration(s): {1}",
                    new Object[] { end, Duration.between(start, end).toSeconds() });

            // Declaration explicite du passage : le controle de fraicheur du Centre de Support lisait auparavant
            // t_stock_snapshot, que le vidage vidait, et concluait chaque heure que le job
            // n'avait jamais tourne.
            supportEventService.recordJobRun("SNAPSHOT_STOCK");

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Daily stock error", e);
        }
    }

    private boolean isEnabled() {
        TParameters p = em.find(TParameters.class, "KEY_VALORISATION_JOURNALIERE");
        return p != null && "1".equals(p.getStrVALUE());
    }

    /**
     * Indique si l'archive JSON doit encore etre alimentee (parametre KEY_VALORISATION_ECRITURE_JSON, actif par
     * defaut).
     *
     * <p>
     * Une fois la lecture basculee sur le releve relationnel et la periode de securite ecoulee, mettre ce parametre a 0
     * arrete l'ecriture du document JSON. C'est elle qui coute le plus cher dans le traitement de nuit : chaque produit
     * voit son historique complet relu puis reecrit pour y ajouter une seule journee. Le parametre se remet a 1 sans
     * redeploiement si un retour arriere s'impose.
     * </p>
     */
    private boolean ecrireArchiveJson() {
        TParameters p = em.find(TParameters.class, "KEY_VALORISATION_ECRITURE_JSON");
        return p == null || !"0".equals(Objects.toString(p.getStrVALUE(), "1").trim());
    }

    /**
     * Orchestrateur sans transaction : délègue chaque batch à processStockBatch() via le proxy EJB pour que chaque
     * batch ouvre et committe sa propre transaction.
     *
     * @param dateStock
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void updateStock(LocalDate dateStock) {

        int dateAsInt = Integer.parseInt(dateStock.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        int offset = 0;
        int processed;

        do {
            processed = self.processStockBatch(dateAsInt, offset);
            offset += processed;
            LOG.log(Level.INFO, "Batch flush at offset {0}", offset);
        } while (processed == BATCH_SIZE);

        LOG.log(Level.INFO, "Fin execution du batch {0}", LocalDateTime.now());
    }

    /**
     * Charge et traite un batch dans une transaction courte dédiée. Le fetch et le traitement sont dans la même
     * transaction pour permettre le chargement des relations LAZY (lgFAMILLEID, etc.).
     *
     * @param dateAsInt
     * @param offset
     *
     * @return nombre d'éléments traités
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public int processStockBatch(int dateAsInt, int offset) {

        List<TFamilleStock> batch = em
                .createNamedQuery("TFamilleStock.findFamilleStockByEmplacement", TFamilleStock.class)
                .setParameter("lgEMPLACEMENTID", Constant.OFFICINE).setFirstResult(offset).setMaxResults(BATCH_SIZE)
                .getResultList();

        List<String> familleIds = new ArrayList<>();
        for (TFamilleStock next : batch) {
            familleIds.add(next.getLgFAMILLEID().getLgFAMILLEID());
        }
        Map<String, Integer> reserveMap = loadReserveMap(familleIds);
        Map<String, Integer> tvaMap = loadTvaMap(familleIds);
        List<Ligne> lignes = new ArrayList<>(batch.size());
        boolean archiveJson = ecrireArchiveJson();

        for (TFamilleStock next : batch) {

            TFamille famille = next.getLgFAMILLEID();

            int qty = Objects.requireNonNullElse(next.getIntNUMBERAVAILABLE(), 0);
            int prixPaf = Objects.requireNonNullElse(famille.getIntPAF(), 0);
            int prixUni = Objects.requireNonNullElse(famille.getIntPRICE(), 0);
            int qtyReserve = reserveMap.getOrDefault(famille.getLgFAMILLEID(), 0);
            int pmp = prixMpd(qty, prixPaf);

            if (archiveJson) {
                StockSnapshot snapshot = em.find(StockSnapshot.class, famille.getLgFAMILLEID());
                if (snapshot == null) {
                    snapshot = new StockSnapshot().id(famille.getLgFAMILLEID());
                }
                snapshot.setProduit(famille);
                // On remplace l'entree du jour si elle existe deja (re-run/redemarrage) afin que qtyReserve soit pris
                // en compte (le Set dedoublonne par stockOfDay : un simple add() conserverait l'ancienne entree sans
                // reserve).
                snapshot.getStocks().removeIf(v -> v.getStockOfDay() == dateAsInt);
                snapshot.getStocks()
                        .add(new StockSnapshotValue().prixMoyentpondere(pmp).prixPaf(famille.getIntPAF())
                                .prixUni(famille.getIntPRICE()).qty(next.getIntNUMBERAVAILABLE()).qtyReserve(qtyReserve)
                                .stockOfDay(dateAsInt));
                em.merge(snapshot);
            }

            // Double ecriture : le releve relationnel, qui deviendra la source des valorisations historiques. Le taux
            // de TVA est fige avec les prix, pour que la valorisation par TVA d'une date passee ne bouge pas si le
            // taux de la fiche produit change ensuite.
            lignes.add(new Ligne(dateAsInt, Constant.OFFICINE, famille.getLgFAMILLEID(), qty, qtyReserve, prixPaf,
                    prixUni, pmp, tvaMap.getOrDefault(famille.getLgFAMILLEID(), 0)));
        }

        ecrireReleveRelationnel(lignes);

        em.flush();
        em.clear();
        return batch.size();
    }

    /**
     * Ecrit le lot dans le releve relationnel sans jamais compromettre le releve JSON.
     *
     * <p>
     * L'appel passe par une transaction distincte ({@code REQUIRES_NEW}) : tant que les ecrans lisent l'archive JSON,
     * un incident sur la table neuve ne doit pas annuler le lot JSON en cours, qui reste la source de lecture. Une
     * transaction imbriquee qui echoue est annulee seule, et le lot appelant se poursuit.
     * </p>
     */
    private void ecrireReleveRelationnel(List<Ligne> lignes) {
        try {
            stockSnapshotDayService.upsertIsole(lignes);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Releve journalier relationnel ignore pour ce lot", e);
        }
    }

    /**
     * Charge en masse la quantite de stock reserve (t_type_stock_famille, type=2) pour une liste de familles, sur
     * l'emplacement officine. Reutilise la meme source que la gestion de reserve. Retourne une map familleId -> qte.
     */
    private Map<String, Integer> loadReserveMap(List<String> familleIds) {
        Map<String, Integer> map = new HashMap<>();
        if (familleIds == null || familleIds.isEmpty()) {
            return map;
        }
        try {
            List<Object[]> rows = em
                    .createNativeQuery("SELECT t.lg_FAMILLE_ID, t.int_NUMBER FROM t_type_stock_famille t "
                            + "WHERE t.lg_TYPE_STOCK_ID='2' AND t.str_STATUT='enable' "
                            + "AND t.lg_EMPLACEMENT_ID=:empl AND t.lg_FAMILLE_ID IN (:ids)")
                    .setParameter("empl", Constant.OFFICINE).setParameter("ids", familleIds).getResultList();
            for (Object[] r : rows) {
                if (r[0] != null && r[1] != null) {
                    map.put(r[0].toString(), ((Number) r[1]).intValue());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "loadReserveMap error", e);
        }
        return map;
    }

    /**
     * Charge en masse le taux de TVA des familles d'un lot. Meme principe que {@link #loadReserveMap(List)} : une
     * requete par lot plutot qu'un acces LAZY par produit, qui ferait 22 000 requetes sur la nuit.
     */
    private Map<String, Integer> loadTvaMap(List<String> familleIds) {
        Map<String, Integer> map = new HashMap<>();
        if (familleIds == null || familleIds.isEmpty()) {
            return map;
        }
        try {
            List<Object[]> rows = em
                    .createNativeQuery("SELECT f.lg_FAMILLE_ID, c.int_VALUE FROM t_famille f, t_code_tva c "
                            + "WHERE c.lg_CODE_TVA_ID=f.lg_CODE_TVA_ID AND f.lg_FAMILLE_ID IN (:ids)")
                    .setParameter("ids", familleIds).getResultList();
            for (Object[] r : rows) {
                if (r[0] != null && r[1] != null) {
                    map.put(r[0].toString(), ((Number) r[1]).intValue());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "loadTvaMap error", e);
        }
        return map;
    }

    private int nz(Integer valeur) {
        return valeur == null ? 0 : valeur;
    }

    private int prixMpd(int stoc, int prixAchat) {
        try {
            if (stoc <= 0) {
                return 0;
            }
            return prixAchat;
        } catch (Exception e) {
            return 0;
        }
    }

    @Asynchronous
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void updateStockDailyValueAsync() {
        LOG.info("Stock daily value update started");
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.BASIC_ISO_DATE;
        LocalDate today = LocalDate.now();
        List<Integer> ids = List.of(Integer.valueOf(today.format(dateTimeFormatter)),
                Integer.valueOf(today.minusDays(1).format(dateTimeFormatter)),
                Integer.valueOf(today.minusDays(2).format(dateTimeFormatter)),
                Integer.valueOf(today.minusDays(3).format(dateTimeFormatter)));

        for (Integer id : ids) {
            if (!isAlreadyUpdated(id)) {
                self.persistStockDailyValue(id);
            }
        }
        LOG.info("Stock daily value update finished");
    }

    private boolean isAlreadyUpdated(int day) {
        StockDailyValue sdv = em.find(StockDailyValue.class, day);
        return sdv != null;
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void persistStockDailyValue(int id) {
        List<Tuple> result = em.createNativeQuery("SELECT SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE) AS VALEUR_VENTE, "
                + "SUM(s.int_NUMBER_AVAILABLE * f.int_PAF) AS VALEUR_ACHAT " + "FROM t_famille f, t_famille_stock s "
                + "WHERE s.lg_FAMILLE_ID=f.lg_FAMILLE_ID " + "AND s.lg_EMPLACEMENT_ID='1' "
                + "AND s.int_NUMBER_AVAILABLE>0 " + "AND f.str_STATUT='enable'", Tuple.class).getResultList();

        if (!result.isEmpty()) {
            Tuple t = result.get(0);
            StockDailyValue sdv = new StockDailyValue();
            sdv.setId(id);
            sdv.setValeurVente(t.get(0, BigDecimal.class).longValue());
            sdv.setValeurAchat(t.get(1, BigDecimal.class).longValue());
            em.persist(sdv);
        }
    }
}
