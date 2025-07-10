/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.business.caissier.concrete;

import com.asc.business.caissier.CaissierService;
import dal.TUser;
import dal.dataManager;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.Query;

/**
 *
 * @author JZAGO
 */
public class PrestigeCaissierService implements CaissierService {
    private final dataManager _prestigeDataManager;

    public PrestigeCaissierService() {
        this._prestigeDataManager = new dataManager();
        _prestigeDataManager.initEntityManager();
    }

    @Override
    public List<TUser> getAllCaissiers() {
        EntityManager em = _prestigeDataManager.getEm();
        String sql = "SELECT DISTINCT u.`lg_USER_ID`, u. `str_FIRST_NAME`, u.`str_LAST_NAME` FROM t_preenregistrement p, t_user u WHERE p.lg_USER_CAISSIER_ID LIKE u.lg_USER_ID";
        Query query = em.createNativeQuery(sql, TUser.class);

        return (List<TUser>) query.getResultList();
    }

}
