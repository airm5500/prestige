/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stockManagement;

import bll.bllBase;
import bll.common.Parameter;
import bll.configManagement.familleManagement;
import bll.entity.EntityData;
import bll.preenregistrement.Preenregistrement;
import bll.teller.tellerManagement;
import bll.userManagement.privilege;
import bll.utils.TparameterManager;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import cust_barcode.barecodeManager;
import dal.TBonLivraisonDetail;
import dal.TEmplacement;
import dal.TEtiquette;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamilleZonegeo;
import dal.TFamille_;
import dal.TFamillearticle;
import dal.TGrossiste;
import dal.TOfficine;
import dal.TParameters;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TSnapShopDalySortieFamille;
import dal.TTypeStock;
import dal.TTypeStockFamille;
import dal.TTypeetiquette;
import dal.TUser;
import dal.TWarehouse;
import dal.TZoneGeographique;
import dal.dataManager;
import dal.jconnexion;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.Date;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class StockManager extends bllBase {

    public static PdfWriter writer;

    public StockManager() {
    }

    public StockManager(dataManager OdataManager) {
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    public StockManager(dataManager odataManager, TUser oTUser) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    // fonction pour determiner si le seuil mini est atteint
    public boolean isSeuilMiniProduitAtteint(String lg_FAMILLE_ID) {
        boolean result = false;
        try {
            TFamilleStock OFamilleStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgFAMILLEID.strSTATUT = ?2")
                    .setParameter("1", lg_FAMILLE_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();
            new logger().OCategory.info("Famille " + OFamilleStock.getLgFAMILLEID().getStrNAME() + " Stock dispo "
                    + OFamilleStock.getIntNUMBERAVAILABLE() + " Seuil mini "
                    + OFamilleStock.getLgFAMILLEID().getIntSEUILMIN() + " Seuil maxi "
                    + OFamilleStock.getLgFAMILLEID().getIntSEUILMAX());
            if (OFamilleStock.getIntNUMBER() <= OFamilleStock.getLgFAMILLEID().getIntSEUILMIN()) {
                result = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin fonction pour determiner si le seuil mini est atteint

    // Liste des produits par date famille de produit et par zone geo puis fournisseur
    public List<TFamilleStock> listTFamilleStocktPerDateAndByFamillearticleZoneGeoFournisseur(String search_value,
            String dt_DEBUT, String dt_FIN, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID,
            String lg_GROSSISTE_ID) {

        List<TFamilleStock> lstTFamilleStock = new ArrayList<TFamilleStock>();
        Date dtFin;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
                dt_DEBUT = "2014-04-20";
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
                    + " dans la fonction listTFamilleStocktPerDateAndByFamillearticleZoneGeoFournisseur lg_FAMILLEARTICLE_ID :"
                    + lg_FAMILLEARTICLE_ID + " lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID + " lg_GROSSISTE_ID "
                    + lg_GROSSISTE_ID);
            lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLESTOCKID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.lgFAMILLEID.dtCREATED BETWEEN ?4 AND ?5) AND (t.lgFAMILLEID.strNAME LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?7) ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                    .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, dtDEBUT).setParameter(5, dtFin)
                    .setParameter(6, "%" + search_value + "%").setParameter(7, "%" + search_value + "%")
                    .getResultList();
            new logger().OCategory.info("Taille liste " + lstTFamilleStock.size());
            for (TFamilleStock OTFamilleStock : lstTFamilleStock) {
                this.refresh(OTFamilleStock);
                new logger().OCategory.info("Famille " + OTFamilleStock.getLgFAMILLEID().getStrNAME());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTFamilleStock;
    }

    public List<TFamille> listTFamillePerDateAndByFamillearticleZoneGeoFournisseur(String search_value,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID) {

        List<TFamille> lstTFamille = new ArrayList<>();
        String lg_TYPE_STOCK_ID = "1";
        // Date dtFin;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase("1")) {
                lg_TYPE_STOCK_ID = "3";
            }
            // if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
            // dt_DEBUT = "2014-04-20";
            // new logger().OCategory.info("dt_DEBUT:" + dt_DEBUT);
            // }
            // if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
            // dtFin = new Date();
            // } else {
            // dtFin = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            // }
            // Date dtDEBUT = this.getKey().stringToDate(dt_DEBUT, this.getKey().formatterMysqlShort);
            // new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
            // new logger().OCategory.info("search_value " + search_value + " dans la fonction
            // listTFamillePerDateAndByFamillearticleZoneGeoFournisseur lg_FAMILLEARTICLE_ID :" + lg_FAMILLEARTICLE_ID +
            // " lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID + " lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
            try {

                int valeurEntier = Integer.parseInt(search_value);

                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.intPRICE = ?6 OR t.intPAF = ?7 OR t.intSEUILMAX = ?8 OR t.intSEUILMIN = ?9 OR t.intCIP LIKE ?10) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 ORDER BY t.strDESCRIPTION DESC")
                        .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, valeurEntier).setParameter(7, valeurEntier)
                        .setParameter(8, valeurEntier).setParameter(9, valeurEntier)
                        .setParameter(10, valeurEntier + "%")
                        .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                        .setParameter(12, lg_TYPE_STOCK_ID).getResultList();
                new logger().OCategory.info("valeurEntier " + valeurEntier);
            } catch (Exception e) {
                e.printStackTrace();
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION LIKE ?6 OR t.intCIP LIKE ?7) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 ORDER BY t.strDESCRIPTION DESC")
                        .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, search_value + "%")
                        .setParameter(7, search_value + "%")
                        .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                        .setParameter(12, lg_TYPE_STOCK_ID).getResultList();
            }

            /*
             * lstTFamille = this.getOdataManager().getEm().createQuery("SELECT t FROM TFamille t WHERE " +
             * "t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND " +
             * "t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION LIKE ?6 OR t.intCIP LIKE ?7 OR " +
             * "t.intPRICE LIKE ?8 OR t.intSEUILMIN LIKE ?9 OR t.intSEUILMAX LIKE ?10 OR t.intPAF " +
             * "LIKE ?11 t.intPAT LIKE ?12) ORDER BY t.strDESCRIPTION DESC") .setParameter(1,
             * lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID) .setParameter(3, lg_ZONE_GEO_ID).setParameter(6,
             * "%" + search_value + "%") .setParameter(7, "%" + search_value + "%").setParameter(8, "%" + search_value +
             * "%") .setParameter(9, "%" + search_value + "%").setParameter(10, "%" + search_value + "%")
             * .setParameter(11, "%" + search_value + "%").setParameter(12, "%" + search_value + "%") .getResultList();
             */
            /*
             * lstTFamille = this.getOdataManager().getEm().
             * createQuery("SELECT t FROM TFamille t WHERE t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION LIKE ?6 OR t.intCIP LIKE ?7)  ORDER BY t.strDESCRIPTION DESC"
             * ) .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID).setParameter(3,
             * lg_ZONE_GEO_ID).setParameter(6, "%" + search_value + "%").setParameter(7, "%" + search_value +
             * "%").getResultList();
             */
            new logger().OCategory.info("Taille liste " + lstTFamille.size());
            // for (TFamille OTFamille : lstTFamille) {
            // this.refresh(OTFamille);
            // new logger().OCategory.info("Famille " + OTFamille.getStrNAME());
            // }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTFamille;
    }

    public List<TTypeStockFamille> listTFamillePerDateAndByFamillearticleZoneGeoFournisseurBis(String search_value,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String lg_DCI_ID, int lignes) {

        List<TTypeStockFamille> lstTFamille = new ArrayList<>();
        String lg_TYPE_STOCK_ID = "1";

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase("1")) {
                lg_TYPE_STOCK_ID = "3";
            }
            try {

                int valeurEntier = Integer.parseInt(search_value);
                if (lignes > 0) {
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.intPRICE = ?6 OR t.intPAF = ?7 OR t.intSEUILMAX = ?8 OR t.intSEUILMIN = ?9 OR t.intCIP LIKE ?10 OR t.intEAN13 LIKE ?10 OR d.lgDCIID.strCODE LIKE ?10) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND d.lgDCIID.lgDCIID LIKE ?13 ORDER BY t.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, valeurEntier).setParameter(7, valeurEntier)
                            .setParameter(8, valeurEntier).setParameter(9, valeurEntier)
                            .setParameter(10, valeurEntier + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID).setMaxResults(lignes)
                            .getResultList();
                } else {
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.intPRICE = ?6 OR t.intPAF = ?7 OR t.intSEUILMAX = ?8 OR t.intSEUILMIN = ?9 OR t.intCIP LIKE ?10 OR t.intEAN13 LIKE ?10 OR d.lgDCIID.strCODE LIKE ?10) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND d.lgDCIID.lgDCIID LIKE ?13 ORDER BY t.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, valeurEntier).setParameter(7, valeurEntier)
                            .setParameter(8, valeurEntier).setParameter(9, valeurEntier)
                            .setParameter(10, valeurEntier + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID).getResultList();
                }
                new logger().OCategory.info("valeurEntier " + valeurEntier);
            } catch (Exception e) {
                // e.printStackTrace();
                if (lignes > 0) {
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION LIKE ?6 OR t.intCIP LIKE ?7 OR t.intEAN13 LIKE ?7 OR d.lgDCIID.strCODE LIKE ?7 OR d.lgDCIID.strNAME LIKE ?7) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND d.lgDCIID.lgDCIID LIKE ?13 ORDER BY t.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, search_value + "%")
                            .setParameter(7, search_value + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID).setMaxResults(lignes)
                            .getResultList();
                } else {
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION LIKE ?6 OR t.intCIP LIKE ?7 OR t.intEAN13 LIKE ?7 OR d.lgDCIID.strCODE LIKE ?7 OR d.lgDCIID.strNAME LIKE ?7) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND d.lgDCIID.lgDCIID LIKE ?13 ORDER BY t.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, search_value + "%")
                            .setParameter(7, search_value + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID).getResultList();
                }
            }

            // new logger().OCategory.info("Taille liste " + lstTFamille.size());
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTFamille;
    }

    public List<TTypeStockFamille> listTFamillePerDateAndByFamillearticleZoneGeoFournisseurBis(String search_value,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String lg_DCI_ID) {

        List<TTypeStockFamille> lstTFamille = new ArrayList<>();
        String lg_TYPE_STOCK_ID = "1";

        try {

            if (search_value == null || "".equals(search_value)) {
                search_value = "%%";
            }

            if (!this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equals("1")) {
                lg_TYPE_STOCK_ID = "3";
            }
            try {

                int valeurEntier = Integer.parseInt(search_value);

                if (lg_DCI_ID.equalsIgnoreCase("")) {
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.intPRICE = ?6 OR t.intPAF = ?7 OR t.intSEUILMAX = ?8 OR t.intSEUILMIN = ?9 OR t.intCIP LIKE ?10 OR t.intEAN13 LIKE ?10) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND t.strSTATUT=?13 ORDER BY t.strDESCRIPTION")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, valeurEntier).setParameter(7, valeurEntier)
                            .setParameter(8, valeurEntier).setParameter(9, valeurEntier)
                            .setParameter(10, valeurEntier + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, commonparameter.statut_enable)
                            .getResultList();
                } else {
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.intPRICE = ?6 OR t.intPAF = ?7 OR t.intSEUILMAX = ?8 OR t.intSEUILMIN = ?9 OR t.intCIP LIKE ?10 OR t.intEAN13 LIKE ?10 OR d.lgDCIID.strCODE LIKE ?10) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND d.lgDCIID.lgDCIID LIKE ?13 AND t.strSTATUT= ?14 ORDER BY t.strDESCRIPTION")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, valeurEntier).setParameter(7, valeurEntier)
                            .setParameter(8, valeurEntier).setParameter(9, valeurEntier)
                            .setParameter(10, valeurEntier + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID)
                            .setParameter(14, commonparameter.statut_enable).getResultList();
                }

                /*
                 * lstTFamille = this.getOdataManager().getEm().
                 * createQuery("SELECT tt FROM TFamille t, TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.intPRICE = ?6 OR t.intPAF = ?7 OR t.intSEUILMAX = ?8 OR t.intSEUILMIN = ?9 OR t.intCIP LIKE ?10 OR t.intEAN13 LIKE ?10 OR d.lgDCIID.strCODE LIKE ?10) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND d.lgDCIID.lgDCIID LIKE ?13 ORDER BY t.strDESCRIPTION"
                 * ) ancien bon code. a decommenter en cas de probleme .setParameter(1,
                 * lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID).setParameter(3,
                 * lg_ZONE_GEO_ID).setParameter(6, valeurEntier).setParameter(7, valeurEntier).setParameter(8,
                 * valeurEntier).setParameter(9, valeurEntier).setParameter(10, valeurEntier + "%").setParameter(11,
                 * this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).setParameter(12,
                 * lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID).getResultList();
                 */
                new logger().OCategory.info("valeurEntier " + valeurEntier);
            } catch (Exception e) {
                // e.printStackTrace();
                if (lg_DCI_ID.equalsIgnoreCase("%%")) {
                    new logger().OCategory.info("Dans le catch dci vide ");
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION LIKE ?6 OR t.intCIP LIKE ?7 OR t.intEAN13 LIKE ?7) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND t.strSTATUT='enable' ORDER BY t.strDESCRIPTION")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, search_value + "%")
                            .setParameter(7, search_value + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).getResultList();
                } else {
                    lstTFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT tt FROM TFamille t, TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION LIKE ?6 OR t.intCIP LIKE ?7 OR t.intEAN13 LIKE ?7 OR d.lgDCIID.strCODE LIKE ?7 OR d.lgDCIID.strNAME LIKE ?7) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND d.lgDCIID.lgDCIID LIKE ?13 AND t.strSTATUT='enable'ORDER BY t.strDESCRIPTION")
                            .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, search_value + "%")
                            .setParameter(7, search_value + "%")
                            .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                            .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID).getResultList();
                }
                // lstTFamille = this.getOdataManager().getEm().createQuery("SELECT tt FROM TFamille t,
                // TTypeStockFamille tt, TFamilleDci d WHERE d.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND
                // tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND
                // t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.strDESCRIPTION
                // LIKE ?6 OR t.intCIP LIKE ?7 OR t.intEAN13 LIKE ?7 OR d.lgDCIID.strCODE LIKE ?7 OR d.lgDCIID.strNAME
                // LIKE ?7) AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND
                // d.lgDCIID.lgDCIID LIKE ?13 ORDER BY t.strDESCRIPTION") //ancien bon code. a decommenter en cas de
                // probleme
                // .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID).setParameter(3,
                // lg_ZONE_GEO_ID).setParameter(6, search_value + "%").setParameter(7, search_value +
                // "%").setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).setParameter(12,
                // lg_TYPE_STOCK_ID).setParameter(13, lg_DCI_ID).getResultList();

            }

            // new logger().OCategory.info("Taille liste " + lstTFamille.size());
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTFamille;
    }

    // fin Liste des produits par date famille de produit et par zone geo puis fournisseur
    // liste des produits dormant
    public List<TFamille> listProductDormantPerDateAndByFamille(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID) {

        List<TSnapShopDalySortieFamille> lstTSnapShopDalySortieFamille = new ArrayList<TSnapShopDalySortieFamille>();
        List<TFamille> lstProductDormant = new ArrayList<TFamille>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            List<TFamille> lstTFamille = new ArrayList<TFamille>();
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE t.lgFAMILLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.intCIP LIKE ?3) AND t.strSTATUT = ?4")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value).setParameter(3, search_value)
                    .setParameter(4, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info("Taille liste " + lstTFamille.size());
            new logger().OCategory.info("dtDEBUT   " + dtDEBUT + " dtFin " + dtFin);
            for (TFamille OTFamille : lstTFamille) {
                lstTSnapShopDalySortieFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TSnapShopDalySortieFamille t WHERE (t.dtCREATED BETWEEN ?3 AND ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 ORDER BY t.lgFAMILLEID.strNAME DESC")
                        .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(6, OTFamille.getLgFAMILLEID())
                        .getResultList();
                // new logger().OCategory.info("Taille liste lstTSnapShopDalySortieFamille " +
                // lstTSnapShopDalySortieFamille.size());
                if (lstTSnapShopDalySortieFamille.size() == 0) {
                    lstProductDormant.add(OTFamille);
                } else {
                    new logger().OCategory
                            .info("Taille liste lstTSnapShopDalySortieFamille " + lstTSnapShopDalySortieFamille.size()
                                    + " balance " + lstTSnapShopDalySortieFamille.get(0).getIntBALANCE());
                }
            }

            /*
             * for (TSnapShopDalySortieFamille OTSnapShopDalySortieFamille : lstTSnapShopDalySortieFamille) {
             * this.refresh(OTSnapShopDalySortieFamille); new logger().OCategory.info("Famille " +
             * OTSnapShopDalySortieFamille.getLgFAMILLEID().getStrDESCRIPTION() + " nombre transaction " +
             * OTSnapShopDalySortieFamille.getIntNUMBERSORTIE()); /*if (OTSnapShopDalySortieFamille.getIntQUANTITY() <
             * int_QUANTITY_REQUIRED) { lstProductDormant.add(OTSnapShopDalySortieFamille); }
             *
             * }
             */
            new logger().OCategory.info("Taille liste lstProductDormant finale " + lstProductDormant.size());
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstProductDormant;
    }

    // derniere bonne version de la liste des articles vendus
    public List<EntityData> listProductDormantPerDateAndByFamille(String search_value, String dtDEBUT, String dtFin,
            String lg_FAMILLE_ID) {
        System.out.println("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
        List<EntityData> lstProductDormant = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "", lg_TYPE_STOCK_ID = commonparameter.PROCESS_SUCCESS;
        EntityData OEntityData = null;

        try {
            lg_TYPE_STOCK_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS) ? Parameter.STOCK_RAYON : Parameter.STOCK_DEPOT;
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            // String qry = "SELECT t.lg_FAMILLE_ID, t.int_CIP, t.str_DESCRIPTION, fs.int_NUMBER_AVAILABLE, t.int_PRICE,
            // t.int_PRICE_TIPS, t.int_PAF, t.int_PAT, z.str_CODE, z.str_LIBELLEE, (SELECT m.dt_UPDATED FROM t_mouvement
            // m, t_user u WHERE m.lg_USER_ID = u.lg_USER_ID AND t.lg_FAMILLE_ID = m.lg_FAMILLE_ID AND m.str_TYPE_ACTION
            // = '" + commonparameter.REMOVE + "' AND m.str_ACTION = '" + commonparameter.str_ACTION_VENTE + "' AND
            // u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' ORDER BY t.dt_UPDATED DESC LIMIT 1) AS dt_UPDATED
            // FROM t_famille t, t_famille_stock fs, t_zone_geographique z, t_famille_grossiste fg WHERE t.lg_FAMILLE_ID
            // = fg.lg_FAMILLE_ID AND t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID LIKE '" +
            // lg_EMPLACEMENT_ID + "' AND z.lg_ZONE_GEO_ID = t.lg_ZONE_GEO_ID AND (t.int_CIP LIKE '" + search_value +
            // "%' OR t.int_EAN13 LIKE '" + search_value + "%' OR t.str_DESCRIPTION LIKE '" + search_value + "%' OR
            // fg.str_CODE_ARTICLE LIKE '" + search_value + "%') AND fs.lg_FAMILLE_ID NOT IN (SELECT v.lg_FAMILLE_ID
            // FROM v_article_vendu v WHERE v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND v.lg_TYPE_STOCK_ID
            // = '" + lg_TYPE_STOCK_ID + "' AND (date(v.dt_UPDATED) >= '" + dtDEBUT + "' AND date(v.dt_UPDATED) <= '" +
            // dtFin + "')) GROUP BY t.lg_FAMILLE_ID ORDER BY t.str_DESCRIPTION"; //a decommenter en cas de probleme
            // 20/03/2017
            String qry = "SELECT t.lg_FAMILLE_ID, t.int_CIP, t.str_DESCRIPTION, fs.int_NUMBER_AVAILABLE, t.int_PRICE, t.int_PRICE_TIPS, t.int_PAF, t.int_PAT, z.str_CODE, z.str_LIBELLEE, (SELECT m.dt_UPDATED FROM  t_mouvement m, t_user u WHERE m.lg_USER_ID = u.lg_USER_ID AND t.lg_FAMILLE_ID = m.lg_FAMILLE_ID AND m.str_TYPE_ACTION = '"
                    + commonparameter.REMOVE + "' AND m.str_ACTION = '" + commonparameter.str_ACTION_VENTE
                    + "' AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' ORDER BY t.dt_UPDATED DESC LIMIT 1) AS dt_UPDATED FROM t_famille t, t_famille_stock fs, t_zone_geographique z, t_famille_grossiste fg WHERE t.lg_FAMILLE_ID = fg.lg_FAMILLE_ID AND t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND z.lg_ZONE_GEO_ID = t.lg_ZONE_GEO_ID AND (t.int_CIP LIKE '"
                    + search_value + "%' OR t.int_EAN13 LIKE '" + search_value + "%' OR t.str_DESCRIPTION LIKE '"
                    + search_value + "%' OR fg.str_CODE_ARTICLE LIKE '" + search_value
                    + "%') AND fs.lg_FAMILLE_ID NOT IN (SELECT pd.lg_FAMILLE_ID FROM t_preenregistrement p, t_preenregistrement_detail pd, t_user u, t_type_stock_famille tsf WHERE p.lg_PREENREGISTREMENT_ID = pd.lg_PREENREGISTREMENT_ID AND p.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID = tsf.lg_EMPLACEMENT_ID AND pd.lg_FAMILLE_ID = tsf.lg_FAMILLE_ID AND p.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' AND p.int_PRICE > 0 AND p.b_IS_CANCEL = 0 AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND (date(p.dt_UPDATED) >= '" + dtDEBUT + "' AND date(p.dt_UPDATED) <= '" + dtFin
                    + "') AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                    + "') GROUP BY t.lg_FAMILLE_ID ORDER BY t.str_DESCRIPTION";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();

                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_NUMBER_AVAILABLE"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_PRICE_TIPS"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_PAF"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_PAT"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("str_CODE"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_LIBELLEE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                lstProductDormant.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

            new logger().OCategory.info("Taille liste lstProductDormant finale " + lstProductDormant.size());
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstProductDormant;
    }
    // fin dernniere bonne version de la liste des articles vendus
    // fin liste des produits dormant

    // afficher la liste des ventes ou (ré)approvisionnement sur une période
    public List<TSnapShopDalySortieFamille> listTSnapShopDalySortieFamillePerDateAndByFamille(String search_value,
            Date dtDEBUT, Date dtFIN, String lg_FAMILLE_ID) {

        List<TSnapShopDalySortieFamille> lstTSnapShopDalySortieFamille = new ArrayList<TSnapShopDalySortieFamille>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("dtDEBUT   " + dtDEBUT + " dtFin " + dtFIN);

            // new logger().OCategory.info("search_value " + search_value + " dans la fonction
            // listTSnapShopDalySortieFamillePerDateAndByFamille ");
            lstTSnapShopDalySortieFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalySortieFamille t WHERE (t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?2) AND (t.dtCREATED BETWEEN ?3 AND ?4) AND (t.lgFAMILLEID.lgFAMILLEID LIKE ?6 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?7) ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                    .setParameter(3, dtDEBUT).setParameter(4, dtFIN).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, "%" + lg_FAMILLE_ID + "%").getResultList();

            // new logger().OCategory.info("Taille liste " + lstTSnapShopDalySortieFamille.size());
            for (TSnapShopDalySortieFamille OTSnapShopDalySortieFamille : lstTSnapShopDalySortieFamille) {
                this.refresh(OTSnapShopDalySortieFamille);
                // new logger().OCategory.info("Famille " +
                // OTSnapShopDalySortieFamille.getLgFAMILLEID().getStrCODEETIQUETTE() + " nombre transaction " +
                // OTSnapShopDalySortieFamille.getIntNUMBERTRANSACTION() + " quantité " +
                // OTSnapShopDalySortieFamille.getIntQUANTITY());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTSnapShopDalySortieFamille taille " + lstTSnapShopDalySortieFamille.size());
        return lstTSnapShopDalySortieFamille;
    }
    // fin afficher la liste des ventes ou (ré)approvisionnement sur une période

    // fonction pour determiner le nombre total de vente d'un produit sur une periode
    public int getNbreTotalVenteByProductByPeriod(String search_value, Date dt_DEBUT, Date dt_FIN,
            String lg_FAMILLE_ID) {
        int result = 0;
        List<TSnapShopDalySortieFamille> lstTSnapShopDalySortieFamille = new ArrayList<>();
        try {
            lstTSnapShopDalySortieFamille = this.listTSnapShopDalySortieFamillePerDateAndByFamille(search_value,
                    dt_DEBUT, dt_FIN, lg_FAMILLE_ID);
            // new logger().OCategory.info("Taille liste " + lstTSnapShopDalySortieFamille.size());
            for (TSnapShopDalySortieFamille OTSnapShopDalySortieFamille : lstTSnapShopDalySortieFamille) {
                this.refresh(OTSnapShopDalySortieFamille);
                // new logger().OCategory.info("Famille " + OTSnapShopDalySortieFamille.getLgFAMILLEID().getStrNAME() +
                // " nombre transaction " + OTSnapShopDalySortieFamille.getIntNUMBERTRANSACTION() + " quantité " +
                // OTSnapShopDalySortieFamille.getIntNUMBERSORTIE());
                result += OTSnapShopDalySortieFamille.getIntNUMBERSORTIE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("result " + result);
        return result;
    }
    // fin fonction pour determiner le nombre total de vente d'un produit sur une periode

    // fonction pour determiner la quantité moyenne de vente d'un produit sur une periode
    public double getMoyenVenteByProductByPeriod(String search_value, Date dt_DEBUT, Date dt_FIN,
            String lg_FAMILLE_ID) {
        int int_QUANTITE_VENTE = 0;
        float result = 0;
        long diffJour = 0;
        List<TSnapShopDalySortieFamille> lstTSnapShopDalySortieFamille = new ArrayList<>();
        try {
            lstTSnapShopDalySortieFamille = this.listTSnapShopDalySortieFamillePerDateAndByFamille(search_value,
                    dt_DEBUT, dt_FIN, lg_FAMILLE_ID);
            // new logger().OCategory.info("Taille liste " + lstTSnapShopDalySortieFamille.size());
            for (TSnapShopDalySortieFamille OTSnapShopDalySortieFamille : lstTSnapShopDalySortieFamille) {
                this.refresh(OTSnapShopDalySortieFamille);
                // new logger().OCategory.info("Famille " + OTSnapShopDalySortieFamille.getLgFAMILLEID().getStrNAME() +
                // " nombre transaction " + OTSnapShopDalySortieFamille.getIntNUMBERTRANSACTION() + " quantité " +
                // OTSnapShopDalySortieFamille.getIntNUMBERSORTIE());
                int_QUANTITE_VENTE += OTSnapShopDalySortieFamille.getIntNUMBERSORTIE();
            }
            // new logger().OCategory.info("quantité totale vente " + int_QUANTITE_VENTE);
            // Date dtDEBUT = this.getKey().stringToDate(dt_DEBUT, this.getKey().formatterMysqlShort);
            // Date dtFIN = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            if (lstTSnapShopDalySortieFamille.size() > 0) {
                diffJour = this.getKey().getDifferenceBetweenDate(dt_DEBUT, dt_FIN);
                if (diffJour == 0) {
                    diffJour = 1;
                }
                result = int_QUANTITE_VENTE / diffJour;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("result " + result);
        return result;
    }

    // fin fonction pour determiner la quantité moyenne de vente d'un produit sur une periode
    // Liste des produits périmés ou date probable de péromption
    public List<TFamilleStock> listTFamilleStocktPerimePerDateAndByFamille(String search_value, String lg_FAMILLE_ID,
            String dt_FIN) {

        List<TFamilleStock> lstTFamilleStock = new ArrayList<>();
        Date dtFin;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
                dtFin = new Date();
            } else {
                dtFin = this.getKey().stringToDate(dt_FIN, this.getKey().formatterMysqlShort);
            }

            new logger().OCategory.info(" dtFin " + dtFin);

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTFamilleStocktPerimePerDateAndByFamille lg_FAMILLE_ID :" + lg_FAMILLE_ID);
            lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.dtPEREMPTION <= ?2) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, dtFin).setParameter(3, "%" + search_value + "%")
                    .setParameter(4, "%" + search_value + "%").getResultList();
            new logger().OCategory.info("Taille liste " + lstTFamilleStock.size());
            for (TFamilleStock OTFamilleStock : lstTFamilleStock) {
                this.refresh(OTFamilleStock);
                new logger().OCategory.info("Famille " + OTFamilleStock.getLgFAMILLEID().getStrNAME());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTFamilleStock;
    }

    public List<TWarehouse> listTFamillePerimePerDate(String search_value, String lg_FAMILLE_ID,
            String lg_GROSSISTE_ID) {

        List<TWarehouse> lstTWarehouseFinal = new ArrayList<TWarehouse>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info(
                    "search_value  " + search_value + " dans la fonction listTFamillePerimePerDate lg_FAMILLE_ID :"
                            + lg_FAMILLE_ID + " lg_GROSSISTE_ID " + lg_GROSSISTE_ID);

            lstTWarehouseFinal = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION <= ?2) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?5 AND t.strSTATUT NOT LIKE ?6 ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, this.getKey().getLastDayofNextMonth())
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(5, lg_GROSSISTE_ID).setParameter(6, commonparameter.statut_delete).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste finale des périmés " + lstTWarehouseFinal.size());
        return lstTWarehouseFinal;
    }

    // liste des produits d'un bon de livraison
    public List<TBonLivraisonDetail> getListeLivraisonByProductAndGrossiste(String search_value, Date dtDEBUT,
            Date dtFin, String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {
        List<TBonLivraisonDetail> lsBonLivraisonDetails = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lsBonLivraisonDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraisonDetail t WHERE t.lgGROSSISTEID.lgGROSSISTEID LIKE ?1 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?2 AND (t.lgFAMILLEID.intCIP LIKE ?3 OR t.lgFAMILLEID.intEAN13 LIKE ?3 AND t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgBONLIVRAISONID.strREFLIVRAISON LIKE ?3) AND (t.lgBONLIVRAISONID.dtUPDATED >= ?4 AND t.lgBONLIVRAISONID.dtUPDATED <= ?5) AND t.lgBONLIVRAISONID.strSTATUT = ?6 ORDER BY t.lgBONLIVRAISONID.dtUPDATED")
                    .setParameter(1, lg_GROSSISTE_ID).setParameter(2, lg_FAMILLE_ID).setParameter(3, search_value + "%")
                    .setParameter(4, dtDEBUT).setParameter(5, dtFin).setParameter(6, commonparameter.statut_is_Closed)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lsBonLivraisonDetails;
    }
    // fin liste des produits d'un bon de livraison

    public List<TWarehouse> listTFamillePerimePerDate(String search_value, String lg_FAMILLE_ID) {

        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();
        List<TWarehouse> lstTWarehouseFinal = new ArrayList<TWarehouse>();
        Date dtFin;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTFamillePerimePerDate lg_FAMILLE_ID :" + lg_FAMILLE_ID);

            lstTWarehouseFinal = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION <= ?2) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT NOT LIKE ?6 ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, this.getKey().getLastDayofNextMonth())
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(6, commonparameter.statut_delete).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste finale des périmés " + lstTWarehouseFinal.size());
        return lstTWarehouseFinal;
    }

    // fin Liste des produits par date famille de produit et par zone geo puis fournisseur
    // ajout d'un article dans la liste des périmés
    public boolean addProductToPerime(String lg_WAREHOUSE_ID) {
        boolean result = false;
        try {
            TWarehouse OTWarehouse = this.getOdataManager().getEm().find(TWarehouse.class, lg_WAREHOUSE_ID);
            new logger().OCategory.info("Famille " + OTWarehouse.getLgFAMILLEID().getStrNAME());
            OTWarehouse.setDtPEREMPTION(new Date());
            OTWarehouse.setDtUPDATED(new Date());
            OTWarehouse.setStrSTATUT(commonparameter.statut_perime);
            if (this.persiste(OTWarehouse)) {
                // new SnapshotManager(this.getOdataManager(),
                // this.getOTUser()).SaveMouvementFamille(OTWarehouse.getLgFAMILLEID(), "", commonparameter.REMOVE,
                // commonparameter.str_ACTION_PERIME, OTWarehouse.getIntNUMBER()); Derniere bonne version. a decommenter
                // en cas de probleme
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout de l'article à la liste des périmés");
        }
        return result;
    }
    // fin ajout d'un article dans la liste des périmés

    // liste des entrées en stock de produit sur une période
    public List<TWarehouse> listEntreeStockDateAndByFamille(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_GROSSISTE_ID, String lg_USER_ID) {

        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgGROSSISTEID.lgGROSSISTEID LIKE ?5 AND (t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?2) AND (t.dtCREATED BETWEEN ?3 AND ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.lgUSERID.lgUSERID LIKE ?7 AND t.strSTATUT LIKE ?8 ORDER BY t.dtCREATED DESC")
                    .setParameter(5, lg_GROSSISTE_ID).setParameter(7, lg_USER_ID)
                    .setParameter(8, commonparameter.statut_enable).setParameter(1, "%" + search_value + "%")
                    .setParameter(2, "%" + search_value + "%").setParameter(3, dtDEBUT).setParameter(4, dtFin)
                    .setParameter(6, lg_FAMILLE_ID).getResultList();

            new logger().OCategory.info("lstTWarehouse size " + lstTWarehouse.size());
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                this.refresh(OTWarehouse);
                new logger().OCategory.info("Famille " + OTWarehouse.getLgFAMILLEID().getStrNAME() + " Fournisseur "
                        + OTWarehouse.getLgGROSSISTEID().getStrDESCRIPTION() + " date peromption "
                        + OTWarehouse.getDtPEREMPTION() + " date d'entree " + OTWarehouse.getDtCREATED());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTWarehouse;
    }
    // fin liste des entrées en stock de produit sur une période

    // liste des ventes sur une période
    // public List<TPreenregistrementDetail> listVenteDateAndByFamille(String search_value, String dt_DEBUT, String
    // dt_FIN, String lg_FAMILLE_ID, String lg_USER_ID) {
    public List<TPreenregistrementDetail> listVenteDateAndByFamille(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID) {

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        // Date dtFin;

        try {

            if (search_value == null || "".equals(search_value)) {
                search_value = "%%";
            }

            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?2 OR t.lgFAMILLEID.intEAN13 LIKE ?1 OR t.lgPREENREGISTREMENTID.strREF LIKE ?1 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?1 OR t.lgPREENREGISTREMENTID.lgUSERID.strFIRSTNAME LIKE ?10 OR t.lgPREENREGISTREMENTID.lgUSERID.strLASTNAME LIKE ?11) AND (t.lgPREENREGISTREMENTID.dtUPDATED >= ?3 AND t.lgPREENREGISTREMENTID.dtUPDATED <= ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?7 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?8 AND t.strSTATUT = ?9 ORDER BY t.lgPREENREGISTREMENTID.dtUPDATED, t.lgFAMILLEID.strDESCRIPTION")
                    .setParameter(1, search_value + "%").setParameter(2, search_value + "%").setParameter(3, dtDEBUT)
                    .setParameter(4, dtFin).setParameter(7, lg_FAMILLE_ID).setParameter(8, lg_USER_ID)
                    .setParameter(9, commonparameter.statut_is_Closed).setParameter(10, search_value + "%")
                    .setParameter(11, search_value + "%").getResultList();

            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                this.refresh(OTPreenregistrementDetail);

            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTPreenregistrementDetail;
    }
    // fin liste des ventes sur une période

    // Fonction pour la stat des ventes par année et par mois
    public List<StatistiqueVenteQuery> statistiqueVenteAnneMois(String id_famille) {
        List<StatistiqueVenteQuery> listStat = new ArrayList<StatistiqueVenteQuery>();

        try {

            jconnexion Ojconnexion = new jconnexion();
            String sql = "SELECT DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-01')) AS dt_month\n"
                    + ",SUM(int_QUANTITY_SERVED) qte_serv\n" + " FROM t_preenregistrement_detail \n"
                    + "where lg_FAMILLE_ID =" + id_famille + "\n"
                    + "GROUP BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-01'))\n"
                    + "ORDER BY DATE(DATE_FORMAT(dt_CREATED, '%Y-%m-01'))";

            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            Ojconnexion.set_Request(sql);
            ResultSet rs = Ojconnexion.get_resultat();

            while (rs.next()) {

                Date dt_date = rs.getDate("dt_month");
                int int_qte = rs.getInt("qte_serv");

                listStat.add(new StatistiqueVenteQuery(dt_date, int_qte));
            }

            System.out.println("statVente " + listStat.size());
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            System.out.println("ERROR " + e);
            listStat = null;

        }

        return listStat;
    }
    // Fin

    // fonction pour creer une etiquette
    public TEtiquette createEtiquette(String str_CODE, String str_NAME, TFamille OTFamille, String int_NUMBER) {
        TEtiquette OTEtiquette = null;
        try {
            OTEtiquette = new TEtiquette();
            OTEtiquette.setLgETIQUETTEID(this.getKey().getComplexId());
            OTEtiquette.setStrCODE(str_CODE);
            OTEtiquette.setStrNAME(str_NAME);
            OTEtiquette.setLgFAMILLEID(OTFamille);
            OTEtiquette.setStrSTATUT(commonparameter.statut_enable);
            OTEtiquette.setDtCREATED(new Date());
            OTEtiquette.setIntNUMBER(int_NUMBER);
            OTEtiquette.setLgEMPLACEMENTID(this.getOTUser().getLgEMPLACEMENTID());
            this.getOdataManager().getEm().persist(OTEtiquette);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
        }
        return OTEtiquette;
    }

    // code ajouté 13/04/2016
    public TEtiquette createEtiquette(String lg_FAMILLE_ID, String int_NUMBER, String str_STATUT) {
        TEtiquette OTEtiquette = null;
        TFamille OTFamille = null;
        try {
            OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            if (OTFamille == null) {
                this.buildErrorTraceMessage("Echec d'ajout. Article inexistant");
                return null;
            }
            OTEtiquette = this.getTEtiquetteByArticle(OTFamille.getLgFAMILLEID(), str_STATUT);
            if (OTEtiquette == null) {
                OTEtiquette = new TEtiquette();
                OTEtiquette.setLgETIQUETTEID(this.getKey().getComplexId());
                OTEtiquette.setStrCODE(this.getKey().getShortId(4) + "-" + OTFamille.getIntCIP() + "-"
                        + OTFamille.getIntPRICE() + "-" + OTFamille.getStrNAME());
                OTEtiquette.setStrNAME(OTFamille.getLgTYPEETIQUETTEID().getStrNAME());
                OTEtiquette.setLgTYPEETIQUETTEID(OTFamille.getLgTYPEETIQUETTEID());
                OTEtiquette.setLgFAMILLEID(OTFamille);
                OTEtiquette.setStrSTATUT(str_STATUT);
                OTEtiquette.setDtCREATED(new Date());
                OTEtiquette.setIntNUMBER("0");
            }

            OTEtiquette.setIntNUMBER(
                    String.valueOf(Integer.parseInt(OTEtiquette.getIntNUMBER()) + Integer.parseInt(int_NUMBER)));
            OTEtiquette.setDtUPDATED(new Date());
            this.persiste(OTEtiquette);
            // this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        new logger().OCategory.info("result " + OTEtiquette.getStrCODE());
        return OTEtiquette;
    }

    public TEtiquette getTEtiquetteByArticle(String lg_FAMILLE_ID, String str_STATUT) {
        TEtiquette OTEtiquette = null;
        try {
            OTEtiquette = (TEtiquette) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TEtiquette t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, str_STATUT).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTEtiquette;
    }

    public boolean updateQuantiteEtiquette(String lg_ETIQUETTE_ID, String int_NUMBER) {
        boolean result = false;
        TEtiquette OTEtiquette = null;
        try {
            OTEtiquette = this.getOdataManager().getEm().find(TEtiquette.class, lg_ETIQUETTE_ID);
            OTEtiquette.setIntNUMBER(int_NUMBER);
            OTEtiquette.setDtUPDATED(new Date());
            if (this.persiste(OTEtiquette)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise a jour de la quantité");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise a jour de la quantité");
        }
        return result;
    }
    // code ajouté 13/04/2016
    // fin fonction pour creer un type etiquette
    // fonction pour creer un type etiquette

    public boolean createTypeEtiquette(String str_NAME, String str_DESCRIPTION) {
        boolean result = false;
        try {
            TTypeetiquette OTTypeetiquette = new TTypeetiquette();
            OTTypeetiquette.setLgTYPEETIQUETTEID(this.getKey().getComplexId());
            OTTypeetiquette.setStrNAME(str_NAME);
            OTTypeetiquette.setStrDESCRIPTION(str_DESCRIPTION);
            OTTypeetiquette.setStrSTATUT(commonparameter.statut_enable);
            OTTypeetiquette.setDtCREATED(new Date());
            this.persiste(OTTypeetiquette);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de création de type étiquette");
        }
        return result;
    }
    // fin fonction pour creer un type etiquette

    // mise a jour de type d'etiquette
    public boolean updateTypeEtiquette(String lg_TYPEETIQUETTE_ID, String str_NAME, String str_DESCRIPTION) {
        boolean result = false;
        try {
            TTypeetiquette OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class,
                    lg_TYPEETIQUETTE_ID);
            OTTypeetiquette.setStrNAME(str_NAME);
            OTTypeetiquette.setStrDESCRIPTION(str_DESCRIPTION);
            OTTypeetiquette.setStrSTATUT(commonparameter.statut_enable);
            OTTypeetiquette.setDtUPDATED(new Date());
            this.persiste(OTTypeetiquette);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de mise à jout de type étiquette");
        }
        return result;
    }
    // fin mise a jour de type d'etiquette

    // fonction pour supprimer d'un typed d'etiquette
    public boolean deleteTypeEtiquette(String lg_TYPEETIQUETTE_ID) {
        boolean result = false;
        try {
            TTypeetiquette OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class,
                    lg_TYPEETIQUETTE_ID);
            OTTypeetiquette.setStrSTATUT(commonparameter.statut_delete);
            OTTypeetiquette.setDtUPDATED(new Date());
            this.persiste(OTTypeetiquette);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de suppression de type étiquette");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin fonction pour creer un type etiquette

    // fonction pour supprimer d'une d'etiquette
    public boolean deleteEtiquette(String lg_ETIQUETTE_ID) {
        boolean result = false;
        try {
            TEtiquette OTEtiquette = this.getOdataManager().getEm().find(TEtiquette.class, lg_ETIQUETTE_ID);
            OTEtiquette.setStrSTATUT(commonparameter.statut_delete);
            OTEtiquette.setDtUPDATED(new Date());
            this.persiste(OTEtiquette);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de suppression de type étiquette");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin fonction pour creer une etiquette

    // fonction pour creer une etiquette
    public TEtiquette createEtiquetteBis(String lg_TYPEETIQUETTE_ID, String lg_FAMILLE_ID, String int_NUMBER) {
        TEtiquette OTEtiquette = null;

        TTypeetiquette OTypeetiquette = null;
        TFamille OTFamille = null;
        try {
            OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            OTypeetiquette = this.getTypeetiquette(lg_TYPEETIQUETTE_ID, OTFamille);
            this.getOdataManager().BeginTransaction();
            OTEtiquette = this.createEtiquetteBis(OTypeetiquette, OTFamille, int_NUMBER);
            this.getOdataManager().CloseTransaction();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de l'étiquette");
        }
        return OTEtiquette;
    }

    public TEtiquette createEtiquetteBis(TTypeetiquette OTTypeetiquette, TFamille OFamille, String int_NUMBER) {
        TEtiquette OTEtiquette = null;
        String result = "";
        try {
            String str_NAME_TYPE_ETIQUETTE = OTTypeetiquette.getStrNAME();
            if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP")) {
                result = OFamille.getIntCIP();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP_PRIX")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-" + OFamille.getIntPRICE();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP_DESIGNATION")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-" + OFamille.getStrNAME();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP_PRIX_DESIGNATION")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-" + OFamille.getIntPRICE() + "-"
                        + OFamille.getStrNAME();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("POSITION")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getLgZONEGEOID().getStrLIBELLEE();
            } else {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-" + OFamille.getIntPRICE() + "-"
                        + OFamille.getStrNAME();
            }
            OTEtiquette = this.createEtiquette(result, str_NAME_TYPE_ETIQUETTE, OFamille, int_NUMBER);
            OTEtiquette.setLgTYPEETIQUETTEID(OTTypeetiquette);
            this.getOdataManager().getEm().merge(OTEtiquette);
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info("Dans le catch");
        }
        return OTEtiquette;
    }

    public TEtiquette createEtiquetteBis(TTypeetiquette OTTypeetiquette, TFamille OTFamille, TWarehouse OTWarehouse,
            String int_NUMBER) {
        TEtiquette OTEtiquette = null;
        try {
            OTEtiquette = this.createEtiquetteBis(OTTypeetiquette, OTFamille, int_NUMBER);
            OTEtiquette.setDtPEROMPTION(OTWarehouse.getDtPEREMPTION());
            this.getOdataManager().getEm().merge(OTEtiquette);
        } catch (Exception e) {
        }
        return OTEtiquette;
    }
    // fin fonction pour creer un type etiquette

    // liste des types etiquettes
    public List<TTypeetiquette> listeTypeetiquette(String search_value) {
        List<TTypeetiquette> lstTTypeetiquette = new ArrayList<>();
        try {
            if (search_value == null || search_value == "") {
                search_value = "%%";
            }
            lstTTypeetiquette = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeetiquette t WHERE (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.strSTATUT = ?3")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
        }
        new logger().OCategory.info("lstTTypeetiquette size " + lstTTypeetiquette.size());
        return lstTTypeetiquette;
    }
    // fin liste des types etiquettes

    // liste des etiquettes
    public List<TEtiquette> listeEtiquette(String search_value, String lg_TYPEETIQUETTE_ID, Date dtDEBUT, Date dtFin) {
        List<TEtiquette> lstTEtiquette = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            // new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin + " lg_TYPEETIQUETTE_ID " +
            // lg_TYPEETIQUETTE_ID);

            lstTEtiquette = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEtiquette t WHERE (t.strNAME LIKE ?1 OR t.strCODE LIKE ?2 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND (t.strSTATUT = ?3 OR t.strSTATUT = ?7) AND t.lgTYPEETIQUETTEID.lgTYPEETIQUETTEID LIKE ?4  AND (t.dtCREATED BETWEEN ?5 AND ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, lg_TYPEETIQUETTE_ID)
                    .setParameter(5, dtDEBUT).setParameter(6, dtFin).setParameter(7, commonparameter.statut_Read)
                    .setParameter(8, lg_EMPLACEMENT_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTEtiquette size " + lstTEtiquette.size());
        return lstTEtiquette;
    }

    public List<TEtiquette> listeEtiquette(String search_value, String str_STATUT) {
        List<TEtiquette> lstTEtiquette = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            lstTEtiquette = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEtiquette t WHERE (t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.strSTATUT = ?2 ORDER BY t.dtUPDATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, str_STATUT).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTEtiquette size " + lstTEtiquette.size());
        return lstTEtiquette;
    }

    // fin liste des etiquettes
    // fonction pour determiner la valeur de la TVA
    public int getCurrentTVA() {
        int result = 0;
        try {
            TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_TVA_VALUE");
            new logger().OCategory.info("Valeur de la TVA " + OTParameters.getStrVALUE());
            result = Integer.parseInt(OTParameters.getStrVALUE());
        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    // gestion des reserves
    // creer type stock
    public boolean createTypeStock(String str_NAME, String str_DESCRIPTION) {
        boolean result = false;
        try {
            TTypeStock OTTypeStock = new TTypeStock();
            OTTypeStock.setLgTYPESTOCKID(this.getKey().getComplexId());
            OTTypeStock.setStrNAME(str_NAME);
            OTTypeStock.setStrDESCRIPTION(str_DESCRIPTION);
            OTTypeStock.setDtCREATED(new Date());
            OTTypeStock.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTTypeStock);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de creation de type stock");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin creer type stock

    // mise a jour type stock
    public boolean updateTypeStock(String lg_TYPE_STOCK_ID, String str_NAME, String str_DESCRIPTION) {
        boolean result = false;
        try {
            TTypeStock OTTypeStock = this.getOdataManager().getEm().find(TTypeStock.class, lg_TYPE_STOCK_ID);
            OTTypeStock.setStrNAME(str_NAME);
            OTTypeStock.setStrDESCRIPTION(str_DESCRIPTION);
            OTTypeStock.setDtUPDATED(new Date());
            OTTypeStock.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTTypeStock);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de type stock");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin mise a jour type stock

    // suppression type stock
    public boolean deleteTypeStock(String lg_TYPE_STOCK_ID) {
        boolean result = false;
        try {
            TTypeStock OTTypeStock = this.getOdataManager().getEm().find(TTypeStock.class, lg_TYPE_STOCK_ID);
            OTTypeStock.setDtUPDATED(new Date());
            OTTypeStock.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTTypeStock);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de type stock");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin suppression type stock

    // liste type stock
    public List<TTypeStock> listeTTypeStock(String search_value, String lg_TYPE_STOCK_ID) {
        List<TTypeStock> lstTTypeStock = new ArrayList<TTypeStock>();
        if (search_value.equalsIgnoreCase("") || search_value == null) {
            search_value = "%%";
        }
        lstTTypeStock = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TTypeStock t WHERE t.lgTYPESTOCKID = ?1 AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3) AND t.strSTATUT = ?4")
                .setParameter(1, lg_TYPE_STOCK_ID).setParameter(2, "%" + search_value + "%")
                .setParameter(3, "%" + search_value + "%").setParameter(4, commonparameter.statut_enable)
                .getResultList();
        new logger().OCategory.info("lstTTypeStock size " + lstTTypeStock.size());
        return lstTTypeStock;
    }

    // fin liste type stock
    // creation type stock famille
    public TTypeStockFamille createTypeStockFamille(String lg_FAMILLE_ID, String lg_TYPE_STOCK_ID, int int_NUMBER,
            TEmplacement OTEmplacement) {
        // boolean result = false;
        TTypeStockFamille OTTypeStockFamille = null;
        try {
            // new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID + " lg_TYPE_STOCK_ID " + lg_TYPE_STOCK_ID +
            // " int_NUMBER " + int_NUMBER);
            OTTypeStockFamille = new TTypeStockFamille();
            TTypeStock OTTypeStock = this.getTTypeStock(lg_TYPE_STOCK_ID);// this.getOdataManager().getEm().find(TTypeStock.class,
                                                                          // lg_TYPE_STOCK_ID);
            // new logger().OCategory.info("Description type stock " + OTTypeStock.getStrDESCRIPTION());
            TFamille OTFamille = this.getTFamille(lg_FAMILLE_ID);// this.getOdataManager().getEm().find(TFamille.class,
                                                                 // lg_FAMILLE_ID);
            // new logger().OCategory.info("Description article " + OTFamille.getStrDESCRIPTION());
            OTTypeStockFamille.setLgTYPESTOCKFAMILLEID(this.getKey().getComplexId());
            OTTypeStockFamille.setLgFAMILLEID(OTFamille);
            OTTypeStockFamille.setLgTYPESTOCKID(OTTypeStock);
            OTTypeStockFamille.setStrNAME(OTFamille.getStrDESCRIPTION() + " " + OTTypeStock.getStrDESCRIPTION());
            OTTypeStockFamille.setStrDESCRIPTION(OTTypeStockFamille.getStrNAME());
            OTTypeStockFamille.setIntNUMBER(int_NUMBER);
            OTTypeStockFamille.setDtCREATED(new Date());
            OTTypeStockFamille.setLgEMPLACEMENTID(OTEmplacement);
            OTTypeStockFamille.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTTypeStockFamille);
            // result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de creation de type stock");
        }
        new logger().OCategory.info("result " + this.getDetailmessage());
        return OTTypeStockFamille;
    }

    public boolean updateTypeStockFamille(TFamille OTFamille, String lg_TYPE_STOCK_ID, int int_NUMBER, String task) {
        boolean result = false;
        try {
            TTypeStock OTTypeStock = this.getTTypeStock(lg_TYPE_STOCK_ID);
            TTypeStockFamille OTTypeStockFamille = this.getTTypeStockFamilleByTypestock(OTTypeStock.getLgTYPESTOCKID(),
                    OTFamille.getLgFAMILLEID());
            OTTypeStockFamille.setLgFAMILLEID(OTFamille);
            OTTypeStockFamille.setLgTYPESTOCKID(OTTypeStock);

            OTTypeStockFamille.setStrNAME(OTFamille.getStrDESCRIPTION() + " " + OTTypeStock.getStrDESCRIPTION());
            OTTypeStockFamille.setStrDESCRIPTION(OTTypeStockFamille.getStrNAME());
            if (task.equalsIgnoreCase(commonparameter.ADD)) {
                OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_NUMBER);
            } else if (task.equalsIgnoreCase(commonparameter.REMOVE)) {
                // OTTypeStockFamille.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() - int_NUMBER);
            }

            OTTypeStockFamille.setDtUPDATED(new Date());
            OTTypeStockFamille.setStrSTATUT(commonparameter.statut_enable);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de type stock famille");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }

    public boolean updateTypeStockFamille(TFamille OTFamille, TTypeStock OTTypeStock, int int_NUMBER) {
        boolean result = false;
        try {

            TTypeStockFamille OTTypeStockFamille = this.getTTypeStockFamilleByTypestock(OTTypeStock.getLgTYPESTOCKID(),
                    OTFamille.getLgFAMILLEID());
            OTTypeStockFamille.setLgFAMILLEID(OTFamille);
            OTTypeStockFamille.setLgTYPESTOCKID(OTTypeStock);

            OTTypeStockFamille.setStrNAME(OTFamille.getStrDESCRIPTION() + " " + OTTypeStock.getStrDESCRIPTION());
            OTTypeStockFamille.setStrDESCRIPTION(OTTypeStockFamille.getStrNAME());
            OTTypeStockFamille.setIntNUMBER(int_NUMBER);

            OTTypeStockFamille.setDtUPDATED(new Date());
            OTTypeStockFamille.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTTypeStockFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de type stock famille");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin mise a jour type stock famille

    // suppression type stock famille
    public boolean deleteTypeStockFamille(String lg_TYPE_STOCK_FAMILLE_ID) {
        boolean result = false;
        try {
            TTypeStockFamille OTTypeStockFamille = this.getOdataManager().getEm().find(TTypeStockFamille.class,
                    lg_TYPE_STOCK_FAMILLE_ID);
            OTTypeStockFamille.setDtUPDATED(new Date());
            OTTypeStockFamille.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTTypeStockFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de type stock famille");
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin suppression type stock

    // liste type stock famille
    public List<TTypeStockFamille> listeTTypeStockFamille(String search_value, String lg_TYPE_STOCK_FAMILLE_ID,
            String lg_TYPE_STOCK_ID, String lg_FAMILLE_ID) {
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<TTypeStockFamille>();
        if (search_value.equalsIgnoreCase("") || search_value == null) {
            search_value = "%%";
        }
        lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID.lgFAMILLEID AND t.lgTYPESTOCKFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?7 OR t.lgFAMILLEID.intEAN13 LIKE ?7 OR g.strCODEARTICLE LIKE ?7) AND t.strSTATUT = ?4 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?5 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?6 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION DESC")
                .setParameter(1, lg_TYPE_STOCK_FAMILLE_ID).setParameter(2, search_value + "%")
                .setParameter(7, search_value + "%").setParameter(3, search_value + "%")
                .setParameter(4, commonparameter.statut_enable).setParameter(5, lg_FAMILLE_ID)
                .setParameter(6, lg_TYPE_STOCK_ID).getResultList();
        // new logger().OCategory.info("lstTTypeStockFamille size " + lstTTypeStockFamille.size());
        return lstTTypeStockFamille;
    }
    // fin liste type stock famille

    // quantité de produit par type de stock
    public int getQuantiteStockByTypestock(String lg_TYPE_STOCK_ID) {
        int result = 0;
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<TTypeStockFamille>();
        try {
            lstTTypeStockFamille = this.listeTTypeStockFamille("", "%%", lg_TYPE_STOCK_ID, "%%");
            for (TTypeStockFamille OTTypeStockFamille : lstTTypeStockFamille) {
                result += OTTypeStockFamille.getIntNUMBER();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin quantité de produit par type de stock
    // fin quantité de produit par article

    public int getQuantiteStockByFamille(String lg_FAMILLE_ID) {
        int result = 0;
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<TTypeStockFamille>();
        try {
            new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID);
            lstTTypeStockFamille = this.listeTTypeStockFamille("", "%%", "%%", lg_FAMILLE_ID);
            for (TTypeStockFamille OTTypeStockFamille : lstTTypeStockFamille) {
                result += OTTypeStockFamille.getIntNUMBER();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }

    // fin quantité de produit par article
    // quantité de produit par type de stock et article
    public int getQuantiteStockByFamilleTypeStock(String lg_FAMILLE_ID, String lg_TYPE_STOCK_ID) {
        int result = 0;
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
        try {
            new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID);
            lstTTypeStockFamille = this.listeTTypeStockFamille("", "%%", lg_TYPE_STOCK_ID, lg_FAMILLE_ID);
            for (TTypeStockFamille OTTypeStockFamille : lstTTypeStockFamille) {
                result += OTTypeStockFamille.getIntNUMBER();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("result " + result);
        return result;
    }
    // fin quantité de produit par type de stock et article

    // liste des produits a reassortir
    public List<TFamille> listeTFamilleReassort(String search_value, String lg_TYPE_STOCK_ID) {
        List<TFamille> lstTFamilleFinal = new ArrayList<TFamille>();
        List<TFamille> lstTFamille = new ArrayList<TFamille>();
        if (search_value.equalsIgnoreCase("") || search_value == null) {
            search_value = "%%";
        }

        lstTFamille = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TFamille t WHERE (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.strSTATUT = ?3")
                .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                .setParameter(3, commonparameter.statut_enable).getResultList();
        // new logger().OCategory.info("lstTFamille size avant filtre " + lstTFamille.size());
        for (TFamille OTFamille : lstTFamille) {
            int int_QUANTITY = this.getQuantiteStockByFamilleTypeStock(OTFamille.getLgFAMILLEID(), lg_TYPE_STOCK_ID);
            new logger().OCategory
                    .info("int_QUANTITY " + int_QUANTITY + " seuil reserve " + OTFamille.getIntSEUILRESERVE());
            if (OTFamille.getIntSEUILRESERVE() > int_QUANTITY) {
                lstTFamilleFinal.add(OTFamille);
            }
        }
        new logger().OCategory.info("lstTFamilleFinal size final " + lstTFamilleFinal.size());
        return lstTFamilleFinal;
    }
    // fin liste des produits a reassortir

    // quantité de réassort
    public int getQuantiteReassort(String lg_FAMILLE_ID) {
        int result = 0;

        try {
            TFamille OTFamille = new familleManagement(this.getOdataManager()).getTFamille(lg_FAMILLE_ID);

            // TFamilleStock OTFamilleStock = new
            // tellerManagement(this.getOdataManager()).getTProductItemStock(OTFamille);
            new logger().OCategory.info("Famille " + OTFamille.getStrDESCRIPTION() + " Nombre vente "
                    + OTFamille.getIntNOMBREVENTES() + " Seuil reserve " + OTFamille.getIntSEUILRESERVE());
            if (OTFamille.getIntNOMBREVENTES() > OTFamille.getIntSEUILRESERVE()) {
                result = OTFamille.getIntNOMBREVENTES() - OTFamille.getIntSEUILRESERVE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }

    // public int getQuantiteReassort(String lg_FAMILLE_ID) {
    // int result = 0;
    //
    // try {
    // TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
    //
    // TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager()).getTProductItemStock(OTFamille);
    // new logger().OCategory.info("Famille " + OTFamille.getStrDESCRIPTION() + " Quantite actu " +
    // OTFamilleStock.getIntNUMBERAVAILABLE() + " Seuil reserve " + OTFamille.getIntSEUILRESERVE());
    // if (OTFamille.getIntSEUILRESERVE() > OTFamilleStock.getIntNUMBERAVAILABLE()) {
    // result = OTFamille.getIntSEUILRESERVE() - OTFamilleStock.getIntNUMBER();
    // }
    // } catch (Exception e) {
    // e.printStackTrace();
    // }
    // new logger().OCategory.info("result " + result);
    // return result;
    // }
    // fin quantité de réassort
    // reassort d'un article
    public boolean doReassort(int int_NUMBER, String lg_FAMILLE_ID, String task) {
        boolean result = false;
        String lg_TYPE_STOCK_RESERVE_ID = "2", lg_TYPE_STOCK_RAYON_ID = "1";
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());
        try {
            TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);
            new logger().OCategory.info("Famille dans doReassort " + OTFamille.getStrNAME());
            TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTFamille.getLgFAMILLEID());

            TTypeStockFamille OTypeStockFamilleReserve = this.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_RESERVE_ID,
                    OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());
            TTypeStockFamille OTypeStockFamilleRayon = this.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_RAYON_ID,
                    OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());

            if (task.equalsIgnoreCase(commonparameter.REASSORT)) {
                if (OTypeStockFamilleReserve.getIntNUMBER() < int_NUMBER) {
                    this.buildSuccesTraceMessage("Stock réserve insuffisant.");
                } else {
                    // mettre a jour famille et stock
                    OTFamilleStock.setIntNUMBERAVAILABLE(int_NUMBER + OTFamilleStock.getIntNUMBERAVAILABLE());
                    OTFamilleStock.setIntNUMBER(int_NUMBER + OTFamilleStock.getIntNUMBER());
                    OTypeStockFamilleRayon.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                    OTypeStockFamilleReserve.setIntNUMBER(OTypeStockFamilleReserve.getIntNUMBER() - int_NUMBER);
                    // mettre type stock famille (stock rayon)

                    OTFamilleStock.getLgFAMILLEID().setIntNOMBREVENTES(0);
                    if (this.persiste(OTFamilleStock.getLgFAMILLEID())) {
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    }

                }
            } else if (task.equalsIgnoreCase(commonparameter.ASSORT)) {
                if (OTFamilleStock.getIntNUMBER() < int_NUMBER) {
                    this.buildSuccesTraceMessage("Stock insuffisant.");
                } else {
                    // mettre a jour famille et stock
                    OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() - int_NUMBER);
                    OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() - int_NUMBER);
                    OTypeStockFamilleRayon.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                    OTypeStockFamilleReserve.setIntNUMBER(OTypeStockFamilleReserve.getIntNUMBER() + int_NUMBER);
                    // mettre type stock famille (stock rayon)
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                }
            }
            OTFamilleStock.setDtUPDATED(new Date());
            OTypeStockFamilleRayon.setDtUPDATED(new Date());
            OTypeStockFamilleReserve.setDtUPDATED(new Date());
            this.persiste(OTFamilleStock);
            this.persiste(OTypeStockFamilleRayon);
            this.persiste(OTypeStockFamilleReserve);

            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }
    // fin reassort d'un article

    // destockage article
    public boolean doDestockage(int int_NUMBER, String lg_FAMILLE_ID) {
        boolean result = false;
        String lg_TYPE_STOCK_DEPOT_ID = "3", lg_TYPE_STOCK_RAYON_ID = "1";
        try {
            TFamilleStock OTFamilleStock = new familleManagement(this.getOdataManager())
                    .getOrCreateTFamilleStock(lg_FAMILLE_ID, int_NUMBER);

            TTypeStockFamille OTypeStockFamilleDepot = this.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_DEPOT_ID,
                    OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());
            TTypeStockFamille OTypeStockFamilleRayon = this.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_RAYON_ID,
                    OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());

            if (OTypeStockFamilleDepot.getIntNUMBER() < int_NUMBER) {
                this.buildSuccesTraceMessage("Stock dépôt insuffisant.");
            } else {
                // mettre a jour famille et stock

                OTypeStockFamilleRayon.setIntNUMBER(OTypeStockFamilleRayon.getIntNUMBER() + int_NUMBER);
                OTypeStockFamilleDepot.setIntNUMBER(OTypeStockFamilleDepot.getIntNUMBER() - int_NUMBER);
                OTFamilleStock.setIntNUMBER(OTypeStockFamilleRayon.getIntNUMBER());
                // mettre type stock famille (stock rayon)
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            }
            OTFamilleStock.setDtUPDATED(new Date());
            OTypeStockFamilleRayon.setDtUPDATED(new Date());
            OTypeStockFamilleDepot.setDtUPDATED(new Date());
            this.persiste(OTFamilleStock);
            this.persiste(OTypeStockFamilleRayon);
            this.persiste(OTypeStockFamilleDepot);

            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    // fin destockage article
    public TTypeStockFamille getTTypeStockFamilleByTypestock(String lg_TYPE_STOCK_ID, String lg_FAMILLE_ID) {
        TTypeStockFamille OTTypeStockFamille = null;
        try {

            OTTypeStockFamille = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, lg_TYPE_STOCK_ID).setParameter(2, lg_FAMILLE_ID)
                    .setParameter(3, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).setMaxResults(1)
                    .getSingleResult();
            new logger().OCategory.info("Quantite :" + OTTypeStockFamille.getIntNUMBER());
        } catch (Exception e) {
            // e.printStackTrace();
            new logger().OCategory.info("ERREUR  getTTypeStockFamilleByTypestock " + e.toString());
            // OTTypeStockFamille = this.createTypeStockFamille(lg_FAMILLE_ID, lg_TYPE_STOCK_ID, 0);
        }
        return OTTypeStockFamille;
    }

    public TTypeStockFamille getTTypeStockFamilleByTypestock(String lg_TYPE_STOCK_ID, String lg_FAMILLE_ID,
            String lg_EMPLACEMENT_ID) {
        TTypeStockFamille OTTypeStockFamille = null;
        try {

            OTTypeStockFamille = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, lg_TYPE_STOCK_ID).setParameter(2, lg_FAMILLE_ID).setParameter(3, lg_EMPLACEMENT_ID)
                    .setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTypeStockFamille;
    }

    public TTypeStockFamille getTypeStockFamilleByTypestock(String lg_TYPE_STOCK_ID, TFamille lg_FAMILLE_ID,
            String lg_EMPLACEMENT_ID) {
        TTypeStockFamille OTTypeStockFamille = null;
        try {

            OTTypeStockFamille = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, lg_TYPE_STOCK_ID).setParameter(2, lg_FAMILLE_ID.getLgFAMILLEID())
                    .setParameter(3, lg_EMPLACEMENT_ID).getSingleResult();

        } catch (Exception e) {
            TTypeStock stock = this.getOdataManager().getEm().getReference(TTypeStock.class, lg_TYPE_STOCK_ID);
            OTTypeStockFamille = new TTypeStockFamille(this.getKey().getComplexId(), lg_FAMILLE_ID.getStrNAME(),
                    lg_FAMILLE_ID.getStrNAME());
            OTTypeStockFamille.setDtCREATED(new Date());
            OTTypeStockFamille.setDtUPDATED(new Date());
            OTTypeStockFamille.setLgEMPLACEMENTID(this.getOTUser().getLgEMPLACEMENTID());
            OTTypeStockFamille.setLgFAMILLEID(lg_FAMILLE_ID);
            OTTypeStockFamille.setIntNUMBER(0);
            OTTypeStockFamille.setLgTYPESTOCKID(stock);
            OTTypeStockFamille.setStrSTATUT("enable");
            this.getOdataManager().getEm().persist(OTTypeStockFamille);
            e.printStackTrace();
        }
        return OTTypeStockFamille;
    }

    public TTypeStockFamille getTTypeStockFamilleByTypestock(String lg_TYPE_STOCK_ID, String lg_FAMILLE_ID,
            int int_QUANTITY, TEmplacement OTEmplacement) {
        TTypeStockFamille OTTypeStockFamille = null;
        try {

            OTTypeStockFamille = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, lg_TYPE_STOCK_ID).setParameter(2, lg_FAMILLE_ID)
                    .setParameter(3, OTEmplacement.getLgEMPLACEMENTID()).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
            OTTypeStockFamille = this.createTypeStockFamille(lg_FAMILLE_ID, lg_TYPE_STOCK_ID, int_QUANTITY,
                    OTEmplacement);
        }
        return OTTypeStockFamille;
    }
    // fin gestion des reserves

    // fonction quantite total d'un produit
    // fin fonction quantite total d'un produit
    // load default data in type stock famille
    public int loadDataInTypeStockFamille(String lg_TYPE_STOCK_ID, int int_NULBER, TEmplacement OTEmplacement) {
        int result = 0;
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            lstTFamille = this.getOdataManager().getEm().createQuery("SELECT t FROM TFamille t").getResultList();
            new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
            TTypeStock OTypeStock = this.getOdataManager().getEm().find(TTypeStock.class, lg_TYPE_STOCK_ID);
            for (TFamille OTFamille : lstTFamille) {
                this.createTypeStockFamille(OTFamille.getLgFAMILLEID(), OTypeStock.getLgTYPESTOCKID(), int_NULBER,
                        OTEmplacement);
                result++;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin load default data in type stock famille

    public TTypeStockFamille findTTypeStockFamille(String lg_FAMILLE_ID, String lg_TYPE_STOCK_ID,
            TEmplacement OTEmplacement) {
        TTypeStockFamille OTypeStockFamille = null;
        TFamille OTFamille = null;
        TTypeStock OTTypeStock = null;
        int qte = 0;
        OTTypeStock = this.getTTypeStock(lg_TYPE_STOCK_ID);
        OTFamille = this.getTFamille(lg_FAMILLE_ID);
        try {
            // OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            new logger().OCategory.info("famille " + OTFamille.getStrDESCRIPTION());
            // OTTypeStock = this.getTTypeStock(lg_TYPE_STOCK_ID);
            new logger().OCategory.info("type stock " + OTTypeStock.getStrDESCRIPTION());
            new logger().OCategory.info("User " + this.getOTUser().getStrFIRSTNAME());
            OTypeStockFamille = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgTYPESTOCKID.lgTYPESTOCKID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, OTFamille.getLgFAMILLEID()).setParameter(2, OTTypeStock.getLgTYPESTOCKID())
                    .setParameter(3, OTEmplacement.getLgEMPLACEMENTID()).getSingleResult();
            new logger().OCategory.info("Description type stock famille " + OTypeStockFamille.getStrDESCRIPTION());
        } catch (Exception e) {
            e.printStackTrace();
            try {
                if (OTEmplacement.getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                    TFamilleStock OFamilleStock = new tellerManagement(this.getOdataManager())
                            .getTProductItemStock(OTFamille.getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
                    if (OTTypeStock.getLgTYPESTOCKID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                        qte = OFamilleStock.getIntNUMBERAVAILABLE();
                    }
                }

                OTypeStockFamille = this.createTypeStockFamille(OTFamille.getLgFAMILLEID(),
                        OTTypeStock.getLgTYPESTOCKID(), qte, OTEmplacement);
            } catch (Exception ex) {
                ex.printStackTrace();
            }

        }
        return OTypeStockFamille;
    }

    public TTypeStock getTTypeStock(String lg_TYPE_STOCK_ID) {
        TTypeStock OTTypeStock = null;
        try {
            new logger().OCategory.info("lg_TYPE_STOCK_ID dans getTTypeStock " + lg_TYPE_STOCK_ID);
            OTTypeStock = (TTypeStock) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStock t WHERE (t.lgTYPESTOCKID LIKE ?1 OR t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 ) AND t.strSTATUT = ?2")
                    .setParameter("1", lg_TYPE_STOCK_ID).setParameter("2", commonparameter.statut_enable)
                    .getSingleResult();
            new logger().OCategory.info("TTypeStock " + OTTypeStock.getStrDESCRIPTION());
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("OTTypeStock inexistant");
        }
        return OTTypeStock;
    }

    public TFamille getTFamille(String lg_PRODUCT_ITEM_ID) {
        TFamille OTFamille = null;
        try {
            new logger().OCategory.info("lg_PRODUCT_ITEM_ID dans getTFamille " + lg_PRODUCT_ITEM_ID);
            OTFamille = (TFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE (t.lgFAMILLEID LIKE ?1 OR t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 ) AND t.strSTATUT = ?2")
                    .setParameter("1", lg_PRODUCT_ITEM_ID).setParameter("2", commonparameter.statut_enable)
                    .getSingleResult();
            new logger().OCategory.info("lg_PRODUCT_ITEM_ID " + OTFamille.getStrDESCRIPTION());
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("OTTypeStock inexistant");
        }
        return OTFamille;
    }

    public boolean AddPerime(String lg_PRODUCT_ITEM_ID, Integer int_NUMBER, String int_NUM_LOT) {
        boolean result = false;

        new logger().OCategory.info("lg_PRODUCT_ITEM_ID  " + lg_PRODUCT_ITEM_ID + " int_NUMBER " + int_NUMBER
                + " int_NUM_LOT " + int_NUM_LOT);

        TFamille OTProductItem = (TFamille) this.find(lg_PRODUCT_ITEM_ID, new TFamille());

        TWarehouse OTWarehouse = new TWarehouse();
        OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
        OTWarehouse.setLgUSERID(this.getOTUser());
        OTWarehouse.setLgFAMILLEID(OTProductItem);
        OTWarehouse.setIntNUMBER(int_NUMBER);
        OTWarehouse.setDtPEREMPTION(new Date());
        OTWarehouse.setDtCREATED(new Date());
        OTWarehouse.setIntNUMLOT(int_NUM_LOT);
        OTWarehouse.setStrSTATUT(commonparameter.statut_enable);
        new logger().OCategory.info("Date peromption : " + OTWarehouse.getDtPEREMPTION());

        // code ajouté
        if (this.persiste(OTWarehouse)) {
            this.buildSuccesTraceMessage("Stock enregistrer avec succes");
            result = true;
        } else {
            this.buildErrorTraceMessage("Impossible ", this.getDetailmessage());
        }
        return result;
    }

    // mise a jour du nombre de vente
    public boolean updateNbreVente(TFamille OTFamille, int int_NUMBER) {
        boolean result = false;
        int nb_vente = 0;
        try {
            new logger().OCategory
                    .info("Famille " + OTFamille.getIntCIP() + " Nombre vente avant " + OTFamille.getIntNOMBREVENTES());
            if (OTFamille.getIntNOMBREVENTES() == null) {
                nb_vente = 0;
            } else {
                nb_vente = OTFamille.getIntNOMBREVENTES();
            }

            OTFamille.setIntNOMBREVENTES(nb_vente + int_NUMBER);
            new logger().OCategory.info("Nombre vente apres " + nb_vente);
            this.getOdataManager().getEm().merge(OTFamille);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du nombre de vente");
        }
        return result;
    }
    // fin ise a jour du nombre de vente

    // liste des produits a reassortir
    public List<TTypeStockFamille> listeTTypeStockFamilleReassort(String search_value, String lg_TYPE_STOCK_FAMILLE_ID,
            String lg_TYPE_STOCK_ID, String lg_FAMILLE_ID) {
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
        if (search_value.equalsIgnoreCase("") || search_value == null) {
            search_value = "%%";
        }
        lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID.lgFAMILLEID AND t.lgTYPESTOCKFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?7 OR g.strCODEARTICLE LIKE ?7) AND t.strSTATUT = ?4 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?5 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?6 AND t.lgFAMILLEID.intNOMBREVENTES >= t.lgFAMILLEID.intSEUILRESERVE GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION DESC")
                .setParameter(1, lg_TYPE_STOCK_FAMILLE_ID).setParameter(2, search_value + "%")
                .setParameter(7, search_value + "%").setParameter(3, search_value + "%")
                .setParameter(4, commonparameter.statut_enable).setParameter(5, lg_FAMILLE_ID)
                .setParameter(6, lg_TYPE_STOCK_ID).getResultList();
        // new logger().OCategory.info("lstTTypeStockFamille size " + lstTTypeStockFamille.size());
        return lstTTypeStockFamille;
    }
    // fin liste des produits a reassortir

    public TTypeetiquette getTypeetiquette(String lg_TYPEETIQUETTE_ID, TFamille OTFamille) {
        TTypeetiquette OTTypeetiquette = null;
        try {
            OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class, lg_TYPEETIQUETTE_ID);
            new logger().OCategory.info("Type etiquette " + OTTypeetiquette.getStrNAME());
        } catch (Exception e) {
            OTTypeetiquette = OTFamille.getLgTYPEETIQUETTEID();
            // new logger().OCategory.info("Type etiquette Dans le catch "+ OTTypeetiquette.getStrNAME());
            // e.printStackTrace();
        }

        return OTTypeetiquette;
    }

    // generation d'une etiquette pour l'imprission
    // public void generateEtiquetteForPrint(TEtiquette OTEtiquette) {
    public String generateEtiquetteForPrint(String str_name_image, String str_file_name) {
        try {
            Image image;
            File file = new File(str_file_name);
            FileOutputStream fileout = new FileOutputStream(file);
            Document document = new Document();
            writer = PdfWriter.getInstance(document, fileout);
            document.open();

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 750);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 690);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 630);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 570);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 510);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 450);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 390);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 330);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 270);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 210);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 150);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 90);
                document.add(image);
            }

            for (int i = 0; i < 5; i++) {
                image = Image.getInstance(str_name_image);
                image.scaleToFit(120, 200);
                image.setAbsolutePosition(10 + (115 * i), 30);
                document.add(image);
            }

            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(120, 200);
            // image.setAbsolutePosition(10, 730);
            // document.add(image);
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(120, 200);
            // image.setAbsolutePosition(10, 660);
            // document.add(image);
            //
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(120, 200);
            // image.setAbsolutePosition(10, 590);
            // document.add(image);
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 520);
            // document.add(image);
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 450);
            // document.add(image);
            //
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 380);
            // document.add(image);
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 310);
            // document.add(image);
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 240);
            // document.add(image);
            //
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 170);
            // document.add(image);
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 100);
            // document.add(image);
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10, 30);
            // document.add(image);
            //
            //
            // code optimisé a revoir
            /*
             * for (int j = 13; j < 0; j--) { for (int i = 0; i < 5; i++) { image = Image.getInstance(str_name_image);
             * image.scaleToFit(135, 200); image.setAbsolutePosition(40 + (135 * i), 30 + (j * 70)); new
             * logger().OCategory.info("Valeur de y " + (30 + (j * 70))); document.add(image); } }
             */
            // code optimisé a revoir
            // for (int i = 0; i < 5; i++) {
            // image = Image.getInstance(str_name_image);
            // image.scaleToFit(135, 200);
            // image.setAbsolutePosition(10 + (115 * i), 500);
            // document.add(image);
            // }
            document.close();
            return str_file_name;
        } catch (Exception e) {
            return null;
        }
    }
    // fin generation d'une etiquette pour l'imprission

    public static void PlaceChunck(String text, int x, int y) {
        try {
            BaseFont bf = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            PdfContentByte cb = writer.getDirectContent();
            cb.saveState();
            cb.beginText();
            cb.moveText(x, y);
            cb.setFontAndSize(bf, 8);
            cb.showText(text);
            cb.endText();
            cb.restoreState();
        } catch (DocumentException ex) {

        } catch (IOException ex) {

        }
    }

    // function de mise jour du stock par le socket server
    public boolean updateFamilleStockBySocketServer(TParameters OTParameters) {
        boolean isUpdated = false;
        List<TFamilleStock> listFamilleStocks = new ArrayList<>();
        try {

            listFamilleStocks = this.getOdataManager().getEm()
                    .createNamedQuery("TFamilleStock.findAll", TFamilleStock.class).getResultList();
            for (TFamilleStock OTFamilleStock : listFamilleStocks) {
                this.refresh(OTFamilleStock);
                int result = Integer.compare(OTFamilleStock.getIntNUMBER(), OTFamilleStock.getIntNUMBERAVAILABLE());
                if (result != 0) {
                    System.out.println(" Les quantité sont différentes ");
                    if (updateFamilleStockQuantity(OTFamilleStock)) {
                        isUpdated = true;
                    }
                }

            }

            if (isUpdated) {
                OTParameters.setDtUPDATED(new Date());
                OTParameters.setStrVALUE(date.formatterShort.format(new Date()));
                this.persiste(OTParameters);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return isUpdated;
    }

    // mise a jour de la du stock par sa quantité disponible
    private boolean updateFamilleStockQuantity(TFamilleStock OFamilleStock) {
        boolean isUpdated = false;
        try {
            OFamilleStock.setIntNUMBER(OFamilleStock.getIntNUMBERAVAILABLE());
            OFamilleStock.setDtUPDATED(new Date());

            if (this.persiste(OFamilleStock)) {
                isUpdated = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isUpdated;
    }

    // mise a jour du stock dispo par rapport au reel chaque jour
    public void updateStockFamille() {
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = OTparameterManager.getParameter(Parameter.KEY_DAY);
        Date jour = new Date();
        // a mettre le parametre de dgetStrVALUEesactivation de la cloture automatique de la caisse
        if (OTParameters != null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                                    // automatique. False = fermeture automatique desactivée
            // dayy
            String systemeday = date.formatterShort.format(jour);// compare la date d'aujourd hui à celle dans la bd

            if (!systemeday.equals(OTParameters.getStrVALUE())) {
                this.updateFamilleStockBySocketServer(OTParameters);
            }
            OTParameters.setStrVALUE(date.DateToString(jour, date.formatterShort));
            this.persiste(OTParameters);
        }
    }

    // fin mise a jour du stock dispo par rapport au reel chaque jour
    // generer les donnees pour la gestion des etiquettes
    public List<EntityData> generateDataForEtiquette(List<TEtiquette> lstTEtiquette) {
        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        List<String> data = new ArrayList<String>();
        String fileBarecode = "";
        EntityData OEntityData = null;
        barecodeManager obarecodeManager = new barecodeManager();
        // Date today = new Date();
        String dateToday = date.DateToString(new Date(), date.formatterShortBis);
        try {
            TOfficine oTOfficine = this.getOdataManager().getEm().find(dal.TOfficine.class, "1");
            for (TEtiquette OTEtiquette : lstTEtiquette) {
                if (data.size() == 0) {
                    for (int i = 0; i < Integer.parseInt(OTEtiquette.getIntNUMBER()); i++) {
                        OEntityData = new EntityData();
                        data.add(OTEtiquette.getLgFAMILLEID().getLgFAMILLEID());
                        fileBarecode = obarecodeManager.buildbarcodeOther(OTEtiquette.getLgFAMILLEID().getIntCIP(),
                                jdom.barecode_file + this.getKey().getComplexId() + ".gif");
                        OEntityData.setStr_value1(oTOfficine.getStrNOMABREGE());
                        OEntityData.setStr_value2(OTEtiquette.getLgFAMILLEID().getStrDESCRIPTION());
                        OEntityData.setStr_value3(fileBarecode);
                        OEntityData.setStr_value4(
                                conversion.AmountFormat(OTEtiquette.getLgFAMILLEID().getIntPRICE(), ' ') + " CFA");
                        OEntityData.setStr_value5(dateToday);
                        OEntityData.setStr_value6(OTEtiquette.getLgFAMILLEID().getIntCIP());
                        lstEntityData.add(OEntityData);
                    }

                } else {
                    if (!data.get(0).equalsIgnoreCase(OTEtiquette.getLgFAMILLEID().getLgFAMILLEID())) {
                        fileBarecode = obarecodeManager.buildbarcodeOther(OTEtiquette.getLgFAMILLEID().getIntCIP(),
                                jdom.barecode_file + this.getKey().getComplexId() + ".gif");
                        data.clear();
                        data.add(OTEtiquette.getLgFAMILLEID().getLgFAMILLEID());
                    }

                    for (int i = 0; i < Integer.parseInt(OTEtiquette.getIntNUMBER()); i++) {
                        OEntityData = new EntityData();
                        fileBarecode = obarecodeManager.buildbarcodeOther(OTEtiquette.getLgFAMILLEID().getIntCIP(),
                                jdom.barecode_file + this.getKey().getComplexId() + ".gif");
                        OEntityData.setStr_value1(oTOfficine.getStrNOMABREGE());
                        OEntityData.setStr_value2(OTEtiquette.getLgFAMILLEID().getStrDESCRIPTION());
                        OEntityData.setStr_value3(fileBarecode);
                        OEntityData.setStr_value4(
                                conversion.AmountFormat(OTEtiquette.getLgFAMILLEID().getIntPRICE(), ' ') + " CFA");
                        OEntityData.setStr_value5(dateToday);
                        OEntityData.setStr_value6(OTEtiquette.getLgFAMILLEID().getIntCIP());
                        lstEntityData.add(OEntityData);
                    }
                }
                this.delete(OTEtiquette);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille " + lstEntityData.size());
        return lstEntityData;
    }
    // fin generer les donnees pour la gestion des etiquettes

    /* article invendus sur une période 12/04/2017 */
    public List<EntityData> listArticleInvendu(String search_value, String dtDEBUT, String dtFin, int start,
            int limit) {

        List<EntityData> lstProductDormant = new ArrayList<>();

        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        EntityData OEntityData = null;

        try {
            String query = "SELECT \n" + "  `t_famille`.`lg_FAMILLE_ID`,\n" + "  `t_famille`.`str_NAME`,\n"
                    + "  `t_famille`.`str_DESCRIPTION`,\n" + "  `t_famille`.`int_PRICE`,\n"
                    + "  `t_famille`.`int_PRICE_TIPS`,\n" + "  `t_famille`.`int_CIP`,\n" + "  `t_famille`.`int_PAF`,\n"
                    + "  `t_famille`.`int_PAT`,\n" + "  `t_zone_geographique`.`str_LIBELLEE`,\n"
                    + "  `t_famille_stock`.`int_NUMBER_AVAILABLE`,\n"
                    + "  (SELECT MAX(`d`.`dt_UPDATED`) AS `FIELD_1` FROM `t_preenregistrement_detail` `d` WHERE `d`.`lg_FAMILLE_ID` = `t_famille`.`lg_FAMILLE_ID`) AS `DATEDERNIEREVENTE`,\n"
                    + "  `t_zone_geographique`.`str_CODE`\n" + "FROM\n" + "  `t_famille`\n"
                    + "  INNER JOIN `t_zone_geographique` ON (`t_famille`.`lg_ZONE_GEO_ID` = `t_zone_geographique`.`lg_ZONE_GEO_ID`)\n"
                    + "  INNER JOIN `t_famille_stock` ON (`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)\n"
                    + "  INNER JOIN `t_type_stock_famille` ON (`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`)\n"
                    + "WHERE\n"
                    + "  `t_famille`.`lg_FAMILLE_ID` NOT IN (SELECT `t_preenregistrement_detail`.`lg_FAMILLE_ID` FROM `t_preenregistrement` INNER JOIN `t_preenregistrement_detail` ON (`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`) WHERE DATE(`t_preenregistrement`.`dt_UPDATED`) >= DATE('"
                    + dtDEBUT + "') AND  DATE(`t_preenregistrement`.`dt_UPDATED`)<= DATE('" + dtFin
                    + "') AND `t_preenregistrement`.`b_IS_CANCEL` = 0 AND `t_preenregistrement`.`int_PRICE` > 0 AND `t_preenregistrement`.`str_STATUT` = 'is_Closed') AND \n"
                    + "  `t_famille_stock`.`lg_EMPLACEMENT_ID` = '" + lg_EMPLACEMENT_ID + "' AND \n"
                    + "  `t_zone_geographique`.`lg_EMPLACEMENT_ID` = '" + lg_EMPLACEMENT_ID + "' AND \n"
                    + "  (`t_famille`.`int_CIP` LIKE '" + search_value + "%' OR \n" + "  `t_famille`.`int_EAN13` LIKE '"
                    + search_value + "%' OR \n" + "  `t_famille`.`str_DESCRIPTION` LIKE '" + search_value
                    + "%') AND `t_type_stock_famille`.`lg_EMPLACEMENT_ID`='" + lg_EMPLACEMENT_ID
                    + "' AND `t_type_stock_famille`.`lg_TYPE_STOCK_ID`='" + lg_EMPLACEMENT_ID
                    + "' AND t_famille_stock.lg_FAMILLE_STOCK_ID >0   AND `t_type_stock_famille`.`int_NUMBER` >0 AND `t_famille`.`str_STATUT`='enable' \n"
                    + "ORDER BY\n" + "  `t_famille`.`str_DESCRIPTION`\n" + "LIMIT " + start + "," + limit + "";
            System.out.println("query  " + query);
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            for (Object[] objects : list) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(objects[0] != null ? objects[0] + "" : "");
                OEntityData.setStr_value2(objects[5] != null ? objects[5] + "" : "");
                OEntityData.setStr_value3(objects[1] != null ? objects[1] + "" : "");
                OEntityData.setStr_value4(objects[9] != null ? objects[9] + "" : "");
                OEntityData.setStr_value5(objects[3] != null ? objects[3] + "" : "");
                OEntityData.setStr_value6(objects[4] != null ? objects[4] + "" : "");
                OEntityData.setStr_value7(objects[6] != null ? objects[6] + "" : "");
                OEntityData.setStr_value8(objects[7] != null ? objects[7] + "" : "");
                OEntityData.setStr_value9(objects[11] != null ? objects[11] + "" : "");
                OEntityData.setStr_value10(objects[8] != null ? objects[8] + "" : "");
                OEntityData.setStr_value11(objects[10] != null ? objects[10] + "" : "");
                lstProductDormant.add(OEntityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstProductDormant;
    }

    public long countArticleInvendu(String search_value, String dtDEBUT, String dtFin) {
        long count = 0;

        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                lg_TYPE_STOCK_ID = commonparameter.PROCESS_SUCCESS;
        EntityData OEntityData = null;

        try {
            String query = "SELECT \n" + "  COUNT(`t_famille`.`lg_FAMILLE_ID`)\n" + "FROM\n" + "  `t_famille`\n"
                    + "  INNER JOIN `t_zone_geographique` ON (`t_famille`.`lg_ZONE_GEO_ID` = `t_zone_geographique`.`lg_ZONE_GEO_ID`)\n"
                    + "  INNER JOIN `t_famille_stock` ON (`t_famille`.`lg_FAMILLE_ID` = `t_famille_stock`.`lg_FAMILLE_ID`)\n"
                    + "  INNER JOIN `t_type_stock_famille` ON (`t_famille`.`lg_FAMILLE_ID` = `t_type_stock_famille`.`lg_FAMILLE_ID`)\n"
                    + "WHERE\n"
                    + "  `t_famille`.`lg_FAMILLE_ID` NOT IN (SELECT `t_preenregistrement_detail`.`lg_FAMILLE_ID` \n"
                    + "  FROM `t_preenregistrement` INNER JOIN `t_preenregistrement_detail` ON \n"
                    + "  (`t_preenregistrement`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement_detail`.`lg_PREENREGISTREMENT_ID`)\n"
                    + "   WHERE DATE(`t_preenregistrement`.`dt_UPDATED`) >= DATE('" + dtDEBUT + "') AND \n"
                    + "    DATE(`t_preenregistrement`.`dt_UPDATED`)<= DATE('" + dtFin + "') AND \n"
                    + "    `t_preenregistrement`.`b_IS_CANCEL` = 0 AND `t_preenregistrement`.`int_PRICE` > 0 \n"
                    + "    AND `t_preenregistrement`.`str_STATUT` = 'is_Closed') AND \n"
                    + "  `t_famille_stock`.`lg_EMPLACEMENT_ID` = '" + lg_EMPLACEMENT_ID + "' AND \n"
                    + "  `t_zone_geographique`.`lg_EMPLACEMENT_ID` = '" + lg_EMPLACEMENT_ID + "' AND \n"
                    + "  (`t_famille`.`int_CIP` LIKE '" + search_value + "%' OR \n" + "  `t_famille`.`int_EAN13` LIKE '"
                    + search_value + "%' OR \n" + "  `t_famille`.`str_DESCRIPTION` LIKE '" + search_value
                    + "%') AND `t_type_stock_famille`.`lg_EMPLACEMENT_ID`='" + lg_EMPLACEMENT_ID + "' \n"
                    + "  AND `t_type_stock_famille`.`lg_TYPE_STOCK_ID`='1' \n"
                    + "  AND `t_famille_stock`.`int_NUMBER_AVAILABLE` >0  AND `t_type_stock_famille`.`int_NUMBER` >0 AND `t_famille`.`str_STATUT`='enable'";
            Object _count = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();
            count = Long.valueOf(_count + "");
        } catch (Exception e) {
            e.printStackTrace();

        }
        return count;
    }

    public Integer getStock(String lgFAMILLE_ID, String lgEMPLACEMENT) {
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            cq.select(root.get(TFamilleStock_.intNUMBERAVAILABLE));
            cq.where(cb.and(cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lgFAMILLE_ID)),
                    cb.equal(root.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEMPLACEMENT));
            Query q = em.createQuery(cq);
            q.setMaxResults(1);
            return (Integer) q.getSingleResult();

        } finally {

        }
    }

    public JSONArray etatStock(boolean all, String str_TYPE_TRANSACTION, String criteria, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int int_NUMBER, int start, int limit) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        JSONArray aray = new JSONArray();
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> st = root.join("tFamilleStockCollection", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            if (!"".equals(criteria)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(root.get(TFamille_.strNAME), criteria + "%"),
                                cb.like(root.get(TFamille_.intCIP), criteria + "%"),
                                cb.like(root.get(TFamille_.intEAN13), criteria + "%"),
                                cb.like(root.get(TFamille_.lgFAMILLEID), criteria + "%"),
                                cb.like(root.get(TFamille_.strDESCRIPTION), criteria + "%")));
            }

            predicate = cb.and(predicate, cb.equal(root.get(TFamille_.strSTATUT), "enable"));

            predicate = cb.and(predicate,
                    cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            if (!"".equals(lg_FAMILLEARTICLE_ID)) {
                Join<TFamille, TFamillearticle> famillearticle = root.join("lgFAMILLEARTICLEID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(famillearticle.get("lgFAMILLEARTICLEID"), lg_FAMILLEARTICLE_ID));
            }
            if (!"".equals(lg_ZONE_GEO_ID)) {
                Join<TFamille, TZoneGeographique> zoJoin = root.join("lgZONEGEOID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(zoJoin.get("lgZONEGEOID"), lg_ZONE_GEO_ID));
            }
            if (!"".equals(lg_GROSSISTE_ID)) {
                Join<TFamille, TGrossiste> g = root.join("lgGROSSISTEID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(g.get("lgGROSSISTEID"), lg_GROSSISTE_ID));
            }
            switch (str_TYPE_TRANSACTION) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.SEUIL:
                Predicate SEUIL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.intSEUILMIN));
                predicate = cb.and(predicate, SEUIL);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MORE);
                break;
            case Parameter.MOREOREQUAL:
                Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MOREOREQUAL);
                break;
            case Parameter.LESSOREQUAL:
                Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESSOREQUAL);
                break;
            default:
                break;
            }

            cq.multiselect(root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.strDESCRIPTION),
                    root.get(TFamille_.intCIP), root.get(TFamille_.intPRICE), st.get(TFamilleStock_.intNUMBERAVAILABLE),
                    root.get(TFamille_.intPAF), root.get("lgCODETVAID").get("intVALUE"),
                    root.get(TFamille_.intSEUILMIN), root.get("lgZONEGEOID").get("strLIBELLEE"),
                    root.get("lgGROSSISTEID").get("strLIBELLE")).orderBy(cb.asc(root.get(TFamille_.strDESCRIPTION)))
                    .distinct(true);

            cq.where(predicate);
            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);

            }
            List<Object[]> list = q.getResultList();
            boolean afficherStock = findParametre("AFFICHER_STOCK");
            list.forEach((t) -> {

                try {
                    JSONObject ob = new JSONObject();

                    ob.put("lg_FAMILLE_ID", t[0]);
                    ob.put("int_CIP", t[2]);
                    ob.put("str_NAME", t[1]);
                    ob.put("int_NUMBER_ENTREE", t[5]);
                    ob.put("int_PRICE", t[3]);
                    if (afficherStock) {
                        ob.put("int_NUMBER", t[4]);
                    }
                    ob.put("int_STOCK_REAPROVISONEMENT", t[7]);
                    ob.put("CODEEMPLACEMENT", t[8]);
                    ob.put("str_CODE_TVA", t[6]);
                    ob.put("lg_GROSSISTE_ID", t[9]);
                    ob.put("afficherStock", afficherStock);

                    aray.put(ob);
                } catch (JSONException ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            });

        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return aray;

    }

    private boolean findParametre(String id) {
        try {
            TParameters o = this.getOdataManager().getEm().find(TParameters.class, id);
            return Integer.valueOf(o.getStrVALUE()).compareTo(1) == 0;
        } catch (Exception e) {
            return false;
        }
    }

    public int etatStock(String str_TYPE_TRANSACTION, String criteria, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int int_NUMBER) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        EntityManager em = this.getOdataManager().getEm();
        JSONArray aray = new JSONArray();
        String lg_TYPE_STOCK_ID = "1";
        if (!lg_EMPLACEMENT_ID.equals("1")) {
            lg_TYPE_STOCK_ID = "3";
        }
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> st = root.join("tFamilleStockCollection", JoinType.INNER);
            Join<TFamille, TTypeStockFamille> sp = root.join("tTypeStockFamilleCollection", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            if (!"".equals(criteria)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(root.get(TFamille_.strNAME), criteria + "%"),
                                cb.like(root.get(TFamille_.intCIP), criteria + "%"),
                                cb.like(root.get(TFamille_.intEAN13), criteria + "%"),
                                cb.like(root.get(TFamille_.strDESCRIPTION), criteria + "%")));
            }
            predicate = cb.and(predicate, cb.equal(root.get(TFamille_.strSTATUT), "enable"));
            predicate = cb.and(predicate,
                    cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            predicate = cb.and(predicate, cb.equal(sp.get("lgTYPESTOCKID").get("lgTYPESTOCKID"), lg_TYPE_STOCK_ID));
            if (!"".equals(lg_FAMILLEARTICLE_ID)) {
                Join<TFamille, TFamillearticle> famillearticle = root.join("lgFAMILLEARTICLEID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(famillearticle.get("lgFAMILLEARTICLEID"), lg_FAMILLEARTICLE_ID));
            }
            if (!"".equals(lg_ZONE_GEO_ID)) {
                Join<TFamille, TZoneGeographique> zoJoin = root.join("lgZONEGEOID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(zoJoin.get("lgZONEGEOID"), lg_ZONE_GEO_ID));
            }
            if (!"".equals(lg_GROSSISTE_ID)) {
                Join<TFamille, TGrossiste> g = root.join("lgGROSSISTEID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(g.get("lgGROSSISTEID"), lg_GROSSISTE_ID));
            }
            switch (str_TYPE_TRANSACTION) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.SEUIL:
                Predicate SEUIL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.intSEUILMIN));
                predicate = cb.and(predicate, SEUIL);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MORE);
                break;
            case Parameter.MOREOREQUAL:
                Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MOREOREQUAL);
                break;
            case Parameter.LESSOREQUAL:
                Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESSOREQUAL);
                break;
            default:
                break;
            }

            cq.select(cb.countDistinct(root));
            cq.where(predicate);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();
            return ((Long) q.getSingleResult()).intValue();
        } finally {
            if (em != null) {
                em.close();
            }
        }

    }

    public List<TZoneGeographique> getZone(String criteria, String idEmp, int start, int limit) {
        List<TZoneGeographique> list = new ArrayList<>();
        try {
            list = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TZoneGeographique o WHERE (o.strLIBELLEE LIKE ?1 OR o.strCODE LIKE ?1) AND o.strSTATUT='enable' AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 ORDER BY o.strLIBELLEE  ")
                    .setParameter(1, criteria + "%").setParameter(2, idEmp).setFirstResult(start).setMaxResults(limit)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public long getZone(String criteria) {
        long count = 0;
        try {
            count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o) FROM TZoneGeographique o WHERE (o.strLIBELLEE LIKE ?1 OR o.strCODE LIKE ?1) AND o.strSTATUT='enable'")
                    .setParameter(1, criteria + "%").getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public JSONObject updateProductZone(String lgZone, String lgProduct) {
        JSONObject json = new JSONObject();
        try {
            TZoneGeographique geographique = (TZoneGeographique) this.getOdataManager().getEm()
                    .createNamedQuery("TZoneGeographique.findByStrCODE").setParameter("strCODE", lgZone)
                    .getSingleResult();
            TFamille OfFamille = this.getOdataManager().getEm().find(TFamille.class, lgProduct);
            OfFamille.setLgZONEGEOID(geographique);
            if (this.merge(OfFamille)) {
                json.put("status", 1);
            } else {
                json.put("status", 0);
            }

        } catch (Exception e) {
            e.printStackTrace();

        }

        return json;
    }

    public JSONArray getArticleByZone(String zoneID, String search, int start, int limit) {
        JSONArray array = new JSONArray();
        try {
            List<Object[]> lis = this.getOdataManager().getEm().createQuery(
                    "SELECT o.lgFAMILLEID,o.intCIP, o.strNAME, o.intPRICE , o.lgZONEGEOID.strLIBELLEE FROM  TFamille o WHERE o.lgZONEGEOID.lgZONEGEOID LIKE ?1 AND o.strSTATUT='enable' AND (o.intCIP LIKE ?2 OR o.strNAME LIKE  ?2 ) AND o.lgZONEGEOID.lgEMPLACEMENTID.lgEMPLACEMENTID=?3 ORDER BY o.strNAME")
                    .setParameter(1, zoneID).setParameter(2, search)
                    .setParameter(3, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).setFirstResult(start)
                    .setMaxResults(limit).getResultList();

            lis.forEach((t) -> {
                JSONObject json = new JSONObject();
                try {

                    json.put("lg_FAMILLE_ID", t[0] + "").put("str_NAME", t[2] + "").put("int_PRICE", t[3] + "")
                            .put("int_CIP", t[1] + "").put("int_NUMBER", getStock(t[0] + "")).put("isChecked", false)
                            .put("str_DESCRIPTION", t[4] + "");
                    array.put(json);
                } catch (JSONException ex) {

                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public long countArticleByZone(String zoneID, String search) {
        long count = 0;
        try {
            count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o)  FROM  TFamille o WHERE o.lgZONEGEOID.lgZONEGEOID LIKE ?1 AND o.strSTATUT='enable' AND (o.intCIP LIKE ?2 OR o.strNAME LIKE  ?2 ) AND o.lgZONEGEOID.lgEMPLACEMENTID.lgEMPLACEMENTID=?3 ")
                    .setParameter(1, zoneID).setParameter(2, search)
                    .setParameter(3, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    private int getStock(String id) {
        int stock = 0;
        try {
            stock = (int) this.getOdataManager().getEm().createQuery(
                    "SELECT o.intNUMBERAVAILABLE FROM  TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID = ?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 ")
                    .setParameter(1, id).setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return stock;
    }

    public JSONObject updateSelectionZone(String lgZone, String mode, JSONArray recordsToSend, JSONArray uncheckedList,
            String zoneID, String search) {
        JSONObject json = new JSONObject();
        int success = 0;
        String message = "";
        try {
            TZoneGeographique geographique = (TZoneGeographique) this.getOdataManager().getEm()
                    .find(TZoneGeographique.class, lgZone);

            TFamille article;
            int count = 0;
            if ("ALL".equals(mode)) {
                List<String> list = this.getAllArticleByZone(zoneID, search);

                if (uncheckedList.length() > 0) {
                    for (String lg : list) {
                        boolean unchecked = false;
                        for (int i = 0; i < uncheckedList.length(); i++) {
                            if (lg.equals(uncheckedList.getString(i))) {
                                unchecked = true;
                                break;
                            }
                        }
                        if (!unchecked) {
                            article = this.getOdataManager().getEm().find(TFamille.class, lg);
                            article.setLgZONEGEOID(geographique);
                            this.merge(article);
                            TFamilleZonegeo tfz = updateFamilleZone(article.getLgFAMILLEID());
                            tfz.setLgZONEGEOID(geographique);
                            this.merge(tfz);
                            count++;
                        }

                    }
                } else {
                    for (String id : list) {

                        article = this.getOdataManager().getEm().find(TFamille.class, id);

                        article.setLgZONEGEOID(geographique);
                        this.merge(article);
                        TFamilleZonegeo tfz = updateFamilleZone(article.getLgFAMILLEID());
                        tfz.setLgZONEGEOID(geographique);
                        this.merge(tfz);
                        count++;
                    }
                }

            } else {
                for (int i = 0; i < recordsToSend.length(); i++) {

                    article = this.getOdataManager().getEm().find(TFamille.class, recordsToSend.getString(i));

                    article.setLgZONEGEOID(geographique);
                    this.merge(article);
                    TFamilleZonegeo tfz = updateFamilleZone(article.getLgFAMILLEID());
                    tfz.setLgZONEGEOID(geographique);
                    this.merge(tfz);
                    count++;
                }
            }

            message = "Le nombre de produits pris en compte : <span style=\"color:blue;font-weight:800; \" >" + count
                    + "</span>";
            success = 1;
            json.put("status", success).put("message", message);

        } catch (Exception e) {
            e.printStackTrace();

        }

        return json;
    }

    public List<String> getAllArticleByZone(String zoneID, String search) {
        List<String> lis = new ArrayList<>();
        try {
            System.out.println("zoneID " + zoneID + " **** " + search);
            lis = this.getOdataManager().getEm().createQuery(
                    "SELECT o.lgFAMILLEID FROM  TFamille o WHERE o.lgZONEGEOID.lgZONEGEOID LIKE ?1 AND o.strSTATUT='enable' AND (o.intCIP LIKE ?2 OR o.strNAME LIKE ?2 ) AND o.lgZONEGEOID.lgEMPLACEMENTID.lgEMPLACEMENTID=?3 ORDER BY o.strNAME")
                    .setParameter(1, zoneID).setParameter(2, search)
                    .setParameter(3, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lis;
    }

    private TFamilleZonegeo updateFamilleZone(String id) {
        TFamilleZonegeo familleZonegeo = null;
        try {
            familleZonegeo = (TFamilleZonegeo) this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM  TFamilleZonegeo o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2")
                    .setParameter(1, id).setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return familleZonegeo;
    }

    public JSONArray getLisetArticleInvendus2(String search, String dt_start, String dt_end, String emp, int start,
            int limit) {
        JSONArray data = new JSONArray();
        EntityManager em = this.getOdataManager().getEm();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> fa = root.join("tFamilleStockCollection", JoinType.INNER);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrementDetail> urs = sub.from(TPreenregistrementDetail.class);
            Predicate btw = cb.between(cb.function("DATE", Date.class, urs.get(TPreenregistrementDetail_.dtCREATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            sub.select(urs.get("lgFAMILLEID").get("lgFAMILLEID")).where(
                    cb.equal(urs.get(TPreenregistrementDetail_.strSTATUT), commonparameter.statut_is_Closed), btw);

            Predicate p = cb.conjunction();
            p = cb.and(p, cb.equal(root.get(TFamille_.strSTATUT), "enable"));
            p = cb.and(p, cb.equal(fa.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));

            Predicate ge = cb.greaterThan(fa.get(TFamilleStock_.intNUMBERAVAILABLE), 0);
            p = cb.and(p, ge);
            if (!"".equals(search)) {
                p = cb.and(p, cb.like(root.get(TFamille_.strDESCRIPTION), search + "%"),
                        cb.like(root.get(TFamille_.intCIP), search + "%"));
            }

            cq.multiselect(root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.intCIP),
                    root.get(TFamille_.strDESCRIPTION), root.get(TFamille_.intPAF), root.get(TFamille_.intPRICE),
                    fa.get(TFamilleStock_.intNUMBERAVAILABLE), root.get("lgZONEGEOID").get("lgZONEGEOID"));
            cb.asc(root.get(TFamille_.strDESCRIPTION));
            cq.where(p, cb.in(root.get(TFamille_.lgFAMILLEID)).value(sub));
            Query q = em.createQuery(cq);
            List<Object[]> list = q.getResultList();

            list.forEach((t) -> {
                JSONObject ob = new JSONObject();
                try {
                    ob.put("lg_FAMILLE_ID", t[0]);
                    ob.put("int_CIP", t[1]);
                    ob.put("str_NAME", t[2]);
                    ob.put("lg_FAMILLEARTICLE_ID", t[4]);
                    ob.put("str_TYPE_TRANSACTION", t[3]);
                    ob.put("int_NUMBER", t[5]);
                    ob.put("lg_ZONE_GEO_ID", t[6]);
                    TPreenregistrementDetail Invendus = getInvendus(t[0] + "");
                    if (Invendus != null) {
                        ob.put("lg_CODE_TVA_ID", date.formatterShort.format(Invendus.getDtUPDATED()));
                        ob.put("str_CODE_TVA", date.NomadicUiFormatTime.format(Invendus.getDtUPDATED()));
                    } else {
                        ob.put("lg_CODE_TVA_ID", "");
                        ob.put("str_CODE_TVA", "");

                    }
                    data.put(ob);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return data;
    }

    public TPreenregistrementDetail getInvendus(String idFamille) {
        TPreenregistrementDetail detail = null;
        try {
            detail = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 ORDER BY o.dtUPDATED DESC ",
                    TPreenregistrementDetail.class).setParameter(1, idFamille).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return detail;
    }

    public JSONArray etatStockRepport(String str_TYPE_TRANSACTION, String criteria, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int int_NUMBER) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        JSONArray aray = new JSONArray();
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> st = root.join("tFamilleStockCollection", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            if (!"".equals(criteria)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(root.get(TFamille_.strNAME), criteria + "%"),
                                cb.like(root.get(TFamille_.intCIP), criteria + "%"),
                                cb.like(root.get(TFamille_.intEAN13), criteria + "%"),
                                cb.like(root.get(TFamille_.lgFAMILLEID), criteria + "%"),
                                cb.like(root.get(TFamille_.strDESCRIPTION), criteria + "%")));
            }

            predicate = cb.and(predicate, cb.equal(root.get(TFamille_.strSTATUT), "enable"));
            predicate = cb.and(predicate,
                    cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            if (!"".equals(lg_FAMILLEARTICLE_ID)) {
                Join<TFamille, TFamillearticle> famillearticle = root.join("lgFAMILLEARTICLEID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(famillearticle.get("lgFAMILLEARTICLEID"), lg_FAMILLEARTICLE_ID));
            }
            if (!"".equals(lg_ZONE_GEO_ID)) {
                Join<TFamille, TZoneGeographique> zoJoin = root.join("lgZONEGEOID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(zoJoin.get("lgZONEGEOID"), lg_ZONE_GEO_ID));
            }
            if (!"".equals(lg_GROSSISTE_ID)) {
                Join<TFamille, TGrossiste> g = root.join("lgGROSSISTEID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(g.get("lgGROSSISTEID"), lg_GROSSISTE_ID));
            }
            switch (str_TYPE_TRANSACTION) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.SEUIL:
                Predicate SEUIL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.intSEUILMIN));
                predicate = cb.and(predicate, SEUIL);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MORE);
                break;
            case Parameter.MOREOREQUAL:
                Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MOREOREQUAL);
                break;
            case Parameter.LESSOREQUAL:
                Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESSOREQUAL);
                break;
            default:
                break;
            }

            cq.multiselect(root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.strDESCRIPTION),
                    root.get(TFamille_.intCIP), root.get(TFamille_.intPRICE), st.get(TFamilleStock_.intNUMBERAVAILABLE),
                    root.get(TFamille_.intPAF), root.get("lgCODETVAID").get("intVALUE"),
                    root.get(TFamille_.intSEUILMIN), root.get("lgZONEGEOID").get("strCODE"),
                    root.get("lgGROSSISTEID").get("strLIBELLE"), root.get("lgZONEGEOID").get("strLIBELLEE"))
                    .orderBy(cb.asc(root.get(TFamille_.strDESCRIPTION))).distinct(true);

            cq.where(predicate);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();
            boolean afficherStock = findParametre("AFFICHER_STOCK");
            list.forEach((t) -> {

                try {
                    JSONObject ob = new JSONObject();

                    ob.put("lg_FAMILLE_ID", t[0]);
                    ob.put("int_CIP", t[2]);
                    ob.put("str_NAME", t[1]);
                    ob.put("int_PAF", t[5]);
                    ob.put("int_PRICE", t[3]);
                    ob.put("int_NUMBER", t[4]);
                    ob.put("int_SEUIL_MIN", t[7]);
                    ob.put("str_CODE", t[8]);
                    ob.put("int_VALUE", t[6]);
                    ob.put("str_LIBELLE", t[9]);
                    ob.put("str_LIBELLEE", t[10]);
                    ob.put("afficherStock", afficherStock);
                    aray.put(ob);
                } catch (JSONException ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            });

        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return aray;

    }
}
