/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package bll.interfacemanager;

import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import java.util.Date;

/**
 *
 * @author MKABOU
 */
public interface Bonlivraisonmanagerinterface {
    TBonLivraisonDetail getTBonLivraisonDetailLast(String lg_BON_LIVRAISON_ID, String lg_FAMILLE_ID);

    boolean updateInfoBonlivraison(String lg_ORDER_ID, String str_REF_LIVRAISON, Date dt_DATE_LIVRAISON, int int_MHT,
            int int_TVA);

    TBonLivraison getTBonlivraisonByOrder(String lg_ORDER_ID);
}
