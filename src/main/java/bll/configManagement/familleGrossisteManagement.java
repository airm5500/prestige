package bll.configManagement;

import bll.bllBase;
import bll.commandeManagement.orderManagement;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import dal.TOrderDetail;
import dal.TRuptureHistory;
import dal.dataManager;
import java.util.*;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class familleGrossisteManagement extends bllBase {

    Object Otable = TFamilleGrossiste.class;

    orderManagement OorderManagement = new orderManagement(getOdataManager());

    public familleGrossisteManagement(dataManager OdataManager) {

        // <editor-fold defaultstate="collapsed" desc="Constructeur">
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
        // </editor-fold>
    }

    public void create(String lg_GROSSISTE_ID, String lg_FAMILLE_ID, String str_CODE_ARTICLE, int int_PRICE,
            int int_PAF) {
        try {

            if (str_CODE_ARTICLE.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return;
            }
            TGrossiste OTGrossiste = new grossisteManagement(this.getOdataManager()).getGrossiste(lg_GROSSISTE_ID);
            System.out.println("------------------------>>>>  " + lg_GROSSISTE_ID + " ------------  " + OTGrossiste
                    + " str_CODE_ARTICLE " + str_CODE_ARTICLE);

            TFamille OTFamille = getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            System.out.println(
                    "------------------------>>>>  ------------  " + OTFamille + " lg_FAMILLE_ID " + lg_FAMILLE_ID);
            TFamilleGrossiste OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(),
                    OTGrossiste.getLgGROSSISTEID());
            System.out.println("------------------------>>>>OTFamilleGrossiste  ------------  " + OTFamilleGrossiste);
            if (OTFamilleGrossiste != null) {
                this.buildErrorTraceMessage("Le code " + str_CODE_ARTICLE + " est déjà affecté au Produit "
                        + OTFamille.getStrDESCRIPTION() + " chez " + OTGrossiste.getStrDESCRIPTION());
                return;
            }
            OTFamilleGrossiste = new TFamilleGrossiste();
            OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
            OTFamilleGrossiste.setIntPAF(OTFamille.getIntPAF());
            OTFamilleGrossiste.setIntPRICE(OTFamille.getIntPRICE());
            OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
            str_CODE_ARTICLE = new familleManagement(this.getOdataManager()).generateCIP(str_CODE_ARTICLE);
            OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
            this.getOdataManager().getEm().getTransaction().begin();
            this.getOdataManager().getEm().persist(OTFamilleGrossiste);
            this.getOdataManager().getEm().getTransaction().commit();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.getOdataManager().getEm().getTransaction().rollback();
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer un code article ERROR :: " + e.getMessage());
        }
    }

    public boolean create(TGrossiste OTGrossiste, TFamilleGrossiste OTFamilleGrossiste, TFamille OTFamille,
            String str_CODE_ARTICLE, int int_PRICE, int int_PAF) {
        boolean result = false;

        try {
            str_CODE_ARTICLE = new familleManagement(this.getOdataManager()).generateCIP(str_CODE_ARTICLE);
            OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);

            if (this.persiste(OTFamilleGrossiste)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer un code article :: Error! " + e.getMessage());
        }
        return result;
    }

    public boolean create(TGrossiste OTGrossiste, TFamille OTFamille, String str_CODE_ARTICLE, int int_PRICE,
            int int_PAF) {
        boolean result = false;
        TFamilleGrossiste OTFamilleGrossiste;
        this.buildErrorTraceMessage("Impossible de creer un code article pour le grossiste sélectionné");
        try {

            if (str_CODE_ARTICLE.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return result;
            }

            // if (this.getListeFamilleGrossiste("", OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID()).size()
            // > 0) {// a decommentere en cas de probleme 03/03/2017
            OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID());
            if (OTFamilleGrossiste != null) {
                this.buildErrorTraceMessage(
                        "Le code " + OTFamilleGrossiste.getStrCODEARTICLE() + " est déjà affecté au Produit "
                                + OTFamille.getStrDESCRIPTION() + " chez " + OTGrossiste.getStrDESCRIPTION());
                return result;
            }
            str_CODE_ARTICLE = new familleManagement(this.getOdataManager()).generateCIP(str_CODE_ARTICLE);

            OTFamilleGrossiste = new TFamilleGrossiste();
            OTFamilleGrossiste.setLgFAMILLEGROSSISTEID(this.getKey().getComplexId());
            OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
            OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
            OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
            OTFamilleGrossiste.setIntPAF(int_PAF);
            OTFamilleGrossiste.setIntPRICE(int_PRICE);
            OTFamilleGrossiste.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleGrossiste.setDtCREATED(new Date());
            /*
             * this.getOdataManager().getEm().persist(OTFamilleGrossiste);
             * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); result = true;
             */

            if (this.persiste(OTFamilleGrossiste)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean create2(TGrossiste OTGrossiste, TFamille OTFamille, String str_CODE_ARTICLE, int int_PRICE,
            int int_PAF) {
        boolean result = false;
        TFamilleGrossiste OTFamilleGrossiste = null;
        this.buildErrorTraceMessage("Impossible de creer un code article pour le grossiste sélectionné");
        try {

            if (str_CODE_ARTICLE.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return result;
            }

            // if (this.getListeFamilleGrossiste("", OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID()).size()
            // > 0) {// a decommentere en cas de probleme 03/03/2017
            OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID());
            if (OTFamilleGrossiste != null) {
                this.buildErrorTraceMessage(
                        "Le code " + OTFamilleGrossiste.getStrCODEARTICLE() + " est déjà affecté au Produit "
                                + OTFamille.getStrDESCRIPTION() + " chez " + OTGrossiste.getStrDESCRIPTION());
                return result;
            }
            str_CODE_ARTICLE = new familleManagement(this.getOdataManager()).generateCIP(str_CODE_ARTICLE);

            OTFamilleGrossiste = new TFamilleGrossiste();
            OTFamilleGrossiste.setLgFAMILLEGROSSISTEID(this.getKey().getComplexId());
            OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
            OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
            OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
            OTFamilleGrossiste.setIntPAF(int_PAF);
            OTFamilleGrossiste.setIntPRICE(int_PRICE);
            OTFamilleGrossiste.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleGrossiste.setDtCREATED(new Date());
            this.getOdataManager().getEm().persist(OTFamilleGrossiste);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean create(TGrossiste OTGrossiste, TFamille OTFamille, String str_CODE_ARTICLE, int int_PRICE,
            int int_PAF, EntityManager em) {
        boolean result = false;
        TFamilleGrossiste OTFamilleGrossiste;
        this.buildErrorTraceMessage("Impossible de creer un code article pour le grossiste sélectionné");
        try {

            if (str_CODE_ARTICLE.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return result;
            }

            // if (this.getListeFamilleGrossiste("", OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID()).size()
            // > 0) {// a decommentere en cas de probleme 03/03/2017
            OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID());
            System.out.println("------------------------>>>>  " + OTFamilleGrossiste + " ------------  " + OTGrossiste
                    + " str_CODE_ARTICLE " + str_CODE_ARTICLE);

            if (OTFamilleGrossiste != null) {
                this.buildErrorTraceMessage(
                        "Le code " + OTFamilleGrossiste.getStrCODEARTICLE() + " est déjà affecté au Produit "
                                + OTFamille.getStrDESCRIPTION() + " chez " + OTGrossiste.getStrDESCRIPTION());
                return result;
            }
            str_CODE_ARTICLE = new familleManagement(this.getOdataManager()).generateCIP(str_CODE_ARTICLE);

            OTFamilleGrossiste = new TFamilleGrossiste();
            OTFamilleGrossiste.setLgFAMILLEGROSSISTEID(this.getKey().getComplexId());
            OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
            OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
            OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
            OTFamilleGrossiste.setIntPAF(int_PAF);
            OTFamilleGrossiste.setIntPRICE(int_PRICE);
            OTFamilleGrossiste.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleGrossiste.setDtCREATED(new Date());
            em.persist(OTFamilleGrossiste);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public void update(String lg_FAMILLE_GROSSISTE_ID, String lg_GROSSISTE_ID, String lg_FAMILLE_ID,
            String str_CODE_ARTICLE) {

        try {
            TFamilleGrossiste OTFamilleGrossiste = getOdataManager().getEm().find(TFamilleGrossiste.class,
                    lg_FAMILLE_GROSSISTE_ID);

            if (str_CODE_ARTICLE.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return;
            }

            str_CODE_ARTICLE = generateCIP(str_CODE_ARTICLE);

            if (this.getListeFamilleGrossiste("", lg_FAMILLE_ID, lg_GROSSISTE_ID).size() > 0) {
                this.buildErrorTraceMessage("Un code du grossiste a déjà été assigné au produit sélectionné");
                return;
            }
            // str_CODE_ARTICLE = new familleManagement(this.getOdataManager()).generateCIP(str_CODE_ARTICLE);

            OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
            TFamille OTFamille = getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            if (OTFamille != null) {
                OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
            }

            TGrossiste OTGrossiste = new grossisteManagement(this.getOdataManager()).getGrossiste(lg_GROSSISTE_ID);
            if (OTGrossiste != null) {
                OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
            }
            OTFamilleGrossiste.setDtUPDATED(new Date());
            this.persiste(OTFamilleGrossiste);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mettre à jour les informations");
        }

        // </editor-fold>
    }

    public TFamilleGrossiste findFamilleGrossiste(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.lgGROSSISTEID = ?2 OR t.lgGROSSISTEID.strDESCRIPTION = ?2) AND t.strSTATUT = ?3 ")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_GROSSISTE_ID)
                    .setParameter(3, commonparameter.statut_enable);
            qry.setMaxResults(1);
            OTFamilleGrossiste = (TFamilleGrossiste) qry.getSingleResult();
            this.getOdataManager().getEm().refresh(OTFamilleGrossiste);
        } catch (Exception e) {

        }

        return OTFamilleGrossiste;
    }

    public TFamilleGrossiste findFamilleGrossiste(TFamille OTFamille, TGrossiste OTGrossiste) {
        TFamilleGrossiste OTFamilleGrossiste;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.lgGROSSISTEID = ?2 OR t.lgGROSSISTEID.strDESCRIPTION = ?2) AND t.strSTATUT LIKE ?3 ")
                    .setParameter(1, OTFamille.getLgFAMILLEID()).setParameter(2, OTGrossiste.getLgGROSSISTEID())
                    .setParameter(3, commonparameter.statut_enable);
            qry.setMaxResults(1);
            OTFamilleGrossiste = (TFamilleGrossiste) qry.getSingleResult();

        } catch (Exception e) {
            OTFamilleGrossiste = new TFamilleGrossiste();
            OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
            OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
            OTFamilleGrossiste.setIntPAF(OTFamille.getIntPAF());
            OTFamilleGrossiste.setIntPRICE(OTFamille.getIntPRICE());
            // OTFamilleGrossiste.setStrCODEARTICLE(OTFamille.getIntCIP());
            OTFamilleGrossiste.setStrCODEARTICLE("");
            this.persiste(OTFamilleGrossiste);

        }

        return OTFamilleGrossiste;
    }

    public TFamilleGrossiste findGrossiste(TFamille OTFamille, TGrossiste OTGrossiste) {
        TFamilleGrossiste OTFamilleGrossiste;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.lgGROSSISTEID = ?2 OR t.lgGROSSISTEID.strDESCRIPTION = ?2) AND t.strSTATUT = ?3 ")
                    .setParameter(1, OTFamille.getLgFAMILLEID()).setParameter(2, OTGrossiste.getLgGROSSISTEID())
                    .setParameter(3, commonparameter.statut_enable);
            qry.setMaxResults(1);
            OTFamilleGrossiste = (TFamilleGrossiste) qry.getSingleResult();
            this.getOdataManager().getEm().refresh(OTFamilleGrossiste);

        } catch (Exception e) {
            // e.printStackTrace(System.err);
            return null;

        }

        return OTFamilleGrossiste;
    }

    public TFamilleGrossiste findFamilleGrossistesoldOut(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {
        TFamilleGrossiste OTFamilleGrossiste = null;

        try {

            OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.blRUPTURE LIKE ?3 AND t.strSTATUT LIKE ?4 ")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_GROSSISTE_ID).setParameter(3, Boolean.TRUE)
                    .setParameter(4, commonparameter.statut_enable).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return OTFamilleGrossiste;

        // </editor-fold>
    }

    public boolean delete(String lg_FAMILLE_GROSSISTE_ID) {
        boolean result = false;
        try {

            TFamilleGrossiste OTFamilleGrossiste = this.getOdataManager().getEm().find(TFamilleGrossiste.class,
                    lg_FAMILLE_GROSSISTE_ID);
            if (this.delete(OTFamilleGrossiste)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de suppression du lien du grossiste à l'article sélectionné");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du lien du grossiste à l'article sélectionné");
        }
        return result;
    }

    public void soldOutMakingON(String lg_ORDERDETAIL_ID) {

        // <editor-fold defaultstate="collapsed" desc="soldOutMakingON - Ajouter à la liste des ruptures">
        TFamilleGrossiste OTFamilleGrossiste = null;
        TRuptureHistory OTRuptureHistory = null;
        String lg_FAMILLE_ID = "", lg_GROSSISTE_ID = "";
        TOrderDetail OTOrderDetail = null;

        try {

            OTOrderDetail = this.getOdataManager().getEm().find(dal.TOrderDetail.class, lg_ORDERDETAIL_ID);

            if (OTOrderDetail != null) {

                lg_FAMILLE_ID = OTOrderDetail.getLgFAMILLEID().getLgFAMILLEID();
                lg_GROSSISTE_ID = OTOrderDetail.getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID();

                OTFamilleGrossiste = this.findFamilleGrossiste(lg_FAMILLE_ID, lg_GROSSISTE_ID);
                if (OTFamilleGrossiste != null) {

                    OTFamilleGrossiste.setBlRUPTURE(Boolean.TRUE);
                    OTFamilleGrossiste.setIntNBRERUPTURE(OTFamilleGrossiste.getIntNBRERUPTURE() + 1);
                    OTFamilleGrossiste.setDtRUPTURE(new Date());
                    OTFamilleGrossiste.setDtUPDATED(new Date());

                    if (this.persiste(OTFamilleGrossiste)) {

                        OTRuptureHistory = new TRuptureHistory();
                        OTRuptureHistory.setLgRUPTUREHISTORYID(this.getKey().getComplexId());
                        OTRuptureHistory.setLgFAMILLEID(OTFamilleGrossiste.getLgFAMILLEID());
                        OTRuptureHistory.setDtCREATED(new Date());

                        if (this.persiste(OTRuptureHistory)) {

                            OTOrderDetail.setStrSTATUT(commonparameter.statut_suspended);
                            this.persiste(OTOrderDetail);

                        }
                    }

                    new logger().OCategory.info("OTFamilleGrossiste  " + OTFamilleGrossiste.getLgFAMILLEGROSSISTEID());

                }

            }

        } catch (Exception e) {

            new logger().OCategory.info("OTFamilleGrossiste" + e);

        }

        // </editor-fold>
    }

    public void soldOutMakingON(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {

        // <editor-fold defaultstate="collapsed" desc="soldOutMakingON - Ajouter à la liste des ruptures">
        TFamilleGrossiste OTFamilleGrossiste = null;
        TRuptureHistory OTRuptureHistory = null;

        try {

            OTFamilleGrossiste = this.findFamilleGrossiste(lg_FAMILLE_ID, lg_GROSSISTE_ID);

            if (OTFamilleGrossiste != null) {

                OTFamilleGrossiste.setBlRUPTURE(Boolean.TRUE);
                OTFamilleGrossiste.setIntNBRERUPTURE(OTFamilleGrossiste.getIntNBRERUPTURE() + 1);
                OTFamilleGrossiste.setDtRUPTURE(new Date());
                OTFamilleGrossiste.setDtUPDATED(new Date());

                if (this.persiste(OTFamilleGrossiste)) {

                    OTRuptureHistory = new TRuptureHistory();
                    OTRuptureHistory.setLgRUPTUREHISTORYID(this.getKey().getComplexId());
                    OTRuptureHistory.setLgFAMILLEID(OTFamilleGrossiste.getLgFAMILLEID());
                    OTRuptureHistory.setDtCREATED(new Date());

                    this.persiste(OTRuptureHistory);
                }

                new logger().OCategory.info("OTFamilleGrossiste  " + OTFamilleGrossiste.getLgFAMILLEGROSSISTEID());

            }

        } catch (Exception e) {

            new logger().OCategory.info("OTFamilleGrossiste" + e);

        }

        // </editor-fold>
    }

    public void soldOutMakingOFF(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {

        // <editor-fold defaultstate="collapsed" desc="soldOutMakingOFF - Retirer à la liste des ruptures">
        TFamilleGrossiste OTFamilleGrossiste = null;

        try {

            OTFamilleGrossiste = this.findFamilleGrossiste(lg_FAMILLE_ID, lg_GROSSISTE_ID);

            if (OTFamilleGrossiste != null) {

                OTFamilleGrossiste.setBlRUPTURE(Boolean.FALSE);
                OTFamilleGrossiste.setDtUPDATED(new Date());
                this.persiste(OTFamilleGrossiste);

                new logger().OCategory.info("OTFamilleGrossiste  " + OTFamilleGrossiste.getLgFAMILLEGROSSISTEID());

            }

        } catch (Exception e) {

            new logger().OCategory.info("OTFamilleGrossiste" + e);

        }

        // </editor-fold>
    }

    public List<TFamilleGrossiste> getListeFamilleGrossiste(String search_value, String lg_FAMILLE_ID,
            String lg_GROSSISTE_ID) {
        List<TFamilleGrossiste> lstTFamilleGrossiste = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTFamilleGrossiste = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.strLIBELLE LIKE ?2 OR t.strCODEARTICLE LIKE ?2) AND t.strSTATUT LIKE ?3 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?4 ORDER BY t.lgGROSSISTEID.strLIBELLE")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, lg_GROSSISTE_ID).getResultList();
            lstTFamilleGrossiste.forEach(a -> {
                this.getOdataManager().getEm().refresh(a);
            });
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTFamilleGrossiste;
    }

    public boolean updatePriceFamilleGrossiste(TGrossiste OTGrossiste, TFamille OTFamille, int int_PRICE, int int_PAF) {
        boolean result = false;
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID());
            if (OTFamilleGrossiste == null) {
                result = this.create2(OTGrossiste, OTFamille, OTFamille.getIntCIP(), int_PRICE, int_PAF);
            } else {
                if (OTFamille.getIntPAF() != int_PAF || OTFamille.getIntPRICE() != int_PRICE) {
                    OTFamilleGrossiste.setIntPRICE(int_PRICE);
                    OTFamilleGrossiste.setIntPAF(int_PAF);
                    OTFamilleGrossiste.setDtUPDATED(new Date());
                    this.getOdataManager().getEm().merge(OTFamilleGrossiste);
                }
                result = true;
            }
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de traitement de l'opération concernant les prix du grossiste");
        }
        return result;
    }

    public boolean updatePriceFamilleGrossiste(TGrossiste OTGrossiste, TFamille OTFamille, int int_PRICE, int int_PAF,
            EntityManager em) {
        boolean result = false;
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID());
            if (OTFamilleGrossiste == null) {
                result = this.create(OTGrossiste, OTFamille, OTFamille.getIntCIP(), int_PRICE, int_PAF, em);
            } else {
                if (OTFamille.getIntPAF() != int_PAF || OTFamille.getIntPRICE() != int_PRICE) {
                    OTFamilleGrossiste.setIntPRICE(int_PRICE);
                    OTFamilleGrossiste.setIntPAF(int_PAF);
                    OTFamilleGrossiste.setDtUPDATED(new Date());
                    em.merge(OTFamilleGrossiste);
                }
                result = true;
            }
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de traitement de l'opération concernant les prix du grossiste");
        }
        return result;
    }

    private String generateCIP(String int_CIP) {
        String result = "";
        int resultCIP = 0;

        char[] charArray = int_CIP.toCharArray();

        if (int_CIP.length() == 6) {
            for (int i = 1; i <= charArray.length; i++) {
                resultCIP += Integer.parseInt(charArray[(i - 1)] + "") * (i + 1);
            }

            int mod = resultCIP % 11;
            result = int_CIP + "" + mod;
        } else {
            result = int_CIP;
        }

        return result;
    }

    public boolean updateFamilleGrossiste(String lg_FAMILLE_GROSSISTE_ID, String lg_GROSSISTE_ID, String lg_FAMILLE_ID,
            String str_CODE_ARTICLE) {

        try {
            TFamilleGrossiste OTFamilleGrossiste = getOdataManager().getEm().find(TFamilleGrossiste.class,
                    lg_FAMILLE_GROSSISTE_ID);

            if (str_CODE_ARTICLE.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return false;
            }

            str_CODE_ARTICLE = generateCIP(str_CODE_ARTICLE);

            String curentcip = OTFamilleGrossiste.getStrCODEARTICLE();
            if (!str_CODE_ARTICLE.equals(curentcip)) {

                if (isCIPExist(str_CODE_ARTICLE)) {

                    return false;
                } else {
                    if (!updateFamilleGrossisteCodeArticle(OTFamilleGrossiste, str_CODE_ARTICLE)) {
                        return false;
                    }
                }
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mettre à jour les informations");
        }

        return true;
    }

    // verification de l'existance d'un code CIP
    private boolean isCIPExist(String int_CIP) {
        boolean result = false;
        try {
            TFamilleGrossiste OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamilleGrossiste t WHERE t.strCODEARTICLE = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, int_CIP).setParameter(2, commonparameter.statut_enable).setMaxResults(1)
                    .getSingleResult();
            if (OTFamilleGrossiste != null) {
                if (OTFamilleGrossiste.getLgGROSSISTEID()
                        .equals(OTFamilleGrossiste.getLgFAMILLEID().getLgGROSSISTEID())) {
                    result = true;
                    this.buildErrorTraceMessage(
                            "Impossible d'utiliser ce code. Code CIP du grossiste principal de l'article "
                                    + OTFamilleGrossiste.getLgFAMILLEID().getStrDESCRIPTION());
                }
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return result;
    }
    // fin verification de l'existance d'un code CIP

    boolean updateFamilleGrossisteCodeArticle(TFamilleGrossiste OTFamilleGrossiste, String codeArticle) {
        boolean isOk = true;
        try {
            TFamille f = OTFamilleGrossiste.getLgFAMILLEID();
            TGrossiste pp = f.getLgGROSSISTEID();
            TGrossiste newGrossiste = OTFamilleGrossiste.getLgGROSSISTEID();

            if (newGrossiste.getLgGROSSISTEID().equals(pp.getLgGROSSISTEID())) {
                if (f.getBoolDECONDITIONNEEXIST() == 1) {
                    List<TFamilleGrossiste> familleGrossistes = getArticleDeconditionnes(newGrossiste, f,
                            OTFamilleGrossiste.getLgFAMILLEGROSSISTEID());
                    for (TFamilleGrossiste familleGrossiste : familleGrossistes) {
                        familleGrossiste.setStrCODEARTICLE(codeArticle + "D");
                        this.merge(familleGrossiste);
                    }
                }
                f.setIntCIP(codeArticle);
            }
            OTFamilleGrossiste.setStrCODEARTICLE(codeArticle);
            OTFamilleGrossiste.setDtUPDATED(new Date());
            this.persiste(OTFamilleGrossiste);
            this.merge(f);

        } catch (Exception e) {
            isOk = false;
            e.printStackTrace();
        }
        return isOk;
    }

    private List<TFamilleGrossiste> getArticleDeconditionnes(TGrossiste grossiste, TFamille famille, String id) {
        List<TFamilleGrossiste> familleGrossistes = new ArrayList<>();
        try {
            familleGrossistes = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2  AND o.lgFAMILLEGROSSISTEID <> ?3")
                    .setParameter(1, famille.getLgFAMILLEID()).setParameter(2, grossiste.getLgGROSSISTEID())
                    .setParameter(3, grossiste.getLgGROSSISTEID()).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return familleGrossistes;
    }

    public boolean createProduct(TGrossiste OTGrossiste, TFamille OTFamille, String str_CODE_ARTICLE, int int_PRICE,
            int int_PAF) {
        boolean result = false;
        TFamilleGrossiste OTFamilleGrossiste;
        this.buildErrorTraceMessage("Impossible de creer un code article pour le grossiste sélectionné");
        try {

            if (str_CODE_ARTICLE.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return result;
            }

            //
            OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(), OTGrossiste.getLgGROSSISTEID());
            if (OTFamilleGrossiste != null) {
                this.buildErrorTraceMessage(
                        "Le code " + OTFamilleGrossiste.getStrCODEARTICLE() + " est déjà affecté au Produit "
                                + OTFamille.getStrDESCRIPTION() + " chez " + OTGrossiste.getStrDESCRIPTION());
                return result;
            }
            str_CODE_ARTICLE = new familleManagement(this.getOdataManager()).generateCIP(str_CODE_ARTICLE);

            OTFamilleGrossiste = new TFamilleGrossiste();
            OTFamilleGrossiste.setLgFAMILLEGROSSISTEID(this.getKey().getComplexId());
            OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
            OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
            OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
            OTFamilleGrossiste.setIntPAF(int_PAF);
            OTFamilleGrossiste.setIntPRICE(int_PRICE);
            OTFamilleGrossiste.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleGrossiste.setDtCREATED(new Date());
            this.getOdataManager().getEm().persist(OTFamilleGrossiste);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
}
