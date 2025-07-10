/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TAyantDroit;
import dal.TCategorieAyantdroit;
import dal.TClient;
import dal.TRisque;
import dal.TVille;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class ayantDroitManagement extends bllBase {

    Object OtableTAyantDroit = TAyantDroit.class;
    Object OtableTCategorieAyantdroit = TCategorieAyantdroit.class;

    public ayantDroitManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public boolean createAyantdroit(String lg_CLIENT_ID, String lg_CATEGORIE_AYANTDROIT_ID, String str_FIRST_NAME,
            String str_LAST_NAME, String str_SEXE, Date dt_NAISSANCE, String lg_VILLE_ID, String lg_RISQUE_ID,
            String str_NUMERO_SECURITE_SOCIAL, String str_CODE_INTERNE) {
        boolean result = false;
        TAyantDroit OTAyantDroit;
        try {

            if (!str_NUMERO_SECURITE_SOCIAL.equalsIgnoreCase("")) {
                OTAyantDroit = this.getAyantDroit(str_NUMERO_SECURITE_SOCIAL);
                if (OTAyantDroit != null) {
                    this.buildErrorTraceMessage("Echec de création. Ce matricule est déjà utilisé par "
                            + OTAyantDroit.getStrFIRSTNAME() + " " + OTAyantDroit.getStrLASTNAME());
                    return false;
                }
            }

            if (str_CODE_INTERNE.equalsIgnoreCase("")) {
                str_CODE_INTERNE = this.getKey().getShortId(6);
            }
            while (this.getAyantDroit(str_CODE_INTERNE) != null) {
                str_CODE_INTERNE = this.getKey().getShortId(6);
            }
            OTAyantDroit = new TAyantDroit();

            OTAyantDroit.setLgAYANTSDROITSID(this.getKey().getComplexId());
            OTAyantDroit.setStrFIRSTNAME(str_FIRST_NAME);
            OTAyantDroit.setStrLASTNAME(str_LAST_NAME);
            OTAyantDroit.setStrSEXE(str_SEXE);
            OTAyantDroit.setDtNAISSANCE(dt_NAISSANCE);
            OTAyantDroit.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);

            OTAyantDroit.setStrCODEINTERNE(str_CODE_INTERNE);
            // lg_CLIENT_ID

            TClient OTClient = new clientManagement(this.getOdataManager()).getClient(lg_CLIENT_ID);
            if (OTClient == null) {
                this.buildErrorTraceMessage("Echec de création. Client inexistant");
                return false;
            }
            OTAyantDroit.setLgCLIENTID(OTClient);

            // lg_CATEGORIE_AYANTDROIT_ID
            TCategorieAyantdroit OTCategorieAyantdroit = this.getTCategorieAyantdroit(lg_CATEGORIE_AYANTDROIT_ID);
            if (OTCategorieAyantdroit != null) {
                OTAyantDroit.setLgCATEGORIEAYANTDROITID(OTCategorieAyantdroit);
                new logger().oCategory.info("lg_TYPE_REGLEMENT_ID     Create   " + lg_CATEGORIE_AYANTDROIT_ID);
            }

            // lg_VILLE_ID
            TVille OTVille = getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTAyantDroit.setLgVILLEID(OTVille);
                new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
            }

            // lg_RISQUE_ID
            TRisque OTRisque = this.getTRisque(lg_RISQUE_ID);
            if (OTRisque != null) {
                OTAyantDroit.setLgRISQUEID(OTRisque);
                new logger().oCategory.info("lg_RISQUE_ID     Create   " + lg_RISQUE_ID);
            }

            OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
            OTAyantDroit.setDtCREATED(new Date());

            // check for an existing one
            // if the OTAyantDroit does not exists , persiste it otherwise merge it.
            // if (aDroit != null || OTAyantDroit == aDroit) {
            // this.merge(OTAyantDroit);
            // } else {
            // this.persiste(OTAyantDroit);
            // }
            if (this.persiste(OTAyantDroit)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de l'ayant droit");
            }

            result = true;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + OtableTAyantDroit, e.getMessage());
        }
        return result;
    }

    public void updateAyantdroit(String lg_AYANTS_DROITS_ID, String lg_CLIENT_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String str_FIRST_NAME, String str_LAST_NAME, String str_SEXE, Date dt_NAISSANCE, String lg_VILLE_ID,
            String lg_RISQUE_ID, String str_NUMERO_SECURITE_SOCIAL) {
        TAyantDroit OTAyantDroitOld = null;
        try {

            if (!str_NUMERO_SECURITE_SOCIAL.equals("")) {
                OTAyantDroitOld = this.getAyantDroit(str_NUMERO_SECURITE_SOCIAL);
            }
            TAyantDroit OTAyantDroit = this.getOdataManager().getEm().find(TAyantDroit.class, lg_AYANTS_DROITS_ID);
            if (OTAyantDroit != null) {
                OTAyantDroit = this.getOdataManager().getEm()
                        .createNamedQuery("TAyantDroit.findByStrNUMEROSECURITESOCIAL", TAyantDroit.class)
                        .setParameter("strNUMEROSECURITESOCIAL", str_NUMERO_SECURITE_SOCIAL).getSingleResult();

            }
            TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTAyantDroit.setLgVILLEID(OTVille);
            }
            // lg_CLIENT_ID
            TClient OTClient = new clientManagement(this.getOdataManager()).getClient(lg_CLIENT_ID);
            if (OTClient == null) {
                this.buildErrorTraceMessage("Echec de création. Client inexistant");
                return;
            }
            OTAyantDroit.setLgCLIENTID(OTClient);

            // lg_CATEGORIE_AYANTDROIT_ID
            TCategorieAyantdroit OTCategorieAyantdroit = this.getTCategorieAyantdroit(lg_CATEGORIE_AYANTDROIT_ID);
            if (OTCategorieAyantdroit != null) {
                OTAyantDroit.setLgCATEGORIEAYANTDROITID(OTCategorieAyantdroit);
            }

            // lg_RISQUE_ID
            TRisque OTRisque = this.getTRisque(lg_RISQUE_ID);
            if (OTRisque != null) {
                OTAyantDroit.setLgRISQUEID(OTRisque);
            }

            if (OTAyantDroitOld != null && !OTAyantDroitOld.equals(OTAyantDroit)) {
                this.buildErrorTraceMessage("Echec de mise à jour. Ce matricule est utilisé par "
                        + OTAyantDroitOld.getStrFIRSTNAME() + " " + OTAyantDroitOld.getStrLASTNAME());
                return;
            }

            OTAyantDroit.setStrFIRSTNAME(str_FIRST_NAME);
            OTAyantDroit.setStrLASTNAME(str_LAST_NAME);
            if (!"".equals(str_SEXE)) {
                OTAyantDroit.setStrSEXE(str_SEXE);
            }
            OTAyantDroit.setDtNAISSANCE(dt_NAISSANCE);
            OTAyantDroit.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            // OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
            OTAyantDroit.setDtUPDATED(new Date());

            this.merge(OTAyantDroit);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + OtableTAyantDroit, e.getMessage());
        }

    }

    public void createCategorieAyantdroit(String str_CODE, String str_LIBELLE_CATEGORIE_AYANTDROIT) {

        try {

            TCategorieAyantdroit OTCategorieAyantdroit = new TCategorieAyantdroit();

            OTCategorieAyantdroit.setLgCATEGORIEAYANTDROITID(this.getKey().getComplexId());
            OTCategorieAyantdroit.setStrCODE(str_CODE);
            OTCategorieAyantdroit.setStrLIBELLECATEGORIEAYANTDROIT(str_LIBELLE_CATEGORIE_AYANTDROIT);

            OTCategorieAyantdroit.setStrSTATUT(commonparameter.statut_enable);
            OTCategorieAyantdroit.setDtCREATED(new Date());

            this.persiste(OTCategorieAyantdroit);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + OtableTCategorieAyantdroit, e.getMessage());
        }

    }

    public void updateCategorieAyantdroit(String lg_CATEGORIE_AYANTDROIT_ID, String str_LIBELLE_CATEGORIE_AYANTDROIT) {

        try {

            TCategorieAyantdroit OTCategorieAyantdroit = null;

            OTCategorieAyantdroit = getOdataManager().getEm().find(TCategorieAyantdroit.class,
                    lg_CATEGORIE_AYANTDROIT_ID);

            // OTCategorieAyantdroit.setStrCODE(str_CODE);
            OTCategorieAyantdroit.setStrLIBELLECATEGORIEAYANTDROIT(str_LIBELLE_CATEGORIE_AYANTDROIT);

            OTCategorieAyantdroit.setStrSTATUT(commonparameter.statut_enable);
            OTCategorieAyantdroit.setDtUPDATED(new Date());

            this.persiste(OTCategorieAyantdroit);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + OtableTCategorieAyantdroit, e.getMessage());
        }
    }

    // suppression d'un ayant droit d'un client
    public boolean removeAyantdroit(String lg_AYANTS_DROITS_ID, String lg_CLIENT_ID) {
        boolean result = false;
        try {

            TAyantDroit OTAyantDroit = this.getOdataManager().getEm().find(TAyantDroit.class, lg_AYANTS_DROITS_ID);

            new logger().OCategory.info("Nom de l'ayant droit " + OTAyantDroit.getStrFIRSTNAME() + " "
                    + OTAyantDroit.getStrLASTNAME() + " Nom client " + OTAyantDroit.getLgCLIENTID().getStrFIRSTNAME()
                    + " " + OTAyantDroit.getLgCLIENTID().getStrLASTNAME());
            new logger().OCategory.info(OTAyantDroit.getLgAYANTSDROITSID() + " = " + lg_AYANTS_DROITS_ID);
            if ((OTAyantDroit.getStrFIRSTNAME()).equalsIgnoreCase(OTAyantDroit.getLgCLIENTID().getStrFIRSTNAME())
                    && (OTAyantDroit.getStrLASTNAME())
                            .equalsIgnoreCase(OTAyantDroit.getLgCLIENTID().getStrLASTNAME())) {
                new logger().OCategory.info(
                        "Identifiant identique " + OTAyantDroit.getLgAYANTSDROITSID() + " = " + lg_AYANTS_DROITS_ID);
                this.buildErrorTraceMessage("Impossible de supprimer. Ayant droit en cours d'utilisation");
            } else {
                OTAyantDroit.setStrSTATUT(commonparameter.statut_delete);
                OTAyantDroit.setDtUPDATED(new Date());

                this.persiste(OTAyantDroit);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

            result = true;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + OtableTAyantDroit, e.getMessage());
        }
        new logger().OCategory.info("Resultat " + result);

        return result;
    }
    // fin suppression d'un ayant droit d'un client

    // recuperation de la categorie ayant droit
    public TCategorieAyantdroit getTCategorieAyantdroit(String lg_CATEGORIE_AYANTDROIT_ID) {
        TCategorieAyantdroit OTCategorieAyantdroit = null;
        try {
            OTCategorieAyantdroit = (TCategorieAyantdroit) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCategorieAyantdroit t WHERE t.lgCATEGORIEAYANTDROITID LIKE ?1 OR t.strLIBELLECATEGORIEAYANTDROIT LIKE ?1 OR t.strCODE LIKE ?1")
                    .setParameter(1, lg_CATEGORIE_AYANTDROIT_ID).getSingleResult();
        } catch (Exception e) {
        }
        return OTCategorieAyantdroit;
    }
    // fin recuperation de la categorie ayant droit

    // recuperation d'un risque
    public TRisque getTRisque(String lg_RISQUE_ID) {
        TRisque OTRisque = null;
        try {
            OTRisque = (TRisque) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRisque t WHERE t.lgRISQUEID LIKE ?1 OR t.strLIBELLERISQUE LIKE ?1 OR t.strCODERISQUE LIKE ?1")
                    .setParameter(1, lg_RISQUE_ID).getSingleResult();
        } catch (Exception e) {
        }
        return OTRisque;
    }
    // fin recuperation d'un risque

    // recuperation d'un ayant partant du nom et prenom de son parent
    public TAyantDroit getAyantDroitByNameClient(String str_FIRST_NAME, String str_LAST_NAME) {
        TAyantDroit OTAyantDroit = null;
        List<TAyantDroit> lst;
        try {
            lst = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TAyantDroit t WHERE t.strFIRSTNAME = ?1 AND t.strLASTNAME = ?2")
                    .setParameter(1, str_FIRST_NAME).setParameter(2, str_LAST_NAME).getResultList();

            if (lst.size() > 0) {
                this.refresh(lst.get(0));
                OTAyantDroit = lst.get(0);
            }
        } catch (Exception e) {
        }
        return OTAyantDroit;
    }

    public TAyantDroit getAyantDroit(String lg_AYANT_DROIT_ID) {
        TAyantDroit OTAyantDroit = null;

        try {
            OTAyantDroit = (TAyantDroit) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAyantDroit t WHERE (CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) = ?1 OR t.strCODEINTERNE = ?1 OR t.strNUMEROSECURITESOCIAL = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_AYANT_DROIT_ID).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();

        } catch (Exception e) {
        }
        return OTAyantDroit;
    }
    // fin recuperation d'un ayant partant du nom et prenom de son parent

    // liste des ayants droits d'un client
    public List<TAyantDroit> getListeAyantDroitByNameClient(String search_value, String lg_AYANTS_DROITS_ID,
            String lg_CLIENT_ID) {

        List<TAyantDroit> lst = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            } else {
            }
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAyantDroit t WHERE t.lgCLIENTID.lgCLIENTID LIKE ?1 and t.lgAYANTSDROITSID LIKE ?2 AND (t.strFIRSTNAME LIKE ?3 OR t.strLASTNAME LIKE ?3 OR t.strNUMEROSECURITESOCIAL LIKE ?3 OR t.strCODEINTERNE LIKE ?3) AND t.strSTATUT = ?4 ORDER BY t.strFIRSTNAME")
                    .setParameter(1, lg_CLIENT_ID).setParameter(2, lg_AYANTS_DROITS_ID)
                    .setParameter(3, search_value + "%").setParameter(4, commonparameter.statut_enable).getResultList();
            for (TAyantDroit tAyantDroit : lst) {
                this.refresh(tAyantDroit);
            }
        } catch (Exception e) {
        }
        return lst;
    }
    // fin liste des ayants droits d'un client

    public void updateAyantdroit(String lg_AYANTS_DROITS_ID, String lg_CLIENT_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String str_FIRST_NAME, String str_LAST_NAME, String str_SEXE, Date dt_NAISSANCE, String lg_VILLE_ID,
            String lg_RISQUE_ID, String str_NUMERO_SECURITE_SOCIAL, TClient client) {
        TAyantDroit OTAyantDroitOld = null;
        try {

            if (!str_NUMERO_SECURITE_SOCIAL.equals("")) {
                OTAyantDroitOld = this.getAyantDroit(str_NUMERO_SECURITE_SOCIAL);
            }
            TAyantDroit OTAyantDroit = this.getOdataManager().getEm().find(TAyantDroit.class, lg_AYANTS_DROITS_ID);
            if (OTAyantDroit == null) {
                OTAyantDroit = this.getOdataManager().getEm()
                        .createNamedQuery("TAyantDroit.findByStrNUMEROSECURITESOCIAL", TAyantDroit.class)
                        .setMaxResults(1).setParameter("strNUMEROSECURITESOCIAL", client.getStrNUMEROSECURITESOCIAL())
                        .getSingleResult();

            }
            // lg_VILLE_ID
            try {
                TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);

                OTAyantDroit.setLgVILLEID(OTVille);

            } catch (Exception e) {
            }

            // lg_CLIENT_ID
            TClient OTClient = new clientManagement(this.getOdataManager()).getClient(lg_CLIENT_ID);
            if (OTClient == null) {
                this.buildErrorTraceMessage("Echec de création. Client inexistant");
                return;
            }
            OTAyantDroit.setLgCLIENTID(OTClient);

            // lg_CATEGORIE_AYANTDROIT_ID
            TCategorieAyantdroit OTCategorieAyantdroit = this.getTCategorieAyantdroit(lg_CATEGORIE_AYANTDROIT_ID);
            if (OTCategorieAyantdroit != null) {
                OTAyantDroit.setLgCATEGORIEAYANTDROITID(OTCategorieAyantdroit);
            }

            // lg_RISQUE_ID
            TRisque OTRisque = this.getTRisque(lg_RISQUE_ID);
            if (OTRisque != null) {
                OTAyantDroit.setLgRISQUEID(OTRisque);
            }

            if (OTAyantDroitOld != null && !OTAyantDroitOld.equals(OTAyantDroit)) {
                this.buildErrorTraceMessage("Echec de mise à jour. Ce matricule est utilisé par "
                        + OTAyantDroitOld.getStrFIRSTNAME() + " " + OTAyantDroitOld.getStrLASTNAME());
                return;
            }

            OTAyantDroit.setStrFIRSTNAME(str_FIRST_NAME);
            OTAyantDroit.setStrLASTNAME(str_LAST_NAME);
            if (!"".equals(str_SEXE)) {
                OTAyantDroit.setStrSEXE(str_SEXE);
            }
            OTAyantDroit.setDtNAISSANCE(dt_NAISSANCE);
            OTAyantDroit.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            // OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
            OTAyantDroit.setDtUPDATED(new Date());

            this.merge(OTAyantDroit);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer un " + OtableTAyantDroit, e.getMessage());
        }

    }

    public void updateAyantDroit(String lg_AYANTS_DROITS_ID, String lg_CLIENT_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String str_FIRST_NAME, String str_LAST_NAME, String str_SEXE, Date dt_NAISSANCE, String lg_VILLE_ID,
            String lg_RISQUE_ID, String str_NUMERO_SECURITE_SOCIAL) {
        TAyantDroit OTAyantDroitOld = null;
        TClient OTClient;
        try {
            TAyantDroit OTAyantDroit = this.getOdataManager().getEm().find(TAyantDroit.class, lg_AYANTS_DROITS_ID);
            if (OTAyantDroit != null) {
                try {
                    OTAyantDroitOld = this.getOdataManager().getEm()
                            .createNamedQuery("TAyantDroit.findByStrNUMEROSECURITESOCIAL", TAyantDroit.class)
                            .setParameter("strNUMEROSECURITESOCIAL", str_NUMERO_SECURITE_SOCIAL).getSingleResult();

                } catch (Exception e) {
                }
                TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
                if (OTVille != null) {
                    OTAyantDroit.setLgVILLEID(OTVille);
                }
                this.getOdataManager().getEm().getTransaction().begin();
                try {
                    OTClient = this.getOdataManager().getEm()
                            .createNamedQuery("TClient.findByStrNUMEROSECURITESOCIAL", TClient.class)
                            .setParameter("strNUMEROSECURITESOCIAL", str_NUMERO_SECURITE_SOCIAL).getSingleResult();

                    if (OTClient != null) {
                        OTClient.setStrFIRSTNAME(str_FIRST_NAME);
                        OTClient.setStrLASTNAME(str_LAST_NAME);
                        this.getOdataManager().getEm().merge(OTClient);
                    }
                } catch (Exception e) {
                }

                // lg_CATEGORIE_AYANTDROIT_ID
                TCategorieAyantdroit OTCategorieAyantdroit = this.getTCategorieAyantdroit(lg_CATEGORIE_AYANTDROIT_ID);
                if (OTCategorieAyantdroit != null) {
                    OTAyantDroit.setLgCATEGORIEAYANTDROITID(OTCategorieAyantdroit);
                }

                // lg_RISQUE_ID
                TRisque OTRisque = this.getTRisque(lg_RISQUE_ID);
                if (OTRisque != null) {
                    OTAyantDroit.setLgRISQUEID(OTRisque);
                }

                if (OTAyantDroitOld != null && !OTAyantDroitOld.equals(OTAyantDroit)) {
                    this.buildErrorTraceMessage("Echec de mise à jour. Ce matricule est utilisé par "
                            + OTAyantDroitOld.getStrFIRSTNAME() + " " + OTAyantDroitOld.getStrLASTNAME());
                    return;
                }

                OTAyantDroit.setStrFIRSTNAME(str_FIRST_NAME);
                OTAyantDroit.setStrLASTNAME(str_LAST_NAME);
                if (!"".equals(str_SEXE)) {
                    OTAyantDroit.setStrSEXE(str_SEXE);
                }
                OTAyantDroit.setDtNAISSANCE(dt_NAISSANCE);
                OTAyantDroit.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
                // OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
                OTAyantDroit.setDtUPDATED(new Date());

                this.getOdataManager().getEm().merge(OTAyantDroit);
                this.getOdataManager().getEm().getTransaction().commit();
                this.getOdataManager().getEm().clear();

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Impossible de creer un " + OtableTAyantDroit);
            }
        } catch (Exception e) {
            this.getOdataManager().getEm().getTransaction().rollback();
            this.getOdataManager().getEm().clear();

            this.buildErrorTraceMessage("Impossible de creer un " + OtableTAyantDroit, e.getMessage());
        }

    }

    public TAyantDroit getPremierAyantDroit(String lgCLIENTID) {
        TAyantDroit OTAyantDroit = null;

        try {
            OTAyantDroit = this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TAyantDroit t WHERE t.lgCLIENTID.lgCLIENTID = ?1 ORDER BY t.dtCREATED ASC",
                            TAyantDroit.class)
                    .setParameter(1, lgCLIENTID).setFirstResult(0).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTAyantDroit;
    }

}
