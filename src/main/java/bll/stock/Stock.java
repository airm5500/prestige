/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stock;

import dal.TBonLivraisonDetail;
import dal.TOrderDetail;
import java.util.List;

/**
 *
 * @author Kobena
 */
public interface Stock {
    void setStatusInOrder(String lgFamilleID) throws Exception;

    void deleteOrder(String lg_ORDER_ID) throws Exception;

    void deleteDetailsBonlivraison(String str_BONLIVRAISON_ID) throws Exception;

    List<TOrderDetail> getOrderItemByOrderId(String lg_ORDER_ID) throws Exception;

    List<TBonLivraisonDetail> getBonItemByBonId(String lg_BONLIVRAISON_ID) throws Exception;

}
