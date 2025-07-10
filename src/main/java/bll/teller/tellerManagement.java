/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.teller;

import bll.configManagement.familleManagement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TModeReglement;
import dal.TParameters;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author TBEKOLA
 */
public class tellerManagement extends bll.bllBase {

    public tellerManagement(dataManager odataManager, TUser oTUser) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    public tellerManagement(dataManager odataManager) {
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    public TFamilleStock getTProductItemStock(TFamille OTProductItem) {
        TFamilleStock OTProductItemStock = null;
        try {

            OTProductItemStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT ='enable' ")
                    .setParameter(1, OTProductItem.getLgFAMILLEID())
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();
            new logger().OCategory.info("Stock actuel " + OTProductItemStock.getIntNUMBERAVAILABLE());
        } catch (Exception e) {
            e.printStackTrace();
            /// OTProductItemStock = new familleManagement(this.getOdataManager()).createFamilleStock(OTProductItem, 0,
            /// this.getOTUser().getLgEMPLACEMENTID());
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTProductItemStock;
    }

    public TFamilleStock getTProductItemStock(String lg_FAMILLE_ID) {
        TFamilleStock OTProductItemStock = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE (t.lgFAMILLEID.lgFAMILLEID = ?1 OR t.lgFAMILLEID.intCIP = ?1 OR t.lgFAMILLEID.strNAME = ?1 OR t.lgFAMILLEID.strDESCRIPTION = ?1 OR t.lgFAMILLEID.intEAN13 = ?1) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setParameter(1, lg_FAMILLE_ID)
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (qry.getResultList().size() > 0) {
                OTProductItemStock = (TFamilleStock) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Produit inexistant");
        }
        return OTProductItemStock;
    }

    // recherche de famille stock d'un emplacement
    public TFamilleStock getTProductItemStock(String lg_FAMILLE_ID, String lg_EMPLACEMENT_ID) {
        TFamilleStock OTProductItemStock = null;

        try {
            OTProductItemStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable'")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_EMPLACEMENT_ID).setFirstResult(0)
                    .setMaxResults(1).getSingleResult();
            this.getOdataManager().getEm().refresh(OTProductItemStock);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTProductItemStock;
    }

    // fin recherche de famille stock d'un emplacement
    public boolean isVailableProductInStock(TFamille OTProductItem, int NbItemOfCommande) {

        int valstockdispo;
        boolean result = false;

        TFamilleStock OTProductItemStock = this.getTProductItemStock(OTProductItem);
        if (OTProductItemStock == null) {

            this.buildErrorTraceMessage("Le produit n'est pas stock");
            return false;
        }

        valstockdispo = (OTProductItemStock.getIntNUMBERAVAILABLE() - OTProductItem.getIntSTOCKREAPROVISONEMENT());

        if (valstockdispo <= 0) {
            this.buildErrorTraceMessage("Stock produit limite", "Seuil de securite outrepassé ");
            return false;
        }

        if (valstockdispo >= NbItemOfCommande) {
            return true;
        }

        this.buildErrorTraceMessage("Stock produit limite", " Commander au plus (" + (valstockdispo) + ") Produit(s)");
        return result;
    }

    public Double getInAmountTva(Integer inAmountHT) {
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_TVA_VALUE");
        Double dbTVA = new Double(OTParameters.getStrVALUE());
        return this.getInAmountTva(inAmountHT, dbTVA);
    }

    public Double getInAmountTva(Integer inAmountHT, TParameters OTParameters) {

        if (OTParameters == null) {
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_TVA_VALUE");
        }
        Double dbTVA = new Double(OTParameters.getStrVALUE());
        return this.getInAmountTva(inAmountHT, dbTVA);
    }

    public Double getInAmountTva(Integer inAmountHT, Double dbTVA) {
        Double dbAmountTva = ((inAmountHT * dbTVA) / 100);
        this.buildSuccesTraceMessage("Valeur tva " + dbAmountTva);
        return dbAmountTva;
    }

    public Double getInAmountTTC(Integer inAmountHT) {
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_TVA_VALUE");
        Double dbTVA = new Double(OTParameters.getStrVALUE());
        return this.getInAmountTTC(inAmountHT, dbTVA);
    }

    public Double getInAmountTTC(Integer inAmountHT, TParameters OTParameters) {

        if (OTParameters == null) {
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_TVA_VALUE");
        }
        Double dbTVA = new Double(OTParameters.getStrVALUE());
        return this.getInAmountTTC(inAmountHT, dbTVA);
    }

    public Double getInAmountTTC(Integer inAmountHT, Double dbTVA) {
        Double dbAmountTTC = inAmountHT + ((inAmountHT * dbTVA) / 100);
        this.buildSuccesTraceMessage("Valeur tva " + dbAmountTTC);
        return dbAmountTTC;
    }

    // liste des modes de reglements
    public List<TModeReglement> getListeTModeReglement(String search_value, String lg_MODE_REGLEMENT_ID,
            String lg_TYPE_REGLEMENT_ID) {
        List<TModeReglement> lstTModeReglement = new ArrayList<>();
        try {
            lstTModeReglement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TModeReglement t WHERE t.lgMODEREGLEMENTID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?2) AND t.lgTYPEREGLEMENTID.lgTYPEREGLEMENTID LIKE ?3 AND t.strSTATUT = ?4 ")
                    .setParameter(1, lg_MODE_REGLEMENT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, lg_TYPE_REGLEMENT_ID).setParameter(4, commonparameter.statut_enable)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTModeReglement taille " + lstTModeReglement.size());
        return lstTModeReglement;
    }

    // fin liste des modes de reglements
    public TFamilleStock geProductItemStock(String lg_FAMILLE_ID) {
        TFamilleStock OTProductItemStock = null;
        try {

            TypedQuery<TFamilleStock> qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2",
                    TFamilleStock.class).setParameter(1, lg_FAMILLE_ID)
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            qry.setMaxResults(1);
            OTProductItemStock = qry.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Produit inexistant");
        }
        return OTProductItemStock;
    }

}
