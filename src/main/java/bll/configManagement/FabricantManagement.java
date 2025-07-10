package bll.configManagement;

import bll.bllBase;
import dal.TFabriquant;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class FabricantManagement extends bllBase {

    Object Otable = TFabriquant.class;

    public FabricantManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public boolean create(String str_CODE, String str_NAME, String str_DESCRIPTION, String str_ADRESSE,
            String str_TELEPHONE) {
        boolean result = false;
        try {

            TFabriquant OTFabriquant = new TFabriquant();
            OTFabriquant.setLgFABRIQUANTID(this.getKey().getComplexId());
            OTFabriquant.setStrCODE(str_CODE);
            OTFabriquant.setStrNAME(str_NAME);
            OTFabriquant.setStrDESCRIPTION(str_DESCRIPTION);
            OTFabriquant.setStrADRESSE(str_ADRESSE);
            OTFabriquant.setStrTELEPHONE(str_TELEPHONE);
            OTFabriquant.setStrSTATUT(commonparameter.statut_enable);
            OTFabriquant.setDtCREATED(new Date());

            if (this.persiste(OTFabriquant)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de création du fabriquant");
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de création du fabriquant");
        }
        return result;
    }

    public boolean update(String lg_FABRIQUANT_ID, String str_CODE, String str_NAME, String str_DESCRIPTION,
            String str_ADRESSE, String str_TELEPHONE) {
        boolean result = false;
        TFabriquant OTFabriquant = null;
        try {
            OTFabriquant = this.getTFabriquant(lg_FABRIQUANT_ID);
            OTFabriquant.setStrCODE(str_CODE);
            OTFabriquant.setStrNAME(str_NAME);
            OTFabriquant.setStrDESCRIPTION(str_DESCRIPTION);
            OTFabriquant.setStrADRESSE(str_ADRESSE);
            OTFabriquant.setStrTELEPHONE(str_TELEPHONE);
            OTFabriquant.setDtUPDATED(new Date());

            if (this.persiste(OTFabriquant)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du fabriquant");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du fabriquant");
        }
        return result;
    }

    // liste des fabriquants
    public List<TFabriquant> getListeTFabriquant(String search_value, String lg_FABRIQUANT_ID) {
        List<TFabriquant> lstTFabriquant = new ArrayList<TFabriquant>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTFabriquant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFabriquant t WHERE t.lgFABRIQUANTID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?2 OR t.strCODE LIKE ?2) AND t.strSTATUT LIKE ?3 ORDER BY t.strDESCRIPTION ASC")
                    .setParameter(1, lg_FABRIQUANT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFabriquant taille " + lstTFabriquant.size());
        return lstTFabriquant;
    }
    // fin liste des fabriquants

    // exportation des clients
    public String generateEnteteForFile() {
        return "CODE;NOM;ADRESSE;TELEPHONE";
    }

    public List<String> generateDataToExport() {
        List<String> lst = new ArrayList<>();
        List<TFabriquant> lstTFabriquant;
        String row = "";

        try {
            lstTFabriquant = this.getListeTFabriquant("", "%%");
            for (TFabriquant OTFabriquant : lstTFabriquant) {
                row += OTFabriquant.getStrCODE() + ";" + OTFabriquant.getStrDESCRIPTION() + ";";
                row += (OTFabriquant.getStrADRESSE() != null ? OTFabriquant.getStrADRESSE() : " ") + ";";
                row += (OTFabriquant.getStrTELEPHONE() != null ? OTFabriquant.getStrTELEPHONE() : " ") + ";";

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
    // recuperation d'un fabriquant
    public TFabriquant getTFabriquant(String search_value) {
        TFabriquant OTFabriquant = null;
        try {
            OTFabriquant = (TFabriquant) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFabriquant t WHERE t.lgFABRIQUANTID = ?1 OR t.strCODE = ?1 OR t.strNAME = ?1 OR t.strDESCRIPTION = ?1")
                    .setParameter(1, search_value).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFabriquant;
    }
    // fin recuperation d'un fabriquant

    // suppression d'un fabriquant
    public boolean deleteFabriquant(String lg_FABRIQUANT_ID) {
        boolean result = false;
        try {
            TFabriquant OTFabriquant = this.getTFabriquant(lg_FABRIQUANT_ID);
            if (this.delete(OTFabriquant)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage(
                        "Impossible de supprimer un frabriquant qui est déjà rattaché à un article");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du fabriquant");
        }
        return result;
    }
    // fin suppression d'un fabriquant
}
