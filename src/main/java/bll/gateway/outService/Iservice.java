/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway.outService;

import dal.TAlertEventUserFone;
import dal.TOutboudMessage;
import dal.dataManager;

/**
 *
 * @author user
 */
public interface Iservice {

    public void init(dataManager OdataManager);

    public String doservice(TAlertEventUserFone OTAlertEventUserFone);

    public int doservice(String strResult, String str_phone, String str_REF);

    public String BuidlDataToNotify(String strResult, String str_phone, String str_REF);

    public String BuidlDataToNotify(String strResult, String str_phone);

    public TOutboudMessage saveNotification(String strResult, String str_phone, String str_REF);

}
