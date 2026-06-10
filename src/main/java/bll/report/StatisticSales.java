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
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
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
        try {
            LocalDate _start = LocalDate.parse(dt_start);
            LocalDate _end = LocalDate.parse(dt_end);
            LocalDate firstMonth = LocalDate.of(_start.getYear(), _start.getMonthValue(), 1);
            LocalDate lastMonth = LocalDate.of(_end.getYear(), _end.getMonthValue(), 1);

            Map<String, Object[]> aggregatesByMonth = new HashMap<>();
            for (Object[] row : getMonthlySalesAggregates(dt_start, dt_end, emp)) {
                aggregatesByMonth.put(((Number) row[0]).intValue() + "_" + ((Number) row[1]).intValue(), row);
            }

            int id = 0;
            // les cumuls repartent de zero a chaque annee civile
            int cumulYear = -1;
            int nbreclients_cumul = 0, count_vo_cumul = 0, count_vno_cumul = 0;
            double montant_brut_cumul = 0, remise_cumul = 0, montant_vo_cumul = 0, montant_vno_cumul = 0;
            for (LocalDate monthDate = firstMonth; !monthDate.isAfter(lastMonth); monthDate = monthDate.plusMonths(1)) {
                int year = monthDate.getYear();
                int month = monthDate.getMonthValue();
                Object[] row = aggregatesByMonth.get(year + "_" + month);
                int count = row != null ? ((Number) row[2]).intValue() : 0;
                double amount = row != null ? ((Number) row[3]).doubleValue() : 0;
                double remise = row != null ? ((Number) row[4]).doubleValue() : 0;
                int count_vo = row != null ? ((Number) row[5]).intValue() : 0;
                double amount_vo = row != null ? ((Number) row[6]).doubleValue() : 0;
                int count_vno = row != null ? ((Number) row[7]).intValue() : 0;
                double amount_vno = row != null ? ((Number) row[8]).doubleValue() : 0;

                if (year != cumulYear) {
                    cumulYear = year;
                    nbreclients_cumul = 0;
                    count_vo_cumul = 0;
                    count_vno_cumul = 0;
                    montant_brut_cumul = 0;
                    remise_cumul = 0;
                    montant_vo_cumul = 0;
                    montant_vno_cumul = 0;
                }
                nbreclients_cumul += count;
                montant_brut_cumul += amount;
                remise_cumul += remise;
                count_vo_cumul += count_vo;
                montant_vo_cumul += amount_vo;
                count_vno_cumul += count_vno;
                montant_vno_cumul += amount_vno;

                double net_ttc = amount - remise;
                double panier_moy_vo = count_vo > 0 ? amount_vo / count_vo : 0;
                double panier_moy_vno = count_vno > 0 ? amount_vno / count_vno : 0;
                double panier_moy_vo_cumul = count_vo_cumul > 0 ? montant_vo_cumul / count_vo_cumul : 0;
                double panier_moy_vno_cumul = count_vno_cumul > 0 ? montant_vno_cumul / count_vno_cumul : 0;
                double vo_month_percent = 0, vno_month_percent = 0;
                if (amount_vo > 0 || amount_vno > 0) {
                    vo_month_percent = (amount_vo * 100) / (amount_vo + amount_vno);
                    vno_month_percent = (amount_vno * 100) / (amount_vo + amount_vno);
                }
                double vo_cumul_percent = 0, vno_cumul_percent = 0;
                if (montant_vo_cumul > 0 || montant_vno_cumul > 0) {
                    vo_cumul_percent = (montant_vo_cumul * 100) / (montant_vo_cumul + montant_vno_cumul);
                    vno_cumul_percent = (montant_vno_cumul * 100) / (montant_vo_cumul + montant_vno_cumul);
                }

                JSONObject json = new JSONObject();
                id++;
                json.put("id", id);
                json.put("month", String.format("%02d/%d", month, year));
                json.put("num", month);
                json.put("year", year);
                json.put("NB_CLIENT", count);
                json.put("AMOUT_VO", amount_vo);
                json.put("AMOUT_VNO", amount_vno);
                json.put("BRUT_TTC", amount);
                json.put("NET_TTC", net_ttc);
                json.put("REMISE", remise);
                json.put("PANIER_MOYEN_M_VNO", Math.round(panier_moy_vno));
                json.put("PANIER_MOYEN_M_VO", Math.round(panier_moy_vo));
                json.put("NB_CLIENTCUMUL", nbreclients_cumul);
                json.put("MONTANT_BRUTCUMUL", montant_brut_cumul);
                json.put("MONTANT_VNOCUMUL", montant_vno_cumul);
                json.put("MONTANT_VOCUMUL", montant_vo_cumul);
                json.put("MONTANT_NETCUMUL", montant_brut_cumul - remise_cumul);
                json.put("MONTANT_REMISECUMUL", remise_cumul);
                json.put("PANIER_MOYEN_M_VNO_CUMUL", Math.round(panier_moy_vno_cumul));
                json.put("PANIER_MOYEN_M_VO_CUMUL", Math.round(panier_moy_vo_cumul));
                json.put("vo_month_percent", vo_month_percent);
                json.put("vno_month_percent", vno_month_percent);
                json.put("vo_cumul_percent", vo_cumul_percent);
                json.put("vno_cumul_percent", vno_cumul_percent);
                array.put(json);
            }
        } catch (JSONException ex) {
            Logger.getLogger(StatisticSales.class.getName()).log(Level.SEVERE, null, ex);
        }

        return array;

    }

    /**
     * Agregats mensuels des ventes calcules directement en base (une ligne par mois) : la borne de date est posee sur
     * la colonne dt_UPDATED (date de cloture effective) sans fonction afin d'exploiter l'index.
     */
    public List<Object[]> getMonthlySalesAggregates(String dt_start, String dt_end, String emp) {
        LocalDate _start = LocalDate.parse(dt_start);
        LocalDate _end = LocalDate.parse(dt_end);
        LocalDate finalStartDate = LocalDate.of(_start.getYear(), _start.getMonthValue(), 1);
        LocalDate endExclusive = LocalDate.of(_end.getYear(), _end.getMonthValue(), 1).plusMonths(1);
        String sql = "SELECT YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED)," + " COUNT(*)," + " SUM(p.int_PRICE),"
                + " SUM(IFNULL(p.int_PRICE_REMISE,0))," + " SUM(CASE WHEN p.str_TYPE_VENTE = ? THEN 1 ELSE 0 END),"
                + " SUM(CASE WHEN p.str_TYPE_VENTE = ? THEN (p.int_PRICE - IFNULL(p.int_PRICE_REMISE,0)) ELSE 0 END),"
                + " SUM(CASE WHEN p.str_TYPE_VENTE = ? THEN 1 ELSE 0 END),"
                + " SUM(CASE WHEN p.str_TYPE_VENTE = ? THEN (p.int_PRICE - IFNULL(p.int_PRICE_REMISE,0)) ELSE 0 END)"
                + " FROM t_preenregistrement p" + " INNER JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
                + " WHERE p.dt_UPDATED >= ? AND p.dt_UPDATED < ?" + " AND p.str_STATUT = ?" + " AND p.b_IS_CANCEL = 0"
                + " AND p.int_PRICE > 0" + " AND p.lg_TYPE_VENTE_ID NOT LIKE ?" + " AND u.lg_EMPLACEMENT_ID = ?"
                + " GROUP BY YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED)"
                + " ORDER BY YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED)";
        return this.getOdataManager().getEm().createNativeQuery(sql).setParameter(1, Parameter.KEY_VENTE_ORDONNANCE)
                .setParameter(2, Parameter.KEY_VENTE_ORDONNANCE).setParameter(3, Parameter.KEY_VENTE_NON_ORDONNANCEE)
                .setParameter(4, Parameter.KEY_VENTE_NON_ORDONNANCEE)
                .setParameter(5, java.sql.Timestamp.valueOf(finalStartDate.atStartOfDay()))
                .setParameter(6, java.sql.Timestamp.valueOf(endExclusive.atStartOfDay()))
                .setParameter(7, commonparameter.statut_is_Closed).setParameter(8, Parameter.VENTE_DEPOT_EXTENSION)
                .setParameter(9, emp).getResultList();
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
            // bornes posees directement sur la colonne (sans fonction DATE) pour exploiter l'index
            Predicate btw = cb.and(
                    cb.greaterThanOrEqualTo(root.get(TPreenregistrement_.dtUPDATED),
                            (Date) java.sql.Timestamp.valueOf(finalStartDate.atStartOfDay())),
                    cb.lessThan(root.get(TPreenregistrement_.dtUPDATED),
                            (Date) java.sql.Timestamp.valueOf(finalEndDate.plusDays(1).atStartOfDay())));
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
        if ("".equals(dt_start) || dt_start == null) {
            return array;
        }
        if (search_value == null) {
            search_value = "";
        }
        try {
            // Borne basse incluse. Borne haute exclusive = lendemain de dt_end :
            // dtCREATED etant un TIMESTAMP, un "<= dt_end" (ou BETWEEN) ignorerait
            // toutes les ventes du dernier jour faites apres minuit.
            Date dateDebut = java.sql.Date.valueOf(dt_start);
            boolean hasEnd = (dt_end != null) && !"".equals(dt_end);
            Date dateFinExclusive = hasEnd ? java.sql.Date.valueOf(LocalDate.parse(dt_end).plusDays(1)) : null;

            // Agregation directe en base (GROUP BY operateur) plutot que de charger
            // toutes les entites puis d'agreger en Java : 1 requete au lieu de N+1.
            String jpql = "SELECT o.lgUSERVENDEURID.lgUSERID, o.lgUSERVENDEURID.strFIRSTNAME, o.lgUSERVENDEURID.strLASTNAME, "
                    + "COUNT(o), " + "SUM(o.intPRICE), " + "SUM(o.intPRICEREMISE), "
                    + "SUM(CASE WHEN o.strTYPEVENTE = :ord AND o.intCUSTPART = 0 THEN 1 ELSE 0 END), "
                    + "SUM(CASE WHEN o.strTYPEVENTE = :ord AND o.intCUSTPART = 0 THEN (o.intPRICE - o.intPRICEREMISE) ELSE 0 END), "
                    + "SUM(CASE WHEN o.strTYPEVENTE = :ord AND o.intCUSTPART <> 0 THEN 1 ELSE 0 END), "
                    + "SUM(CASE WHEN o.strTYPEVENTE = :ord AND o.intCUSTPART <> 0 THEN (o.intPRICE - o.intPRICEREMISE) ELSE 0 END), "
                    + "SUM(CASE WHEN o.strTYPEVENTE = :nonord THEN 1 ELSE 0 END), "
                    + "SUM(CASE WHEN o.strTYPEVENTE = :nonord THEN (o.intPRICE - o.intPRICEREMISE) ELSE 0 END) "
                    + "FROM TPreenregistrement o " + "WHERE o.dtCREATED >= :dateDebut "
                    + (hasEnd ? "AND o.dtCREATED < :dateFin " : "")
                    + "AND o.intPRICE > 0 AND o.bISCANCEL = FALSE AND o.strSTATUT = :statut "
                    + "AND (o.lgUSERVENDEURID.strFIRSTNAME LIKE :search OR o.lgUSERVENDEURID.strLASTNAME LIKE :search) "
                    + "GROUP BY o.lgUSERVENDEURID.lgUSERID, o.lgUSERVENDEURID.strFIRSTNAME, o.lgUSERVENDEURID.strLASTNAME "
                    + "ORDER BY o.lgUSERVENDEURID.strFIRSTNAME, o.lgUSERVENDEURID.strLASTNAME";

            Query query = this.getOdataManager().getEm().createQuery(jpql)
                    .setParameter("ord", Parameter.KEY_VENTE_ORDONNANCE)
                    .setParameter("nonord", Parameter.KEY_VENTE_NON_ORDONNANCEE).setParameter("dateDebut", dateDebut)
                    .setParameter("statut", commonparameter.statut_is_Closed)
                    .setParameter("search", search_value + "%");
            if (hasEnd) {
                query.setParameter("dateFin", dateFinExclusive);
            }

            List<Object[]> rows = query.getResultList();

            // Total general des nets (brut - remise), base du calcul du %CA.
            double totalamount = 0;
            for (Object[] row : rows) {
                totalamount += (((Number) row[4]).doubleValue() - ((Number) row[5]).doubleValue());
            }

            int id = 0;
            for (Object[] row : rows) {
                id++;
                String firstName = (String) row[1];
                String lastName = (String) row[2];
                long count = ((Number) row[3]).longValue();
                double amount = ((Number) row[4]).doubleValue();
                double remise = ((Number) row[5]).doubleValue();
                long count_vo = ((Number) row[6]).longValue();
                double amount_vo = ((Number) row[7]).doubleValue();
                long count_vop = ((Number) row[8]).longValue();
                double amount_vop = ((Number) row[9]).doubleValue();
                long count_vno = ((Number) row[10]).longValue();
                double amount_vno = ((Number) row[11]).doubleValue();

                double net_ttc = amount - remise;
                double panier_moy = count > 0 ? net_ttc / count : 0;
                double panier_moy_vo = (count_vop + count_vo) > 0 ? (amount_vop + amount_vo) / (count_vop + count_vo)
                        : 0;
                double panier_moy_vno = count_vno > 0 ? amount_vno / count_vno : 0;
                double CA = totalamount != 0 ? (net_ttc * 100) / totalamount : 0;

                JSONObject json = new JSONObject();
                json.put("id", id);
                json.put("Operateur", firstName.substring(0, 1).toUpperCase() + "." + lastName);
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
                json.put("PANIER_MOYEN_VNO", Math.round(panier_moy_vno));
                json.put("PANIER_MOYEN_VOP", Math.round(panier_moy_vo));
                json.put("CA", new BigDecimal(CA).setScale(2, RoundingMode.HALF_UP));
                json.put("PANIER MOYEN", Math.round(panier_moy));
                json.put("M Ord", (amount_vo + amount_vop));
                json.put("M Non Ord", amount_vno);

                array.put(json);
            }
        } catch (Exception e) {
            e.printStackTrace();
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
            String dtEndExclusive = LocalDate.parse(dt_end).plusDays(1).toString();
            // La vue affiche desormais une seule ligne cumulee sur la periode :
            // le total vaut 1 s'il existe au moins une vente, 0 sinon.
            Object obj = this.getOdataManager().getEm().createNativeQuery(
                    "SELECT COUNT(*) FROM t_preenregistrement p WHERE p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed' "
                            + "AND p.`dt_CREATED` >= ?1 AND p.`dt_CREATED` < ?2")
                    .setParameter(1, dt_start)
                    .setParameter(2, dtEndExclusive)
                    .getSingleResult();

            count = (obj != null && Long.parseLong(obj.toString()) > 0) ? 1L : 0L;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public List<EntityData> analyseFrequentation(String dt_start, String dt_end, int start, int limit) {
        List<EntityData> data = new ArrayList<>();
        try {
            String dtEndExclusive = LocalDate.parse(dt_end).plusDays(1).toString();

            // Montant des ventes et nombre de ventes par tranche horaire, cumules sur
            // toute la periode (sans distinction d'operateur ni de jour) : une seule ligne.
            // Filtre sur dt_CREATED en plage (sargable) -> utilise l'index existant.
            String montantQuery = "SELECT "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 7 AND 8 THEN o.`int_PRICE` ELSE 0 END) AS UN_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 7 AND 8 THEN 1 END) AS UN_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 9 AND 10 THEN o.`int_PRICE` ELSE 0 END) AS DEUX_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 9 AND 10 THEN 1 END) AS DEUX_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 11 AND 13 THEN o.`int_PRICE` ELSE 0 END) AS TROIS_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 11 AND 13 THEN 1 END) AS TROIS_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 14 AND 15 THEN o.`int_PRICE` ELSE 0 END) AS QUATRE_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 14 AND 15 THEN 1 END) AS QUATRE_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) = 16 THEN o.`int_PRICE` ELSE 0 END) AS CINQ_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) = 16 THEN 1 END) AS CINQ_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) = 17 THEN o.`int_PRICE` ELSE 0 END) AS SIX_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) = 17 THEN 1 END) AS SIX_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) = 18 THEN o.`int_PRICE` ELSE 0 END) AS SEPT_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) = 18 THEN 1 END) AS SEPT_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) = 19 THEN o.`int_PRICE` ELSE 0 END) AS HUIT_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) = 19 THEN 1 END) AS HUIT_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 20 AND 23 THEN o.`int_PRICE` ELSE 0 END) AS NEUF_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 20 AND 23 THEN 1 END) AS NEUF_COUNT, "
                    + "SUM(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 0 AND 6 THEN o.`int_PRICE` ELSE 0 END) AS DIX_MONTANT, "
                    + "COUNT(CASE WHEN HOUR(o.`dt_CREATED`) BETWEEN 0 AND 6 THEN 1 END) AS DIX_COUNT "
                    + "FROM t_preenregistrement o "
                    + "WHERE o.`dt_CREATED` >= ?1 AND o.`dt_CREATED` < ?2 "
                    + "AND o.`int_PRICE`>0 AND o.`b_IS_CANCEL`=0 AND o.`str_STATUT`='is_Closed'";

            Object[] m = (Object[]) this.getOdataManager().getEm().createNativeQuery(montantQuery)
                    .setParameter(1, dt_start)
                    .setParameter(2, dtEndExclusive)
                    .getSingleResult();

            // Nombre de lignes (quantites vendues) par tranche horaire, meme periode.
            // Une seule jointure agregee remplace les anciennes sous-requetes correlees.
            String refQuery = "SELECT "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) BETWEEN 7 AND 8 THEN d.`int_QUANTITY` ELSE 0 END) AS UN_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) BETWEEN 9 AND 10 THEN d.`int_QUANTITY` ELSE 0 END) AS DEUX_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) BETWEEN 11 AND 13 THEN d.`int_QUANTITY` ELSE 0 END) AS TROIS_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) BETWEEN 14 AND 15 THEN d.`int_QUANTITY` ELSE 0 END) AS QUATRE_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) = 16 THEN d.`int_QUANTITY` ELSE 0 END) AS CINQ_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) = 17 THEN d.`int_QUANTITY` ELSE 0 END) AS SIX_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) = 18 THEN d.`int_QUANTITY` ELSE 0 END) AS SEPT_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) = 19 THEN d.`int_QUANTITY` ELSE 0 END) AS HUIT_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) BETWEEN 20 AND 23 THEN d.`int_QUANTITY` ELSE 0 END) AS NEUF_REF, "
                    + "SUM(CASE WHEN HOUR(p.`dt_CREATED`) BETWEEN 0 AND 6 THEN d.`int_QUANTITY` ELSE 0 END) AS DIX_REF "
                    + "FROM t_preenregistrement_detail d, t_preenregistrement p "
                    + "WHERE d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` "
                    + "AND p.`dt_CREATED` >= ?1 AND p.`dt_CREATED` < ?2 "
                    + "AND p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'";

            Object[] r = (Object[]) this.getOdataManager().getEm().createNativeQuery(refQuery)
                    .setParameter(1, dt_start)
                    .setParameter(2, dtEndExclusive)
                    .getSingleResult();

            // Tranches dans l'ordre UN..NEUF puis DIX (00:00-06:59).
            long[] montant = new long[10];
            long[] nbre = new long[10];
            long[] ref = new long[10];
            long totalCount = 0;
            for (int i = 0; i < 10; i++) {
                montant[i] = toLong(m[i * 2]);
                nbre[i] = toLong(m[i * 2 + 1]);
                ref[i] = toLong(r[i]);
                totalCount += nbre[i];
            }

            // Aucune vente sur la periode : pas de ligne (grille "Pas de donnees").
            if (totalCount == 0) {
                return data;
            }

            // Cellule = montant_nbreVentes_panierMoyen_nbreLignes
            String[] cell = new String[10];
            long totalAmont = 0, totalPMOY = 0, totalREF = 0;
            for (int i = 0; i < 10; i++) {
                long panmoy = (nbre[i] > 0) ? Math.round((double) montant[i] / nbre[i]) : 0;
                cell[i] = montant[i] + "_" + nbre[i] + "_" + panmoy + "_" + ref[i];
                totalAmont += montant[i];
                totalPMOY += panmoy;
                totalREF += ref[i];
            }

            EntityData entityData = new EntityData();
            entityData.setStr_value1(buildPeriodLabel(dt_start, dt_end));
            entityData.setStr_value2("CUMUL");
            entityData.setStr_value3("val_nbre_pan_lig");
            entityData.setStr_value4(cell[0]);   // 7:00 - 8:59
            entityData.setStr_value5(cell[1]);   // 9:00 - 10:59
            entityData.setStr_value6(cell[2]);   // 11:00 - 13:59
            entityData.setStr_value7(cell[3]);   // 14:00 - 15:59
            entityData.setStr_value8(cell[4]);   // 16:00 - 16:59
            entityData.setStr_value9(cell[5]);   // 17:00 - 17:59
            entityData.setStr_value10(cell[6]);  // 18:00 - 18:59
            entityData.setStr_value11(cell[7]);  // 19:00 - 19:59
            entityData.setStr_value12(cell[8]);  // 20:00 - 23:59
            entityData.setStr_value13(cell[9]);  // 00:00 - 6:59
            entityData.setStr_value14(totalAmont + "_" + totalCount + "_" + totalPMOY + "_" + totalREF);
            data.add(entityData);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return data;

    }

    // Convertit une valeur d'agregat SQL (BigDecimal/BigInteger/Long/null) en long.
    private static long toLong(Object o) {
        if (o == null) {
            return 0L;
        }
        if (o instanceof Number) {
            return ((Number) o).longValue();
        }
        try {
            return Long.parseLong(o.toString().trim());
        } catch (NumberFormatException e) {
            return Math.round(Double.parseDouble(o.toString().trim()));
        }
    }

    // Libelle de periode affiche dans la colonne "Jour" de la ligne cumulee.
    private String buildPeriodLabel(String dt_start, String dt_end) {
        try {
            java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            String debut = LocalDate.parse(dt_start).format(fmt);
            String fin = LocalDate.parse(dt_end).format(fmt);
            return debut.equals(fin) ? "Le " + debut : "Du " + debut + " au " + fin;
        } catch (Exception e) {
            return dt_start + " - " + dt_end;
        }
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
