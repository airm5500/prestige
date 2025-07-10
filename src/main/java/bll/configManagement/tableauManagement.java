/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TTableau;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class tableauManagement extends bllBase {

    Object Otable = TTableau.class;

    public tableauManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String STR_CODE, String STR_NAME) {

        try {

            TTableau OTTableau = new TTableau();
            OTTableau.setLgTABLEAUID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de la
                                                                    // date courante
            OTTableau.setStrNAME(STR_NAME);
            OTTableau.setStrCODE(STR_CODE);
            OTTableau.setStrSTATUT(commonparameter.statut_enable);
            OTTableau.setDtCREATED(new Date());

            this.persiste(OTTableau);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_TABLEAU_ID, String STR_CODE, String STR_NAME) {

        try {

            TTableau OTTableau = null;
            OTTableau = getOdataManager().getEm().find(TTableau.class, lg_TABLEAU_ID);

            OTTableau.setLgTABLEAUID(lg_TABLEAU_ID);
            OTTableau.setStrNAME(STR_NAME);
            OTTableau.setStrCODE(STR_CODE);
            OTTableau.setStrSTATUT(commonparameter.statut_enable);
            OTTableau.setDtUPDATED(new Date());

            this.persiste(OTTableau);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

}
