/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TMedecin;

import bll.bllBase;
import dal.TSpecialite;
import dal.TVille;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class medecinManagement extends bllBase {

    Object Otable = TMedecin.class;

    public medecinManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE_INTERNE, String str_FIRST_NAME, String str_LAST_NAME, String str_ADRESSE,
            String str_PHONE, String str_MAIL, String str_SEXE, String str_Commentaire, String lg_VILLE_ID,
            String lg_SPECIALITE_ID) {

        try {

            TMedecin OTMedecin = new TMedecin();

            OTMedecin.setLgMEDECINID(this.getKey().getComplexId());
            OTMedecin.setStrCODEINTERNE(str_CODE_INTERNE);
            OTMedecin.setStrFIRSTNAME(str_FIRST_NAME);
            OTMedecin.setStrLASTNAME(str_LAST_NAME);
            OTMedecin.setStrADRESSE(str_ADRESSE);
            OTMedecin.setStrPHONE(str_PHONE);
            OTMedecin.setStrMAIL(str_MAIL);
            OTMedecin.setStrSEXE(str_SEXE);
            OTMedecin.setStrCommentaire(str_Commentaire);

            // lg_VILLE_ID
            TVille OTVille = getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTMedecin.setLgVILLEID(OTVille);
                new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
            }

            // lg_SPECIALITE_ID
            TSpecialite OTSpecialite = getOdataManager().getEm().find(TSpecialite.class, lg_SPECIALITE_ID);
            if (OTSpecialite != null) {
                OTMedecin.setLgSPECIALITEID(OTSpecialite);
                new logger().oCategory.info("lg_SPECIALITE_ID     Create   " + lg_SPECIALITE_ID);
            }

            OTMedecin.setStrSTATUT(commonparameter.statut_enable);
            OTMedecin.setDtCREATED(new Date());

            this.persiste(OTMedecin);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_MEDECIN_ID, String str_CODE_INTERNE, String str_FIRST_NAME, String str_LAST_NAME,
            String str_ADRESSE, String str_PHONE, String str_MAIL, String str_SEXE, String str_Commentaire,
            String lg_VILLE_ID, String lg_SPECIALITE_ID) {

        try {

            TMedecin OTMedecin = null;
            OTMedecin = getOdataManager().getEm().find(TMedecin.class, lg_MEDECIN_ID);

            // lg_VILLE_ID
            dal.TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTMedecin.setLgVILLEID(OTVille);
                new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
            }

            // lg_SPECIALITE_ID
            dal.TSpecialite OTSpecialite = getOdataManager().getEm().find(dal.TSpecialite.class, lg_SPECIALITE_ID);
            if (OTSpecialite != null) {
                OTMedecin.setLgSPECIALITEID(OTSpecialite);
                new logger().oCategory.info("lg_SPECIALITE_ID     Create   " + lg_SPECIALITE_ID);
            }

            OTMedecin.setStrCODEINTERNE(str_CODE_INTERNE);
            OTMedecin.setStrFIRSTNAME(str_FIRST_NAME);
            OTMedecin.setStrLASTNAME(str_LAST_NAME);
            OTMedecin.setStrADRESSE(str_ADRESSE);
            OTMedecin.setStrPHONE(str_PHONE);
            OTMedecin.setStrMAIL(str_MAIL);
            OTMedecin.setStrSEXE(str_SEXE);
            OTMedecin.setStrCommentaire(str_Commentaire);

            OTMedecin.setStrSTATUT(commonparameter.statut_enable);
            OTMedecin.setDtUPDATED(new Date());

            this.persiste(OTMedecin);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }
    }

}
