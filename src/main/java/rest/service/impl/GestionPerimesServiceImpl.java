/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.Params;
import commonTasks.dto.PerimesDTO;
import dal.Notification;
import dal.TEmplacement;
import dal.TEventLog;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TUser;
import dal.TWarehouse;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.GestionPerimesService;
import rest.service.NotificationService;
import rest.service.SuggestionService;
import util.Constant;
import util.DateCommonUtils;
import util.NotificationUtils;

/**
 *
 * @author koben
 */
@Stateless
public class GestionPerimesServiceImpl implements GestionPerimesService {

    private static final Logger LOG = Logger.getLogger(GestionPerimesServiceImpl.class.getName());
    private static final String P_CLOTURE_SAISIE_PERIMES = "P_CLOTURE_SAISIE_PERIMES";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SuggestionService suggestionService;
    @EJB
    NotificationService notificationService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject addPerime(String lgFAMILLEID, Integer intNUMBER, String intLot, String dtPeremption, TUser user) {
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        /*
         * audit 06 PE-01, PE-02, PE-04 : toutes les lignes en cours du produit dans cet emplacement, quelle que soit
         * leur date
         */
        List<TWarehouse> list = checkIsExist(lgFAMILLEID, empl);
        if (list.isEmpty()) {
            return update(lgFAMILLEID, intNUMBER, empl, dtPeremption, user, intLot);
        } else {

            TWarehouse tw = list.stream().filter(w -> Objects.equals(w.getIntNUMLOT(), intLot)).findFirst()
                    .orElse(null);
            if (tw != null) {
                return updateStock(tw, intNUMBER, empl, list);
            } else {
                return updateFamillyStock(user, lgFAMILLEID, intNUMBER, intLot, dtPeremption, list, empl);
            }
        }
    }

    /** lignes en cours (non cloturees) du produit, saisies par les utilisateurs de cet emplacement */
    private List<TWarehouse> checkIsExist(String lgFAMILLEID, String emplacementId) {
        return getEntityManager()
                .createQuery(
                        "SELECT o FROM TWarehouse o WHERE o.lgFAMILLEID.lgFAMILLEID = ?1 AND o.strSTATUT = ?2"
                                + " AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3 ORDER BY o.dtCREATED",
                        TWarehouse.class)
                .setParameter(1, lgFAMILLEID).setParameter(2, Constant.STATUT_PENDING).setParameter(3, emplacementId)
                .getResultList();
    }

    /**
     * toute la saisie en cours de cet emplacement (audit 06 PE-02 : quelle que soit la date ; PE-04 : par emplacement)
     */
    private List<TWarehouse> lignesEnCours(String emplacementId) {
        return getEntityManager().createQuery(
                "SELECT o FROM TWarehouse o WHERE o.strSTATUT = ?1 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2"
                        + " ORDER BY o.dtCREATED",
                TWarehouse.class).setParameter(1, Constant.STATUT_PENDING).setParameter(2, emplacementId)
                .getResultList();
    }

    private static int total(List<TWarehouse> lignes) {
        return lignes.stream().mapToInt(w -> Objects.requireNonNullElse(w.getIntNUMBER(), 0)).sum();
    }

    /**
     * Audit 06 PE-03 : la cloture diminue le reste des lots du produit : le lot saisi d'abord, puis les lots deja
     * perimes, puis les autres, par date de peremption.
     */
    private void sortirLots(String produitId, String numLot, int quantite) {
        @SuppressWarnings("unchecked")
        List<Object[]> lots = getEntityManager()
                .createNativeQuery("SELECT lg_LOT_ID, current_stock FROM t_lot"
                        + " WHERE lg_FAMILLE_ID = ?1 AND current_stock > 0"
                        + " ORDER BY (int_NUM_LOT = ?2) DESC, (dt_PEREMPTION <= NOW()) DESC, dt_PEREMPTION, dt_CREATED")
                .setParameter(1, produitId).setParameter(2, Objects.requireNonNullElse(numLot, "")).getResultList();
        int reste = quantite;
        for (Object[] l : lots) {
            if (reste <= 0) {
                break;
            }
            int pris = Math.min(reste, ((Number) l[1]).intValue());
            getEntityManager().createNativeQuery(
                    "UPDATE t_lot SET current_stock = current_stock - ?1, dt_UPDATED = NOW() WHERE lg_LOT_ID = ?2")
                    .setParameter(1, pris).setParameter(2, l[0]).executeUpdate();
            reste -= pris;
        }
    }

    private TFamilleStock getTProductItemStock(String lgFAMILLEID, String lgEMPLACEMENTID) {

        try {
            TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable'",
                    TFamilleStock.class).setParameter(1, lgFAMILLEID).setParameter(2, lgEMPLACEMENTID).setFirstResult(0)
                    .setMaxResults(1);
            return q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getTProductItemStock {0}", e);
            return null;
        }

    }

    public JSONObject updateStock(TWarehouse oWarehouse, Integer intNUMBER, String lgEMPLACEMENTID,
            List<TWarehouse> lignes) {

        JSONObject json = new JSONObject();

        try {

            TFamilleStock oFamilleStock = getTProductItemStock(oWarehouse.getLgFAMILLEID().getLgFAMILLEID(),
                    lgEMPLACEMENTID);
            /* audit 06 PE-01 : toutes les lignes du produit (tous lots), pas seulement celle de ce lot */
            if (oFamilleStock.getIntNUMBERAVAILABLE() < (intNUMBER + total(lignes))) {
                json.put("success", false);
                json.put("message",
                        "Cette ligne existe déjà avec quantité <span style='font-weight:900;'>"
                                + oWarehouse.getIntNUMBER()
                                + "</span>\n La somme des quantités saisies pour ce produit (tous lots : "
                                + (intNUMBER + total(lignes)) + ") est supérieure au stock ("
                                + oFamilleStock.getIntNUMBERAVAILABLE() + ")");
            } else {
                oWarehouse.setIntNUMBER(intNUMBER + oWarehouse.getIntNUMBER());
                oWarehouse.setStockFinal(oFamilleStock.getIntNUMBERAVAILABLE() - oWarehouse.getIntNUMBER());
                oWarehouse.setDtUPDATED(new Date());
                getEntityManager().merge(oWarehouse);
                json.put("success", true);

            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getTProductItemStock {0}", e);
        }
        return json;

    }

    public JSONObject updateFamillyStock(TUser lgUSERID, String lgID, Integer intNUMBER, String intNUMLOT,
            String dtPeremption, List<TWarehouse> list, String emplacement) {
        JSONObject json = new JSONObject();

        int totalCount = list.stream().map((tWarehouse) -> tWarehouse.getIntNUMBER()).reduce(0, Integer::sum);

        try {
            TFamille oProductItem = getEntityManager().find(TFamille.class, lgID);
            TFamilleStock oTFamilleStock = getTProductItemStock(lgID, emplacement);
            if (oTFamilleStock.getIntNUMBERAVAILABLE() < (intNUMBER + totalCount)) {
                json.put("success", false);
                json.put("message",
                        "La quantité correspondant à ce produit est supérieure à celle du stock\n Quantité Stock: <span style='font-weight:900'>"
                                + oTFamilleStock.getIntNUMBERAVAILABLE()
                                + "</span> < Quantité à retirer :<span style='font-weight:900'>"
                                + (intNUMBER + totalCount) + "</span>");
            } else {
                TWarehouse oWarehouse = new TWarehouse();
                oWarehouse.setLgWAREHOUSEID(UUID.randomUUID().toString());
                oWarehouse.setLgUSERID(lgUSERID);
                oWarehouse.setLgFAMILLEID(oProductItem);
                oWarehouse.setIntNUMBER(intNUMBER);
                oWarehouse.setDtPEREMPTION(java.sql.Date.valueOf(dtPeremption));
                oWarehouse.setDtCREATED(new Date());
                oWarehouse.setDtUPDATED(oWarehouse.getDtCREATED());
                oWarehouse.setIntNUMLOT(intNUMLOT);
                oWarehouse.setStrSTATUT(Constant.STATUT_PENDING);
                oWarehouse.setStockInitial(oTFamilleStock.getIntNUMBERAVAILABLE());
                oWarehouse.setStockFinal(oTFamilleStock.getIntNUMBERAVAILABLE() - oWarehouse.getIntNUMBER());
                getEntityManager().persist(oWarehouse);
                json.put("success", true);

            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getTProductItemStock {0}", e);
        }
        return json;

    }

    private JSONObject update(String lgFAMILLEID, int intNUMBER, String empl, String dtPeremption, TUser user,
            String intNUMLOT) {
        JSONObject json = new JSONObject();
        try {
            TFamille oTProductItem = getEntityManager().find(TFamille.class, lgFAMILLEID);
            TFamilleStock uTFamilleStock = getTProductItemStock(lgFAMILLEID, empl);
            if (uTFamilleStock.getIntNUMBERAVAILABLE() < intNUMBER) {
                json.put("success", false);
                json.put("message",
                        "La quantité  à retirer est supérieure à celle en stock<br> Vous pouvez faire un ajustement du stock <br> Quantité en stock <span style='color:red;font-weight:900;'>"
                                + uTFamilleStock.getIntNUMBERAVAILABLE() + "</span>");
            } else {
                TWarehouse oTWarehouse = new TWarehouse();
                oTWarehouse.setLgWAREHOUSEID(UUID.randomUUID().toString());
                oTWarehouse.setLgUSERID(user);
                oTWarehouse.setLgFAMILLEID(oTProductItem);
                oTWarehouse.setIntNUMBER(intNUMBER);
                oTWarehouse.setDtPEREMPTION(java.sql.Date.valueOf(dtPeremption));
                oTWarehouse.setDtCREATED(new Date());
                oTWarehouse.setDtUPDATED(oTWarehouse.getDtCREATED());
                oTWarehouse.setIntNUMLOT(intNUMLOT);
                oTWarehouse.setStrSTATUT(Constant.STATUT_PENDING);
                oTWarehouse.setStockInitial(uTFamilleStock.getIntNUMBERAVAILABLE());
                oTWarehouse.setStockFinal(uTFamilleStock.getIntNUMBERAVAILABLE() - intNUMBER);
                getEntityManager().persist(oTWarehouse);
                json.put("success", true);

            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getTProductItemStock {0}", e);
            json.put("success", false);
        }
        return json;
    }

    private TWarehouse getTWarehouse(String id, String lot) {

        try {
            TypedQuery<TWarehouse> q = getEntityManager().createQuery(
                    "SELECT o FROM TWarehouse o WHERE  FUNCTION('DATE', o.dtCREATED)= FUNCTION('DATE',?1) AND o.lgFAMILLEID.lgFAMILLEID=?2  AND o.strSTATUT=?3 AND o.intNUMLOT=?4 ",
                    TWarehouse.class).setParameter(1, new Date()).setParameter(2, id)
                    .setParameter(3, Constant.STATUT_PENDING).setParameter(4, lot);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getTProductItemStock {0}", e);
            return null;
        }

    }

    @Override
    public JSONObject updatePerime(Params params) {
        JSONObject json = new JSONObject();
        try {

            TUser user = params.getOperateur();

            TWarehouse nWarehouse = getEntityManager().find(TWarehouse.class, params.getRef());
            TFamilleStock oTFamilleStock = getTProductItemStock(nWarehouse.getLgFAMILLEID().getLgFAMILLEID(),
                    user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            /* audit 06 PE-01 : les autres lignes du produit comptent aussi */
            int autres = total(checkIsExist(nWarehouse.getLgFAMILLEID().getLgFAMILLEID(),
                    user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).stream()
                            .filter(w -> !w.getLgWAREHOUSEID().equals(nWarehouse.getLgWAREHOUSEID()))
                            .collect(Collectors.toList()));
            if (oTFamilleStock.getIntNUMBERAVAILABLE() < params.getValue() + autres) {
                json.put("success", false);
                json.put("message",
                        "La quantité  à retirer est supérieure à celle en stock<br> Vous pouvez faire un ajustement du stock <br> Quantité en stock <span style='color:red;font-weight:900;'>"
                                + oTFamilleStock.getIntNUMBERAVAILABLE() + "</span>");
            } else {

                nWarehouse.setLgUSERID(user);

                nWarehouse.setIntNUMBER(params.getValue());

                nWarehouse.setDtUPDATED(new Date());
                nWarehouse.setIntNUMLOT(params.getRefTwo());

                getEntityManager().merge(nWarehouse);
                json.put("success", true);

            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateStock {0}", e);
        }
        return json;
    }

    @Override
    public void removePerime(String id) {
        getEntityManager().remove(getEntityManager().find(TWarehouse.class, id));
    }

    /*
     * verifie qu'un privilege actif est associe a l'utilisateur via ses roles (meme chaine t_role_user -> t_role ->
     * t_role_privelege -> t_privilege que bll.userManagement.privilege)
     */
    @Override
    public boolean hasCloturePrivilege(TUser user) {
        try {
            Object result = getEntityManager().createNativeQuery("SELECT COUNT(t_privilege.str_NAME) FROM t_role_user "
                    + "INNER JOIN t_user ON t_role_user.lg_USER_ID = t_user.lg_USER_ID "
                    + "INNER JOIN t_role ON t_role.lg_ROLE_ID = t_role_user.lg_ROLE_ID "
                    + "INNER JOIN t_role_privelege ON t_role.lg_ROLE_ID = t_role_privelege.lg_ROLE_ID "
                    + "INNER JOIN t_privilege ON t_role_privelege.lg_PRIVILEGE_ID = t_privilege.lg_PRIVELEGE_ID "
                    + "WHERE t_privilege.str_NAME = ?1 AND t_user.lg_USER_ID = ?2 AND t_privilege.str_STATUT = 'enable'")
                    .setParameter(1, P_CLOTURE_SAISIE_PERIMES).setParameter(2, user.getLgUSERID()).getSingleResult();
            return Integer.parseInt(result + "") > 0;
        } catch (Exception e) {
            LOG.log(Level.WARNING, null, e);
            return false;
        }
    }

    @Override
    public JSONObject completePerimes(String id, TUser user) {

        JSONObject json = new JSONObject();
        if (!hasCloturePrivilege(user)) {
            return json.put("success", false).put("message",
                    "Vous n'avez pas le privilège requis pour clôturer une saisie de périmés");
        }

        try {
            /*
             * audit 06 PE-02, PE-04 : toute la saisie en cours de l'emplacement de l'utilisateur, quelle que soit la
             * date (avant : les lignes du jour de la premiere ligne, de tous les emplacements).
             */
            TEmplacement emplacement = user.getLgEMPLACEMENTID();
            List<TWarehouse> list = lignesEnCours(emplacement.getLgEMPLACEMENTID());
            int i = 0;
            List<String> nonAppliquees = new ArrayList<>();
            MvtProduitObselete mvtProduit = new MvtProduitObselete();
            JSONArray items = new JSONArray();
            for (TWarehouse tWarehouse : list) {

                TFamille famille = tWarehouse.getLgFAMILLEID();
                TFamilleStock oTFamilleStock = getTProductItemStock(tWarehouse.getLgFAMILLEID().getLgFAMILLEID(),
                        emplacement.getLgEMPLACEMENTID());
                Integer stockInit = oTFamilleStock.getIntNUMBERAVAILABLE();
                /*
                 * audit 06 PE-01 : controle refait a la cloture avec le stock courant ; une ligne qui le rendrait
                 * negatif reste en attente et est signalee.
                 */
                if (stockInit < tWarehouse.getIntNUMBER()) {
                    nonAppliquees
                            .add(famille.getIntCIP() + " " + famille.getStrNAME() + " (lot " + tWarehouse.getIntNUMLOT()
                                    + ") : " + tWarehouse.getIntNUMBER() + " à retirer, " + stockInit + " en stock");
                } else {
                    oTFamilleStock
                            .setIntNUMBERAVAILABLE(oTFamilleStock.getIntNUMBERAVAILABLE() - tWarehouse.getIntNUMBER());
                    oTFamilleStock.setIntNUMBER(oTFamilleStock.getIntNUMBERAVAILABLE());
                    oTFamilleStock.setDtUPDATED(new Date());
                    tWarehouse.setIntNUMBERDELETE(tWarehouse.getIntNUMBER());
                    tWarehouse.setDtUPDATED(new Date());
                    tWarehouse.setStrSTATUT(Constant.STATUT_DELETE);
                    getEntityManager().merge(oTFamilleStock);
                    getEntityManager().merge(tWarehouse);
                    sortirLots(famille.getLgFAMILLEID(), tWarehouse.getIntNUMLOT(), tWarehouse.getIntNUMBER());
                    mvtProduit.saveMvtProduit(famille.getIntPRICE(), tWarehouse.getLgWAREHOUSEID(), Constant.PERIME,
                            famille, user, emplacement, tWarehouse.getIntNUMBER(), stockInit,
                            stockInit - tWarehouse.getIntNUMBER(), 0, getEntityManager());
                    String desc = "Saisis de périmé du  produit " + famille.getIntCIP() + " " + famille.getStrNAME()
                            + " stock initial= " + stockInit + " qté saisie= " + tWarehouse.getIntNUMBER()
                            + " qté après saisie = " + oTFamilleStock.getIntNUMBERAVAILABLE()
                            + " . Saisie effectuée par " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
                    updateItem(user, famille.getIntCIP(), desc, TypeLog.SAISIS_PERIMES, famille);
                    suggestionService.makeSuggestionAuto(oTFamilleStock, famille);
                    JSONObject jsonItemUg = new JSONObject();
                    jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), famille.getIntCIP());
                    jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), famille.getStrNAME());
                    jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), tWarehouse.getIntNUMBER());
                    jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), stockInit);
                    jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), oTFamilleStock.getIntNUMBERAVAILABLE());
                    items.put(jsonItemUg);
                    i++;
                }
            }
            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.SAISIS_PERIMES.getValue());
            donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            createNotification("", TypeNotification.SAISIS_PERIMES, user, donnee, null);
            json.put("success", true);
            json.put("NB", i);
            if (!nonAppliquees.isEmpty()) {
                json.put("nonAppliquees", nonAppliquees.size()).put("message",
                        nonAppliquees.size() + " ligne(s) non retirée(s), stock insuffisant ; elles restent dans la"
                                + " saisie en cours :<br>- " + String.join("<br>- ", nonAppliquees));
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateStock {0}", e);
            json.put("success", false);

        }
        return json;
    }

    private void createNotification(String msg, TypeNotification typeNotification, TUser user,
            Map<String, Object> donneesMap, String entityRef) {
        try {
            notificationService.save(
                    new Notification().entityRef(entityRef).donnees(this.notificationService.buildDonnees(donneesMap))
                            .setCategorieNotification(notificationService.getOneByName(typeNotification)).message(msg)
                            .addUser(user));
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

    }

    private void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object t) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(eventLog.getDtCREATED());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
        eventLog.setStrTABLECONCERN(t.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        eventLog.setStrTYPELOG(ref);
        getEntityManager().persist(eventLog);
    }

    @Override
    public JSONObject getPerimesSaisiEnCours(int start, int limit) {
        return getPerimesSaisiEnCours(start, limit, null);
    }

    @Override
    public JSONObject getPerimesSaisiEnCours(int start, int limit, TUser user) {
        String empl = user == null || user.getLgEMPLACEMENTID() == null ? null
                : user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        long count = fetchPerimesSaisiEnCoursCount(empl);
        JSONObject json = new JSONObject();
        json.put("data", new JSONArray(fetchPerimesSaisiEnCours(start, limit, empl)));
        json.put("total", count);
        return json;
    }

    /** audit 06 PE-02, PE-04 : lignes en cours de l'emplacement (toutes si null), quelle que soit leur date */
    private static String filtreEnCours(String empl) {
        return " WHERE `t_warehouse`.`str_STATUT`='" + Constant.STATUT_PENDING + "'"
                + (empl == null ? ""
                        : " AND EXISTS (SELECT 1 FROM t_user u WHERE u.lg_USER_ID = `t_warehouse`.`lg_USER_ID`"
                                + " AND u.lg_EMPLACEMENT_ID = ?1)");
    }

    private List<PerimesDTO> fetchPerimesSaisiEnCours(int start, int limit, String empl) {
        List<PerimesDTO> datas = new ArrayList<>();
        try {
            String qry = "SELECT  `t_warehouse`.`lg_FAMILLE_ID`, `t_warehouse`.`int_NUM_LOT`, `t_warehouse`.`int_NUMBER`, DATE_FORMAT(`t_warehouse`.`dt_CREATED`,'%d/%m/%Y %H:%i') AS DATEENTREE, `t_famille`.`int_CIP`,";
            qry += "  DATE_FORMAT(`t_warehouse`.`dt_PEREMPTION`,'%d/%m/%Y') AS  dtPEREMPTION,`t_famille`.`str_NAME`, `t_warehouse`.`lg_WAREHOUSE_ID`,`t_warehouse`.`stock_initial`,`t_warehouse`.`stock_final` FROM  `t_famille`  INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`)";
            qry += filtreEnCours(empl) + " ORDER BY `t_warehouse`.`dt_CREATED` DESC LIMIT " + start + ", " + limit;
            javax.persistence.Query nq = this.getEntityManager().createNativeQuery(qry);
            if (empl != null) {
                nq.setParameter(1, empl);
            }
            List<Object[]> list = nq.getResultList();

            for (Object[] objects : list) {
                PerimesDTO perimesDTO = new PerimesDTO();
                perimesDTO.setProduitId(objects[0] + "");
                perimesDTO.setLot(objects[1] + "");
                perimesDTO.setQuantity(Integer.parseInt(objects[2] + ""));
                perimesDTO.setDatePeremption(objects[5] + "");
                perimesDTO.setProduitCip(objects[4] + "");
                perimesDTO.setProduitLibelle(objects[6] + "");
                perimesDTO.setDateEntree(objects[3] + "");
                perimesDTO.setId(objects[7] + "");
                perimesDTO.setStockInitial(Integer.valueOf(objects[8] + ""));
                perimesDTO.setStockFinal(Integer.valueOf(objects[9] + ""));
                datas.add(perimesDTO);

            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchPerimesSaisiEnCours {0}", e);
        }
        return datas;
    }

    private long fetchPerimesSaisiEnCoursCount(String empl) {

        long count = 0;

        try {

            String qry = "SELECT COUNT( `t_warehouse`.`lg_FAMILLE_ID`) FROM  `t_famille`  INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`)"
                    + filtreEnCours(empl);
            javax.persistence.Query nq = this.getEntityManager().createNativeQuery(qry);
            if (empl != null) {
                nq.setParameter(1, empl);
            }
            Object object = nq.getSingleResult();
            count = Long.parseLong(object + "");

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchPerimesSaisiEnCoursCount {}", e);
        }

        return count;
    }
}
