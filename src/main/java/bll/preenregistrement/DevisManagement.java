/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.preenregistrement;

import bll.bllBase;
import dal.TDevise;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMETCH
 */
public class DevisManagement extends bllBase {

    public DevisManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public DevisManagement(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    // creation des devises
    public boolean createDevise(String str_NAME, String str_DESCRIPTION, Double int_TAUX) {
        boolean result = false;
        try {
            TDevise OTDevise = new TDevise();
            OTDevise.setLgDEVISEID(this.getKey().getComplexId());
            OTDevise.setStrNAME(str_NAME);
            OTDevise.setStrDESCRIPTION(str_DESCRIPTION);
            OTDevise.setIntTAUX(int_TAUX);
            OTDevise.setDtCREATED(new Date());
            if (this.persiste(OTDevise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de création de la devise");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la devise");
        }
        return result;
    }
    // fin creation des devises

    // creation des devises
    public boolean updateDevise(String lg_DEVISE_ID, String str_NAME, String str_DESCRIPTION, Double int_TAUX) {
        boolean result = false;
        TDevise OTDevise = null;
        try {
            OTDevise = this.getTDevise(lg_DEVISE_ID);
            OTDevise.setStrNAME(str_NAME);
            OTDevise.setStrDESCRIPTION(str_DESCRIPTION);
            OTDevise.setIntTAUX(int_TAUX);
            OTDevise.setDtCREATED(new Date());
            if (this.persiste(OTDevise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de la devise");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la devise");
        }
        return result;
    }
    // fin creation des devises

    // recuperation d'une devise
    public TDevise getTDevise(String lg_DEVISE_ID) {
        TDevise OTDevise = null;
        try {
            OTDevise = (TDevise) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TDevise t WHERE (t.lgDEVISEID =?1 OR t.strNAME = ?1 OR t.strDESCRIPTION = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_DEVISE_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTDevise;
    }
    // fin recuperation d'une devise

    // suppression de devise
    public boolean deleteDevise(String lg_DEVISE_ID) {
        boolean result = false;
        TDevise OTDevise = null;
        try {
            OTDevise = this.getTDevise(lg_DEVISE_ID);
            if (this.delete(OTDevise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Impossible de supprimer une devise déjà utilisée");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de la devise");
        }
        return result;
    }
    // fin suppression de devise

    // liste des devises
    public List<TDevise> getListDevises(String search_value, String lg_DEVISE_ID) {
        List<TDevise> lstDevises = new ArrayList<>();
        try {
            lstDevises = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TDevise t WHERE (t.strDESCRIPTION LIKE ?1 OR t.strNAME LIKE ?1) AND t.lgDEVISEID LIKE ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, search_value + "%").setParameter(2, lg_DEVISE_ID)
                    .setParameter(3, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstDevises taille " + lstDevises.size());
        return lstDevises;
    }
    // fin liste des devises

}
