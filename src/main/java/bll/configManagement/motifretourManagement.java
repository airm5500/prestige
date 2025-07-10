/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

//import dal.TTyperemise;
import dal.TMotifRetour;
import bll.bllBase;
import dal.TMotifRetour;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class motifretourManagement extends bllBase {

    Object Otable = TMotifRetour.class;

    public motifretourManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE, String str_LIBELLE) {

        try {

            dal.TMotifRetour OTMotifRetour = new dal.TMotifRetour();
            OTMotifRetour.setLgMOTIFRETOUR(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de
                                                                          // la date courante
            OTMotifRetour.setStrCODE(str_CODE);
            OTMotifRetour.setStrLIBELLE(str_LIBELLE);
            OTMotifRetour.setStrSTATUT(commonparameter.statut_enable);
            OTMotifRetour.setDtCREATED(new Date());
            this.persiste(OTMotifRetour);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_MOTIF_RETOUR, String str_CODE, String str_LIBELLE) {

        try {

            TMotifRetour OTMotifRetour = null;
            OTMotifRetour = getOdataManager().getEm().find(TMotifRetour.class, lg_MOTIF_RETOUR);

            OTMotifRetour.setStrCODE(str_CODE);
            OTMotifRetour.setStrLIBELLE(str_LIBELLE);
            OTMotifRetour.setStrSTATUT(commonparameter.statut_enable);
            OTMotifRetour.setDtUPDATED(new Date());
            this.persiste(OTMotifRetour);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de modifier un " + Otable, e.getMessage());
        }

    }

    public void deleted(String lg_MOTIF_RETOUR) {

        try {

            TMotifRetour OTMotifRetour = null;
            OTMotifRetour = getOdataManager().getEm().find(TMotifRetour.class, lg_MOTIF_RETOUR);

            OTMotifRetour.setStrSTATUT(commonparameter.DELETE);

            this.persiste(OTMotifRetour);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception E) {

            this.buildErrorTraceMessage("Impossible de supprimer un " + Otable, E.getMessage());

        }

    }

}
