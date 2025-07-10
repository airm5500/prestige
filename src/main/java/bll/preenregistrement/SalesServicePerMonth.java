/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.preenregistrement;

import dal.dataManager;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManager;
import javax.persistence.Query;

/**
 *
 * @author JZAGO
 */
public class SalesServicePerMonth implements SalesService {
    private final dataManager _dataManager;
    // private final

    public SalesServicePerMonth() {
        _dataManager = new dataManager();
        _dataManager.initEntityManager();

    }

    @Override
    public List<Object[]> getSalesPerMonth(String lg_FAMILLE_ID) {

        EntityManager em = _dataManager.getEm();
        String sql = "CALL GetMonthSales(" + lg_FAMILLE_ID + ")";
        Query query = em.createNativeQuery(sql);

        return query.getResultList();
    }

    private String getMonthName(int monthNumber) {
        String res = "";
        switch (monthNumber) {
        case 1:
            res = "Janvier";
            break;
        case 2:
            res = "Fevrier";
            break;
        case 3:
            res = "Mars";
            break;
        case 4:
            res = "Avril";
            break;
        case 5:
            res = "Mai";
            break;
        case 6:
            res = "Juin";
            break;
        case 7:
            res = "Juillet";
            break;
        case 8:
            res = "Aout";
            break;
        case 9:
            res = "Septembre";
            break;
        case 10:
            res = "Octobre";
            break;
        case 11:
            res = "Novembre";
            break;
        case 12:
            res = "Décembre";
            break;
        }

        return res;
    }

    /**
     *
     * @param lg_FAMILLE_ID
     *
     * @return
     */
    @Override
    public List<Map<String, Object>> getSalesMapPerMonth(String lg_FAMILLE_ID) {
        EntityManager em = _dataManager.getEm();
        String sql = "CALL GetMonthSales(" + lg_FAMILLE_ID + ")";
        Query query = em.createNativeQuery(sql);
        List<Object[]> queryResult = query.getResultList();
        List resultList = new ArrayList();

        for (Object[] o : queryResult) {
            Map<String, Object> map = new HashMap<>();
            map.put("qty", o[0]);
            map.put("month", getMonthName(Integer.parseInt(o[1].toString())));
            map.put("year", o[2]);
            resultList.add(map);
        }
        return resultList;
    }

}
