package rest.service.impl;

import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TMouvementReserve;
import dal.TTypeStockFamille;
import dal.TUser;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ReserveService;

/**
 * Implementation du service de reserve. Toute mutation rayon/reserve se fait dans une transaction JTA unique
 * (atomicite), avec validation prealable et trace systematique dans t_mouvement_reserve.
 */
@Stateless
public class ReserveServiceImpl implements ReserveService {

    private static final Logger LOG = Logger.getLogger(ReserveServiceImpl.class.getName());

    private static final String TYPE_STOCK_RAYON = "1";
    private static final String TYPE_STOCK_RESERVE = "2";
    private static final int DEFAULT_DELAI_REAPPRO = 3;
    private static final int DEFAULT_COEF_SECURITY = 1;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @javax.ejb.EJB
    private rest.service.InventaireService inventaireService;

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
            JSONArray results = new JSONArray();
            for (String familleId : ids) {
                TFamille f = em.find(TFamille.class, familleId);
                if (f == null) {
                    LOG.log(Level.WARNING, "listArticles: TFamille introuvable pour id={0}", familleId);
                    continue;
                }
                JSONObject json = buildArticleJson(f, empl, true);
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

    // ------------------------------------------------------------ SUGGESTIONS

    @Override
    public JSONObject suggestions(TUser user, String search, int start, int limit) {
        LOG.log(Level.FINE, "suggestions (reassort rayon) search={0} start={1} limit={2} user={3}",
                new Object[] { search, start, limit, user.getLgUSERID() });
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String like = (search == null || search.trim().isEmpty()) ? "%" : "%" + search.trim() + "%";

        String base = "FROM t_type_stock_famille tsf " + "JOIN t_famille f ON f.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID "
                + "WHERE tsf.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE + "' "
                + "AND tsf.lg_EMPLACEMENT_ID = ?1 AND tsf.str_STATUT = 'enable' " + "AND f.bool_RESERVE = 1 "
                + "AND (f.str_NAME LIKE ?2 OR f.str_DESCRIPTION LIKE ?2 OR f.int_CIP LIKE ?2) ";

        Query q = em.createNativeQuery("SELECT DISTINCT tsf.lg_FAMILLE_ID " + base + " ORDER BY f.str_DESCRIPTION ASC");
        q.setParameter(1, empl);
        q.setParameter(2, like);
        @SuppressWarnings("unchecked")
        List<String> ids = q.getResultList();

        // On ne garde que les articles dont la suggestion > 0
        List<JSONObject> suggested = new ArrayList<>();
        for (String familleId : ids) {
            TFamille f = em.find(TFamille.class, familleId);
            if (f == null) {
                continue;
            }
            JSONObject json = buildArticleJson(f, empl, false);
            Integer seuilMini = f.getIntSEUILMINIRAYON();
            int stockRayon = json.optInt("int_STOCK_RAYON", 0);
            int stockReserve = json.optInt("int_STOCK_RESERVE", 0);
            int seuilReserve = json.optInt("int_SEUIL_RESERVE", 0);
            // Declencheur : stock_rayon <= seuil_mini_rayon ET stock_reserve > 0
            if (seuilMini == null || stockRayon > seuilMini || stockReserve <= 0) {
                continue;
            }
            // int sugg = Math.max(0, seuilReserve - stockRayon);
            int sugg = Math.min(stockReserve, Math.max(0, seuilReserve - stockRayon));
            if (sugg <= 0) {
                continue;
            }
            json.put("int_QTE_SUGGEREE", sugg);
            suggested.add(json);
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

        // suggestion reappro = max(0, stock_rayon - stock_reserve), on garde > 0
        List<JSONObject> suggested = new ArrayList<>();
        for (String familleId : ids) {
            TFamille f = em.find(TFamille.class, familleId);
            if (f == null) {
                continue;
            }
            JSONObject json = buildArticleJson(f, empl, true);
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
    public JSONObject assort(TUser user, String familleId, int qte) {
        LOG.log(Level.INFO, "assort famille={0} qte={1} user={2}", new Object[] { familleId, qte, user.getLgUSERID() });
        return doMove(user, familleId, qte, TMouvementReserve.TYPE_ASSORT);
    }

    @Override
    public JSONObject reassort(TUser user, String familleId, int qte) {
        LOG.log(Level.INFO, "reassort famille={0} qte={1} user={2}",
                new Object[] { familleId, qte, user.getLgUSERID() });
        return doMove(user, familleId, qte, TMouvementReserve.TYPE_REASSORT);
    }

    @Override
    public JSONObject reassortBatch(TUser user, List<JSONObject> items) {
        LOG.log(Level.INFO, "reassortBatch {0} articles user={1}", new Object[] { items.size(), user.getLgUSERID() });
        JSONArray details = new JSONArray();
        int ok = 0;
        for (JSONObject item : items) {
            String familleId = item.optString("lg_FAMILLE_ID", null);
            int qte = item.optInt("int_QTE", 0);
            JSONObject r = doMove(user, familleId, qte, TMouvementReserve.TYPE_REASSORT);
            if (r.optBoolean("success", false)) {
                ok++;
            } else {
                LOG.log(Level.WARNING, "reassortBatch echec article famille={0}: {1}",
                        new Object[] { familleId, r.optString("message") });
            }
            details.put(r);
        }
        LOG.log(Level.INFO, "reassortBatch termine: {0}/{1} ok", new Object[] { ok, items.size() });
        return new JSONObject().put("success", ok == items.size()).put("traites", ok).put("total", items.size())
                .put("details", details);
    }

    @Override
    public JSONObject assortBatch(TUser user, List<JSONObject> items) {
        LOG.log(Level.INFO, "assortBatch {0} articles user={1}", new Object[] { items.size(), user.getLgUSERID() });
        JSONArray details = new JSONArray();
        int ok = 0;
        for (JSONObject item : items) {
            String familleId = item.optString("lg_FAMILLE_ID", null);
            int qte = item.optInt("int_QTE", 0);
            JSONObject r = doMove(user, familleId, qte, TMouvementReserve.TYPE_ASSORT);
            if (r.optBoolean("success", false)) {
                ok++;
            } else {
                LOG.log(Level.WARNING, "assortBatch echec article famille={0}: {1}",
                        new Object[] { familleId, r.optString("message") });
            }
            details.put(r);
        }
        LOG.log(Level.INFO, "assortBatch termine: {0}/{1} ok", new Object[] { ok, items.size() });
        return new JSONObject().put("success", ok == items.size()).put("traites", ok).put("total", items.size())
                .put("details", details);
    }

    /**
     * Coeur transactionnel. Valide AVANT toute mutation : en cas d'erreur metier on retourne un echec sans avoir touche
     * au stock. En cas d'erreur technique la transaction JTA est annulee automatiquement.
     */
    private JSONObject doMove(TUser user, String familleId, int qte, String typeMouvement) {
        LOG.log(Level.INFO, "doMove type={0} famille={1} qte={2} user={3}",
                new Object[] { typeMouvement, familleId, qte, user.getLgUSERID() });
        if (familleId == null || familleId.trim().isEmpty()) {
            LOG.log(Level.WARNING, "doMove: familleId null ou vide");
            return fail("Article introuvable.");
        }
        if (qte <= 0) {
            LOG.log(Level.WARNING, "doMove: qte invalide ({0})", qte);
            return fail("La quantite doit etre superieure a zero.");
        }
        try {
            String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            TFamille famille = em.find(TFamille.class, familleId);
            if (famille == null) {
                LOG.log(Level.WARNING, "doMove: TFamille introuvable pour id={0}", familleId);
                return fail("Article introuvable.");
            }
            TFamilleStock stockRayon = findFamilleStock(familleId, empl);
            TTypeStockFamille typeRayon = findTypeStock(TYPE_STOCK_RAYON, familleId, empl);
            TTypeStockFamille typeReserve = findTypeStock(TYPE_STOCK_RESERVE, familleId, empl);
            if (stockRayon == null || typeRayon == null || typeReserve == null) {
                LOG.log(Level.WARNING,
                        "doMove: config stock incomplete famille={0} empl={1} stockRayon={2} typeRayon={3} typeReserve={4}",
                        new Object[] { familleId, empl, stockRayon, typeRayon, typeReserve });
                return fail("Configuration de stock incomplete pour cet article.");
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
                    return fail("Stock rayon insuffisant (" + rayonAvant + " disponible).");
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
                    return fail("Stock reserve insuffisant (" + reserveAvant + " disponible).");
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

            recordMouvement(famille, user, stockRayon.getLgEMPLACEMENTID(), typeMouvement, qte, rayonAvant,
                    reserveAvant, stockRayon.getIntNUMBERAVAILABLE(), typeReserve.getIntNUMBER());

            LOG.log(Level.INFO, "doMove apres: famille={0} rayonApres={1} reserveApres={2}",
                    new Object[] { familleId, stockRayon.getIntNUMBERAVAILABLE(), typeReserve.getIntNUMBER() });
            return new JSONObject().put("success", true).put("message", "Operation effectuee avec succes.")
                    .put("lg_FAMILLE_ID", familleId).put("int_NUMBER", stockRayon.getIntNUMBERAVAILABLE())
                    .put("int_STOCK_RESERVE", typeReserve.getIntNUMBER());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "doMove ECHEC type=" + typeMouvement + " famille=" + familleId + " qte=" + qte, e);
            return fail("Echec de l'operation: " + e.getMessage());
        }
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
        int stockRayon = nz(getNumberAvailable(f.getLgFAMILLEID(), empl));
        int stockReserve = nz(getTypeStockNumber(TYPE_STOCK_RESERVE, f.getLgFAMILLEID(), empl));

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

    private void recordMouvement(TFamille famille, TUser user, TEmplacement emplacement, String type, int qte,
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

    private static JSONObject fail(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }
}
