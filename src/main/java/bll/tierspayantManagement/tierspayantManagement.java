/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.tierspayantManagement;

import bll.bllBase;
import bll.configManagement.clientManagement;
import bll.configManagement.compteClientManagement;
import bll.facture.factureManagement;
import bll.preenregistrement.Preenregistrement;
import dal.TAyantDroit;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TGroupeTierspayant;
import dal.TModelFacture;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TRegimeCaisse;
import dal.TRisque;
import dal.TSequencier;
import dal.TSnapshotPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TTypeClient;
import dal.TTypeContrat;
import dal.TTypeTiersPayant;
import dal.TUser;
import dal.TVille;
import dal.dataManager;
import java.util.Date;
import java.util.*;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class tierspayantManagement extends bllBase {

    Object Otable = TTiersPayant.class;

    public tierspayantManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public tierspayantManagement(dataManager OdataManager, TUser OTUser) {
        this.setOdataManager(OdataManager);
        this.setOTUser(OTUser);
        this.checkDatamanager();
    }

    public boolean create(String str_CODE_ORGANISME, String str_NAME, String str_FULLNAME, String str_ADRESSE,
            String str_MOBILE, String str_TELEPHONE, String str_MAIL, double dbl_PLAFOND_CREDIT,
            double dbl_TAUX_REMBOURSEMENT, String str_NUMERO_CAISSE_OFFICIEL, String str_CENTRE_PAYEUR,
            String str_CODE_REGROUPEMENT, double dbl_SEUIL_MINIMUM, boolean bool_INTERDICTION,
            String str_CODE_COMPTABLE, boolean bool_PRENUM_FACT_SUBROGATOIRE, int int_NUMERO_DECOMPTE,
            String str_CODE_PAIEMENT, int dt_DELAI_PAIEMENT, double dbl_POURCENTAGE_REMISE,
            double dbl_REMISE_FORFETAIRE, String str_CODE_EDIT_BORDEREAU, int int_NBRE_EXEMPLAIRE_BORD,
            int int_PERIODICITE_EDIT_BORD, int int_DATE_DERNIERE_EDITION, String str_NUMERO_IDF_ORGANISME,
            double dbl_MONTANT_F_CLIENT, double dbl_BASE_REMISE, String str_CODE_DOC_COMPTOIRE, boolean bool_ENABLED,
            String lg_VILLE_ID, String lg_TYPE_TIERS_PAYANT_ID, String lg_TYPE_CONTRAT_ID, String lg_REGIMECAISSE_ID,
            String lg_RISQUE_ID, double dbl_CAUTION, double dbl_QUOTA_CONSO_MENSUELLE, int dbl_SOLDE,
            boolean bool_IsACCOUNT, TSequencier OTSequencier, String str_REGISTRE_COMMERCE, String str_CODE_OFFICINE,
            String str_COMPTE_CONTRIBUABLE, boolean b_IsAbsolute, String lg_GROUPE_ID, int nbrbons, Integer montantFact,
            boolean groupingByTaux, boolean cmu, int caution) {
        boolean result = false;
        String str_PHOTO = "default.png";
        try {

            if (this.checkTiersPayantIsExitst(str_CODE_ORGANISME, lg_TYPE_TIERS_PAYANT_ID) != null) {
                this.buildErrorTraceMessage("Désolé! Un tiers payant utilise déjà ce code");
                return false;
            }

            TModelFacture OModelFacture = null;
            TTiersPayant OTTiersPayant = new TTiersPayant();
            compteClientManagement OcompteClientManagement = new compteClientManagement(this.getOdataManager());

            try {
                TGroupeTierspayant gr = (TGroupeTierspayant) this.getOdataManager().getEm()
                        .createNamedQuery("TGroupeTierspayant.findByStrLIBELLE")
                        .setParameter("strLIBELLE", lg_GROUPE_ID).getSingleResult();
                if (gr != null) {
                    OTTiersPayant.setLgGROUPEID(gr);
                }
            } catch (Exception e) {
            }

            OTTiersPayant.setIntMONTANTFAC(montantFact);
            OTTiersPayant.setIntNBREBONS(nbrbons);
            OTTiersPayant.setLgTIERSPAYANTID(this.getKey().getComplexId());
            OTTiersPayant.setStrCODEORGANISME(str_CODE_ORGANISME);
            OTTiersPayant.setStrNAME(str_NAME);
            OTTiersPayant.setStrCOMPTECONTRIBUABLE(str_COMPTE_CONTRIBUABLE);
            OTTiersPayant.setStrFULLNAME(str_FULLNAME);
            OTTiersPayant.setStrADRESSE(str_ADRESSE);
            OTTiersPayant.setStrMOBILE(str_MOBILE);
            OTTiersPayant.setStrTELEPHONE(str_TELEPHONE);
            OTTiersPayant.setStrMAIL(str_MAIL);
            OTTiersPayant.setDblPLAFONDCREDIT(dbl_PLAFOND_CREDIT);

            OTTiersPayant.setBIsAbsolute(b_IsAbsolute);
            OTTiersPayant.setBoolIsACCOUNT(bool_IsACCOUNT);
            OTTiersPayant.setDblTAUXREMBOURSEMENT(dbl_TAUX_REMBOURSEMENT);
            OTTiersPayant.setStrNUMEROCAISSEOFFICIEL(str_NUMERO_CAISSE_OFFICIEL);
            OTTiersPayant.setStrCENTREPAYEUR(str_CENTRE_PAYEUR);
            OTTiersPayant.setStrCODEREGROUPEMENT(str_CODE_REGROUPEMENT);
            OTTiersPayant.setDblSEUILMINIMUM(dbl_SEUIL_MINIMUM);
            OTTiersPayant.setBoolINTERDICTION(bool_INTERDICTION);
            OTTiersPayant.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
            OTTiersPayant.setBoolPRENUMFACTSUBROGATOIRE(bool_PRENUM_FACT_SUBROGATOIRE);
            OTTiersPayant.setIntNUMERODECOMPTE(int_NUMERO_DECOMPTE);
            OTTiersPayant.setStrCODEPAIEMENT(str_CODE_PAIEMENT);
            OTTiersPayant.setGroupingByTaux(groupingByTaux);
            OTTiersPayant.setDblPOURCENTAGEREMISE(dbl_POURCENTAGE_REMISE);
            OTTiersPayant.setDblREMISEFORFETAIRE(dbl_REMISE_FORFETAIRE);
            OTTiersPayant.setStrCODEEDITBORDEREAU(str_CODE_EDIT_BORDEREAU);
            OTTiersPayant.setIntNBREEXEMPLAIREBORD(int_NBRE_EXEMPLAIRE_BORD);
            OTTiersPayant.setIntPERIODICITEEDITBORD(int_PERIODICITE_EDIT_BORD);
            OTTiersPayant.setIntDATEDERNIEREEDITION(int_DATE_DERNIERE_EDITION);
            OTTiersPayant.setStrNUMEROIDFORGANISME(str_NUMERO_IDF_ORGANISME);
            OTTiersPayant.setDblMONTANTFCLIENT(dbl_MONTANT_F_CLIENT);
            OTTiersPayant.setDblBASEREMISE(dbl_BASE_REMISE);
            OTTiersPayant.setStrCODEDOCCOMPTOIRE(str_CODE_DOC_COMPTOIRE);
            OTTiersPayant.setBoolENABLED(bool_ENABLED);
            OTTiersPayant.setStrPHOTO(str_PHOTO);
            OTTiersPayant.setLgSEQUENCIERID(OTSequencier);
            OTTiersPayant.setStrCODEOFFICINE(str_CODE_OFFICINE);
            OTTiersPayant.setStrREGISTRECOMMERCE(str_REGISTRE_COMMERCE);

            OModelFacture = this.getModelFacture(str_CODE_EDIT_BORDEREAU);
            if (OModelFacture == null) {
                OModelFacture = this.getOdataManager().getEm().find(TModelFacture.class,
                        commonparameter.PROCESS_SUCCESS);
            }
            OTTiersPayant.setLgMODELFACTUREID(OModelFacture);
            TVille OTVille = this.getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                /*
                 * this.buildErrorTraceMessage("Impossible de creer un " + Otable, "Ref Ville : " + lg_VILLE_ID +
                 * "  Invalide "); return;
                 */
                OTTiersPayant.setLgVILLEID(OTVille);
            }

            TTypeTiersPayant OTTypeTiersPayant = this.getOdataManager().getEm().find(TTypeTiersPayant.class,
                    lg_TYPE_TIERS_PAYANT_ID);
            if (OTTypeTiersPayant != null) {
                /*
                 * this.buildErrorTraceMessage("Impossible de creer un " + Otable, " Ref TYPE_TIERS_PAYANT : " +
                 * lg_TYPE_TIERS_PAYANT_ID + "  Invalide "); return;
                 */
                OTTiersPayant.setLgTYPETIERSPAYANTID(OTTypeTiersPayant);
            }

            TTypeContrat OTTypeContrat = this.getOdataManager().getEm().find(TTypeContrat.class, lg_TYPE_CONTRAT_ID);
            if (OTTypeContrat != null) {
                /*
                 * this.buildErrorTraceMessage("Impossible de creer un " + Otable, "Ref lg_TYPE_CONTRAT_ID : " +
                 * lg_TYPE_CONTRAT_ID + "  Invalide "); return;
                 */
                OTTiersPayant.setLgTYPECONTRATID(OTTypeContrat);
            }

            TRegimeCaisse OTRegimeCaisse = this.getOdataManager().getEm().find(TRegimeCaisse.class, lg_REGIMECAISSE_ID);
            if (OTRegimeCaisse != null) {
                /*
                 * this.buildErrorTraceMessage("Impossible de creer un " + Otable, "Ref lg_REGIMECAISSE_ID : " +
                 * lg_REGIMECAISSE_ID + "  Invalide "); return;
                 */
                OTTiersPayant.setLgREGIMECAISSEID(OTRegimeCaisse);
            }

            TRisque OTRisque = this.getOdataManager().getEm().find(TRisque.class, lg_RISQUE_ID);
            if (OTRisque != null) {
                /*
                 * this.buildErrorTraceMessage("Impossible de creer un " + Otable, "Ref Grossiste : " + lg_RISQUE_ID +
                 * "  Invalide "); return;
                 */
                OTTiersPayant.setLgRISQUEID(OTRisque);
            }

            OTTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTTiersPayant.setDtCREATED(new Date());

            if (this.persiste(OTTiersPayant)) {
                if (OcompteClientManagement.createCompteClient("", dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dbl_SOLDE,
                        commonparameter.clt_TIERSPAYANT, OTTiersPayant.getLgTIERSPAYANTID()) != null) {
                    result = true;
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    this.do_event_log(this.getOdataManager(), "",
                            "Création du Tiers-payant " + OTTiersPayant.getStrFULLNAME(),
                            this.getOTUser().getStrFIRSTNAME(), commonparameter.statut_enable, "t_tiers_payant",
                            "t_tiers_payant", "Mouvement Tiers-payant", this.getOTUser().getLgUSERID());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de créer l'organisme");
        }
        return result;
    }

    public void update(String lg_TIERS_PAYANT_ID, String str_CODE_ORGANISME, String str_NAME, String str_FULLNAME,
            String str_ADRESSE, String str_MOBILE, String str_TELEPHONE, String str_MAIL, double dbl_PLAFOND_CREDIT,
            double dbl_TAUX_REMBOURSEMENT, String str_NUMERO_CAISSE_OFFICIEL, String str_CENTRE_PAYEUR,
            String str_CODE_REGROUPEMENT, double dbl_SEUIL_MINIMUM, boolean bool_INTERDICTION,
            String str_CODE_COMPTABLE, boolean bool_PRENUM_FACT_SUBROGATOIRE, int int_NUMERO_DECOMPTE,
            String str_CODE_PAIEMENT, int dt_DELAI_PAIEMENT, double dbl_POURCENTAGE_REMISE,
            double dbl_REMISE_FORFETAIRE, String str_CODE_EDIT_BORDEREAU, int int_NBRE_EXEMPLAIRE_BORD,
            int int_PERIODICITE_EDIT_BORD, int int_DATE_DERNIERE_EDITION, String str_NUMERO_IDF_ORGANISME,
            double dbl_MONTANT_F_CLIENT, double dbl_BASE_REMISE, String str_CODE_DOC_COMPTOIRE, boolean bool_ENABLED,
            String lg_VILLE_ID, String lg_TYPE_TIERS_PAYANT_ID, String lg_TYPE_CONTRAT_ID, String lg_REGIMECAISSE_ID,
            String lg_RISQUE_ID, String str_CODE_OFFICINE, String str_REGISTRE_COMMERCE, String str_COMPTE_CONTRIBUABLE,
            double dbl_QUOTA_CONSO_MENSUELLE, boolean b_IsAbsolute, String lg_GROUPE_ID, int nbrbons,
            Integer montantFact, boolean groupingByTaux, boolean cmu, int caution) {
        TTiersPayant OTTiersPayant = null, OTTiersPayantOld = null;
        TCompteClient OTCompteClient = null;
        try {

            OTTiersPayant = this.getTTiersPayant(lg_TIERS_PAYANT_ID);
            OTCompteClient = new compteClientManagement(this.getOdataManager()).getTCompteClient(lg_TIERS_PAYANT_ID);
            if (OTTiersPayant == null && OTCompteClient == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Tiers payant inexisant.");
                return;
            }

            if (OTTiersPayantOld != null && !OTTiersPayant.equals(OTTiersPayantOld)) {
                this.buildErrorTraceMessage(
                        "Désolé ce code est déjà utilisé par le tiers payant " + OTTiersPayant.getStrFULLNAME());
                return;
            }

            try {

                // lg_VILLE_ID
                dal.TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
                if (OTVille != null) {
                    OTTiersPayant.setLgVILLEID(OTVille);
                    new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
                }

                // lg_TYPE_TIERS_PAYANT_ID
                dal.TTypeTiersPayant OTTypeTiersPayant = getOdataManager().getEm().find(dal.TTypeTiersPayant.class,
                        lg_TYPE_TIERS_PAYANT_ID);
                if (OTTypeTiersPayant != null) {
                    OTTiersPayant.setLgTYPETIERSPAYANTID(OTTypeTiersPayant);
                    new logger().oCategory.info("lg_TYPE_TIERS_PAYANT_ID     Create   " + lg_TYPE_TIERS_PAYANT_ID);
                }

                // lg_TYPE_CONTRAT_ID
                dal.TTypeContrat OTTypeContrat = getOdataManager().getEm().find(dal.TTypeContrat.class,
                        lg_TYPE_CONTRAT_ID);
                if (OTTypeContrat != null) {
                    OTTiersPayant.setLgTYPECONTRATID(OTTypeContrat);
                    new logger().oCategory.info("lg_TYPE_CONTRAT_ID  Create   " + lg_TYPE_CONTRAT_ID);
                }

                // lg_REGIMECAISSE_ID
                dal.TRegimeCaisse OTRegimeCaisse = getOdataManager().getEm().find(dal.TRegimeCaisse.class,
                        lg_REGIMECAISSE_ID);
                if (OTRegimeCaisse != null) {
                    OTTiersPayant.setLgREGIMECAISSEID(OTRegimeCaisse);
                    new logger().oCategory.info("lg_REGIMECAISSE_ID  Create   " + lg_REGIMECAISSE_ID);
                }

                // lg_RISQUE_ID
                dal.TRisque OTRisque = getOdataManager().getEm().find(dal.TRisque.class, lg_RISQUE_ID);
                if (OTRisque != null) {
                    OTTiersPayant.setLgRISQUEID(OTRisque);
                    new logger().oCategory.info("lg_RISQUE_ID  Create   " + lg_RISQUE_ID);
                }

            } catch (Exception e) {

                new logger().oCategory.info("Impossible de mettre a jour les donnees vennant des cles etrangers   ");
            }
            try {
                TGroupeTierspayant gr = (TGroupeTierspayant) this.getOdataManager().getEm()
                        .createNamedQuery("TGroupeTierspayant.findByStrLIBELLE")
                        .setParameter("strLIBELLE", lg_GROUPE_ID).getSingleResult();
                if (gr != null) {
                    OTTiersPayant.setLgGROUPEID(gr);
                }
            } catch (Exception e) {
            }

            OTTiersPayant.setIntMONTANTFAC(montantFact);
            OTTiersPayant.setIntNBREBONS(nbrbons);
            OTTiersPayant.setStrCODEORGANISME(str_CODE_ORGANISME);
            OTTiersPayant.setStrNAME(str_NAME);
            OTTiersPayant.setStrFULLNAME(str_FULLNAME);
            OTTiersPayant.setStrADRESSE(str_ADRESSE);
            OTTiersPayant.setStrMOBILE(str_MOBILE);
            OTTiersPayant.setStrTELEPHONE(str_TELEPHONE);
            OTTiersPayant.setStrMAIL(str_MAIL);
            OTTiersPayant.setStrCOMPTECONTRIBUABLE(str_COMPTE_CONTRIBUABLE);
            OTTiersPayant.setStrCODEOFFICINE(str_CODE_OFFICINE);
            OTTiersPayant.setStrREGISTRECOMMERCE(str_REGISTRE_COMMERCE);
            if (OTTiersPayant.getDblPLAFONDCREDIT() > 0
                    && OTTiersPayant.getDbCONSOMMATIONMENSUELLE() > dbl_PLAFOND_CREDIT) {
                this.buildErrorTraceMessage(
                        "Echec de mise à jour. La consommation en cours est supérieure au plafond.");
                return;
            }
            OTTiersPayant.setDblPLAFONDCREDIT(dbl_PLAFOND_CREDIT);
            OTTiersPayant.setBIsAbsolute(b_IsAbsolute);

            OTTiersPayant.setDblTAUXREMBOURSEMENT(dbl_TAUX_REMBOURSEMENT);
            OTTiersPayant.setStrNUMEROCAISSEOFFICIEL(str_NUMERO_CAISSE_OFFICIEL);
            OTTiersPayant.setStrCENTREPAYEUR(str_CENTRE_PAYEUR);
            OTTiersPayant.setStrCODEREGROUPEMENT(str_CODE_REGROUPEMENT);
            OTTiersPayant.setDblSEUILMINIMUM(dbl_SEUIL_MINIMUM);
            OTTiersPayant.setBoolINTERDICTION(bool_INTERDICTION);
            OTTiersPayant.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
            OTTiersPayant.setBoolPRENUMFACTSUBROGATOIRE(bool_PRENUM_FACT_SUBROGATOIRE);
            OTTiersPayant.setIntNUMERODECOMPTE(int_NUMERO_DECOMPTE);
            OTTiersPayant.setStrCODEPAIEMENT(str_CODE_COMPTABLE);
            OTTiersPayant.setDtDELAIPAIEMENT(dt_DELAI_PAIEMENT);
            OTTiersPayant.setDblPOURCENTAGEREMISE(dbl_POURCENTAGE_REMISE);
            OTTiersPayant.setDblREMISEFORFETAIRE(dbl_REMISE_FORFETAIRE);
            OTTiersPayant.setStrCODEEDITBORDEREAU(str_CODE_EDIT_BORDEREAU);
            TModelFacture OTModelFacture = this.getModelFacture(str_CODE_EDIT_BORDEREAU);
            if (OTModelFacture != null) {
                OTTiersPayant.setLgMODELFACTUREID(OTModelFacture);
            }

            OTTiersPayant.setIntNBREEXEMPLAIREBORD(int_NBRE_EXEMPLAIRE_BORD);
            OTTiersPayant.setIntPERIODICITEEDITBORD(int_PERIODICITE_EDIT_BORD);
            OTTiersPayant.setIntDATEDERNIEREEDITION(int_DATE_DERNIERE_EDITION);
            OTTiersPayant.setStrNUMEROIDFORGANISME(str_NUMERO_IDF_ORGANISME);
            OTTiersPayant.setDblMONTANTFCLIENT(dbl_MONTANT_F_CLIENT);
            OTTiersPayant.setDblBASEREMISE(dbl_BASE_REMISE);
            OTTiersPayant.setStrCODEDOCCOMPTOIRE(str_CODE_DOC_COMPTOIRE);
            OTTiersPayant.setBoolENABLED(bool_ENABLED);
            OTTiersPayant.setGroupingByTaux(groupingByTaux);
            OTTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTTiersPayant.setDtUPDATED(new Date());

            if (OTCompteClient.getDblQUOTACONSOMENSUELLE() > dbl_QUOTA_CONSO_MENSUELLE) {
                this.buildErrorTraceMessage(
                        "Impossible de modifier le plafond. Etat du plafond supérieur au nouveau plafond.");
                return;
            }

            OTCompteClient.setDblPLAFOND(dbl_QUOTA_CONSO_MENSUELLE);
            OTCompteClient.setDtUPDATED(OTTiersPayant.getDtUPDATED());
            this.getOdataManager().getEm().merge(OTCompteClient);

            this.merge(OTTiersPayant);
            this.do_event_log(this.getOdataManager(), "",
                    "Modification du Tiers-payant " + OTTiersPayant.getStrFULLNAME(),
                    this.getOTUser().getStrFIRSTNAME(), commonparameter.statut_enable, "t_tiers_payant",
                    "t_tiers_payant", "Mouvement Tiers-payant", this.getOTUser().getLgUSERID());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mettre à jour  " + Otable, e.getMessage());
        }

    }

    public void updatePhotoTiersPayant(String lg_TIERS_PAYANT_ID, String str_PHOTO) {

        try {

            TTiersPayant OTTiersPayant = getOdataManager().getEm().find(TTiersPayant.class, lg_TIERS_PAYANT_ID);
            OTTiersPayant.setStrPHOTO(str_PHOTO);

            OTTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTTiersPayant.setDtUPDATED(new Date());

            this.persiste(OTTiersPayant);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de mettre à jour  " + Otable, e.getMessage());
        }

    }

    public boolean deleteTierspayant(String lg_TIERS_PAYANT_ID) {
        boolean result = false;
        try {

            TTiersPayant OTTiersPayant = this.getTTiersPayant(lg_TIERS_PAYANT_ID);
            if (this.delete(OTTiersPayant)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage(
                        "Echec de suppression d'un tiers payant qui a déjà subit une action dans le système");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du tiers payant sélectionné");
        }
        return result;
    }

    public List<TTiersPayant> getAllTiersPayant() {

        List<dal.TTiersPayant> lstTTiersPayant = null;

        try {

            lstTTiersPayant = getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE  t.strSTATUT LIKE ?1 ")
                    .setParameter(1, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info(lstTTiersPayant.size());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.buildSuccesTraceMessage("TiersPayant(s) Existant(s)   :: " + lstTTiersPayant);
            return lstTTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("TiersPayant Inexistant ", e.getMessage());
            return lstTTiersPayant;
        }

    }

    public List<TTiersPayant> getTiersPayantByType(String lg_TYPE_TIERS_PAYANT_ID) {

        List<dal.TTiersPayant> lstTTiersPayant = null;

        try {

            lstTTiersPayant = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.lgTIERSPAYANTID LIKE ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, "%" + lg_TYPE_TIERS_PAYANT_ID + "%").setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            new logger().OCategory.info(lstTTiersPayant.size());

            for (TTiersPayant lstTTiersPayant1 : lstTTiersPayant) {
                this.refresh(lstTTiersPayant1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTTiersPayant);
            return lstTTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTTiersPayant;
        }

    }

    public List<TTiersPayant> getTiersPayantByTypeContrat(String lg_TYPE_CONTRAT_ID) {

        List<dal.TTiersPayant> lstTTiersPayant = null;

        try {

            lstTTiersPayant = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.lgTYPECONTRATID = ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, lg_TYPE_CONTRAT_ID).setParameter(2, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info(lstTTiersPayant.size());

            for (TTiersPayant lstTTiersPayant1 : lstTTiersPayant) {
                this.refresh(lstTTiersPayant1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTTiersPayant);
            return lstTTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTTiersPayant;
        }

    }

    public List<TTiersPayant> getTiersPayantByCodeTP(String str_CODE_ORGANISME) {

        List<dal.TTiersPayant> lstTTiersPayant = null;

        try {

            lstTTiersPayant = this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TTiersPayant t WHERE t.strCODEORGANISME LIKE ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, "%" + str_CODE_ORGANISME + "%").setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            new logger().OCategory.info(lstTTiersPayant.size());

            for (TTiersPayant lstTTiersPayant1 : lstTTiersPayant) {
                this.refresh(lstTTiersPayant1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTTiersPayant);
            return lstTTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTTiersPayant;
        }

    }

    public List<TTiersPayant> getTiersPayantByNomAbrege(String str_NAME) {

        List<dal.TTiersPayant> lstTTiersPayant = null;

        try {

            lstTTiersPayant = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.strNAME = ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, "%" + str_NAME + "%").setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            new logger().OCategory.info(lstTTiersPayant.size());

            for (TTiersPayant lstTTiersPayant1 : lstTTiersPayant) {
                this.refresh(lstTTiersPayant1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTTiersPayant);
            return lstTTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTTiersPayant;
        }

    }

    public List<TTiersPayant> getTiersPayantByNomComplet(String str_FULLNAME) {

        List<dal.TTiersPayant> lstTTiersPayant = null;

        try {

            lstTTiersPayant = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.strFULLNAME = ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, "%" + str_FULLNAME + "%").setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            new logger().OCategory.info(lstTTiersPayant.size());

            for (TTiersPayant lstTTiersPayant1 : lstTTiersPayant) {
                this.refresh(lstTTiersPayant1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTTiersPayant);
            return lstTTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTTiersPayant;
        }

    }

    // String str_CODE_ORGANISME,, String str_MOBILE
    public TTiersPayant createTTiersPayant(String str_NAME, String str_FULLNAME, String str_CODE_ORGANISME,
            String str_ADRESSE, String str_MAIL, String str_TELEPHONE, String lg_VILLE_ID, double dbl_PLAFOND_CREDIT,
            double dbl_TAUX_REMBOURSEMENT, double dbl_POURCENTAGE_REMISE, double dbl_REMISE_FORFETAIRE,
            String lg_TYPE_TIERS_PAYANT_ID, String lg_REGIMECAISSE_ID, String lg_RISQUE_ID,
            String lg_TYPE_CONTRAT_ID/*
                                      * , String str_NUMERO_CAISSE_OFFICIEL, String str_CENTRE_PAYEUR, double
                                      * dbl_SEUIL_MINIMUM,String str_CODE_REGROUPEMENT, boolean bool_INTERDICTION,
                                      * String str_CODE_COMPTABLE, boolean bool_PRENUM_FACT_SUBROGATOIRE, int
                                      * int_NUMERO_DECOMPTE, String str_CODE_PAIEMENT, Date dt_DELAI_PAIEMENT, String
                                      * str_CODE_EDIT_BORDEREAU, int int_NBRE_EXEMPLAIRE_BORD, int
                                      * int_PERIODICITE_EDIT_BORD, Date int_DATE_DERNIERE_EDITION, String
                                      * str_NUMERO_IDF_ORGANISME, double dbl_MONTANT_F_CLIENT, double dbl_BASE_REMISE,
                                      * String str_CODE_DOC_COMPTOIRE, boolean bool_ENABLED
                                      */
    ) {

        TTiersPayant OTTiersPayant = null;
        try {

            OTTiersPayant = new TTiersPayant();

            OTTiersPayant.setLgTIERSPAYANTID(this.getKey().getComplexId());
            OTTiersPayant.setStrCODEORGANISME(str_CODE_ORGANISME);
            OTTiersPayant.setStrNAME(str_NAME);
            OTTiersPayant.setStrFULLNAME(str_FULLNAME);
            OTTiersPayant.setStrADRESSE(str_ADRESSE);
            // OTTiersPayant.setStrMOBILE(str_MOBILE);
            OTTiersPayant.setStrTELEPHONE(str_TELEPHONE);
            OTTiersPayant.setStrMAIL(str_MAIL);
            OTTiersPayant.setDblPLAFONDCREDIT(dbl_PLAFOND_CREDIT);
            OTTiersPayant.setDblTAUXREMBOURSEMENT(dbl_TAUX_REMBOURSEMENT);
            OTTiersPayant.setDblPOURCENTAGEREMISE(dbl_POURCENTAGE_REMISE);
            OTTiersPayant.setDblREMISEFORFETAIRE(dbl_REMISE_FORFETAIRE);
            /*
             * OTTiersPayant.setStrNUMEROCAISSEOFFICIEL(str_NUMERO_CAISSE_OFFICIEL);
             * OTTiersPayant.setStrCENTREPAYEUR(str_CENTRE_PAYEUR);
             * OTTiersPayant.setStrCODEREGROUPEMENT(str_CODE_REGROUPEMENT);
             * OTTiersPayant.setDblSEUILMINIMUM(dbl_SEUIL_MINIMUM);
             * OTTiersPayant.setBoolINTERDICTION(bool_INTERDICTION);
             * OTTiersPayant.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
             * OTTiersPayant.setBoolPRENUMFACTSUBROGATOIRE(bool_PRENUM_FACT_SUBROGATOIRE);
             * OTTiersPayant.setIntNUMERODECOMPTE(int_NUMERO_DECOMPTE);
             * OTTiersPayant.setStrCODEPAIEMENT(str_CODE_COMPTABLE);
             * OTTiersPayant.setDtDELAIPAIEMENT(dt_DELAI_PAIEMENT);
             *
             * OTTiersPayant.setStrCODEEDITBORDEREAU(str_CODE_EDIT_BORDEREAU);
             * OTTiersPayant.setIntNBREEXEMPLAIREBORD(int_NBRE_EXEMPLAIRE_BORD);
             * OTTiersPayant.setIntPERIODICITEEDITBORD(int_PERIODICITE_EDIT_BORD);
             * OTTiersPayant.setDtDERNIEREEDITION(int_DATE_DERNIERE_EDITION);
             * OTTiersPayant.setStrNUMEROIDFORGANISME(str_NUMERO_IDF_ORGANISME);
             * OTTiersPayant.setDblMONTANTFCLIENT(dbl_MONTANT_F_CLIENT);
             * OTTiersPayant.setDblBASEREMISE(dbl_BASE_REMISE);
             * OTTiersPayant.setStrCODEDOCCOMPTOIRE(str_CODE_DOC_COMPTOIRE); OTTiersPayant.setBoolENABLED(bool_ENABLED);
             */

            TVille OTVille = this.getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        "Ref Ville : " + lg_VILLE_ID + "  Invalide ");
                return null;
            }
            OTTiersPayant.setLgVILLEID(OTVille);
            new logger().OCategory.info("Ville OK ID = " + OTVille.getLgVILLEID());

            TTypeTiersPayant OTTypeTiersPayant = this.getOdataManager().getEm().find(TTypeTiersPayant.class,
                    lg_TYPE_TIERS_PAYANT_ID);
            if (OTTypeTiersPayant == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        " Ref TYPE_TIERS_PAYANT : " + lg_TYPE_TIERS_PAYANT_ID + "  Invalide ");
                return null;
            }
            OTTiersPayant.setLgTYPETIERSPAYANTID(OTTypeTiersPayant);

            TTypeContrat OTTypeContrat = this.getOdataManager().getEm().find(TTypeContrat.class, lg_TYPE_CONTRAT_ID);
            if (OTTypeContrat == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        "Ref Grossiste : " + lg_TYPE_CONTRAT_ID + "  Invalide ");
                return null;
            }
            OTTiersPayant.setLgTYPECONTRATID(OTTypeContrat);

            TRegimeCaisse OTRegimeCaisse = this.getOdataManager().getEm().find(TRegimeCaisse.class, lg_REGIMECAISSE_ID);
            if (OTRegimeCaisse == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        "Ref Grossiste : " + lg_REGIMECAISSE_ID + "  Invalide ");
                return null;
            }
            OTTiersPayant.setLgREGIMECAISSEID(OTRegimeCaisse);

            TRisque OTRisque = this.getOdataManager().getEm().find(TRisque.class, lg_RISQUE_ID);
            if (OTRisque == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        "Ref Grossiste : " + lg_RISQUE_ID + "  Invalide ");
                return null;
            }
            OTTiersPayant.setLgRISQUEID(OTRisque);

            OTTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTTiersPayant.setDtCREATED(new Date());

            this.persiste(OTTiersPayant);
            this.refresh(OTTiersPayant);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            return OTTiersPayant;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

        return OTTiersPayant;

    }

    private Integer GetintTotalPercentageCustTP(String lg_COMPTE_CLIENT_ID) {
        List<dal.TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();
        int int_sum_percentage = 0;
        try {

            lstTCompteClientTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?1    AND t.strSTATUT LIKE ?3")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(3, commonparameter.statut_enable)
                    .getResultList();

            for (int i = 0; i < lstTCompteClientTiersPayant.size(); i++) {

                int_sum_percentage = int_sum_percentage + lstTCompteClientTiersPayant.get(i).getIntPOURCENTAGE();
                new logger().OCategory.info("*** int_sum_percentage *** " + int_sum_percentage);
            }
        } catch (Exception e) {
            new logger().OCategory.info("Error Loading data  " + e.toString());
        }

        return int_sum_percentage;
    }

    public boolean CheckPercentageLimit(int int_sum_percentage) {
        int int_limite_percentage = 100;
        boolean result = true;
        if (int_limite_percentage > int_sum_percentage) {
            result = false;
            return result;
        }
        return result;
    }

    // Karno
    public TCompteClientTiersPayant create_compteclt_tierspayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID,
            int int_POURCENTAGE, int int_PRIORITY, double dbl_PLAFOND, double dbl_QUOTA_CONSO_VENTE,
            String str_NUMERO_SECURITE_SOCIAL, Integer dbPLAFONDENCOURS, boolean b_IsAbsolute) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        try {
            TTiersPayant OTTiersPayant = this.getTTiersPayant(lg_TIERS_PAYANT_ID);
            TCompteClient OTCompteClient = new clientManagement(this.getOdataManager())
                    .getTCompteClient(lg_COMPTE_CLIENT_ID);

            if (OTTiersPayant != null && OTCompteClient != null) {
                if (!this.isTiersPayantExistForCptltTiersP(OTCompteClient.getLgCOMPTECLIENTID(),
                        OTTiersPayant.getLgTIERSPAYANTID())) {
                    if (!this.isRegimeExistForCptltTiersP(OTCompteClient.getLgCOMPTECLIENTID(), int_PRIORITY)) {
                        OTCompteClientTiersPayant = this.createTCompteClientTiersPayant(OTCompteClient, OTTiersPayant,
                                int_POURCENTAGE, int_PRIORITY, dbl_PLAFOND, dbl_QUOTA_CONSO_VENTE,
                                str_NUMERO_SECURITE_SOCIAL, dbPLAFONDENCOURS, b_IsAbsolute);

                    }
                }
            } else {
                this.buildErrorTraceMessage("Echec d'ajout de ce tiers payant au client séléctionné");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout de ce tiers payant au client séléctionné");
        }

        return OTCompteClientTiersPayant;
    }

    // SUPPRESSION
    public void delete_compteclt_tierspayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<TCompteClientTiersPayant>();
        try {

            new logger().OCategory.info(" ID Compte Client " + lg_COMPTE_CLIENT_ID);
            new logger().OCategory.info(" ID Tiers Payant " + lg_TIERS_PAYANT_ID);
            lstTCompteClientTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?1 AND t.lgTIERSPAYANTID.lgTIERSPAYANTID = ?2")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(2, lg_TIERS_PAYANT_ID).getResultList();

            for (TCompteClientTiersPayant OTCompteClientTiersPayant : lstTCompteClientTiersPayant) {
                this.refresh(OTCompteClientTiersPayant);
                this.delete(OTCompteClientTiersPayant);
            }

            // OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_delete);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer un tiers payant ayant un compte client");
        }

    }

    // fin karno
    public void delete_compteclt_tierspayant(String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<TCompteClientTiersPayant>();
        int i = 0;
        try {

            lstTCompteClientTiersPayant = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTTIERSPAYANTID = ?1")
                    .setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID).getResultList();

            for (TCompteClientTiersPayant OTCompteClientTiersPayant : lstTCompteClientTiersPayant) {
                this.refresh(OTCompteClientTiersPayant);
                if (this.delete(OTCompteClientTiersPayant)) {
                    i++;
                }
            }

            if (lstTCompteClientTiersPayant.size() == i) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage(
                        "Le client sélectionné a déjà effectué des transactions avec ce tiers payant");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer ce tiers payant associé au client courant");
        }

    }

    // mise a jour tiers payant compte client
    public boolean updateComptecltTierspayant(String lg_COMPTE_CLIENT_TIERS_PAYANT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID, int int_POURCENTAGE, int int_PRIORITY, double dbl_PLAFOND,
            double dbl_QUOTA_CONSO_VENTE, String str_NUMERO_SECURITE_SOCIAL, Integer db_PLAFOND_ENCOURS,
            boolean modeupdate, boolean isUbsolut) {
        boolean result = false;
        try {

            TCompteClientTiersPayant OTCompteClientTiersPayant = this.getOdataManager().getEm()
                    .find(TCompteClientTiersPayant.class, lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
            new logger().OCategory.info("Dans updateComptecltTierspayant lg_COMPTE_CLIENT_TIERS_PAYANT_ID  "
                    + OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID());

            if (modeupdate) {
                if (db_PLAFOND_ENCOURS != null) {
                    if (OTCompteClientTiersPayant.getDbCONSOMMATIONMENSUELLE() > db_PLAFOND_ENCOURS
                            && db_PLAFOND_ENCOURS > 0) {
                        this.buildErrorTraceMessage(
                                "Impossible de modifier le plafond. Etat du plafond supérieur au nouveau plafond.");
                        return result;
                    }
                    OTCompteClientTiersPayant.setDbPLAFONDENCOURS(db_PLAFOND_ENCOURS);

                }
                OTCompteClientTiersPayant.setDblPLAFOND(dbl_PLAFOND);
                OTCompteClientTiersPayant.setBIsAbsolute(isUbsolut);
            }
            OTCompteClientTiersPayant.setIntPOURCENTAGE(int_POURCENTAGE);

            OTCompteClientTiersPayant.setDblQUOTACONSOVENTE(dbl_QUOTA_CONSO_VENTE);
            OTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            System.out.println("-------------------------------------------  "
                    + OTCompteClientTiersPayant.getStrNUMEROSECURITESOCIAL());

            // OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClientTiersPayant.setDtUPDATED(new Date());

            TCompteClient OCompteClient = new clientManagement(this.getOdataManager())
                    .getTCompteClient(lg_COMPTE_CLIENT_ID);
            TTiersPayant OTTiersPayant = this.getTTiersPayant(lg_TIERS_PAYANT_ID);
            new logger().OCategory.info("Client " + OCompteClient.getLgCLIENTID().getStrFIRSTNAME() + " tiers payant "
                    + OTTiersPayant.getStrFULLNAME());

            try {
                TCompteClientTiersPayant OTCompteClientTiersPayantBis = this.isRegimeExistForCptltTiersPBis(
                        OCompteClient.getLgCOMPTECLIENTID(), int_PRIORITY, commonparameter.statut_enable);
                new logger().OCategory.info(
                        "tiers payant trouvé " + OTCompteClientTiersPayantBis.getLgTIERSPAYANTID().getStrFULLNAME());
                if (OTCompteClientTiersPayantBis.getLgTIERSPAYANTID() != OTTiersPayant) {
                    OTCompteClientTiersPayant.setIntPRIORITY(OTCompteClientTiersPayantBis.getIntPRIORITY());
                    OTCompteClientTiersPayantBis.setIntPRIORITY(int_PRIORITY);
                    // OTCompteClientTiersPayantBis.setDblPLAFOND(dbl_PLAFOND);
                    OTCompteClientTiersPayantBis.setDtUPDATED(new Date());
                    this.merge(OTCompteClientTiersPayantBis);
                    result = true;
                    // this.buildErrorTraceMessage("Désolé! Un autre tiers payant a déjà le régime séléctionné pour le
                    // client");
                } else {
                    OTCompteClientTiersPayant.setIntPRIORITY(int_PRIORITY);
                    result = true;
                }

            } catch (Exception e) {
                e.printStackTrace();
                new logger().OCategory.info("Dans le catch de l'appel de isRegimeExistForCptltTiersPBis");
                OTCompteClientTiersPayant.setIntPRIORITY(int_PRIORITY);
                result = true;
            }
            OTCompteClientTiersPayant.setLgTIERSPAYANTID(OTTiersPayant);

            if (result) {
                this.merge(OTCompteClientTiersPayant);
                if (OTCompteClientTiersPayant.getIntPRIORITY() == 1) {

                    TClient client = OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID();
                    client.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
                    System.out.println("client  " + client.getStrNUMEROSECURITESOCIAL());
                    this.merge(client);
                }
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mettre a jour ce tiers payant associé au client courant");
        }
        return result;
    }
    // fin mise a jour tiers payant compte client

    // gestion de l'edition et de la facturation des tiers payants
    public List<TPreenregistrementCompteClientTiersPayent> getAllPreenregistrement(String search_value) {
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();
        try {
            lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strNAME LIKE ?1")
                    .setParameter(1, search_value).getResultList();
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                this.refresh(OTPreenregistrementCompteClientTiersPayent);
                new logger().OCategory.info("Reference vente "
                        + OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getStrREF() + " Client "
                        + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                        + " "
                        + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME()
                        + " Tiers payant " + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgTIERSPAYANTID().getStrNAME());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTPreenregistrementCompteClientTiersPayent;
    }

    // Liste des transactions par date par compte,et type de compte
    public List<TPreenregistrementCompteClientTiersPayent> listTransactionByClientPerDateAndByTierspayant(
            String search_value, String dt_DEBUT, String dt_FIN, String lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
            String str_STATUT) {

        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        Date dtFin;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
                dt_DEBUT = "2015-04-20";
                new logger().OCategory.info("dt_DEBUT:" + dt_DEBUT);
            }
            if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
                dtFin = new Date();
            } else {
                dtFin = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            }
            Date dtDEBUT = this.getKey().stringToDate(dt_DEBUT, this.getKey().formatterMysqlShort);
            new logger().OCategory.info("dtDEBUT   " + dtDEBUT + " dtFin " + dtFin);

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTransactionByClientPerDateAndByTierspayant lg_COMPTE_CLIENT_TIERS_PAYANT_ID :"
                    + lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
            lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID LIKE ?1 AND t.strSTATUT = ?2 AND (t.dtCREATED BETWEEN ?3 AND ?4) AND (t.lgPREENREGISTREMENTID.strREF LIKE ?5 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?6 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME LIKE ?7) ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID).setParameter(2, str_STATUT)
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(5, "%" + search_value + "%")
                    .setParameter(6, "%" + search_value + "%").setParameter(7, "%" + search_value + "%")
                    .getResultList();
            new logger().OCategory.info("Taille liste " + lstTPreenregistrementCompteClientTiersPayent.size());
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                this.refresh(OTPreenregistrementCompteClientTiersPayent);
                new logger().OCategory.info("Reference vente "
                        + OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getStrREF() + " Client "
                        + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                        + " "
                        + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME()
                        + " Tiers payant " + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgTIERSPAYANTID().getStrNAME());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTPreenregistrementCompteClientTiersPayent;
    }
    // fin Liste des transactions par date et par compte
    // fin gestion de l'edition et de la facturation des tiers payants

    // fonction snap shot vente
    public boolean createsnapshotVente(String lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int int_MONTANT) {
        boolean result = false;
        TSnapshotPreenregistrementCompteClientTiersPayent OTSnapshotPreenregistrementCompteClientTiersPayent = null;
        try {
            OTSnapshotPreenregistrementCompteClientTiersPayent = (TSnapshotPreenregistrementCompteClientTiersPayent) this
                    .getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID)
                    .setParameter(2, commonparameter.statut_is_Waiting).getSingleResult();
            new logger().OCategory.info("Ref id "
                    + OTSnapshotPreenregistrementCompteClientTiersPayent
                            .getLgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID()
                    + " Solde " + OTSnapshotPreenregistrementCompteClientTiersPayent.getIntPRICE());
            OTSnapshotPreenregistrementCompteClientTiersPayent
                    .setIntPRICE(OTSnapshotPreenregistrementCompteClientTiersPayent.getIntPRICE() + int_MONTANT);
            OTSnapshotPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
            OTSnapshotPreenregistrementCompteClientTiersPayent.setIntNUMBERTRANSACTION(
                    OTSnapshotPreenregistrementCompteClientTiersPayent.getIntNUMBERTRANSACTION() + 1);
            OTSnapshotPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(
                    OTSnapshotPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID());
            this.persiste(OTSnapshotPreenregistrementCompteClientTiersPayent);
            result = true;
        } catch (Exception e) {
            this.createSnapShopPreenregistrementCompteCltTp(lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int_MONTANT);
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin fonction snap shot vente

    // liste des snap shot sur une periode
    public List<TSnapshotPreenregistrementCompteClientTiersPayent> listTSnapshotPreenregistrementCompteClientTiersPayent(
            String search_value, String dt_DEBUT, String dt_FIN, String lg_TIERS_PAYANT_ID, String lg_COMPTE_CLIENT_ID,
            String str_STATUT) {

        List<TSnapshotPreenregistrementCompteClientTiersPayent> listTSnapshotPreenregistrementCompteClientTiersPayent = new ArrayList<TSnapshotPreenregistrementCompteClientTiersPayent>();
        Date dtFin;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
                dt_DEBUT = "2015-04-20";
                new logger().OCategory.info("dt_DEBUT:" + dt_DEBUT);
            }
            if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
                dtFin = new Date();
            } else {
                dtFin = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            }
            Date dtDEBUT = this.getKey().stringToDate(dt_DEBUT, this.getKey().formatterMysqlShort);
            new logger().OCategory.info("dtDEBUT   " + dtDEBUT + " dtFin " + dtFin);

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTSnapshotPreenregistrementCompteClientTiersPayent lg_TIERS_PAYANT_ID :"
                    + lg_TIERS_PAYANT_ID + " lg_COMPTE_CLIENT_ID " + lg_COMPTE_CLIENT_ID);
            listTSnapshotPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?2 AND t.strSTATUT = ?3 AND (t.dtCREATED BETWEEN ?4 AND ?5) AND (t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?6 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME LIKE ?7) ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, lg_COMPTE_CLIENT_ID)
                    .setParameter(3, str_STATUT).setParameter(4, dtDEBUT).setParameter(5, dtFin)
                    .setParameter(6, "%" + search_value + "%").setParameter(7, "%" + search_value + "%")
                    .getResultList();
            new logger().OCategory.info("Taille liste " + listTSnapshotPreenregistrementCompteClientTiersPayent.size());
            for (TSnapshotPreenregistrementCompteClientTiersPayent OTSnapshotPreenregistrementCompteClientTiersPayent : listTSnapshotPreenregistrementCompteClientTiersPayent) {
                this.refresh(OTSnapshotPreenregistrementCompteClientTiersPayent);
                new logger().OCategory.info("Nombre de transaction "
                        + OTSnapshotPreenregistrementCompteClientTiersPayent.getIntNUMBERTRANSACTION() + " Client "
                        + OTSnapshotPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                        + " "
                        + OTSnapshotPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME()
                        + " Tiers payant " + OTSnapshotPreenregistrementCompteClientTiersPayent
                                .getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrNAME());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return listTSnapshotPreenregistrementCompteClientTiersPayent;
    }

    // creation d'une ligne de snap shot vente tiers payant
    public TSnapshotPreenregistrementCompteClientTiersPayent createSnapShopPreenregistrementCompteCltTp(
            String lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int int_MONTANT) {
        // boolean result = false;
        try {
            TCompteClientTiersPayant OTCompteClientTiersPayant = (TCompteClientTiersPayant) this.getOdataManager()
                    .getEm()
                    .createQuery(
                            "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTTIERSPAYANTID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();
            new logger().OCategory.info(
                    "Client " + OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME());
            TSnapshotPreenregistrementCompteClientTiersPayent OTSnapshotPreenregistrementCompteClientTiersPayent = new TSnapshotPreenregistrementCompteClientTiersPayent();
            OTSnapshotPreenregistrementCompteClientTiersPayent
                    .setLgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID(this.getKey().getComplexId());
            new logger().OCategory.info("Ref id "
                    + OTSnapshotPreenregistrementCompteClientTiersPayent
                            .getLgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID()
                    + " Solde " + OTSnapshotPreenregistrementCompteClientTiersPayent.getIntPRICE());
            OTSnapshotPreenregistrementCompteClientTiersPayent.setIntPRICE(int_MONTANT);
            OTSnapshotPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
            OTSnapshotPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
            OTSnapshotPreenregistrementCompteClientTiersPayent.setStrREF(this.getKey().getShortId(10));
            OTSnapshotPreenregistrementCompteClientTiersPayent.setIntNUMBERTRANSACTION(1);
            OTSnapshotPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Waiting);
            OTSnapshotPreenregistrementCompteClientTiersPayent
                    .setLgCOMPTECLIENTTIERSPAYANTID(OTCompteClientTiersPayant);
            this.persiste(OTSnapshotPreenregistrementCompteClientTiersPayent);
            return OTSnapshotPreenregistrementCompteClientTiersPayent;
            // result = true;
        } catch (Exception ex) {
            new logger().OCategory.info("Aucun tiers payant n'est associé a ce client");
            ex.printStackTrace();
            return null;
        }
        // return result;
    }
    // fin creation d'une ligne de snap shot vente tiers payant

    // fonction pour connaitre le nombre total de dossier non reglé d'un tiers payant
    public int getAllDossierNoSold(String lg_TIERS_PAYANT_ID, String str_STATUT, String dt_DEBUT, String dt_FIN) {
        int result = 0;
        Date dtFin;
        List<TSnapshotPreenregistrementCompteClientTiersPayent> lst = new ArrayList<TSnapshotPreenregistrementCompteClientTiersPayent>();
        try {
            if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
                dt_DEBUT = "2015-04-20";
                new logger().OCategory.info("dt_DEBUT:" + dt_DEBUT);
            }
            if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
                dtFin = new Date();
            } else {
                dtFin = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            }
            Date dtDEBUT = this.getKey().stringToDate(dt_DEBUT, this.getKey().formatterMysqlShort);
            new logger().OCategory.info("dtDEBUT   " + dtDEBUT + " dtFin " + dtFin);

            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND t.strSTATUT = ?2 AND (t.dtCREATED BETWEEN ?4 AND ?5) ORDER BY t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME ASC")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, str_STATUT).setParameter(4, dtDEBUT)
                    .setParameter(5, dtFin).getResultList();
            new logger().OCategory.info("lst taille dans getAllDossierNoSold " + lst.size());
            for (TSnapshotPreenregistrementCompteClientTiersPayent OTSnapshotPreenregistrementCompteClientTiersPayent : lst) {
                new logger().OCategory.info("Reference dossier "
                        + OTSnapshotPreenregistrementCompteClientTiersPayent.getStrREF() + " Nombre transaction "
                        + OTSnapshotPreenregistrementCompteClientTiersPayent.getIntNUMBERTRANSACTION());
                result += OTSnapshotPreenregistrementCompteClientTiersPayent.getIntNUMBERTRANSACTION();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result getAllDossierNoSold " + result);
        return result;
    }
    // fin fonction pour connaitre le nombre total de dossier non reglé d'un tiers payant

    // fonction pour connaitre le montant total de dossier non reglé d'un tiers payant
    public int getAllAmountforDossierNoSold(String lg_TIERS_PAYANT_ID, String str_STATUT, String dt_DEBUT,
            String dt_FIN) {
        int result = 0;
        Date dtFin;
        List<TSnapshotPreenregistrementCompteClientTiersPayent> lst = new ArrayList<TSnapshotPreenregistrementCompteClientTiersPayent>();
        try {
            if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
                dt_DEBUT = "2015-04-20";
                new logger().OCategory.info("dt_DEBUT:" + dt_DEBUT);
            }
            if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
                dtFin = new Date();
            } else {
                dtFin = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            }
            Date dtDEBUT = this.getKey().stringToDate(dt_DEBUT, this.getKey().formatterMysqlShort);
            new logger().OCategory.info("dtDEBUT   " + dtDEBUT + " dtFin " + dtFin);
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND t.strSTATUT = ?2 AND (t.dtCREATED BETWEEN ?4 AND ?5) ORDER BY t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME ASC")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, str_STATUT).setParameter(4, dtDEBUT)
                    .setParameter(5, dtFin).getResultList();
            new logger().OCategory.info("lst taille dans getAllAmountforDossierNoSold " + lst.size());
            for (TSnapshotPreenregistrementCompteClientTiersPayent OTSnapshotPreenregistrementCompteClientTiersPayent : lst) {
                new logger().OCategory
                        .info("Reference dossier " + OTSnapshotPreenregistrementCompteClientTiersPayent.getStrREF()
                                + " montant " + OTSnapshotPreenregistrementCompteClientTiersPayent.getIntPRICE());
                result += OTSnapshotPreenregistrementCompteClientTiersPayent.getIntPRICE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result getAllAmountforDossierNoSold " + result);
        return result;
    }
    // fin fonction pour connaitre le montant total de dossier non reglé d'un tiers payant

    // liste des tiers payants qui doivent sur une periode
    public List<TTiersPayant> getAllTierspayant(String str_STATUT, String dt_DEBUT, String dt_FIN,
            String lg_TIERS_PAYANT_ID) {
        List<TTiersPayant> lstTiersPayants = new ArrayList<TTiersPayant>();
        List<TTiersPayant> lstTiersPayantsFinal = new ArrayList<TTiersPayant>();

        Date dtFin;
        try {
            if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
                dt_DEBUT = "2015-04-20";
                new logger().OCategory.info("dt_DEBUT:" + dt_DEBUT);
            }
            if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
                dtFin = new Date();
            } else {
                dtFin = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            }
            Date dtDEBUT = this.getKey().stringToDate(dt_DEBUT, this.getKey().formatterMysqlShort);
            new logger().OCategory.info("dtDEBUT   " + dtDEBUT + " dtFin " + dtFin);

            lstTiersPayants = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.strSTATUT = ?1 AND t.lgTIERSPAYANTID LIKE ?2")
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, lg_TIERS_PAYANT_ID).getResultList();
            new logger().OCategory.info("lstTiersPayants taille " + lstTiersPayants.size());
            for (TTiersPayant OTTiersPayant : lstTiersPayants) {
                List<TSnapshotPreenregistrementCompteClientTiersPayent> lst = new ArrayList<TSnapshotPreenregistrementCompteClientTiersPayent>();
                lst = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND t.strSTATUT = ?2 AND (t.dtCREATED BETWEEN ?4 AND ?5) ORDER BY t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME ASC")
                        .setParameter(1, OTTiersPayant.getLgTIERSPAYANTID()).setParameter(2, str_STATUT)
                        .setParameter(4, dtDEBUT).setParameter(5, dtFin).getResultList();
                new logger().OCategory.info("lst taille " + lst.size());
                if (lst.size() > 0) {
                    lstTiersPayantsFinal.add(OTTiersPayant);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTiersPayantsFinal taille " + lstTiersPayantsFinal.size());
        return lstTiersPayantsFinal;
    }

    public List<TTiersPayant> getAllTierspayant(String str_STATUT, Date dtDEBUT, Date dtFin,
            String lg_TIERS_PAYANT_ID) {
        List<TTiersPayant> lstTiersPayants = new ArrayList<TTiersPayant>();
        List<TTiersPayant> lstTiersPayantsFinal = new ArrayList<TTiersPayant>();

        try {

            lstTiersPayants = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.strSTATUT = ?1 AND t.lgTIERSPAYANTID LIKE ?2")
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, lg_TIERS_PAYANT_ID).getResultList();
            new logger().OCategory.info("lstTiersPayants taille " + lstTiersPayants.size());
            for (TTiersPayant OTTiersPayant : lstTiersPayants) {
                List<TSnapshotPreenregistrementCompteClientTiersPayent> lst = new ArrayList<TSnapshotPreenregistrementCompteClientTiersPayent>();
                lst = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND t.strSTATUT = ?2 AND (t.dtCREATED BETWEEN ?4 AND ?5) ORDER BY t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME ASC")
                        .setParameter(1, OTTiersPayant.getLgTIERSPAYANTID()).setParameter(2, str_STATUT)
                        .setParameter(4, dtDEBUT).setParameter(5, dtFin).getResultList();
                new logger().OCategory.info("lst taille " + lst.size());
                if (lst.size() > 0) {
                    lstTiersPayantsFinal.add(OTTiersPayant);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTiersPayantsFinal taille " + lstTiersPayantsFinal.size());
        return lstTiersPayantsFinal;
    }
    // fin liste des tiers payants qui doivent sur une periode

    public List<TTiersPayant> getTiersPayantByTypeBis(String lg_TYPE_CLIENT_ID) {

        List<TTiersPayant> lstTTiersPayant = new ArrayList<TTiersPayant>();
        String str_NAME = "%%";
        TTypeClient OTypeClient = null;
        try {

            if (!lg_TYPE_CLIENT_ID.equalsIgnoreCase("%%")) {
                OTypeClient = this.getOdataManager().getEm().find(TTypeClient.class, lg_TYPE_CLIENT_ID);
                new logger().OCategory.info("str_NAME " + OTypeClient.getStrNAME());
                str_NAME = OTypeClient.getStrNAME();
            }
            new logger().OCategory.info("str_NAME " + str_NAME);

            lstTTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTiersPayant t WHERE t.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT LIKE ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, str_NAME).setParameter(2, commonparameter.statut_enable).getResultList();

            for (TTiersPayant lstTTiersPayant1 : lstTTiersPayant) {
                this.refresh(lstTTiersPayant1);
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Aucun tiers payant trouvé ", e.getMessage());

        }
        new logger().OCategory.info("lstTTiersPayant taille : " + lstTTiersPayant.size());
        return lstTTiersPayant;
    }

    // creation de compte client tiers payant
    public boolean create_compteclt_tierspayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID,
            int int_POURCENTAGE, int int_PRIORITY, String bool_REGIME_add, Integer db_PLAFOND_ENCOURS,
            boolean b_IsAbsolute, double plafond) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = new TCompteClientTiersPayant();
        boolean result = false;
        try {
            TCompteClient OTCompteClient = this.getOdataManager().getEm().find(TCompteClient.class,
                    lg_COMPTE_CLIENT_ID);
            TTiersPayant OTTiersPayant = this.getOdataManager().getEm().find(TTiersPayant.class, lg_TIERS_PAYANT_ID);

            OTCompteClientTiersPayant.setLgCOMPTECLIENTTIERSPAYANTID(this.getKey().getComplexId());
            OTCompteClientTiersPayant.setIntPOURCENTAGE(int_POURCENTAGE);
            OTCompteClientTiersPayant.setIntPRIORITY(int_PRIORITY);
            OTCompteClientTiersPayant.setLgCOMPTECLIENTID(OTCompteClient);
            OTCompteClientTiersPayant.setLgTIERSPAYANTID(OTTiersPayant);
            OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClientTiersPayant.setDtCREATED(new Date());
            OTCompteClientTiersPayant.setBIsAbsolute(b_IsAbsolute);
            OTCompteClientTiersPayant.setDbPLAFONDENCOURS(db_PLAFOND_ENCOURS);
            OTCompteClientTiersPayant.setDblPLAFOND(plafond);

            if (bool_REGIME_add.equals("RO")) {
                OTCompteClientTiersPayant.setBISRO(true);
            } else {
                OTCompteClientTiersPayant.setBISRO(false);
            }

            if (bool_REGIME_add.equals("RC1")) {
                OTCompteClientTiersPayant.setBISRC1(true);
            } else {
                OTCompteClientTiersPayant.setBISRC1(false);
            }

            if (bool_REGIME_add.equals("RC2")) {
                OTCompteClientTiersPayant.setBISRC2(true);
            } else {
                OTCompteClientTiersPayant.setBISRC2(false);
            }

            this.persiste(OTCompteClientTiersPayant);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible d\'associer un tiers payant a un compte client");

        }
        return result;
    }
    // creation de compte client tiers payant

    public void updateComptecltTierspayantPercent(String lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int int_POURCENTAGE) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;

        try {

            OTCompteClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                    lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
            if (OTCompteClientTiersPayant == null) {
                new logger().OCategory.info("  *** OTCompteClientTiersPayant is null *** ");
                return;
            }

            OTCompteClientTiersPayant.setIntPOURCENTAGE(int_POURCENTAGE);
            OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClientTiersPayant.setDtUPDATED(new Date());

            this.persiste(OTCompteClientTiersPayant);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Impossible de mettre a jour ce tiers payant associé au client courant  " + e.toString());
        }

    }

    public TCompteClientTiersPayant updateComptecltTierspayantLigth(String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID, int int_POURCENTAGE) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        try {

            OTCompteClientTiersPayant = (TCompteClientTiersPayant) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?1 AND t.lgTIERSPAYANTID.lgTIERSPAYANTID = ?2 AND t.strSTATUT LIKE ?3")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(2, lg_TIERS_PAYANT_ID)
                    .setParameter(3, commonparameter.statut_enable).getSingleResult();

            OTCompteClientTiersPayant.setIntPOURCENTAGE(int_POURCENTAGE);
            OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClientTiersPayant.setDtUPDATED(new Date());

            this.persiste(OTCompteClientTiersPayant);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Impossible de mettre a jour ce tiers payant associé au client courant  " + e.toString());
        }
        return OTCompteClientTiersPayant;
    }

    public List<TPreenregistrementCompteClientTiersPayent> ManageVenteTpCouverture(
            List<TCompteClientTiersPayant> lstTCompteClientTiersPayant, TPreenregistrement OTPreenregistrement) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        List<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        List<TPreenregistrementCompteClientTiersPayent> lstTemp = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        int tp_taux = 0;
        TPreenregistrementCompteClientTiersPayent oTPreenregistrementCompteClientTiersPayent = null;

        if (OTPreenregistrement == null) {
            this.buildErrorTraceMessage("ERROR", " Desole il ne sagit pas dune vente ");
            return null;
        }

        if (lstTCompteClientTiersPayant == null) {
            this.buildErrorTraceMessage("ERROR", "Desole lstTCompteClientTiersPayant est null");
            return null;
        }

        if (lstTCompteClientTiersPayant.isEmpty()) {
            this.buildErrorTraceMessage("ERROR", "Desole lstTCompteClientTiersPayant est vide");
            return null;
        }
        for (int k = 0; k < lstTCompteClientTiersPayant.size(); k++) {
            OTCompteClientTiersPayant = lstTCompteClientTiersPayant.get(k);
            lstTemp = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  = ?1 AND t.strSTATUT = ?2 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?3")
                    .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID())
                    .setParameter(2, commonparameter.statut_is_Process)
                    .setParameter(3, OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID()).getResultList();

            lstT.addAll(lstTemp);
        }
        new logger().OCategory.info(" 223 lstT  " + lstT.size());

        if (lstT == null || lstT.isEmpty()) {
            new logger().OCategory.info(" 226 lstT is null ");
            this.buildErrorTraceMessage("ERROR", "Desole pas de preenregistrement compte client tiers payant");
            for (int j = 0; j < lstTCompteClientTiersPayant.size(); j++) {
                if (lstTCompteClientTiersPayant.get(j).getIntPOURCENTAGE() == null) {
                    tp_taux = 0;
                } else {
                    tp_taux = lstTCompteClientTiersPayant.get(j).getIntPOURCENTAGE();
                }

                oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
                oTPreenregistrementCompteClientTiersPayent
                        .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());

                oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
                oTPreenregistrementCompteClientTiersPayent
                        .setLgCOMPTECLIENTTIERSPAYANTID(lstTCompteClientTiersPayant.get(j));
                oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
                oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(tp_taux);
                oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Process);
                // update du solde du tier payant
                this.persiste(oTPreenregistrementCompteClientTiersPayent);
                lstT.add(oTPreenregistrementCompteClientTiersPayent);
            }
            return lstT;
        }

        if (!lstT.isEmpty()) {
            for (int i = 0; i < lstT.size(); i++) {
                oTPreenregistrementCompteClientTiersPayent = lstT.get(i);
                if (oTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                        .getIntPOURCENTAGE() == null) {
                    tp_taux = 0;
                } else {
                    tp_taux = oTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                            .getIntPOURCENTAGE();
                }

                oTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(tp_taux);
                oTPreenregistrementCompteClientTiersPayent
                        .setLgCOMPTECLIENTTIERSPAYANTID(lstT.get(i).getLgCOMPTECLIENTTIERSPAYANTID());
                this.persiste(oTPreenregistrementCompteClientTiersPayent);
                lstT.add(oTPreenregistrementCompteClientTiersPayent);

            }
            return lstT;
        } else {
            for (int q = 0; q < lstTCompteClientTiersPayant.size(); q++) {
                if (lstTCompteClientTiersPayant.get(q).getIntPOURCENTAGE() == null) {
                    tp_taux = 0;
                } else {
                    tp_taux = lstTCompteClientTiersPayant.get(q).getIntPOURCENTAGE();
                }
                oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
                oTPreenregistrementCompteClientTiersPayent
                        .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());

                oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
                oTPreenregistrementCompteClientTiersPayent
                        .setLgCOMPTECLIENTTIERSPAYANTID(lstTCompteClientTiersPayant.get(q));
                oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
                oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(tp_taux);
                oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Process);
                // update du solde du tier payant
                this.persiste(oTPreenregistrementCompteClientTiersPayent);
                lstT.add(oTPreenregistrementCompteClientTiersPayent);
            }
            return lstT;
        }

    }

    // liste des tiers payants qui doivent sur une periode
    public List<TTiersPayant> ShowAllOrOneTierspayantDette(String search_value, String lg_TYPE_TIERS_PAYANT_ID,
            Date dtDEBUT, Date dtFin, String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID, String lg_USER_ID, String lg_EMPLACEMENT_ID) {
        List<TTiersPayant> lstTTiersPayant = new ArrayList<TTiersPayant>();
        List<TTiersPayant> lstTTiersPayantFinal = new ArrayList<TTiersPayant>();
        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());

        try {
            lstTTiersPayant = this.ShowAllOrOneTierspayant(search_value, lg_TIERS_PAYANT_ID, lg_TYPE_TIERS_PAYANT_ID,
                    commonparameter.statut_enable);
            for (TTiersPayant OTTiersPayant : lstTTiersPayant) {
                List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
                lstTPreenregistrementCompteClientTiersPayent = OPreenregistrement
                        .listTPreenregistrementCompteClientTiersPayent(search_value, dtDEBUT, dtFin, lg_USER_ID,
                                lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID,
                                OTTiersPayant.getLgTIERSPAYANTID());
                if (lstTPreenregistrementCompteClientTiersPayent.size() > 0) {
                    lstTTiersPayantFinal.add(OTTiersPayant);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTTiersPayantFinal taille " + lstTTiersPayantFinal.size());
        return lstTTiersPayantFinal;
    }

    // fin liste des tiers payants qui doivent sur une periode
    // liste des tiers payants
    public List<TTiersPayant> ShowAllOrOneTierspayant(String search_value, String lg_TIERS_PAYANT_ID,
            String lg_TYPE_TIERS_PAYANT_ID, String str_STATUT) {
        List<TTiersPayant> lstTTiersPayant = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            lstTTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTiersPayant t WHERE t.lgTIERSPAYANTID LIKE ?1 AND (t.strCODEORGANISME LIKE ?2 OR t.strFULLNAME LIKE ?2 OR t.strNAME LIKE ?2) AND t.strSTATUT = ?3 AND (t.lgTYPETIERSPAYANTID.lgTYPETIERSPAYANTID LIKE ?4 OR t.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT LIKE ?4) ORDER BY t.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT, t.strFULLNAME")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, search_value + "%").setParameter(3, str_STATUT)
                    .setParameter(4, lg_TYPE_TIERS_PAYANT_ID).getResultList();
            for (TTiersPayant tTiersPayant : lstTTiersPayant) {
                this.refresh(tTiersPayant);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste tiers payant taille " + lstTTiersPayant.size());
        return lstTTiersPayant;
    }
    // fin liste des tiers payants

    // liste des tiers payants qui ont intervenu dans une vente
    public List<TPreenregistrementCompteClientTiersPayent> ShowAllOrOneTierspayantByVente(String search_value,
            String lg_TIERS_PAYANT_ID, String lg_TYPE_TIERS_PAYANT_ID, String lg_PREENREGISTREMENT_ID,
            String str_STATUT) {
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value:" + search_value + " lg_TIERS_PAYANT_ID:" + lg_TIERS_PAYANT_ID
                    + " lg_TYPE_TIERS_PAYANT_ID:" + lg_TYPE_TIERS_PAYANT_ID + " lg_PREENREGISTREMENT_ID:"
                    + lg_PREENREGISTREMENT_ID + " str_STATUT:" + str_STATUT);
            lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND (t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strCODEORGANISME LIKE ?2 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME LIKE ?2) AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strSTATUT = ?3 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTYPETIERSPAYANTID.lgTYPETIERSPAYANTID LIKE ?4 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?6")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, "%" + search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, lg_TYPE_TIERS_PAYANT_ID)
                    .setParameter(5, lg_PREENREGISTREMENT_ID).setParameter(6, str_STATUT).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste tiers payant taille " + lstTPreenregistrementCompteClientTiersPayent.size());
        return lstTPreenregistrementCompteClientTiersPayent;
    }
    // fin liste des tiers payants qui ont intervenu dans une vente

    // recupere tiers payant
    public TTiersPayant getTTiersPayant(String lg_TIERS_PAYANT_ID) {
        TTiersPayant OTTiersPayant = null;
        try {
            OTTiersPayant = (TTiersPayant) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTiersPayant t WHERE (t.lgTIERSPAYANTID LIKE ?1 OR t.strFULLNAME LIKE ?1 OR t.strCODEORGANISME LIKE ?1 OR t.strNAME LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, commonparameter.statut_enable).setMaxResults(1)
                    .getSingleResult();
            // new logger().OCategory.info("Type tiers payant " +
            // OTTiersPayant.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTiersPayant;
    }
    // fin recupere tiers payant

    // verifier si un client a deja un tiers payant qui lui est attribué avec une priorité donné
    public boolean isRegimeExistForCptltTiersP(String lg_COMPTE_CLIENT_ID, int int_PRIORITY) {
        boolean result = false;

        try {
            TCompteClientTiersPayant OTCompteClientTiersPayant = (TCompteClientTiersPayant) this.getOdataManager()
                    .getEm()
                    .createQuery(
                            "SELECT t FROM TCompteClientTiersPayant t WHERE t.intPRIORITY = ?1 AND t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, int_PRIORITY).setParameter(2, lg_COMPTE_CLIENT_ID)
                    .setParameter(3, commonparameter.statut_enable).getSingleResult();
            // new logger().OCategory.info("Client " +
            // OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME() + " Tiers payant " +
            // OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrNAME());
            if (OTCompteClientTiersPayant != null) {
                this.buildErrorTraceMessage("Ce client a déjà ce régime");
                new clientManagement(this.getOdataManager()).buildErrorTraceMessage("Ce client a déjà ce régime");
                result = true;
            }

        } catch (Exception e) {
            // e.printStackTrace();
        }
        new logger().OCategory.info("result isRegimeExistForCptltTiersP " + result);
        return result;
    }

    public TCompteClientTiersPayant isRegimeExistForCptltTiersPBis(String lg_COMPTE_CLIENT_ID, int int_PRIORITY,
            String str_STATUT) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;

        try {
            new logger().OCategory.info("lg_COMPTE_CLIENT_ID " + lg_COMPTE_CLIENT_ID + "|int_PRIORITY " + int_PRIORITY);
            OTCompteClientTiersPayant = (TCompteClientTiersPayant) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.intPRIORITY = ?1 AND t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, int_PRIORITY).setParameter(2, lg_COMPTE_CLIENT_ID).setParameter(3, str_STATUT)
                    .getSingleResult();
            new logger().OCategory
                    .info("Client " + OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                            + " Tiers payant " + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrNAME());

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTCompteClientTiersPayant;
    }
    // fin verifier si un client a deja un tiers payant qui lui est attribué avec une priorité donné

    // verifier si un client a deja un tiers payant qui lui est attribué avec une priorité donné
    public boolean isTiersPayantExistForCptltTiersP(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID) {
        boolean result = false;

        try {
            TCompteClientTiersPayant OTCompteClientTiersPayant = (TCompteClientTiersPayant) this.getOdataManager()
                    .getEm()
                    .createQuery(
                            "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgTIERSPAYANTID.lgTIERSPAYANTID = ?1 AND t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, lg_COMPTE_CLIENT_ID)
                    .setParameter(3, commonparameter.statut_enable).getSingleResult();
            // new logger().OCategory.info("Client " +
            // OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME() + " Tiers payant " +
            // OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrNAME());
            if (OTCompteClientTiersPayant != null) {
                this.buildErrorTraceMessage("Ce tiers payant a déjà été ajouté au client sélectionné");
                new clientManagement(this.getOdataManager())
                        .buildErrorTraceMessage("Ce tiers payant a déjà été ajouté au client sélectionné");
                result = true;
            }

        } catch (Exception e) {
            // e.printStackTrace();
        }
        new logger().OCategory.info("result isTiersPayantExistForCptltTiersP " + result);
        return result;
    }
    // fin verifier si un client a deja un tiers payant qui lui est attribué avec une priorité donné

    // creation d'un compte client tiers payant
    public TCompteClientTiersPayant createTCompteClientTiersPayant(TCompteClient OTCompteClient,
            TTiersPayant OTTiersPayant, int int_POURCENTAGE, int int_PRIORITY, double dbl_PLAFOND,
            double dbl_QUOTA_CONSO_VENTE, String str_NUMERO_SECURITE_SOCIAL, Integer dbPLAFONDENCOURS,
            boolean b_IsAbsolute) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;

        try {
            OTCompteClientTiersPayant = new TCompteClientTiersPayant();
            OTCompteClientTiersPayant.setLgCOMPTECLIENTTIERSPAYANTID(this.getKey().getComplexId());
            OTCompteClientTiersPayant.setLgCOMPTECLIENTID(OTCompteClient);
            OTCompteClientTiersPayant.setLgTIERSPAYANTID(OTTiersPayant);
            OTCompteClientTiersPayant.setIntPOURCENTAGE(int_POURCENTAGE);
            OTCompteClientTiersPayant.setIntPRIORITY(int_PRIORITY);
            OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClientTiersPayant.setDtCREATED(new Date());
            OTCompteClientTiersPayant.setDblPLAFOND(dbl_PLAFOND);
            // OTCompteClientTiersPayant.setDblPLAFOND(dbl_QUOTA_CONSO_VENTE);
            OTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTCompteClientTiersPayant.setDblQUOTACONSOVENTE(dbl_QUOTA_CONSO_VENTE);
            OTCompteClientTiersPayant.setDbPLAFONDENCOURS(dbPLAFONDENCOURS);
            OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
            OTCompteClientTiersPayant.setBIsAbsolute(b_IsAbsolute);
            OTCompteClientTiersPayant.setBCANBEUSE(true);
            this.persiste(OTCompteClientTiersPayant);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant au client en cours");
        }
        // fin code ajouté
        return OTCompteClientTiersPayant;
    }
    // fin creation d'un compte client tiers payant

    /*
     * public TCompteClientTiersPayant createcompteclttierspayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID,
     * int int_POURCENTAGE, int int_PRIORITY) { TCompteClientTiersPayant OTCompteClientTiersPayant = null; try {
     * TTiersPayant OTTiersPayant = this.getTTiersPayant(lg_TIERS_PAYANT_ID); TCompteClient OTCompteClient = new
     * clientManagement(this.getOdataManager()).getTCompteClient(lg_COMPTE_CLIENT_ID);
     *
     * if (OTTiersPayant != null && OTCompteClient != null) { // if
     * (!this.isTiersPayantExistForCptltTiersP(OTCompteClient.getLgCOMPTECLIENTID(),
     * OTTiersPayant.getLgTIERSPAYANTID())) { // if
     * (!this.isRegimeExistForCptltTiersP(OTCompteClient.getLgCOMPTECLIENTID(), int_PRIORITY)) {
     * OTCompteClientTiersPayant = this.createTCompteClientTiersPayant(OTCompteClient, OTTiersPayant, int_POURCENTAGE,
     * int_PRIORITY); //result = true;
     *
     * return OTCompteClientTiersPayant;
     *
     * /*} else {
     *
     * }
     */
    /*
     * } else { OTCompteClientTiersPayant = this.updateComptecltTierspayantLigth(OTCompteClient.getLgCOMPTECLIENTID(),
     * OTTiersPayant.getLgTIERSPAYANTID(), int_POURCENTAGE); //result = true; return OTCompteClientTiersPayant; } } else
     * { this.buildErrorTraceMessage("Echec d'ajout de ce tiers payant au client séléctionné"); return null; }
     *
     * } catch (Exception e) { e.printStackTrace();
     * this.buildErrorTraceMessage("Echec d'ajout de ce tiers payant au client séléctionné"); return null; } // new
     * logger().OCategory.info("result " + OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID() + " Message " +
     * this.getDetailmessage()); //return OTCompteClientTiersPayant; }
     */
    // liste des compte client tiers payant
    public List<TCompteClientTiersPayant> getListCompteClientTiersPayants(String search_value,
            String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID) {
        List<TCompteClientTiersPayant> lst = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgTIERSPAYANTID.strNAME LIKE ?1 AND t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?2 AND t.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?3 AND t.strSTATUT = ?4")
                    .setParameter(1, search_value + "%").setParameter(2, lg_COMPTE_CLIENT_ID)
                    .setParameter(3, lg_TIERS_PAYANT_ID).setParameter(4, commonparameter.statut_enable).getResultList();
            for (TCompteClientTiersPayant tCompteClientTiersPayant : lst) {
                this.refresh(tCompteClientTiersPayant);
            }

            new logger().OCategory.info("lst taille " + lst.size());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lst;
    }

    public List<TCompteClientTiersPayant> getListCompteClientTiersPayants(String lg_CLIENT_ID) {
        List<TCompteClientTiersPayant> lst = new ArrayList<>();

        try {

            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID LIKE ?1 AND t.lgCOMPTECLIENTID.lgCLIENTID.strSTATUT = ?2 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_CLIENT_ID).setParameter(2, commonparameter.statut_enable).getResultList();
            for (TCompteClientTiersPayant tCompteClientTiersPayant : lst) {
                this.refresh(tCompteClientTiersPayant);
            }

            new logger().OCategory.info("lst taille " + lst.size());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lst;
    }
    // fin liste des compte client tiers payant

    // recuperation compte client tiers payant
    public TCompteClientTiersPayant getClientTiersPayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;

        try {

            OTCompteClientTiersPayant = (TCompteClientTiersPayant) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?2 AND (t.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?3 OR t.lgTIERSPAYANTID.strFULLNAME LIKE ?3 OR t.lgTIERSPAYANTID.strNAME LIKE ?3) AND t.strSTATUT = ?4")
                    .setParameter(2, lg_COMPTE_CLIENT_ID).setParameter(3, lg_TIERS_PAYANT_ID)
                    .setParameter(4, commonparameter.statut_enable).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Le tiers payant n'est pas associé au client en cours");
        }
        return OTCompteClientTiersPayant;
    }
    // fin recuperation compte client tiers payant

    // liste des modeles factures
    public List<TModelFacture> getTModelFacture(String search_value) {
        List<TModelFacture> lstTModelFactures = new ArrayList<TModelFacture>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTModelFactures = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TModelFacture t WHERE (t.strDESCRIPTION LIKE ?1 OR t.strVALUE LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, search_value).setParameter(2, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTModelFactures taille " + lstTModelFactures.size());
        return lstTModelFactures;
    }
    // fin liste des modeles factures

    // creation en masse des tiers payants
    public boolean createMasseTierspayant(List<String> lstData) {
        boolean result = false;
        int count = 0;
        factureManagement OfactureManagement = new factureManagement(this.getOdataManager(), this.getOTUser());

        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("ligne " + i + "------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes

                if (this.create(tabString[0].trim(), tabString[1].trim(), tabString[2].trim(), tabString[3].trim(),
                        tabString[4].trim(), tabString[4].trim(), "", 0, 0, "", "", "", 0, false, "46700000000", false,
                        0, "", 0, 0, 0, "1", Integer.parseInt(tabString[5].trim()), 0, 0, "", 0, 0, "", false, "1",
                        (tabString[6].trim().equalsIgnoreCase("X") ? "2" : "1"), "", "", "55181642844215217016", 0, 0,
                        0, false, OfactureManagement.CreateSequencier(), "", "", "", false, "", -1, -1, false, false,
                        0)) {
                    count++;
                }

            }
            if (count == lstData.size()) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildSuccesTraceMessage(count + "/" + lstData.size() + " organisme(s) pris en compte");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin creation en masse des tiers payants

    public String generateEnteteForFile() {
        return "IDENTIFIANT;CODE ORGANISME;NOM ABBREGE;NOM COMPLET;ADRESSE;TELEPHONE;NBRE EXEMPLAIRE;TYPE ORGANISME";
    }

    // generation des données à exporter
    public List<String> generateDataToExport() {
        List<String> lst = new ArrayList<>();
        List<TTiersPayant> lstTTiersPayant = new ArrayList<>();
        String row = "";

        try {
            lstTTiersPayant = this.ShowAllOrOneTierspayant("", "%%", "%%", commonparameter.statut_enable);
            for (TTiersPayant OTTiersPayant : lstTTiersPayant) {

                row += OTTiersPayant.getLgTIERSPAYANTID() + ";" + OTTiersPayant.getStrCODEORGANISME() + ";"
                        + OTTiersPayant.getStrNAME() + ";" + OTTiersPayant.getStrFULLNAME() + ";";
                row += (OTTiersPayant.getStrADRESSE() != null ? OTTiersPayant.getStrADRESSE() : " ") + ";";
                row += (OTTiersPayant.getStrTELEPHONE() != null ? OTTiersPayant.getStrTELEPHONE() : " ") + ";";
                row += OTTiersPayant.getIntNBREEXEMPLAIREBORD() + ";";
                row += (OTTiersPayant.getLgTYPETIERSPAYANTID() != null
                        ? OTTiersPayant.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT() : " ") + ";";
                new logger().OCategory.info(row);
                row = row.substring(0, row.length() - 1);
                lst.add(row);
                row = "";
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Taille de la nouvelle liste " + lst.size());
        return lst;
    }

    // fin generation des données à exporter
    public TModelFacture getModelFacture(String str_CODE) {
        TModelFacture OTModelFacture = null;
        try {
            OTModelFacture = (TModelFacture) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TModelFacture t WHERE (t.lgMODELFACTUREID = ?1 OR t.strVALUE = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, str_CODE).setParameter(2, commonparameter.statut_enable).getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTModelFacture;
    }

    // verifie si le type payant existe deja
    public TTiersPayant checkTiersPayantIsExitst(String str_CODE_ORGANISME, String lg_TYPE_TIERS_PAYANT_ID) {
        TTiersPayant OTTiersPayant = null;
        try {
            OTTiersPayant = (TTiersPayant) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTiersPayant t WHERE t.strCODEORGANISME LIKE ?1 AND t.strSTATUT = ?2 AND (t.lgTYPETIERSPAYANTID.lgTYPETIERSPAYANTID = ?3 OR t.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT = ?3)")
                    .setParameter(1, str_CODE_ORGANISME).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, lg_TYPE_TIERS_PAYANT_ID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTiersPayant;
    }
    // fin verifie si le type payant existe deja

    // verification de l'importation de la liste des tiers payants
    public List<String> checkImport(List<String> lstData) {
        List<String> lst = new ArrayList<String>();
        TTiersPayant OTTiersPayant = null;
        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes
                OTTiersPayant = this.getTTiersPayant(tabString[0].trim());
                if (OTTiersPayant == null) {
                    new logger().OCategory.info("Ligne inexistante " + i);
                    lst.add(lstData.get(i));
                }
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de vérification du fichier. Aucune ligne n'a été pris en compte");
        }
        return lst;
    }
    // fin verification de l'importation de la liste des tiers payants

    public String createStandardClient(String str_FIRST_NAME, String str_LAST_NAME, String str_PHONE, String str_SEXE) {
        String lg_Client_ID = null;
        try {

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lg_Client_ID;
    }

    /* on verifie le client avec ce numero dec telephone n'est pas deja enregistre dans le systeme */
    private boolean isRegisteredClient(String str_PHONE) {
        boolean isRegistered = false;
        List<TClient> list = new ArrayList<>();
        try {
            list = this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT o FROM TClient o WHERE o.lgTYPECLIENTID.lgTYPECLIENTID=?1 AND o.strADRESSE =?2")
                    .setParameter(1, commonparameter.STANDART_CLIENT_ID).setParameter(2, str_PHONE).getResultList();
            if (!list.isEmpty()) {
                isRegistered = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isRegistered;
    }

    // desactivation et activation de tiers payants
    public boolean enableOrDisableTierspayant(String lg_TIERS_PAYANT_ID, String str_STATUT) {
        boolean result = false;
        TTiersPayant OTTiersPayant = null;
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>(),
                lstTCompteCTP = new ArrayList<>();
        TCompteClient OTCompteClient = null;
        TClient OTClient = null;
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        clientManagement OclientManagement = new clientManagement(this.getOdataManager());
        String state = "";
        try {
            state = (str_STATUT.equalsIgnoreCase(commonparameter.statut_enable) ? commonparameter.statut_disable
                    : commonparameter.statut_enable);
            OTTiersPayant = this.getOdataManager().getEm().find(TTiersPayant.class, lg_TIERS_PAYANT_ID);

            if (OTTiersPayant != null) {
                lstTCompteClientTiersPayant = OclientManagement.getTiersPayantsByClient("", "%%", lg_TIERS_PAYANT_ID,
                        state);

                for (TCompteClientTiersPayant OTCompteClientTiersPayant1 : lstTCompteClientTiersPayant) {
                    lstTCompteCTP = OclientManagement.getTiersPayantsByClient("",
                            OTCompteClientTiersPayant1.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(), "%%", state);

                    if (str_STATUT.equalsIgnoreCase(commonparameter.statut_disable)) {
                        if (lstTCompteCTP.size() >= 1) {
                            OTCompteClientTiersPayant1.setStrSTATUT(str_STATUT);
                            OTCompteClientTiersPayant1.setDtUPDATED(new Date());
                        }
                        if (lstTCompteCTP.size() == 1) {
                            OTCompteClient = lstTCompteCTP.get(0).getLgCOMPTECLIENTID();
                            OTClient = OTCompteClient.getLgCLIENTID();
                            OTCompteClient.setStrSTATUT(str_STATUT);
                            OTCompteClient.setDtUPDATED(new Date());
                            OTClient.setStrSTATUT(str_STATUT);
                            OTClient.setDtUPDATED(new Date());
                        }
                    } else if (str_STATUT.equalsIgnoreCase(commonparameter.statut_enable)) {
                        if (this.isRegimeExistForCptltTiersPBis(
                                OTCompteClientTiersPayant1.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(),
                                OTCompteClientTiersPayant1.getIntPRIORITY(), commonparameter.statut_disable) == null) {
                            if (lstTCompteCTP.size() >= 1) {
                                OTCompteClientTiersPayant1.setStrSTATUT(str_STATUT);
                                OTCompteClientTiersPayant1.setDtUPDATED(new Date());
                            }
                            if (lstTCompteCTP.size() == 1) {
                                OTCompteClient = lstTCompteCTP.get(0).getLgCOMPTECLIENTID();
                                OTClient = OTCompteClient.getLgCLIENTID();
                                OTCompteClient.setStrSTATUT(str_STATUT);
                                OTCompteClient.setDtUPDATED(new Date());
                                OTClient.setStrSTATUT(str_STATUT);
                                OTClient.setDtUPDATED(new Date());
                            }

                        }
                    }

                }

                OTTiersPayant.setStrSTATUT(str_STATUT);
                OTTiersPayant.setDtUPDATED(new Date());
                if (this.persiste(OTTiersPayant)) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    String desc = (state.equals(commonparameter.statut_enable) ? "Désactivation du Tiers-payant "
                            : "Activation du Tiers-payant ");
                    this.do_event_log(this.getOdataManager(), "", desc + OTTiersPayant.getStrFULLNAME(),
                            this.getOTUser().getStrFIRSTNAME(), commonparameter.statut_enable, "t_client", "t_client",
                            "Mouvement Tiers-payant", this.getOTUser().getLgUSERID());

                } else {
                    this.buildErrorTraceMessage("Echec de l'opération");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    // fin desactivation et activation de tiers payants
    // A NE PAS SUPPRIMER
    public List<TTiersPayant> ShowAllOrOneTierspayant(String search_value, String lg_TIERS_PAYANT_ID,
            String lg_TYPE_TIERS_PAYANT_ID) {
        List<TTiersPayant> lstTTiersPayant = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            lstTTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTiersPayant t WHERE t.lgTIERSPAYANTID LIKE ?1 AND (t.strCODEORGANISME LIKE ?2 OR t.strFULLNAME LIKE ?2 OR t.strNAME LIKE ?2) AND t.strSTATUT = ?3 AND t.lgTYPETIERSPAYANTID.lgTYPETIERSPAYANTID LIKE ?4 ORDER BY t.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT, t.strFULLNAME")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, lg_TYPE_TIERS_PAYANT_ID)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste tiers payant taille " + lstTTiersPayant.size());
        return lstTTiersPayant;
    }

    public long verifieComptClientTierspayantVente(String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {

        TypedQuery<Long> typedQuery = null;
        try {
            typedQuery = this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o) FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID=?1 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.strSTATUTFACTURE <> ?2 AND o.intPRICE >0  ",
                    Long.class).setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID)
                    .setParameter(2, commonparameter.statut_paid);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return typedQuery.getSingleResult();

    }

    public List<TPreenregistrementCompteClientTiersPayent> getComptClientTierspayantVente(
            String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {

        TypedQuery<TPreenregistrementCompteClientTiersPayent> typedQuery = null;
        try {
            typedQuery = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID=?1  ",
                    TPreenregistrementCompteClientTiersPayent.class).setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return typedQuery.getResultList();

    }

    public List<TSnapshotPreenregistrementCompteClientTiersPayent> getCompteClientTiersPayents(
            String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {

        TypedQuery<TSnapshotPreenregistrementCompteClientTiersPayent> typedQuery = null;
        try {
            typedQuery = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TSnapshotPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID=?1  ",
                    TSnapshotPreenregistrementCompteClientTiersPayent.class)
                    .setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return typedQuery.getResultList();

    }

    public void deleteComptecltTierspayant(String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {
        TCompteClientTiersPayant OClientTiersPayant = null;
        System.out.println("lg_COMPTE_CLIENT_TIERS_PAYANT_ID ---------------------------------"
                + lg_COMPTE_CLIENT_TIERS_PAYANT_ID);

        try {
            OClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                    lg_COMPTE_CLIENT_TIERS_PAYANT_ID);

            if (verifieComptClientTierspayantVente(lg_COMPTE_CLIENT_TIERS_PAYANT_ID) > 0) {
                this.buildErrorTraceMessage(
                        "Le client sélectionné a déjà effectué des transactions avec ce tiers payant.<br> Pour poursuivre vous devez annuler les ventes du client liées à cet Organisme");
            } else {
                if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().begin();
                }
                this.getComptClientTierspayantVente(lg_COMPTE_CLIENT_TIERS_PAYANT_ID).stream().map((p) -> {
                    p.setStrSTATUT(commonparameter.statut_delete);
                    return p;
                }).forEachOrdered((p) -> {
                    this.getOdataManager().getEm().merge(p);
                });

                this.getCompteClientTiersPayents(lg_COMPTE_CLIENT_TIERS_PAYANT_ID).stream().map((sp) -> {
                    sp.setStrSTATUT(commonparameter.statut_delete);
                    return sp;
                }).forEachOrdered((sp) -> {
                    this.getOdataManager().getEm().merge(sp);
                });
                OClientTiersPayant.setStrSTATUT(commonparameter.statut_delete);
                this.getOdataManager().getEm().merge(OClientTiersPayant);
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                }
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer ce tiers payant associé au client courant");
        }

    }

    public TCompteClientTiersPayant createComptecltTierspayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID,
            int int_POURCENTAGE, int int_PRIORITY, double dbl_PLAFOND, double dbl_QUOTA_CONSO_VENTE,
            String str_NUMERO_SECURITE_SOCIAL, Integer dbPLAFONDENCOURS, boolean b_IsAbsolute) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        try {
            TTiersPayant OTTiersPayant = this.getTTiersPayant(lg_TIERS_PAYANT_ID);
            TCompteClient OTCompteClient = new clientManagement(this.getOdataManager())
                    .getTCompteClient(lg_COMPTE_CLIENT_ID);

            if (OTTiersPayant != null && OTCompteClient != null) {
                if (!this.isTiersPayantExistForCptltTiersP(OTCompteClient.getLgCOMPTECLIENTID(),
                        OTTiersPayant.getLgTIERSPAYANTID())) {
                    if (!this.isRegimeExistForCptltTiersP(OTCompteClient.getLgCOMPTECLIENTID(), int_PRIORITY)) {
                        OTCompteClientTiersPayant = this.createTCompteClientTiersPayant(OTCompteClient, OTTiersPayant,
                                int_POURCENTAGE, int_PRIORITY, dbl_PLAFOND, dbl_QUOTA_CONSO_VENTE,
                                str_NUMERO_SECURITE_SOCIAL, dbPLAFONDENCOURS, b_IsAbsolute);

                    }
                }
            } else {
                this.buildErrorTraceMessage("Echec d'ajout de ce tiers payant au client séléctionné");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout de ce tiers payant au client séléctionné");
        }

        return OTCompteClientTiersPayant;
    }

    private void createAyantdroit(TClient OClient, String lg_TYPE_CLIENT_ID) {

        try {
            TTypeClient OTTypeClient = this.getOdataManager().getEm().find(TTypeClient.class, lg_TYPE_CLIENT_ID);
            if (!"2".equals(lg_TYPE_CLIENT_ID)) {

                TAyantDroit OTAyantDroit = new TAyantDroit();

                OTAyantDroit.setLgAYANTSDROITSID(this.getKey().getComplexId());
                OTAyantDroit.setStrFIRSTNAME(OClient.getStrFIRSTNAME());
                OTAyantDroit.setStrLASTNAME(OClient.getStrLASTNAME());

                OTAyantDroit.setStrCODEINTERNE(this.getKey().getShortId(6));
                // lg_CLIENT_ID

                OTAyantDroit.setLgCLIENTID(OClient);

                OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
                OTAyantDroit.setDtCREATED(new Date());
                this.getOdataManager().getEm().persist(OTAyantDroit);

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            }
            OClient.setLgTYPECLIENTID(OTTypeClient);
            OClient.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OClient);
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de création de l'ayant droit");
            e.printStackTrace();
        }

    }

    // fonction d'ajout de tierspayant lors de la transfromation d'une proforma en une vente
    public TCompteClientTiersPayant createCompteClientTiersPayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID,
            int int_POURCENTAGE, int int_PRIORITY, String lg_TYPE_CLIENT_ID) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        try {
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            TTiersPayant OTTiersPayant = this.getTTiersPayant(lg_TIERS_PAYANT_ID);
            TCompteClient OTCompteClient = new clientManagement(this.getOdataManager())
                    .getTCompteClient(lg_COMPTE_CLIENT_ID);

            OTCompteClientTiersPayant = new TCompteClientTiersPayant();
            OTCompteClientTiersPayant.setLgCOMPTECLIENTTIERSPAYANTID(this.getKey().getComplexId());
            OTCompteClientTiersPayant.setLgCOMPTECLIENTID(OTCompteClient);
            OTCompteClientTiersPayant.setLgTIERSPAYANTID(OTTiersPayant);
            OTCompteClientTiersPayant.setIntPOURCENTAGE(int_POURCENTAGE);
            OTCompteClientTiersPayant.setIntPRIORITY(int_PRIORITY);
            OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClientTiersPayant.setDtCREATED(new Date());
            this.getOdataManager().getEm().persist(OTCompteClientTiersPayant);
            createAyantdroit(OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID(), lg_TYPE_CLIENT_ID);
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
            }
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant au client en cours");
        }
        return OTCompteClientTiersPayant;
    }

    public JSONArray getByTiersPayant(String lgID, String dt_start, String dt_end, String search, int start,
            int limit) {
        List<Object[]> data = new ArrayList<>();
        JSONArray arra = new JSONArray();

        try {
            data = this.getOdataManager().getEm().createQuery(
                    "SELECT  COUNT(o) AS NB,SUM(o.intPRICE) AS MONTANT,o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strCODEORGANISME,o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME,o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID  FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND (o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME LIKE ?2 OR o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strCODEORGANISME LIKE ?2 ) AND  FUNCTION('DATE', o.lgPREENREGISTREMENTID.dtUPDATED) BETWEEN ?3 AND ?4 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.intPRICE >0  GROUP BY o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID,o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strCODEORGANISME,o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME ORDER BY o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT,o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME")
                    .setParameter(1, lgID + "%").setParameter(2, search + "%")
                    .setParameter(3, java.sql.Date.valueOf(dt_start)).setParameter(4, java.sql.Date.valueOf(dt_end))
                    .setFirstResult(start).setMaxResults(limit).getResultList();
            int count = 1;
            JSONObject Totaux = this.getTotauxTP(lgID, dt_start, dt_end, search);
            System.out.println("Totaux " + Totaux.toString());
            for (Object[] ob : data) {
                JSONObject json = new JSONObject();
                json.put("ID", count);
                json.put("TPNAME", ob[3]);
                json.put("CODE", ob[2]);
                json.put("NBBON", ob[0]);
                json.put("MONTANTVENTE", ob[1]);

                json.put("TOTALMONTANT", Totaux.get("TOTALMONTANT"));
                json.put("TOTALBON", Totaux.get("TOTALBON"));
                arra.put(json);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return arra;
    }

    public JSONObject getTotauxTP(String lgID, String dt_start, String dt_end, String search) {
        List<Object[]> data = new ArrayList<>();
        JSONObject json = new JSONObject();
        try {
            data = this.getOdataManager().getEm().createQuery(
                    "SELECT  COUNT(o) AS NB,SUM(o.intPRICE) AS MONTANT,o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID  FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND (o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME LIKE ?2 OR o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strCODEORGANISME LIKE ?2 ) AND  FUNCTION('DATE', o.lgPREENREGISTREMENTID.dtUPDATED) BETWEEN ?3 AND ?4 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.intPRICE >0")
                    .setParameter(1, lgID + "%").setParameter(2, search + "%")
                    .setParameter(3, java.sql.Date.valueOf(dt_start)).setParameter(4, java.sql.Date.valueOf(dt_end))
                    .getResultList();
            int count = 1;
            for (Object[] ob : data) {

                json.put("TOTALBON", ob[0]);
                json.put("TOTALMONTANT", ob[1]);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public int countTP(String lgID, String dt_start, String dt_end, String search) {
        List<Object[]> data = new ArrayList<>();
        int count = 0;
        try {
            data = this.getOdataManager().getEm().createQuery(
                    "SELECT  COUNT(o) AS NB FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?1 AND (o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strFULLNAME LIKE ?2 OR o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strCODEORGANISME LIKE ?2 ) AND  FUNCTION('DATE', o.lgPREENREGISTREMENTID.dtUPDATED) BETWEEN ?3 AND ?4 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.intPRICE >0 GROUP BY o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID ")
                    .setParameter(1, lgID + "%").setParameter(2, search + "%")
                    .setParameter(3, java.sql.Date.valueOf(dt_start)).setParameter(4, java.sql.Date.valueOf(dt_end))
                    .getResultList();
            count = data.size();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

}
