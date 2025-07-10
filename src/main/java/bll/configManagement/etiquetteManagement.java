/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TEtiquette;
import bll.bllBase;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class etiquetteManagement extends bllBase {

    Object Otable = TEtiquette.class;

    public etiquetteManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String STR_CODE, String STR_NAME) {

        try {

            TEtiquette OTEtiquette = new TEtiquette();
            OTEtiquette.setLgETIQUETTEID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de la
                                                                        // date courante
            OTEtiquette.setStrNAME(STR_NAME);
            OTEtiquette.setStrCODE(STR_CODE);
            OTEtiquette.setStrSTATUT(commonparameter.statut_enable);
            OTEtiquette.setDtCREATED(new Date());

            this.persiste(OTEtiquette);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_ETIQUETTE_ID, String STR_CODE, String STR_NAME) {

        try {

            TEtiquette OTEtiquette = null;
            OTEtiquette = getOdataManager().getEm().find(TEtiquette.class, lg_ETIQUETTE_ID);

            OTEtiquette.setLgETIQUETTEID(lg_ETIQUETTE_ID);
            OTEtiquette.setStrNAME(STR_NAME);
            OTEtiquette.setStrCODE(STR_CODE);
            OTEtiquette.setStrSTATUT(commonparameter.statut_enable);
            OTEtiquette.setDtUPDATED(new Date());

            this.persiste(OTEtiquette);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

}
