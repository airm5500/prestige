/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.teller;

import dal.TUser;
import dal.dataManager;

/**
 *
 * @author TBEKOLA
 */
public class TransactionManager extends bll.bllBase {

    public TransactionManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

}
