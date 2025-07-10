/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import bll.common.Parameter;
import dal.TCompteClient;
import dal.TEmplacement;
import dal.TOfficine;
import dal.TTypedepot;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class EmplacementManagement extends bllBase {

    TEmplacement OTEmplacement = new TEmplacement();

    public EmplacementManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public EmplacementManagement(dataManager OdataManager, TUser OTUser) {
        this.setOdataManager(OdataManager);
        this.setOTUser(OTUser);
        this.checkDatamanager();
    }

    // creation d'un emplacement
    public TEmplacement createEmplacement(String str_NAME, String str_DESCRIPTION, String str_LOCALITE,
            String str_FIRST_NAME, String str_LAST_NAME, String str_PHONE, TCompteClient OTCompteClient,
            String lg_TYPEDEPOT_ID, boolean bool_SAME_LOCATION) {
        TTypedepot OTTypedepot = null;
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        try {
            OTTypedepot = this.getTTypedepot(lg_TYPEDEPOT_ID);
            OTEmplacement.setLgEMPLACEMENTID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir
                                                                            // de la date courante
            OTEmplacement.setStrNAME(str_NAME);
            OTEmplacement.setStrDESCRIPTION(str_DESCRIPTION);
            OTEmplacement.setStrFIRSTNAME(str_FIRST_NAME);
            OTEmplacement.setStrLASTNAME(str_LAST_NAME);
            OTEmplacement.setStrLOCALITE(str_LOCALITE);
            OTEmplacement.setStrPHONE(str_PHONE);
            OTEmplacement.setLgCOMPTECLIENTID(OTCompteClient);
            OTEmplacement.setLgTYPEDEPOTID(OTTypedepot);
            OTEmplacement.setStrSTATUT(commonparameter.statut_enable);
            OTEmplacement.setDtCREATED(new Date());
            OTEmplacement.setBoolSAMELOCATION(bool_SAME_LOCATION);
            if (this.persiste(OTEmplacement)) {
                if (OTEmplacement.getLgTYPEDEPOTID().getLgTYPEDEPOTID()
                        .equalsIgnoreCase(Parameter.TYPE_DEPOT_EXTENSION)) {
                    if (OfamilleManagement.createTZoneGeographiqueBis(this.getKey().getShortId(10),
                            Parameter.DEFAUL_EMPLACEMENT, OTEmplacement)) {
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    } else {
                        this.buildErrorTraceMessage(OfamilleManagement.getDetailmessage());
                    }
                } else {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                }

            } else {
                this.buildErrorTraceMessage("Impossible de créer le nouvel emplacement");
                return null;
            }

            return OTEmplacement;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de créer le nouvel emplacement");
            return null;
        }

    }
    // fin creation d'un emplacement

    // update d'un emplacement
    public boolean updateEmplacement(String lg_EMPLACEMENT_ID, String str_NAME, String str_DESCRIPTION,
            String str_LOCALITE, String str_FIRST_NAME, String str_LAST_NAME, String str_PHONE, String lg_TYPEDEPOT_ID,
            boolean bool_SAME_LOCATION) {
        boolean result = false;
        TTypedepot OTTypedepot = null;
        try {
            OTTypedepot = this.getTTypedepot(lg_TYPEDEPOT_ID);
            OTEmplacement = this.getEmplacement(lg_EMPLACEMENT_ID);
            OTEmplacement.setStrNAME(str_NAME);
            OTEmplacement.setBoolSAMELOCATION(bool_SAME_LOCATION);
            OTEmplacement.setStrDESCRIPTION(str_DESCRIPTION);
            OTEmplacement.setStrFIRSTNAME(str_FIRST_NAME);
            OTEmplacement.setStrLASTNAME(str_LAST_NAME);
            OTEmplacement.setStrLOCALITE(str_LOCALITE);
            OTEmplacement.setStrPHONE(str_PHONE);
            if (OTTypedepot != null) {
                OTEmplacement.setLgTYPEDEPOTID(OTTypedepot);
            }
            //
            OTEmplacement.setDtUPDATED(new Date());

            this.persiste(OTEmplacement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            result = true;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de mettre à jour un emplacement");
        }
        return result;
    }
    // fin update d'un emplacement

    // supprimer d'un emplacement
    public boolean deleteEmplacement(String lg_EMPLACEMENT_ID) {
        boolean result = false;
        try {

            if (lg_EMPLACEMENT_ID.equalsIgnoreCase("1")) {
                this.buildErrorTraceMessage("Impossible de suppression l'officine");
            } else {
                OTEmplacement = this.getEmplacement(lg_EMPLACEMENT_ID);
                OTEmplacement.setStrSTATUT(commonparameter.statut_delete);
                OTEmplacement.setDtUPDATED(new Date());

                this.persiste(OTEmplacement);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

            result = true;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de supprimer un emplacement");
        }
        return result;
    }
    // fin supprimer d'un emplacement

    // liste des emplacements possible de l'office
    public List<TEmplacement> showAllOrOneEmplacement(String search_value, String lg_EMPLACEMENT_ID,
            String lg_TYPEDEPOT_ID) {
        List<TEmplacement> lstTEmplacement = new ArrayList<TEmplacement>();
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTEmplacement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEmplacement t WHERE (t.strDESCRIPTION LIKE ?1 OR t.strFIRSTNAME LIKE ?1 OR t.strLOCALITE LIKE ?1 OR t.strLASTNAME LIKE ?1) AND t.lgEMPLACEMENTID LIKE ?2 AND t.strSTATUT LIKE ?3 AND t.lgTYPEDEPOTID.lgTYPEDEPOTID LIKE ?4 ORDER BY t.strDESCRIPTION ASC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_EMPLACEMENT_ID)
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, lg_TYPEDEPOT_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTEmplacement taille " + lstTEmplacement.size());
        return lstTEmplacement;
    }

    public List<TEmplacement> showAllOrOneEmplacementSansOfficine(String search_value, String lg_EMPLACEMENT_ID,
            String lg_TYPEDEPOT_ID) {
        List<TEmplacement> lstTEmplacement = new ArrayList<TEmplacement>();
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTEmplacement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEmplacement t WHERE (t.strDESCRIPTION LIKE ?1 OR t.strFIRSTNAME LIKE ?1 OR t.strLOCALITE LIKE ?1 OR t.strLASTNAME LIKE ?1) AND t.lgEMPLACEMENTID NOT LIKE ?2 AND t.strSTATUT LIKE ?3 AND t.lgTYPEDEPOTID.lgTYPEDEPOTID LIKE ?4 ORDER BY t.strNAME ASC")
                    .setParameter(1, search_value + "%").setParameter(2, "1")
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, lg_TYPEDEPOT_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTEmplacement taille " + lstTEmplacement.size());
        return lstTEmplacement;
    }
    // fin liste des emplacements possible de l'office

    // recuperation d'un emplacement
    public TEmplacement getEmplacement(String search_value) {
        TEmplacement _OTEmplacement = null;
        try {

            _OTEmplacement = (TEmplacement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEmplacement t WHERE (t.strDESCRIPTION LIKE ?1 OR t.strNAME LIKE ?1 OR t.lgEMPLACEMENTID LIKE ?1 OR t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?1) AND t.strSTATUT LIKE ?2")
                    .setParameter(1, search_value).setParameter(2, commonparameter.statut_enable).setFirstResult(0)
                    .setMaxResults(1).getSingleResult();
            //// new logger().OCategory.info("Emplacement " + OTEmplacement.getStrFIRSTNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }

        return _OTEmplacement;
    }

    public TEmplacement getEmplacementByCompteClient(String lg_COMPTE_CLIENT_ID) {
        TEmplacement OTEmplacement = null;
        try {
            OTEmplacement = (TEmplacement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEmplacement t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTEmplacement;
    }

    public TEmplacement getEmplacementByOwner(String str_FIRST_LAST_NAME) {
        TEmplacement OTEmplacement = null;
        try {
            OTEmplacement = (TEmplacement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEmplacement t WHERE CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, str_FIRST_LAST_NAME).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTEmplacement;
    }

    // fin recuperation d'un emplacement
    public TOfficine getOfficine() {
        TOfficine officine = null;
        try {
            officine = (TOfficine) this.getOdataManager().getEm().createQuery("SELECT o FROM  TOfficine o")
                    .setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return officine;
    }

    public boolean updateOfficne(String lg_OFFICINE_ID, String str_FIRST_NAME, String str_NOM_ABREGE,
            String str_NOM_COMPLET, String str_LAST_NAME, String str_ADRESSSE_POSTALE, String str_PHONE,
            String str_COMMENTAIRE1, String str_COMMENTAIRE2, String str_ENTETE, String str_PHONE_OFFICINE,
            String str_COMPTE_CONTRIBUABLE, String str_REGISTRE_COMMERCE, String str_REGISTRE_IMPOSITION,
            String str_CENTRE_IMPOSITION, String str_NUM_COMPTABLE, String str_COMMENTAIREOFFICINE,
            String str_COMPTE_BANCAIRE) {
        boolean result = false;

        TOfficine officine = null;
        try {
            officine = this.getOdataManager().getEm().find(TOfficine.class, lg_OFFICINE_ID);

            officine.setStrADRESSSEPOSTALE(str_ADRESSSE_POSTALE);
            officine.setStrCOMMENTAIREOFFICINE(str_COMMENTAIREOFFICINE);
            officine.setStrNUMCOMPTABLE(str_NUM_COMPTABLE);
            officine.setStrNOMABREGE(str_NOM_ABREGE);
            officine.setStrFIRSTNAME(str_FIRST_NAME);
            officine.setStrCOMMENTAIRE1(str_COMMENTAIRE1);
            officine.setStrCOMMENTAIRE2(str_COMMENTAIRE2);
            officine.setStrENTETE(str_ENTETE);
            officine.setStrLASTNAME(str_LAST_NAME);
            String[] phonestring = null;
            String setStrAUTRESPHONES = "";
            if (str_PHONE.length() > 0) {
                phonestring = str_PHONE.split(";");

            }
            setStrAUTRESPHONES = str_PHONE.substring(str_PHONE.indexOf(";") + 1, str_PHONE.length());
            officine.setStrAUTRESPHONES(setStrAUTRESPHONES);
            officine.setStrPHONE(phonestring[0]);

            officine.setStrNOMCOMPLET(str_NOM_COMPLET);
            officine.setDtUPDATED(new Date());
            officine.setStrREGISTREIMPOSITION(str_REGISTRE_IMPOSITION);
            officine.setStrREGISTRECOMMERCE(str_REGISTRE_COMMERCE);
            officine.setStrCENTREIMPOSITION(str_CENTRE_IMPOSITION);
            officine.setStrCOMPTECONTRIBUABLE(str_COMPTE_CONTRIBUABLE);
            officine.setStrCOMPTEBANCAIRE(str_COMPTE_BANCAIRE);

            if (this.persiste(officine)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour des informations");
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de mise à jour des informations");
            e.printStackTrace();
        }
        return result;
    }

    // recuperation de type depot
    public TTypedepot getTTypedepot(String search_value) {
        TTypedepot OTTypedepot = null;
        try {
            OTTypedepot = (TTypedepot) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypedepot t WHERE (t.lgTYPEDEPOTID = ?1 OR t.strDESCRIPTION = ?1 OR t.strNAME = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, search_value).setParameter(2, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTypedepot;
    }
    // fin recuperation de type depot

    // liste des depots
    public List<TTypedepot> showAllOrOneTypedepot(String search_value, String lg_TYPEDEPOT_ID) {
        List<TTypedepot> lstTTypedepot = new ArrayList<TTypedepot>();
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTTypedepot = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypedepot t WHERE (t.strDESCRIPTION LIKE ?1 OR t.strNAME LIKE ?1) AND t.lgTYPEDEPOTID LIKE ?2 AND t.strSTATUT LIKE ?3 AND t.lgTYPEDEPOTID NOT LIKE ?4 ORDER BY t.strDESCRIPTION ASC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_TYPEDEPOT_ID)
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, "0").getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTTypedepot taille " + lstTTypedepot.size());
        return lstTTypedepot;
    }
    // fin liste des depots
}
