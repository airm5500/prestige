/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package bll.modelfacture;

import bll.bllBase;

import dal.TModelFacture;
import dal.dataManager;
import java.util.List;
import toolkits.parameters.commonparameter;

/**
 *
 * @author KKOFFI
 */
public class ModelFacture extends bllBase {

    public ModelFacture(dataManager manager) {
        super.setOdataManager(manager);
        super.checkDatamanager();
    }

    public List<TModelFacture> getAllModelFacture() {
        return this.getOdataManager().getEm()
                .createQuery("SELECT o FROM TModelFacture o WHERE o.strSTATUT =?1", TModelFacture.class)
                .setParameter(1, commonparameter.statut_enable).getResultList();
    }
}
