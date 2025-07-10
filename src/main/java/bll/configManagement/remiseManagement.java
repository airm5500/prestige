/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TGrilleRemise;
import dal.TRemise;
import dal.TTypeRemise;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class remiseManagement extends bllBase {

    Object Otable = TRemise.class;

    public remiseManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public remiseManagement(dataManager OdataManager, TUser OTUser) {
        this.setOdataManager(OdataManager);
        this.setOTUser(OTUser);
        this.checkDatamanager();
    }

    public TRemise createTRemise(String str_CODE, String str_NAME, int str_IDS, String lg_TYPE_REMISE_ID,
            double dbl_TAUX) {
        TRemise OTRemise = null;
        try {

            OTRemise = new TRemise();

            OTRemise.setLgREMISEID(this.getKey().getComplexId());
            OTRemise.setStrCODE(str_CODE);
            OTRemise.setStrNAME(str_NAME);
            OTRemise.setStrIDS(str_IDS);
            OTRemise.setDblTAUX(dbl_TAUX);
            TTypeRemise OTTypeRemise = this.getTTypeRemise(lg_TYPE_REMISE_ID);
            if (OTTypeRemise != null) {
                OTRemise.setLgTYPEREMISEID(OTTypeRemise);
            }

            OTRemise.setStrSTATUT(commonparameter.statut_enable);
            OTRemise.setDtCREATED(new Date());

            if (this.persiste(OTRemise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de la remise");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer la remise");

        }
        return OTRemise;
    }

    public void create(String str_CODE, String str_NAME, int str_IDS, String lg_TYPE_REMISE_ID) {

        try {

            TRemise OTRemise = new TRemise();

            OTRemise.setLgREMISEID(this.getKey().getComplexId());
            OTRemise.setStrCODE(str_CODE);
            OTRemise.setStrNAME(str_NAME);
            OTRemise.setStrIDS(str_IDS);

            TTypeRemise OTTypeRemise = getOdataManager().getEm().find(TTypeRemise.class, lg_TYPE_REMISE_ID);
            if (OTTypeRemise != null) {
                OTRemise.setLgTYPEREMISEID(OTTypeRemise);
                new logger().oCategory.info("lg_TYPE_REMISE_ID     Create   " + lg_TYPE_REMISE_ID);
            }

            /*
             * TGrilleRemise OTGrilleRemise = getOdataManager().getEm().find(TGrilleRemise.class, str_CODE_GRILLE); if
             * (OTGrilleRemise != null) { OTRemise.setDblTAUX(OTGrilleRemise.getDblTAUX()); new
             * logger().oCategory.info("str_CODE_GRILLE     Create   " + str_CODE_GRILLE); }
             */
            OTRemise.setStrSTATUT(commonparameter.statut_enable);
            OTRemise.setDtCREATED(new Date());

            this.persiste(OTRemise);
            new logger().oCategory
                    .info("Mise a jour OTRemise " + OTRemise.getLgREMISEID() + " StrName " + OTRemise.getStrNAME());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public boolean update(String lg_REMISE_ID, String str_CODE, String str_NAME, int str_IDS, String lg_TYPE_REMISE_ID,
            double dbl_TAUX) {
        boolean result = false;
        try {

            TRemise OTRemise = this.getTRemise(lg_REMISE_ID);
            TTypeRemise OTTypeRemise = this.getTTypeRemise(lg_TYPE_REMISE_ID);
            if (OTTypeRemise != null) {
                OTRemise.setLgTYPEREMISEID(OTTypeRemise);
            }

            OTRemise.setStrCODE(str_CODE);
            OTRemise.setStrIDS(str_IDS);
            OTRemise.setStrNAME(str_NAME);
            OTRemise.setDblTAUX(dbl_TAUX);
            OTRemise.setDtUPDATED(new Date());

            if (this.persiste(OTRemise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de la remise");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la remise");
        }
        return result;
    }

    public boolean deleteRemise(String lg_REMISE_ID) {
        boolean result = false;
        try {
            TRemise OTRemise = this.getOdataManager().getEm().find(TRemise.class, lg_REMISE_ID);
            if (this.delete(OTRemise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Impossible de supprimer une remise qui est déjà liée à une grille remise");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de la remise");
        }
        return result;
    }

    public void create_Grille(int str_CODE_GRILLE, String str_DESCRIPTION, double dbl_TAUX) {

        try {

            // TRemise OTRemise = new TRemise();
            dal.TGrilleRemise OTGrilleRemise = new TGrilleRemise();

            // OTGrilleRemise.setStrCODEGRILLE(str_CODE_GRILLE);
            OTGrilleRemise.setStrDESCRIPTION(str_DESCRIPTION);
            OTGrilleRemise.setDblTAUX(dbl_TAUX);

            OTGrilleRemise.setStrSTATUT(commonparameter.statut_enable);
            OTGrilleRemise.setDtCREATED(new Date());

            this.persiste(OTGrilleRemise);
            // new logger().oCategory.info("Mise a jour OTRemise " + OTGrilleRemise.getStrCODEGRILLE() + " StrName " +
            // OTGrilleRemise.getStrDESCRIPTION());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update_Grille(int str_CODE_GRILLE, String str_DESCRIPTION, double dbl_TAUX) {

        try {

            new logger().oCategory.info("str_CODE_GRILLE     Create   " + str_CODE_GRILLE);
            new logger().oCategory.info("str_DESCRIPTION     Create   " + str_DESCRIPTION);

            dal.TGrilleRemise OTGrilleRemise = null;

            OTGrilleRemise = getOdataManager().getEm().find(TGrilleRemise.class, str_CODE_GRILLE);

            new logger().oCategory.info("str_DESCRIPTION     Create   " + OTGrilleRemise.getStrDESCRIPTION());
            new logger().oCategory.info("dbl_TAUX     Create   " + OTGrilleRemise.getDblTAUX());

            OTGrilleRemise.setStrDESCRIPTION(str_DESCRIPTION);
            OTGrilleRemise.setDblTAUX(dbl_TAUX);
            OTGrilleRemise.setStrSTATUT(commonparameter.statut_enable);
            OTGrilleRemise.setDtUPDATED(new Date());
            this.persiste(OTGrilleRemise);

        } catch (Exception e) {

            new logger().oCategory.info("Mise a jour OTRemise IMPOSSIBLE");

        }

    }

    public TRemise AddRemise(String str_NAME, String str_CODE, int str_IDS, String lg_TYPE_REMISE_ID) {

        TTypeRemise OTTypeRemise = getOdataManager().getEm().find(TTypeRemise.class, lg_TYPE_REMISE_ID);
        if (OTTypeRemise == null) {
            this.buildErrorTraceMessage("Desole ce type de remise nexiste pas  ");
            return null;
        }
        TRemise OTRemise = new TRemise();
        OTRemise.setLgREMISEID(this.getKey().getComplexId());
        OTRemise.setStrIDS(str_IDS);
        OTRemise.setStrCODE(str_CODE);
        OTRemise.setStrNAME(str_NAME);
        OTRemise.setLgTYPEREMISEID(OTTypeRemise);
        OTRemise.setStrSTATUT(commonparameter.statut_enable);
        OTRemise.setDtCREATED(new Date());
        this.persiste(OTRemise);
        this.buildSuccesTraceMessage(" Remise Cree Avec Succes");
        return OTRemise;
    }

    public TGrilleRemise AddGrilleToRemise(int str_CODE_GRILLE, String str_DESCRIPTION, double dbl_TAUX,
            String lg_REMISE_ID) {

        TRemise OTRemise = null;
        TGrilleRemise OTGrilleRemise = null;
        try {
            OTRemise = this.getTRemise(lg_REMISE_ID);
            if (OTRemise == null) {
                this.buildErrorTraceMessage("Remise inexistante. Vérifiez votre sélection");
                return null;
            }
            if (this.checkIsCodeGrilleRemiseExistInRemise(str_CODE_GRILLE, lg_REMISE_ID) != null) {
                return null;
            }
            OTGrilleRemise = new TGrilleRemise();
            OTGrilleRemise.setLgGRILLEREMISEID(this.getKey().getComplexId());
            OTGrilleRemise.setLgREMISEID(OTRemise);
            OTGrilleRemise.setStrCODEGRILLE(str_CODE_GRILLE);
            OTGrilleRemise.setStrDESCRIPTION(str_DESCRIPTION);
            OTGrilleRemise.setDblTAUX(dbl_TAUX);
            OTGrilleRemise.setStrSTATUT(commonparameter.statut_enable);
            OTGrilleRemise.setDtCREATED(new Date());
            if (this.persiste(OTGrilleRemise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de la grille remise");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la grille remise");
        }

        return OTGrilleRemise;
    }

    public TGrilleRemise UpdateGrilleOfRemise(String lg_GRILLE_REMISE_ID, int str_CODE_GRILLE, String str_DESCRIPTION,
            double dbl_TAUX, String lg_REMISE_ID) {
        TGrilleRemise OTGrilleRemise = null, OTGrilleRemiseOld = null;
        TRemise OTRemise = null;
        try {
            OTGrilleRemise = getOdataManager().getEm().find(TGrilleRemise.class, lg_GRILLE_REMISE_ID);
            if (OTGrilleRemise == null) {
                this.buildErrorTraceMessage("Désole cette de grille remise n'existe pas");
                return null;
            }
            OTRemise = this.getTRemise(lg_REMISE_ID);
            OTGrilleRemiseOld = this.checkIsCodeGrilleRemiseExistInRemise(str_CODE_GRILLE, OTRemise.getLgREMISEID());
            if (OTGrilleRemiseOld != null && !OTGrilleRemise.equals(OTGrilleRemiseOld)) {
                this.buildErrorTraceMessage("Désolé cette grille est déjà utilisée par une autre remise");
                return null;
            }

            OTGrilleRemise.setLgREMISEID(OTRemise);
            OTGrilleRemise.setStrCODEGRILLE(str_CODE_GRILLE);
            OTGrilleRemise.setStrDESCRIPTION(str_DESCRIPTION);
            OTGrilleRemise.setDblTAUX(dbl_TAUX);
            OTGrilleRemise.setDtUPDATED(new Date());
            if (this.persiste(OTGrilleRemise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de la grille remise");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la grille remise");
        }
        return OTGrilleRemise;
    }

    public TGrilleRemise UpdateGrilleOfRemise(String lg_GRILLE_REMISE_ID, String str_DESCRIPTION, double dbl_TAUX) {
        // TRemise OTRemise = null;
        TGrilleRemise OTGrilleRemise = getOdataManager().getEm().find(TGrilleRemise.class, lg_GRILLE_REMISE_ID);
        if (OTGrilleRemise == null) {
            this.buildErrorTraceMessage("Desole cette de grille remise nexiste pas  ");
            return null;
        }

        try {

            // OTRemise = (TRemise) this.getOdataManager().getEm().createQuery("SELECT t FROM TRemise t WHERE
            // t.lgREMISEID LIKE ?1 OR t.strCODE LIKE ?2 OR t.strNAME LIKE ?2")
            // .setParameter(1, lg_REMISE_ID).setParameter(2, lg_REMISE_ID).getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR", "TRemise INEXISTANT  " + e.toString());
            return null;
        }

        // OTGrilleRemise.setLgREMISEID(OTRemise);
        // OTGrilleRemise.setStrCODEGRILLE(str_CODE_GRILLE);
        OTGrilleRemise.setStrDESCRIPTION(str_DESCRIPTION);
        OTGrilleRemise.setDblTAUX(dbl_TAUX);
        OTGrilleRemise.setStrSTATUT(commonparameter.statut_enable);
        OTGrilleRemise.setDtUPDATED(new Date());
        this.persiste(OTGrilleRemise);
        this.buildSuccesTraceMessage(" Grille de la Remise [" + OTGrilleRemise.getLgREMISEID()
                + OTGrilleRemise.getStrCODEGRILLE() + "]Modifiee Avec Succes");
        return OTGrilleRemise;
    }

    public boolean DeleteGrilleOfRemise(String lg_GRILLE_REMISE_ID) {
        boolean result = false;
        try {
            TGrilleRemise OTGrilleRemise = getOdataManager().getEm().find(TGrilleRemise.class, lg_GRILLE_REMISE_ID);
            if (OTGrilleRemise == null) {
                this.buildErrorTraceMessage("Désole cette de grille remise n'existe pas");
                return false;
            }
            if (this.delete(OTGrilleRemise)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de suppression de la grille de remise");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de la grille de remise");
        }
        return result;
    }

    // liste des remises
    public List<TRemise> getListeTRemise(String search_value, String lg_REMISE_ID, String lg_TYPE_REMISE_ID) {
        List<TRemise> lstTRemise = new ArrayList<TRemise>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTRemise = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRemise t WHERE t.lgREMISEID LIKE ?1 AND t.lgTYPEREMISEID.lgTYPEREMISEID LIKE ?2 AND (t.strCODE LIKE ?3 OR t.strNAME LIKE ?3) AND t.strSTATUT = ?4")
                    .setParameter(1, lg_REMISE_ID).setParameter(2, lg_TYPE_REMISE_ID)
                    .setParameter(3, search_value + "%").setParameter(4, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTRemise taille " + lstTRemise.size());
        return lstTRemise;
    }

    public List<TRemise> getListeTRemise(String search_value, String lg_REMISE_ID, String lg_TYPE_REMISE_ID,
            int int_IDS) {
        List<TRemise> lstTRemise = new ArrayList<TRemise>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTRemise = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRemise t WHERE t.lgREMISEID LIKE ?1 AND t.lgTYPEREMISEID.lgTYPEREMISEID LIKE ?2 AND (t.strCODE LIKE ?3 OR t.strNAME LIKE ?3) AND t.strSTATUT = ?4 AND t.strIDS <= ?5 ORDER BY t.strNAME")
                    .setParameter(1, lg_REMISE_ID).setParameter(2, lg_TYPE_REMISE_ID)
                    .setParameter(3, search_value + "%").setParameter(4, commonparameter.statut_enable)
                    .setParameter(5, int_IDS).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTRemise taille " + lstTRemise.size());
        return lstTRemise;
    }

    // fin liste des remises

    // liste des types de remise
    public List<TTypeRemise> getListeTTypeRemise(String search_value, String lg_TYPE_REMISE_ID) {
        List<TTypeRemise> lstTTypeRemise = new ArrayList<TTypeRemise>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTTypeRemise = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeRemise t WHERE t.lgTYPEREMISEID LIKE ?2 AND t.strNAME LIKE ?3 AND t.strSTATUT = ?4")
                    .setParameter(2, lg_TYPE_REMISE_ID).setParameter(3, search_value + "%")
                    .setParameter(4, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTTypeRemise taille " + lstTTypeRemise.size());
        return lstTTypeRemise;
    }

    // fin liste des types de remise
    // liste des grilles remises
    public List<TGrilleRemise> getListeTGrilleRemise(String search_value, String lg_GRILLE_REMISE_ID,
            String lg_REMISE_ID) {
        List<TGrilleRemise> lstTGrilleRemise = new ArrayList<TGrilleRemise>();
        int value = 0;
        try {
            value = Integer.parseInt(search_value);
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTGrilleRemise = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE LIKE ?1 AND t.lgGRILLEREMISEID LIKE ?2 AND t.lgREMISEID.lgREMISEID LIKE ?3 AND t.strSTATUT = ?4")
                    .setParameter(1, value).setParameter(2, lg_GRILLE_REMISE_ID).setParameter(3, lg_REMISE_ID)
                    .setParameter(4, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            // e.printStackTrace();
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTGrilleRemise = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TGrilleRemise t WHERE t.strDESCRIPTION LIKE ?1 AND t.lgGRILLEREMISEID LIKE ?2 AND t.lgREMISEID.lgREMISEID LIKE ?3 AND t.strSTATUT = ?4")
                    .setParameter(1, search_value + "%").setParameter(2, lg_GRILLE_REMISE_ID)
                    .setParameter(3, lg_REMISE_ID).setParameter(4, commonparameter.statut_enable).getResultList();
        }
        new logger().OCategory.info("lstTGrilleRemise taille " + lstTGrilleRemise.size());
        return lstTGrilleRemise;
    }
    // fin liste des grilles remises

    // verifie si le code de la grille remise n'est pas a pas affecté a une remise en cours
    public TGrilleRemise checkIsCodeGrilleRemiseExistInRemise(int str_CODE_GRILLE, String lg_REMISE_ID) {
        TGrilleRemise OTGrilleRemise = null;
        try {
            OTGrilleRemise = (TGrilleRemise) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1 AND t.lgREMISEID.lgREMISEID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, str_CODE_GRILLE).setParameter(2, lg_REMISE_ID)
                    .setParameter(3, commonparameter.statut_enable).getSingleResult();
            if (OTGrilleRemise != null) {
                this.buildErrorTraceMessage("Désolé! Code grille remise déjà affecté à la remise sélectionnée");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTGrilleRemise;
    }

    // fin verifie si le code de la grille remise n'est pas a pas affecté a une remise en cours
    // recuperation d'une remise
    public TRemise getTRemise(String search_value) {
        TRemise OTRemise = null;
        try {
            OTRemise = (TRemise) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRemise t WHERE (t.lgREMISEID LIKE ?1 OR t.strCODE LIKE ?1 OR t.strNAME LIKE ?1)")
                    .setParameter(1, search_value).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTRemise;
    }

    // fin recuperation d'une remise
    // recuperation d'un type de remise
    public TTypeRemise getTTypeRemise(String search_value) {
        TTypeRemise OTTypeRemise = null;
        try {
            OTTypeRemise = (TTypeRemise) this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TTypeRemise t WHERE (t.lgTYPEREMISEID LIKE ?1 OR t.strDESCRIPTION LIKE ?1)")
                    .setParameter(1, search_value).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTypeRemise;
    }

    // fin recuperation d'un type de remise
}
