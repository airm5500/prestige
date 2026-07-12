package rest.service.utils;

import bll.entity.EntityData;
import bll.warehouse.WarehouseManager;
import commonTasks.dto.ArticleDTO;
import dal.TAjustementDetail;
import dal.TFamille;
import dal.TPreenregistrementDetail;
import dal.TRetourFournisseurDetail;
import dal.TUser;
import dal.TWarehouse;
import dal.dataManager;
import java.io.ByteArrayOutputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.TypedQuery;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.StockMovementFilterDTO;
import util.Constant;

/**
 * Source de données de l'écran « Point détaillé entrée/sortie » (API v1/stock-movements). Réutilise les managers BLL
 * historiques appelés par les JSP ws_data_mouvement_*.jsp afin de produire strictement les mêmes résultats et les mêmes
 * noms de champs JSON que l'écran actuel (stratégie anti-régression de la refonte REST).
 */
public final class StockMovementDataHelper implements AutoCloseable {

    private static final Logger LOG = Logger.getLogger(StockMovementDataHelper.class.getName());

    public static final String TYPE_TOUS = "TOUS";
    public static final String TYPE_ENTREESTOCK = "ENTREESTOCK";
    public static final String TYPE_PERIME = "PERIME";
    public static final String TYPE_RETOURFOURNISSEUR = "RETOURFOURNISSEUR";
    public static final String TYPE_VENTE = "VENTE";
    public static final String TYPE_AJUSTEMENT = "AJUSTEMENT";

    private static final String MATCH_ALL = "%%";

    // mêmes formats d'affichage que toolkits.utils.date utilisés par les JSP (cf. util.KeyUtilGen)
    private final SimpleDateFormat formatterOrange = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss");
    private final SimpleDateFormat formatterShort = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm:ss");
    private final SimpleDateFormat isoDate = new SimpleDateFormat("yyyy-MM-dd");

    private final dataManager odataManager;
    private final TUser user;

    public StockMovementDataHelper(TUser user) {
        this.user = user;
        this.odataManager = new dataManager();
        this.odataManager.initEntityManager();
    }

    @Override
    public void close() {
        try {
            odataManager.closeEntityManager();
        } catch (Exception e) {
            LOG.log(Level.FINE, "closeEntityManager", e);
        }
    }

    /**
     * Liste paginée au format attendu par le reader ExtJS actuel : {success, total, results}. En cas d'erreur de
     * requête, la réponse porte success=false et le message d'erreur (visible dans l'onglet réseau) au lieu d'un faux
     * total à zéro.
     */
    public JSONObject list(StockMovementFilterDTO filter, int start, int limit) throws JSONException {
        try {
            Rows rows = fetchRows(filter, false, start, limit);
            return new JSONObject().put("success", true).put("total", rows.total).put("results", toArray(rows.page));
        } catch (Exception e) {
            return new JSONObject().put("success", false).put("total", 0).put("results", new JSONArray()).put("msg",
                    e.getMessage());
        }
    }

    /**
     * Toutes les lignes correspondant aux filtres (exports, créations sur résultat filtré).
     */
    public List<JSONObject> allRows(StockMovementFilterDTO filter) {
        return fetchRows(filter, true, 0, 0).page;
    }

    /**
     * Identifiants produit distincts du résultat filtré, dans l'ordre d'affichage (créations d'inventaire et de
     * suggestion en mode « tout le filtre »).
     */
    public Set<String> allFamilleIds(StockMovementFilterDTO filter) {
        Set<String> ids = new LinkedHashSet<>();
        for (JSONObject row : allRows(filter)) {
            String id = row.optString("lg_FAMILLE_ID", "");
            if (!id.isEmpty()) {
                ids.add(id);
            }
        }
        return ids;
    }

    /**
     * Convertit des identifiants produit en ArticleDTO (id + grossiste par défaut du produit) pour la création de
     * suggestion. Les produits sans grossiste sont ignorés : une suggestion est toujours rattachée à un grossiste.
     */
    public List<ArticleDTO> toArticleDtos(Collection<String> familleIds) {
        List<ArticleDTO> dtos = new ArrayList<>();
        for (String id : familleIds) {
            TFamille famille = odataManager.getEm().find(TFamille.class, id);
            if (famille == null || famille.getLgGROSSISTEID() == null) {
                continue;
            }
            ArticleDTO dto = new ArticleDTO();
            dto.setId(famille.getLgFAMILLEID());
            dto.setGrossisteId(famille.getLgGROSSISTEID().getLgGROSSISTEID());
            dtos.add(dto);
        }
        return dtos;
    }

    private static final String[] EXPORT_HEADERS = { "CIP", "Article", "Quantité", "Opérateur", "Nature opération",
            "Fournisseur", "Date mouvement", "Date", "Heure" };

    private static String[] exportRow(JSONObject row) {
        return new String[] { row.optString("int_CIP", ""), row.optString("str_NAME", ""),
                row.optString("int_NUMBER", ""), row.optString("lg_USER_ID", ""), row.optString("str_ACTION", ""),
                row.optString("lg_GROSSISTE_ID", ""), row.optString("dt_DAY", ""), row.optString("dt_UPDATED", ""),
                row.optString("dt_LAST_VENTE", "") };
    }

    /**
     * Export CSV (séparateur ; UTF-8 avec BOM pour Excel) de toutes les lignes filtrées.
     */
    public byte[] exportCsv(StockMovementFilterDTO filter) {
        try (StringWriter writer = new StringWriter(); CSVPrinter printer = new CSVPrinter(writer,
                CSVFormat.EXCEL.withHeader(EXPORT_HEADERS).withDelimiter(';'))) {
            for (JSONObject row : allRows(filter)) {
                printer.printRecord((Object[]) exportRow(row));
            }
            printer.flush();
            byte[] content = writer.toString().getBytes(StandardCharsets.UTF_8);
            byte[] withBom = new byte[content.length + 3];
            withBom[0] = (byte) 0xEF;
            withBom[1] = (byte) 0xBB;
            withBom[2] = (byte) 0xBF;
            System.arraycopy(content, 0, withBom, 3, content.length);
            return withBom;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "exportCsv", e);
            return new byte[0];
        }
    }

    /**
     * Export Excel .xlsx (XSSF) de toutes les lignes filtrées.
     */
    public byte[] exportXlsx(StockMovementFilterDTO filter) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Mouvements");
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            Row header = sheet.createRow(0);
            for (int i = 0; i < EXPORT_HEADERS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(EXPORT_HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }
            int rowIndex = 1;
            for (JSONObject row : allRows(filter)) {
                Row line = sheet.createRow(rowIndex++);
                String[] values = exportRow(row);
                for (int i = 0; i < values.length; i++) {
                    line.createCell(i).setCellValue(values[i]);
                }
            }
            for (int i = 0; i < EXPORT_HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "exportXlsx", e);
            return new byte[0];
        }
    }

    private static final class Rows {
        private final int total;
        private final List<JSONObject> page;

        private Rows(int total, List<JSONObject> page) {
            this.total = total;
            this.page = page;
        }
    }

    private Rows fetchRows(StockMovementFilterDTO filter, boolean all, int start, int limit) {
        String type = filter.getTransactionType() == null || filter.getTransactionType().trim().isEmpty() ? TYPE_TOUS
                : filter.getTransactionType().trim().toUpperCase();
        String search = filter.getSearchValue() != null ? filter.getSearchValue().trim() : "";
        String grossisteId = likeParam(filter.getGrossisteId());
        String familleArticleId = likeParam(filter.getFamilleArticleId());
        String zoneGeoId = likeParam(filter.getZoneGeoId());
        boolean noDates = isEmptyIso(filter.getDateDebut()) && isEmptyIso(filter.getDateFin());
        // gros volumes (ventes, entrées, agrégat Tous) : défaut « aujourd'hui » si aucune date fournie (performance)
        Date dtDebut = isEmptyIso(filter.getDateDebut()) ? atTime(new Date(), 0, 0, 0)
                : dayStart(filter.getDateDebut());
        Date dtFin = isEmptyIso(filter.getDateFin()) ? atTime(new Date(), 23, 59, 59) : dayEnd(filter.getDateFin());
        // petites tables (retours, périmés, ajustements) : aucune date => tout l'historique, pour ne pas masquer
        // une saisie faite un autre jour
        Date smallDebut = noDates ? null : dtDebut;
        Date smallFin = noDates ? null : dtFin;

        try {
            switch (type) {
            case TYPE_TOUS:
                return fetchTous(filter, search, dtDebut, dtFin, all, start, limit);
            case TYPE_PERIME:
                return fetchPerimes(search, grossisteId, familleArticleId, zoneGeoId, smallDebut, smallFin, all, start,
                        limit);
            case TYPE_RETOURFOURNISSEUR:
                return fetchRetours(search, grossisteId, familleArticleId, zoneGeoId, smallDebut, smallFin, all, start,
                        limit);
            case TYPE_VENTE:
                return fetchVentes(search, filter.getGrossisteId(), familleArticleId, zoneGeoId, dtDebut, dtFin, all,
                        start, limit);
            case TYPE_AJUSTEMENT:
                return fetchAjustements(search, filter.getGrossisteId(), filter.getFamilleArticleId(),
                        filter.getZoneGeoId(), smallDebut, smallFin, all, start, limit);
            case TYPE_ENTREESTOCK:
            default:
                return fetchEntrees(search, grossisteId, familleArticleId, zoneGeoId, dtDebut, dtFin, all, start,
                        limit);
            }
        } catch (Exception e) {
            // ne pas avaler l'erreur : elle remonte à l'appelant qui la restitue dans la réponse
            // (un catch silencieux transformait toute erreur de requête en faux « total: 0, success: true »)
            LOG.log(Level.SEVERE, "fetchRows " + type, e);
            throw new IllegalStateException("Erreur " + type + " : " + e.getMessage(), e);
        }
    }

    // --- TOUS : agrégation de tous les types de mouvement sur la période, triée du plus récent au plus ancien ---
    private Rows fetchTous(StockMovementFilterDTO filter, String search, Date dtDebut, Date dtFin, boolean all,
            int start, int limit) throws JSONException {
        String grossisteId = likeParam(filter.getGrossisteId());
        String familleArticleId = likeParam(filter.getFamilleArticleId());
        String zoneGeoId = likeParam(filter.getZoneGeoId());
        List<JSONObject> merged = new ArrayList<>();
        merged.addAll(fetchEntrees(search, grossisteId, familleArticleId, zoneGeoId, dtDebut, dtFin, true, 0, 0).page);
        merged.addAll(fetchPerimes(search, grossisteId, familleArticleId, zoneGeoId, dtDebut, dtFin, true, 0, 0).page);
        merged.addAll(fetchRetours(search, grossisteId, familleArticleId, zoneGeoId, dtDebut, dtFin, true, 0, 0).page);
        merged.addAll(fetchVentes(search, filter.getGrossisteId(), familleArticleId, zoneGeoId, dtDebut, dtFin, true, 0,
                0).page);
        merged.addAll(fetchAjustements(search, filter.getGrossisteId(), filter.getFamilleArticleId(),
                filter.getZoneGeoId(), dtDebut, dtFin, true, 0, 0).page);
        merged.sort((a, b) -> Long.compare(b.optLong("_ts", 0L), a.optLong("_ts", 0L)));
        int total = merged.size();
        List<JSONObject> page = all ? merged : new ArrayList<>(slice(merged, false, start, limit));
        return new Rows(total, page);
    }

    // --- ENTREESTOCK : équivalent ws_data_mouvement_entree.jsp ---
    private Rows fetchEntrees(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        List<JSONObject> rows = new ArrayList<>();
        if ("1".equals(user.getLgEMPLACEMENTID().getLgEMPLACEMENTID())) {
            // Requête dédiée index-friendly : l'ancienne listeWarehouses (Criteria) enveloppait la date dans
            // DATE(...), empêchant l'usage de l'index. Comparaison directe + JOIN FETCH pour éviter le N+1 ;
            // pagination en base (setFirstResult/setMaxResults) + requête de comptage, comme avant.
            // JPQL standard uniquement : JOIN FETCH sans alias + chemins implicites (les alias sur les fetch
            // joins sont une extension refusée par certaines versions d'EclipseLink, provider par défaut de DALPU)
            StringBuilder where = new StringBuilder(" WHERE t.strSTATUT = :statut"
                    + " AND (t.lgFAMILLEID.strDESCRIPTION LIKE :search OR t.lgFAMILLEID.intCIP LIKE :search"
                    + " OR t.lgFAMILLEID.strNAME LIKE :search OR t.lgFAMILLEID.intEAN13 LIKE :search)");
            if (dtDebut != null) {
                where.append(" AND t.dtCREATED >= :debut");
            }
            if (dtFin != null) {
                where.append(" AND t.dtCREATED <= :fin");
            }
            boolean hasGrossiste = isSet(grossisteId);
            boolean hasFamilleArticle = isSet(familleArticleId);
            boolean hasZoneGeo = isSet(zoneGeoId);
            if (hasGrossiste) {
                where.append(" AND t.lgGROSSISTEID.lgGROSSISTEID = :grossiste");
            }
            if (hasFamilleArticle) {
                where.append(" AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID = :famArt");
            }
            if (hasZoneGeo) {
                where.append(" AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :zone");
            }
            String select = "SELECT t FROM TWarehouse t JOIN FETCH t.lgFAMILLEID LEFT JOIN FETCH t.lgGROSSISTEID"
                    + " LEFT JOIN FETCH t.lgUSERID" + where
                    + " ORDER BY t.strREFLIVRAISON, t.lgFAMILLEID.strDESCRIPTION, t.dtCREATED DESC";
            String count = "SELECT COUNT(t) FROM TWarehouse t" + where;
            TypedQuery<TWarehouse> q = odataManager.getEm().createQuery(select, TWarehouse.class);
            TypedQuery<Long> qCount = odataManager.getEm().createQuery(count, Long.class);
            for (TypedQuery<?> query : new TypedQuery<?>[] { q, qCount }) {
                query.setParameter("statut", Constant.STATUT_ENABLE);
                query.setParameter("search", (search == null || search.isEmpty() ? MATCH_ALL : search) + "%");
                if (dtDebut != null) {
                    query.setParameter("debut", dtDebut);
                }
                if (dtFin != null) {
                    query.setParameter("fin", dtFin);
                }
                if (hasGrossiste) {
                    query.setParameter("grossiste", grossisteId.trim());
                }
                if (hasFamilleArticle) {
                    query.setParameter("famArt", familleArticleId.trim());
                }
                if (hasZoneGeo) {
                    query.setParameter("zone", zoneGeoId.trim());
                }
            }
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<TWarehouse> page = q.getResultList();
            int total = all ? page.size() : qCount.getSingleResult().intValue();
            for (TWarehouse elem : page) {
                rows.add(entreeRow(elem));
            }
            return new Rows(total, rows);
        }
        WarehouseManager warehouseManager = new WarehouseManager(odataManager, user);
        List<EntityData> datas = warehouseManager.getEntreeDepot(MATCH_ALL, dtDebut, dtFin);
        for (EntityData data : slice(datas, all, start, limit)) {
            rows.add(entreeDepotRow(data));
        }
        return new Rows(datas.size(), rows);
    }

    private JSONObject entreeRow(TWarehouse elem) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("dt_DAY", format(formatterOrange, elem.getDtCREATED()));
        json.put("int_NUMBER_ENTREE", elem.getIntNUMBER());
        json.put("int_PRICE", elem.getIntNUMBER() * (elem.getLgFAMILLEID().getDblPRIXMOYENPONDERE() != null
                ? elem.getLgFAMILLEID().getDblPRIXMOYENPONDERE() : 0d));
        json.put("lg_USER_ID", userName(elem.getLgUSERID()));
        json.put("lg_GROSSISTE_ID", elem.getLgGROSSISTEID() != null ? elem.getLgGROSSISTEID().getStrLIBELLE() : "");
        json.put("int_NUM_LOT", elem.getIntNUMLOT());
        json.put("lg_FAMILLE_ID", elem.getLgFAMILLEID().getLgFAMILLEID());
        json.put("int_CIP", elem.getLgFAMILLEID().getIntCIP());
        json.put("int_NUMBER", elem.getIntNUMBER());
        json.put("str_NAME", elem.getLgFAMILLEID().getStrNAME());
        // colonne Date = date du mouvement (l'ancien code y mettait la péremption, souvent vide)
        json.put("dt_UPDATED", format(formatterShort, elem.getDtCREATED()));
        json.put("dt_LAST_VENTE", format(timeFormat, elem.getDtCREATED()));
        json.put("dt_PEREMPTION", format(formatterShort, elem.getDtPEREMPTION()));
        json.put("str_ACTION", "Entrée en stock");
        json.put("_ts", tsOf(elem.getDtCREATED()));
        return json;
    }

    private JSONObject entreeDepotRow(EntityData data) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("dt_DAY", data.getStr_value1());
        json.put("int_NUMBER_ENTREE", data.getStr_value2());
        json.put("int_PRICE", data.getStr_value3());
        json.put("lg_USER_ID", data.getStr_value4());
        json.put("lg_GROSSISTE_ID", data.getStr_value5());
        json.put("int_NUM_LOT", "");
        json.put("lg_FAMILLE_ID", data.getStr_value6());
        json.put("int_CIP", data.getStr_value7());
        json.put("str_NAME", data.getStr_value8());
        json.put("str_ACTION", "Entrée en stock");
        return json;
    }

    // --- PERIME : équivalent ws_data_mouvement_perime.jsp (libellé métier « Saisie en périmés ») ---
    private Rows fetchPerimes(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        // Requête dédiée : l'ancienne listTFamilleSendToPerime faisait une jointure interne implicite sur le
        // grossiste (t.lgGROSSISTEID.lgGROSSISTEID LIKE ...), or une saisie de périmés ne renseigne jamais
        // lgGROSSISTEID -> toutes les saisies (même validées) étaient exclues. Ici le grossiste n'est joint que
        // s'il est explicitement filtré. Statut = "delete" (périmé validé, mouvement de stock effectif).
        // Bornes de dates en comparaison directe sur la colonne (pas de FUNCTION('DATE', ...) qui empêcherait
        // l'usage de l'index). Bornes optionnelles : si nulles, aucune restriction (tout l'historique).
        StringBuilder jpql = new StringBuilder("SELECT t FROM TWarehouse t JOIN FETCH t.lgFAMILLEID"
                + " LEFT JOIN FETCH t.lgGROSSISTEID LEFT JOIN FETCH t.lgUSERID WHERE t.strSTATUT = :statut"
                + " AND (t.lgFAMILLEID.strDESCRIPTION LIKE :search OR t.lgFAMILLEID.intCIP LIKE :search"
                + " OR t.lgFAMILLEID.strNAME LIKE :search OR t.lgFAMILLEID.intEAN13 LIKE :search)");
        if (dtDebut != null) {
            jpql.append(" AND t.dtUPDATED >= :debut");
        }
        if (dtFin != null) {
            jpql.append(" AND t.dtUPDATED <= :fin");
        }
        boolean hasGrossiste = isSet(grossisteId);
        boolean hasFamilleArticle = isSet(familleArticleId);
        boolean hasZoneGeo = isSet(zoneGeoId);
        if (hasGrossiste) {
            jpql.append(" AND t.lgGROSSISTEID.lgGROSSISTEID = :grossiste");
        }
        if (hasFamilleArticle) {
            jpql.append(" AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID = :famArt");
        }
        if (hasZoneGeo) {
            jpql.append(" AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :zone");
        }
        jpql.append(" ORDER BY t.dtUPDATED DESC");
        TypedQuery<TWarehouse> q = odataManager.getEm().createQuery(jpql.toString(), TWarehouse.class);
        q.setParameter("statut", Constant.STATUT_DELETE);
        q.setParameter("search", (search == null || search.isEmpty() ? MATCH_ALL : search) + "%");
        if (dtDebut != null) {
            q.setParameter("debut", dtDebut);
        }
        if (dtFin != null) {
            q.setParameter("fin", dtFin);
        }
        if (hasGrossiste) {
            q.setParameter("grossiste", grossisteId.trim());
        }
        if (hasFamilleArticle) {
            q.setParameter("famArt", familleArticleId.trim());
        }
        if (hasZoneGeo) {
            q.setParameter("zone", zoneGeoId.trim());
        }
        List<TWarehouse> datas = q.getResultList();
        List<JSONObject> rows = new ArrayList<>();
        for (TWarehouse elem : slice(datas, all, start, limit)) {
            JSONObject json = new JSONObject();
            json.put("dt_DAY", format(formatterShort, elem.getDtUPDATED()));
            json.put("int_NUMBER_PERIME", elem.getIntNUMBERDELETE());
            json.put("int_PRICE", elem.getIntNUMBERDELETE()
                    * (elem.getLgFAMILLEID().getIntPRICE() != null ? elem.getLgFAMILLEID().getIntPRICE() : 0));
            json.put("lg_USER_ID", userName(elem.getLgUSERID()));
            json.put("lg_GROSSISTE_ID", elem.getLgGROSSISTEID() != null ? elem.getLgGROSSISTEID().getStrLIBELLE() : "");
            json.put("int_NUM_LOT", elem.getIntNUMLOT());
            json.put("dt_UPDATED", format(formatterShort, elem.getDtUPDATED()));
            json.put("str_CODE_TAUX_REMBOURSEMENT", format(formatterShort, elem.getDtPEREMPTION()));
            // champs article absents de la JSP historique (colonnes vides à l'écran) : complétés ici
            json.put("lg_FAMILLE_ID", elem.getLgFAMILLEID().getLgFAMILLEID());
            json.put("int_CIP", elem.getLgFAMILLEID().getIntCIP());
            json.put("int_NUMBER", elem.getIntNUMBERDELETE());
            json.put("str_NAME", elem.getLgFAMILLEID().getStrNAME());
            json.put("dt_LAST_VENTE", format(timeFormat, elem.getDtUPDATED()));
            json.put("str_ACTION", "Saisie en périmés");
            json.put("_ts", tsOf(elem.getDtUPDATED()));
            rows.add(json);
        }
        return new Rows(datas.size(), rows);
    }

    // --- RETOURFOURNISSEUR : équivalent ws_data_mouvement_retour.jsp ---
    private Rows fetchRetours(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        // Requête dédiée : l'ancienne listTRetourFournisseurDetail (9 args) restreignait aux retours validés
        // (statut enable) ET à l'emplacement de l'utilisateur qui consulte, masquant les retours saisis
        // (is_Process) ou faits depuis un autre emplacement. Ici : tous les retours actifs, sans filtre emplacement.
        // Bornes de dates directes sur la colonne (index) et optionnelles (nulles = tout l'historique). Aucun filtre
        // de statut : un retour à peine saisi (is_Process) ou non validé en avoir doit rester visible. Aucun filtre
        // d'emplacement non plus.
        StringBuilder jpql = new StringBuilder("SELECT t FROM TRetourFournisseurDetail t"
                + " JOIN FETCH t.lgRETOURFRSID JOIN FETCH t.lgFAMILLEID LEFT JOIN FETCH t.lgMOTIFRETOUR WHERE"
                + " (t.lgFAMILLEID.strDESCRIPTION LIKE :search OR t.lgFAMILLEID.intCIP LIKE :search"
                + " OR t.lgFAMILLEID.strNAME LIKE :search OR t.lgFAMILLEID.intEAN13 LIKE :search)");
        if (dtDebut != null) {
            jpql.append(" AND t.lgRETOURFRSID.dtCREATED >= :debut");
        }
        if (dtFin != null) {
            jpql.append(" AND t.lgRETOURFRSID.dtCREATED <= :fin");
        }
        boolean hasGrossiste = isSet(grossisteId);
        boolean hasFamilleArticle = isSet(familleArticleId);
        boolean hasZoneGeo = isSet(zoneGeoId);
        if (hasGrossiste) {
            jpql.append(" AND t.lgRETOURFRSID.lgGROSSISTEID.lgGROSSISTEID = :grossiste");
        }
        if (hasFamilleArticle) {
            jpql.append(" AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID = :famArt");
        }
        if (hasZoneGeo) {
            jpql.append(" AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :zone");
        }
        jpql.append(" ORDER BY t.lgRETOURFRSID.dtCREATED DESC");
        TypedQuery<TRetourFournisseurDetail> q = odataManager.getEm().createQuery(jpql.toString(),
                TRetourFournisseurDetail.class);
        q.setParameter("search", (search == null || search.isEmpty() ? MATCH_ALL : search) + "%");
        if (dtDebut != null) {
            q.setParameter("debut", dtDebut);
        }
        if (dtFin != null) {
            q.setParameter("fin", dtFin);
        }
        if (hasGrossiste) {
            q.setParameter("grossiste", grossisteId.trim());
        }
        if (hasFamilleArticle) {
            q.setParameter("famArt", familleArticleId.trim());
        }
        if (hasZoneGeo) {
            q.setParameter("zone", zoneGeoId.trim());
        }
        List<TRetourFournisseurDetail> datas = q.getResultList();
        List<JSONObject> rows = new ArrayList<>();
        for (TRetourFournisseurDetail elem : slice(datas, all, start, limit)) {
            JSONObject json = new JSONObject();
            json.put("dt_DAY", format(formatterShort, elem.getLgRETOURFRSID().getDtCREATED()));
            json.put("int_NUMBER_VENTE", elem.getIntNUMBERRETURN());
            json.put("int_NUMBER_DEBUT",
                    elem.getLgMOTIFRETOUR() != null ? elem.getLgMOTIFRETOUR().getStrLIBELLE() : "");
            json.put("lg_USER_ID", userName(elem.getLgRETOURFRSID().getLgUSERID()));
            json.put("lg_GROSSISTE_ID", elem.getLgRETOURFRSID().getLgGROSSISTEID() != null
                    ? elem.getLgRETOURFRSID().getLgGROSSISTEID().getStrLIBELLE() : "");
            json.put("lg_FAMILLE_ID", elem.getLgFAMILLEID().getLgFAMILLEID());
            json.put("int_CIP", elem.getLgFAMILLEID().getIntCIP());
            json.put("int_NUMBER", elem.getIntNUMBERRETURN());
            json.put("str_NAME", elem.getLgFAMILLEID().getStrNAME());
            json.put("dt_UPDATED", format(formatterShort, elem.getLgRETOURFRSID().getDtCREATED()));
            json.put("dt_LAST_VENTE", format(timeFormat, elem.getLgRETOURFRSID().getDtCREATED()));
            json.put("str_ACTION", "Retour four.");
            json.put("_ts", tsOf(elem.getLgRETOURFRSID().getDtCREATED()));
            rows.add(json);
        }
        return new Rows(datas.size(), rows);
    }

    // --- VENTE : équivalent ws_data_mouvement_vente.jsp ; le filtre grossiste (nouveau) passe par le
    // grossiste par défaut du produit (TFamille.lgGROSSISTEID), une vente n'ayant pas de grossiste direct ---
    private Rows fetchVentes(String search, String grossisteId, String familleArticleId, String zoneGeoId, Date dtDebut,
            Date dtFin, boolean all, int start, int limit) throws JSONException {
        // Requête dédiée index-friendly : l'ancienne listTPreenregistrementDetail enveloppait la date dans
        // FUNCTION('DATE', ...), empêchant l'usage de l'index (lenteur observée). JOIN FETCH de la vente et du
        // produit pour éviter le N+1. Statut is_Closed = vente clôturée (mouvement de stock effectif). Le filtre
        // grossiste reste appliqué en mémoire via le grossiste par défaut du produit.
        StringBuilder jpql = new StringBuilder("SELECT t FROM TPreenregistrementDetail t"
                + " JOIN FETCH t.lgPREENREGISTREMENTID JOIN FETCH t.lgFAMILLEID"
                + " WHERE t.lgPREENREGISTREMENTID.strSTATUT = :statut"
                + " AND (t.lgFAMILLEID.strDESCRIPTION LIKE :search OR t.lgFAMILLEID.intCIP LIKE :search"
                + " OR t.lgFAMILLEID.strNAME LIKE :search OR t.lgFAMILLEID.intEAN13 LIKE :search)");
        if (dtDebut != null) {
            jpql.append(" AND t.lgPREENREGISTREMENTID.dtUPDATED >= :debut");
        }
        if (dtFin != null) {
            jpql.append(" AND t.lgPREENREGISTREMENTID.dtUPDATED <= :fin");
        }
        boolean hasFamilleArticle = isSet(familleArticleId);
        boolean hasZoneGeo = isSet(zoneGeoId);
        if (hasFamilleArticle) {
            jpql.append(" AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID = :famArt");
        }
        if (hasZoneGeo) {
            jpql.append(" AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :zone");
        }
        jpql.append(" ORDER BY t.lgPREENREGISTREMENTID.dtUPDATED DESC");
        TypedQuery<TPreenregistrementDetail> q = odataManager.getEm().createQuery(jpql.toString(),
                TPreenregistrementDetail.class);
        q.setParameter("statut", Constant.STATUT_IS_CLOSED);
        q.setParameter("search", (search == null || search.isEmpty() ? MATCH_ALL : search) + "%");
        if (dtDebut != null) {
            q.setParameter("debut", dtDebut);
        }
        if (dtFin != null) {
            q.setParameter("fin", dtFin);
        }
        if (hasFamilleArticle) {
            q.setParameter("famArt", familleArticleId.trim());
        }
        if (hasZoneGeo) {
            q.setParameter("zone", zoneGeoId.trim());
        }
        List<TPreenregistrementDetail> datas = q.getResultList();
        if (isSet(grossisteId)) {
            List<TPreenregistrementDetail> filtered = new ArrayList<>();
            for (TPreenregistrementDetail elem : datas) {
                if (elem.getLgFAMILLEID().getLgGROSSISTEID() != null
                        && grossisteId.trim().equals(elem.getLgFAMILLEID().getLgGROSSISTEID().getLgGROSSISTEID())) {
                    filtered.add(elem);
                }
            }
            datas = filtered;
        }
        List<JSONObject> rows = new ArrayList<>();
        for (TPreenregistrementDetail elem : slice(datas, all, start, limit)) {
            JSONObject json = new JSONObject();
            json.put("dt_DAY", format(formatterShort, elem.getLgPREENREGISTREMENTID().getDtUPDATED()));
            json.put("int_NUMBER_VENTE",
                    elem.getIntQUANTITY() + (elem.getIntFREEPACKNUMBER() != null ? elem.getIntFREEPACKNUMBER() : 0));
            json.put("int_NUMBER_RETOUR", elem.getIntPRICE());
            json.put("lg_USER_ID", userName(elem.getLgPREENREGISTREMENTID().getLgUSERID()));
            json.put("str_CODE_TAUX_REMBOURSEMENT", elem.getLgPREENREGISTREMENTID().getLgTYPEVENTEID() != null
                    ? elem.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getStrNAME() : "");
            json.put("lg_FAMILLE_ID", elem.getLgFAMILLEID().getLgFAMILLEID());
            json.put("int_CIP", elem.getLgFAMILLEID().getIntCIP());
            json.put("int_NUMBER", elem.getIntQUANTITY());
            json.put("str_NAME", elem.getLgFAMILLEID().getStrDESCRIPTION());
            json.put("dt_UPDATED", format(formatterShort, elem.getLgPREENREGISTREMENTID().getDtUPDATED()));
            json.put("dt_LAST_VENTE", format(timeFormat, elem.getLgPREENREGISTREMENTID().getDtUPDATED()));
            json.put("str_ACTION", "Vente");
            json.put("_ts", tsOf(elem.getLgPREENREGISTREMENTID().getDtUPDATED()));
            rows.add(json);
        }
        return new Rows(datas.size(), rows);
    }

    // --- AJUSTEMENT : nouveau type, requête dédiée sur les détails d'ajustement ---
    private Rows fetchAjustements(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        StringBuilder jpql = new StringBuilder("SELECT t FROM TAjustementDetail t"
                + " JOIN FETCH t.lgFAMILLEID JOIN FETCH t.lgAJUSTEMENTID LEFT JOIN FETCH t.typeAjustement WHERE"
                + " (t.lgFAMILLEID.strDESCRIPTION LIKE :search OR t.lgFAMILLEID.intCIP LIKE :search"
                + " OR t.lgFAMILLEID.strNAME LIKE :search OR t.lgFAMILLEID.intEAN13 LIKE :search)"
                + " AND t.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID = :emplacement");
        if (dtDebut != null) {
            jpql.append(" AND t.dtUPDATED >= :debut");
        }
        if (dtFin != null) {
            jpql.append(" AND t.dtUPDATED <= :fin");
        }
        boolean hasGrossiste = isSet(grossisteId);
        boolean hasFamilleArticle = isSet(familleArticleId);
        boolean hasZoneGeo = isSet(zoneGeoId);
        if (hasGrossiste) {
            jpql.append(" AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID = :grossiste");
        }
        if (hasFamilleArticle) {
            jpql.append(" AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID = :famArt");
        }
        if (hasZoneGeo) {
            jpql.append(" AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :zone");
        }
        jpql.append(" ORDER BY t.dtUPDATED DESC");
        TypedQuery<TAjustementDetail> q = odataManager.getEm().createQuery(jpql.toString(), TAjustementDetail.class);
        q.setParameter("search", (search == null || search.isEmpty() ? MATCH_ALL : search) + "%");
        q.setParameter("emplacement", user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        if (dtDebut != null) {
            q.setParameter("debut", dtDebut);
        }
        if (dtFin != null) {
            q.setParameter("fin", dtFin);
        }
        if (hasGrossiste) {
            q.setParameter("grossiste", grossisteId.trim());
        }
        if (hasFamilleArticle) {
            q.setParameter("famArt", familleArticleId.trim());
        }
        if (hasZoneGeo) {
            q.setParameter("zone", zoneGeoId.trim());
        }
        List<TAjustementDetail> datas = q.getResultList();
        List<JSONObject> rows = new ArrayList<>();
        for (TAjustementDetail elem : slice(datas, all, start, limit)) {
            JSONObject json = new JSONObject();
            json.put("dt_DAY", format(formatterShort, elem.getDtCREATED()));
            json.put("lg_USER_ID",
                    elem.getLgAJUSTEMENTID() != null ? userName(elem.getLgAJUSTEMENTID().getLgUSERID()) : "");
            json.put("lg_FAMILLE_ID", elem.getLgFAMILLEID().getLgFAMILLEID());
            json.put("int_CIP", elem.getLgFAMILLEID().getIntCIP());
            json.put("int_NUMBER", elem.getIntNUMBER());
            json.put("int_NUMBER_CURRENT_STOCK", elem.getIntNUMBERCURRENTSTOCK());
            json.put("int_NUMBER_AFTER_STOCK", elem.getIntNUMBERAFTERSTOCK());
            json.put("str_MOTIF", elem.getTypeAjustement() != null ? elem.getTypeAjustement().getLibelle() : "");
            json.put("str_NAME", elem.getLgFAMILLEID().getStrNAME());
            json.put("dt_UPDATED", format(formatterShort, elem.getDtUPDATED()));
            json.put("dt_LAST_VENTE", format(timeFormat, elem.getDtUPDATED()));
            json.put("str_ACTION", "Ajustement");
            rows.add(json);
        }
        return new Rows(datas.size(), rows);
    }

    // --- utilitaires ---

    private static <T> List<T> slice(List<T> datas, boolean all, int start, int limit) {
        if (all) {
            return datas;
        }
        if (start >= datas.size() || start < 0) {
            return new ArrayList<>();
        }
        return datas.subList(start, Math.min(start + Math.max(limit, 0), datas.size()));
    }

    private static String likeParam(String value) {
        return value == null || value.trim().isEmpty() ? MATCH_ALL : value.trim();
    }

    // un filtre est "renseigné" s'il n'est ni vide ni le joker "%%"
    private static boolean isSet(String value) {
        return value != null && !value.trim().isEmpty() && !MATCH_ALL.equals(value.trim());
    }

    private static String userName(TUser u) {
        return u != null ? u.getStrFIRSTNAME() + " " + u.getStrLASTNAME() : "";
    }

    private static String format(SimpleDateFormat fmt, Date value) {
        return value != null ? fmt.format(value) : "";
    }

    // horodatage (epoch millis) servant uniquement au tri chronologique du type agrégé « Tous »
    private static long tsOf(Date value) {
        return value != null ? value.getTime() : 0L;
    }

    private static JSONArray toArray(List<JSONObject> rows) {
        JSONArray array = new JSONArray();
        for (JSONObject row : rows) {
            array.put(row);
        }
        return array;
    }

    private Date parseIso(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            return isoDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean isEmptyIso(String value) {
        return value == null || value.trim().isEmpty();
    }

    // borne basse (00:00:00) d'une date ISO, ou null si absente
    private Date dayStart(String iso) {
        Date d = parseIso(iso);
        return d == null ? null : atTime(d, 0, 0, 0);
    }

    // borne haute (23:59:59) d'une date ISO, ou null si absente
    private Date dayEnd(String iso) {
        Date d = parseIso(iso);
        return d == null ? null : atTime(d, 23, 59, 59);
    }

    private static Date atTime(Date day, int hour, int minute, int second) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(day);
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, second);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTime();
    }
}
