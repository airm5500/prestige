/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TCodeActe;

import bll.bllBase;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class codeActeManagement extends bllBase {

    Object Otable = TCodeActe.class;

    public codeActeManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String lg_CODE_ACTE_ID, String str_LIBELLE) {

        try {

            TCodeActe OTCodeActe = new TCodeActe();

            OTCodeActe.setLgCODEACTEID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de la
                                                                      // date courante
            OTCodeActe.setStrLIBELLEE(str_LIBELLE);

            OTCodeActe.setStrSTATUT(commonparameter.statut_enable);
            OTCodeActe.setDtCREATED(new Date());

            this.persiste(OTCodeActe);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_CODE_ACTE_ID, String str_LIBELLE) {

        TCodeActe OTCodeActe = null;
        try {

            OTCodeActe = getOdataManager().getEm().find(TCodeActe.class, lg_CODE_ACTE_ID);
            // OTCodeActe.setStrCODEGROUPEFAMILLE(str_CODE_GROUPE_FAMILLE);
            OTCodeActe.setStrLIBELLEE(str_LIBELLE);
            // OTCodeActe.setStrCOMMENTAIRE(str_COMMENTAIRE);

            OTCodeActe.setStrSTATUT(commonparameter.statut_enable);
            OTCodeActe.setDtUPDATED(new Date());

            this.persiste(OTCodeActe);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

}
