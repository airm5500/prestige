/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

//import dal.TTyperemise;

import dal.TTypeRemise;
import bll.bllBase;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class typeremiseManagement extends bllBase {

    // Object Otable = TTyperemise.class;
    //
    // public typeremiseManagement(dataManager OdataManager) {
    // this.setOdataManager(OdataManager);
    // this.checkDatamanager();
    // }
    //
    // public void create(String STR_NAME, String STR_DESCRIPTION) {
    //
    // try {
    // dal.TTyperemise OTTyperemise = new dal.TTyperemise();
    // OTTyperemise.setLgTyperemiseId(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de la
    // date courante
    // OTTyperemise.setStrNAME(STR_NAME);
    // OTTyperemise.setStrDESCRIPTION(STR_DESCRIPTION);
    // OTTyperemise.setStrStatus(commonparameter.statut_enable);
    //
    // //OTTyperemise.setDtCreated(dt_CREATED);
    // //OTTyperemise.setDtUpdated(dt_UPDATED);
    // this.persiste(OTTyperemise);
    //
    // this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
    // } catch (Exception e) {
    // this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
    // }
    //
    // }
    //
    // public void update(String LG_VILLE_ID, String STR_NAME, String STR_DESCRIPTION) {
    //
    // try {
    //
    // TTyperemise OTTyperemise = new TTyperemise();
    // OTTyperemise = getOdataManager().getEm().find(TTyperemise.class, LG_VILLE_ID);
    //
    // OTTyperemise.setLgTyperemiseId(LG_VILLE_ID);
    // OTTyperemise.setStrNAME(STR_NAME);
    // OTTyperemise.setStrDESCRIPTION(STR_DESCRIPTION);
    // OTTyperemise.setStrStatus(commonparameter.statut_enable);
    // //OTTyperemise.setDtCreated(dt_CREATED);
    // //OTTyperemise.setDtUpdated(dt_UPDATED);
    // this.persiste(OTTyperemise);
    //
    // this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
    // } catch (Exception e) {
    // this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
    // }
    //
    // }

    Object Otable = TTypeRemise.class;

    public typeremiseManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String STR_NAME, String STR_DESCRIPTION) {

        try {
            dal.TTypeRemise OTTypeRemise = new dal.TTypeRemise();
            OTTypeRemise.setLgTYPEREMISEID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de
                                                                          // la date courante
            OTTypeRemise.setStrNAME(STR_NAME);
            OTTypeRemise.setStrDESCRIPTION(STR_DESCRIPTION);
            OTTypeRemise.setStrSTATUT(commonparameter.statut_enable);
            OTTypeRemise.setDtCREATED(new Date());
            this.persiste(OTTypeRemise);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String LG_TYPEREMISE_ID, String STR_NAME, String STR_DESCRIPTION) {

        try {

            TTypeRemise OTTypeRemise = null;
            OTTypeRemise = getOdataManager().getEm().find(TTypeRemise.class, LG_TYPEREMISE_ID);

            OTTypeRemise.setLgTYPEREMISEID(LG_TYPEREMISE_ID);
            OTTypeRemise.setStrNAME(STR_NAME);
            OTTypeRemise.setStrDESCRIPTION(STR_DESCRIPTION);
            OTTypeRemise.setStrSTATUT(commonparameter.statut_enable);
            OTTypeRemise.setDtUPDATED(new Date());
            this.persiste(OTTypeRemise);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public boolean delete(Object o) {
        return this.delete(o, new TTypeRemise());
    }

}
