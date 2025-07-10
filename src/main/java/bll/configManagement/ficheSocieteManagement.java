/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TFicheSociete;

import bll.bllBase;
import dal.TEscompteSociete;
import dal.TVille;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class ficheSocieteManagement extends bllBase {

    Object Otable = TFicheSociete.class;

    public ficheSocieteManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE_INTERNE, String str_LIBELLE_ENTREPRISE, String str_TYPE_SOCIETE,
            String str_CODE_REGROUPEMENT, String str_CONTACTS_TELEPHONIQUES, String str_COMPTE_COMPTABLE,
            double dbl_CHIFFRE_AFFAIRE, String str_DOMICIALIATION_BANCAIRE, String str_RIB_SOCIETE,
            String str_CODE_EXONERATION_TVA, String str_CODE_REMISE, boolean bool_CLIENT_EN_COMPTE, boolean bool_LIVRE,
            double dbl_REMISE_SUPPLEMENTAIRE, double dbl_MONTANT_PORT, int int_ECHEANCE_PAIEMENT,
            boolean bool_EDIT_FACTION_FIN_VENTE, String str_CODE_FACTURE, String str_CODE_BON_LIVRAISON,
            String str_RAISON_SOCIALE, String str_ADRESSE_PRINCIPALE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL,
            String str_BUREAU_DISTRIBUTEUR, String lg_VILLE_ID, String lg_ESCOMPTE_SOCIETE_ID) {

        try {

            TFicheSociete OTFicheSociete = new TFicheSociete();

            OTFicheSociete.setLgFICHESOCIETEID(this.getKey().getComplexId());
            OTFicheSociete.setStrCODEINTERNE(str_CODE_INTERNE);
            OTFicheSociete.setStrLIBELLEENTREPRISE(str_LIBELLE_ENTREPRISE);
            OTFicheSociete.setStrTYPESOCIETE(str_TYPE_SOCIETE);
            OTFicheSociete.setStrCODEREGROUPEMENT(str_CODE_REGROUPEMENT);
            OTFicheSociete.setStrCONTACTSTELEPHONIQUES(str_CONTACTS_TELEPHONIQUES);
            OTFicheSociete.setStrCOMPTECOMPTABLE(str_COMPTE_COMPTABLE);
            OTFicheSociete.setDblCHIFFREAFFAIRE(dbl_CHIFFRE_AFFAIRE);
            OTFicheSociete.setStrDOMICIALIATIONBANCAIRE(str_DOMICIALIATION_BANCAIRE);
            OTFicheSociete.setStrRIBSOCIETE(str_RIB_SOCIETE);
            OTFicheSociete.setStrCODEEXONERATIONTVA(str_CODE_EXONERATION_TVA);
            OTFicheSociete.setStrCODEREMISE(str_CODE_REMISE);
            OTFicheSociete.setBoolCLIENTENCOMPTE(bool_CLIENT_EN_COMPTE);
            OTFicheSociete.setBoolLIVRE(bool_LIVRE);
            OTFicheSociete.setDblREMISESUPPLEMENTAIRE(dbl_REMISE_SUPPLEMENTAIRE);
            OTFicheSociete.setDblMONTANTPORT(dbl_MONTANT_PORT);
            OTFicheSociete.setIntECHEANCEPAIEMENT(int_ECHEANCE_PAIEMENT);
            OTFicheSociete.setBoolEDITFACTIONFINVENTE(bool_EDIT_FACTION_FIN_VENTE);
            OTFicheSociete.setStrCODEFACTURE(str_CODE_FACTURE);
            OTFicheSociete.setStrCODEBONLIVRAISON(str_CODE_BON_LIVRAISON);
            OTFicheSociete.setStrRAISONSOCIALE(str_RAISON_SOCIALE);
            OTFicheSociete.setStrADRESSEPRINCIPALE(str_ADRESSE_PRINCIPALE);
            OTFicheSociete.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTFicheSociete.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTFicheSociete.setStrBUREAUDISTRIBUTEUR(str_BUREAU_DISTRIBUTEUR);

            // lg_VILLE_ID
            TVille OTVille = getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTFicheSociete.setLgVILLEID(OTVille);
                new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
            }

            // lg_ESCOMPTE_SOCIETE_ID
            TEscompteSociete OTEscompteSociete = getOdataManager().getEm().find(TEscompteSociete.class,
                    lg_ESCOMPTE_SOCIETE_ID);
            if (OTEscompteSociete != null) {
                OTFicheSociete.setLgESCOMPTESOCIETEID(OTEscompteSociete);
                new logger().oCategory.info("lg_ESCOMPTE_SOCIETE_ID     Create   " + lg_ESCOMPTE_SOCIETE_ID);
            }

            OTFicheSociete.setStrSTATUT(commonparameter.statut_enable);
            OTFicheSociete.setDtCREATED(new Date());

            this.persiste(OTFicheSociete);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_FICHE_SOCIETE_ID, String str_CODE_INTERNE, String str_LIBELLE_ENTREPRISE,
            String str_TYPE_SOCIETE, String str_CODE_REGROUPEMENT, String str_CONTACTS_TELEPHONIQUES,
            String str_COMPTE_COMPTABLE, double dbl_CHIFFRE_AFFAIRE, String str_DOMICIALIATION_BANCAIRE,
            String str_RIB_SOCIETE, String str_CODE_EXONERATION_TVA, String str_CODE_REMISE,
            boolean bool_CLIENT_EN_COMPTE, boolean bool_LIVRE, double dbl_REMISE_SUPPLEMENTAIRE,
            double dbl_MONTANT_PORT, int int_ECHEANCE_PAIEMENT, boolean bool_EDIT_FACTION_FIN_VENTE,
            String str_CODE_FACTURE, String str_CODE_BON_LIVRAISON, String str_RAISON_SOCIALE,
            String str_ADRESSE_PRINCIPALE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL,
            String str_BUREAU_DISTRIBUTEUR, String lg_VILLE_ID, String lg_ESCOMPTE_SOCIETE_ID) {

        try {

            TFicheSociete OTFicheSociete = null;

            OTFicheSociete = getOdataManager().getEm().find(TFicheSociete.class, lg_FICHE_SOCIETE_ID);

            // lg_VILLE_ID
            dal.TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTFicheSociete.setLgVILLEID(OTVille);
                new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
            }

            // lg_ESCOMPTE_SOCIETE_ID
            dal.TEscompteSociete OTEscompteSociete = getOdataManager().getEm().find(dal.TEscompteSociete.class,
                    lg_ESCOMPTE_SOCIETE_ID);
            if (OTEscompteSociete != null) {
                OTFicheSociete.setLgESCOMPTESOCIETEID(OTEscompteSociete);
                new logger().oCategory.info("lg_ESCOMPTE_SOCIETE_ID     Create   " + lg_ESCOMPTE_SOCIETE_ID);
            }

            OTFicheSociete.setStrCODEINTERNE(str_CODE_INTERNE);
            OTFicheSociete.setStrLIBELLEENTREPRISE(str_LIBELLE_ENTREPRISE);
            OTFicheSociete.setStrTYPESOCIETE(str_TYPE_SOCIETE);
            OTFicheSociete.setStrCODEREGROUPEMENT(str_CODE_REGROUPEMENT);
            OTFicheSociete.setStrCONTACTSTELEPHONIQUES(str_CONTACTS_TELEPHONIQUES);
            OTFicheSociete.setStrCOMPTECOMPTABLE(str_COMPTE_COMPTABLE);
            OTFicheSociete.setDblCHIFFREAFFAIRE(dbl_CHIFFRE_AFFAIRE);
            OTFicheSociete.setStrDOMICIALIATIONBANCAIRE(str_DOMICIALIATION_BANCAIRE);
            OTFicheSociete.setStrRIBSOCIETE(str_RIB_SOCIETE);
            OTFicheSociete.setStrCODEEXONERATIONTVA(str_CODE_EXONERATION_TVA);
            OTFicheSociete.setStrCODEREMISE(str_CODE_REMISE);
            OTFicheSociete.setBoolCLIENTENCOMPTE(bool_CLIENT_EN_COMPTE);
            OTFicheSociete.setBoolLIVRE(bool_LIVRE);
            OTFicheSociete.setDblREMISESUPPLEMENTAIRE(dbl_REMISE_SUPPLEMENTAIRE);
            OTFicheSociete.setDblMONTANTPORT(dbl_MONTANT_PORT);
            OTFicheSociete.setIntECHEANCEPAIEMENT(int_ECHEANCE_PAIEMENT);
            OTFicheSociete.setBoolEDITFACTIONFINVENTE(bool_EDIT_FACTION_FIN_VENTE);
            OTFicheSociete.setStrCODEFACTURE(str_CODE_FACTURE);
            OTFicheSociete.setStrCODEBONLIVRAISON(str_CODE_BON_LIVRAISON);
            OTFicheSociete.setStrRAISONSOCIALE(str_RAISON_SOCIALE);
            OTFicheSociete.setStrADRESSEPRINCIPALE(str_ADRESSE_PRINCIPALE);
            OTFicheSociete.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTFicheSociete.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTFicheSociete.setStrBUREAUDISTRIBUTEUR(str_BUREAU_DISTRIBUTEUR);

            OTFicheSociete.setStrSTATUT(commonparameter.statut_enable);
            OTFicheSociete.setDtUPDATED(new Date());

            this.persiste(OTFicheSociete);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }
}
