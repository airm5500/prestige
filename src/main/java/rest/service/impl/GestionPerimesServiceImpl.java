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
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
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
        List<TWarehouse> list = checkIsExist(lgFAMILLEID);
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        if (list.isEmpty()) {
            return update(lgFAMILLEID, intNUMBER, empl, dtPeremption, user, intLot);
        } else {

            TWarehouse tw = getTWarehouse(lgFAMILLEID, intLot);
            if (tw != null) {
                return updateStock(tw, intNUMBER, empl);
            } else {
                return updateFamillyStock(user, lgFAMILLEID, intNUMBER, intLot, dtPeremption, list, empl);
            }
        }
    }

    private List<TWarehouse> checkIsExist(String lgFAMILLEID) {

        List<TWarehouse> list = getEntityManager().createQuery(
                "SELECT o FROM TWarehouse o WHERE  FUNCTION('DATE', o.dtCREATED)= FUNCTION('DATE',?1) AND o.lgFAMILLEID.lgFAMILLEID=?2  AND o.strSTATUT=?3")
                .setParameter(1, new Date()).setParameter(2, lgFAMILLEID).setParameter(3, Constant.STATUT_PENDING)
                .getResultList();
        return list;

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

    public JSONObject updateStock(TWarehouse oWarehouse, Integer intNUMBER, String lgEMPLACEMENTID) {

        JSONObject json = new JSONObject();

        try {

            TFamilleStock oFamilleStock = getTProductItemStock(oWarehouse.getLgFAMILLEID().getLgFAMILLEID(),
                    lgEMPLACEMENTID);
            if (oFamilleStock.getIntNUMBERAVAILABLE() < (intNUMBER + oWarehouse.getIntNUMBER())) {
                json.put("success", false);
                json.put("message",
                        "Cette ligne existe déjà avec quantité <span style='font-weight:900;'>"
                                + oWarehouse.getIntNUMBER()
                                + "</span>\n La somme des différentes quantités es supérieure à celle du stock");
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
            if (oTFamilleStock.getIntNUMBERAVAILABLE() < params.getValue()) {
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

    @Override
    public JSONObject completePerimes(String id, TUser user) {

        JSONObject json = new JSONObject();

        try {
            List<TWarehouse> list;
            TWarehouse oWarehouse = getEntityManager().find(TWarehouse.class, id);
            list = getEntityManager().createQuery(
                    "SELECT o FROM TWarehouse o WHERE  FUNCTION('DATE', o.dtCREATED)= FUNCTION('DATE',?1) AND o.strSTATUT=?2")
                    .setParameter(1, oWarehouse.getDtCREATED()).setParameter(2, Constant.STATUT_PENDING)
                    .getResultList();
            int i = 0;
            MvtProduitObselete mvtProduit = new MvtProduitObselete();
            TEmplacement emplacement = user.getLgEMPLACEMENTID();
            JSONArray items = new JSONArray();
            for (TWarehouse tWarehouse : list) {

                TFamille famille = tWarehouse.getLgFAMILLEID();
                TFamilleStock oTFamilleStock = getTProductItemStock(tWarehouse.getLgFAMILLEID().getLgFAMILLEID(),
                        emplacement.getLgEMPLACEMENTID());
                Integer stockInit = oTFamilleStock.getIntNUMBERAVAILABLE();
                if (oTFamilleStock.getIntNUMBERAVAILABLE() > 0) {
                    oTFamilleStock
                            .setIntNUMBERAVAILABLE(oTFamilleStock.getIntNUMBERAVAILABLE() - tWarehouse.getIntNUMBER());
                    oTFamilleStock.setIntNUMBER(oTFamilleStock.getIntNUMBERAVAILABLE());
                    oTFamilleStock.setDtUPDATED(new Date());
                    tWarehouse.setIntNUMBERDELETE(tWarehouse.getIntNUMBER());
                    tWarehouse.setDtUPDATED(new Date());
                    tWarehouse.setStrSTATUT(Constant.STATUT_DELETE);
                    getEntityManager().merge(oTFamilleStock);
                    getEntityManager().merge(tWarehouse);
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
        long count = fetchPerimesSaisiEnCoursCount();
        JSONObject json = new JSONObject();
        json.put("data", new JSONArray(fetchPerimesSaisiEnCours(start, limit)));
        json.put("total", count);
        return json;
    }

    private List<PerimesDTO> fetchPerimesSaisiEnCours(int start, int limit) {
        List<PerimesDTO> datas = new ArrayList<>();
        try {
            String qry = "SELECT  `t_warehouse`.`lg_FAMILLE_ID`, `t_warehouse`.`int_NUM_LOT`, `t_warehouse`.`int_NUMBER`, DATE_FORMAT(`t_warehouse`.`dt_CREATED`,'%d/%m/%Y %H:%i') AS DATEENTREE, `t_famille`.`int_CIP`,";
            qry += "  DATE_FORMAT(`t_warehouse`.`dt_PEREMPTION`,'%d/%m/%Y') AS  dtPEREMPTION,`t_famille`.`str_NAME`, `t_warehouse`.`lg_WAREHOUSE_ID`,`t_warehouse`.`stock_initial`,`t_warehouse`.`stock_final` FROM  `t_famille`  INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`)";
            qry += " WHERE  DATE(`t_warehouse`.`dt_CREATED`) = CURDATE() AND  `t_warehouse`.`str_STATUT`='"
                    + Constant.STATUT_PENDING + "'   ORDER BY `t_warehouse`.`dt_CREATED` DESC LIMIT " + start + ", "
                    + limit + "";
            List<Object[]> list = this.getEntityManager().createNativeQuery(qry).getResultList();

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

    private long fetchPerimesSaisiEnCoursCount() {

        long count = 0;

        try {

            String qry = "SELECT COUNT( `t_warehouse`.`lg_FAMILLE_ID`) FROM  `t_famille`  INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`) WHERE  DATE(`t_warehouse`.`dt_CREATED`) = CURDATE() AND  `t_warehouse`.`str_STATUT`='"
                    + Constant.STATUT_PENDING + "'";

            Object object = this.getEntityManager().createNativeQuery(qry).getSingleResult();
            count = Long.parseLong(object + "");

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchPerimesSaisiEnCoursCount {}", e);
        }

        return count;
    }
}
