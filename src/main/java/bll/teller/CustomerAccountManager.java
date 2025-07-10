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
 * @author DELL
 */
public class CustomerAccountManager extends bll.bllBase {

    public CustomerAccountManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    public void setOrderToCustomerAccount(String Str_Order_ID, String lg_CUSTOMER_ACCOUNT_ID) {
        // TOrder OTOrder = this.getOdataManager().getEm().find(TOrder.class, Str_Order_ID);
        // TCustomerAccount OTCustomer = this.getOdataManager().getEm().find(TCustomerAccount.class,
        // lg_CUSTOMER_ACCOUNT_ID);
        // this.setOrderToCustomerAccount(OTOrder, OTCustomer);

    }

}
