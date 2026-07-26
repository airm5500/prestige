/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.report;

import bll.common.Parameter;
import dal.TUser;
import dal.dataManager;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import javax.persistence.TemporalType;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.Util;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author KKOFFI
 */
public class Dashboard extends bll.bllBase {
    public Dashboard() {
        super.checkDatamanager();
    }

    public Dashboard(dataManager O) {
        super.setOdataManager(O);
        super.checkDatamanager();
    }

    public Dashboard(dataManager O, TUser OTUser) {
        super.setOdataManager(O);
        super.setOTUser(OTUser);
        super.checkDatamanager();
    }

    private Date startOfToday() {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTime();
    }

    private Date startOfTomorrow() {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(startOfToday());
        calendar.add(Calendar.DAY_OF_MONTH, 1);
        return calendar.getTime();
    }

    private Date startOfMonth() {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.DAY_OF_MONTH, 1);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTime();
    }

    private Date startOfYear() {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.MONTH, Calendar.JANUARY);
        calendar.set(Calendar.DAY_OF_MONTH, 1);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTime();
    }

    private Date startOfNextYear() {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(startOfYear());
        calendar.add(Calendar.YEAR, 1);
        return calendar.getTime();
    }

    public JSONObject getDailyCA_AND_SalesCount() {
        JSONObject json = new JSONObject();

        try {
            List<Object[]> list = this.getOdataManager().getEm().createQuery(
                    "SELECT SUM(o.intPRICE),SUM(o.intPRICEREMISE),COUNT(o.lgPREENREGISTREMENTID) FROM TPreenregistrement o WHERE o.intPRICE >0 AND o.strSTATUT=?1 AND o.dtUPDATED >=?2 AND o.dtUPDATED <?3 AND o.bISCANCEL =FALSE AND o.lgTYPEVENTEID.lgTYPEVENTEID <> '5' ")
                    .setParameter(1, commonparameter.statut_is_Closed)
                    .setParameter(2, startOfToday(), TemporalType.TIMESTAMP)
                    .setParameter(3, startOfTomorrow(), TemporalType.TIMESTAMP).getResultList();

            for (Object[] objects : list) {
                long ca = 0;
                long count = Long.valueOf(objects[2] + "");
                if (count > 0) {
                    ca = Long.valueOf(objects[0] + "") - Long.valueOf(objects[1] + "");

                }
                json.put("DailyCA", Util.getFormattedLongValue(ca));
                json.put("DailyCount", Util.getFormattedLongValue(count));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;

    }

    public JSONObject getAchatAmount() {
        JSONObject json = new JSONObject();

        try {
            List<Object[]> list = this.getOdataManager().getEm().createQuery(
                    "SELECT SUM(o.intHTTC),COUNT(o.lgBONLIVRAISONID) FROM TBonLivraison o WHERE o.strSTATUT=?1 AND o.dtUPDATED >=?2 AND o.dtUPDATED <?3  ")
                    .setParameter(1, commonparameter.statut_is_Closed)
                    .setParameter(2, startOfToday(), TemporalType.TIMESTAMP)
                    .setParameter(3, startOfTomorrow(), TemporalType.TIMESTAMP).getResultList();

            for (Object[] objects : list) {
                long ca = 0;
                long count = Long.valueOf(objects[1] + "");
                if (count > 0) {
                    ca = Long.valueOf(objects[0] + "");

                }
                json.put("DailyAchatAmount", ca);
                json.put("DailyAchatCount", count);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public JSONObject getPanierMoyen() {
        JSONObject json = new JSONObject();
        String query = "SELECT COUNT(IF((o.`str_TYPE_VENTE` = 'VNO' AND o.`lg_NATURE_VENTE_ID`<>'3'), 1, NULL)) , "
                + "COUNT(IF((o.`str_TYPE_VENTE` = 'VO' AND o.`lg_NATURE_VENTE_ID`<>'3'), 1, NULL)), "
                + "SUM(CASE WHEN (o.`str_TYPE_VENTE`='VNO' AND o.`lg_NATURE_VENTE_ID`<>'3' ) THEN (o.`int_PRICE`-o.`int_PRICE_REMISE`) ELSE 0 END), "
                + "SUM(CASE WHEN( o.`str_TYPE_VENTE`='VO' AND o.`lg_NATURE_VENTE_ID`<>'3' )THEN (o.`int_PRICE`-(o.int_CUST_PART- o.`int_PRICE_REMISE`)) ELSE 0 END), "
                + "SUM(CASE WHEN o.`lg_NATURE_VENTE_ID`='3' THEN (o.`int_PRICE`-o.`int_PRICE_REMISE`) ELSE 0 END), SUM(CASE WHEN o.`str_TYPE_VENTE` = 'VO' THEN (o.`int_CUST_PART` - o.`int_PRICE_REMISE`)ELSE 0 END)  FROM t_preenregistrement o "
                + "WHERE  o.`int_PRICE` >0 AND o.`str_STATUT` ='is_Closed' AND o.`dt_UPDATED` >= ?1 AND o.`dt_UPDATED` < ?2 AND o.`b_IS_CANCEL`=0;";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfToday(), TemporalType.TIMESTAMP)
                    .setParameter(2, startOfTomorrow(), TemporalType.TIMESTAMP).getResultList();
            double panierMoy = 0;
            double totalcount;
            double panierMYVO = 0, panierMYVNO = 0, AmontVO = 0, AmontVNO = 0;
            double montantdepot = 0;
            for (Object[] objects : list) {
                double count = Double.valueOf(objects[0] + "") + Double.valueOf(objects[1] + "");

                if (count > 0) {
                    double countVO = Double.valueOf(objects[1] + "");
                    double countVNO = Double.valueOf(objects[0] + "");
                    AmontVO = Double.valueOf(objects[3] + "");
                    AmontVNO = Double.valueOf(objects[2] + "") + Double.valueOf(objects[5] + "");
                    montantdepot = Double.valueOf(objects[4] + "");
                    totalcount = count;

                    panierMoy = (AmontVO + AmontVNO) / totalcount;

                    if (countVNO > 0) {
                        panierMYVNO = AmontVNO / countVNO;
                    }
                    if (countVO > 0) {
                        panierMYVO = AmontVO / countVO;
                    }

                }

                json.put("panierMYVNO", Math.round(panierMYVNO));
                json.put("PanierMYVO", Math.round(panierMYVO));
                json.put("PanierMY", Math.round(panierMoy));
                json.put("MONTANTVO", AmontVO);
                json.put("MONTANTVNO", AmontVNO);
                json.put("MONTANTDEPO", montantdepot);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public JSONObject getCANetAndMargeNet() {
        JSONObject json = new JSONObject();
        String query = "SELECT (ROUND(SUM((d.`int_PRICE`-(CASE WHEN d.`int_PRICE_REMISE`!= NULL THEN  d.`int_PRICE_REMISE` ELSE 0 END))/(1+(v.`int_VALUE`/100))))-SUM(f.`int_PAF`*d.`int_QUANTITY`))"
                + ",SUM(d.`int_PRICE`-(CASE WHEN d.`int_PRICE_REMISE`!= NULL THEN d.`int_PRICE_REMISE` ELSE 0 END)),SUM(f.`int_PAF`*d.`int_QUANTITY`),COUNT(p.`lg_PREENREGISTREMENT_ID`),SUM((d.`int_PRICE`-(CASE WHEN d.`int_PRICE_REMISE`!= NULL THEN\n"
                + "d.`int_PRICE_REMISE` ELSE 0 END))/(1+(v.`int_VALUE`/100))) FROM  t_preenregistrement_detail d,"
                + "t_preenregistrement p,t_famille f,t_famillearticle fa,t_code_tva v WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID` AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` "
                + "AND fa.`lg_FAMILLEARTICLE_ID`=f.`lg_FAMILLEARTICLE_ID` AND v.`lg_CODE_TVA_ID`=f.`lg_CODE_TVA_ID` AND p.`int_PRICE`>0 AND p.`str_STATUT`='"
                + commonparameter.statut_is_Closed + "'"
                + " AND p.`dt_UPDATED` >= ?1 AND p.`dt_UPDATED` < ?2  AND p.`b_IS_CANCEL`=0 AND  p.`lg_TYPE_VENTE_ID` <> '5' ";

        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfToday(), TemporalType.TIMESTAMP)
                    .setParameter(2, startOfTomorrow(), TemporalType.TIMESTAMP).getResultList();
            long margenet = 0;
            for (Object[] objects : list) {
                long count = Long.valueOf(objects[3] + "");

                if (count > 0) {

                    margenet = Long.valueOf(objects[0] + "");

                }
                json.put("MARGENET", margenet);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public JSONArray getCaGrapheData() {
        JSONArray array = new JSONArray();
        String query = "SELECT SUM(o.`int_PRICE`-o.`int_PRICE_REMISE`),COUNT(o.`lg_PREENREGISTREMENT_ID`),DATE_FORMAT(o.`dt_UPDATED`,'%m/%Y') FROM t_preenregistrement o"
                + " WHERE  o.lg_TYPE_VENTE_ID <> '5' AND     o.`int_PRICE` >0 AND o.`str_STATUT` ='"
                + commonparameter.statut_is_Closed
                + "' AND o.`dt_UPDATED` >= ?1 AND o.`dt_UPDATED` < ?2 GROUP BY DATE_FORMAT(o.`dt_UPDATED`,'%m/%Y') ORDER BY DATE_FORMAT(o.`dt_UPDATED`,'%m/%Y')";
        try {
            new logger().OCategory.info("query:" + query);
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfYear(), TemporalType.TIMESTAMP)
                    .setParameter(2, startOfNextYear(), TemporalType.TIMESTAMP).getResultList();
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                long count = Long.valueOf(objects[1] + "");

                if (count > 0) {
                    json.put("MONTHCA", Long.valueOf(objects[0] + ""));
                    json.put("MONTH", objects[2]);
                    json.put("COUNT", Long.valueOf(objects[1] + ""));
                    array.put(json);

                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getTOP5ArticleVendueQTY() {
        // AND p.lg_TYPE_VENTE_ID <> '5'
        JSONArray array = new JSONArray();
        String query = "SELECT  f.`str_NAME`,SUM(d.`int_QUANTITY`) ,f.`int_CIP` FROM  t_preenregistrement_detail d,  t_preenregistrement p, "
                + " t_famille f  WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`  AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND p.`int_PRICE`>0 AND p.`str_STATUT`='is_Closed' AND p.`b_IS_CANCEL`=0"
                + " AND p.`dt_CREATED` >= ?1 AND p.`dt_CREATED` < ?2 AND p.lg_TYPE_VENTE_ID <> '5' "
                + " GROUP BY f.`str_NAME` ORDER BY SUM(d.`int_QUANTITY`) DESC ";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfToday(), TemporalType.TIMESTAMP)
                    .setParameter(2, startOfTomorrow(), TemporalType.TIMESTAMP).getResultList();
            long k = 1;
            for (Object[] objects : list) {

                JSONObject json = new JSONObject();
                long count = Long.valueOf(objects[1] + "");

                if (count > 0) {
                    json.put("ID", k);
                    json.put("str_NAME", String.valueOf(objects[0]).trim());
                    json.put("int_QUANTITY_SERVED", Long.valueOf(objects[1] + ""));
                    json.put("CIP", Double.valueOf(objects[2] + ""));
                    array.put(json);
                    k++;

                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getValeurAchatByGrossiste() {

        JSONArray array = new JSONArray();
        String query = "SELECT COUNT(b.`lg_BON_LIVRAISON_ID`),"
                + "SUM(CASE WHEN g.`str_LIBELLE` LIKE 'UBI%' OR g.`str_LIBELLE` LIKE 'LABOR%' THEN b.`int_MHT` ELSE 0 END),"
                + "SUM(CASE WHEN g.`str_LIBELLE` LIKE 'DPCI%' THEN b.`int_MHT` ELSE 0 END),"
                + "SUM(CASE WHEN g.`str_LIBELLE` LIKE 'COPHARMED%' THEN b.`int_MHT` ELSE 0 END),"
                + "SUM(CASE WHEN g.`str_LIBELLE` LIKE 'TEDIS PHARMA%' THEN b.`int_MHT` ELSE 0 END),"
                + "SUM(CASE WHEN g.`str_LIBELLE` NOT LIKE 'TEDIS PHARMA%' AND g.`str_LIBELLE` NOT LIKE 'COPHARMED%' "
                + "AND g.`str_LIBELLE` NOT LIKE 'DPCI%' AND g.`str_LIBELLE` NOT LIKE 'UBI%' "
                + "AND g.`str_LIBELLE` NOT LIKE 'LABOR%' THEN b.`int_MHT` ELSE 0 END) "
                + "FROM t_bon_livraison b,t_order o,t_grossiste g WHERE o.`lg_ORDER_ID`=b.`lg_ORDER_ID` "
                + "AND o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` AND b.`str_STATUT`='is_Closed' "
                + "AND b.`dt_UPDATED` >= ?1 AND b.`dt_UPDATED` <= ?2";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfMonth(), TemporalType.TIMESTAMP)
                    .setParameter(2, new Date(), TemporalType.TIMESTAMP).getResultList();
            for (Object[] objects : list) {
                // JSONObject json = new JSONObject();
                long count = Long.valueOf(objects[0] + "");
                if (count > 0) {
                    JSONObject json = new JSONObject();
                    json.put("LABOREX", objects[1] != null ? Long.valueOf(objects[1] + "") : 0);
                    array.put(json);
                    json = new JSONObject();
                    json.put("DPCI", objects[2] != null ? Long.valueOf(objects[2] + "") : 0);
                    array.put(json);
                    json = new JSONObject();
                    json.put("COPHARMED", objects[3] != null ? Long.valueOf(objects[3] + "") : 0);
                    array.put(json);
                    json = new JSONObject();
                    json.put("TEDISPHARMA", objects[4] != null ? Long.valueOf(objects[4] + "") : 0);
                    array.put(json);
                    json = new JSONObject();
                    json.put("AUTRES", objects[5] != null ? Long.valueOf(objects[5] + "") : 0);
                    array.put(json);

                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getTOP5ArticleVendueCA() {

        JSONArray array = new JSONArray();
        String query = "SELECT  f.`str_NAME`,COUNT(d.`int_QUANTITY`),SUM(d.`int_PRICE`),f.`int_CIP` FROM  t_preenregistrement_detail d,  t_preenregistrement p,"
                + "  t_famille f  WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`  AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND p.`int_PRICE`>0 AND p.`str_STATUT`='is_Closed'"
                + " AND  p.`dt_CREATED` >= ?1 AND p.`dt_CREATED` < ?2  AND p.`b_IS_CANCEL`=0   AND p.lg_TYPE_VENTE_ID <> '5' "
                + " GROUP BY f.`str_NAME` ORDER BY SUM(d.`int_PRICE`) DESC  ";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfToday(), TemporalType.TIMESTAMP)
                    .setParameter(2, startOfTomorrow(), TemporalType.TIMESTAMP).getResultList();
            long k = 1;
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                long count = Long.valueOf(objects[1] + "");

                if (count > 0) {
                    json.put("ID", k);
                    json.put("str_NAME", String.valueOf(objects[0]).trim());
                    json.put("int_PRICE", Long.valueOf(objects[2] + ""));
                    json.put("CIP", objects[3] + "");

                    array.put(json);
                    k++;

                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getBestClients() {
        JSONArray array = new JSONArray();
        String query = "SELECT  `t_tiers_payant`.`str_FULLNAME`,COUNT(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`) ,SUM(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE`) "
                + "  FROM ((((`t_tiers_payant` JOIN `t_compte_client_tiers_payant` ON((`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`))) "
                + " JOIN `t_preenregistrement_compte_client_tiers_payent` ON((`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`))) "
                + " JOIN `t_preenregistrement` ON((`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`))) JOIN "
                + " `t_type_tiers_payant` ON((`t_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID` = `t_type_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID`))) WHERE ((`t_preenregistrement`.`str_STATUT` = 'is_Closed') "
                + " AND (`t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` = 'unpaid') AND (`t_preenregistrement`.`b_IS_CANCEL` = 0) AND (`t_preenregistrement`.`int_PRICE` > 0)    AND (`t_preenregistrement`.`dt_CREATED` >=?1) AND (`t_preenregistrement`.`dt_CREATED` <=?2))"
                + " AND `t_type_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID`  GROUP BY `t_tiers_payant`.`str_FULLNAME` ORDER BY SUM(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE`) DESC ";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfMonth(), TemporalType.TIMESTAMP)
                    .setParameter(2, new Date(), TemporalType.TIMESTAMP).getResultList();
            int k = 1;
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                long count = Long.valueOf(objects[1] + "");

                if (count > 0) {
                    json.put("ID", k);
                    json.put("str_FULLNAME", String.valueOf(objects[0]).trim());
                    json.put("AMOUNT", Long.valueOf(objects[2] + ""));
                    array.put(json);
                    k++;

                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getListMVT() {
        JSONArray array = new JSONArray();
        String query = "SELECT t.`str_NAME`,SUM(m.`int_AMOUNT`),t.`categorie`  FROM t_mvt_caisse m,t_type_mvt_caisse t  WHERE "
                + " t.`lg_TYPE_MVT_CAISSE_ID`=m.`lg_TYPE_MVT_CAISSE_ID` AND t.`lg_TYPE_MVT_CAISSE_ID` <> '"
                + Parameter.TYPE_MV_CAISSE_VNO + "' AND " + " t.`lg_TYPE_MVT_CAISSE_ID` <> '"
                + Parameter.TYPE_MV_CAISSE_VO
                + "' AND m.`dt_CREATED` >= ?1 AND m.`dt_CREATED` < ?2 GROUP BY t.`str_NAME`,t.`categorie`";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfToday(), TemporalType.TIMESTAMP)
                    .setParameter(2, startOfTomorrow(), TemporalType.TIMESTAMP).getResultList();
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();

                json.put("str_NAME", String.valueOf(objects[0]).trim());
                json.put("AMOUNT", Double.valueOf(objects[1] + ""));
                // categorie (ordinal de CategorieMvtCaisse) : 0=VENTE, 1=ENTREE_CAISSE, 2=SORTIE_CAISSE, 3=ACHAT.
                int categorie = -1;
                try {
                    if (objects.length > 2 && objects[2] != null) {
                        categorie = Integer.parseInt(String.valueOf(objects[2]).trim());
                    }
                } catch (NumberFormatException ignore) {
                }
                json.put("CATEGORIE", categorie);

                array.put(json);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getAllAchatByGrossiste() {
        JSONArray array = new JSONArray();
        try {
            String query = "SELECT  SUM(b.`int_MHT`) AS MONTANT,g.`str_LIBELLE` AS LIBELLE FROM  t_bon_livraison b, "
                    + "t_order o,t_grossiste g  WHERE o.`lg_ORDER_ID`=b.`lg_ORDER_ID` AND  o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID`   "
                    + " AND b.`dt_UPDATED` >=?1 AND b.`dt_UPDATED` <=?2 AND  b.`str_STATUT`='is_Closed' GROUP BY g.`lg_GROSSISTE_ID`  "
                    + " ORDER BY SUM(b.`int_MHT`) DESC";
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query)
                    .setParameter(1, startOfMonth(), TemporalType.TIMESTAMP)
                    .setParameter(2, new Date(), TemporalType.TIMESTAMP).getResultList();

            long k = 1;
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                json.put("ID", k);
                json.put("MONTANT", Long.valueOf(objects[0] + ""));
                json.put("LIBELLE", objects[1] + "");

                array.put(json);
                k++;

            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return array;
    }

    public long getUGAmount(String x0, String x1) {
        long amount = 0;
        try {// SUM(o.intPRICEUNITAIR*o.intUG)
            amount = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT SUM(o.intPRICEUNITAIR*o.intUG) FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.intPRICE >0 AND  o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND  o.intUG>0 AND o.dtUPDATED >=?1 AND o.dtUPDATED <=?2 ")
                    .setParameter(1, date.formatterMysqlShort.parse(x0)).setParameter(2, date.formatterMysql.parse(x1))
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return amount;
    }
}
