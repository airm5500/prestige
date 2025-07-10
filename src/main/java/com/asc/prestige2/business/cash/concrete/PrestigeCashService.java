/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.cash.concrete;

import bll.bllBase;
import com.asc.prestige2.business.cash.CashService;
import dal.TUser;
import dal.dataManager;

/**
 *
 * @author JZAGO
 */
public class PrestigeCashService extends bllBase implements CashService {

    public PrestigeCashService(dataManager odataManager, TUser oTUser) {
        this.setOdataManager(odataManager);
        this.setOTUser(oTUser);
        this.checkDatamanager();
    }

    @Override
    public int getMontantAnnule(String lg_USER_ID, String dt_date_debut, String dt_date_fin) {

        return 0;
    }

}
