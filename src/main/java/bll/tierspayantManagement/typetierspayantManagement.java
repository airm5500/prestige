/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.tierspayantManagement;

import bll.bllBase;
import dal.TTypeTiersPayant;
import dal.dataManager;
import java.util.Date;
import java.util.*;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class typetierspayantManagement extends bllBase {

    Object Otable = TTypeTiersPayant.class;

    public typetierspayantManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE_TYPE_TIERS_PAYANT, String str_LIBELLE_TYPE_TIERS_PAYANT) {
        try {

            TTypeTiersPayant OTTypeTiersPayant = new TTypeTiersPayant();

            OTTypeTiersPayant.setLgTYPETIERSPAYANTID(this.getKey().getComplexId());
            OTTypeTiersPayant.setStrCODETYPETIERSPAYANT(str_CODE_TYPE_TIERS_PAYANT);
            OTTypeTiersPayant.setStrLIBELLETYPETIERSPAYANT(str_LIBELLE_TYPE_TIERS_PAYANT);

            OTTypeTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTTypeTiersPayant.setDtCREATED(new Date());

            this.persiste(OTTypeTiersPayant);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_TYPE_TIERS_PAYANT_ID, String str_CODE_TYPE_TIERS_PAYANT,
            String str_LIBELLE_TYPE_TIERS_PAYANT) {

        try {

            TTypeTiersPayant OTTypeTiersPayant = null;

            OTTypeTiersPayant = getOdataManager().getEm().find(TTypeTiersPayant.class, lg_TYPE_TIERS_PAYANT_ID);

            OTTypeTiersPayant.setStrCODETYPETIERSPAYANT(str_CODE_TYPE_TIERS_PAYANT);
            OTTypeTiersPayant.setStrLIBELLETYPETIERSPAYANT(str_LIBELLE_TYPE_TIERS_PAYANT);

            OTTypeTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTTypeTiersPayant.setDtUPDATED(new Date());

            this.persiste(OTTypeTiersPayant);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de mettre à jour  " + Otable, e.getMessage());
        }

    }

    public void delete(String lg_TYPE_TIERS_PAYANT_ID) {

        try {

            TTypeTiersPayant OTTypeTiersPayant = null;

            OTTypeTiersPayant = getOdataManager().getEm().find(TTypeTiersPayant.class, lg_TYPE_TIERS_PAYANT_ID);

            OTTypeTiersPayant.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTTypeTiersPayant);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public List<TTypeTiersPayant> getAllTypeTiersPayant() {

        List<dal.TTypeTiersPayant> lstTTypeTiersPayant = null;

        try {

            lstTTypeTiersPayant = getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTypeTiersPayant t WHERE  t.strSTATUT LIKE ?1 ")
                    .setParameter(1, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info(lstTTypeTiersPayant.size());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.buildSuccesTraceMessage("Type Tiers-Payant(s) Existant(s)   :: " + lstTTypeTiersPayant);
            return lstTTypeTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Type Tiers-Payant(s) Inexistant ", e.getMessage());
            return lstTTypeTiersPayant;
        }

    }

}
