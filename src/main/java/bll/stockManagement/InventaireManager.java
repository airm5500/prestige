/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stockManagement;

import bll.bllBase;
import bll.configManagement.familleManagement;
import bll.entity.EntityData;
import bll.teller.tellerManagement;
import bll.userManagement.privilege;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TTypeStock;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.io.File;
import java.io.FileWriter;
import java.sql.ResultSetMetaData;
import java.util.Date;
import java.util.*;
import javax.persistence.CacheRetrieveMode;
import org.hibernate.jpa.QueryHints;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.filesmanagers.FilesType.CsvFiles;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class InventaireManager extends bllBase {

    /*
     * TInventaire OInventaire = new TInventaire(); TInventaireFamille OTInventaireFamille = new TInventaireFamille();
     */
    public InventaireManager(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public InventaireManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    // fonction pour créer un inventaire
    public TInventaire createInventaire(String str_NAME, String str_DESCRIPTION, String str_TYPE) {
        Date today = new Date();
        TInventaire OInventaire = new TInventaire();
        try {
            OInventaire.setLgINVENTAIREID(this.getKey().getComplexId());
            OInventaire.setStrNAME(str_NAME);
            OInventaire.setStrDESCRIPTION(str_DESCRIPTION);
            OInventaire.setLgUSERID(this.getOTUser());
            OInventaire.setStrTYPE(str_TYPE.toLowerCase());
            OInventaire.setStrSTATUT(commonparameter.statut_enable);
            OInventaire.setDtCREATED(today);
            OInventaire.setDtUPDATED(today);
            if (this.persiste(OInventaire)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de l'inventaire");
            }

            return OInventaire;
        } catch (Exception e) {

            this.buildErrorTraceMessage("Echec de création de l'inventaire");
            new logger().OCategory.info(this.getDetailmessage());
            return null;
        }
    }
    // fin fonction pour créer un inventaire

    // fonction pour supprimer un inventaire
    public boolean deleteInventaire(String lg_INVENTAIRE_ID) {
        boolean result = false;
        TInventaire OInventaire = null;
        String query = "";
        long count = 0;
        /*
         * try {
         *
         * OInventaire.setLgUSERID(this.getOTUser()); // a decommenter en cas de probleme. 10/08/2016
         * OInventaire.setStrSTATUT(commonparameter.statut_delete); OInventaire.setDtUPDATED(new Date());
         * this.persiste(OInventaire); result = true;
         * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); } catch (Exception e) {
         * e.printStackTrace(); this.buildErrorTraceMessage("Echec de suppression de l'inventaire"); }
         */

        OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
        if (OInventaire != null) {
            query = " CALL `proc_delete_inventory`('" + OInventaire.getLgINVENTAIREID() + "','"
                    + OInventaire.getStrSTATUT() + "','" + commonparameter.statut_delete + "','"
                    + OInventaire.getLgUSERID().getLgUSERID() + "')";
        }
        try {
            Object resultat = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();
            count = Long.valueOf(String.valueOf(resultat));
            new logger().OCategory.info(count);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de l'inventaire");

        }
        return result;
    }
    // fin fonction pour supprimer un inventaire

    // fonction pour supprimer un article d'un inventaire
    public boolean deleteInventaireFamille(String lg_INVENTAIRE_FAMILLE_ID) {
        boolean result = false;
        try {
            TInventaireFamille OTInventaireFamille = this.getOdataManager().getEm().find(TInventaireFamille.class,
                    lg_INVENTAIRE_FAMILLE_ID);
            this.delete(OTInventaireFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de l'article de l'inventaire");
        }
        return result;
    }

    public boolean deleteInventaireFamille(String lg_INVENTAIRE_ID, String lg_FAMILLE_ID) {
        boolean result = false;
        try {
            TInventaire OTInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
            TFamille OTFamille = new familleManagement(this.getOdataManager()).getTFamille(lg_FAMILLE_ID);
            TInventaireFamille OTInventaireFamille = (TInventaireFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaireFamille t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_INVENTAIRE_ID).getSingleResult();
            if (this.delete(OTInventaireFamille)) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de suppression");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de l'article de l'inventaire");
        }
        return result;
    }
    // fin fonction pour supprimer un article d'un inventaire

    // ajouter des produits a inventaire famille
    public boolean createInventaireFamilleBis(String lg_INVENTAIRE_ID, String liste_famille, boolean bool_INVENTAIRE) {
        boolean result = false;
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        int i = 0;

        try {
            TInventaire OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
            new logger().OCategory.info("date inventaire " + OInventaire.getDtCREATED());

            String[] TabIdFamille = liste_famille.split(",");
            for (int j = 0; j < TabIdFamille.length; j++) {
                TFamille OTFamille = OfamilleManagement.getTFamille(TabIdFamille[j]);
                if (this.createInventaireFamille(OInventaire, OTFamille.getLgFAMILLEID(), bool_INVENTAIRE)) {
                    i++;
                }
            }
            new logger().OCategory.info("Valeur i " + i + " Taille liste id " + TabIdFamille.length);
            if (i == TabIdFamille.length) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de d'ajout des articles sélectionnés à l'inventaire");
        }
        return result;
    }

    public boolean createInventaireFamille(String lg_INVENTAIRE_ID, String lg_FAMILLE_ID, boolean bool_INVENTAIRE) {
        boolean result = false;
        try {
            TInventaire OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
            new logger().OCategory.info("date inventaire " + OInventaire.getDtCREATED());

            // TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);
            result = this.createInventaireFamille(OInventaire, lg_FAMILLE_ID, bool_INVENTAIRE);

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de d'ajout de l'article à l'inventaire");
        }
        return result;
    }

    // recuperation de l'article dans un inventaire
    public TInventaireFamille getTInventaireFamille(String lg_INVENTAIRE_ID, String lg_FAMILLE_ID) {
        TInventaireFamille OTInventaireFamille = null;
        try {
            OTInventaireFamille = (TInventaireFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_FAMILLE_ID)
                    .setParameter(3, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTInventaireFamille;
    }
    // fin recuperation de l'article dans un inventaire

    // ajout d'un produit un inventaire unitaire
    /*
     * public boolean updateInventaireUnitaireFamille(String lg_INVENTAIRE_ID, String lg_FAMILLE_ID, boolean
     * bool_INVENTAIRE) { boolean result = false; TInventaireFamille OTInventaireFamille = null; try {
     * OTInventaireFamille = this.getTInventaireFamille(lg_INVENTAIRE_ID, lg_FAMILLE_ID); if (OTInventaireFamille ==
     * null) { this.buildErrorTraceMessage("Echec de l'opération"); return result; }
     * OTInventaireFamille.setBoolINVENTAIRE(bool_INVENTAIRE); if (this.persiste(OTInventaireFamille)) { result = true;
     * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); } else {
     * this.buildErrorTraceMessage("Echec de l'opération"); } } catch (Exception e) { e.printStackTrace();
     * this.buildErrorTraceMessage("Echec de l'opération"); } return result; }
     */
    // fin ajout d'un produit un inventaire unitaire
    public boolean createInventaireFamille(TInventaire OInventaire, String lg_FAMILLE_ID, boolean bool_INVENTAIRE) {
        boolean result = false;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        try {

            TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);
            TFamilleStock OTFamilleStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEID());
            TInventaireFamille OTInventaireFamille = new TInventaireFamille();
            // OTInventaireFamille.setLgINVENTAIREFAMILLEID(this.getKey().getComplexId());
            OTInventaireFamille.setLgFAMILLEID(OTFamille);
            OTInventaireFamille.setLgINVENTAIREID(OInventaire);
            OTInventaireFamille.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
            OTInventaireFamille.setIntNUMBERINIT(OTFamilleStock.getIntNUMBERAVAILABLE());
            OTInventaireFamille.setBoolINVENTAIRE(bool_INVENTAIRE);
            OTInventaireFamille.setStrSTATUT(commonparameter.statut_enable);
            OTInventaireFamille.setDtCREATED(new Date());
            this.persiste(OTInventaireFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de d'ajout de l'article à l'inventaire");
        }
        return result;
    }

    public boolean createInventaireFamille(String lg_INVENTAIRE_ID, List<TFamille> lst, boolean bool_INVENTAIRE) {
        boolean result = false;
        int i = 0;
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            lstTFamille = lst;
            // new logger().OCategory.info("lstTFamille size dans createInventaireFamille " + lstTFamille.size() + "
            // lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
            for (TFamille OTFamille : lstTFamille) {
                if (this.createInventaireFamille(lg_INVENTAIRE_ID, OTFamille.getLgFAMILLEID(), bool_INVENTAIRE)) {
                    i++;
                }
            }
            // new logger().OCategory.info("lstTFamille out " + lstTFamille.size() + " i " + i);
            if (i == lstTFamille.size()) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec d'ajout des produits à l'inventaire");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de l'inventaire");
        }
        return result;
    }

    public boolean createInventaireFamille(TInventaire OTInventaire, List<TFamille> lst, boolean bool_INVENTAIRE) {
        boolean result = false;
        int i = 0;
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            lstTFamille = lst;
            // new logger().OCategory.info("lstTFamille size dans createInventaireFamille " + lstTFamille.size() + "
            // lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
            for (TFamille OTFamille : lstTFamille) {
                if (this.createInventaireFamille(OTInventaire, OTFamille.getLgFAMILLEID(), bool_INVENTAIRE)) {
                    i++;
                }
            }
            new logger().OCategory.info("lstTFamille out " + lstTFamille.size() + " i " + i);
            if (i > 0) {
                if (i == lstTFamille.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage(
                            i + "/" + lstTFamille.size() + " ont été pris en compte pour cet inventaire");
                }
            } else {
                this.delete(OTInventaire);
                this.buildErrorTraceMessage("Echec d'ajout des produits à l'inventaire");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de l'inventaire");
        }
        return result;
    }
    // fin ajouter des produits a inventaire famille

    // ajouter des produits a inventaire famille
    // public boolean updateInventaireFamille(String lg_INVENTAIRE_FAMILLE_ID, String lg_INVENTAIRE_ID, String
    // lg_FAMILLE_ID,
    // String int_CIP, String str_DESCRIPTION, String lg_ZONE_GEO_ID, String lg_FAMILLEARTICLE_ID, int int_PRICE, int
    // int_NUMBER, int int_QTE_REAPPROVISIONNEMENT) {
    public boolean updateInventaireFamille(String lg_INVENTAIRE_FAMILLE_ID, String lg_INVENTAIRE_ID,
            String lg_FAMILLE_ID, String int_CIP, String str_DESCRIPTION, String lg_ZONE_GEO_ID,
            String lg_FAMILLEARTICLE_ID, String lg_GROSSISTE_ID, int int_PRICE, int int_NUMBER) {

        boolean result = false;
        // familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        // grossisteManagement OgrossisteManagement = new grossisteManagement(this.getOdataManager());
        try {
            TInventaireFamille OTInventaireFamille = this.getOdataManager().getEm().find(TInventaireFamille.class,
                    Long.valueOf(lg_INVENTAIRE_FAMILLE_ID));
            // TInventaire OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);

            // TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);
            // OTInventaireFamille.setLgFAMILLEID(OTFamille);
            // OTInventaireFamille.setLgINVENTAIREID(OInventaire);
            OTInventaireFamille.setIntNUMBER(int_NUMBER);

            OTInventaireFamille.setDtUPDATED(new Date());
            this.persiste(OTInventaireFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de l'inventaire");
        }
        return result;
    }
    // fin ajouter des produits a inventaire famille

    // Liste des articles d'un inventaire
    public List<TInventaireFamille> listTFamilleByInventaire(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, boolean boolINVENTAIRE) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = null;
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!lg_INVENTAIRE_ID.equalsIgnoreCase("%%")) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 ORDER BY t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE ASC, t.lgFAMILLEID.strDESCRIPTION")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6  OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE , t.lgFAMILLEID.strDESCRIPTION")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgGROSSISTEID.strCODE ASC, t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE).getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE , t.lgFAMILLEID.strDESCRIPTION")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE).getResultList();

                }
            } else {
                /*
                 * lstTInventaireFamille = this.getOdataManager().getEm().
                 * createQuery("SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.strDESCRIPTION LIKE ?5 OR t.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6) AND t.boolINVENTAIRE = ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC"
                 * ) .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID).setParameter(3,
                 * lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID).setParameter(5, search_value +
                 * "%").setParameter(6, search_value + "%").setParameter(8, boolINVENTAIRE).getResultList();
                 */
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TInventaireFamille t, TFamille g WHERE t.lgINVENTAIREID.lgINVENTAIREID =?1  AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?3 AND g.lgZONEGEOID.lgZONEGEOID  LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strLIBELLE LIKE ?5  OR g.intEAN13 LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE 5 ) AND t.boolINVENTAIRE = ?6  ORDER BY g.strNAME ASC ")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(6, search_value + "%")
                        .setParameter(8, boolINVENTAIRE).getResultList();

            }
            // new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaireFamille;
    }

    public List<TInventaireFamille> listTFamilleByInventaire(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = null;
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!lg_INVENTAIRE_ID.equalsIgnoreCase("%%")) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {

                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strNAME LIKE ?5 OR t.lgFAMILLEID.intCIP LIKE ?5 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strLIBELLE LIKE ?5 ) ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ASC, t.lgFAMILLEID.strDESCRIPTION  ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(6, search_value + "%").getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?5 OR t.lgFAMILLEID.intCIP LIKE ?6) ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(6, search_value + "%").getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("fabriquant")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.strDESCRIPTION LIKE ?5 OR t.intCIP LIKE ?6) ORDER BY t.lgFABRIQUANTID.strNAME ASC, t.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(6, search_value + "%").getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?5 OR t.lgFAMILLEID.intCIP LIKE ?6) ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ASC, t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(6, search_value + "%").getResultList();
                }
            } else {
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?5 OR t.lgFAMILLEID.intCIP LIKE ?6) ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ASC, t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(6, search_value + "%").getResultList();
            }
            // new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaireFamille;
    }

    public List<TInventaireFamille> listTFamilleByInventaire(String search_value, String lg_INVENTAIRE_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTFamilleByInventaire lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
            lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?5 OR t.lgFAMILLEID.intCIP LIKE ?6) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                    .setParameter(1, lg_INVENTAIRE_ID).setParameter(5, "%" + search_value + "%")
                    .setParameter(6, "%" + search_value + "%").getResultList();
            new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());
            for (TInventaireFamille OTInventaireFamille : lstTInventaireFamille) {
                this.refresh(OTInventaireFamille);
                new logger().OCategory.info("Famille " + OTInventaireFamille.getLgFAMILLEID().getStrDESCRIPTION());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaireFamille;
    }
    // fin Liste des articles d'un inventaire

    // liste des inventaires
    public List<TInventaire> listInventaire(String lg_INVENTAIRE_ID, String str_STATUT) {

        List<TInventaire> lstTInventaire = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (str_STATUT.equalsIgnoreCase("") || str_STATUT == null) {
                str_STATUT = commonparameter.statut_enable;
            }

            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            lstTInventaire = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaire t WHERE t.lgINVENTAIREID LIKE ?1 AND t.strSTATUT LIKE ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, str_STATUT).setParameter(3, lg_EMPLACEMENT_ID)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaire;
    }

    public List<TInventaire> listInventaire(String lg_INVENTAIRE_ID) {

        List<TInventaire> lstTInventaire = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";

        try {

            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            lstTInventaire = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaire t WHERE t.lgINVENTAIREID LIKE ?1 AND (t.strSTATUT LIKE ?2 OR t.strSTATUT LIKE ?3) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?4 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, commonparameter.statut_is_Closed).setParameter(4, lg_EMPLACEMENT_ID)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaire;
    }

    // fin liste des inventaires
    // verifie si un article existe deja dans un inventaire
    public boolean isExistArticleInventaire(String lg_INVENTAIRE_ID, String lg_FAMILLE_ID) {
        boolean result = false;
        try {
            TInventaire OTInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
            TFamille OTFamille = new familleManagement(this.getOdataManager()).getTFamille(lg_FAMILLE_ID);
            TInventaireFamille OTInventaireFamille = (TInventaireFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaireFamille t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_INVENTAIRE_ID).getSingleResult();
            // new logger().OCategory.info("CIP " + OTInventaireFamille.getLgFAMILLEID().getIntCIP());
            if (OTInventaireFamille != null) {
                result = true;
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return result;
    }
    // fin verifie si un article existe deja dans un inventaire

    // Liste des articles qui ne sont pas dans inventaire famille
    public List<TFamille> listTFamilleNotinInventaireFamille(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID, String lg_EMPLACEMENT_ID) {

        List<TFamille> lstTFamille = new ArrayList<TFamille>();
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory
                    .info(" dans la fonction listTFamilleNotinInventaireFamille lg_INVENTAIRE_ID :" + lg_INVENTAIRE_ID
                            + " lg_FAMILLEARTICLE_ID " + lg_FAMILLEARTICLE_ID + " lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID);

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String qry = "SELECT * FROM t_famille t WHERE t.str_NAME LIKE '%" + search_value + "%' AND
            // t.lg_FAMILLE_ID NOT IN (SELECT fi.lg_FAMILLE_ID FROM t_inventaire_famille fi WHERE fi.lg_INVENTAIRE_ID =
            // '" + lg_INVENTAIRE_ID + "') ";
            /*
             * String qry = "SELECT * FROM t_famille t WHERE t.str_NAME LIKE '%" + search_value +
             * "%' AND t.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID + "' AND t.lg_ZONE_GEO_ID LIKE '" +
             * lg_ZONE_GEO_ID + "' AND t.lg_FAMILLE_ID \n" +
             * "NOT IN (SELECT fi.lg_FAMILLE_ID FROM t_inventaire_famille fi WHERE fi.lg_INVENTAIRE_ID = '" +
             * lg_INVENTAIRE_ID + "') ";
             */
            String qry = "SELECT t.* FROM t_famille t, t_type_stock_famille tt WHERE tt.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND tt.lg_EMPLACEMENT_ID = '"
                    + lg_EMPLACEMENT_ID + "' AND t.str_NAME LIKE '%" + search_value
                    + "%' AND t.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID + "' AND t.lg_FABRIQUANT_ID LIKE '"
                    + lg_FABRIQUANT_ID + "' AND t.lg_ZONE_GEO_ID LIKE '" + lg_ZONE_GEO_ID + "' AND t.lg_FAMILLE_ID \n"
                    + "NOT IN (SELECT fi.lg_FAMILLE_ID FROM t_inventaire_famille fi WHERE fi.lg_INVENTAIRE_ID = '"
                    + lg_INVENTAIRE_ID + "') ";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setIntPRICE(Integer.parseInt(Ojconnexion.get_resultat().getString("int_PRICE")));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntPAF(Integer.parseInt(Ojconnexion.get_resultat().getString("int_PAF")));
                OTFamille.setIntPAT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_PAT")));
                // TFamille OTFamille =
                // OfamilleManagement.getTFamille(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();

            /*
             * for (TFamille OTFamille : lstTFamille) { this.refresh(OTFamille); new logger().OCategory.info("Famille "
             * + OTFamille.getStrDESCRIPTION()); }
             */
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTFamille.size());
        return lstTFamille;
    }
    // fin Liste des articles qui ne sont pas dans inventaire famille

    // fonction de cloture d'un inventaire
    public boolean closureInventaire(String lg_INVENTAIRE_ID, String lg_TYPE_STOCK_ID) {
        boolean result = false;
        List<TInventaireFamille> lstInventaireFamilles = new ArrayList<>();
        int i = 0;
        try {
            TInventaire OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
            TTypeStock OTypeStock = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStock(lg_TYPE_STOCK_ID);

            lstInventaireFamilles = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.lgINVENTAIREID = ?1 AND t.strSTATUT = ?2 AND t.boolINVENTAIRE = ?3")
                    .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, true).getResultList();

            for (TInventaireFamille OTInventaireFamille : lstInventaireFamilles) {
                if (OTInventaireFamille.getIntNUMBER() != OTInventaireFamille.getIntNUMBERINIT()) {
                    if (new familleManagement(this.getOdataManager(), this.getOTUser()).update(
                            OTInventaireFamille.getLgFAMILLEID().getLgFAMILLEID(), OTInventaireFamille.getIntNUMBER(),
                            OTInventaireFamille.getLgINVENTAIREID().getDtCREATED(), OTypeStock)) {
                        OTInventaireFamille.setStrSTATUT(commonparameter.statut_is_Closed);
                        OTInventaireFamille.setDtUPDATED(new Date());
                        if (this.persiste(OTInventaireFamille)) {
                            i++;
                        }

                    }
                } else {
                    OTInventaireFamille.setStrSTATUT(commonparameter.statut_is_Closed);
                    OTInventaireFamille.setDtUPDATED(new Date());
                    if (this.persiste(OTInventaireFamille)) {
                        i++;
                    }
                }

            }
            // new logger().OCategory.info("Valeur i: " + i + " lstInventaireFamilles taille " +
            // lstInventaireFamilles.size());
            if (i > 0) {
                if (i == lstInventaireFamilles.size()) {
                    OInventaire.setStrSTATUT(commonparameter.statut_is_Closed);
                    OInventaire.setDtUPDATED(new Date());
                    if (this.persiste(OInventaire)) {
                        result = true;
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    }
                } else {
                    this.buildErrorTraceMessage(i + "/" + lstInventaireFamilles.size()
                            + " produits ont été pris en compte. Veuillez réessayer pour finaliser");
                }
            } else {
                this.buildErrorTraceMessage("Aucun produit pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de l'inventaire");
        }
        // new logger().OCategory.info("result " + result + " Message " + this.getDetailmessage());
        return result;
    }
    // fin fonction de cloture d'un inventaire

    // liste des ecarts d'inventaire (manquant ou surplus)
    public List<TInventaireFamille> listEcartInventaire(String search_value) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<TInventaireFamille>();
        List<TInventaire> lstTInventaire = new ArrayList<TInventaire>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            // new logger().OCategory.info("search_value " + search_value + " dans la fonction listEcartInventaire
            // search_value " + search_value);
            lstTInventaire = this.listInventaire("%%", commonparameter.statut_is_Closed);
            if (lstTInventaire.size() > 0) {
                TInventaire OInventaire = lstTInventaire.get(0);
                // new logger().OCategory.info("Inventaire du " + OInventaire.getDtCREATED());
                // lstTInventaireFamille = this.getOdataManager().getEm().createQuery("SELECT t FROM TInventaireFamille
                // t, TFamille f WHERE t.lgFAMILLEID.lgFAMILLEID = f.lgFAMILLEID AND t.lgINVENTAIREID.dtCREATED = ?1 AND
                // (t.lgFAMILLEID.strDESCRIPTION LIKE ?2 OR t.lgFAMILLEID.intCIP LIKE ?3) ORDER BY
                // t.lgFAMILLEID.strDESCRIPTION ASC")
                // .setParameter(1, OInventaire.getDtCREATED()).setParameter(2, "%" + search_value +
                // "%").setParameter(3, "%" + search_value + "%").getResultList();
                //
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.dtCREATED = ?1 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?2 OR t.lgFAMILLEID.intCIP LIKE ?3) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, OInventaire.getDtCREATED()).setParameter(2, "%" + search_value + "%")
                        .setParameter(3, "%" + search_value + "%").getResultList();

                // new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());
                for (TInventaireFamille OTInventaireFamille : lstTInventaireFamille) {
                    this.refresh(OTInventaireFamille);
                    // new logger().OCategory.info("Famille " + OTInventaireFamille.getLgFAMILLEID().getStrDESCRIPTION()
                    // + " Date creation " + OTInventaireFamille.getLgINVENTAIREID().getDtCREATED());
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaireFamille;
    }

    // liste ecart inventaire surplus
    public List<TInventaireFamille> listEcartInventaireSurplus(String search_value) {

        List<TInventaireFamille> lstTFamilleFanal = new ArrayList<TInventaireFamille>();
        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<TInventaireFamille>();
        List<TInventaire> lstTInventaire = new ArrayList<TInventaire>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listEcartInventaireSurplus search_value " + search_value);
            lstTInventaire = this.listInventaire("%%", commonparameter.statut_is_Closed);
            if (lstTInventaire.size() > 0) {
                TInventaire OInventaire = lstTInventaire.get(0);
                new logger().OCategory.info("Inventaire du " + OInventaire.getDtCREATED());
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.dtCREATED = ?1 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?2 OR t.lgFAMILLEID.intCIP LIKE ?3) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, OInventaire.getDtCREATED()).setParameter(2, "%" + search_value + "%")
                        .setParameter(3, "%" + search_value + "%").getResultList();
                new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());

                for (TInventaireFamille OTInventaireFamille : lstTInventaireFamille) {
                    this.refresh(OTInventaireFamille);
                    int ecart = OTInventaireFamille.getIntNUMBER() - OTInventaireFamille.getIntNUMBERINIT();
                    new logger().OCategory.info(
                            "ecart " + ecart + " Famille " + OTInventaireFamille.getLgFAMILLEID().getStrDESCRIPTION()
                                    + " qte finale " + OTInventaireFamille.getIntNUMBER() + " qte initiale "
                                    + OTInventaireFamille.getIntNUMBERINIT());
                    if (ecart > 0) {
                        lstTFamilleFanal.add(OTInventaireFamille);
                    }
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTFamilleFanal size " + lstTFamilleFanal.size());
        return lstTFamilleFanal;
    }

    public List<TInventaireFamille> allEcartInventaireSurplus(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int start, int limit,
            String lg_USER_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = null;
        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgFAMILLEARTICLEID.strCODEFAMILLE , g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgZONEGEOID.strCODE , g.strDESCRIPTION ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g    WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgGROSSISTEID.strCODE, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgZONEGEOID.strLIBELLEE ASC, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                }
            } else {
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?6 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ORDER BY g.strDESCRIPTION ASC")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                        .setFirstResult(start).setMaxResults(limit).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTInventaireFamille size " + lstTInventaireFamille.size());
        return lstTInventaireFamille;

    }

    public List<TInventaireFamille> listEcartInventaireSurplus(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int start, int limit,
            String lg_USER_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = null;
        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgFAMILLEARTICLEID.strCODEFAMILLE , g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgZONEGEOID.strCODE , g.strDESCRIPTION ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g    WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgGROSSISTEID.strCODE, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9  ORDER BY g.lgZONEGEOID.strLIBELLEE ASC, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                }
            } else {
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?6 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER != t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9  ORDER BY g.strDESCRIPTION ASC")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                        .setFirstResult(start).setMaxResults(limit).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTInventaireFamille size " + lstTInventaireFamille.size());
        return lstTInventaireFamille;

    }
    // fin liste ecart inventaire surplus

    // liste ecart inventaire manquant
    public List<TInventaireFamille> listEcartInventaireManquant(String search_value) {

        List<TInventaireFamille> lstTFamilleFanal = new ArrayList<TInventaireFamille>();
        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        List<TInventaire> lstTInventaire = new ArrayList<>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listEcartInventaireManquant search_value " + search_value);
            lstTInventaire = this.listInventaire("%%", commonparameter.statut_is_Closed);
            if (lstTInventaire.size() > 0) {
                TInventaire OInventaire = lstTInventaire.get(0);
                new logger().OCategory.info("Inventaire du " + OInventaire.getDtCREATED());
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREID.dtCREATED = ?1 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?2 OR t.lgFAMILLEID.intCIP LIKE ?3) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, OInventaire.getDtCREATED()).setParameter(2, "%" + search_value + "%")
                        .setParameter(3, "%" + search_value + "%").getResultList();
                new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());

                for (TInventaireFamille OTInventaireFamille : lstTInventaireFamille) {
                    this.refresh(OTInventaireFamille);
                    int ecart = OTInventaireFamille.getIntNUMBER() - OTInventaireFamille.getIntNUMBERINIT();
                    new logger().OCategory.info(
                            "ecart " + ecart + " Famille " + OTInventaireFamille.getLgFAMILLEID().getStrDESCRIPTION()
                                    + " qte finale " + OTInventaireFamille.getIntNUMBER() + " qte initiale "
                                    + OTInventaireFamille.getIntNUMBERINIT());
                    if (ecart < 0) {
                        lstTFamilleFanal.add(OTInventaireFamille);
                    }
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTFamilleFanal size " + lstTFamilleFanal.size());
        return lstTFamilleFanal;

    }

    public List<TInventaireFamille> listEcartInventaireManquant(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int start, int limit,
            String lg_USER_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = null;
        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille f WHERE f.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND f.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND f.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND f.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (f.strDESCRIPTION LIKE ?5 OR f.intCIP LIKE ?5 OR f.lgGROSSISTEID.strCODE LIKE ?5 OR f.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 ORDER BY f.lgFAMILLEARTICLEID.strLIBELLE , f.strDESCRIPTION ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9  ORDER BY g.lgZONEGEOID.strLIBELLEE ASC, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ORDER BY  g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit).getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ORDER BY g.lgZONEGEOID.strLIBELLEE ASC, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit).getResultList();
                }
            } else {
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8  ORDER BY g.strDESCRIPTION ASC")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                        .setFirstResult(start).setMaxResults(limit).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTInventaireFamille size " + lstTInventaireFamille.size());
        return lstTInventaireFamille;

    }
    // fin liste ecart inventaire manquant
    // fin liste des ecarts d'inventaire (manquant ou surplus)

    // liste des produits alertes
    public List<TInventaireFamille> listAlertInventaire(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int int_ALERTE, int start,
            int limit) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaireFamille famille;

        TInventaire OInventaire = null;
        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }
            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8 ORDER BY g.lgFAMILLEARTICLEID.strCODEFAMILLE ASC, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT  DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8  ORDER BY g.lgZONEGEOID.strCODE ASC, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8  ORDER BY g.lgGROSSISTEID.strCODE , g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8  ORDER BY g.lgZONEGEOID.strLIBELLEE ASC, g.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                }
            } else {
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?6 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8 ORDER BY g.strDESCRIPTION ASC")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(6, search_value + "%")
                        .setParameter(7, int_ALERTE).setParameter(8, true).setFirstResult(start).setMaxResults(limit)
                        .getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTInventaireFamille size " + lstTInventaireFamille.size());
        return lstTInventaireFamille;

    }

    // fin liste des produits alertes
    // exportation en fichier txt ou csv
    public String getFilePathToExportTxtOrCsv(String str_TYPEREPORT, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID) {
        String FILEPATH = "";
        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);

        // charge la liste des inventaires details
        lstTInventaireFamille = this.listTFamilleByInventaire("", lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID,
                lg_ZONE_GEO_ID, lg_GROSSISTE_ID, true);

        if (str_TYPEREPORT.equals(commonparameter.type_txt)) {
            FILEPATH = this.ExportToTxt(lstTInventaireFamille, OInventaire);
        } else if (str_TYPEREPORT.equals(commonparameter.type_csv)) {
            FILEPATH = this.ExportToCsv(lstTInventaireFamille, OInventaire);
        }
        return FILEPATH;
    }
    // exportation en fichier txt ou csv

    // exportation inventaire en txt
    public String ExportToTxt(List<TInventaireFamille> lstTInventaireFamille, TInventaire OTInventaire) {
        String str_NAMEFILE = "";
        String PATHSYSTEM = "";
        String filepath = "";
        jdom.InitRessource();
        jdom.LoadRessource();
        date Key = new date();

        try {

            str_NAMEFILE = "inventaire_" + this.getKey().getComplexId() + commonparameter.extension_txt;
            filepath = jdom.path_export_txt + str_NAMEFILE;

            File ff = new File(filepath); // définir l'arborescence
            ff.createNewFile();
            FileWriter ffw = new FileWriter(ff);

            try {
                ffw.write("Inventaire du " + OTInventaire.getDtCREATED() + "\n\n");
                ffw.write("Libellé: " + OTInventaire.getStrNAME() + "\n");
                ffw.write("Commentaire: " + OTInventaire.getStrDESCRIPTION() + "\n");
                ffw.write("Opérateur: " + OTInventaire.getLgUSERID().getStrFIRSTNAME() + " "
                        + OTInventaire.getLgUSERID().getStrLASTNAME() + "\n");
                ffw.write("\n\n");
                // ecriture du detail de l'inventaire
                for (TInventaireFamille OTInventaireFamille : lstTInventaireFamille) {
                    ffw.write(OTInventaireFamille.getLgFAMILLEID().getIntCIP() + " *** "
                            + OTInventaireFamille.getLgFAMILLEID().getStrDESCRIPTION() + " *** "
                            + OTInventaireFamille.getLgFAMILLEID().getIntPRICE() + " *** "
                            + OTInventaireFamille.getLgFAMILLEID().getIntPAT() + " *** "
                            + OTInventaireFamille.getLgFAMILLEID().getIntPAF() + " *** "
                            + OTInventaireFamille.getIntNUMBER() + "\n");
                }
                ffw.write("\n\n");
                ffw.write("Date de création du fichier: " + new Date()); // écrire une ligne dans le fichier
                // resultat.txt
                ffw.write("\n"); // forcer le passage à la ligne
                ffw.close(); // fermer le fichier à la fin des traitements
            } catch (Exception e) {
                e.printStackTrace();
            }

            System.out.println("Fichier txt généré avec succès! Chemin  " + filepath);

        } catch (Exception ex) {
            System.out.println(ex);
        }
        return filepath;
    }

    // exportation inventaire en csv
    public String ExportToCsv(List<TInventaireFamille> lstTInventaireFamille, TInventaire OTInventaire) {
        String str_NAMEFILE = "";
        String PATHSYSTEM = "";
        String filepath = "";
        jdom.InitRessource();
        jdom.LoadRessource();
        date Key = new date();

        try {

            str_NAMEFILE = "inventaire_" + this.getKey().getComplexId() + commonparameter.extension_csv;
            filepath = jdom.path_export_csv + str_NAMEFILE;

            List<String> lstData = new ArrayList<>();
            // String ItemDataHeader = "Inventaire du " + OTInventaire.getDtCREATED() + "\n\n"
            // + OTInventaire.getStrNAME() + ";"
            // + OTInventaire.getStrDESCRIPTION() + ";"
            // + OTInventaire.getLgUSERID().getStrFIRSTNAME() + " "
            // + OTInventaire.getLgUSERID().getStrLASTNAME() + "\n\n";
            // lstData.add(ItemDataHeader);
            for (TInventaireFamille OTInventaireFamille : lstTInventaireFamille) {
                String ItemData = OTInventaireFamille.getLgFAMILLEID().getIntCIP() + ";"
                        + OTInventaireFamille.getLgFAMILLEID().getStrDESCRIPTION() + ";"
                        + OTInventaireFamille.getLgFAMILLEID().getIntPRICE() + ";"
                        + OTInventaireFamille.getLgFAMILLEID().getIntPAT() + ";"
                        + OTInventaireFamille.getLgFAMILLEID().getIntPAF() + ";" + OTInventaireFamille.getIntNUMBER();

                lstData.add(ItemData);
                // ffw.write(OTInventaireFamille.getIntCIP() + ";" + OTInventaireFamille.getStrDESCRIPTION() + ";" +
                // OTInventaireFamille.getIntPRICE() + ";" + OTInventaireFamille.getLgFAMILLEID().getIntPAT() + ";" +
                // OTInventaireFamille.getLgFAMILLEID().getIntPAF() + ";" + OTInventaireFamille.getIntNUMBER() + ";" +
                // OTInventaireFamille.getIntCOUTPAT() + ";" + OTInventaireFamille.getIntCOUTPAF() + "\n");
            }

            CsvFiles OCsvFiles = new CsvFiles();
            OCsvFiles.setPath_outut(filepath);
            OCsvFiles.SaveToFile(lstData);
            /*
             * File ff = new File(filepath); // définir l'arborescence ff.createNewFile(); FileWriter ffw = new
             * FileWriter(ff);
             *
             * try { ffw.write("Inventaire du " + OTInventaire.getDtCREATED() + "\n\n");
             * ffw.write(OTInventaire.getStrNAME() + ";" + OTInventaire.getStrDESCRIPTION() + ";" +
             * OTInventaire.getLgUSERID().getStrFIRSTNAME() + " " + OTInventaire.getLgUSERID().getStrLASTNAME() +
             * "\n\n"); //ecriture du detail de l'inventaire for (TInventaireFamille OTInventaireFamille :
             * lstTInventaireFamille) { ffw.write(OTInventaireFamille.getIntCIP() + ";" +
             * OTInventaireFamille.getStrDESCRIPTION() + ";" + OTInventaireFamille.getIntPRICE() + ";" +
             * OTInventaireFamille.getLgFAMILLEID().getIntPAT() + ";" + OTInventaireFamille.getLgFAMILLEID().getIntPAF()
             * + ";" + OTInventaireFamille.getIntNUMBER() + ";" + OTInventaireFamille.getIntCOUTPAT() + ";" +
             * OTInventaireFamille.getIntCOUTPAF() + "\n"); } ffw.write("\n\n");
             * ffw.write("Date de création du fichier: " + new Date()); // écrire une ligne dans le fichier resultat.txt
             * ffw.write("\n"); // forcer le passage à la ligne ffw.close(); // fermer le fichier à la fin des
             * traitements } catch (Exception e) { e.printStackTrace(); }
             */
            System.out.println("Fichier csv généré avec succès! Chemin  " + filepath);

        } catch (Exception ex) {
            System.out.println(ex);
        }
        return filepath;
    }

    // Liste des inventaires d'un article sur une période
    public List<TInventaireFamille> listTInventaireFamille(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String lg_INVENTAIRE_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            // new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
            lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaireFamille t WHERE (t.dtCREATED BETWEEN ?3 AND ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1) AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?2 AND t.lgINVENTAIREID.lgUSERID.lgUSERID LIKE ?5 AND t.lgINVENTAIREID.strSTATUT LIKE ?7 ORDER BY t.lgINVENTAIREID.dtCREATED DESC")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, lg_INVENTAIRE_ID)
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(6, lg_FAMILLE_ID).setParameter(7, commonparameter.statut_enable).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTInventaireFamille taille " + lstTInventaireFamille.size());
        return lstTInventaireFamille;
    }
    // fin Liste des inventaires d'un article sur une période

    // quantité inventoriée d'un article
    public int getQauntityInventaireByArticle(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String lg_INVENTAIRE_ID) {

        int result = 0;
        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTInventaireFamille = this.listTInventaireFamille(search_value, dtDEBUT, dtFin, lg_FAMILLE_ID, lg_USER_ID,
                    lg_INVENTAIRE_ID);
            for (TInventaireFamille OTInventaireFamille : lstTInventaireFamille) {
                result += OTInventaireFamille.getIntNUMBER();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    // fin quantité d'entree ou sortie d'un article
    // liste objet article
    public List<EntityData> showAllOrOneArticleByInventaire(String search_value, String lg_FAMILLE_ID,
            String lg_INVENTAIRE_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID,
            String lg_EMPLACEMENT_ID) {

        List<EntityData> Lst = new ArrayList<>();
        List<TFamille> lstTFamille = new ArrayList<>();
        EntityData OEntityData = null;

        try {
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 OR t.intCIP LIKE ?1 OR t.intEAN13 LIKE ?1) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7 AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8")
                    .setParameter(1, search_value + "%").setParameter(3, lg_FAMILLE_ID)
                    .setParameter(4, lg_FAMILLEARTICLE_ID).setParameter(5, lg_ZONE_GEO_ID)
                    .setParameter(6, lg_FABRIQUANT_ID).setParameter(7, commonparameter.statut_enable)
                    .setParameter(8, lg_EMPLACEMENT_ID).getResultList();

            for (TFamille OTFamille : lstTFamille) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(OTFamille.getLgFAMILLEID());
                OEntityData.setStr_value2(OTFamille.getStrNAME());
                OEntityData.setStr_value3(OTFamille.getStrDESCRIPTION());
                OEntityData.setStr_value4(String.valueOf(OTFamille.getIntPRICE()));
                OEntityData.setStr_value5(OTFamille.getIntCIP());
                OEntityData.setStr_value6(String.valueOf(OTFamille.getIntPAF()));
                OEntityData.setStr_value7(String.valueOf(OTFamille.getIntPAT()));
                OEntityData.setStr_value8(
                        String.valueOf(this.isExistArticleInventaire(lg_INVENTAIRE_ID, OTFamille.getLgFAMILLEID())));

                Lst.add(OEntityData);
            }

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("Taille liste " + Lst.size());
        return Lst;
    }
    // fin liste objet article

    // function creation inventaire 12042016 kobena
    public long createInventaire(String str_NAME, String lg_FAMILLE_ID, String str_DESCRIPTION,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String str_BEGIN,
            String str_END, String str_TYPE, int bool_INVENTAIRE) {
        long count = 0;
        Date today = new Date();
        try {
            TInventaire OTInventaire = new TInventaire(this.getKey().getComplexId());
            OTInventaire.setStrNAME(str_NAME);
            OTInventaire.setStrDESCRIPTION(str_DESCRIPTION);
            OTInventaire.setLgUSERID(this.getOTUser());
            OTInventaire.setStrTYPE(str_TYPE.toLowerCase());
            OTInventaire.setStrSTATUT(commonparameter.statut_enable);
            OTInventaire.setDtCREATED(today);
            OTInventaire.setDtUPDATED(today);
            OTInventaire.setLgEMPLACEMENTID(this.getOTUser().getLgEMPLACEMENTID());
            if (this.persiste(OTInventaire)) {
                count = this.createInventaireFamille(lg_FAMILLE_ID, OTInventaire.getLgINVENTAIREID(),
                        lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, str_BEGIN, str_END, bool_INVENTAIRE,
                        str_TYPE);
                if (count == 0) {
                    this.delete(OTInventaire);
                }

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de l'inventaire");
            }

            new logger().OCategory.info(this.getDetailmessage());

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de l'inventaire");
            new logger().OCategory.info(this.getDetailmessage());

        }
        return count;
    }

    public long createInventaireFamille(String lg_FAMILLE_ID, String LG_INVENTAIRE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String str_BEGIN, String str_END, int bool_INVENTAIRE,
            String str_TYPE) {
        long count = 0;
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String lg_TYPE_STOCK = "1";
        if (!lg_EMPLACEMENT_ID.equals("1")) {
            lg_TYPE_STOCK = "3";
        }
        String query = " CALL `proc_inentaire`('" + lg_FAMILLE_ID + "','" + lg_EMPLACEMENT_ID + "','" + lg_GROSSISTE_ID
                + "','" + lg_FAMILLEARTICLE_ID + "','" + lg_TYPE_STOCK + "','" + lg_ZONE_GEO_ID + "','"
                + LG_INVENTAIRE_ID + "'," + bool_INVENTAIRE + ")";

        if (!"".equals(str_BEGIN)) {
            switch (str_TYPE) {
            case "Famille":

                query = "CALL `proc_inentaire_famille_twocriteria` ('" + str_BEGIN + "','" + str_END + "','"
                        + lg_EMPLACEMENT_ID + "','" + lg_TYPE_STOCK + "','" + LG_INVENTAIRE_ID + "')";

                break;
            case "Emplacement":

                query = "CALL `proc_inentaire_zone_twocriteria` ('" + str_BEGIN + "','" + str_END + "','"
                        + lg_EMPLACEMENT_ID + "','" + lg_TYPE_STOCK + "','" + LG_INVENTAIRE_ID + "')";

                break;
            case "Grossiste":

                query = "CALL `proc_inentaire_grossiste_twocriteria` ('" + str_BEGIN + "','" + str_END + "','"
                        + lg_EMPLACEMENT_ID + "','" + lg_TYPE_STOCK + "','" + LG_INVENTAIRE_ID + "')";

                break;

            }

        }
        // System.out.println("queryquery "+query);
        try {
            Object result = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();
            count = Long.valueOf(result + "");

        } catch (Exception e) {
            count = 0;
            e.printStackTrace();
        }

        return count;
    }

    public boolean updateInventaireUnitaireFamille(String lg_INVENTAIRE_ID, String lg_FAMILLE_ID,
            boolean bool_INVENTAIRE) {
        boolean result = false;
        TInventaireFamille OInventaireFamille = null;
        try {
            OInventaireFamille = this.getOdataManager().getEm().find(TInventaireFamille.class,
                    Long.valueOf(lg_FAMILLE_ID));
            if (OInventaireFamille == null) {
                this.buildErrorTraceMessage("Echec de l'opération");
                return result;
            }
            OInventaireFamille.setBoolINVENTAIRE(bool_INVENTAIRE);
            if (this.persiste(OInventaireFamille)) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de l'opération");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    public long clotureInventaire(String LG_INVENTAIRE_ID) {
        long count = 0;
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String lg_TYPE_STOCK = "1";
        if (!lg_EMPLACEMENT_ID.equals("1")) {
            lg_TYPE_STOCK = "3";
        }
        String query = " CALL `proc_clotureinentaire`('" + lg_TYPE_STOCK + "','" + this.getOTUser().getLgUSERID()
                + "','" + LG_INVENTAIRE_ID + "','" + lg_EMPLACEMENT_ID + "')";

        try {
            Object result = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();
            count = Long.valueOf(result + "");

        } catch (Exception e) {
            count = 0;
            e.printStackTrace();
        }

        return count;
    }

    public List<TInventaireFamille> listTFamilleByInventaire(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, boolean boolINVENTAIRE,
            int start, int limit, String lg_USER_ID) {
        System.err.println(
                "(******************************************************************************************)");
        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = null;
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 ORDER BY t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE ASC, t.lgFAMILLEID.strDESCRIPTION")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6  OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ASC, t.lgFAMILLEID.strNAME ASC ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS).getResultList();

                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgGROSSISTEID.strCODE ASC, t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS).getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT DISTINCT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE , t.lgFAMILLEID.strDESCRIPTION")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).setFirstResult(start).setMaxResults(limit)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS).getResultList();

                }
            } else {

                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TInventaireFamille t, TFamille g WHERE t.lgINVENTAIREID.lgINVENTAIREID =?1  AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?3 AND g.lgZONEGEOID.lgZONEGEOID  LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strLIBELLE LIKE ?5  OR g.intEAN13 LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE 5 ) AND t.boolINVENTAIRE = ?6  AND t.strUPDATEDID LIKE ?9 ORDER BY g.strNAME ASC ")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(6, search_value + "%")
                        .setParameter(8, boolINVENTAIRE).setParameter(9, lg_USER_ID)
                        .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS).getResultList();

            }
            // new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaireFamille;
    }

    public List<TInventaireFamille> listTFamilleByInventaire(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, boolean boolINVENTAIRE,
            String lg_USER_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
        TInventaire OInventaire = null;
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 ORDER BY t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE ASC, t.lgFAMILLEID.strDESCRIPTION")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6  OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ASC, t.lgFAMILLEID.strNAME ASC ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).getResultList();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgGROSSISTEID.strCODE ASC, t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).getResultList();
                } else {
                    lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE , t.lgFAMILLEID.strDESCRIPTION")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID).getResultList();

                }
            } else {
                /*
                 * lstTInventaireFamille = this.getOdataManager().getEm().
                 * createQuery("SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.strDESCRIPTION LIKE ?5 OR t.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6) AND t.boolINVENTAIRE = ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC"
                 * ) .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID).setParameter(3,
                 * lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID).setParameter(5, search_value +
                 * "%").setParameter(6, search_value + "%").setParameter(8, boolINVENTAIRE).getResultList();
                 */
                lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TInventaireFamille t, TFamille g WHERE t.lgINVENTAIREID.lgINVENTAIREID =?1  AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?3 AND g.lgZONEGEOID.lgZONEGEOID  LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strLIBELLE LIKE ?5  OR g.intEAN13 LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE 5 ) AND t.boolINVENTAIRE = ?6  AND t.strUPDATEDID LIKE ?9 ORDER BY g.strNAME ASC ")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(6, search_value + "%")
                        .setParameter(8, boolINVENTAIRE).setParameter(9, lg_USER_ID).getResultList();

            }
            // new logger().OCategory.info("Taille liste " + lstTInventaireFamille.size());

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTInventaireFamille;
    }

    public long getCountByInventaire(String search_value, String lg_INVENTAIRE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, boolean boolINVENTAIRE, String lg_USER_ID) {
        long count = 0l;
        TInventaire OInventaire = null;
        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }
            Object object = 0;
            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {

                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(DISTINCT t) FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS)
                            .getSingleResult();

                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(DISTINCT t) FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6  OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS)
                            .getSingleResult();

                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(DISTINCT t) FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS)
                            .getSingleResult();

                } else {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(DISTINCT t) FROM TInventaireFamille t, TFamilleGrossiste g WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6 OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6 OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(6, "%" + search_value + "%").setParameter(8, boolINVENTAIRE)
                            .setParameter(9, lg_USER_ID)
                            .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS)
                            .getSingleResult();

                }
            } else {

                object = this.getOdataManager().getEm().createQuery(
                        "SELECT COUNT(DISTINCT t)  FROM TInventaireFamille t, TFamille g WHERE t.lgINVENTAIREID.lgINVENTAIREID =?1  AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?3 AND g.lgZONEGEOID.lgZONEGEOID  LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strLIBELLE LIKE ?5  OR g.intEAN13 LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE 5 ) AND t.boolINVENTAIRE = ?6  AND t.strUPDATEDID LIKE ?9 ")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(6, search_value + "%")
                        .setParameter(8, boolINVENTAIRE).setParameter(9, lg_USER_ID)
                        .setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS).getSingleResult();

            }
            System.out.println("*****************  object " + object);
            count = Long.valueOf(object + "");

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return count;
    }

    public long getInventaireManquantCount(String search_value, String lg_INVENTAIRE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String lg_USER_ID) {
        Object object = 0;
        long count = 0l;
        TInventaire OInventaire = null;
        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille f WHERE f.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND f.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND f.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND f.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (f.strDESCRIPTION LIKE ?5 OR f.intCIP LIKE ?5 OR f.lgGROSSISTEID.strCODE LIKE ?5 OR f.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).getSingleResult();
                } else {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                            .setParameter(9, lg_USER_ID).getSingleResult();
                }
            } else {
                object = this.getOdataManager().getEm().createQuery(
                        "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER - t.intNUMBERINIT < ?7) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID ?9")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(7, 0).setParameter(8, true)
                        .setParameter(9, lg_USER_ID).getSingleResult();
            }
            count = Long.valueOf(object + "");
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return count;

    }

    public long getCountInventaireSurplus(String search_value, String lg_INVENTAIRE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String lg_USER_ID) {
        Object object = 0;
        long count = 0l;
        TInventaire OInventaire = null;
        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9 ")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g    WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                } else {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                }
            } else {
                object = this.getOdataManager().getEm().createQuery(
                        "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?6 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER != t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                        .getSingleResult();
            }
            count = Long.valueOf(object + "");

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return count;
    }

    public long getCountEcartInventaireSurplus(String search_value, String lg_INVENTAIRE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String lg_USER_ID) {
        Object object = 0;
        long count = 0l;
        TInventaire OInventaire;

        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!lg_INVENTAIRE_ID.equalsIgnoreCase("%%")) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g    WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                } else {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                            .getSingleResult();
                }
            } else {
                object = this.getOdataManager().getEm().createQuery(
                        "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?6 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER <> t.intNUMBERINIT) AND t.boolINVENTAIRE = ?8  AND t.strUPDATEDID LIKE ?9")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(8, true).setParameter(9, lg_USER_ID)
                        .getSingleResult();
            }
            count = Long.valueOf(object + "");
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return count;

    }

    public long getCountAlertInventaire(String search_value, String lg_INVENTAIRE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, int int_ALERTE) {
        Object object = 0;
        long count = 0l;
        TInventaire OInventaire = null;

        try {

            if ("".equals(search_value)) {
                search_value = "%%";
            }
            if (!"%%".equals(lg_INVENTAIRE_ID)) {
                OInventaire = this.getOdataManager().getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
                if (OInventaire.getStrTYPE().equalsIgnoreCase("famille")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("emplacement")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .getSingleResult();
                } else if (OInventaire.getStrTYPE().equalsIgnoreCase("grossiste")) {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .getSingleResult();
                } else {
                    object = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?5 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8")
                            .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                            .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                            .setParameter(5, search_value + "%").setParameter(7, int_ALERTE).setParameter(8, true)
                            .getSingleResult();
                }
            } else {
                object = this.getOdataManager().getEm().createQuery(
                        "SELECT COUNT(t) FROM TInventaireFamille t, TFamille g WHERE g.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1 AND g.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND g.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND g.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND (g.strDESCRIPTION LIKE ?5 OR g.intCIP LIKE ?5 OR g.lgGROSSISTEID.strCODE LIKE ?6 OR g.intEAN13 LIKE ?5) AND (t.intNUMBER > ?7) AND t.boolINVENTAIRE = ?8")
                        .setParameter(1, lg_INVENTAIRE_ID).setParameter(2, lg_GROSSISTE_ID)
                        .setParameter(3, lg_ZONE_GEO_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, search_value + "%").setParameter(6, search_value + "%")
                        .setParameter(7, int_ALERTE).setParameter(8, true).getSingleResult();
            }
            count = Long.valueOf(object + "");
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return count;

    }

    // recuperation du dernier inventaire
    public TInventaire getLastInventaire(String str_STATUT) {
        TInventaire OTInventaire = null;
        try {
            OTInventaire = (TInventaire) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TInventaire t WHERE t.strSTATUT = ?1 ORDER BY t.dtUPDATED DESC")
                    .setParameter(1, str_STATUT).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTInventaire;
    }
    // fin recuperation du dernier inventaire

    public boolean updateInventairedetail(String lstInventairedetail, String lg_USER_ID) {
        boolean result = false;
        int totalUpdate = 0;
        TInventaireFamille OTInventaireFamille = null;
        JSONObject jsonObject = null;
        try {
            JSONArray jsonArray = new JSONArray(lstInventairedetail);
            new logger().OCategory.info("taille de la liste:" + jsonArray.length());
            for (int i = 0; i < jsonArray.length(); i++) {
                jsonObject = jsonArray.getJSONObject(i);
                new logger().OCategory.info("element " + i + ":" + jsonObject.getString("lg_INVENTAIREDETAIL_ID"));
                OTInventaireFamille = this.getOdataManager().getEm().find(TInventaireFamille.class,
                        Long.parseLong(jsonObject.getString("lg_INVENTAIREDETAIL_ID")));
                if (this.updateInventairedetail(OTInventaireFamille, jsonObject.getInt("int_QUANTITY"), lg_USER_ID)) {
                    totalUpdate++;
                }
            }
            if (totalUpdate == jsonArray.length()) {
                this.buildSuccesTraceMessage("Mise a jour effectuee avec succes");
                result = true;
            } else {
                this.buildErrorTraceMessage(totalUpdate + "/" + jsonArray.length() + " produit(s) mise à jour");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la ligne d'inventaire");
        }
        return result;
    }

    public boolean updateInventairedetail(TInventaireFamille OTInventaireFamille, int int_QUANTITY, String lg_USER_ID) {
        boolean result = false;

        try {
            if (OTInventaireFamille == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Ligne de produit inexistant");
                return result;
            }
            OTInventaireFamille.setIntNUMBER(int_QUANTITY);
            OTInventaireFamille.setDtUPDATED(new Date());
            OTInventaireFamille.setStrUPDATEDID(lg_USER_ID);
            if (this.persiste(OTInventaireFamille)) {
                this.buildSuccesTraceMessage("Ligne d'inventaire mise à jour avec succès");
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de la ligne d'inventaire");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la ligne d'inventaire");
        }
        return result;
    }
}
