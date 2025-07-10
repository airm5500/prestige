/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TTauxMarque;
import bll.bllBase;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class tauxMarqueManagement extends bllBase {

    Object Otable = TTauxMarque.class;

    public tauxMarqueManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String STR_CODE, String STR_NAME) {

        try {

            TTauxMarque OTTauxMarque = new TTauxMarque();
            OTTauxMarque.setLgTAUXMARQUEID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de
                                                                          // la date courante
            OTTauxMarque.setStrNAME(STR_NAME);
            OTTauxMarque.setStrCODE(STR_CODE);
            OTTauxMarque.setStrSTATUT(commonparameter.statut_enable);
            OTTauxMarque.setDtCREATED(new Date());

            this.persiste(OTTauxMarque);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_TAUX_MARQUE_ID, String STR_CODE, String STR_NAME) {

        try {

            TTauxMarque OTTauxMarque = null;
            OTTauxMarque = getOdataManager().getEm().find(TTauxMarque.class, lg_TAUX_MARQUE_ID);

            OTTauxMarque.setLgTAUXMARQUEID(lg_TAUX_MARQUE_ID);
            OTTauxMarque.setStrNAME(STR_NAME);
            OTTauxMarque.setStrCODE(STR_CODE);
            OTTauxMarque.setStrSTATUT(commonparameter.statut_enable);
            OTTauxMarque.setDtUPDATED(new Date());

            this.persiste(OTTauxMarque);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

}
