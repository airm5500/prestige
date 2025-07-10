/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.retrocessionManagement;

import bll.bllBase;
import bll.configManagement.familleManagement;
import bll.teller.tellerManagement;
import dal.TClient;
import dal.TEscompteSociete;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TRemise;
import dal.TUser;
import dal.dataManager;
import dal.TRetrocession;
import dal.TRetrocessionDetail;
import dal.TTva;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class RetrocessionDetailManagement extends bllBase {

    TRetrocessionDetail OTRetrocessionDetail = new TRetrocessionDetail();

    public RetrocessionDetailManagement(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public RetrocessionDetailManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    // creation retrocession detail
    public boolean createRetrocessionDetail(int int_Qte_facture, boolean bool_T_F, String lg_FAMILLE_ID,
            TRetrocession OTRetrocession, int int_REMISE) {
        boolean result = false;
        TFamille OTFamille = null;
        int int_PRICE_OLD = 0, int_PRICE_OLD_TTC = 0;
        try {
            if (OTRetrocession == null) {
                this.buildErrorTraceMessage("Echec d'ajout de produit. Retrocession inexistant");
                return result;
            }
            OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            if (OTFamille == null) {
                this.buildErrorTraceMessage("Echec d'ajout de produit. Produit inexistant");
                return result;
            }
            OTRetrocessionDetail = isFamilleExist(OTFamille.getLgFAMILLEID(), OTRetrocession.getLgRETROCESSIONID());
            if (OTRetrocessionDetail == null) {
                OTRetrocessionDetail = this.createRetrocessionDetail(OTFamille, OTRetrocession, bool_T_F);
            }
            int_PRICE_OLD = OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture();
            int_PRICE_OLD_TTC = (OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                    + (((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                            * OTRetrocessionDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100);
            OTRetrocessionDetail.setIntPRICE(bool_T_F ? OTFamille.getIntPAF()
                    : (OTFamille.getIntPAT() - ((int_REMISE * OTFamille.getIntPAT()) / 100)));
            OTRetrocessionDetail.setIntREMISE(int_REMISE);
            OTRetrocessionDetail.setIntQtefacture(OTRetrocessionDetail.getIntQtefacture() + int_Qte_facture);
            this.persiste(OTRetrocessionDetail);

            OTRetrocession.setIntMONTANTHT(OTRetrocession.getIntMONTANTHT()
                    + ((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture()) - int_PRICE_OLD));
            OTRetrocession.setIntMONTANTTTC(OTRetrocession.getIntMONTANTTTC()
                    + ((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                            + (((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                                    * OTRetrocessionDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100))
                    - int_PRICE_OLD_TTC);
            OTRetrocession.setDtUPDATED(new Date());
            result = this.persiste(OTRetrocession);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            if (!result) {
                this.buildErrorTraceMessage("Echec d'ajout du produit sur la retrocession");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout de produit");
        }
        return result;
    }

    public TRetrocessionDetail createRetrocessionDetail(TFamille OTFamille, TRetrocession OTRetrocession,
            boolean bool_T_F) {
        TRetrocessionDetail OTRetrocessionDetail = null;
        try {
            OTRetrocessionDetail = new TRetrocessionDetail();
            OTRetrocessionDetail.setLgRETROCESSIONDETAILID(this.getKey().getComplexId());
            OTRetrocessionDetail.setLgFAMILLEID(OTFamille);
            OTRetrocessionDetail.setLgRETROCESSIONID(OTRetrocession);
            OTRetrocessionDetail.setIntQtefacture(0);
            OTRetrocessionDetail.setIntPRICE(0);
            OTRetrocessionDetail.setBoolTF(bool_T_F);
            OTRetrocessionDetail.setStrSTATUT(commonparameter.statut_enable);
            this.getOdataManager().getEm().persist(OTRetrocessionDetail);
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du produit");
        }
        return OTRetrocessionDetail;
    }
    // fin creation de retrocession detail

    // mise a jour retrocession detail
    public TRetrocessionDetail updateRetrocessionDetail(String lg_RETROCESSIONDETAIL_ID, int int_Qte_facture,
            boolean bool_T_F, int int_PRICE, int int_REMISE) {
        TRetrocession OTRetrocession = null;
        int int_PRICE_OLD = 0, int_PRICE_OLD_TTC = 0;
        try {
            OTRetrocessionDetail = this.getOdataManager().getEm().find(TRetrocessionDetail.class,
                    lg_RETROCESSIONDETAIL_ID);
            if (OTRetrocessionDetail == null) {
                this.buildErrorTraceMessage("Echec de mise à jour du produit sur la retrocession");
                return null;
            }
            OTRetrocession = OTRetrocessionDetail.getLgRETROCESSIONID();
            int_PRICE_OLD = OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture();
            int_PRICE_OLD_TTC = (OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                    + (((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                            * OTRetrocessionDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100);

            OTRetrocessionDetail.setIntPRICE(bool_T_F ? OTRetrocessionDetail.getLgFAMILLEID().getIntPAF()
                    : (OTRetrocessionDetail.getLgFAMILLEID().getIntPAT()
                            - ((int_REMISE * OTRetrocessionDetail.getLgFAMILLEID().getIntPAT()) / 100)));
            OTRetrocessionDetail.setIntREMISE(bool_T_F ? 0 : int_REMISE);
            OTRetrocessionDetail.setIntQtefacture(int_Qte_facture);
            OTRetrocessionDetail.setBoolTF(bool_T_F);
            this.persiste(OTRetrocessionDetail);

            OTRetrocession.setIntMONTANTHT(OTRetrocession.getIntMONTANTHT()
                    + ((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture()) - int_PRICE_OLD));
            OTRetrocession.setIntMONTANTTTC(OTRetrocession.getIntMONTANTTTC()
                    + ((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                            + (((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                                    * OTRetrocessionDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100))
                    - int_PRICE_OLD_TTC);
            OTRetrocession.setDtUPDATED(new Date());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            if (!this.persiste(OTRetrocession)) {
                this.buildErrorTraceMessage("Echec de mise à jour du produit sur la retrocession");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du produit sur la retrocession");
        }
        return OTRetrocessionDetail;
    }
    // fin mise a jour retrocession detail

    // suppression d'une retrocession detail
    public TRetrocession removeRetrocessionDetail(String lg_RETROCESSIONDETAIL_ID) {
        TRetrocession OTRetrocession = null;
        try {
            OTRetrocessionDetail = this.getOdataManager().getEm().find(TRetrocessionDetail.class,
                    lg_RETROCESSIONDETAIL_ID);
            if (OTRetrocessionDetail == null) {
                this.buildErrorTraceMessage(
                        "Impossible de supprimer le produit dans cette retrocession. Produit inexistant");
                return OTRetrocession;
            }
            OTRetrocession = OTRetrocessionDetail.getLgRETROCESSIONID();
            OTRetrocession.setIntMONTANTHT(OTRetrocession.getIntMONTANTHT()
                    - (OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture()));
            OTRetrocession.setIntMONTANTTTC(OTRetrocession.getIntMONTANTTTC()
                    - ((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                            + (((OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture())
                                    * OTRetrocessionDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100)));
            OTRetrocession.setDtUPDATED(new Date());
            this.getOdataManager().BeginTransaction();
            this.getOdataManager().getEm().remove(OTRetrocessionDetail);
            this.getOdataManager().getEm().merge(OTRetrocession);
            this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer le produit dans cette retrocession");
        }
        return OTRetrocession;
    }
    // fin suppression d'une retrocession

    // Liste des retrocessions detail
    public List<TRetrocessionDetail> SearchAllOrOneDetailRetrocession(String lg_RETROCESSIONDETAIL_ID) {
        List<TRetrocessionDetail> lstTRetrocessionDetail = null;
        try {

            new logger().OCategory.info("lg_RETROCESSIONDETAIL_ID ----->   " + lg_RETROCESSIONDETAIL_ID);
            lstTRetrocessionDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetrocessionDetail t WHERE t.lgRETROCESSIONID.lgRETROCESSIONID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_RETROCESSIONDETAIL_ID).setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            for (int i = 0; i < lstTRetrocessionDetail.size(); i++) {
                new logger().OCategory
                        .info("Retrocession: " + lstTRetrocessionDetail.get(i).getLgRETROCESSIONID().getStrREFERENCE());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTRetrocessionDetail;
    }
    // fin Liste des retrocessions detail

    // liste des retrocessions détails par retrocession
    public List<TRetrocessionDetail> showOneOrAllRetrocessionDetailByRetrocession(String lg_RETROCESSION_ID) {
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<TRetrocessionDetail>();
        try {
            lstTRetrocessionDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetrocessionDetail t WHERE t.lgRETROCESSIONID.lgRETROCESSIONID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_RETROCESSION_ID).setParameter(2, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTRetrocessionDetail;
    }

    public List<TRetrocessionDetail> showOneOrAllRetrocessionDetailByRetrocession(String search_value,
            String lg_RETROCESSION_ID, String str_STATUT) {
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<TRetrocessionDetail>();
        try {
            lstTRetrocessionDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetrocessionDetail t WHERE t.lgRETROCESSIONID.lgRETROCESSIONID = ?1 AND t.strSTATUT = ?2 AND (t.lgFAMILLEID.intCIP LIKE ?3 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intEAN13 LIKE ?3)")
                    .setParameter(1, lg_RETROCESSION_ID).setParameter(2, str_STATUT).setParameter(3, search_value + "%")
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTRetrocessionDetail;
    }

    public List<TRetrocessionDetail> showOneOrAllRetrocessionDetailByRetrocession(String search_value,
            String lg_RETROCESSION_ID, String str_STATUT, int start, int limit) {
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<TRetrocessionDetail>();
        try {
            lstTRetrocessionDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetrocessionDetail t WHERE t.lgRETROCESSIONID.lgRETROCESSIONID = ?1 AND t.strSTATUT = ?2 AND (t.lgFAMILLEID.intCIP LIKE ?3 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intEAN13 LIKE ?3)")
                    .setParameter(1, lg_RETROCESSION_ID).setParameter(2, str_STATUT).setParameter(3, search_value + "%")
                    .setFirstResult(start).setMaxResults(limit).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTRetrocessionDetail;
    }
    // fin liste des retrocessions détails par retrocession

    // prix total de vente dans le cas de la retrocession
    public int GetVenteTotal(String lg_RETROCESSION_ID) {
        int Total_vente = 0;
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<TRetrocessionDetail>();
        try {
            lstTRetrocessionDetail = this.showOneOrAllRetrocessionDetailByRetrocession(lg_RETROCESSION_ID);
            for (TRetrocessionDetail OTRetrocessionDetail : lstTRetrocessionDetail) {
                Total_vente += OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return Total_vente;
    }
    // fin prix total de vente dans le cas de la retrocession

    // quantite total de vente dans le cas de la retrocession
    public int GetProductTotal(String lg_RETROCESSION_ID) {
        int Total_vente = 0;
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<TRetrocessionDetail>();
        try {
            lstTRetrocessionDetail = this.showOneOrAllRetrocessionDetailByRetrocession(lg_RETROCESSION_ID);
            for (TRetrocessionDetail OTRetrocessionDetail : lstTRetrocessionDetail) {
                Total_vente += OTRetrocessionDetail.getIntQtefacture();
            }

            new logger().OCategory.info(" ######  La quantite totale de la vente est de  ######   " + Total_vente);
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info("Retrocession inexistante");
        }

        return Total_vente;
    }
    // fin quantite total de vente dans le cas de la retrocession

    // prix total de vente hors taxe dans le cas de la retrocession
    public int GetVenteHT(String lg_RETROCESSION_ID) {
        int Total_vente_ht = 0;
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<TRetrocessionDetail>();
        try {

            lstTRetrocessionDetail = this.showOneOrAllRetrocessionDetailByRetrocession(lg_RETROCESSION_ID);
            for (TRetrocessionDetail OTRetrocessionDetail : lstTRetrocessionDetail) {
                Total_vente_ht += OTRetrocessionDetail.getIntPRICE() * OTRetrocessionDetail.getIntQtefacture();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return Total_vente_ht;
    }
    // fin prix total de vente hors taxe dans le cas de la retrocession

    // prix total de vente toutes taxes comprises dans le cas de la retrocession
    public int GetVenteTTC(String lg_RETROCESSION_ID) {
        int Total_vente_ttc = 0;
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<TRetrocessionDetail>();
        try {

            lstTRetrocessionDetail = this.showOneOrAllRetrocessionDetailByRetrocession(lg_RETROCESSION_ID);
            for (TRetrocessionDetail OTRetrocessionDetail : lstTRetrocessionDetail) {
                Total_vente_ttc += (OTRetrocessionDetail.getIntPRICE() + ((OTRetrocessionDetail.getIntPRICE()
                        * OTRetrocessionDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100))
                        * OTRetrocessionDetail.getIntQtefacture();
            }
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info("Retrocession inexistante");
        }

        return Total_vente_ttc;
    }
    // fin prix total de vente toutes taxes comprises dans le cas de la retrocession

    // verification du stock disponible d'un produit
    public boolean isStockAvailable(String lg_FAMILLE_ID, int int_QUANTITY) {
        boolean result = false;

        try {
            TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(lg_FAMILLE_ID);
            // new logger().OCategory.info("Famille " + OTFamilleStock.getLgFAMILLEID().getStrNAME() + " Stock " +
            // OTFamilleStock.getIntNUMBERAVAILABLE());
            if (OTFamilleStock.getIntNUMBERAVAILABLE() >= int_QUANTITY) {
                result = true;
                new logger().OCategory.info("Stock disponible");
            } else {
                this.buildErrorTraceMessage(
                        "Stock de " + OTFamilleStock.getLgFAMILLEID().getStrNAME() + " insuffisant");
            }
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info("Article inexistant");
        }
        new logger().OCategory.info("Resultat " + result);
        return result;
    }
    // fin verification du stock disponible d'un produit

    // verifie si la famille a ete deja ajouté à la retrocession en cours
    public TRetrocessionDetail isFamilleExist(String lg_FAMILLE_ID, String lg_RETROCESSION_ID) {
        TRetrocessionDetail OTRetrocessionDetail = null;
        try {
            OTRetrocessionDetail = (TRetrocessionDetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetrocessionDetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgRETROCESSIONID.lgRETROCESSIONID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_RETROCESSION_ID)
                    .setParameter(3, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Famille inexistante dans cette retrocession");
        }
        return OTRetrocessionDetail;
    }
    // fin verification du stock disponible d'un produit
}
