/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TVille;
import bll.bllBase;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class villeManagement extends bllBase {

    Object Otable = TVille.class;

    public villeManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String STR_NAME, String STR_CODE_POSTAL, String STR_BUREAU_DISTRIBUTEUR) {

        try {

            TVille OTVille = new TVille();
            OTVille.setLgVILLEID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de la date
                                                                // courante
            OTVille.setStrName(STR_NAME);
            OTVille.setStrCodePostal(STR_CODE_POSTAL);
            OTVille.setStrBureauDistributeur(STR_BUREAU_DISTRIBUTEUR);
            OTVille.setStrStatut(commonparameter.statut_enable);
            OTVille.setDtCreated(new Date());

            this.persiste(OTVille);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String LG_VILLE_ID, String STR_NAME, String STR_CODE_POSTAL, String STR_BUREAU_DISTRIBUTEUR) {

        try {

            TVille OTVille = null;
            OTVille = getOdataManager().getEm().find(TVille.class, LG_VILLE_ID);

            OTVille.setLgVILLEID(LG_VILLE_ID);
            OTVille.setStrName(STR_NAME);
            OTVille.setStrCodePostal(STR_CODE_POSTAL);
            OTVille.setStrBureauDistributeur(STR_BUREAU_DISTRIBUTEUR);
            OTVille.setStrStatut(commonparameter.statut_enable);
            OTVille.setDtUpdated(new Date());

            this.persiste(OTVille);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

}
