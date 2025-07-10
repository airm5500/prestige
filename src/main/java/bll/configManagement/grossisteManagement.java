/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import dal.TGrossiste;

import bll.bllBase;
import bll.entity.EntityData;
import dal.Groupefournisseur;
import dal.TTypeReglement;
import dal.TVille;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class grossisteManagement extends bllBase {

    Object Otable = TGrossiste.class;

    public grossisteManagement(dataManager OdataManager) {
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    private Groupefournisseur findDefault(String groupeId) {
        try {
            if (StringUtils.isNotEmpty(groupeId)) {
                return this.getOdataManager().getEm().find(Groupefournisseur.class, Integer.valueOf(groupeId));
            }
            return this.getOdataManager().getEm().find(Groupefournisseur.class, 5);
        } catch (Exception e) {
            return null;
        }
    }

    public void create(String str_LIBELLE, String str_DESCRIPTION, String str_ADRESSE_RUE_1, String str_ADRESSE_RUE_2,
            String str_CODE_POSTAL, String str_BUREAU_DISTRIBUTEUR, String str_MOBILE, String str_TELEPHONE,
            int int_DELAI_REGLEMENT_AUTORISE, String lg_TYPE_REGLEMENT_ID, String lg_VILLE_ID,
            Double dbl_CHIFFRE_DAFFAIRE, String str_CODE, int int_DELAI_REAPPROVISIONNEMENT, int int_COEF_SECURITY,
            int int_DATE_BUTOIR_ARTICLE, String groupeId, String idrepartiteur) {

        try {

            if (this.isGrossisteExist(str_CODE)) {
                return;
            }

            TGrossiste OTGrossiste = new TGrossiste();

            OTGrossiste.setLgGROSSISTEID(this.getKey().getComplexId());
            OTGrossiste.setStrLIBELLE(str_LIBELLE);
            OTGrossiste.setStrDESCRIPTION(str_DESCRIPTION);
            OTGrossiste.setStrADRESSERUE1(str_ADRESSE_RUE_1);
            OTGrossiste.setStrADRESSERUE2(str_ADRESSE_RUE_2);
            OTGrossiste.setStrCODE(str_CODE);
            OTGrossiste.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTGrossiste.setStrBUREAUDISTRIBUTEUR(str_BUREAU_DISTRIBUTEUR);
            OTGrossiste.setStrMOBILE(str_MOBILE);
            OTGrossiste.setDblCHIFFREDAFFAIRE(dbl_CHIFFRE_DAFFAIRE);
            OTGrossiste.setStrTELEPHONE(str_TELEPHONE);
            OTGrossiste.setIntDELAIREGLEMENTAUTORISE(int_DELAI_REGLEMENT_AUTORISE);
            OTGrossiste.setIntCOEFSECURITY(int_COEF_SECURITY);
            OTGrossiste.setIntDATEBUTOIRARTICLE(int_DATE_BUTOIR_ARTICLE);
            OTGrossiste.setIntDELAIREAPPROVISIONNEMENT(int_DELAI_REAPPROVISIONNEMENT);
            OTGrossiste.setGroupeId(findDefault(groupeId));
            OTGrossiste.setIdRepartiteur(idrepartiteur);

            // lg_VILLE_ID
            TVille OTVille = getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTGrossiste.setLgVILLEID(OTVille);
            }

            // lg_TYPE_REGLEMENT_ID
            if ("".equals(lg_TYPE_REGLEMENT_ID)) {
                lg_TYPE_REGLEMENT_ID = "1";
            }
            TTypeReglement OTTypeReglement = getOdataManager().getEm().find(TTypeReglement.class, lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement != null) {
                OTGrossiste.setLgTYPEREGLEMENTID(OTTypeReglement);
            }

            OTGrossiste.setStrSTATUT(commonparameter.statut_enable);
            OTGrossiste.setDtCREATED(new Date());

            this.persiste(OTGrossiste);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le grossiste");
        }

    }

    public void update(String lg_GROSSISTE_ID, String str_LIBELLE, String str_DESCRIPTION, String str_ADRESSE_RUE_1,
            String str_ADRESSE_RUE_2, String str_CODE_POSTAL, String str_BUREAU_DISTRIBUTEUR, String str_MOBILE,
            String str_TELEPHONE, int int_DELAI_REGLEMENT_AUTORISE, String lg_TYPE_REGLEMENT_ID, String lg_VILLE_ID,
            String str_CODE, int int_DELAI_REAPPROVISIONNEMENT, int int_COEF_SECURITY, int int_DATE_BUTOIR_ARTICLE,
            String groupeId, String idrepartiteur) {

        try {

            TGrossiste OTGrossiste;

            OTGrossiste = this.getGrossiste(lg_GROSSISTE_ID);

            if (!OTGrossiste.getStrCODE().equalsIgnoreCase(str_CODE)) {
                if (this.isGrossisteExist(str_CODE)) {
                    return;
                }
            }

            // lg_VILLE_ID
            dal.TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
            if (OTVille != null) {
                OTGrossiste.setLgVILLEID(OTVille);
                new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
            }

            // lg_TYPE_REGLEMENT_ID
            if ("".equals(lg_TYPE_REGLEMENT_ID)) {
                lg_TYPE_REGLEMENT_ID = "1";
            }
            dal.TTypeReglement OTTypeReglement = getOdataManager().getEm().find(dal.TTypeReglement.class,
                    lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement != null) {
                OTGrossiste.setLgTYPEREGLEMENTID(OTTypeReglement);
            }

            OTGrossiste.setStrLIBELLE(str_LIBELLE);
            OTGrossiste.setStrDESCRIPTION(str_DESCRIPTION);
            OTGrossiste.setStrADRESSERUE1(str_ADRESSE_RUE_1);
            OTGrossiste.setStrADRESSERUE2(str_ADRESSE_RUE_2);
            OTGrossiste.setStrCODE(str_CODE);
            OTGrossiste.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTGrossiste.setStrBUREAUDISTRIBUTEUR(str_BUREAU_DISTRIBUTEUR);
            OTGrossiste.setStrMOBILE(str_MOBILE);
            OTGrossiste.setStrTELEPHONE(str_TELEPHONE);
            OTGrossiste.setIntDELAIREGLEMENTAUTORISE(int_DELAI_REGLEMENT_AUTORISE);

            OTGrossiste.setIntCOEFSECURITY(int_COEF_SECURITY);
            OTGrossiste.setIntDATEBUTOIRARTICLE(int_DATE_BUTOIR_ARTICLE);
            OTGrossiste.setIntDELAIREAPPROVISIONNEMENT(int_DELAI_REAPPROVISIONNEMENT);

            OTGrossiste.setStrSTATUT(commonparameter.statut_enable);
            OTGrossiste.setDtUPDATED(new Date());
            OTGrossiste.setGroupeId(findDefault(groupeId));
            OTGrossiste.setIdRepartiteur(idrepartiteur);
            this.persiste(OTGrossiste);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du grossiste");
        }

    }

    // recuperation grossiste
    public TGrossiste getGrossiste(String lg_GROSSISTE_ID) {
        TGrossiste OTGrossiste = null;
        try {
            OTGrossiste = (TGrossiste) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TGrossiste t WHERE (t.lgGROSSISTEID = ?1 OR t.strLIBELLE = ?1 OR t.strCODE = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_GROSSISTE_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTGrossiste;
    }

    // fin recuperation grossiste
    // suppression grossiste
    public boolean deleteGrossiste(String lg_GROSSISTE_ID) {
        TGrossiste OGrossiste = null;
        boolean isDeleted = false;
        try {
            OGrossiste = this.getGrossiste(lg_GROSSISTE_ID);
            if (this.delete(OGrossiste)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                isDeleted = true;
            } else {
                this.buildErrorTraceMessage(
                        "Impossible de supprimer un grossiste qui a déjà subit une transaction dans le système");
            }
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de suppression ou  grossiste inexistant");
        }
        return isDeleted;
    }

    public List<TGrossiste> getListeGrossiste(String search_value, String lg_GROSSISTE_ID) {
        List<TGrossiste> lstTGrossiste = new ArrayList<TGrossiste>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTGrossiste = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TGrossiste t WHERE t.lgGROSSISTEID LIKE ?1 AND (t.strLIBELLE LIKE ?2 OR t.strCODE LIKE ?2) AND t.strSTATUT LIKE ?3 ORDER BY t.strDESCRIPTION ASC")
                    .setParameter(1, lg_GROSSISTE_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTGrossiste taille " + lstTGrossiste.size());

        return lstTGrossiste;
    }

    public boolean isGrossisteExist(String str_CODE) {
        boolean result = false;
        TGrossiste OTGrossiste = null;
        try {

            OTGrossiste = (TGrossiste) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TGrossiste t WHERE t.strCODE = ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, str_CODE).setParameter(2, commonparameter.statut_enable).getSingleResult();
            if (OTGrossiste != null) {
                this.buildErrorTraceMessage(
                        "Désolé. Le grossiste " + OTGrossiste.getStrDESCRIPTION() + " a déjà le code " + str_CODE);
                result = true;
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }

        return result;
    }

    // exportation des clients
    public String generateEnteteForFile() {
        return "CODE;NOM;DESCRIPTION;ADRESSE;TELEPHONE;VILLE;CHIFFRE D'AFFAIRE";
    }

    public List<String> generateDataToExport() {
        List<String> lst = new ArrayList<String>();
        List<TGrossiste> lstTGrossiste = new ArrayList<TGrossiste>();
        String row = "";

        try {
            lstTGrossiste = this.getListeGrossiste("", "%%");
            for (TGrossiste OTGrossiste : lstTGrossiste) {
                row += OTGrossiste.getStrCODE() + ";" + OTGrossiste.getStrDESCRIPTION() + ";";
                row += (OTGrossiste.getStrADRESSERUE1() != null ? OTGrossiste.getStrADRESSERUE1() : " ") + ";";
                row += (OTGrossiste.getStrTELEPHONE() != null ? OTGrossiste.getStrTELEPHONE() : " ") + ";";
                row += (OTGrossiste.getLgVILLEID() != null ? OTGrossiste.getLgVILLEID().getStrName() : " ") + ";";
                row += (OTGrossiste.getDblCHIFFREDAFFAIRE() != null ? OTGrossiste.getDblCHIFFREDAFFAIRE() : "0") + ";";

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
    // liste des grossistes d'un inventaire
    public List<TGrossiste> getListGrossisteFromInventaire(String search_value, String lg_INVENTAIRE_ID) {
        List<TGrossiste> lstTGrossiste = new ArrayList<TGrossiste>();
        TGrossiste OTGrossiste = null;
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT DISTINCT(t.lg_GROSSISTE_ID), t.str_LIBELLE FROM t_grossiste t, t_inventaire_famille i, t_famille f WHERE f.lg_GROSSISTE_ID = t.lg_GROSSISTE_ID AND f.lg_FAMILLE_ID = i.lg_FAMILLE_ID AND (t.str_LIBELLE LIKE '"
                    + search_value + "%' OR t.str_CODE LIKE '" + search_value + "%' OR t.str_DESCRIPTION LIKE '"
                    + search_value + "%') AND i.lg_INVENTAIRE_ID = '" + lg_INVENTAIRE_ID + "' ORDER BY t.str_LIBELLE";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OTGrossiste = new TGrossiste();
                OTGrossiste.setLgGROSSISTEID(Ojconnexion.get_resultat().getString("lg_GROSSISTE_ID"));
                OTGrossiste.setStrLIBELLE(Ojconnexion.get_resultat().getString("str_LIBELLE"));
                lstTGrossiste.add(OTGrossiste);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTGrossiste taille " + lstTGrossiste.size());
        return lstTGrossiste;
    }

    // fin liste des grossistes d'un inventaire
}
