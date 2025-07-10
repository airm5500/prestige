package bll.report;

import bll.common.Parameter;
import bll.entity.EntityData;
import bll.userManagement.privilege;
import dal.TFamilleStock;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrement_;
import dal.TSnapShopDalyStat;
import dal.TSnapShopDalyVente;
import dal.TTrancheHoraire;
import dal.TUser;
import dal.dataManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;

/**
 *
 * @author KKOFFI
 */
public class StatisticSales extends bll.bllBase {

    public StatisticSales() {
        this.checkDatamanager();
    }

    public StatisticSales(dataManager O) {
        this.setOdataManager(O);
        this.checkDatamanager();
    }

    public StatisticSales(dataManager O, TUser OTUser) {
        this.setOdataManager(O);
        this.setOTUser(OTUser);
        this.checkDatamanager();
    }

    public JSONArray getSalesStatistics(String dt_start, String dt_end, String emp) {
        JSONArray array = new JSONArray();
        Set<String> dates = new HashSet<>();
        List<TPreenregistrement> listprePreenregistrements;
        EntityManager em = this.getOdataManager().getEm();
        try {
            LocalDate _start = LocalDate.parse(dt_start);
            LocalDate _end = LocalDate.parse(dt_end);
            LocalDate finalEndDate = LocalDate.of(_end.getYear(), _end.getMonthValue(), _end.lengthOfMonth());
            LocalDate finalStartDate = LocalDate.of(_start.getYear(), _start.getMonthValue(), 1);
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Predicate criteria = cb.conjunction();
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(finalStartDate), java.sql.Date.valueOf(finalEndDate));
            criteria = cb.and(criteria,
                    cb.equal(root.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            criteria = cb.and(criteria, cb.equal(root.get(TPreenregistrement_.bISCANCEL), false));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            Predicate pu = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            criteria = cb.and(criteria,
                    cb.equal(root.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));
            cq.select(root);
            cq.where(criteria, btw, pu);
            Query q = em.createQuery(cq);
            listprePreenregistrements = q.getResultList();
            listprePreenregistrements.forEach((listprePreenregistrement) -> {
                dates.add(date.FORMATTERMOUNTHFULLYEAR.format(listprePreenregistrement.getDtCREATED()));
            });

            int id = 0;

            for (Iterator<String> iterator = dates.iterator(); iterator.hasNext();) {
                JSONObject json = new JSONObject();
                id++;
                String next = iterator.next();
                String[] splitstring = next.split("/");
                int month = Integer.parseInt(splitstring[0]);
                int year = Integer.parseInt(splitstring[1]);

                json.put("month", next);
                json.put("num", month);
                json.put("year", year);
                double amount = 0, montant_brut_cumul = 0, remise_cumul = 0, montant_net_cumul = 0,
                        montant_vno_cumul = 0;
                double amount_vo = 0, montant_vo_cumul = 0;
                double amount_vno = 0;
                int count = 0, count_vo = 0, count_vno = 0, nbreclients_cumul = 0, count_vo_cumul = 0,
                        count_vno_cumul = 0;
                double net_ttc = 0;
                double remise = 0;
                double panier_moy_vo = 0, panier_moy_vno = 0, panier_moy_vno_cumul = 0, panier_moy_vo_cumul = 0,
                        vno_month_percent = 0, vno_cumul_percent = 0, vo_month_percent = 0, vo_cumul_percent = 0;
                for (TPreenregistrement listprePreenregistrement : listprePreenregistrements) {
                    if (next.equals(date.FORMATTERMOUNTHFULLYEAR.format(listprePreenregistrement.getDtCREATED()))) {
                        count++;
                        amount += listprePreenregistrement.getIntPRICE();
                        remise += listprePreenregistrement.getIntPRICEREMISE();
                        if (Parameter.KEY_VENTE_ORDONNANCE.equals(listprePreenregistrement.getStrTYPEVENTE())) {
                            count_vo++;
                            amount_vo += (listprePreenregistrement.getIntPRICE()
                                    - listprePreenregistrement.getIntPRICEREMISE());
                        }
                        if (Parameter.KEY_VENTE_NON_ORDONNANCEE.equals(listprePreenregistrement.getStrTYPEVENTE())) {
                            count_vno++;
                            amount_vno += (listprePreenregistrement.getIntPRICE()
                                    - listprePreenregistrement.getIntPRICEREMISE());
                        }
                    }

                    net_ttc = amount - remise;
                    json.put("id", id);
                    json.put("NB_CLIENT", count);
                    json.put("AMOUT_VO", amount_vo);
                    json.put("AMOUT_VNO", amount_vno);
                    json.put("BRUT_TTC", amount);
                    json.put("NET_TTC", net_ttc);
                    json.put("REMISE", remise);
                    if (count_vo > 0) {
                        panier_moy_vo = amount_vo / count_vo;

                    }

                    if (count_vno > 0) {
                        panier_moy_vno = amount_vno / count_vno;
                    }
                    json.put("PANIER_MOYEN_M_VNO", Math.round(panier_moy_vno));
                    json.put("PANIER_MOYEN_M_VO", Math.round(panier_moy_vo));

                    String[] formatdate = date.FORMATTERMOUNTHFULLYEAR.format(listprePreenregistrement.getDtCREATED())
                            .split("/");
                    int month_value = Integer.parseInt(formatdate[0]);
                    int year_value = Integer.parseInt(formatdate[1]);
                    if (month >= month_value) {
                        nbreclients_cumul++;
                        montant_brut_cumul += listprePreenregistrement.getIntPRICE();
                        remise_cumul += listprePreenregistrement.getIntPRICEREMISE();
                        if (Parameter.KEY_VENTE_NON_ORDONNANCEE.equals(listprePreenregistrement.getStrTYPEVENTE())) {
                            montant_vno_cumul += (listprePreenregistrement.getIntPRICE()
                                    - listprePreenregistrement.getIntPRICEREMISE());
                            count_vno_cumul++;
                        }
                        if (Parameter.KEY_VENTE_ORDONNANCE.equals(listprePreenregistrement.getStrTYPEVENTE())) {
                            count_vo_cumul++;
                            montant_vo_cumul += (listprePreenregistrement.getIntPRICE()
                                    - listprePreenregistrement.getIntPRICEREMISE());
                        }

                    }

                    if (count_vo_cumul > 0) {
                        panier_moy_vo_cumul = montant_vo_cumul / count_vo_cumul;
                    }

                    if (montant_vo_cumul > 0 || montant_vno_cumul > 0) {
                        vo_cumul_percent = (montant_vo_cumul * 100) / (montant_vo_cumul + montant_vno_cumul);
                        vno_cumul_percent = (montant_vno_cumul * 100) / (montant_vo_cumul + montant_vno_cumul);
                    }

                    if (amount_vno > 0 || amount_vo > 0) {
                        vno_month_percent = (amount_vno * 100) / (amount_vno + amount_vo);
                        vo_month_percent = (amount_vo * 100) / (amount_vno + amount_vo);
                    }
                    if (count_vno_cumul > 0) {
                        panier_moy_vno_cumul = montant_vno_cumul / count_vno_cumul;
                    }

                    montant_net_cumul = montant_brut_cumul - remise_cumul;
                    json.put("NB_CLIENTCUMUL", nbreclients_cumul);
                    json.put("MONTANT_BRUTCUMUL", montant_brut_cumul);
                    json.put("MONTANT_VNOCUMUL", montant_vno_cumul);
                    json.put("MONTANT_VOCUMUL", montant_vo_cumul);
                    json.put("MONTANT_NETCUMUL", montant_net_cumul);
                    json.put("MONTANT_REMISECUMUL", remise_cumul);

                    json.put("PANIER_MOYEN_M_VNO_CUMUL", Math.round(panier_moy_vno_cumul));
                    json.put("PANIER_MOYEN_M_VO_CUMUL", Math.round(panier_moy_vo_cumul));
                    json.put("vo_month_percent", vo_month_percent);
                    json.put("vno_month_percent", vno_month_percent);

                    json.put("vo_cumul_percent", vo_cumul_percent);
                    json.put("vno_cumul_percent", vno_cumul_percent);

                }
                array.put(json);
            }
        } catch (JSONException ex) {
            Logger.getLogger(StatisticSales.class.getName()).log(Level.SEVERE, null, ex);
        } finally {

        }

        return array;

    }

    public List<TPreenregistrement> getPreenregistrementsForSalesStatistics(String dt_start, String dt_end,
            String emp) {
        List<TPreenregistrement> list = new ArrayList<>();
        EntityManager em = this.getOdataManager().getEm();
        try {
            LocalDate _start = LocalDate.parse(dt_start);
            LocalDate _end = LocalDate.parse(dt_end);
            LocalDate finalEndDate = LocalDate.of(_end.getYear(), _end.getMonthValue(), _end.lengthOfMonth());
            LocalDate finalStartDate = LocalDate.of(_start.getYear(), _start.getMonthValue(), 1);
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Predicate criteria = cb.conjunction();
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(finalStartDate), java.sql.Date.valueOf(finalEndDate));
            criteria = cb.and(criteria,
                    cb.equal(root.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            criteria = cb.and(criteria, cb.equal(root.get(TPreenregistrement_.bISCANCEL), false));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            Predicate pu = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            criteria = cb.and(criteria,
                    cb.equal(root.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));
            cq.select(root);
            cq.where(criteria, btw, pu);
            Query q = em.createQuery(cq);
            list = q.getResultList();

        } finally {
            // if(em!=null)
            //
        }

        return list;
    }

    public JSONArray getSalesByOperateur(String dt_start, String dt_end, String search_value) {
        JSONArray array = new JSONArray();
        if (!"".equals(dt_start)) {
            Date dtstart = java.sql.Date.valueOf(dt_start);
            Set<TUser> operateur = new HashSet<>();
            List<TPreenregistrement> listprePreenregistrements = new ArrayList<>();
            try {
                if (!"".equals(dt_end) && !dt_start.equals(dt_end)) {
                    Date dtend = java.sql.Date.valueOf(dt_end);
                    listprePreenregistrements = this.getOdataManager().getEm().createQuery(
                            "SELECT o FROM  TPreenregistrement o WHERE o.dtCREATED BETWEEN ?1 AND ?2  AND o.intPRICE >0 AND o.bISCANCEL = FALSE AND o.strSTATUT =?3 AND (o.lgUSERVENDEURID.strFIRSTNAME LIKE ?4 OR  o.lgUSERVENDEURID.strLASTNAME LIKE ?4 ) ORDER BY o.lgUSERVENDEURID.strFIRSTNAME,o.lgUSERVENDEURID.strLASTNAME ")
                            .setParameter(1, dtstart).setParameter(2, dtend)
                            .setParameter(3, commonparameter.statut_is_Closed).setParameter(4, search_value + "%")
                            .getResultList();
                } else {

                    listprePreenregistrements = this.getOdataManager().getEm().createQuery(
                            "SELECT o FROM  TPreenregistrement o WHERE o.dtCREATED >= ?1 AND o.intPRICE >0 AND o.strSTATUT =?2 AND o.bISCANCEL = FALSE AND (o.lgUSERVENDEURID.strFIRSTNAME LIKE ?3 OR  o.lgUSERVENDEURID.strLASTNAME LIKE ?3 ) ORDER BY o.dtCREATED DESC")
                            .setParameter(1, dtstart).setParameter(2, commonparameter.statut_is_Closed)
                            .setParameter(3, search_value + "%").getResultList();
                    for (TPreenregistrement tPreenregistrement : listprePreenregistrements) {
                        this.refresh(tPreenregistrement);

                    }
                }
                for (TPreenregistrement OPreenregistrement : listprePreenregistrements) {
                    this.refresh(OPreenregistrement);
                }
                int totalcount = 0;
                double totalamount = 0;
                for (TPreenregistrement listprePreenregistrement : listprePreenregistrements) {
                    totalamount += (listprePreenregistrement.getIntPRICE()
                            - listprePreenregistrement.getIntPRICEREMISE());
                    totalcount++;

                    operateur.add(listprePreenregistrement.getLgUSERVENDEURID());

                }
                int id = 0;
                for (Iterator<TUser> iterator = operateur.iterator(); iterator.hasNext();) {
                    JSONObject json = new JSONObject();
                    id++;
                    TUser next = iterator.next();

                    json.put("Operateur",
                            next.getStrFIRSTNAME().substring(0, 1).toUpperCase() + "." + next.getStrLASTNAME());
                    double amount = 0;
                    double amount_vo = 0, amount_vop = 0;
                    double amount_vno = 0;
                    int count = 0, count_vo = 0, count_vop = 0, count_vno = 0;
                    double net_ttc = 0;
                    double remise = 0;
                    double panier_moy_vo = 0, panier_moy_vno = 0, panier_moy = 0, CA = 0;
                    for (TPreenregistrement listprePreenregistrement : listprePreenregistrements) {

                        if (next.getLgUSERID().equals(listprePreenregistrement.getLgUSERVENDEURID().getLgUSERID())) {
                            count++;
                            amount += listprePreenregistrement.getIntPRICE();
                            remise += listprePreenregistrement.getIntPRICEREMISE();
                            if (Parameter.KEY_VENTE_ORDONNANCE.equals(listprePreenregistrement.getStrTYPEVENTE())) {

                                if (listprePreenregistrement.getIntCUSTPART() == 0) {
                                    count_vo++;
                                    amount_vo += (listprePreenregistrement.getIntPRICE()
                                            - listprePreenregistrement.getIntPRICEREMISE());
                                } else {
                                    count_vop++;
                                    amount_vop += (listprePreenregistrement.getIntPRICE()
                                            - listprePreenregistrement.getIntPRICEREMISE());
                                }
                            }
                            if (Parameter.KEY_VENTE_NON_ORDONNANCEE
                                    .equals(listprePreenregistrement.getStrTYPEVENTE())) {
                                count_vno++;
                                amount_vno += (listprePreenregistrement.getIntPRICE()
                                        - listprePreenregistrement.getIntPRICEREMISE());
                            }
                        }

                        net_ttc = amount - remise;
                        json.put("id", id);
                        json.put("NB CLIENT", count);
                        json.put("NB_VO", count_vo);
                        json.put("NB_VNO", count_vno);
                        json.put("NB_VOP", count_vop);

                        json.put("VO_MONTANT", amount_vo);
                        json.put("VNO_MONTANT", amount_vno);
                        json.put("BRUT TTC", amount);
                        json.put("NET TTC", net_ttc);
                        json.put("REMISE", remise);
                        json.put("VO_MONTANTP", amount_vop);
                        if (count > 0) {
                            panier_moy = net_ttc / count;

                        }
                        if (count_vop > 0 || count_vo > 0) {
                            panier_moy_vo = (amount_vop + amount_vo) / (count_vop + count_vo);

                        }

                        if (count_vno > 0) {
                            panier_moy_vno = amount_vno / count_vno;
                        }

                        json.put("PANIER_MOYEN_VNO", Math.round(panier_moy_vno));
                        json.put("PANIER_MOYEN_VOP", Math.round(panier_moy_vo));

                        if (net_ttc > 0 || totalamount > 0) {
                            CA = (net_ttc * 100) / (totalamount);

                        }

                        json.put("CA", new BigDecimal(CA).setScale(2, RoundingMode.HALF_UP));

                        json.put("PANIER MOYEN", Math.round(panier_moy));
                        json.put("M Ord", (amount_vo + amount_vop));
                        json.put("M Non Ord", amount_vno);

                    }
                    array.put(json);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return array;

    }

    public List<EntityData> getListArticleVendu(String search_value, String dt_start, String dt_end) {
        List<EntityData> entityDatas = new ArrayList<>();
        List list = null;
        try {
            Date dtstart = java.sql.Date.valueOf(dt_start);
            if (!"".equals(dt_end) && !dt_start.equals(dt_end)) {
                Date dtend = date.formatterMysql.parse(dt_end);
                list = this.getOdataManager().getEm().createQuery(
                        "SELECT SUM(p.intPRICE),SUM(p.intPRICEREMISE),SUM(p.intQUANTITY), o.strNAME,o.lgFAMILLEID,o.intCIP,o.intPRICE FROM TFamille o ,TPreenregistrementDetail p WHERE  o.lgFAMILLEID =p.lgFAMILLEID.lgFAMILLEID AND p.dtCREATED >=?1 AND p.dtCREATED <=?2 AND p.lgPREENREGISTREMENTID.bISCANCEL = FALSE AND (o.strNAME LIKE ?3 OR o.intCIP LIKE ?3) GROUP BY o.strNAME,o.lgFAMILLEID,o.intCIP,o.intPRICE ORDER BY SUM(p.intQUANTITY) DESC")
                        .setParameter(1, dtstart).setParameter(2, dtend).setParameter(3, search_value + "%")
                        .getResultList();
            } else {
                list = this.getOdataManager().getEm().createQuery(
                        "SELECT SUM(p.intPRICE),SUM(p.intPRICEREMISE),SUM(p.intQUANTITY), o.strNAME,o.lgFAMILLEID ,o.intCIP,o.intPRICE FROM TFamille o ,TPreenregistrementDetail p WHERE  o.lgFAMILLEID =p.lgFAMILLEID.lgFAMILLEID  AND p.dtCREATED >=?1  AND p.lgPREENREGISTREMENTID.bISCANCEL=FALSE   AND (o.strNAME LIKE ?2 OR o.intCIP LIKE ?2) GROUP BY o.strNAME,o.lgFAMILLEID,o.intCIP,o.intPRICE ORDER BY SUM(p.intQUANTITY) DESC")
                        .setParameter(1, dtstart).setParameter(2, search_value + "%").getResultList();
            }
            for (Object object : list) {
                Object[] datas = (Object[]) object;
                EntityData OEntityData = new EntityData();
                OEntityData.setStr_value1(datas[4] + "");
                OEntityData.setStr_value2(datas[3] + "");
                OEntityData.setStr_value3(datas[2] + "");
                OEntityData.setStr_value4(0 + "");
                long amout = Long.valueOf(datas[0] + "");
                if (!"Null".equalsIgnoreCase(datas[1] + "")) {

                    amout = Long.valueOf(datas[0] + "") - Long.valueOf(datas[1] + "");
                    OEntityData.setStr_value4(datas[1] + "");
                }
                OEntityData.setStr_value5(amout + "");
                OEntityData.setStr_value10(datas[0] + "");
                OEntityData.setStr_value8(datas[5] + "");
                OEntityData.setStr_value9(datas[6] + "");
                TFamilleStock stock = getFamilleStock(datas[4] + "");
                OEntityData.setStr_value6(stock.getIntNUMBERAVAILABLE() + "");
                OEntityData.setStr_value7(stock.getLgEMPLACEMENTID().getStrNAME());
                entityDatas.add(OEntityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return entityDatas;
    }

    private TFamilleStock getFamilleStock(String lg_FAMILLE_ID) {
        return this.getOdataManager().getEm()
                .createQuery("SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1", TFamilleStock.class)
                .setParameter(1, lg_FAMILLE_ID).getSingleResult();
    }

    public JSONObject dataJsonArticleVenduACredi(String search_value, String dt_start, String dt_end)
            throws JSONException {
        List<EntityData> list = this.getListArticleVendu(search_value, dt_start, dt_end);
        JSONObject object = new JSONObject();

        JSONArray array = new JSONArray();
        array.put("Code CIP");
        array.put("Désignation");
        array.put("Emplacement");
        array.put("Quantité en stock");
        array.put("Qunatité Vendue");
        array.put("Prix Unitaire");
        array.put("Montant Brut");
        array.put("Montant Remise");
        array.put("Montant Net");

        object.put("dataheader", array);

        JSONArray datavalue = new JSONArray();
        for (EntityData OData : list) {

            JSONArray dataarray = new JSONArray();

            dataarray.put(OData.getStr_value8());
            dataarray.put(OData.getStr_value2());
            dataarray.put(OData.getStr_value7());
            dataarray.put(OData.getStr_value3());
            dataarray.put(OData.getStr_value6());
            dataarray.put(OData.getStr_value9());
            dataarray.put(OData.getStr_value10());
            dataarray.put(OData.getStr_value4());
            dataarray.put(OData.getStr_value5());
            datavalue.put(dataarray);

        }
        object.put("datavalue", datavalue);

        return object;
    }

    public List<EntityData> getListArticleVendufinal(String lg_USER_ID, String lg_TYPE_VENTE, String str_TYPE_VENTE,
            String search_value, String dt_start, String dt_end) {
        List<EntityData> entityDatas = new ArrayList<>();
        List list = null;
        try {
            search_value = search_value + "%";
            System.out.println("search_value  " + search_value);
            String req = "SELECT DATE_FORMAT(pr.`dt_CREATED`,'%m-%d-%Y'),`pr`.`int_QUANTITY`,p.`str_TYPE_VENTE`,f.`lg_FAMILLE_ID`,f.`str_NAME`,f.`int_CIP`,f.`int_PRICE` ,p.`str_REF`,CONCAT(u.`str_FIRST_NAME`, ' ', u.`str_LAST_NAME`),DATE_FORMAT(pr.`dt_CREATED`,'%h:%i') FROM  `t_preenregistrement_detail`  pr, `t_preenregistrement` p,`t_famille` f ,`t_user` u WHERE ";
            req += "f.`lg_FAMILLE_ID` =pr.`lg_FAMILLE_ID` AND p.`lg_PREENREGISTREMENT_ID`=`pr`.`lg_PREENREGISTREMENT_ID`  AND u.`lg_USER_ID`=p.`lg_USER_VENDEUR_ID`";
            req += "AND p.`dt_CREATED` >='" + dt_start + "' AND p.`dt_CREATED` <='" + dt_end
                    + "' AND p.`str_TYPE_VENTE` LIKE '" + str_TYPE_VENTE
                    + "' AND p.`int_PRICE`>0 AND p.`str_STATUT`='is_Closed' AND  p.`lg_USER_VENDEUR_ID` LIKE '"
                    + lg_USER_ID + "' AND p.`lg_TYPE_VENTE_ID` LIKE '" + lg_TYPE_VENTE + "' AND (f.`str_NAME` LIKE '"
                    + search_value + "' OR f.`int_CIP` LIKE '" + search_value + "' OR u.`str_FIRST_NAME` LIKE '"
                    + search_value + "' OR u.`str_LAST_NAME` LIKE '" + search_value + "') ";

            list = this.getOdataManager().getEm().createNativeQuery(req).getResultList();

            for (Object object : list) {
                Object[] datas = (Object[]) object;
                EntityData OEntityData = new EntityData();
                // System.out.println("sql date value of "+java.sql.Date.valueOf(datas[0].toString()));
                // String[]dataArray=String.valueOf(datas[0]).split(" ");
                OEntityData.setStr_value1(datas[0] + "");
                // OEntityData.setStr_value11(dataArray[1].substring(0, dataArray[1].length()-1));
                OEntityData.setStr_value2(datas[1] + "");
                OEntityData.setStr_value3(datas[2] + "");
                OEntityData.setStr_value4(datas[3] + "");
                OEntityData.setStr_value5(datas[4] + "");
                OEntityData.setStr_value6(datas[5] + "");
                OEntityData.setStr_value7(datas[6] + "");
                OEntityData.setStr_value8(datas[7] + "");
                OEntityData.setStr_value9(datas[8] + "");
                OEntityData.setStr_value10(datas[9] + "");
                TFamilleStock stock = getFamilleStock(datas[3] + "");
                OEntityData.setStr_value11(stock.getIntNUMBERAVAILABLE() + "");
                OEntityData.setStr_value12(stock.getIntNUMBER() + "");
                // OEntityData.setStr_value(stock.getLgEMPLACEMENTID().getStrNAME());
                entityDatas.add(OEntityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return entityDatas;
    }
    // 49559729 49559729

    public List<EntityData> getTableauPharmacienData(String dt_start, String dt_end, String empalcementId) {
        List<EntityData> datas = new ArrayList<>();

        TParameters OTParameter;
        int isOk = 0;
        try {
            String query = "CALL `proc_tableaupharmacien`(?,?,?)";
            try {
                OTParameter = this.getOdataManager().getEm().getReference(TParameters.class, "KEY_PARAMS");
                if (OTParameter != null) {
                    // isOk = Integer.valueOf(OTParameter.getStrVALUE().trim());22 12 2019 a revoir
                }

            } catch (Exception e) {
            }
            // List<Object[]> list = new ArrayList();
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, empalcementId).getResultList();

            /*
             * if (isOk == 1) { query = "CALL `proc_pharmacistsdashboard`(?,?)"; list =
             * this.getOdataManager().getEm().createNativeQuery(query) .setParameter(1, dt_start) .setParameter(2,
             * dt_end) .getResultList(); } else { try { OTParameter =
             * this.getOdataManager().getEm().getReference(TParameters.class, "KEY_TAKE_INTO_ACCOUNT"); if (OTParameter
             * != null) { if (Boolean.valueOf(OTParameter.getStrVALUE())) { query =
             * "CALL `proc_pharmacistsdashboardexcluse`(?,?)"; list =
             * this.getOdataManager().getEm().createNativeQuery(query) .setParameter(1, dt_start) .setParameter(2,
             * dt_end) .getResultList(); } } else { list = this.getOdataManager().getEm().createNativeQuery(query)
             * .setParameter(1, dt_start) .setParameter(2, dt_end) .setParameter(3, empalcementId) .getResultList(); }
             *
             * } catch (Exception e) { }
             *
             * }
             */

            TParameters OTParameters = null;

            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0].toString());
                // entityData.setStr_value2(String.valueOf(objects[1])); // a decommenter en cas de probleme 09/08/2016
                entityData.setStr_value2((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && !dt_start.equals(dt_end))
                                ? String.valueOf(Double.parseDouble(String.valueOf(objects[13]))
                                        - Double.parseDouble(String.valueOf(objects[14] != null ? objects[14] : 0)) >= 0
                                                ? Double.parseDouble(String.valueOf(objects[13])) - Double.parseDouble(
                                                        String.valueOf(objects[14] != null ? objects[14] : 0))
                                                : String.valueOf(objects[13]))
                                : String.valueOf(objects[1]));
                entityData.setStr_value3(String.valueOf(objects[2]));
                entityData.setStr_value4(String.valueOf(objects[3]));
                // entityData.setStr_value5(String.valueOf(objects[4])); // a decommenter en cas de probleme 09/08/2016

                entityData.setStr_value5((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && !dt_start.equals(dt_end))
                                ? String.valueOf(Double.parseDouble(String.valueOf(objects[15]))
                                        - Double.parseDouble(String.valueOf(objects[14] != null ? objects[14] : 0)) >= 0
                                                ? Double.parseDouble(String.valueOf(objects[15])) - Double.parseDouble(
                                                        String.valueOf(objects[14] != null ? objects[14] : 0))
                                                : String.valueOf(objects[15]))
                                : String.valueOf(objects[4]));
                entityData.setStr_value6(String.valueOf(objects[5]));
                entityData.setStr_value7(String.valueOf(objects[6]));
                entityData.setStr_value8(String.valueOf(objects[7]));
                entityData.setStr_value9(String.valueOf(objects[8]));
                entityData.setStr_value10(String.valueOf(objects[9]));
                entityData.setStr_value11(String.valueOf(objects[10]));
                entityData.setStr_value12(String.valueOf(objects[11]));
                entityData.setStr_value13(String.valueOf(objects[12]));
                entityData.setStr_value14(String.valueOf(objects[13]));
                entityData.setStr_value15(String.valueOf(objects[14] != null ? objects[14] : 0)); // 08/09/2016
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public JSONArray getVisitorStatisticData(String dt_start, String dt_end) {
        JSONArray array = new JSONArray();
        TSnapShopDalyVente dalyVente = null;
        TSnapShopDalyStat dalyStat = null;
        String query = "select o.*  from v_rp_frequentation_pharmacie o WHERE o.`dt_DAY`>='" + dt_start
                + "' AND o.`dt_DAY` <='" + dt_end + "';";

        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();

                json.put("AMOUNT", objects[0]);
                json.put("JOUR", objects[1]);
                json.put("LG_TRANCHE_HORAIRE", objects[2]);
                json.put("COUNT", objects[3]);
                json.put("REFERNCEVALUE", objects[4]);
                json.put("OP", objects[5]);
                array.put(json);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public List<EntityData> getVisitorStatistic(String dt_start, String dt_end) {
        List<EntityData> datas = new ArrayList<>();

        try {
            JSONArray array = this.getVisitorStatisticData(dt_start, dt_end);
            JSONArray keyvalue = new JSONArray();
            for (int i = 0; i < array.length(); i++) {
                JSONObject json = array.getJSONObject(i);
                JSONObject object = new JSONObject();
                object.put("JOUR", json.get("JOUR") + "");
                object.put("OP", json.get("OP") + "");
                if (keyvalue.length() > 0) {
                    for (int f = 0; f < keyvalue.length(); f++) {

                        if ((keyvalue.getJSONObject(f).get("JOUR").toString().equals(json.get("JOUR").toString()))
                                && (keyvalue.getJSONObject(f).get("OP").toString().equals(json.get("OP").toString()))) {

                            keyvalue.remove(f);
                            break;
                        }
                    }
                    keyvalue.put(object);
                } else {
                    keyvalue.put(object);
                }

            }

            for (int k = 0; k < keyvalue.length(); k++) {

                JSONObject _json = (JSONObject) keyvalue.get(k);
                String JOUR = _json.getString("JOUR");
                String OP = _json.getString("OP");

                double UN_AMONT = 0, DEUX_AMONT = 0, TROIS_AMONT = 0, QUATRE_AMONT = 0, CINQ_AMONT = 0, SIX_AMONT = 0,
                        SEPT_AMONT = 0, HUIT_AMONT = 0, NEUF_AMONT = 0, DIX_AMONT = 0;
                double UN_COUNT = 0, DEUX_COUNT = 0, TROIS_COUNT = 0, QUATRE_COUNT = 0, TOTAL_AMOUNT = 0,
                        VALUES_COUNT = 0, CINQ_COUNT = 0, SIX_COUNT = 0, SEPT_COUNT = 0, HUIT_COUNT = 0, NEUF_COUNT = 0,
                        DIX_COUNT = 0, TOTAL_COUNT = 0;
                long UN_REFERNCEVALUE = 0, DEUX_REFERNCEVALUE = 0, TROIS_REFERNCEVALUE = 0, QUATRE_REFERNCEVALUE = 0,
                        CINQ_REFERNCEVALUE = 0, SIX_REFERNCEVALUE = 0, SEPT_REFERNCEVALUE = 0, HUIT_REFERNCEVALUE = 0,
                        NEUF_REFERNCEVALUE = 0, DIX_REFERNCEVALUE = 0, TOTAL_REFERNCEVALUE = 0;
                double UN_PAN = 0, DEUX_PAN = 0, TROIS_PAN = 0, QUATRE_PAN = 0, CINQ_PAN = 0, SIX_PAN = 0, SEPT_PAN = 0,
                        HUIT_PAN = 0, NEUF_PAN = 0, DIX_PAN = 0, TOTAL_PAN = 0;

                for (int i = 0; i < array.length(); i++) {
                    JSONObject json = array.getJSONObject(i);
                    TTrancheHoraire th = findTrancheHoraire(json.get("LG_TRANCHE_HORAIRE").toString());
                    if (JOUR.equals(json.get("JOUR").toString()) && OP.equals(json.get("OP").toString())) {
                        TOTAL_AMOUNT += Double.valueOf(json.get("AMOUNT") + "");
                        TOTAL_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        TOTAL_COUNT += Double.valueOf(json.get("COUNT") + "");
                        if (th.getIntHEUREMIN() >= 7 && th.getIntHEUREMAX() <= 9) {
                            UN_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            UN_COUNT += Double.valueOf(json.get("COUNT") + "");
                            UN_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 9 && th.getIntHEUREMAX() <= 11) {
                            DEUX_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            DEUX_COUNT += Double.valueOf(json.get("COUNT") + "");
                            DEUX_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 11 && th.getIntHEUREMAX() <= 14) {

                            TROIS_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            TROIS_COUNT += Double.valueOf(json.get("COUNT") + "");
                            TROIS_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 14 && th.getIntHEUREMAX() <= 16) {
                            QUATRE_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            QUATRE_COUNT += Double.valueOf(json.get("COUNT") + "");
                            QUATRE_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 16 && th.getIntHEUREMAX() <= 17) {

                            CINQ_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            CINQ_COUNT += Double.valueOf(json.get("COUNT") + "");
                            CINQ_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 17 && th.getIntHEUREMAX() <= 18) {
                            SIX_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            SIX_COUNT += Double.valueOf(json.get("COUNT") + "");
                            SIX_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 18 && th.getIntHEUREMAX() <= 19) {
                            SEPT_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            SEPT_COUNT += Double.valueOf(json.get("COUNT") + "");
                            SEPT_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 19 && th.getIntHEUREMAX() <= 20) {
                            HUIT_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            HUIT_COUNT += Double.valueOf(json.get("COUNT") + "");
                            HUIT_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 20 && th.getIntHEUREMAX() <= 24) {
                            NEUF_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            NEUF_COUNT += Double.valueOf(json.get("COUNT") + "");
                            NEUF_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                        if (th.getIntHEUREMIN() >= 0 && th.getIntHEUREMAX() <= 7) {
                            DIX_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                            DIX_COUNT += Double.valueOf(json.get("COUNT") + "");
                            DIX_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                        }
                    }

                }
                if (TOTAL_COUNT > 0) {
                    TOTAL_PAN = TOTAL_AMOUNT / TOTAL_COUNT;
                }
                if (UN_COUNT > 0) {
                    UN_PAN = UN_AMONT / UN_COUNT;
                }
                if (DEUX_COUNT > 0) {
                    DEUX_PAN = DEUX_AMONT / DEUX_COUNT;
                }
                if (TROIS_COUNT > 0) {
                    TROIS_PAN = TROIS_AMONT / TROIS_COUNT;
                }
                if (QUATRE_COUNT > 0) {
                    QUATRE_PAN = QUATRE_AMONT / QUATRE_COUNT;
                }
                if (CINQ_COUNT > 0) {
                    CINQ_PAN = CINQ_AMONT / CINQ_COUNT;
                }
                if (SIX_COUNT > 0) {
                    SIX_PAN = SIX_AMONT / SIX_COUNT;
                }
                if (SEPT_COUNT > 0) {
                    SEPT_PAN = SEPT_AMONT / SEPT_COUNT;
                }
                if (HUIT_COUNT > 0) {
                    HUIT_PAN = HUIT_AMONT / HUIT_COUNT;
                }
                if (NEUF_COUNT > 0) {
                    NEUF_PAN = NEUF_AMONT / NEUF_COUNT;
                }
                if (DIX_COUNT > 0) {
                    DIX_PAN = DIX_AMONT / DIX_COUNT;
                }

                EntityData entityData = new EntityData();
                entityData.setStr_value1(JOUR);
                entityData.setStr_value2(OP);
                entityData.setStr_value3("val_nbre_pan_lig");
                entityData.setStr_value13(Math.round(DIX_AMONT) + "_" + Math.round(DIX_COUNT) + "_"
                        + Math.round(DIX_PAN) + "_" + DIX_REFERNCEVALUE);
                entityData.setStr_value12(Math.round(NEUF_AMONT) + "_" + Math.round(NEUF_COUNT) + "_"
                        + Math.round(NEUF_PAN) + "_" + NEUF_REFERNCEVALUE);
                entityData.setStr_value11(Math.round(HUIT_AMONT) + "_" + Math.round(HUIT_COUNT) + "_"
                        + Math.round(HUIT_PAN) + "_" + HUIT_REFERNCEVALUE);
                entityData.setStr_value10(Math.round(SEPT_AMONT) + "_" + Math.round(SEPT_COUNT) + "_"
                        + Math.round(SEPT_PAN) + "_" + SEPT_REFERNCEVALUE);
                entityData.setStr_value9(Math.round(SIX_AMONT) + "_" + Math.round(SIX_COUNT) + "_" + Math.round(SIX_PAN)
                        + "_" + SIX_REFERNCEVALUE);
                entityData.setStr_value8(Math.round(CINQ_AMONT) + "_" + Math.round(CINQ_COUNT) + "_"
                        + Math.round(CINQ_PAN) + "_" + CINQ_REFERNCEVALUE);
                entityData.setStr_value7(Math.round(QUATRE_AMONT) + "_" + Math.round(QUATRE_COUNT) + "_"
                        + Math.round(QUATRE_PAN) + "_" + QUATRE_REFERNCEVALUE);
                entityData.setStr_value6(Math.round(TROIS_AMONT) + "_" + Math.round(TROIS_COUNT) + "_"
                        + Math.round(TROIS_PAN) + "_" + TROIS_REFERNCEVALUE);
                entityData.setStr_value5(Math.round(DEUX_AMONT) + "_" + Math.round(DEUX_COUNT) + "_"
                        + Math.round(DEUX_PAN) + "_" + DEUX_REFERNCEVALUE);
                entityData.setStr_value4(Math.round(UN_AMONT) + "_" + Math.round(UN_COUNT) + "_" + Math.round(UN_PAN)
                        + "_" + UN_REFERNCEVALUE);
                entityData.setStr_value14(Math.round(TOTAL_AMOUNT) + "_" + Math.round(TOTAL_COUNT) + "_"
                        + Math.round(TOTAL_PAN) + "_" + TOTAL_REFERNCEVALUE);
                datas.add(entityData);

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    private TTrancheHoraire findTrancheHoraire(String lg_TRANCHE_HORAIRE_ID) {
        return this.getOdataManager().getEm().find(TTrancheHoraire.class, lg_TRANCHE_HORAIRE_ID);
    }

    public JSONArray getVisitorsStatisticsGraphesData(String dt_start, String dt_end) {
        JSONArray data = new JSONArray();
        try {
            JSONArray array = this.getVisitorStatisticData(dt_start, dt_end);

            double UN_AMONT = 0, DEUX_AMONT = 0, TROIS_AMONT = 0, QUATRE_AMONT = 0, CINQ_AMONT = 0, SIX_AMONT = 0,
                    SEPT_AMONT = 0, HUIT_AMONT = 0, NEUF_AMONT = 0, DIX_AMONT = 0;
            double UN_COUNT = 0, DEUX_COUNT = 0, TROIS_COUNT = 0, QUATRE_COUNT = 0, VALUES_COUNT = 0, CINQ_COUNT = 0,
                    SIX_COUNT = 0, SEPT_COUNT = 0, HUIT_COUNT = 0, NEUF_COUNT = 0, DIX_COUNT = 0;
            long UN_REFERNCEVALUE = 0, DEUX_REFERNCEVALUE = 0, TROIS_REFERNCEVALUE = 0, QUATRE_REFERNCEVALUE = 0,
                    CINQ_REFERNCEVALUE = 0, SIX_REFERNCEVALUE = 0, SEPT_REFERNCEVALUE = 0, HUIT_REFERNCEVALUE = 0,
                    NEUF_REFERNCEVALUE = 0, DIX_REFERNCEVALUE = 0;
            double UN_PAN = 0, DEUX_PAN = 0, TROIS_PAN = 0, QUATRE_PAN = 0, CINQ_PAN = 0, SIX_PAN = 0, SEPT_PAN = 0,
                    HUIT_PAN = 0, NEUF_PAN = 0, DIX_PAN = 0;

            for (int i = 0; i < array.length(); i++) {
                JSONObject json = array.getJSONObject(i);
                TTrancheHoraire th = findTrancheHoraire(json.get("LG_TRANCHE_HORAIRE").toString());

                if (th.getIntHEUREMIN() >= 7 && th.getIntHEUREMAX() <= 9) {
                    UN_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    UN_COUNT += Double.valueOf(json.get("COUNT") + "");
                    UN_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 9 && th.getIntHEUREMAX() <= 11) {
                    DEUX_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    DEUX_COUNT += Double.valueOf(json.get("COUNT") + "");
                    DEUX_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 11 && th.getIntHEUREMAX() <= 14) {
                    System.out.println(" th.getIntHEUREMIN() " + th.getIntHEUREMIN() + " th.getIntHEUREMAX() "
                            + th.getIntHEUREMAX() + " " + json.get("AMOUNT"));
                    TROIS_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    TROIS_COUNT += Double.valueOf(json.get("COUNT") + "");
                    TROIS_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 14 && th.getIntHEUREMAX() <= 16) {
                    QUATRE_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    QUATRE_COUNT += Double.valueOf(json.get("COUNT") + "");
                    QUATRE_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 16 && th.getIntHEUREMAX() <= 17) {

                    CINQ_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    CINQ_COUNT += Double.valueOf(json.get("COUNT") + "");
                    CINQ_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 17 && th.getIntHEUREMAX() <= 18) {
                    SIX_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    SIX_COUNT += Double.valueOf(json.get("COUNT") + "");
                    SIX_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 18 && th.getIntHEUREMAX() <= 19) {
                    SEPT_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    SEPT_COUNT += Double.valueOf(json.get("COUNT") + "");
                    SEPT_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 19 && th.getIntHEUREMAX() <= 20) {
                    HUIT_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    HUIT_COUNT += Double.valueOf(json.get("COUNT") + "");
                    HUIT_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 20 && th.getIntHEUREMAX() <= 24) {
                    NEUF_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    NEUF_COUNT += Double.valueOf(json.get("COUNT") + "");
                    NEUF_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }
                if (th.getIntHEUREMIN() >= 0 && th.getIntHEUREMAX() <= 7) {
                    DIX_AMONT += Double.valueOf(json.get("AMOUNT") + "");
                    DIX_COUNT += Double.valueOf(json.get("COUNT") + "");
                    DIX_REFERNCEVALUE += Long.valueOf(json.get("REFERNCEVALUE") + "");
                }

            }

            if (UN_COUNT > 0) {
                UN_PAN = UN_AMONT / UN_COUNT;
            }
            if (DEUX_COUNT > 0) {
                DEUX_PAN = DEUX_AMONT / DEUX_COUNT;
            }
            if (TROIS_COUNT > 0) {
                TROIS_PAN = TROIS_AMONT / TROIS_COUNT;
            }
            if (QUATRE_COUNT > 0) {
                QUATRE_PAN = QUATRE_AMONT / QUATRE_COUNT;
            }
            if (CINQ_COUNT > 0) {
                CINQ_PAN = CINQ_AMONT / CINQ_COUNT;
            }
            if (SIX_COUNT > 0) {
                SIX_PAN = SIX_AMONT / SIX_COUNT;
            }
            if (SEPT_COUNT > 0) {
                SEPT_PAN = SEPT_AMONT / SEPT_COUNT;
            }
            if (HUIT_COUNT > 0) {
                HUIT_PAN = HUIT_AMONT / HUIT_COUNT;
            }
            if (NEUF_COUNT > 0) {
                NEUF_PAN = NEUF_AMONT / NEUF_COUNT;
            }
            if (DIX_COUNT > 0) {
                DIX_PAN = DIX_AMONT / DIX_COUNT;
            }
            JSONObject finaljson = new JSONObject();
            finaljson.put("id", 1);
            finaljson.put("TRANCHEHORAIRE", "7:00-8:59");
            finaljson.put("Montant", Math.round(UN_AMONT));
            finaljson.put("Pan Moy", Math.round(UN_PAN));
            finaljson.put("Nbre Vente", UN_COUNT);
            finaljson.put("Nbre Ref", UN_REFERNCEVALUE);

            data.put(finaljson);

            finaljson = new JSONObject();
            finaljson.put("id", 2);
            finaljson.put("TRANCHEHORAIRE", "9:00-10:59");
            finaljson.put("Montant", Math.round(DEUX_AMONT));
            finaljson.put("Pan Moy", Math.round(DEUX_PAN));
            finaljson.put("Nbre Vente", DEUX_COUNT);
            finaljson.put("Nbre Ref", DEUX_REFERNCEVALUE);
            data.put(finaljson);
            finaljson = new JSONObject();
            finaljson.put("id", 3);
            finaljson.put("TRANCHEHORAIRE", "11:00-13:59");
            finaljson.put("Montant", Math.round(TROIS_AMONT));
            finaljson.put("Pan Moy", Math.round(TROIS_PAN));
            finaljson.put("Nbre Vente", TROIS_COUNT);
            finaljson.put("Nbre Ref", TROIS_REFERNCEVALUE);
            data.put(finaljson);

            finaljson = new JSONObject();
            finaljson.put("id", 4);
            finaljson.put("TRANCHEHORAIRE", "14:00-15:59");
            finaljson.put("Montant", Math.round(QUATRE_AMONT));
            finaljson.put("Pan Moy", Math.round(QUATRE_PAN));
            finaljson.put("Nbre Vente", QUATRE_COUNT);
            finaljson.put("Nbre Ref", QUATRE_REFERNCEVALUE);
            data.put(finaljson);

            finaljson = new JSONObject();
            finaljson.put("id", 5);
            finaljson.put("TRANCHEHORAIRE", "16:00-16:59");
            finaljson.put("Montant", Math.round(CINQ_AMONT));
            finaljson.put("Pan Moy", Math.round(CINQ_PAN));
            finaljson.put("Nbre Vente", CINQ_COUNT);
            finaljson.put("Nbre Ref", CINQ_REFERNCEVALUE);
            data.put(finaljson);

            finaljson = new JSONObject();
            finaljson.put("id", 6);
            finaljson.put("TRANCHEHORAIRE", "17:00-17:59");
            finaljson.put("Montant", Math.round(SIX_AMONT));
            finaljson.put("Pan Moy", Math.round(SIX_PAN));
            finaljson.put("Nbre Vente", SIX_COUNT);
            finaljson.put("Nbre Ref", SIX_REFERNCEVALUE);
            data.put(finaljson);

            finaljson = new JSONObject();
            finaljson.put("id", 7);
            finaljson.put("TRANCHEHORAIRE", "18:00-18:59");
            finaljson.put("Montant", Math.round(SEPT_AMONT));
            finaljson.put("Pan Moy", Math.round(SEPT_PAN));
            finaljson.put("Nbre Vente", SEPT_COUNT);
            finaljson.put("Nbre Ref", SEPT_REFERNCEVALUE);
            data.put(finaljson);

            finaljson = new JSONObject();
            finaljson.put("id", 8);
            finaljson.put("TRANCHEHORAIRE", "19:00-20:59");
            finaljson.put("Montant", Math.round(HUIT_AMONT));
            finaljson.put("Pan Moy", Math.round(HUIT_PAN));
            finaljson.put("Nbre Vente", HUIT_COUNT);
            finaljson.put("Nbre Ref", HUIT_REFERNCEVALUE);
            data.put(finaljson);
            finaljson = new JSONObject();
            finaljson.put("id", 9);
            finaljson.put("TRANCHEHORAIRE", "20:00-23:59");
            finaljson.put("Montant", Math.round(NEUF_AMONT));
            finaljson.put("Pan Moy", Math.round(NEUF_PAN));
            finaljson.put("Nbre Vente", NEUF_COUNT);
            finaljson.put("Nbre Ref", NEUF_REFERNCEVALUE);
            data.put(finaljson);

            finaljson = new JSONObject();
            finaljson.put("id", 10);
            finaljson.put("TRANCHEHORAIRE", "00:00-06:59");
            finaljson.put("Montant", Math.round(DIX_AMONT));
            finaljson.put("Pan Moy", Math.round(DIX_PAN));
            finaljson.put("Nbre Vente", DIX_COUNT);
            finaljson.put("Nbre Ref", DIX_REFERNCEVALUE);
            data.put(finaljson);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return data;
    }

    public List<EntityData> getFactureFournisseursData(String dt_start, String dt_end, String search_value,
            String lg_GROSSISTE) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `pro_factures_fournisseurs`(?1,?2,?3,?4)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").setParameter(4, lg_GROSSISTE)
                    .getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");// datebl
                entityData.setStr_value2(objects[1] + "");// LIBELLE
                entityData.setStr_value3(objects[2] + "");// GROSSISTE
                entityData.setStr_value4(objects[3] + "");// MONTANTFACTURED
                entityData.setStr_value5(objects[4] + "");// MONTANTAVOIR
                entityData.setStr_value6(objects[5] + "");// TVA
                entityData.setStr_value7(objects[6] + "");// ECHEANCE
                entityData.setStr_value8(objects[7] + "");// FACTURE OR AVOIR
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<EntityData> getRapportGestionData(String dt_start, String dt_end) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_rapport_gestion`(?1,?2)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                entityData.setStr_value3(objects[2] + "");

                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public long getFrequentationCount(String dt_start, String dt_end) {
        long count = 0l;
        try {
            List obj = this.getOdataManager().getEm().createNativeQuery(
                    "SELECT COUNT(*) FROM t_preenregistrement p WHERE  p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)>='"
                            + dt_start + "' AND DATE(p.`dt_CREATED`)<='" + dt_end
                            + "' GROUP BY p.`lg_USER_VENDEUR_ID`,DATE(p.`dt_CREATED`)")
                    .getResultList();
            for (Object object : obj) {
                // System.out.println("object "+object);
                count++;
            }

            count = obj.size();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public List<EntityData> analyseFrequentation(String dt_start, String dt_end, int start, int limit) {
        List<EntityData> data = new ArrayList<>();
        String query = " SELECT DATE(o.`dt_CREATED`) AS DATEOPERATION, CONCAT(ucase(substr(u.`str_FIRST_NAME`,1,1)),'.',u.`str_LAST_NAME`) AS VENDEUR, \n"
                + "                COUNT(IF ((HOUR(o.`dt_CREATED`)>='0' AND HOUR(o.`dt_CREATED`)<='6'),1, NULL)) AS `DIX_COUNT`,\n"
                + "                SUM((CASE WHEN (HOUR(o.`dt_CREATED`)<='0' AND HOUR(o.`dt_CREATED`)<='6') THEN o.`int_PRICE` ELSE 0 END)) AS `DIX_MONTANT`, \n"
                + "                COUNT(IF ((HOUR(o.`dt_CREATED`)>='7' AND HOUR(o.`dt_CREATED`)<='8'),1, NULL)) AS `UN_COUNT`,\n"
                + "                SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='7' AND HOUR(o.`dt_CREATED`)<='8') THEN o.`int_PRICE` ELSE 0 END)) AS `UN_MONTANT`, \n"
                + "                COUNT(IF ((HOUR(o.`dt_CREATED`)>='9' AND HOUR(o.`dt_CREATED`)<='10'),1, NULL)) AS `DEUX_COUNT`,\n"
                + "                SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='9' AND HOUR(o.`dt_CREATED`)<='10') THEN o.`int_PRICE` ELSE 0 END)) AS `DEUX_MONTANT`, \n"
                + "                COUNT(IF ((HOUR(o.`dt_CREATED`)>='11' AND HOUR(o.`dt_CREATED`)<='13'),1, NULL)) AS `TROIS_COUNT`,\n"
                + "                SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='11' AND HOUR(o.`dt_CREATED`)<='13') THEN o.`int_PRICE` ELSE 0 END)) AS `TROIS_MONTANT` , \n"
                + "                COUNT(IF ((HOUR(o.`dt_CREATED`)>='14' AND HOUR(o.`dt_CREATED`)<='15'),1, NULL)) AS `QUATRE_COUNT`,\n"
                + "                SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='14' AND HOUR(o.`dt_CREATED`)<='15') THEN o.`int_PRICE` ELSE 0 END)) AS `QUATRE_MONTANT`, \n"
                + "                COUNT(IF (HOUR(o.`dt_CREATED`)='16' ,1, NULL)) AS `CINQ_COUNT`,\n"
                + "                SUM((CASE WHEN HOUR(o.`dt_CREATED`)='16'  THEN o.`int_PRICE` ELSE 0 END)) AS `CINQ_MONTANT`, \n"
                + "                COUNT(IF (HOUR(o.`dt_CREATED`)='17' ,1, NULL))  AS `SIX_COUNT`,\n"
                + "                SUM((CASE WHEN HOUR(o.`dt_CREATED`)='17' THEN o.`int_PRICE` ELSE 0 END)) AS `SIX_MONTANT` ,\n"
                + "                COUNT(IF (HOUR(o.`dt_CREATED`)='18' ,1, NULL)) AS  `SEPT_COUNT`,\n"
                + "                SUM((CASE WHEN HOUR(o.`dt_CREATED`)='18'  THEN o.`int_PRICE` ELSE 0 END)) AS `SEPT_MONTANT`, \n"
                + "                COUNT(IF (HOUR(o.`dt_CREATED`)='19' ,1, NULL))  AS `HUIT_COUNT`,\n"
                + "                SUM((CASE WHEN HOUR(o.`dt_CREATED`)='19'  THEN o.`int_PRICE` ELSE 0 END)) AS `HUIT_MONTANT`, \n"
                + "                COUNT(IF ((HOUR(o.`dt_CREATED`)>='20' AND HOUR(o.`dt_CREATED`)<='23'),1, NULL)) AS `NEUF_COUNT`,\n"
                + "                 SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='20' AND HOUR(o.`dt_CREATED`)<='23') THEN o.`int_PRICE` ELSE 0 END))  AS `NEUF_MONTANT` ,\n"
                + "               \n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)>='0' AND HOUR(p.`dt_CREATED`)<='6') AS `DIX_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)>='7' AND HOUR(p.`dt_CREATED`)<='8') AS `UN_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)>='9' AND HOUR(p.`dt_CREATED`)<='10') AS `DEUX_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)>='11' AND HOUR(p.`dt_CREATED`)<='13') AS `TROIS_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)>='14' AND HOUR(p.`dt_CREATED`)<='15') AS `QUATRE_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)='16' ) AS `CINQ_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)='17' ) AS `SIX_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)='18' ) AS `SEPT_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)='19' ) AS `HUIT_REFERNCEVALUE`,\n"
                + "                (SELECT SUM(d.`int_QUANTITY`) FROM t_preenregistrement_detail d,t_preenregistrement p WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`\n"
                + "                AND p.`lg_USER_VENDEUR_ID`=o.`lg_USER_VENDEUR_ID` AND p.`int_PRICE`>0 AND \n"
                + "                p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'  AND DATE(p.`dt_CREATED`)=DATE(o.`dt_CREATED`) AND\n"
                + "                HOUR(p.`dt_CREATED`)>='20' AND HOUR(p.`dt_CREATED`)<='23') AS `NEUF_REFERNCEVALUE`,\n"
                + "                ROUND(SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='0' AND HOUR(o.`dt_CREATED`)<='6') THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF ((HOUR(o.`dt_CREATED`)<='0' AND HOUR(o.`dt_CREATED`)<'7'),1, NULL)),0) AS `PAN_MOY_DIX`,\n"
                + "                ROUND(SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='7' AND HOUR(o.`dt_CREATED`)<='8') THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF ((HOUR(o.`dt_CREATED`)>='7' AND HOUR(o.`dt_CREATED`)<'9'),1, NULL)),0) AS `PAN_MOY_UN`, \n"
                + "                ROUND(SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='9' AND HOUR(o.`dt_CREATED`)<='10') THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF ((HOUR(o.`dt_CREATED`)>='9' AND HOUR(o.`dt_CREATED`)<'11'),1, NULL)),0) AS `PAN_MOY_DEUX`, \n"
                + "                ROUND(SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='11' AND HOUR(o.`dt_CREATED`)<='13') THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF ((HOUR(o.`dt_CREATED`)>='11' AND HOUR(o.`dt_CREATED`)<'14'),1, NULL)),0) AS `PAN_MOY_TROIX`, \n"
                + "                ROUND(SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='14' AND HOUR(o.`dt_CREATED`)<='15') THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF ((HOUR(o.`dt_CREATED`)>='14' AND HOUR(o.`dt_CREATED`)<'16'),1, NULL)),0) AS `PAN_MOY_QUATRE`, \n"
                + "                ROUND(SUM((CASE WHEN HOUR(o.`dt_CREATED`)='16' THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF (HOUR(o.`dt_CREATED`)='16' ,1, NULL)),0) AS `PAN_MOY_CINQ`,\n"
                + "                ROUND(SUM((CASE WHEN HOUR(o.`dt_CREATED`)='17'  THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF (HOUR(o.`dt_CREATED`)='17' ,1, NULL)),0) AS `PAN_MOY_SIX`,  \n"
                + "                ROUND(SUM((CASE WHEN HOUR(o.`dt_CREATED`)='18' THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF (HOUR(o.`dt_CREATED`)='18' ,1, NULL)),0) AS `PAN_MOY_SEPT`,  \n"
                + "                ROUND(SUM((CASE WHEN HOUR(o.`dt_CREATED`)='19'  THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF (HOUR(o.`dt_CREATED`)='19' ,1, NULL)),0) AS `PAN_MOY_HUIT`,  \n"
                + "                ROUND(SUM((CASE WHEN (HOUR(o.`dt_CREATED`)>='20' AND HOUR(o.`dt_CREATED`)<='23') THEN o.`int_PRICE` ELSE 0 END))/COUNT(IF ((HOUR(o.`dt_CREATED`)>='20' AND HOUR(o.`dt_CREATED`)<='23'),1, NULL)),0) AS `PAN_MOY_NEUF` \n"
                + "FROM t_preenregistrement o,t_user u WHERE  u.`lg_USER_ID`=o.`lg_USER_VENDEUR_ID` AND "
                + "DATE(o.`dt_CREATED`)>='" + dt_start + "' AND DATE(o.`dt_CREATED`)<='" + dt_end + "' "
                + "AND o.`int_PRICE`>0 AND o.`b_IS_CANCEL`=0 AND o.`str_STATUT`='is_Closed' GROUP BY o.`lg_USER_VENDEUR_ID` ,DATE(o.`dt_CREATED`) ORDER BY DATE(o.`dt_CREATED`) DESC  LIMIT "
                + start + "," + limit + "   ";

        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();

            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                entityData.setStr_value3("val_nbre_pan_lig");
                String _1ref = "", _2ref = "", _3ref = "", _4ref = "", _5ref = "", _6ref = "", _7ref = "", _8ref = "",
                        _9ref = "", _10ref = "", _11ref = "";
                String _1rep = "", _2rep = "", _3rep = "", _4rep = "", _5rep = "", _6rep = "", _7rep = "", _8rep = "",
                        _9rep = "", _10rep = "", _11rep = "";
                _10rep = (objects[32] != null ? objects[32] : 0) + "";
                _10ref = (objects[22] != null ? objects[22] : 0) + "";
                _1rep = (objects[33] != null ? objects[33] : 0) + "";
                _1ref = (objects[23] != null ? objects[23] : 0) + "";
                _2rep = (objects[34] != null ? objects[34] : 0) + "";
                _2ref = (objects[24] != null ? objects[24] : 0) + "";
                _3rep = (objects[35] != null ? objects[35] : 0) + "";
                _3ref = (objects[25] != null ? objects[25] : 0) + "";
                _4rep = (objects[36] != null ? objects[36] : 0) + "";
                _4ref = (objects[26] != null ? objects[26] : 0) + "";
                _5rep = (objects[37] != null ? objects[37] : 0) + "";
                _5ref = (objects[27] != null ? objects[27] : 0) + "";
                _6rep = (objects[38] != null ? objects[38] : 0) + "";
                _6ref = (objects[28] != null ? objects[28] : 0) + "";
                _7rep = (objects[39] != null ? objects[39] : 0) + "";
                _7ref = (objects[29] != null ? objects[29] : 0) + "";
                _8rep = (objects[40] != null ? objects[40] : 0) + "";
                _8ref = (objects[30] != null ? objects[30] : 0) + "";
                _9rep = (objects[41] != null ? objects[41] : 0) + "";
                _9ref = (objects[31] != null ? objects[31] : 0) + "";
                System.out.println("objects[25] " + objects[25]);
                entityData.setStr_value13(objects[3] + "_" + objects[2] + "_" + _10rep + "_" + _10ref);
                entityData.setStr_value4(objects[5] + "_" + objects[4] + "_" + _1rep + "_" + _1ref + "");
                entityData.setStr_value5(objects[7] + "_" + objects[6] + "_" + _2rep + "_" + _2ref + "");
                entityData.setStr_value6(objects[9] + "_" + objects[8] + "_" + _3rep + "_" + _3ref + "");
                entityData.setStr_value7(objects[11] + "_" + objects[10] + "_" + _4rep + "_" + _4ref + "");
                entityData.setStr_value8(objects[13] + "_" + objects[12] + "_" + _5rep + "_" + _5ref + "");
                entityData.setStr_value9(objects[15] + "_" + objects[14] + "_" + _6rep + "_" + _6ref + "");
                entityData.setStr_value10(objects[17] + "_" + objects[16] + "_" + _7rep + "_" + _7ref + "");
                entityData.setStr_value11(objects[19] + "_" + objects[18] + "_" + _8rep + "_" + _8ref + "");
                entityData.setStr_value12(objects[21] + "_" + objects[20] + "_" + _9rep + "_" + _9ref + "");

                long totalAmont = Long.valueOf(objects[3] + "") + Long.valueOf(objects[5] + "")
                        + Long.valueOf(objects[7] + "") + Long.valueOf(objects[9] + "") + Long.valueOf(objects[11] + "")
                        + Long.valueOf(objects[13] + "") + Long.valueOf(objects[15] + "")
                        + Long.valueOf(objects[17] + "") + Long.valueOf(objects[19] + "")
                        + Long.valueOf(objects[21] + "");
                long totalCount = Long.valueOf(objects[2] + "") + Long.valueOf(objects[4] + "")
                        + Long.valueOf(objects[6] + "") + Long.valueOf(objects[8] + "") + Long.valueOf(objects[10] + "")
                        + Long.valueOf(objects[12] + "") + Long.valueOf(objects[14] + "")
                        + Long.valueOf(objects[16] + "") + Long.valueOf(objects[18] + "")
                        + Long.valueOf(objects[20] + "");
                long totalPMOY = Long.valueOf(_10rep) + Long.valueOf(_1rep) + Long.valueOf(_2rep) + Long.valueOf(_3rep)
                        + Long.valueOf(_4rep) + Long.valueOf(_5rep) + Long.valueOf(_6rep) + Long.valueOf(_7rep)
                        + Long.valueOf(_8rep) + Long.valueOf(_9rep);
                long totalREF = Long.valueOf(_10ref) + Long.valueOf(_1ref) + Long.valueOf(_2ref) + Long.valueOf(_3ref)
                        + Long.valueOf(_4ref) + Long.valueOf(_5ref) + Long.valueOf(_6ref) + Long.valueOf(_7ref)
                        + Long.valueOf(_8ref) + Long.valueOf(_9ref);

                entityData.setStr_value14(totalAmont + "_" + totalCount + "_" + totalPMOY + "_" + totalREF + "");
                data.add(entityData);

            }
        } catch (Exception e) {
            e.printStackTrace();

        }

        return data;

    }

    // fonction de calcul pour les 20/80
    public List<EntityData> geVingtQuatreVingtParCa(String dt_start, String dt_end) {
        List<EntityData> datas = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        // String lg_EMPLACEMENT_ID = "";
        try {
            String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            String CAquery = "SELECT ROUND(SUM( p.`int_PRICE`)*(80/100),0) AS  MONTANTQUATREVINT FROM t_preenregistrement p WHERE DATE(p.`dt_CREATED`) >='"
                    + dt_start + "' AND DATE(p.`dt_CREATED`)<='" + dt_end
                    + "' AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE`>0 AND p.`str_STATUT`='is_Closed'";
            Object obj = this.getOdataManager().getEm().createNativeQuery(CAquery).getSingleResult();
            long CA = 0, _CA = 0;

            if (obj != null) {
                CA = Long.valueOf(obj + "");
                String query = "SELECT SUM( d.`int_PRICE`) AS MONTANTCA ,f.`str_NAME`,f.`int_CIP` ,SUM(d.`int_QUANTITY`) AS QTY ,f.`lg_FAMILLE_ID`,f.`lg_GROSSISTE_ID`  "
                        + "FROM t_preenregistrement p,t_preenregistrement_detail d, t_famille f , t_user u "
                        + "WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID` AND p.lg_USER_ID = u.lg_USER_ID AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND "
                        + "DATE(p.`dt_CREATED`) >='" + dt_start + "' AND DATE(p.`dt_CREATED`)<='" + dt_end
                        + "' AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE`>0 AND p.`str_STATUT`='"
                        + commonparameter.statut_is_Closed + "' AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                        + "'" + "GROUP BY f.`lg_FAMILLE_ID` ORDER BY SUM( d.`int_PRICE`) DESC";

                List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();

                for (Object[] objects : list) {
                    EntityData entityData = new EntityData();
                    entityData.setStr_value1(objects[0] + "");
                    entityData.setStr_value2(objects[1] + "");
                    entityData.setStr_value3(objects[2] + "");
                    entityData.setStr_value4(objects[3] + "");
                    entityData.setStr_value5(objects[4] + "");
                    entityData.setStr_value6(objects[5] + "");
                    entityData.setStr_value7(getStock(objects[4] + "", lg_EMPLACEMENT_ID) + "");
                    datas.add(entityData);
                    _CA += Long.valueOf(objects[0] + "");

                    if (CA <= _CA) {

                        break;
                    }

                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;

    }

    public List<EntityData> geVingtQuatreVingtParQty(String dt_start, String dt_end) {
        List<EntityData> datas = new ArrayList<>();

        try {
            String CAquery = "SELECT ROUND(SUM( p.`int_QUANTITY`)*(80/100),0) AS  MONTANTQUATREVINT FROM t_preenregistrement_detail p,t_preenregistrement pd WHERE pd.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` AND DATE(p.`dt_CREATED`) >='"
                    + dt_start + "' AND DATE(p.`dt_CREATED`)<='" + dt_end
                    + "' AND pd.`b_IS_CANCEL`=0 AND pd.`int_PRICE`>0 AND pd.`str_STATUT`='is_Closed'";
            Object obj = this.getOdataManager().getEm().createNativeQuery(CAquery).getSingleResult();
            long CA = 0, _CA = 0;

            if (obj != null) {
                CA = Long.valueOf(obj + "");
                String query = "SELECT SUM( d.`int_PRICE`) AS MONTANTCA ,f.`str_NAME`,f.`int_CIP` ,SUM(d.`int_QUANTITY`) AS QTY,f.`lg_FAMILLE_ID` , f.`lg_GROSSISTE_ID` FROM t_preenregistrement p,t_preenregistrement_detail d, "
                        + "t_famille f WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID` AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND "
                        + "DATE(p.`dt_CREATED`) >='" + dt_start + "' AND DATE(p.`dt_CREATED`)<='" + dt_end
                        + "' AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE`>0 AND p.`str_STATUT`='is_Closed' "
                        + "GROUP BY f.`lg_FAMILLE_ID` ORDER BY SUM( d.`int_QUANTITY`) DESC";
                List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();

                for (Object[] objects : list) {
                    EntityData entityData = new EntityData();
                    entityData.setStr_value1(objects[0] + "");
                    entityData.setStr_value2(objects[1] + "");
                    entityData.setStr_value3(objects[2] + "");
                    entityData.setStr_value4(objects[3] + "");
                    entityData.setStr_value5(objects[4] + "");
                    entityData.setStr_value6(objects[5] + "");
                    entityData.setStr_value7(getStock(objects[4] + "", "1") + "");
                    datas.add(entityData);
                    _CA += Long.valueOf(objects[3] + "");

                    if (CA <= _CA) {

                        break;
                    }

                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;

    }

    public List<EntityData> getTableauPharmacien(String dt_start, String dt_end) {
        List<EntityData> datas = new ArrayList<>();

        int isOk = 0;
        TParameters OTParameters = null;

        try {
            try {
                OTParameters = this.getOdataManager().getEm().getReference(TParameters.class, "KEY_PARAMS");
                if (OTParameters != null) {
                    isOk = Integer.valueOf(OTParameters.getStrVALUE().trim());
                }

            } catch (Exception e) {
            }

            String query = "CALL `proc_tableaupharmacien`(?,?)";
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).setParameter(1, dt_start)
                    .setParameter(2, dt_end).getResultList();

            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0].toString());
                // entityData.setStr_value2(String.valueOf(objects[1])); // a decommenter en cas de probleme 09/08/2016
                entityData.setStr_value2((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && !dt_start.equals(dt_end))
                                ? String.valueOf(Double.parseDouble(String.valueOf(objects[13]))
                                        - Double.parseDouble(String.valueOf(objects[14] != null ? objects[14] : 0)) >= 0
                                                ? Double.parseDouble(String.valueOf(objects[13])) - Double.parseDouble(
                                                        String.valueOf(objects[14] != null ? objects[14] : 0))
                                                : String.valueOf(objects[13]))
                                : String.valueOf(objects[1]));
                entityData.setStr_value3(String.valueOf(objects[2]));
                entityData.setStr_value4(String.valueOf(objects[3]));
                // entityData.setStr_value5(String.valueOf(objects[4])); // a decommenter en cas de probleme 09/08/2016

                entityData.setStr_value5((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && !dt_start.equals(dt_end))
                                ? String.valueOf(Double.parseDouble(String.valueOf(objects[15]))
                                        - Double.parseDouble(String.valueOf(objects[14] != null ? objects[14] : 0)) >= 0
                                                ? Double.parseDouble(String.valueOf(objects[15])) - Double.parseDouble(
                                                        String.valueOf(objects[14] != null ? objects[14] : 0))
                                                : String.valueOf(objects[15]))
                                : String.valueOf(objects[4]));
                entityData.setStr_value6(String.valueOf(objects[5]));
                entityData.setStr_value7(String.valueOf(objects[6]));
                entityData.setStr_value8(String.valueOf(objects[7]));
                entityData.setStr_value9(String.valueOf(objects[8]));
                entityData.setStr_value10(String.valueOf(objects[9]));
                entityData.setStr_value11(String.valueOf(objects[10]));
                entityData.setStr_value12(String.valueOf(objects[11]));
                entityData.setStr_value13(String.valueOf(objects[12]));
                entityData.setStr_value14(String.valueOf(objects[13]));
                entityData.setStr_value15(String.valueOf(objects[14] != null ? objects[14] : 0)); // 08/09/2016
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public int getStock(String idProduct, String emp) {
        Integer stock = 0;
        try {
            stock = (Integer) this.getOdataManager().getEm().createQuery(
                    "SELECT o.intNUMBERAVAILABLE FROM TFamilleStock o WHERE o.strSTATUT='enable' AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?1 AND o.lgFAMILLEID.lgFAMILLEID=?2 ")
                    .setMaxResults(1).setParameter(1, emp).setParameter(2, idProduct).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return stock;
    }
}
