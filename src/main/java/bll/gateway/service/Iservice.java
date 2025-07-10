/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package bll.gateway.service;

import dal.TInboudMessage;
import dal.dataManager;

/**
 *
 * @author user
 */
public interface Iservice {

    public void init(dataManager OdataManager);

    public String doservice(TInboudMessage OTInboudMessage);

    public String BuidlDataToNotify(String strResult, TInboudMessage OTInboudMessage);

}
