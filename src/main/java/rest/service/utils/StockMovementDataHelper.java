package rest.service.utils;

import bll.commandeManagement.retourFournisseurManagement;
import bll.entity.EntityData;
import bll.teller.SnapshotManager;
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
import javax.persistence.TemporalType;
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

/**
 * Source de données de l'écran « Point détaillé entrée/sortie » (API v1/stock-movements). Réutilise les managers BLL
 * historiques appelés par les JSP ws_data_mouvement_*.jsp afin de produire strictement les mêmes résultats et les
 * mêmes noms de champs JSON que l'écran actuel (stratégie anti-régression de la refonte REST).
 */
public final class StockMovementDataHelper implements AutoCloseable {

    private static final Logger LOG = Logger.getLogger(StockMovementDataHelper.class.getName());

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
     * Liste paginée au format attendu par le reader ExtJS actuel : {success, total, results}.
     */
    public JSONObject list(StockMovementFilterDTO filter, int start, int limit) throws JSONException {
        Rows rows = fetchRows(filter, false, start, limit);
        return new JSONObject().put("success", true).put("total", rows.total).put("results", toArray(rows.page));
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
        try (StringWriter writer = new StringWriter();
                CSVPrinter printer = new CSVPrinter(writer,
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
        String type = filter.getTransactionType() == null || filter.getTransactionType().trim().isEmpty()
                ? TYPE_ENTREESTOCK : filter.getTransactionType().trim().toUpperCase();
        String search = filter.getSearchValue() != null ? filter.getSearchValue().trim() : "";
        String grossisteId = likeParam(filter.getGrossisteId());
        String familleArticleId = likeParam(filter.getFamilleArticleId());
        String zoneGeoId = likeParam(filter.getZoneGeoId());
        Date[] periode = resolvePeriode(filter.getDateDebut(), filter.getDateFin());
        Date dtDebut = periode[0];
        Date dtFin = periode[1];

        try {
            switch (type) {
            case TYPE_PERIME:
                return fetchPerimes(search, grossisteId, familleArticleId, zoneGeoId, dtDebut, dtFin, all, start,
                        limit);
            case TYPE_RETOURFOURNISSEUR:
                return fetchRetours(search, grossisteId, familleArticleId, zoneGeoId, dtDebut, dtFin, all, start,
                        limit);
            case TYPE_VENTE:
                return fetchVentes(search, filter.getGrossisteId(), familleArticleId, zoneGeoId, dtDebut, dtFin, all,
                        start, limit);
            case TYPE_AJUSTEMENT:
                return fetchAjustements(search, filter.getGrossisteId(), filter.getFamilleArticleId(),
                        filter.getZoneGeoId(), dtDebut, dtFin, all, start, limit);
            case TYPE_ENTREESTOCK:
            default:
                return fetchEntrees(search, grossisteId, familleArticleId, zoneGeoId, dtDebut, dtFin, all, start,
                        limit);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchRows " + type, e);
            return new Rows(0, new ArrayList<>());
        }
    }

    // --- ENTREESTOCK : équivalent ws_data_mouvement_entree.jsp ---
    private Rows fetchEntrees(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        WarehouseManager warehouseManager = new WarehouseManager(odataManager, user);
        List<JSONObject> rows = new ArrayList<>();
        if ("1".equals(user.getLgEMPLACEMENTID().getLgEMPLACEMENTID())) {
            String dtDebutIso = isoDate.format(dtDebut);
            String dtFinIso = isoDate.format(dtFin);
            List<TWarehouse> page = warehouseManager.listeWarehouses(search, MATCH_ALL, dtDebutIso, dtFinIso,
                    grossisteId, MATCH_ALL, familleArticleId, zoneGeoId, all, start, limit);
            int total = all ? page.size()
                    : warehouseManager.listeWarehouses(search, MATCH_ALL, dtDebutIso, dtFinIso, grossisteId, MATCH_ALL,
                            familleArticleId, zoneGeoId);
            for (TWarehouse elem : page) {
                rows.add(entreeRow(elem));
            }
            return new Rows(total, rows);
        }
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
        json.put("int_PRICE",
                elem.getIntNUMBER() * (elem.getLgFAMILLEID().getDblPRIXMOYENPONDERE() != null
                        ? elem.getLgFAMILLEID().getDblPRIXMOYENPONDERE() : 0d));
        json.put("lg_USER_ID", userName(elem.getLgUSERID()));
        json.put("lg_GROSSISTE_ID",
                elem.getLgGROSSISTEID() != null ? elem.getLgGROSSISTEID().getStrLIBELLE() : "");
        json.put("int_NUM_LOT", elem.getIntNUMLOT());
        json.put("lg_FAMILLE_ID", elem.getLgFAMILLEID().getLgFAMILLEID());
        json.put("int_CIP", elem.getLgFAMILLEID().getIntCIP());
        json.put("int_NUMBER", elem.getIntNUMBER());
        json.put("str_NAME", elem.getLgFAMILLEID().getStrNAME());
        json.put("dt_UPDATED", format(formatterShort, elem.getDtPEREMPTION()));
        json.put("dt_LAST_VENTE", format(timeFormat, elem.getDtUPDATED()));
        json.put("str_ACTION", "Entrée en stock");
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
        WarehouseManager warehouseManager = new WarehouseManager(odataManager);
        List<TWarehouse> datas = warehouseManager.listTFamilleSendToPerime(search, MATCH_ALL, dtDebut, dtFin,
                grossisteId, MATCH_ALL, familleArticleId, zoneGeoId);
        List<JSONObject> rows = new ArrayList<>();
        for (TWarehouse elem : slice(datas, all, start, limit)) {
            JSONObject json = new JSONObject();
            json.put("dt_DAY", format(formatterShort, elem.getDtUPDATED()));
            json.put("int_NUMBER_PERIME", elem.getIntNUMBERDELETE());
            json.put("int_PRICE",
                    elem.getIntNUMBERDELETE() * (elem.getLgFAMILLEID().getIntPRICE() != null
                            ? elem.getLgFAMILLEID().getIntPRICE() : 0));
            json.put("lg_USER_ID", userName(elem.getLgUSERID()));
            json.put("lg_GROSSISTE_ID",
                    elem.getLgGROSSISTEID() != null ? elem.getLgGROSSISTEID().getStrLIBELLE() : "");
            json.put("int_NUM_LOT", elem.getIntNUMLOT());
            json.put("dt_UPDATED", format(timeFormat, elem.getDtUPDATED()));
            json.put("str_CODE_TAUX_REMBOURSEMENT", format(formatterShort, elem.getDtPEREMPTION()));
            // champs article absents de la JSP historique (colonnes vides à l'écran) : complétés ici
            json.put("lg_FAMILLE_ID", elem.getLgFAMILLEID().getLgFAMILLEID());
            json.put("int_CIP", elem.getLgFAMILLEID().getIntCIP());
            json.put("int_NUMBER", elem.getIntNUMBERDELETE());
            json.put("str_NAME", elem.getLgFAMILLEID().getStrNAME());
            json.put("dt_LAST_VENTE", format(timeFormat, elem.getDtUPDATED()));
            json.put("str_ACTION", "Saisie en périmés");
            rows.add(json);
        }
        return new Rows(datas.size(), rows);
    }

    // --- RETOURFOURNISSEUR : équivalent ws_data_mouvement_retour.jsp ---
    private Rows fetchRetours(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        retourFournisseurManagement retourManagement = new retourFournisseurManagement(odataManager, user);
        List<TRetourFournisseurDetail> datas = retourManagement.listTRetourFournisseurDetail(search, dtDebut, dtFin,
                MATCH_ALL, MATCH_ALL, grossisteId, MATCH_ALL, familleArticleId, zoneGeoId);
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
            json.put("dt_UPDATED", format(timeFormat, elem.getLgRETOURFRSID().getDtCREATED()));
            json.put("str_ACTION", "Retour four.");
            rows.add(json);
        }
        return new Rows(datas.size(), rows);
    }

    // --- VENTE : équivalent ws_data_mouvement_vente.jsp ; le filtre grossiste (nouveau) passe par le
    // grossiste par défaut du produit (TFamille.lgGROSSISTEID), une vente n'ayant pas de grossiste direct ---
    private Rows fetchVentes(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        SnapshotManager snapshotManager = new SnapshotManager(odataManager, user);
        List<TPreenregistrementDetail> datas = snapshotManager.listTPreenregistrementDetail(search, dtDebut, dtFin,
                MATCH_ALL, MATCH_ALL, MATCH_ALL, MATCH_ALL, familleArticleId, zoneGeoId);
        if (grossisteId != null && !grossisteId.trim().isEmpty()) {
            List<TPreenregistrementDetail> filtered = new ArrayList<>();
            for (TPreenregistrementDetail elem : datas) {
                if (elem.getLgFAMILLEID().getLgGROSSISTEID() != null
                        && grossisteId.equals(elem.getLgFAMILLEID().getLgGROSSISTEID().getLgGROSSISTEID())) {
                    filtered.add(elem);
                }
            }
            datas = filtered;
        }
        List<JSONObject> rows = new ArrayList<>();
        for (TPreenregistrementDetail elem : slice(datas, all, start, limit)) {
            JSONObject json = new JSONObject();
            json.put("dt_DAY", format(formatterShort, elem.getLgPREENREGISTREMENTID().getDtUPDATED()));
            json.put("int_NUMBER_VENTE", elem.getIntQUANTITY()
                    + (elem.getIntFREEPACKNUMBER() != null ? elem.getIntFREEPACKNUMBER() : 0));
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
            rows.add(json);
        }
        return new Rows(datas.size(), rows);
    }

    // --- AJUSTEMENT : nouveau type, requête dédiée sur les détails d'ajustement ---
    private Rows fetchAjustements(String search, String grossisteId, String familleArticleId, String zoneGeoId,
            Date dtDebut, Date dtFin, boolean all, int start, int limit) throws JSONException {
        StringBuilder jpql = new StringBuilder(
                "SELECT t FROM TAjustementDetail t WHERE ( FUNCTION('DATE', t.dtUPDATED) >= FUNCTION('DATE', ?3)"
                        + " AND FUNCTION('DATE', t.dtUPDATED) <= FUNCTION('DATE', ?4) )"
                        + " AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1"
                        + " OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1)"
                        + " AND t.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID = ?5");
        boolean hasGrossiste = grossisteId != null && !grossisteId.trim().isEmpty();
        boolean hasFamilleArticle = familleArticleId != null && !familleArticleId.trim().isEmpty();
        boolean hasZoneGeo = zoneGeoId != null && !zoneGeoId.trim().isEmpty();
        if (hasGrossiste) {
            jpql.append(" AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID = ?6");
        }
        if (hasFamilleArticle) {
            jpql.append(" AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID = ?7");
        }
        if (hasZoneGeo) {
            jpql.append(" AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = ?8");
        }
        jpql.append(" ORDER BY t.dtUPDATED DESC");
        TypedQuery<TAjustementDetail> q = odataManager.getEm().createQuery(jpql.toString(), TAjustementDetail.class);
        q.setParameter(1, (search.isEmpty() ? MATCH_ALL : search) + "%");
        q.setParameter(3, dtDebut, TemporalType.DATE);
        q.setParameter(4, dtFin, TemporalType.DATE);
        q.setParameter(5, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        if (hasGrossiste) {
            q.setParameter(6, grossisteId.trim());
        }
        if (hasFamilleArticle) {
            q.setParameter(7, familleArticleId.trim());
        }
        if (hasZoneGeo) {
            q.setParameter(8, zoneGeoId.trim());
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

    private static String userName(TUser u) {
        return u != null ? u.getStrFIRSTNAME() + " " + u.getStrLASTNAME() : "";
    }

    private static String format(SimpleDateFormat fmt, Date value) {
        return value != null ? fmt.format(value) : "";
    }

    private static JSONArray toArray(List<JSONObject> rows) {
        JSONArray array = new JSONArray();
        for (JSONObject row : rows) {
            array.put(row);
        }
        return array;
    }

    /**
     * Bornes inclusives de la période : dateDebut à 00:00:00 et dateFin à 23:59:59 ; les deux valent aujourd'hui si
     * absentes (comportement des JSP historiques).
     */
    private Date[] resolvePeriode(String dateDebut, String dateFin) {
        Date debut = parseIso(dateDebut);
        Date fin = parseIso(dateFin);
        if (debut == null) {
            debut = new Date();
        }
        if (fin == null) {
            fin = new Date();
        }
        return new Date[] { atTime(debut, 0, 0, 0), atTime(fin, 23, 59, 59) };
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
