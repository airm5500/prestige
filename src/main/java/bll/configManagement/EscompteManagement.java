/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TEscompteSociete;
import dal.TUser;
import dal.dataManager;
import dal.TEscompteSocieteTranche;

import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class EscompteManagement extends bllBase {

    public EscompteManagement(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public EscompteManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    // Liste des escomptes societes tranches
    public List<TEscompteSocieteTranche> SearchAllOrOneEscompteSocieteTranche(String search_value) {
        List<TEscompteSocieteTranche> lstTEscompteSocieteTranche = null;
        try {
            if (search_value.equals("") || search_value == null) {
                search_value = "%%";
            }
            new logger().OCategory.info("search_value ----->   " + search_value);
            lstTEscompteSocieteTranche = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEscompteSocieteTranche t WHERE t.lgESCOMPTESOCIETETRANCHEID LIKE ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, search_value).setParameter(2, commonparameter.statut_enable).getResultList();
            for (int i = 0; i < lstTEscompteSocieteTranche.size(); i++) {
                new logger().OCategory
                        .info("Escompte societe : "
                                + lstTEscompteSocieteTranche.get(i).getLgESCOMPTESOCIETEID()
                                        .getStrLIBELLEESCOMPTESOCIETE()
                                + " Tranche taux"
                                + lstTEscompteSocieteTranche.get(i).getLgTRANCHEID().getDblPOURCENTAGETRANCHE());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTEscompteSocieteTranche;
    }
    // fin Liste des escomptes societes tranches

    public TEscompteSociete getTEscompteSociete(String lg_ESCOMPTE_SOCIETE_ID) {
        TEscompteSociete OTEscompteSociete = (TEscompteSociete) this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TEscompteSociete t WHERE t.lgESCOMPTESOCIETEID = ?1 OR t.strLIBELLEESCOMPTESOCIETE = ?2")
                .setParameter(1, lg_ESCOMPTE_SOCIETE_ID).setParameter(2, lg_ESCOMPTE_SOCIETE_ID).getSingleResult();
        return OTEscompteSociete;
    }

}
