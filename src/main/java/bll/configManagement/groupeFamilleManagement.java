/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TGroupeFamille;

import bll.bllBase;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class groupeFamilleManagement extends bllBase {

    Object Otable = TGroupeFamille.class;

    public groupeFamilleManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE_GROUPE_FAMILLE, String str_LIBELLE, String str_COMMENTAIRE) {

        try {

            TGroupeFamille OTGroupeFamille = new TGroupeFamille();

            OTGroupeFamille.setLgGROUPEFAMILLEID(this.getKey().getComplexId()); // Génération automatique d'un ID à
                                                                                // partir de la date courante
            OTGroupeFamille.setStrLIBELLE(str_LIBELLE);
            OTGroupeFamille.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTGroupeFamille.setStrCODEGROUPEFAMILLE(str_CODE_GROUPE_FAMILLE);

            OTGroupeFamille.setStrSTATUT(commonparameter.statut_enable);
            OTGroupeFamille.setDtCREATED(new Date());

            this.persiste(OTGroupeFamille);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_GROUPE_FAMILLE_ID, String str_CODE_GROUPE_FAMILLE, String str_LIBELLE,
            String str_COMMENTAIRE) {

        TGroupeFamille OTGroupeFamille = null;
        try {

            OTGroupeFamille = getOdataManager().getEm().find(TGroupeFamille.class, lg_GROUPE_FAMILLE_ID);
            OTGroupeFamille.setStrCODEGROUPEFAMILLE(str_CODE_GROUPE_FAMILLE);
            OTGroupeFamille.setStrLIBELLE(str_LIBELLE);
            OTGroupeFamille.setStrCOMMENTAIRE(str_COMMENTAIRE);

            OTGroupeFamille.setStrSTATUT(commonparameter.statut_enable);
            OTGroupeFamille.setDtUPDATED(new Date());

            this.persiste(OTGroupeFamille);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

}
