/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.commandeManagement;

import bll.bllBase;
import bll.configManagement.familleManagement;
import bll.interfacemanager.Bonlivraisonmanagerinterface;
import bll.teller.SnapshotManager;
import bll.teller.tellerManagement;
import bll.warehouse.WarehouseManager;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TFamille;
import dal.TGrossiste;
import dal.TRetourFournisseur;
import java.util.*;
import dal.TFamilleStock;
import dal.TMotifRetour;
import dal.TOrder;
import dal.TOrderDetail;
import dal.TRetourFournisseurDetail;
import dal.TRetourdepotdetail;
import dal.TRuptureHistory;
import dal.TUser;
import dal.TWarehouse;
import dal.dataManager;
import java.util.Date;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class retourFournisseurManagement extends bllBase implements Bonlivraisonmanagerinterface {

    public retourFournisseurManagement(dataManager OdataManager) {
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    public retourFournisseurManagement(dataManager OdataManager, TUser OTUser) {
        super.setOTUser(OTUser);
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    SnapshotManager OSnapshotManager = new SnapshotManager(getOdataManager(), getOTUser());

    public List<TRetourFournisseur> getAllTRetourFournisseur(String lg_RETOUR_FRS_ID) {

        List<TRetourFournisseur> lstTRetourFournisseur = null;

        try {

            lstTRetourFournisseur = this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TRetourFournisseur t WHERE t.strSTATUT LIKE ?1 AND t.lgRETOURFRSID LIKE ?2 ")
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, lg_RETOUR_FRS_ID).getResultList();

            new logger().OCategory.info(" lstTRetourFournisseur " + lstTRetourFournisseur.size());

            return lstTRetourFournisseur;

        } catch (Exception E) {

            return lstTRetourFournisseur;

        }

    }

    public List<TRetourFournisseur> getAllTRetourFournisseur(String search_value, String lg_RETOUR_FRS_ID, Date dtDEBUT,
            Date dtFIN, String lg_GROSSISTE_ID) {

        List<TRetourFournisseur> lstTRetourFournisseur = new ArrayList<>();
        String query = "SELECT t FROM TRetourFournisseur t WHERE t.strSTATUT = ?1  AND t.lgRETOURFRSID LIKE ?2  AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?5 AND (t.dtUPDATED >= ?6 AND t.dtUPDATED <= ?7) AND t.lgRETOURFRSID IN ( SELECT o.lgRETOURFRSID.lgRETOURFRSID  FROM TRetourFournisseurDetail o WHERE  o.lgFAMILLEID.strNAME LIKE ?3 OR o.lgFAMILLEID.intCIP LIKE ?3   )";
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            } else {

                if (findGrossisteByName(search_value) > 0) {

                    query = "SELECT t FROM TRetourFournisseur t WHERE t.strSTATUT = ?1 AND t.lgGROSSISTEID.strLIBELLE LIKE ?3  AND t.lgRETOURFRSID LIKE ?2  AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?5 AND (t.dtUPDATED >= ?6 AND t.dtUPDATED <= ?7) ";
                } else if (findREFBL(search_value) != null) {
                    query = "SELECT t FROM TRetourFournisseur t WHERE t.strSTATUT = ?1 AND t.lgBONLIVRAISONID.strREFLIVRAISON LIKE ?3  AND t.lgRETOURFRSID LIKE ?2  AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?5 AND (t.dtUPDATED >= ?6 AND t.dtUPDATED <= ?7) ";
                }
            }
            System.out.println("query " + query);

            // AND t.lgGROSSISTEID.strLIBELLE LIKE ?3 AND t.lgBONLIVRAISONID.strREFLIVRAISON LIKE ?3
            lstTRetourFournisseur = this.getOdataManager().getEm().createQuery(query)
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, lg_RETOUR_FRS_ID)
                    .setParameter(3, search_value + "%").
                    /*
                     * setParameter(8, search_value + "%"). setParameter(9, search_value + "%").
                     */
                    setParameter(5, lg_GROSSISTE_ID).setParameter(6, dtDEBUT).setParameter(7, dtFIN).getResultList();
            this.getOdataManager().getEm().refresh(lstTRetourFournisseur);
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTRetourFournisseur taille " + lstTRetourFournisseur.size());
        return lstTRetourFournisseur;

    }

    public Date FindDatePeremption(String RefBL, String lg_FAMILLE_ID) {

        Date ODate = null;
        TWarehouse OTWarehouse = null;

        try {
            OTWarehouse = (dal.TWarehouse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.strREFLIVRAISON LIKE ?2 ")
                    .setParameter("1", RefBL).setParameter("2", lg_FAMILLE_ID).getSingleResult();

            ODate = OTWarehouse.getDtPEREMPTION();
            new logger().OCategory.info("ODate    " + ODate);
        } catch (Exception E) {
            new logger().OCategory.info(E.toString());
        }

        return ODate;
    }

    public TRetourFournisseurDetail AddToTRetourFournisseurDetail(String lg_BON_LIVRAISON_ID, String str_REPONSE_FRS,
            String str_COMMENTAIRE, String lg_MOTIF_RETOUR, TFamille OTFamille, TRetourFournisseur OTRetourFournisseur,
            int int_NUMBER_RETURN) {

        TRetourFournisseurDetail oTRetourFournisseurDetail = null;

        try {

            if (OTRetourFournisseur == null) {

                OTRetourFournisseur = this.createTRetourFournisseur(lg_BON_LIVRAISON_ID, str_REPONSE_FRS,
                        str_COMMENTAIRE);
            }

            oTRetourFournisseurDetail = new TRetourFournisseurDetail();
            oTRetourFournisseurDetail.setLgRETOURFRSDETAIL(this.getKey().getComplexId());
            oTRetourFournisseurDetail.setLgRETOURFRSID(OTRetourFournisseur);
            oTRetourFournisseurDetail.setIntNUMBERRETURN(int_NUMBER_RETURN);

            if (OTFamille != null) {
                oTRetourFournisseurDetail.setLgFAMILLEID(OTFamille);
                TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getTProductItemStock(OTFamille.getLgFAMILLEID());
                oTRetourFournisseurDetail.setIntSTOCK(OTFamilleStock.getIntNUMBERAVAILABLE());
            }
            TMotifRetour OTMotifRetour = (TMotifRetour) this.find(lg_MOTIF_RETOUR, new TMotifRetour());
            if (OTMotifRetour != null) {
                oTRetourFournisseurDetail.setLgMOTIFRETOUR(OTMotifRetour);
            }

            oTRetourFournisseurDetail.setStrSTATUT(commonparameter.statut_enable);
            oTRetourFournisseurDetail.setDtCREATED(new Date());

            this.persiste(oTRetourFournisseurDetail);
            new logger().OCategory
                    .info("Mise a jour de OTRetourFournisseurDetail " + oTRetourFournisseurDetail.getIntNUMBERRETURN());

        } catch (Exception e) {

            new logger().OCategory.info("ECHEC OTRetourFournisseurDetail " + e);

        }

        return oTRetourFournisseurDetail;
    }

    public boolean DeleteTRetourFournisseurDetail(String lg_RETOUR_FRS_DETAIL) {

        boolean result = false;

        try {
            TRetourFournisseurDetail OTRetourFournisseurDetail = this
                    .FindTRetourFournisseurDetail(lg_RETOUR_FRS_DETAIL);

            OTRetourFournisseurDetail.setStrSTATUT(commonparameter.statut_delete);
            this.delete(OTRetourFournisseurDetail);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec de succes de l'article dans le retour fournisseur");
        }
        return result;
    }

    public boolean DeleteTRetourFournisseurDetail(TRetourFournisseurDetail OTRetourFournisseurDetail) {

        boolean result = false;

        try {
            OTRetourFournisseurDetail.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTRetourFournisseurDetail);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec de succes de l'article dans le retour fournisseur");
        }
        return result;
    }

    public boolean DeleteTRetourFournisseur(String lg_RETOUR_FRS_ID) {
        boolean result = false;
        int i = 0;
        try {
            TRetourFournisseur OTRetourFournisseur = this.FindTRetourFournisseur(lg_RETOUR_FRS_ID);
            List<TRetourFournisseurDetail> lstT = this.getTRetourFournisseurDetail(lg_RETOUR_FRS_ID);
            for (TRetourFournisseurDetail OTRetourFournisseurDetail : lstT) {
                if (this.DeleteTRetourFournisseurDetail(OTRetourFournisseurDetail)) {
                    i++;
                }
            }
            new logger().OCategory.info("Valeur de i " + i + " taille de la liste " + lstT.size());
            if (i == lstT.size()) {
                OTRetourFournisseur.setStrSTATUT(commonparameter.statut_delete);
                this.persiste(OTRetourFournisseur);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de suppression du retour fournisseur");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du retour fournisseur");
        }

        return result;
    }

    public TRetourFournisseurDetail FindTRetourFournisseurDetail(String lg_RETOUR_FRS_DETAIL) {
        new logger().OCategory.info("recherche de TRetourFournisseurDetail");
        TRetourFournisseurDetail OTRetourFournisseurDetail = null;
        try {
            OTRetourFournisseurDetail = (TRetourFournisseurDetail) this.find(lg_RETOUR_FRS_DETAIL,
                    new TRetourFournisseurDetail());
        } catch (Exception e) {
            new logger().OCategory.info(e.toString());
        }
        return OTRetourFournisseurDetail;
    }

    public TRetourFournisseur createTRetourFournisseur(String lg_BON_LIVRAISON_ID, String str_REPONSE_FRS,
            String str_COMMENTAIRE) {

        TRetourFournisseur OTRetourFournisseur = null;

        try {

            OTRetourFournisseur = new TRetourFournisseur();
            OTRetourFournisseur.setLgRETOURFRSID(this.getKey().getComplexId());
            OTRetourFournisseur.setStrREFRETOURFRS(this.getKey().getShortId(8));
            OTRetourFournisseur.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTRetourFournisseur.setStrREPONSEFRS(str_REPONSE_FRS);
            OTRetourFournisseur.setLgUSERID(this.getOTUser());
            // lg_BON_LIVRAISON_ID
            try {
                TBonLivraison OTBonLivraison = this.getBonLivraison(lg_BON_LIVRAISON_ID);
                if (OTBonLivraison != null) {
                    OTRetourFournisseur.setLgBONLIVRAISONID(OTBonLivraison);
                    OTRetourFournisseur.setLgGROSSISTEID(OTBonLivraison.getLgORDERID().getLgGROSSISTEID());
                    // OTRetourFournisseur.setDtDATE(OTBonLivraison.getDtDATELIVRAISON());
                    OTRetourFournisseur.setDtDATE(new Date());

                }
            } catch (Exception e) {
            }

            OTRetourFournisseur.setStrSTATUT(commonparameter.statut_is_Process);
            OTRetourFournisseur.setDtCREATED(new Date());
            OTRetourFournisseur.setDtUPDATED(new Date());
            this.persiste(OTRetourFournisseur);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec d'enregistrement du retour fournisseur");
        }
        return OTRetourFournisseur;
    }

    public TRetourFournisseurDetail createTRetourFournisseurDetail(String lg_RETOUR_FRS_ID, String lg_FAMILLE_ID,
            String lg_MOTIF_RETOUR, int int_NUMBER_RETURN, String str_RPSE_FRS, String lg_BON_LIVRAISON_ID,
            String str_REPONSE_FRS, String str_COMMENTAIRE) {
        TBonLivraisonDetail OTBonLivraisonDetail;
        TRetourFournisseurDetail oTRetourFournisseurDetail = null;

        try {

            oTRetourFournisseurDetail = this.findFamilleInTRetourFournisseurDetail(lg_RETOUR_FRS_ID, lg_FAMILLE_ID);
            if (oTRetourFournisseurDetail != null) {
                oTRetourFournisseurDetail
                        .setIntNUMBERRETURN(oTRetourFournisseurDetail.getIntNUMBERRETURN() + int_NUMBER_RETURN);
            } else {
                OTBonLivraisonDetail = this.getTBonLivraisonDetailLast(lg_BON_LIVRAISON_ID, lg_FAMILLE_ID);
                oTRetourFournisseurDetail = new TRetourFournisseurDetail();
                oTRetourFournisseurDetail.setLgRETOURFRSDETAIL(this.getKey().getComplexId());
                oTRetourFournisseurDetail.setIntNUMBERRETURN(int_NUMBER_RETURN);
                oTRetourFournisseurDetail.setIntNUMBERANSWER(0);
                oTRetourFournisseurDetail.setIntPAF(OTBonLivraisonDetail.getIntPAF());
            }

            oTRetourFournisseurDetail.setLgRETOURFRSID(this.FindTRetourFournisseur(lg_RETOUR_FRS_ID));
            oTRetourFournisseurDetail.setDtCREATED(new Date());

            TFamille OTFamille = new familleManagement(this.getOdataManager()).getTFamille(lg_FAMILLE_ID);
            oTRetourFournisseurDetail.setLgFAMILLEID(OTFamille);

            TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTFamille);
            oTRetourFournisseurDetail.setIntSTOCK(OTFamilleStock.getIntNUMBERAVAILABLE());

            TMotifRetour OTMotifRetour = this.getOdataManager().getEm().find(TMotifRetour.class, lg_MOTIF_RETOUR);
            oTRetourFournisseurDetail.setLgMOTIFRETOUR(OTMotifRetour);

            oTRetourFournisseurDetail.setStrSTATUT(commonparameter.statut_is_Process);

            if (this.checkQuantityRetourIsAuthorize(oTRetourFournisseurDetail.getLgFAMILLEID().getLgFAMILLEID(),
                    oTRetourFournisseurDetail.getIntNUMBERRETURN(),
                    oTRetourFournisseurDetail.getLgRETOURFRSID().getLgBONLIVRAISONID().getStrREFLIVRAISON())) {
                this.persiste(oTRetourFournisseurDetail);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout de l'article dans le retour fournisseur");
        }
        return oTRetourFournisseurDetail;
    }

    public TRetourFournisseur FindTRetourFournisseur(String lg_RETOUR_FRS_ID) {

        TRetourFournisseur OTRetourFournisseur = null;

        try {

            OTRetourFournisseur = (TRetourFournisseur) this.find(lg_RETOUR_FRS_ID, new TRetourFournisseur());
            new logger().OCategory.info(" FindTRetourFournisseur Create " + OTRetourFournisseur.getLgRETOURFRSID());
            return OTRetourFournisseur;

        } catch (Exception e) {

            new logger().OCategory.info(" FindTRetourFournisseur Error  " + e.toString());

        }

        return OTRetourFournisseur;

    }

    public TRetourFournisseurDetail findFamilleInTRetourFournisseurDetail(String lg_RETOUR_FRS_ID,
            String lg_FAMILLE_ID) {
        TRetourFournisseurDetail OTRetourFournisseurDetail = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourFournisseurDetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgRETOURFRSID.lgRETOURFRSID = ?2 AND t.strSTATUT <> ?3  ")
                    .setParameter(2, lg_RETOUR_FRS_ID).setParameter(1, lg_FAMILLE_ID)
                    .setParameter(3, commonparameter.statut_delete);
            if (qry.getResultList().size() > 0) {
                OTRetourFournisseurDetail = (TRetourFournisseurDetail) qry.getSingleResult();
            }

            // new logger().OCategory.info("Famille " + OTRetourFournisseurDetail.getLgFAMILLEID().getStrNAME());
        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTRetourFournisseurDetail;
    }

    public List<TRetourFournisseurDetail> getTRetourFournisseurDetail(String lg_RETOUR_FRS_ID) {

        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail = new ArrayList<>();

        try {

            lstTRetourFournisseurDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourFournisseurDetail t WHERE t.strSTATUT NOT LIKE ?1 AND t.lgRETOURFRSID.lgRETOURFRSID LIKE ?2 ")
                    .setParameter(1, commonparameter.statut_delete).setParameter(2, lg_RETOUR_FRS_ID).getResultList();

        } catch (Exception E) {
            E.printStackTrace();
        }

        return lstTRetourFournisseurDetail;

    }

    public List<TRetourFournisseurDetail> getTRetourFournisseurDetail(String lg_RETOUR_FRS_ID, int start, int limit) {

        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail = new ArrayList<>();

        try {

            lstTRetourFournisseurDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourFournisseurDetail t WHERE t.strSTATUT NOT LIKE ?1 AND t.lgRETOURFRSID.lgRETOURFRSID LIKE ?2 ")
                    .setParameter(1, commonparameter.statut_delete).setParameter(2, lg_RETOUR_FRS_ID)
                    .setFirstResult(start).setMaxResults(limit).getResultList();

        } catch (Exception E) {
            E.printStackTrace();
        }
        new logger().OCategory.info(" lstTRetourFournisseurDetail  " + lstTRetourFournisseurDetail.size());
        return lstTRetourFournisseurDetail;

    }

    public TRetourFournisseurDetail UpdateTRetourFournisseurDetail(String lg_RETOUR_FRS_DETAIL, String lg_RETOUR_FRS_ID,
            String lg_FAMILLE_ID, String lg_MOTIF_RETOUR, int int_NUMBER_RETURN, String str_RPSE_FRS,
            String lg_BON_LIVRAISON_ID, String str_REPONSE_FRS, String str_COMMENTAIRE) {

        TRetourFournisseurDetail OTRetourFournisseurDetail = null;
        TGrossiste OTGrossiste = null;
        TFamille OTFamille = null;

        try {

            OTRetourFournisseurDetail = this.getOdataManager().getEm().find(TRetourFournisseurDetail.class,
                    lg_RETOUR_FRS_DETAIL);
            OTFamille = new familleManagement(this.getOdataManager()).getTFamille(lg_FAMILLE_ID);
            OTRetourFournisseurDetail.setLgRETOURFRSID(this.FindTRetourFournisseur(lg_RETOUR_FRS_ID));
            OTRetourFournisseurDetail.setLgFAMILLEID(OTFamille);
            OTRetourFournisseurDetail.setIntNUMBERRETURN(int_NUMBER_RETURN);

            TMotifRetour OTMotifRetour = (TMotifRetour) this.find(lg_MOTIF_RETOUR, new TMotifRetour());
            if (OTMotifRetour != null) {
                OTRetourFournisseurDetail.setLgMOTIFRETOUR(OTMotifRetour);
            }

            OTRetourFournisseurDetail.setStrSTATUT(commonparameter.statut_enable);
            OTRetourFournisseurDetail.setDtUPDATED(new Date());
            this.persiste(OTRetourFournisseurDetail);

            new logger().OCategory
                    .info(" update de OTRetourFournisseurDetail  " + OTRetourFournisseurDetail.getLgRETOURFRSDETAIL());

            return OTRetourFournisseurDetail;
        } catch (Exception e) {
            OTRetourFournisseurDetail = this.createTRetourFournisseurDetail(lg_RETOUR_FRS_ID, lg_FAMILLE_ID,
                    lg_MOTIF_RETOUR, int_NUMBER_RETURN, str_RPSE_FRS, lg_BON_LIVRAISON_ID, str_REPONSE_FRS,
                    str_COMMENTAIRE);
            new logger().OCategory.info(" create de OTPreenregistrementDetail  "
                    + OTRetourFournisseurDetail.getLgRETOURFRSDETAIL() + "    " + e.toString());
            return OTRetourFournisseurDetail;
        }
    }

    public TRetourFournisseur UpdateTRetourFournisseur(String lg_RETOUR_FRS_ID, String lg_BON_LIVRAISON_ID,
            String str_REPONSE_FRS, String str_COMMENTAIRE) {

        TRetourFournisseur OTRetourFournisseur = null;

        try {

            OTRetourFournisseur = this.getOdataManager().getEm().find(TRetourFournisseur.class, lg_RETOUR_FRS_ID);
            try {
                TBonLivraison OTBonLivraison = this.getBonLivraison(lg_BON_LIVRAISON_ID);
                if (OTBonLivraison != null) {
                    OTRetourFournisseur.setLgBONLIVRAISONID(OTBonLivraison);
                    OTRetourFournisseur.setLgGROSSISTEID(OTBonLivraison.getLgORDERID().getLgGROSSISTEID());
                    OTRetourFournisseur.setDtDATE(OTBonLivraison.getDtDATELIVRAISON());
                }
            } catch (Exception e) {
            }

            OTRetourFournisseur.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTRetourFournisseur.setStrREPONSEFRS(str_REPONSE_FRS);
            OTRetourFournisseur.setDtUPDATED(new Date());
            this.persiste(OTRetourFournisseur);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise a jour du retour fournisseur");
        }
        return OTRetourFournisseur;
    }

    // Liste des retours fournisseur d'un article sur une période
    public List<TRetourFournisseurDetail> listTRetourFournisseurDetail(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_RETOUR_FRS_ID, String lg_GROSSISTE_ID) {

        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            // new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
            lstTRetourFournisseurDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourFournisseurDetail t WHERE (t.dtCREATED BETWEEN ?3 AND ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1) AND t.lgRETOURFRSID.lgRETOURFRSID LIKE ?2 AND t.lgRETOURFRSID.strSTATUT LIKE ?7 AND t.lgRETOURFRSID.lgGROSSISTEID.lgGROSSISTEID LIKE ?8 ORDER BY t.lgRETOURFRSID.dtCREATED DESC")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, lg_RETOUR_FRS_ID)
                    .setParameter(8, lg_GROSSISTE_ID).setParameter(3, dtDEBUT).setParameter(4, dtFin)
                    .setParameter(6, lg_FAMILLE_ID).setParameter(7, commonparameter.statut_enable).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTRetourFournisseurDetail taille " + lstTRetourFournisseurDetail.size());
        return lstTRetourFournisseurDetail;
    }

    public List<TRetourFournisseurDetail> listTRetourFournisseurDetail(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_RETOUR_FRS_ID, String lg_GROSSISTE_ID, String lg_FABRIQUANT_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {

        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            // new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
            lstTRetourFournisseurDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourFournisseurDetail t WHERE (t.lgRETOURFRSID.dtCREATED >= ?3 AND t.lgRETOURFRSID.dtCREATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgRETOURFRSID.lgRETOURFRSID LIKE ?2 AND t.lgRETOURFRSID.strSTATUT LIKE ?7 AND t.lgRETOURFRSID.lgGROSSISTEID.lgGROSSISTEID LIKE ?8 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?10 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?11 AND t.lgRETOURFRSID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?12 ORDER BY t.lgRETOURFRSID.dtCREATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_RETOUR_FRS_ID)
                    .setParameter(8, lg_GROSSISTE_ID).setParameter(3, dtDEBUT).setParameter(4, dtFin)
                    .setParameter(6, lg_FAMILLE_ID).setParameter(7, commonparameter.statut_enable)
                    .setParameter(10, lg_FAMILLEARTICLE_ID).setParameter(11, lg_ZONE_GEO_ID)
                    .setParameter(12, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            // this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTRetourFournisseurDetail taille " + lstTRetourFournisseurDetail.size());
        return lstTRetourFournisseurDetail;
    }
    // fin Liste des retours fournisseur d'un article sur une période

    // quantité retournée d'un article
    public int getQauntityRetourByArticle(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_RETOUR_FRS_ID, String lg_GROSSISTE_ID) {

        int result = 0;
        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTRetourFournisseurDetail = this.listTRetourFournisseurDetail(search_value, dtDEBUT, dtFin, lg_FAMILLE_ID,
                    lg_RETOUR_FRS_ID, lg_GROSSISTE_ID);
            for (TRetourFournisseurDetail OTRetourFournisseurDetail : lstTRetourFournisseurDetail) {
                result += OTRetourFournisseurDetail.getIntNUMBERRETURN();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }
    // fin quantité retournée d'un article

    // verification du stock par rapport a la quantié a retourner
    public boolean checkQuantityRetourIsAuthorize(String lg_FAMILLE_ID, int int_QUANTITY, String str_REF_LIVRAISON) {
        boolean result = false;
        int qte = 0;
        // int qteStock = 0;
        // String lg_TYPE_STOCK_ID = "1";
        // TParameters OTParameters = new
        // TparameterManager(this.getOdataManager()).getParameter(Parameter.KEY_ACTIVATE_CONTROLE_RETOUR_AUTO);
        TBonLivraisonDetail OTBonLivraisonDetail;
        try {
            // TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(),
            // this.getOTUser()).getTProductItemStock(lg_FAMILLE_ID);
            OTBonLivraisonDetail = this.getTBonLivraisonDetailLast(str_REF_LIVRAISON, lg_FAMILLE_ID);
            if (OTBonLivraisonDetail != null) {
                qte = OTBonLivraisonDetail.getIntQTERECUE();
            }
            // qte = new WarehouseManager(this.getOdataManager(),
            // this.getOTUser()).getTWarehousedetailRemain(this.getBonLivraison(str_REF_LIVRAISON).getStrREFLIVRAISON(),
            // lg_FAMILLE_ID); //ancien code 06/02/2017
            // qteStock = new StockManager(this.getOdataManager(),
            // this.getOTUser()).getQuantiteStockByFamilleTypeStock(lg_FAMILLE_ID, lg_TYPE_STOCK_ID);
            // if (OTFamilleStock.getIntNUMBERAVAILABLE() >= int_QUANTITY) {
            if (qte >= int_QUANTITY) {
                result = true;
                this.buildSuccesTraceMessage("Stock disponible");
            } else {
                new logger().OCategory.info("qte " + qte + "|int_QUANTITY " + int_QUANTITY);

                this.buildErrorTraceMessage("Impossible d'ajouter cet article. Stock du produit dans le BL "
                        + str_REF_LIVRAISON + " inférieur à la quantité à retourner");
            }
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible d'ajouter cet article. Stock inféreur à la quantité à retourner");
        }
        return result;
    }
    // fin verification du stock par rapport a la quantié a retourner

    // envoyer des articles d un retour fournisseur en commande passé
    public boolean sendRetourFourToCommandePasse(String lg_RETOUR_FRS_ID) {
        boolean result = false;
        int i = 0;
        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail;
        orderManagement OorderManagement = new orderManagement(this.getOdataManager(), this.getOTUser());
        try {
            TRetourFournisseur OTRetourFournisseur = this.getOdataManager().getEm().find(TRetourFournisseur.class,
                    lg_RETOUR_FRS_ID);
            lstTRetourFournisseurDetail = this.getTRetourFournisseurDetail(lg_RETOUR_FRS_ID);
            if (lstTRetourFournisseurDetail.size() > 0) {
                // TGrossiste OTGrossiste = lstTRetourFournisseurDetail.get(0).getLgRETOURFRSID().getLgGROSSISTEID();
                TOrder OTOrder = OorderManagement.createOrder(OTRetourFournisseur.getLgGROSSISTEID().getLgGROSSISTEID(),
                        commonparameter.statut_is_Waiting);
                OTOrder.setStrSTATUT(commonparameter.orderIsPassed);
                this.persiste(OTOrder);
                OTRetourFournisseur.setStrSTATUT(commonparameter.statut_is_Closed);
                for (TRetourFournisseurDetail OTRetourFournisseurDetail : lstTRetourFournisseurDetail) {
                    TOrderDetail OTOrderDetail = OorderManagement.createOrderDetail(OTOrder.getLgORDERID(),
                            OTRetourFournisseurDetail.getLgFAMILLEID().getLgFAMILLEID(),
                            OTRetourFournisseur.getLgGROSSISTEID().getLgGROSSISTEID(),
                            OTRetourFournisseurDetail.getIntNUMBERRETURN(),
                            OTRetourFournisseurDetail.getLgFAMILLEID().getIntPRICE(),
                            OTRetourFournisseurDetail.getLgFAMILLEID().getIntPAF());
                    OTOrderDetail.setStrSTATUT(commonparameter.orderIsPassed);
                    OTRetourFournisseurDetail.setStrSTATUT(commonparameter.statut_is_Closed);
                    if (this.persiste(OTOrderDetail) && this.persiste(OTRetourFournisseurDetail)) {
                        i++;
                    }
                }
                new logger().OCategory.info(
                        "Valeur i " + i + " lstTRetourFournisseurDetail taille " + lstTRetourFournisseurDetail.size());
                if (i == lstTRetourFournisseurDetail.size()) {

                    this.persiste(OTRetourFournisseur);
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                } else {
                    this.buildErrorTraceMessage("Echec de transformation du retour fournisseur en commande");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de transformation du retour fournisseur en commande");
        }
        return result;
    }
    // fin

    public boolean validerRupture(String lg_RETOUR_FRS_ID, String str_COMMENTAIRE, String str_REPONSE_FRS) {
        boolean result = false;
        int i = 0;
        // <editor-fold defaultstate="collapsed" desc="validerRupture - Retirer les quantité du stock">
        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail;
        WarehouseManager OWarehouseManager = new WarehouseManager(getOdataManager(), getOTUser());
        Double dbl_AMOUNT = 0.0;
        try {
            TRetourFournisseur OTRetourFournisseur = this.getOdataManager().getEm().find(TRetourFournisseur.class,
                    lg_RETOUR_FRS_ID);
            lstTRetourFournisseurDetail = this.getTRetourFournisseurDetail(OTRetourFournisseur.getLgRETOURFRSID());
            for (TRetourFournisseurDetail OTRetourFournisseurDetail : lstTRetourFournisseurDetail) {
                OTRetourFournisseurDetail.setStrSTATUT(commonparameter.statut_enable);
                OTRetourFournisseurDetail.setDtUPDATED(new Date());
                // this.persiste(OTRetourFournisseurDetail); //a decommenter en cas de probleme
                this.getOdataManager().getEm().merge(OTRetourFournisseurDetail);
                if (OWarehouseManager.destockRayonByRetourFournisseur(OTRetourFournisseurDetail.getLgFAMILLEID(),
                        OTRetourFournisseurDetail.getLgRETOURFRSID().getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                        OTRetourFournisseurDetail.getIntNUMBERRETURN(),
                        OTRetourFournisseurDetail.getLgRETOURFRSID().getLgGROSSISTEID().getLgGROSSISTEID())) {
                    i++;
                    dbl_AMOUNT += OTRetourFournisseurDetail.getIntNUMBERRETURN()
                            * OTRetourFournisseurDetail.getLgFAMILLEID().getIntPAF();
                }
            }
            new logger().OCategory.info(
                    "Valeur de i " + i + " taille lstTRetourFournisseurDetail " + lstTRetourFournisseurDetail.size());
            if (i == lstTRetourFournisseurDetail.size()) {
                OTRetourFournisseur.setStrSTATUT(commonparameter.statut_enable);
                OTRetourFournisseur.setDtUPDATED(new Date());
                OTRetourFournisseur.setDlAMOUNT(dbl_AMOUNT);
                this.persiste(OTRetourFournisseur);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Pris en compte partiel du retour fournisseur");
            }
            OTRetourFournisseur.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTRetourFournisseur.setLgUSERID(this.getOTUser());
            OTRetourFournisseur.setStrREPONSEFRS(str_REPONSE_FRS);
            this.persiste(OTRetourFournisseur);
            /*
             * OTRetourFournisseur.setStrSTATUT(commonparameter.statut_enable); OTRetourFournisseur.setDtUPDATED(new
             * Date()); this.persiste(OTRetourFournisseur); result = true;
             */
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture du processus de retour fournisseur");
        }
        return result;

    }

    // recuperation bon de livraison
    public TBonLivraison getBonLivraison(String lg_BON_LIVRAISON_ID) {
        TBonLivraison OTBonLivraison = null;
        try {
            OTBonLivraison = (TBonLivraison) this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TBonLivraison t WHERE t.lgBONLIVRAISONID = ?1 OR t.strREFLIVRAISON = ?1")
                    .setParameter(1, lg_BON_LIVRAISON_ID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTBonLivraison;
    }
    // fin recuperation bon de livraison

    // liste des ruptures
    public List<TRuptureHistory> getAllTRuptureHistory(String search_value) {

        List<TRuptureHistory> lstTRuptureHistory = new ArrayList<TRuptureHistory>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTRuptureHistory = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT t FROM TRuptureHistory t, TFamilleGrossiste g WHERE t.lgFAMILLEID.lgFAMILLEID = g.lgFAMILLEID.lgFAMILLEID AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1 AND g.strCODEARTICLE LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, search_value + "%").setParameter(2, commonparameter.statut_enable).getResultList();

        } catch (Exception E) {
            E.printStackTrace();
        }
        new logger().OCategory.info("lstTRuptureHistory taille " + lstTRuptureHistory.size());
        return lstTRuptureHistory;

    }

    // finliste des ruptures
    public boolean retourfournisseurResponse(String lg_RETOURFOURNISSEUR, String comment) {
        TRetourFournisseur OFournisseur;
        List<TRetourFournisseurDetail> lstTRetourFournisseurDetail;
        TBonLivraisonDetail OTBonLivraisonDetail;
        double dbl_AMOUNT = 0;
        boolean isUpdate = false;
        try {
            OFournisseur = this.getOdataManager().getEm().find(TRetourFournisseur.class, lg_RETOURFOURNISSEUR);
            if (OFournisseur == null) {
                this.buildErrorTraceMessage(
                        "Echec de prise en compte de la réponse du retour fournisseur. Référence inexistante");
                return isUpdate;
            }
            lstTRetourFournisseurDetail = this.getTRetourFournisseurDetail(OFournisseur.getLgRETOURFRSID());
            for (TRetourFournisseurDetail OTRetourFournisseurDetail : lstTRetourFournisseurDetail) {
                OTBonLivraisonDetail = this.getTBonLivraisonDetailLast(
                        OFournisseur.getLgBONLIVRAISONID().getLgBONLIVRAISONID(),
                        OTRetourFournisseurDetail.getLgFAMILLEID().getLgFAMILLEID());
                if (OTBonLivraisonDetail != null) {
                    OTBonLivraisonDetail.setIntQTERETURN(
                            (OTBonLivraisonDetail.getIntQTERETURN() != null ? OTBonLivraisonDetail.getIntQTERETURN()
                                    : 0) + OTRetourFournisseurDetail.getIntNUMBERANSWER());
                    this.getOdataManager().getEm().merge(OTBonLivraisonDetail);
                    dbl_AMOUNT += OTRetourFournisseurDetail.getIntNUMBERANSWER()
                            * OTRetourFournisseurDetail.getIntPAF();

                }
            }
            OFournisseur.setStrREPONSEFRS(comment);
            OFournisseur.setDtUPDATED(new Date());
            OFournisseur.setDlAMOUNT(dbl_AMOUNT);
            if (this.persiste(OFournisseur)) {
                isUpdate = true;
                this.buildSuccesTraceMessage("Réponse du retour fournisseur " + OFournisseur.getStrREFRETOURFRS()
                        + " prise en compte avec succès");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la réponse du retour fournisseur.");
        }
        return isUpdate;
    }

    /* fonction pour avoir le detail des retours depots 26/01/2016 begin */
    public List<TRetourdepotdetail> listTRetourDepotDetail(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_RETOUR_FRS_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {

        List<TRetourdepotdetail> lstTRetourFournisseurDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTRetourFournisseurDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourdepotdetail t WHERE (t.lgRETOURDEPOTID.dtCREATED   >= ?3 AND t.lgRETOURDEPOTID.dtCREATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgRETOURDEPOTID.lgRETOURDEPOTID LIKE ?2 AND t.lgRETOURDEPOTID.strSTATUT LIKE ?7 AND t.lgRETOURDEPOTID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?10 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?11  AND t.lgRETOURDEPOTID.boolFLAG=FALSE ORDER BY t.lgRETOURDEPOTID.dtCREATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_RETOUR_FRS_ID)
                    .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, commonparameter.statut_is_Closed).setParameter(10, lg_FAMILLEARTICLE_ID)
                    .setParameter(11, lg_ZONE_GEO_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();

        }

        return lstTRetourFournisseurDetail;
    }

    /* fonction pour avoir le detail des retours depots 26/01/2016 begin end */
    // gestion de la reponse de retour fournisseur
    public boolean updateQuantiteReponse(String lg_RETOUR_FRS_DETAIL, int int_NUMBER_ANSWER) {
        boolean result = false;
        TRetourFournisseurDetail OTRetourFournisseurDetail = null;
        try {
            OTRetourFournisseurDetail = this.FindTRetourFournisseurDetail(lg_RETOUR_FRS_DETAIL);
            OTRetourFournisseurDetail.setIntNUMBERANSWER(int_NUMBER_ANSWER);
            this.persiste(OTRetourFournisseurDetail);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec de modification de la quantité");
        }
        return result;
    }
    // fin gestion de la reponse de retour fournisseur

    @Override
    public TBonLivraisonDetail getTBonLivraisonDetailLast(String lg_BON_LIVRAISON_ID, String lg_FAMILLE_ID) {
        try {
            TypedQuery<TBonLivraisonDetail> qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraisonDetail t WHERE (t.lgBONLIVRAISONID.lgBONLIVRAISONID = ?1 OR t.lgBONLIVRAISONID.strREFLIVRAISON = ?1) AND t.lgFAMILLEID.lgFAMILLEID = ?2",
                    TBonLivraisonDetail.class).setParameter(1, lg_BON_LIVRAISON_ID).setParameter(2, lg_FAMILLE_ID);
            qry.setMaxResults(1);
            TBonLivraisonDetail bonLivraisonDetail = qry.getSingleResult();
            this.getOdataManager().getEm().refresh(bonLivraisonDetail);
            return bonLivraisonDetail;
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return null;
        }

    }

    @Override
    public boolean updateInfoBonlivraison(String lg_ORDER_ID, String str_REF_LIVRAISON, Date dt_DATE_LIVRAISON,
            int int_MHT, int int_TVA) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public TBonLivraison getTBonlivraisonByOrder(String lg_ORDER_ID) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    private TBonLivraison findBL(String name) {
        TBonLivraison bl = null;
        try {
            bl = (TBonLivraison) this.getOdataManager().getEm().createNamedQuery("TBonLivraison.findByStrREFLIVRAISON")
                    .setParameter("strREFLIVRAISON", name).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return bl;
    }

    private TBonLivraison findREFBL(String name) {
        TBonLivraison bl = null;
        try {
            bl = (TBonLivraison) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TBonLivraison o WHERE o.strREFLIVRAISON LIKE ?1 ")
                    .setParameter(1, name + "%").setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return bl;
    }

    public int findGrossisteByName(String name) {
        List<TGrossiste> list = new ArrayList<>();
        int count = 0;

        try {
            list = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TGrossiste o WHERE (o.strLIBELLE LIKE ?1 OR o.strDESCRIPTION LIKE ?1) ")
                    .setParameter(1, name + "%").getResultList();

            count = list.size();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }
}
