/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import bll.common.Parameter;
import bll.entity.EntityData;
import dal.TDci;
import dal.TFamille;
import dal.TFamilleDci;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class dciManagement extends bllBase {

    Object Otable = TDci.class;

    public dciManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String STR_CODE, String STR_NAME) {

        try {

            TDci OTDci = new TDci();
            OTDci.setLgDCIID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir de la date
                                                            // courante
            OTDci.setStrNAME(STR_NAME);
            OTDci.setStrCODE(STR_CODE);
            OTDci.setStrSTATUT(commonparameter.statut_enable);
            OTDci.setDtCREATED(new Date());

            this.persiste(OTDci);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer de DCI");
        }

    }

    public void update(String lg_DCI_ID, String STR_CODE, String STR_NAME) {

        try {

            TDci OTDci = null;
            OTDci = getOdataManager().getEm().find(TDci.class, lg_DCI_ID);

            OTDci.setLgDCIID(lg_DCI_ID);
            OTDci.setStrNAME(STR_NAME);
            OTDci.setStrCODE(STR_CODE);
            OTDci.setStrSTATUT(commonparameter.statut_enable);
            OTDci.setDtUPDATED(new Date());

            this.persiste(OTDci);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public List<TDci> showAllInitial(String search_value) {
        List<TDci> lstTDci = new ArrayList<TDci>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTDci = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TDci t WHERE t.strSTATUT = ?1 AND t.strNAME LIKE ?2")
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, search_value + "%").getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTDci.size());
        return lstTDci;
    }

    public TDci getDci(String lg_DCI_ID) {
        TDci OTDci = null;
        try {
            OTDci = (TDci) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TDci t WHERE t.strSTATUT = ?1 AND (t.lgDCIID = ?2 OR t.strCODE = ?2 OR t.strNAME = ?2)")
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, lg_DCI_ID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("DCI inexistant");
        }
        return OTDci;
    }

    public TFamilleDci getFamilleDci(String lg_FAMILLE_ID, String lg_DCI_ID) {
        TFamilleDci OTFamilleDci = null;
        try {
            OTFamilleDci = (TFamilleDci) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleDci t WHERE (t.lgDCIID.lgDCIID = ?2 OR t.lgDCIID.strNAME = ?2) AND t.lgFAMILLEID.lgFAMILLEID = ?1")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_DCI_ID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("DCI inexistant");
        }
        return OTFamilleDci;
    }

    // liste famille dci
    public List<EntityData> ListDciFamille(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID) {
        EntityData OEntityData = null;
        List<EntityData> Lst = new ArrayList<EntityData>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_famille_dci v WHERE v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "' AND v.lg_DCI_ID LIKE '" + lg_DCI_ID + "' AND (v.str_DESCRIPTION LIKE '" + search_value
                    + "%' OR v.int_CIP LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '" + search_value
                    + "%' OR v.dci_str_NAME LIKE '" + search_value + "%' OR v.str_CODE LIKE '" + search_value
                    + "%') AND v.str_STATUT = '" + commonparameter.statut_enable + "' ";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_FAMILLE_DCI_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("lg_DCI_ID"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_CODE"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("dci_str_NAME"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_CIP"));
                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.info(ex.getMessage());
        }
        new logger().OCategory.info("Lst taille " + Lst.size());

        return Lst;
    }
    // fin liste famille dci

    // creation famille dci
    public boolean createFamilleDci(String lg_DCI_ID, String lg_FAMILLE_ID) {
        boolean result = false;
        TFamilleDci OTFamilleDci = null;
        try {
            OTFamilleDci = this.getFamilleDci(lg_FAMILLE_ID, lg_DCI_ID);
            if (OTFamilleDci != null) {
                this.buildErrorTraceMessage("Ce DCI a déjà été associé à l'article sélectionné");
                return false;
            }
            OTFamilleDci = new TFamilleDci();
            TDci OTDci = this.getDci(lg_DCI_ID);
            TFamille OTFamille = new familleManagement(this.getOdataManager()).getTFamille(lg_FAMILLE_ID);

            if (OTDci == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement. DCI inexistant ou incorrecte");
                return false;
            }
            if (OTFamille == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement. Article inexistant ou incorrect");
                return false;
            }

            OTFamilleDci.setLgFAMILLEDCIID(this.getKey().getComplexId());
            OTFamilleDci.setLgDCIID(OTDci);
            OTFamilleDci.setLgFAMILLEID(OTFamille);
            OTFamilleDci.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleDci.setDtCREATED(new Date());

            this.persiste(OTFamilleDci);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'association du code DCI à l'article sélectionné");
        }
        return result;
    }

    // fin creation famille dci

    // suppression famille dci
    public boolean deleteFamilleDci(String lg_FAMILLE_DCI_ID) {
        boolean result = false;
        try {
            TFamilleDci OTFamilleDci = this.getOdataManager().getEm().find(TFamilleDci.class, lg_FAMILLE_DCI_ID);
            this.delete(OTFamilleDci);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression");
        }
        return result;
    }
    // fin suppression famille dci

    // mise a jour de famille dci par importation
    public boolean createFamilleDciFromImportation(List<String> lstData) {
        boolean result = false;
        int count = 0;

        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                                                                // differentes colonnes
                if (this.createFamilleDci(tabString[6].trim(), tabString[1].trim())) {
                    count++;
                }
            }

            if (count > 0) {
                if (count == lstData.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildSuccesTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Echec d'importation. Aucune ligne n'a été pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    // fin mise a jour de famille dci par importation

}
