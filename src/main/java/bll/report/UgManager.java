/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.report;

import dal.dataManager;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author KKOFFI
 */
public class UgManager extends bll.bllBase {

    public UgManager(dataManager OdataManager) {
        super.setOdataManager(OdataManager);

    }

    public JSONObject getUgByArticle(String search, String lgGrossiste, String dt_start, String dt_end, int start,
            int limit, int page) {
        JSONArray array = new JSONArray();
        JSONObject json_ = new JSONObject();

        try {

            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery("CALL proc_ug (?,?,?,?)")
                    .setParameter(1, dt_start).setParameter(2, dt_end).setParameter(3, "%" + search + "%")
                    .setParameter(4, "%" + lgGrossiste + "%").getResultList();
            /*
             * int listSize=list.size(); int _limit=limit; if(listSize>0){ if(limit>(listSize-1)){ _limit=listSize-1;
             * }else{ _limit=((_limit*page)<(listSize-1)?_limit*page:(listSize-1)) ; } }else{ _limit=0;
             *
             * } System.out.println(" start "+start+" limit "+_limit+ " "+listSize +" "+ (listSize-1)+" LI "+limit);
             * List<Object[]> finalList=list.subList(start,_limit);
             */

            /*
             * long sumQty = list.stream().mapToLong((Object[] value) -> { return Long.valueOf(value[6]+"") ; //To
             * change body of generated lambdas, choose Tools | Templates. }).sum();
             */
            long sumMontant = list.stream().mapToLong((Object[] value) -> {
                // return Long.valueOf(value[5]+"") ; //To change body of generated lambdas, choose Tools | Templates.
                return Long.valueOf(value[10] + "");
            }).sum();
            long sumQtyIN = list.stream().mapToLong((Object[] value) -> {
                return Long.valueOf(value[8] + ""); // To change body of generated lambdas, choose Tools | Templates.
            }).sum();
            long sumMontantIN = list.stream().mapToLong((Object[] value) -> {
                return Long.valueOf(value[9] + ""); // To change body of generated lambdas, choose Tools | Templates.
            }).sum();

            JSONObject toReturn = new JSONObject();
            final Long montant2 = 0l;

            list.forEach((ob) -> {
                try {

                    JSONObject json = new JSONObject();
                    json.put("id", ob[0] + "");
                    json.put("CIP", ob[1] + "");
                    json.put("NAME", ob[2] + "");
                    json.put("BLREF", ob[3] + "");
                    json.put("PRIXVENTE", ob[4] + "");
                    // json.put("VALEURVENTE", ob[5]+"");
                    json.put("VALEURVENTE", ob[10] + "");
                    json.put("QTY", ob[6] + "");
                    json.put("GROSSISTE", ob[7] + "");
                    json.put("QTYINI", ob[8] + "");
                    json.put("VALEURQTYINI", ob[9] + "");
                    json.put("PRIXACHAT", ob[11] + "");
                    json.put("TOTALAMONT", sumMontant);
                    // json.put("TOTALQTY", sumQty );
                    json.put("TOTALAMONTINI", sumMontantIN);
                    json.put("TOTALQTYINI", sumQtyIN);
                    // json.put("Count",list.size() );

                    array.put(json);

                } catch (JSONException ex) {
                    ex.printStackTrace();
                }
            });
            json_.put("data", array);
            json_.put("count", list.size());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json_;
    }

    public long getQtyVendu(String date, String id) {
        long qty = 0;
        try {
            String query = "SELECT  SUM(d.`int_QUANTITY`)  FROM t_preenregistrement_detail d,t_preenregistrement p WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID`  "
                    + "AND p.`lg_TYPE_VENTE_ID` <>'5' AND p.`lg_TYPE_VENTE_ID` <>'4' AND d.`lg_FAMILLE_ID`='" + id
                    + "' " + "AND d.`dt_UPDATED`> '" + date + "' ";

            Object _qty = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();
            if (_qty != null)
                qty = Long.valueOf(_qty + "");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return qty;
    }

}
