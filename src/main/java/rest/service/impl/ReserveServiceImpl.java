package rest.service.impl;

import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TMouvementReserve;
import dal.TSuggestionReserve;
import dal.TTypeStockFamille;
import dal.TUser;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.Comparator;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.LockModeType;
import javax.persistence.LockTimeoutException;
import javax.persistence.OptimisticLockException;
import javax.persistence.PersistenceContext;
import javax.persistence.PessimisticLockException;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ReserveService;

/**
 * Implementation du service de reserve. Chaque mutation rayon/reserve s'execute dans sa PROPRE transaction JTA
 * (REQUIRES_NEW) : validation prealable, verrou pessimiste sur la ligne de stock reserve, et trace systematique dans
 * t_mouvement_reserve.
 */
@Stateless
public class ReserveServiceImpl implements ReserveService {

    private static final Logger LOG = Logger.getLogger(ReserveServiceImpl.class.getName());

    private static final String TYPE_STOCK_RAYON = "1";
    private static final String TYPE_STOCK_RESERVE = "2";
    private static final int DEFAULT_DELAI_REAPPRO = 3;
    private static final int DEFAULT_COEF_SECURITY = 1;

    // Codes d'echec exploitables par l'interface (compte rendu detaille des traitements).
    private static final String CODE_ARTICLE_INTROUVABLE = "ARTICLE_INTROUVABLE";
    private static final String CODE_QUANTITE_INVALIDE = "QUANTITE_INVALIDE";
    private static final String CODE_CONFIG_INCOMPLETE = "CONFIG_STOCK_INCOMPLETE";
    private static final String CODE_STOCK_RAYON_INSUFFISANT = "STOCK_RAYON_INSUFFISANT";
    private static final String CODE_STOCK_RESERVE_INSUFFISANT = "STOCK_RESERVE_INSUFFISANT";
    private static final String CODE_CONFLIT_CONCURRENCE = "CONFLIT_CONCURRENCE";
    private static final String CODE_ERREUR_TECHNIQUE = "ERREUR_TECHNIQUE";
    private static final String CODE_PRIVILEGE_MANQUANT = "PRIVILEGE_MANQUANT";
    private static final String CODE_MOUVEMENT_INTROUVABLE = "MOUVEMENT_INTROUVABLE";
    private static final String CODE_DEJA_ANNULE = "DEJA_ANNULE";

    // Delai d'attente maximal du verrou sur la ligne de stock reserve. Si le moteur ne sait pas honorer ce hint
    // (cas de MySQL/InnoDB), c'est le innodb_lock_wait_timeout du serveur qui s'applique.
    private static final String LOCK_TIMEOUT_HINT = "javax.persistence.lock.timeout";
    private static final int LOCK_TIMEOUT_MS = 5000;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Resource
    private SessionContext sessionContext;

    @javax.ejb.EJB
    private rest.service.InventaireService inventaireService;

    @javax.ejb.EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;

    // ----------------------------------------------------------------- LISTING

    @Override
    public JSONObject listArticles(TUser user, String search, String type, int start, int limit) {
        LOG.log(Level.INFO, "listArticles type={0} search={1} start={2} limit={3} user={4}",
                new Object[] { type, search, start, limit, user.getLgUSERID() });
        // Compatibilite : "REASSORT" historique = articles a reassortir (suggestions reassort rayon)
        if ("REASSORT".equalsIgnoreCase(type)) {
            return suggestions(user, search, start, limit);
        }
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String like = (search == null || search.trim().isEmpty()) ? "%" : "%" + search.trim() + "%";

        // Clause de filtre supplementaire selon l'onglet
        String extra = "";
        boolean reapproSuggestion = false;
        if ("REAPPRO".equalsIgnoreCase(type)) {
            // rayon -> reserve : stock_rayon > int_SEUIL_RESERVE (non null et > 0)
            extra = " AND f.int_SEUIL_RESERVE IS NOT NULL AND f.int_SEUIL_RESERVE > 0 "
                    + " AND fs.int_NUMBER_AVAILABLE > f.int_SEUIL_RESERVE ";
            reapproSuggestion = true;
        } else if ("REASSORT_RAYON".equalsIgnoreCase(type)) {
            // reserve -> rayon : stock_rayon <= seuil_mini_rayon ET stock_reserve > 0
            extra = " AND f.int_SEUIL_MINI_RAYON IS NOT NULL "
                    + " AND fs.int_NUMBER_AVAILABLE <= f.int_SEUIL_MINI_RAYON " + " AND tsf.int_NUMBER > 0 ";
        }

        try {
            String base = "FROM t_type_stock_famille tsf " + "JOIN t_famille f ON f.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID "
                    + "JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID "
                    + "  AND fs.lg_EMPLACEMENT_ID = tsf.lg_EMPLACEMENT_ID AND fs.str_STATUT = 'enable' "
                    + "WHERE tsf.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE + "' "
                    + "AND tsf.lg_EMPLACEMENT_ID = ?1 AND tsf.str_STATUT = 'enable' " + "AND f.bool_RESERVE = 1 "
                    + "AND (f.str_NAME LIKE ?2 OR f.str_DESCRIPTION LIKE ?2 OR f.int_CIP LIKE ?2) " + extra;

            Query countQ = em.createNativeQuery("SELECT COUNT(DISTINCT tsf.lg_FAMILLE_ID) " + base);
            countQ.setParameter(1, empl);
            countQ.setParameter(2, like);
            long total = ((Number) countQ.getSingleResult()).longValue();

            Query q = em
                    .createNativeQuery("SELECT DISTINCT tsf.lg_FAMILLE_ID " + base + " ORDER BY f.str_DESCRIPTION ASC");
            q.setParameter(1, empl);
            q.setParameter(2, like);
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            @SuppressWarnings("unchecked")
            List<String> ids = q.getResultList();

            LOG.log(Level.INFO, "listArticles empl={0} type={1} total={2}", new Object[] { empl, type, total });

            // Les produits et leurs stocks sont ramenes en DEUX requetes pour toute la page. Auparavant
            // chaque ligne coutait un chargement de produit plus deux lectures de stock, soit une
            // soixantaine d'aller-retours pour vingt lignes : c'etait la cause de la lenteur.
            java.util.Map<String, TFamille> produits = chargerFamilles(ids);
            java.util.Map<String, int[]> stocks = chargerStocks(ids, empl);

            JSONArray results = new JSONArray();
            for (String familleId : ids) {
                TFamille f = produits.get(familleId);
                if (f == null) {
                    LOG.log(Level.WARNING, "listArticles: TFamille introuvable pour id={0}", familleId);
                    continue;
                }
                int[] st = stocks.get(familleId);
                JSONObject json = buildArticleJson(f, st == null ? 0 : st[0], st == null ? 0 : st[1], true);
                if (reapproSuggestion) {
                    // REAPPRO rayon->reserve : suggestion = stock_rayon - int_SEUIL_RESERVE
                    int sr = json.optInt("int_STOCK_RAYON", 0);
                    int seuil = json.optInt("int_SEUIL_RESERVE", 0);
                    json.put("int_QTE_SUGGEREE", Math.max(0, sr - seuil));
                } else if ("REASSORT_RAYON".equalsIgnoreCase(type)) {
                    // REASSORT reserve->rayon : suggestion = int_SEUIL_RESERVE - stock_rayon,
                    // plafonnée au stock réserve disponible (cohérent avec suggestions()).
                    int sr = json.optInt("int_STOCK_RAYON", 0);
                    int seuil = json.optInt("int_SEUIL_RESERVE", 0);
                    int stockReserve = json.optInt("int_STOCK_RESERVE", 0);
                    json.put("int_QTE_SUGGEREE", Math.min(stockReserve, Math.max(0, seuil - sr)));
                }
                results.put(json);
            }
            LOG.log(Level.INFO, "listArticles retourne {0} articles", results.length());
            return new JSONObject().put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listArticles ECHEC type=" + type + " user=" + user.getLgUSERID(), e);
            return new JSONObject().put("total", 0).put("results", new JSONArray());
        }
    }

    /** Charge en UNE requete les produits d'une page, plutot qu'un par un. */
    private java.util.Map<String, TFamille> chargerFamilles(List<String> ids) {
        java.util.Map<String, TFamille> out = new java.util.HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return out;
        }
        try {
            List<TFamille> familles = em.createQuery("SELECT f FROM TFamille f WHERE f.lgFAMILLEID IN :ids",
                    TFamille.class).setParameter("ids", ids).getResultList();
            for (TFamille f : familles) {
                out.put(f.getLgFAMILLEID(), f);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "chargerFamilles", e);
        }
        return out;
    }

    /**
     * Charge en UNE requete le stock rayon et le stock reserve de toute une page.
     *
     * @return pour chaque produit, un couple {stock rayon, stock reserve}
     */
    private java.util.Map<String, int[]> chargerStocks(List<String> ids, String empl) {
        java.util.Map<String, int[]> out = new java.util.HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return out;
        }
        try {
            StringBuilder in = new StringBuilder();
            for (int i = 0; i < ids.size(); i++) {
                in.append(i == 0 ? "?" : ",?").append(i + 2);
            }
            Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID, "
                    + "COALESCE(MAX(fs.int_NUMBER_AVAILABLE), 0), COALESCE(MAX(tsf.int_NUMBER), 0) "
                    + "FROM t_famille f "
                    + "LEFT JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
                    + "  AND fs.lg_EMPLACEMENT_ID = ?1 AND fs.str_STATUT = 'enable' "
                    + "LEFT JOIN t_type_stock_famille tsf ON tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
                    + "  AND tsf.lg_EMPLACEMENT_ID = ?1 AND tsf.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE + "' "
                    + "WHERE f.lg_FAMILLE_ID IN (" + in + ") GROUP BY f.lg_FAMILLE_ID");
            q.setParameter(1, empl);
            for (int i = 0; i < ids.size(); i++) {
                q.setParameter(i + 2, ids.get(i));
            }
            @SuppressWarnings("unchecked")
            List<Object[]> rows = q.getResultList();
            for (Object[] r : rows) {
                out.put(String.valueOf(r[0]), new int[] { nombre(r[1]), nombre(r[2]) });
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "chargerStocks", e);
        }
        return out;
    }

    // ------------------------------------------------------------ SUGGESTIONS

    @Override
    public JSONObject suggestions(TUser user, String search, int start, int limit) {
        LOG.log(Level.FINE, "suggestions (reassort rayon) search={0} start={1} limit={2} user={3}",
                new Object[] { search, start, limit, user.getLgUSERID() });
        // Une SEULE requete ensembliste : l'ancienne version listait tous les articles en
        // reserve puis executait 3 requetes PAR article (em.find + stock rayon + stock
        // reserve) pour n'en garder que quelques-uns. Rafraichie en continu par la cloche
        // de notifications, elle prenait plusieurs secondes et encombrait les threads HTTP.
        // Regles et cles JSON strictement identiques.
        List<JSONObject> suggested = lignesSuggestions(user, search);

        long total = suggested.size();
        JSONArray results = new JSONArray();
        int from = Math.max(0, start);
        int to = (limit > 0) ? Math.min(suggested.size(), from + limit) : suggested.size();
        for (int i = from; i < to; i++) {
            results.put(suggested.get(i));
        }
        return new JSONObject().put("total", total).put("results", results);
    }

    @Override
    public long suggestionsCount(TUser user, String search) {
        // Compteur pour le badge de la cloche : meme regle metier, sans construire la liste JSON paginee.
        return lignesSuggestions(user, search).size();
    }

    /**
     * Lignes de suggestion de reassort du rayon, calculees en une seule requete SQL. Declencheur identique a
     * l'historique : stock_rayon <= seuil_mini_rayon ET stock_reserve > 0 ET min(stock_reserve, max(0, seuil_reserve -
     * stock_rayon)) > 0, tri par designation.
     */
    private List<JSONObject> lignesSuggestions(TUser user, String search) {
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String like = (search == null || search.trim().isEmpty()) ? "%" : "%" + search.trim() + "%";

        Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, f.str_DESCRIPTION, "
                + "COALESCE(z.str_LIBELLEE, '') AS zone_libelle, "
                + "COALESCE(MAX(fs.int_NUMBER_AVAILABLE), 0) AS stock_rayon, "
                + "COALESCE(MAX(tsf.int_NUMBER), 0) AS stock_reserve, "
                + "COALESCE(f.int_SEUIL_RESERVE, 0) AS seuil_reserve, " + "f.int_SEUIL_MINI_RAYON AS seuil_mini, "
                + "COALESCE(f.int_PAF, 0) AS paf, " + "COALESCE(f.int_PRICE, 0) AS prix "
                + "FROM t_type_stock_famille tsf " + "JOIN t_famille f ON f.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID "
                + "LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID "
                + "LEFT JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID "
                + "  AND fs.lg_EMPLACEMENT_ID = tsf.lg_EMPLACEMENT_ID AND fs.str_STATUT = 'enable' "
                + "WHERE tsf.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE + "' "
                + "AND tsf.lg_EMPLACEMENT_ID = ?1 AND tsf.str_STATUT = 'enable' " + "AND f.bool_RESERVE = 1 "
                + "AND f.int_SEUIL_MINI_RAYON IS NOT NULL "
                + "AND (f.str_NAME LIKE ?2 OR f.str_DESCRIPTION LIKE ?2 OR f.int_CIP LIKE ?2) "
                + "GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, f.str_DESCRIPTION, z.str_LIBELLEE, "
                + "f.int_SEUIL_RESERVE, f.int_SEUIL_MINI_RAYON, f.int_PAF, f.int_PRICE "
                + "HAVING stock_rayon <= seuil_mini AND stock_reserve > 0 "
                + "AND LEAST(stock_reserve, GREATEST(0, seuil_reserve - stock_rayon)) > 0 "
                + "ORDER BY f.str_DESCRIPTION ASC");
        q.setParameter(1, empl);
        q.setParameter(2, like);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();

        List<JSONObject> suggested = new ArrayList<>();
        for (Object[] row : rows) {
            int stockRayon = row[5] != null ? ((Number) row[5]).intValue() : 0;
            int stockReserve = row[6] != null ? ((Number) row[6]).intValue() : 0;
            int seuilReserve = row[7] != null ? ((Number) row[7]).intValue() : 0;
            int sugg = Math.min(stockReserve, Math.max(0, seuilReserve - stockRayon));
            JSONObject json = new JSONObject();
            json.put("lg_FAMILLE_ID", (String) row[0]);
            json.put("int_CIP", row[1] != null ? String.valueOf(row[1]) : "");
            json.put("str_NAME", row[2] != null ? String.valueOf(row[2]) : "");
            json.put("str_DESCRIPTION", row[3] != null ? String.valueOf(row[3]) : "");
            json.put("lg_ZONE_GEO_ID", row[4] != null ? String.valueOf(row[4]) : "");
            json.put("int_STOCK_RAYON", stockRayon);
            json.put("int_STOCK_RESERVE", stockReserve);
            json.put("int_SEUIL_RESERVE", seuilReserve);
            json.put("int_SEUIL_MINI_RAYON", row[8] != null ? ((Number) row[8]).intValue() : JSONObject.NULL);
            json.put("int_PAF", row[9] != null ? ((Number) row[9]).intValue() : 0);
            json.put("int_PRICE", row[10] != null ? ((Number) row[10]).intValue() : 0);
            json.put("bool_RESERVE", true);
            json.put("int_QTE_SUGGEREE", sugg);
            suggested.add(json);
        }
        return suggested;
    }

    @Override
    public JSONObject suggestionsReappro(TUser user, String search, int start, int limit) {
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String like = (search == null || search.trim().isEmpty()) ? "%" : "%" + search.trim() + "%";

        String base = "FROM t_type_stock_famille tsf " + "JOIN t_famille f ON f.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID "
                + "JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID "
                + "  AND fs.lg_EMPLACEMENT_ID = tsf.lg_EMPLACEMENT_ID AND fs.str_STATUT = 'enable' "
                + "WHERE tsf.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE + "' "
                + "AND tsf.lg_EMPLACEMENT_ID = ?1 AND tsf.str_STATUT = 'enable' " + "AND f.bool_RESERVE = 1 "
                + "AND f.int_SEUIL_RESERVE IS NOT NULL AND f.int_SEUIL_RESERVE > 0 "
                + "AND fs.int_NUMBER_AVAILABLE > f.int_SEUIL_RESERVE "
                + "AND (f.str_NAME LIKE ?2 OR f.str_DESCRIPTION LIKE ?2 OR f.int_CIP LIKE ?2) ";

        Query q = em.createNativeQuery("SELECT DISTINCT tsf.lg_FAMILLE_ID " + base + " ORDER BY f.str_DESCRIPTION ASC");
        q.setParameter(1, empl);
        q.setParameter(2, like);
        @SuppressWarnings("unchecked")
        List<String> ids = q.getResultList();

        // Produits et stocks charges en DEUX requetes pour toute la liste. Auparavant chaque
        // article coutait un chargement plus deux lectures de stock : pour 83 articles, plus de
        // deux cents aller-retours, d'ou la seconde et demie d'attente.
        java.util.Map<String, TFamille> produits = chargerFamilles(ids);
        java.util.Map<String, int[]> stocks = chargerStocks(ids, empl);

        // suggestion reappro = max(0, stock_rayon - seuil_reserve), on garde > 0
        List<JSONObject> suggested = new ArrayList<>();
        for (String familleId : ids) {
            TFamille f = produits.get(familleId);
            if (f == null) {
                continue;
            }
            int[] st = stocks.get(familleId);
            JSONObject json = buildArticleJson(f, st == null ? 0 : st[0], st == null ? 0 : st[1], true);
            int sugg = Math.max(0, json.optInt("int_STOCK_RAYON", 0) - json.optInt("int_SEUIL_RESERVE", 0));
            json.put("int_QTE_SUGGEREE", sugg);
            if (sugg > 0) {
                suggested.add(json);
            }
        }

        long total = suggested.size();
        JSONArray results = new JSONArray();
        int from = Math.max(0, start);
        int to = (limit > 0) ? Math.min(suggested.size(), from + limit) : suggested.size();
        for (int i = from; i < to; i++) {
            results.put(suggested.get(i));
        }
        return new JSONObject().put("total", total).put("results", results);
    }

    // -------------------------------------------------------------- MUTATIONS

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public JSONObject assort(TUser user, String familleId, int qte) {
        LOG.log(Level.INFO, "assort famille={0} qte={1} user={2}", new Object[] { familleId, qte, user.getLgUSERID() });
        return doMove(user, familleId, qte, TMouvementReserve.TYPE_ASSORT);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public JSONObject reassort(TUser user, String familleId, int qte) {
        LOG.log(Level.INFO, "reassort famille={0} qte={1} user={2}",
                new Object[] { familleId, qte, user.getLgUSERID() });
        return doMove(user, familleId, qte, TMouvementReserve.TYPE_REASSORT);
    }

    @Override
    public JSONObject reassortBatch(TUser user, List<JSONObject> items) {
        return doBatch(user, items, TMouvementReserve.TYPE_REASSORT, "reassortBatch");
    }

    @Override
    public JSONObject assortBatch(TUser user, List<JSONObject> items) {
        return doBatch(user, items, TMouvementReserve.TYPE_ASSORT, "assortBatch");
    }

    /**
     * Traitement en lot. Chaque ligne s'execute dans sa PROPRE transaction (REQUIRES_NEW) via le proxy du bean : une
     * ligne en echec n'annule plus les lignes deja passees, et le verrou pris sur la ligne de stock est relache
     * immediatement (pas un seul verrou geant tenu jusqu'a la fin du lot).
     *
     * <p>
     * Les lignes sont triees par identifiant produit : l'ordre d'acquisition des verrous est ainsi deterministe et
     * identique d'un lot a l'autre, ce qui supprime tout risque d'interblocage entre deux lots concurrents.
     */
    private JSONObject doBatch(TUser user, List<JSONObject> items, String typeMouvement, String label) {
        int total = (items == null) ? 0 : items.size();
        LOG.log(Level.INFO, "{0} {1} articles user={2}", new Object[] { label, total, user.getLgUSERID() });
        JSONArray details = new JSONArray();
        if (total == 0) {
            return new JSONObject().put("success", true).put("traites", 0).put("total", 0).put("echecs", 0)
                    .put("details", details);
        }

        List<JSONObject> ordonnes = new ArrayList<>(items);
        ordonnes.sort(Comparator.comparing((JSONObject i) -> i.optString("lg_FAMILLE_ID", "")));

        ReserveService self = sessionContext.getBusinessObject(ReserveService.class);
        int ok = 0;
        for (JSONObject item : ordonnes) {
            String familleId = item.optString("lg_FAMILLE_ID", null);
            int qte = item.optInt("int_QTE", 0);
            JSONObject r;
            try {
                r = TMouvementReserve.TYPE_ASSORT.equals(typeMouvement) ? self.assort(user, familleId, qte)
                        : self.reassort(user, familleId, qte);
            } catch (Exception e) {
                // Echec au commit de la transaction isolee : on confine l'erreur a cette ligne et on continue.
                LOG.log(Level.SEVERE, label + " echec commit famille=" + familleId, e);
                r = fail(CODE_ERREUR_TECHNIQUE, "Echec technique sur cet article.").put("lg_FAMILLE_ID", familleId);
            }
            if (r.optBoolean("success", false)) {
                ok++;
            } else {
                LOG.log(Level.WARNING, "{0} echec article famille={1}: {2}",
                        new Object[] { label, familleId, r.optString("message") });
            }
            details.put(r);
        }
        LOG.log(Level.INFO, "{0} termine: {1}/{2} ok", new Object[] { label, ok, total });
        return new JSONObject().put("success", ok == total).put("traites", ok).put("total", total)
                .put("echecs", total - ok).put("details", details);
    }

    /**
     * Coeur transactionnel, execute dans la transaction REQUIRES_NEW de {@link #assort} / {@link #reassort}.
     *
     * <p>
     * La ligne de stock reserve est lue SOUS VERROU EXCLUSIF (PESSIMISTIC_WRITE) : la lecture du disponible et
     * l'ecriture qui en decoule sont donc serialisees, ce qui interdit qu'un mouvement concurrent consomme deux fois le
     * meme stock ou rende la reserve negative. Le stock rayon reste protege par son @Version (verrou optimiste
     * existant), volontairement inchange pour ne pas serialiser le flux de vente.
     *
     * <p>
     * Une erreur metier retourne un echec sans avoir touche au stock. Une erreur technique marque la transaction en
     * rollback : aucune ecriture partielle ne peut etre validee.
     */
    private JSONObject doMove(TUser user, String familleId, int qte, String typeMouvement) {
        LOG.log(Level.INFO, "doMove type={0} famille={1} qte={2} user={3}",
                new Object[] { typeMouvement, familleId, qte, user.getLgUSERID() });
        if (familleId == null || familleId.trim().isEmpty()) {
            LOG.log(Level.WARNING, "doMove: familleId null ou vide");
            return fail(CODE_ARTICLE_INTROUVABLE, "Article introuvable.");
        }
        if (qte <= 0) {
            LOG.log(Level.WARNING, "doMove: qte invalide ({0})", qte);
            return fail(CODE_QUANTITE_INVALIDE, "La quantite doit etre superieure a zero.")
                    .put("lg_FAMILLE_ID", familleId);
        }
        try {
            String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            TFamille famille = em.find(TFamille.class, familleId);
            if (famille == null) {
                LOG.log(Level.WARNING, "doMove: TFamille introuvable pour id={0}", familleId);
                return fail(CODE_ARTICLE_INTROUVABLE, "Article introuvable.").put("lg_FAMILLE_ID", familleId);
            }
            TFamilleStock stockRayon = findFamilleStock(familleId, empl);
            TTypeStockFamille typeRayon = findTypeStock(TYPE_STOCK_RAYON, familleId, empl);
            // Verrou exclusif sur la ligne reserve : tout autre mouvement sur ce produit attend ici.
            TTypeStockFamille typeReserve = findTypeStockForUpdate(TYPE_STOCK_RESERVE, familleId, empl);
            if (stockRayon == null || typeRayon == null || typeReserve == null) {
                LOG.log(Level.WARNING,
                        "doMove: config stock incomplete famille={0} empl={1} stockRayon={2} typeRayon={3} typeReserve={4}",
                        new Object[] { familleId, empl, stockRayon, typeRayon, typeReserve });
                return fail(CODE_CONFIG_INCOMPLETE, "Configuration de stock incomplete pour cet article.")
                        .put("lg_FAMILLE_ID", familleId);
            }

            int rayonAvant = nz(stockRayon.getIntNUMBERAVAILABLE());
            int reserveAvant = nz(typeReserve.getIntNUMBER());
            LOG.log(Level.INFO, "doMove avant: famille={0} rayonAvant={1} reserveAvant={2} qte={3}",
                    new Object[] { familleId, rayonAvant, reserveAvant, qte });

            if (TMouvementReserve.TYPE_ASSORT.equals(typeMouvement)) {
                // rayon -> reserve : on retire du rayon, on ajoute en reserve
                if (rayonAvant < qte) {
                    LOG.log(Level.WARNING, "doMove ASSORT: stock rayon insuffisant famille={0} rayon={1} qte={2}",
                            new Object[] { familleId, rayonAvant, qte });
                    return fail(CODE_STOCK_RAYON_INSUFFISANT,
                            "Stock rayon insuffisant (" + rayonAvant + " disponible).").put("lg_FAMILLE_ID", familleId)
                                    .put("int_DISPONIBLE", rayonAvant);
                }
                stockRayon.setIntNUMBERAVAILABLE(rayonAvant - qte);
                stockRayon.setIntNUMBER(nz(stockRayon.getIntNUMBER()) - qte);
                typeRayon.setIntNUMBER(stockRayon.getIntNUMBERAVAILABLE());
                typeReserve.setIntNUMBER(reserveAvant + qte);
            } else {
                // reserve -> rayon : on retire de la reserve, on ajoute au rayon
                if (reserveAvant < qte) {
                    LOG.log(Level.WARNING, "doMove REASSORT: stock reserve insuffisant famille={0} reserve={1} qte={2}",
                            new Object[] { familleId, reserveAvant, qte });
                    return fail(CODE_STOCK_RESERVE_INSUFFISANT,
                            "Stock reserve insuffisant (" + reserveAvant + " disponible).")
                                    .put("lg_FAMILLE_ID", familleId).put("int_DISPONIBLE", reserveAvant);
                }
                stockRayon.setIntNUMBERAVAILABLE(rayonAvant + qte);
                stockRayon.setIntNUMBER(nz(stockRayon.getIntNUMBER()) + qte);
                typeRayon.setIntNUMBER(stockRayon.getIntNUMBERAVAILABLE());
                typeReserve.setIntNUMBER(reserveAvant - qte);
                // un reassort remet le compteur de ventes a zero (comportement existant)
                famille.setIntNOMBREVENTES(0);
                em.merge(famille);
            }

            Date now = new Date();
            stockRayon.setDtUPDATED(now);
            typeRayon.setDtUPDATED(now);
            typeReserve.setDtUPDATED(now);
            em.merge(stockRayon);
            em.merge(typeRayon);
            em.merge(typeReserve);

            String mouvementId = recordMouvement(famille, user, stockRayon.getLgEMPLACEMENTID(), typeMouvement, qte,
                    rayonAvant, reserveAvant, stockRayon.getIntNUMBERAVAILABLE(), typeReserve.getIntNUMBER());

            LOG.log(Level.INFO, "doMove apres: famille={0} rayonApres={1} reserveApres={2}",
                    new Object[] { familleId, stockRayon.getIntNUMBERAVAILABLE(), typeReserve.getIntNUMBER() });
            return new JSONObject().put("success", true).put("message", "Operation effectuee avec succes.")
                    .put("lg_FAMILLE_ID", familleId).put("int_NUMBER", stockRayon.getIntNUMBERAVAILABLE())
                    .put("int_STOCK_RESERVE", typeReserve.getIntNUMBER())
                    // Permet a une suggestion de rattacher sa ligne au mouvement genere (tracabilite, annulation).
                    .put("lg_MOUVEMENT_ID", mouvementId).put("int_QTE", qte);
        } catch (PessimisticLockException | LockTimeoutException | OptimisticLockException e) {
            // Un autre traitement (vente, cloture d'inventaire, autre mouvement) detient la ligne ou l'a modifiee
            // entre-temps : rien n'est ecrit, l'utilisateur peut simplement reessayer.
            LOG.log(Level.WARNING, "doMove CONFLIT type=" + typeMouvement + " famille=" + familleId + " qte=" + qte, e);
            markRollback();
            return fail(CODE_CONFLIT_CONCURRENCE,
                    "Cet article est en cours de modification par un autre traitement. Veuillez reessayer.")
                            .put("lg_FAMILLE_ID", familleId);
        } catch (Exception e) {
            // Erreur technique : on annule explicitement la transaction pour interdire toute ecriture partielle.
            LOG.log(Level.SEVERE, "doMove ECHEC type=" + typeMouvement + " famille=" + familleId + " qte=" + qte, e);
            markRollback();
            return fail(CODE_ERREUR_TECHNIQUE, "Echec de l'operation: " + e.getMessage()).put("lg_FAMILLE_ID",
                    familleId);
        }
    }

    /** Marque la transaction courante en rollback (aucune ecriture partielle ne sera validee). */
    private void markRollback() {
        try {
            sessionContext.setRollbackOnly();
        } catch (Exception ignore) {
            LOG.log(Level.FINE, "markRollback: pas de transaction active");
        }
    }

    /**
     * Volontairement SANS REQUIRES_NEW : ce deplacement rejoint la transaction de l'appelant pour que le mouvement de
     * stock et ce que l'appelant en fait (mise a jour d'une ligne de suggestion) soient valides ou annules ensemble.
     */
    @Override
    public JSONObject deplacer(TUser user, String familleId, int qte, String categorie) {
        String type = TSuggestionReserve.CATEGORIE_RESERVE.equalsIgnoreCase(categorie) ? TMouvementReserve.TYPE_ASSORT
                : TMouvementReserve.TYPE_REASSORT;
        return doMove(user, familleId, qte, type);
    }

    // ------------------------------------------------------------ PROPOSITION

    @Override
    public JSONObject proposition(TUser user, String familleId, String categorie) {
        TFamille f = em.find(TFamille.class, familleId);
        if (f == null) {
            return null;
        }
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        int stockRayon = nz(getNumberAvailable(familleId, empl));
        int stockReserve = nz(getTypeStockNumber(TYPE_STOCK_RESERVE, familleId, empl));
        int seuilReserve = nz(f.getIntSEUILRESERVE());
        Integer seuilMini = f.getIntSEUILMINIRAYON();

        JSONObject json = new JSONObject();
        json.put("lg_FAMILLE_ID", familleId);
        json.put("int_STOCK_RAYON", stockRayon);
        json.put("int_STOCK_RESERVE", stockReserve);

        if (TSuggestionReserve.CATEGORIE_RESERVE.equalsIgnoreCase(categorie)) {
            // Excedent en rayon : on range le trop-plein en reserve. Meme formule que l'onglet REAPPRO.
            int proposition = Math.max(0, stockRayon - seuilReserve);
            json.put("declencheur", "Excedent en rayon");
            json.put("int_SEUIL_DECLENCHEUR", seuilReserve);
            json.put("int_CIBLE", seuilReserve);
            json.put("int_DISPONIBLE", stockRayon);
            json.put("int_PROPOSITION", proposition);
            json.put("str_FORMULE", "stock rayon (" + stockRayon + ") - seuil reserve (" + seuilReserve + ") = "
                    + proposition);
        } else {
            // Rayon sous le seuil mini : on regarnit depuis la reserve, sans jamais depasser le disponible.
            // Meme formule que lignesSuggestions() et que l'onglet REASSORT.
            int manque = Math.max(0, seuilReserve - stockRayon);
            int proposition = Math.min(stockReserve, manque);
            json.put("declencheur", "Rayon sous le seuil mini");
            json.put("int_SEUIL_DECLENCHEUR", seuilMini != null ? seuilMini : JSONObject.NULL);
            json.put("int_CIBLE", seuilReserve);
            json.put("int_DISPONIBLE", stockReserve);
            json.put("int_PROPOSITION", proposition);
            json.put("str_FORMULE", "min( stock reserve (" + stockReserve + ") ; seuil reserve (" + seuilReserve
                    + ") - stock rayon (" + stockRayon + ") = " + manque + " ) = " + proposition);
        }
        return json;
    }

    // ----------------------------------------------------------------- EXPORT

    @Override
    public byte[] exportExcel(TUser user, String search, String type) throws java.io.IOException {
        // On repasse par listArticles : l'export contient exactement les memes lignes et les memes quantites
        // suggerees que la grille, avec le meme filtre de recherche. Aucune regle n'est dupliquee ici.
        JSONObject data = listArticles(user, search, type, 0, 0);
        JSONArray results = data.optJSONArray("results");
        List<JSONObject> lignes = new ArrayList<>();
        if (results != null) {
            for (int i = 0; i < results.length(); i++) {
                lignes.add(results.getJSONObject(i));
            }
        }
        LOG.log(Level.INFO, "exportExcel type={0} lignes={1} user={2}",
                new Object[] { type, lignes.size(), user.getLgUSERID() });
        if (lignes.isEmpty()) {
            return new byte[0];
        }
        String[] entetes = { "CIP", "Designation", "Emplacement", "Stock rayon", "Stock reserve", "Seuil reserve",
                "Seuil mini rayon", "Suggere", "Prix achat", "Prix vente" };
        return reportExcelExportService.createExcelReport(titreExport(type), entetes, lignes, (row, o) -> {
            int col = 0;
            row.createCell(col++).setCellValue(o.optString("int_CIP", ""));
            row.createCell(col++).setCellValue(o.optString("str_NAME", ""));
            row.createCell(col++).setCellValue(o.optString("lg_ZONE_GEO_ID", ""));
            row.createCell(col++).setCellValue(o.optInt("int_STOCK_RAYON", 0));
            row.createCell(col++).setCellValue(o.optInt("int_STOCK_RESERVE", 0));
            row.createCell(col++).setCellValue(o.optInt("int_SEUIL_RESERVE", 0));
            row.createCell(col++).setCellValue(o.optInt("int_SEUIL_MINI_RAYON", 0));
            row.createCell(col++).setCellValue(o.optInt("int_QTE_SUGGEREE", 0));
            row.createCell(col++).setCellValue(o.optInt("int_PAF", 0));
            row.createCell(col).setCellValue(o.optInt("int_PRICE", 0));
        });
    }

    /** Titre du classeur, aligne sur le libelle de l'onglet d'ou part l'export. */
    private static String titreExport(String type) {
        if ("REAPPRO".equalsIgnoreCase(type)) {
            return "Reappro reserve (envoi en reserve)";
        }
        if ("REASSORT_RAYON".equalsIgnoreCase(type) || "REASSORT".equalsIgnoreCase(type)) {
            return "Reappro rayon (envoi en rayon)";
        }
        return "Articles en reserve";
    }

    // ------------------------------------------------------ AJUSTEMENT RESERVE

    @Override
    public JSONObject ajusterReserve(TUser user, String familleId, int delta, String motif) {
        if (familleId == null || familleId.trim().isEmpty()) {
            return fail(CODE_ARTICLE_INTROUVABLE, "Article introuvable.");
        }
        if (delta == 0) {
            return fail(CODE_QUANTITE_INVALIDE, "La quantite d'ajustement ne peut pas etre nulle.")
                    .put("lg_FAMILLE_ID", familleId);
        }
        try {
            String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            TFamille famille = em.find(TFamille.class, familleId);
            if (famille == null) {
                return fail(CODE_ARTICLE_INTROUVABLE, "Article introuvable.").put("lg_FAMILLE_ID", familleId);
            }
            // Meme verrou que pour un mouvement ordinaire : lecture et ecriture du disponible sont serialisees.
            TTypeStockFamille typeReserve = findTypeStockForUpdate(TYPE_STOCK_RESERVE, familleId, empl);
            if (typeReserve == null) {
                return fail(CODE_CONFIG_INCOMPLETE, "Cet article n'a pas de stock reserve configure.")
                        .put("lg_FAMILLE_ID", familleId);
            }

            int avant = nz(typeReserve.getIntNUMBER());
            int apres = avant + delta;
            if (apres < 0) {
                return fail(CODE_STOCK_RESERVE_INSUFFISANT,
                        "Stock reserve insuffisant (" + avant + " disponible, retrait de " + Math.abs(delta)
                                + " demande).").put("lg_FAMILLE_ID", familleId).put("int_DISPONIBLE", avant);
            }

            typeReserve.setIntNUMBER(apres);
            typeReserve.setDtUPDATED(new Date());
            em.merge(typeReserve);

            // Le rayon n'est pas touche : ses valeurs avant et apres sont identiques dans la trace.
            int rayon = nz(getNumberAvailable(familleId, empl));
            String mouvementId = recordMouvement(famille, user, user.getLgEMPLACEMENTID(),
                    TMouvementReserve.TYPE_AJUSTEMENT, Math.abs(delta), rayon, avant, rayon, apres);
            if (mouvementId != null && motif != null && !motif.trim().isEmpty()) {
                TMouvementReserve m = em.find(TMouvementReserve.class, mouvementId);
                if (m != null) {
                    m.setStrMOTIFANNULATION(motif.trim());
                    em.merge(m);
                }
            }

            LOG.log(Level.INFO, "ajusterReserve famille={0} avant={1} apres={2} user={3}",
                    new Object[] { familleId, avant, apres, user.getLgUSERID() });
            return new JSONObject().put("success", true).put("message", "Stock reserve ajuste.")
                    .put("lg_FAMILLE_ID", familleId).put("int_AVANT", avant).put("int_APRES", apres)
                    .put("lg_MOUVEMENT_ID", mouvementId);
        } catch (PessimisticLockException | LockTimeoutException | OptimisticLockException e) {
            LOG.log(Level.WARNING, "ajusterReserve CONFLIT famille=" + familleId, e);
            markRollback();
            return fail(CODE_CONFLIT_CONCURRENCE,
                    "Cet article est en cours de modification par un autre traitement. Veuillez reessayer.")
                            .put("lg_FAMILLE_ID", familleId);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "ajusterReserve ECHEC famille=" + familleId, e);
            markRollback();
            return fail(CODE_ERREUR_TECHNIQUE, "Echec de l'ajustement: " + e.getMessage()).put("lg_FAMILLE_ID",
                    familleId);
        }
    }

    // ----------------------------------------------------------- ANNULATION

    @Override
    public boolean peutAnnuler(TUser user) {
        return user != null && hasPrivilege(user, PRIVILEGE_ANNULATION);
    }

    /**
     * Meme chaine de verification que le reste de l'application : t_role_user -> t_user -> t_role -> t_role_privelege
     * -> t_privilege.
     */
    private boolean hasPrivilege(TUser user, String privilegeName) {
        try {
            Object result = em.createNativeQuery("SELECT COUNT(t_privilege.str_NAME) FROM t_role_user "
                    + "INNER JOIN t_user ON t_role_user.lg_USER_ID = t_user.lg_USER_ID "
                    + "INNER JOIN t_role ON t_role_user.lg_ROLE_ID = t_role.lg_ROLE_ID "
                    + "INNER JOIN t_role_privelege ON t_role.lg_ROLE_ID = t_role_privelege.lg_ROLE_ID "
                    + "INNER JOIN t_privilege ON t_role_privelege.lg_PRIVILEGE_ID = t_privilege.lg_PRIVELEGE_ID "
                    + "WHERE t_user.lg_USER_ID = ?1 AND t_privilege.str_NAME = ?2 "
                    + "AND t_privilege.str_STATUT = 'enable'").setParameter(1, user.getLgUSERID())
                    .setParameter(2, privilegeName).getSingleResult();
            return result != null && ((Number) result).intValue() > 0;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "hasPrivilege " + privilegeName, e);
            return false;
        }
    }

    @Override
    public JSONObject annulerMouvement(TUser user, String mouvementId, String motif) {
        if (!peutAnnuler(user)) {
            return fail(CODE_PRIVILEGE_MANQUANT,
                    "Vous n'avez pas le privilege requis pour annuler un mouvement de reserve.");
        }
        if (mouvementId == null || mouvementId.trim().isEmpty()) {
            return fail(CODE_MOUVEMENT_INTROUVABLE, "Mouvement introuvable.");
        }
        TMouvementReserve source = em.find(TMouvementReserve.class, mouvementId.trim());
        if (source == null) {
            return fail(CODE_MOUVEMENT_INTROUVABLE, "Mouvement introuvable.");
        }
        // Un mouvement d'annulation n'est pas lui-meme annulable : on n'empile pas les allers-retours.
        if (source.getLgMOUVEMENTSOURCEID() != null) {
            return fail(CODE_DEJA_ANNULE, "Ce mouvement est lui-meme une annulation : il ne peut pas etre annule.")
                    .put("lg_MOUVEMENT_ID", mouvementId);
        }
        if (dejaAnnule(source.getLgMOUVEMENTID())) {
            return fail(CODE_DEJA_ANNULE, "Ce mouvement a deja ete annule.").put("lg_MOUVEMENT_ID", mouvementId);
        }

        String familleId = source.getLgFAMILLEID() != null ? source.getLgFAMILLEID().getLgFAMILLEID() : null;
        int qte = nz(source.getIntQTE());
        if (familleId == null || qte <= 0) {
            return fail(CODE_MOUVEMENT_INTROUVABLE, "Ce mouvement ne peut pas etre annule : donnees incompletes.")
                    .put("lg_MOUVEMENT_ID", mouvementId);
        }

        // Sens inverse : ce qui etait parti du rayon y revient, et reciproquement.
        String typeInverse = TMouvementReserve.TYPE_ASSORT.equals(source.getStrTYPE())
                ? TMouvementReserve.TYPE_REASSORT
                : TMouvementReserve.TYPE_ASSORT;

        // doMove applique le meme controle de disponible et le meme verrou que tout autre mouvement :
        // une annulation ne peut pas davantage rendre un stock negatif.
        JSONObject r = doMove(user, familleId, qte, typeInverse);
        if (!r.optBoolean("success", false)) {
            return r.put("lg_MOUVEMENT_ID", mouvementId);
        }

        // Rattachement du mouvement inverse a son mouvement d'origine.
        String inverseId = r.optString("lg_MOUVEMENT_ID", null);
        if (inverseId != null) {
            TMouvementReserve inverse = em.find(TMouvementReserve.class, inverseId);
            if (inverse != null) {
                inverse.setLgMOUVEMENTSOURCEID(source.getLgMOUVEMENTID());
                inverse.setStrMOTIFANNULATION(
                        motif == null || motif.trim().isEmpty() ? "Annulation" : motif.trim());
                em.merge(inverse);
            }
        }
        LOG.log(Level.INFO, "annulation mouvement={0} par inverse={1} user={2}",
                new Object[] { mouvementId, inverseId, user.getLgUSERID() });
        return new JSONObject().put("success", true).put("message", "Mouvement annule.")
                .put("lg_MOUVEMENT_ID", mouvementId).put("lg_MOUVEMENT_INVERSE_ID", inverseId)
                .put("int_QTE", qte).put("lg_FAMILLE_ID", familleId);
    }

    /** Un mouvement est deja annule des lors qu'un autre mouvement pointe vers lui. */
    private boolean dejaAnnule(String mouvementId) {
        try {
            Query q = em.createNativeQuery(
                    "SELECT COUNT(*) FROM t_mouvement_reserve WHERE lg_MOUVEMENT_SOURCE_ID = ?1");
            q.setParameter(1, mouvementId);
            return ((Number) q.getSingleResult()).intValue() > 0;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "dejaAnnule " + mouvementId, e);
            // Dans le doute on bloque : mieux vaut refuser une annulation legitime que d'en passer deux.
            return true;
        }
    }

    // ------------------------------------------------------ HISTORIQUE COMPLET

    /** Libelles metier des types techniques : l'utilisateur ne voit jamais ASSORT ni REASSORT. */
    private static String libelleMouvement(String type) {
        if (TMouvementReserve.TYPE_ASSORT.equals(type)) {
            return "REAPPRO RESERVE";
        }
        if (TMouvementReserve.TYPE_REASSORT.equals(type)) {
            return "REAPPRO RAYON";
        }
        if (TMouvementReserve.TYPE_AJUSTEMENT.equals(type)) {
            return "AJUSTEMENT RESERVE";
        }
        return type == null ? "" : type;
    }

    /**
     * Construit la clause de filtrage de l'historique, partagee par la liste et par l'export : les deux voient donc
     * rigoureusement les memes lignes.
     */
    private String clauseHistorique(String search, String type, String dtStart, String dtEnd, Integer heureDebut,
            Integer heureFin, String userId) {
        StringBuilder w = new StringBuilder(" WHERE m.lg_EMPLACEMENT_ID = ?1 ");
        if (notBlank(search)) {
            w.append(" AND (f.str_NAME LIKE ?2 OR CAST(f.int_CIP AS CHAR) LIKE ?2) ");
        }
        if (notBlank(type) && !"ALL".equalsIgnoreCase(type)) {
            w.append(" AND m.str_TYPE = '").append(type.trim().toUpperCase().replace("'", "")).append("' ");
        }
        if (notBlank(dtStart)) {
            w.append(" AND DATE(m.dt_CREATED) >= '").append(nettoyerDate(dtStart)).append("' ");
        }
        if (notBlank(dtEnd)) {
            w.append(" AND DATE(m.dt_CREATED) <= '").append(nettoyerDate(dtEnd)).append("' ");
        }
        if (heureDebut != null) {
            w.append(" AND HOUR(m.dt_CREATED) >= ").append(Math.max(0, Math.min(23, heureDebut))).append(" ");
        }
        if (heureFin != null) {
            w.append(" AND HOUR(m.dt_CREATED) <= ").append(Math.max(0, Math.min(23, heureFin))).append(" ");
        }
        if (notBlank(userId)) {
            w.append(" AND m.lg_USER_ID = '").append(userId.trim().replace("'", "")).append("' ");
        }
        return w.toString();
    }

    /** Ne laisse passer qu'une date ISO : rien d'autre ne peut atteindre la requete. */
    private static String nettoyerDate(String iso) {
        String s = iso.trim();
        return s.matches("\\d{4}-\\d{2}-\\d{2}") ? s : "1900-01-01";
    }

    private static final String HISTORIQUE_FROM = " FROM t_mouvement_reserve m "
            + "JOIN t_famille f ON f.lg_FAMILLE_ID = m.lg_FAMILLE_ID "
            + "LEFT JOIN t_user u ON u.lg_USER_ID = m.lg_USER_ID ";

    @Override
    public JSONObject historique(TUser user, String search, String type, String dtStart, String dtEnd,
            Integer heureDebut, Integer heureFin, String userId, int start, int limit) {
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String where = clauseHistorique(search, type, dtStart, dtEnd, heureDebut, heureFin, userId);
        try {
            Query countQ = em.createNativeQuery("SELECT COUNT(*)" + HISTORIQUE_FROM + where);
            countQ.setParameter(1, empl);
            if (notBlank(search)) {
                countQ.setParameter(2, "%" + search.trim() + "%");
            }
            long total = ((Number) countQ.getSingleResult()).longValue();

            Query q = em.createNativeQuery("SELECT m.dt_CREATED, CAST(f.int_CIP AS CHAR), f.str_NAME, m.str_TYPE, "
                    + "m.int_QTE, m.int_STOCK_RAYON_AVANT, m.int_STOCK_RAYON_APRES, "
                    + "m.int_STOCK_RESERVE_AVANT, m.int_STOCK_RESERVE_APRES, "
                    + "TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,''))), "
                    + "m.lg_MOUVEMENT_ID" + HISTORIQUE_FROM + where + " ORDER BY m.dt_CREATED DESC");
            q.setParameter(1, empl);
            if (notBlank(search)) {
                q.setParameter(2, "%" + search.trim() + "%");
            }
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start));
                q.setMaxResults(limit);
            }
            @SuppressWarnings("unchecked")
            List<Object[]> rows = q.getResultList();

            JSONArray results = new JSONArray();
            java.text.SimpleDateFormat fmt = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm");
            for (Object[] r : rows) {
                String typeTechnique = r[3] == null ? "" : String.valueOf(r[3]);
                results.put(new JSONObject().put("dt_CREATED", r[0] == null ? "" : fmt.format((java.util.Date) r[0]))
                        .put("int_CIP", r[1] == null ? "" : String.valueOf(r[1]))
                        .put("str_NAME", r[2] == null ? "" : String.valueOf(r[2]))
                        .put("str_TYPE", typeTechnique).put("str_MOUVEMENT", libelleMouvement(typeTechnique))
                        .put("int_QTE", nombre(r[4])).put("int_STOCK_RAYON_AVANT", nombre(r[5]))
                        .put("int_STOCK_RAYON_APRES", nombre(r[6])).put("int_STOCK_RESERVE_AVANT", nombre(r[7]))
                        .put("int_STOCK_RESERVE_APRES", nombre(r[8]))
                        .put("str_USER", r[9] == null ? "" : String.valueOf(r[9]))
                        .put("lg_MOUVEMENT_ID", r[10] == null ? "" : String.valueOf(r[10])));
            }
            return new JSONObject().put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "historique", e);
            return new JSONObject().put("total", 0).put("results", new JSONArray());
        }
    }

    @Override
    public byte[] exportHistoriqueExcel(TUser user, String search, String type, String dtStart, String dtEnd,
            Integer heureDebut, Integer heureFin, String userId) throws java.io.IOException {
        // limit a 0 : l'export porte sur TOUTES les lignes filtrees, pas sur la seule page affichee.
        JSONObject data = historique(user, search, type, dtStart, dtEnd, heureDebut, heureFin, userId, 0, 0);
        JSONArray results = data.optJSONArray("results");
        List<JSONObject> lignes = new ArrayList<>();
        if (results != null) {
            for (int i = 0; i < results.length(); i++) {
                lignes.add(results.getJSONObject(i));
            }
        }
        if (lignes.isEmpty()) {
            return new byte[0];
        }
        String[] entetes = { "Date", "CIP", "Designation", "Mouvement", "Quantite", "Rayon avant", "Rayon apres",
                "Reserve avant", "Reserve apres", "Utilisateur" };
        return reportExcelExportService.createExcelReport("Historique des mouvements de reserve", entetes, lignes,
                (row, o) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(o.optString("dt_CREATED", ""));
                    row.createCell(col++).setCellValue(o.optString("int_CIP", ""));
                    row.createCell(col++).setCellValue(o.optString("str_NAME", ""));
                    row.createCell(col++).setCellValue(o.optString("str_MOUVEMENT", ""));
                    row.createCell(col++).setCellValue(o.optInt("int_QTE", 0));
                    row.createCell(col++).setCellValue(o.optInt("int_STOCK_RAYON_AVANT", 0));
                    row.createCell(col++).setCellValue(o.optInt("int_STOCK_RAYON_APRES", 0));
                    row.createCell(col++).setCellValue(o.optInt("int_STOCK_RESERVE_AVANT", 0));
                    row.createCell(col++).setCellValue(o.optInt("int_STOCK_RESERVE_APRES", 0));
                    row.createCell(col).setCellValue(o.optString("str_USER", ""));
                });
    }

    @Override
    public JSONArray utilisateursMouvements(TUser user) {
        JSONArray out = new JSONArray();
        try {
            Query q = em.createNativeQuery("SELECT DISTINCT u.lg_USER_ID, "
                    + "TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,''))) AS nom "
                    + "FROM t_mouvement_reserve m JOIN t_user u ON u.lg_USER_ID = m.lg_USER_ID "
                    + "WHERE m.lg_EMPLACEMENT_ID = ?1 ORDER BY nom ASC");
            q.setParameter(1, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            @SuppressWarnings("unchecked")
            List<Object[]> rows = q.getResultList();
            for (Object[] r : rows) {
                out.put(new JSONObject().put("lg_USER_ID", String.valueOf(r[0]))
                        .put("nom", r[1] == null ? "" : String.valueOf(r[1])));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "utilisateursMouvements", e);
        }
        return out;
    }

    private static int nombre(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    private static boolean notBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }

    // ---------------------------------------------------------------- HISTORY

    private java.util.Date parseDate(String iso) {
        if (iso == null || iso.trim().isEmpty())
            return null;
        try {
            return new java.text.SimpleDateFormat("yyyy-MM-dd").parse(iso.trim());
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public JSONObject mouvements(String familleId, String dtStart, String dtEnd, int start, int limit) {
        java.util.Date dStart = parseDate(dtStart);
        java.util.Date dEnd = parseDate(dtEnd);
        // extend dEnd to end-of-day
        if (dEnd != null) {
            dEnd = new java.util.Date(dEnd.getTime() + 86399999L);
        }

        StringBuilder jpql = new StringBuilder(
                "SELECT t FROM TMouvementReserve t WHERE t.lgFAMILLEID.lgFAMILLEID = :fid");
        if (dStart != null)
            jpql.append(" AND t.dtCREATED >= :dStart");
        if (dEnd != null)
            jpql.append(" AND t.dtCREATED <= :dEnd");
        jpql.append(" ORDER BY t.dtCREATED DESC");

        Query q = em.createQuery(jpql.toString());
        q.setParameter("fid", familleId);
        if (dStart != null)
            q.setParameter("dStart", dStart, javax.persistence.TemporalType.TIMESTAMP);
        if (dEnd != null)
            q.setParameter("dEnd", dEnd, javax.persistence.TemporalType.TIMESTAMP);
        if (limit > 0) {
            q.setFirstResult(start);
            q.setMaxResults(limit);
        }

        @SuppressWarnings("unchecked")
        List<TMouvementReserve> list = q.getResultList();
        JSONArray results = new JSONArray();
        for (TMouvementReserve m : list) {
            results.put(new JSONObject().put("lg_MOUVEMENT_ID", m.getLgMOUVEMENTID()).put("str_TYPE", m.getStrTYPE())
                    .put("int_QTE", nz(m.getIntQTE())).put("int_STOCK_RAYON_AVANT", nz(m.getIntSTOCKRAYONAVANT()))
                    .put("int_STOCK_RESERVE_AVANT", nz(m.getIntSTOCKRESERVEAVANT()))
                    .put("int_STOCK_RAYON_APRES", nz(m.getIntSTOCKRAYONAPRES()))
                    .put("int_STOCK_RESERVE_APRES", nz(m.getIntSTOCKRESERVEAPRES()))
                    .put("str_USER", userLabel(m.getLgUSERID()))
                    .put("dt_CREATED", m.getDtCREATED() != null ? m.getDtCREATED().toString() : ""));
        }
        return new JSONObject().put("total", results.length()).put("results", results);
    }

    @Override
    public JSONObject allMouvements(String type, String dtStart, String dtEnd, int start, int limit) {
        java.util.Date dStart = parseDate(dtStart);
        java.util.Date dEnd = parseDate(dtEnd);
        if (dEnd != null) {
            dEnd = new java.util.Date(dEnd.getTime() + 86399999L);
        }

        boolean hasType = type != null && !type.trim().isEmpty() && !"ALL".equalsIgnoreCase(type);
        StringBuilder jpql = new StringBuilder("SELECT t FROM TMouvementReserve t WHERE 1=1");
        if (hasType)
            jpql.append(" AND t.strTYPE = :type");
        if (dStart != null)
            jpql.append(" AND t.dtCREATED >= :dStart");
        if (dEnd != null)
            jpql.append(" AND t.dtCREATED <= :dEnd");
        jpql.append(" ORDER BY t.dtCREATED DESC");

        Query q = em.createQuery(jpql.toString());
        if (hasType)
            q.setParameter("type", type);
        if (dStart != null)
            q.setParameter("dStart", dStart, javax.persistence.TemporalType.TIMESTAMP);
        if (dEnd != null)
            q.setParameter("dEnd", dEnd, javax.persistence.TemporalType.TIMESTAMP);
        if (limit > 0) {
            q.setFirstResult(start);
            q.setMaxResults(limit);
        }

        @SuppressWarnings("unchecked")
        List<TMouvementReserve> list = q.getResultList();
        JSONArray results = new JSONArray();
        for (TMouvementReserve m : list) {
            String name = "";
            try {
                name = m.getLgFAMILLEID() != null ? m.getLgFAMILLEID().getStrNAME() : "";
            } catch (Exception e) {
            }
            results.put(new JSONObject().put("lg_MOUVEMENT_ID", m.getLgMOUVEMENTID()).put("str_NAME", name)
                    .put("str_TYPE", m.getStrTYPE()).put("int_QTE", nz(m.getIntQTE()))
                    .put("int_STOCK_RAYON_AVANT", nz(m.getIntSTOCKRAYONAVANT()))
                    .put("int_STOCK_RESERVE_AVANT", nz(m.getIntSTOCKRESERVEAVANT()))
                    .put("int_STOCK_RAYON_APRES", nz(m.getIntSTOCKRAYONAPRES()))
                    .put("int_STOCK_RESERVE_APRES", nz(m.getIntSTOCKRESERVEAPRES()))
                    .put("str_USER", userLabel(m.getLgUSERID()))
                    .put("dt_CREATED", m.getDtCREATED() != null ? m.getDtCREATED().toString() : ""));
        }
        return new JSONObject().put("total", results.length()).put("results", results);
    }

    @Override
    public JSONObject createInventaire(TUser user, String search, String type) {
        // Recupere tous les IDs affiches dans l'onglet (sans pagination)
        JSONObject listing = listArticles(user, search, type, 0, 0);
        JSONArray arr = listing.optJSONArray("results");
        java.util.Set<String> ids = new java.util.HashSet<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                String id = arr.getJSONObject(i).optString("lg_FAMILLE_ID", null);
                if (id != null && !id.isEmpty()) {
                    ids.add(id);
                }
            }
        }
        if (ids.isEmpty()) {
            return new JSONObject().put("count", 0).put("message", "Aucun produit a inventorier.");
        }
        String title = buildInventaireName();
        int count = inventaireService.createReserveInventaire(ids, title);
        return new JSONObject().put("count", count).put("message", title);
    }

    @Override
    public JSONObject createInventaireFromSelection(TUser user, java.util.Set<String> ids, String commentaire) {
        return createInventaireFromSelection(user, ids, commentaire, null);
    }

    @Override
    public JSONObject createInventaireFromSelection(TUser user, java.util.Set<String> ids, String commentaire,
            String titre) {
        if (ids == null || ids.isEmpty()) {
            return new JSONObject().put("count", 0).put("message", "Aucun produit selectionne.");
        }
        String title = (titre != null && !titre.trim().isEmpty()) ? titre.trim() : buildInventaireName();
        String description = (commentaire != null && !commentaire.trim().isEmpty()) ? commentaire.trim() : title;
        int count = inventaireService.createReserveInventaire(ids, title, description);
        return new JSONObject().put("count", count).put("message", title);
    }

    // Nom de l'inventaire reserve : "Inventaire reserve du dd/MM/yyyy HH:mm"
    private String buildInventaireName() {
        String jour = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(new Date());
        return "Inventaire reserve du " + jour;
    }

    // ----------------------------------------------------------------- HELPERS

    private JSONObject buildArticleJson(TFamille f, String empl, boolean withSuggestion) {
        // Chemin unitaire : deux requetes de stock pour ce seul produit. Reserve aux appels isoles ;
        // les listes passent par la surcharge ci-dessous, qui recoit les stocks deja charges en lot.
        return buildArticleJson(f, nz(getNumberAvailable(f.getLgFAMILLEID(), empl)),
                nz(getTypeStockNumber(TYPE_STOCK_RESERVE, f.getLgFAMILLEID(), empl)), withSuggestion);
    }

    /**
     * Variante recevant les stocks DEJA CONNUS.
     *
     * <p>
     * C'est ce qui permet aux listes de ne plus interroger la base produit par produit : les stocks de toute la page
     * sont ramenes en une seule requete, puis distribues ici. Le contenu produit est rigoureusement identique a celui
     * de la version unitaire.
     */
    private JSONObject buildArticleJson(TFamille f, int stockRayon, int stockReserve, boolean withSuggestion) {
        JSONObject json = new JSONObject();
        json.put("lg_FAMILLE_ID", f.getLgFAMILLEID());
        json.put("int_CIP", f.getIntCIP());
        json.put("str_NAME", f.getStrNAME());
        json.put("str_DESCRIPTION", f.getStrDESCRIPTION());
        json.put("lg_ZONE_GEO_ID", zoneLibelle(f));
        json.put("int_STOCK_RAYON", stockRayon);
        json.put("int_STOCK_RESERVE", stockReserve);
        json.put("int_SEUIL_RESERVE", nz(f.getIntSEUILRESERVE()));
        json.put("int_SEUIL_MINI_RAYON", f.getIntSEUILMINIRAYON() != null ? f.getIntSEUILMINIRAYON() : JSONObject.NULL);
        json.put("int_PAF", nz(f.getIntPAF())); // prix d'achat
        json.put("int_PRICE", nz(f.getIntPRICE())); // prix de vente
        json.put("bool_RESERVE", f.getBoolRESERVE());

        if (withSuggestion) {
            int suggestion = calculerSuggestion(f, stockRayon, stockReserve);
            json.put("int_QTE_SUGGEREE", suggestion);
            json.put("int_SEUIL_DYNAMIQUE", calculerSeuilDynamique(f));
        }
        return json;
    }

    /**
     * Quantite suggeree a monter de la reserve vers le rayon.
     *
     * <pre>
     * seuil_dynamique = max(seuil_manuel, nb_ventes * coef_securite * delai/...)
     * manque_rayon    = max(0, seuil_dynamique - stock_rayon)
     * suggestion      = min(manque_rayon, stock_reserve)
     * </pre>
     */
    private int calculerSuggestion(TFamille f, int stockRayon, int stockReserve) {
        int seuilDynamique = calculerSeuilDynamique(f);
        int manqueRayon = Math.max(0, seuilDynamique - stockRayon);
        return Math.min(manqueRayon, stockReserve);
    }

    private int calculerSeuilDynamique(TFamille f) {
        int seuilManuel = nz(f.getIntSEUILRESERVE());
        int nbVentes = nz(f.getIntNOMBREVENTES());
        int coef = DEFAULT_COEF_SECURITY;
        int delai = DEFAULT_DELAI_REAPPRO;
        TGrossiste grossiste = f.getLgGROSSISTEID();
        if (grossiste != null) {
            if (grossiste.getIntCOEFSECURITY() != null && grossiste.getIntCOEFSECURITY() > 0) {
                coef = grossiste.getIntCOEFSECURITY();
            }
            if (grossiste.getIntDELAIREAPPROVISIONNEMENT() != null && grossiste.getIntDELAIREAPPROVISIONNEMENT() > 0) {
                delai = grossiste.getIntDELAIREAPPROVISIONNEMENT();
            }
        }
        // estimation simple basee sur intNOMBREVENTES (fenetre depuis le dernier reassort)
        int seuilVentes = nbVentes * coef;
        return Math.max(seuilManuel, seuilVentes);
    }

    /** @return l'identifiant du mouvement cree, pour que l'appelant puisse s'y rattacher. */
    private String recordMouvement(TFamille famille, TUser user, TEmplacement emplacement, String type, int qte,
            int rayonAvant, int reserveAvant, int rayonApres, int reserveApres) {
        TMouvementReserve m = new TMouvementReserve();
        m.setLgMOUVEMENTID(UUID.randomUUID().toString());
        m.setLgFAMILLEID(famille);
        m.setLgUSERID(user);
        m.setLgEMPLACEMENTID(emplacement);
        m.setStrTYPE(type);
        m.setIntQTE(qte);
        m.setIntSTOCKRAYONAVANT(rayonAvant);
        m.setIntSTOCKRESERVEAVANT(reserveAvant);
        m.setIntSTOCKRAYONAPRES(rayonApres);
        m.setIntSTOCKRESERVEAPRES(reserveApres);
        m.setDtCREATED(new Date());
        em.persist(m);
        return m.getLgMOUVEMENTID();
    }

    private TFamilleStock findFamilleStock(String familleId, String empl) {
        try {
            Query q = em.createQuery("SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 "
                    + "AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT = 'enable'");
            q.setParameter(1, familleId);
            q.setParameter(2, empl);
            q.setMaxResults(1);
            return (TFamilleStock) q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TTypeStockFamille findTypeStock(String typeStockId, String familleId, String empl) {
        try {
            Query q = em.createQuery("SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 "
                    + "AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3");
            q.setParameter(1, typeStockId);
            q.setParameter(2, familleId);
            q.setParameter(3, empl);
            q.setMaxResults(1);
            return (TTypeStockFamille) q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Identique a {@link #findTypeStock} mais pose un VERROU EXCLUSIF sur la ligne (SELECT ... FOR UPDATE). Tout autre
     * traitement voulant modifier cette meme ligne attend la fin de la transaction courante : la sequence
     * lecture-du-disponible puis ecriture devient atomique.
     *
     * <p>
     * Les exceptions de verrou sont volontairement PROPAGEES (elles ne doivent pas etre confondues avec une
     * configuration de stock absente) : {@link #doMove} les traduit en conflit de concurrence.
     */
    private TTypeStockFamille findTypeStockForUpdate(String typeStockId, String familleId, String empl) {
        Query q = em.createQuery("SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 "
                + "AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3");
        q.setParameter(1, typeStockId);
        q.setParameter(2, familleId);
        q.setParameter(3, empl);
        q.setMaxResults(1);
        q.setLockMode(LockModeType.PESSIMISTIC_WRITE);
        q.setHint(LOCK_TIMEOUT_HINT, LOCK_TIMEOUT_MS);
        try {
            return (TTypeStockFamille) q.getSingleResult();
        } catch (javax.persistence.NoResultException | javax.persistence.NonUniqueResultException e) {
            // Absence de ligne de stock reserve : c'est un probleme de configuration, pas un conflit.
            return null;
        }
    }

    private Integer getNumberAvailable(String familleId, String empl) {
        try {
            Query q = em.createNativeQuery(
                    "SELECT t.int_NUMBER_AVAILABLE FROM t_famille_stock t WHERE t.lg_FAMILLE_ID = ?1 "
                            + "AND t.lg_EMPLACEMENT_ID = ?2 AND t.str_STATUT = 'enable'");
            q.setParameter(1, familleId);
            q.setParameter(2, empl);
            q.setMaxResults(1);
            Object result = q.getSingleResult();
            return result != null ? ((Number) result).intValue() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Integer getTypeStockNumber(String typeStockId, String familleId, String empl) {
        try {
            Query q = em
                    .createNativeQuery("SELECT t.int_NUMBER FROM t_type_stock_famille t WHERE t.lg_TYPE_STOCK_ID = ?1 "
                            + "AND t.lg_FAMILLE_ID = ?2 AND t.lg_EMPLACEMENT_ID = ?3");
            q.setParameter(1, typeStockId);
            q.setParameter(2, familleId);
            q.setParameter(3, empl);
            q.setMaxResults(1);
            Object result = q.getSingleResult();
            return result != null ? ((Number) result).intValue() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String zoneLibelle(TFamille f) {
        try {
            return f.getLgZONEGEOID() != null ? f.getLgZONEGEOID().getStrLIBELLEE() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private static int nz(Integer value) {
        return value != null ? value : 0;
    }

    /**
     * Libelle lisible de l'utilisateur : "Prenom Nom", a defaut le login, a defaut l'identifiant technique.
     */
    private static String userLabel(TUser user) {
        if (user == null) {
            return "";
        }
        String first = user.getStrFIRSTNAME();
        String last = user.getStrLASTNAME();
        StringBuilder sb = new StringBuilder();
        if (first != null && !first.trim().isEmpty()) {
            sb.append(first.trim());
        }
        if (last != null && !last.trim().isEmpty()) {
            if (sb.length() > 0) {
                sb.append(' ');
            }
            sb.append(last.trim());
        }
        if (sb.length() > 0) {
            return sb.toString();
        }
        if (user.getStrLOGIN() != null && !user.getStrLOGIN().trim().isEmpty()) {
            return user.getStrLOGIN();
        }
        return user.getLgUSERID();
    }

    /**
     * Echec avec un code exploitable par l'interface (compte rendu detaille). Le champ {@code message} reste present et
     * inchange dans sa forme : les ecrans existants continuent de fonctionner sans modification.
     */
    private static JSONObject fail(String code, String message) {
        return new JSONObject().put("success", false).put("code", code).put("message", message);
    }
}
