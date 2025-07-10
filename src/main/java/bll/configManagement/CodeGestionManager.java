/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TCalendrier;
import dal.TCodeGestion;
import dal.TCoefficientPonderation;
import dal.TMonth;
import dal.TOptimisationQuantite;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.*;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class CodeGestionManager extends bllBase {

    public CodeGestionManager(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public CodeGestionManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    // recupere le recupere le code gestion
    public TCodeGestion getTCodeGestion(String lg_CODE_GESTION_ID) {
        TCodeGestion OTCodeGestion = null;
        try {
            OTCodeGestion = (TCodeGestion) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCodeGestion t WHERE t.lgCODEGESTIONID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_CODE_GESTION_ID).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTCodeGestion;
    }
    // fin recupere le recupere le code gestion

    // recupere le recupere l'optimisation
    public TOptimisationQuantite getTOptimisationQuantite(String lg_OPTIMISATION_QUANTITE_ID) {
        TOptimisationQuantite OTOptimisationQuantite = null;
        try {
            OTOptimisationQuantite = (TOptimisationQuantite) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TOptimisationQuantite t WHERE (t.lgOPTIMISATIONQUANTITEID = ?1 OR t.strLIBELLEOPTIMISATION = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_OPTIMISATION_QUANTITE_ID).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTOptimisationQuantite;
    }
    // fin recupere le recupere l'optimisation

    // fonction pour créer un code gestion
    public TCodeGestion createCodeGestion(String str_CODE_BAREME, int int_JOURS_COUVERTURE_STOCK,
            int int_MOIS_HISTORIQUE_VENTE, int int_DATE_BUTOIR_ARTICLE, int int_DATE_LIMITE_EXTRAPOLATION,
            boolean bool_OPTIMISATION_SEUIL_CMDE, int int_COEFFICIENT_PONDERATION, String lg_OPTIMISATION_QUANTITE_ID,
            int int_COEFFICIENT_PONDERATION1, int int_COEFFICIENT_PONDERATION2, int int_COEFFICIENT_PONDERATION3,
            int int_COEFFICIENT_PONDERATION4, int int_COEFFICIENT_PONDERATION5, int int_COEFFICIENT_PONDERATION6) {
        TCodeGestion OTCodeGestion = null;

        try {
            TOptimisationQuantite OTOptimisationQuantite = this.getTOptimisationQuantite(lg_OPTIMISATION_QUANTITE_ID);
            if (OTOptimisationQuantite == null) {
                this.buildErrorTraceMessage("Echec de création. Optimisation invalide");
                return null;
            }

            OTCodeGestion = new TCodeGestion();
            OTCodeGestion.setLgCODEGESTIONID(this.getKey().getComplexId());
            OTCodeGestion.setStrCODEBAREME(str_CODE_BAREME);
            OTCodeGestion.setIntJOURSCOUVERTURESTOCK(int_JOURS_COUVERTURE_STOCK);
            OTCodeGestion.setIntMOISHISTORIQUEVENTE(int_MOIS_HISTORIQUE_VENTE);
            OTCodeGestion.setIntDATEBUTOIRARTICLE(int_DATE_BUTOIR_ARTICLE);
            OTCodeGestion.setIntDATELIMITEEXTRAPOLATION(int_DATE_LIMITE_EXTRAPOLATION);
            OTCodeGestion.setBoolOPTIMISATIONSEUILCMDE(bool_OPTIMISATION_SEUIL_CMDE);
            OTCodeGestion.setIntCOEFFICIENTPONDERATION(int_COEFFICIENT_PONDERATION);
            OTCodeGestion.setLgOPTIMISATIONQUANTITEID(OTOptimisationQuantite);
            OTCodeGestion.setStrSTATUT(commonparameter.statut_enable);
            OTCodeGestion.setLgUSERID(this.getOTUser());
            OTCodeGestion.setDtCREATED(new Date());

            if (this.persiste(OTCodeGestion)) {
                this.loadCoefficientByCodeGetion(OTCodeGestion, int_COEFFICIENT_PONDERATION1,
                        int_COEFFICIENT_PONDERATION2, int_COEFFICIENT_PONDERATION3, int_COEFFICIENT_PONDERATION4,
                        int_COEFFICIENT_PONDERATION5, int_COEFFICIENT_PONDERATION6);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création du code gestion");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du code gestion");
        }
        return OTCodeGestion;
    }
    // fin creation code gestion

    // liste des coefficients de ponderation d'un code gestion
    public List<TCoefficientPonderation> getListTCoefficientPonderation(String lg_CODE_GESTION_ID) {
        List<TCoefficientPonderation> lst = new ArrayList<>();
        try {
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCoefficientPonderation t WHERE t.lgCODEGESTIONID.lgCODEGESTIONID = ?1 AND t.strSTATUT = ?2 ORDER BY t.intINDICEMONTH ASC")
                    .setParameter(1, lg_CODE_GESTION_ID).setParameter(2, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lst;
    }
    // fin liste des coefficients de ponderation d'un code gestion

    public void loadCoefficientByCodeGetion(TCodeGestion OTCodeGestion, int int_COEFFICIENT_PONDERATION1,
            int int_COEFFICIENT_PONDERATION2, int int_COEFFICIENT_PONDERATION3, int int_COEFFICIENT_PONDERATION4,
            int int_COEFFICIENT_PONDERATION5, int int_COEFFICIENT_PONDERATION6) {
        List<TCoefficientPonderation> lst = new ArrayList<TCoefficientPonderation>();
        try {
            lst = this.getListTCoefficientPonderation(OTCodeGestion.getLgCODEGESTIONID());
            for (TCoefficientPonderation OTCoefficientPonderation : lst) {
                this.delete(OTCoefficientPonderation);
            }
            this.createCoefficientPonderation(OTCodeGestion, int_COEFFICIENT_PONDERATION1, 1);
            this.createCoefficientPonderation(OTCodeGestion, int_COEFFICIENT_PONDERATION2, 2);
            this.createCoefficientPonderation(OTCodeGestion, int_COEFFICIENT_PONDERATION3, 3);
            this.createCoefficientPonderation(OTCodeGestion, int_COEFFICIENT_PONDERATION4, 4);
            this.createCoefficientPonderation(OTCodeGestion, int_COEFFICIENT_PONDERATION5, 5);
            this.createCoefficientPonderation(OTCodeGestion, int_COEFFICIENT_PONDERATION6, 6);

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du mois de calendrier de l'année sélectionné");
        }
    }

    public boolean createCoefficientPonderation(TCodeGestion OTCodeGestion, int int_COEFFICIENT_PONDERATION,
            int int_INDICE_MONTH) {
        boolean result = false;
        TCoefficientPonderation OTCoefficientPonderation = null;
        try {
            OTCoefficientPonderation = new TCoefficientPonderation();
            OTCoefficientPonderation.setLgCOEFFICIENTPONDERATIONID(this.getKey().getComplexId());
            OTCoefficientPonderation.setIntCOEFFICIENTPONDERATION(int_COEFFICIENT_PONDERATION);
            OTCoefficientPonderation.setIntINDICEMONTH(int_INDICE_MONTH);
            OTCoefficientPonderation.setLgCODEGESTIONID(OTCodeGestion);
            OTCoefficientPonderation.setDtCREATED(new Date());
            OTCoefficientPonderation.setStrSTATUT(commonparameter.statut_enable);
            if (this.persiste(OTCoefficientPonderation)) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création du coefficient de pondération de ce code gestion");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du coefficient de pondération de ce code gestion");
        }
        return result;
    }
    // fin fonction pour créer un calendrier

    // fonction mise a jour code gestion
    public TCodeGestion updateCodeGestion(String lg_CODE_GESTION_ID, String str_CODE_BAREME,
            int int_JOURS_COUVERTURE_STOCK, int int_MOIS_HISTORIQUE_VENTE, int int_DATE_BUTOIR_ARTICLE,
            int int_DATE_LIMITE_EXTRAPOLATION, boolean bool_OPTIMISATION_SEUIL_CMDE, int int_COEFFICIENT_PONDERATION,
            String lg_OPTIMISATION_QUANTITE_ID, int int_COEFFICIENT_PONDERATION1, int int_COEFFICIENT_PONDERATION2,
            int int_COEFFICIENT_PONDERATION3, int int_COEFFICIENT_PONDERATION4, int int_COEFFICIENT_PONDERATION5,
            int int_COEFFICIENT_PONDERATION6) {
        TCodeGestion OTCodeGestion = null;

        try {

            OTCodeGestion = this.getTCodeGestion(lg_CODE_GESTION_ID);
            OTCodeGestion.setStrCODEBAREME(str_CODE_BAREME);
            OTCodeGestion.setIntJOURSCOUVERTURESTOCK(int_JOURS_COUVERTURE_STOCK);
            OTCodeGestion.setIntMOISHISTORIQUEVENTE(int_MOIS_HISTORIQUE_VENTE);
            OTCodeGestion.setIntDATEBUTOIRARTICLE(int_DATE_BUTOIR_ARTICLE);
            OTCodeGestion.setIntDATELIMITEEXTRAPOLATION(int_DATE_LIMITE_EXTRAPOLATION);
            OTCodeGestion.setBoolOPTIMISATIONSEUILCMDE(bool_OPTIMISATION_SEUIL_CMDE);
            OTCodeGestion.setIntCOEFFICIENTPONDERATION(int_COEFFICIENT_PONDERATION);
            TOptimisationQuantite OTOptimisationQuantite = this.getTOptimisationQuantite(lg_OPTIMISATION_QUANTITE_ID);
            if (OTOptimisationQuantite != null) {
                OTCodeGestion.setLgOPTIMISATIONQUANTITEID(OTOptimisationQuantite);
            }

            OTCodeGestion.setDtUPDATED(new Date());
            OTCodeGestion.setLgUSERID(this.getOTUser());

            if (this.persiste(OTCodeGestion)) {
                this.loadCoefficientByCodeGetion(OTCodeGestion, int_COEFFICIENT_PONDERATION1,
                        int_COEFFICIENT_PONDERATION2, int_COEFFICIENT_PONDERATION3, int_COEFFICIENT_PONDERATION4,
                        int_COEFFICIENT_PONDERATION5, int_COEFFICIENT_PONDERATION6);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du code gestion");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du code gestion");
        }
        return OTCodeGestion;
    }
    // fin mise a jour code gestion

    // fonction pour supprimer d'un code gestion
    public boolean deleteCodeGestion(String lg_CODE_GESTION_ID) {
        boolean result = false;
        List<TCoefficientPonderation> lst = new ArrayList<TCoefficientPonderation>();
        try {
            TCodeGestion OTCodeGestion = this.getTCodeGestion(lg_CODE_GESTION_ID);
            lst = this.getListTCoefficientPonderation(OTCodeGestion.getLgCODEGESTIONID());
            for (TCoefficientPonderation OTCoefficientPonderation : lst) {
                this.delete(OTCoefficientPonderation);
            }
            if (this.delete(OTCodeGestion)) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de suppression. Ce code est actuellement utilisé");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression. Ce code est actuellement utilisé");
        }
        return result;
    }
    // fin fonction pour supprimer un code gestion

    // Liste des codes gestions
    public List<TCodeGestion> getlistTCodeGestion(String search_value, String lg_CODE_GESTION_ID,
            String lg_OPTIMISATION_QUANTITE_ID) {

        List<TCodeGestion> lstTCodeGestion = new ArrayList<TCodeGestion>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTCodeGestion = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCodeGestion t WHERE t.lgCODEGESTIONID LIKE ?1 AND t.lgOPTIMISATIONQUANTITEID.lgOPTIMISATIONQUANTITEID LIKE ?2 AND t.strSTATUT = ?3 AND t.strCODEBAREME LIKE ?4 ORDER BY t.strCODEBAREME ASC")
                    .setParameter(1, lg_CODE_GESTION_ID).setParameter(2, lg_OPTIMISATION_QUANTITE_ID)
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, search_value + "%").getResultList();
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTCodeGestion.size());
        return lstTCodeGestion;
    }

    // fin Liste des codes gestions

}
