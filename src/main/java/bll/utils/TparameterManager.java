/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.utils;

import bll.bllDirectBase;
import bll.common.Parameter;
import dal.TParameters;
import dal.TUser;
import dal.dataManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;

import toolkits.utils.logger;

/**
 *
 * @author Administrator
 */
public class TparameterManager extends bllDirectBase {

    public TparameterManager(dataManager odataManager) {
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    public TparameterManager(dataManager odataManager, TUser OTUser) {
        super.setOdataManager(odataManager);
        super.setOTUser(OTUser);
        super.checkDatamanager();
    }

    public TparameterManager() {
    }

    public String getValue(String strKey) {
        String res = "";
        try {
            java.sql.PreparedStatement stmt = oConnection
                    .prepareStatement("select str_Value from t_parameters where str_Key=?");
            stmt.setString(1, strKey);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                res = rs.getString("str_Value");

            }
        } catch (SQLException ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        return res;
    }

    public void addValue(String strKey, String strValue, String strDescription) {
        try {
            java.sql.PreparedStatement stmt = oConnection
                    .prepareStatement("insert into t_parameters(str_Key,str_Value,str_DESCRIPTION) values(?,?,?)");

            stmt.setString(1, strKey);
            stmt.setString(2, strValue);
            stmt.setString(3, strDescription);
            int i = stmt.executeUpdate();
            new logger().OCategory.info("modif param= " + i);
        } catch (SQLException ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
    }

    public void setValue(String strKey, String strValue) {
        try {
            java.sql.PreparedStatement stmt = oConnection
                    .prepareStatement("update t_parameters set str_Value=? where str_Key=?");
            stmt.setString(1, strValue);
            stmt.setString(2, strKey);
            int i = stmt.executeUpdate();
            new logger().OCategory.info("modif param= " + i);
        } catch (SQLException ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
    }

    public boolean updateParameter(String str_KEY, String str_VALUE, String str_DESCRIPTION) {
        boolean result = false;
        try {
            TParameters OTParameters = this.getParameter(str_KEY);
            OTParameters.setStrVALUE(str_VALUE);
            OTParameters.setStrDESCRIPTION(str_DESCRIPTION);
            this.persiste(OTParameters);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du paramétrage");
        }
        return result;
    }

    public TParameters getParameter(String str_KEY) {
        TParameters OTParameters = null;
        new logger().OCategory.info("str_KEY " + str_KEY);

        try {
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, str_KEY);
            // new logger().OCategory.info("Description: " + OTParameters.getStrDESCRIPTION());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Paramètre inexistant");
        }
        return OTParameters;
    }

    // Liste des parametres generaux de l'application
    public List<TParameters> listeParameter(String search_value, String str_TYPE) {
        List<TParameters> lst = new ArrayList<>();
        // privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            /*
             * if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY_ADMIN)) { str_TYPE = "%%";
             * }
             */
            if (str_TYPE.equalsIgnoreCase(commonparameter.PARAMETER_ADMIN)) {
                lst = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TParameters t WHERE (t.strKEY LIKE ?1 OR t.strDESCRIPTION LIKE ?1) AND (t.strTYPE LIKE ?2 OR t.strTYPE LIKE ?4) AND t.strSTATUT = ?3")
                        .setParameter(1, search_value + "%").setParameter(2, str_TYPE)
                        .setParameter(3, commonparameter.statut_enable)
                        .setParameter(4, commonparameter.PARAMETER_CUSTOMER).getResultList();
            } else {
                lst = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TParameters t WHERE (t.strKEY LIKE ?1 OR t.strDESCRIPTION LIKE ?1) AND t.strTYPE LIKE ?2 AND t.strSTATUT = ?3")
                        .setParameter(1, search_value + "%").setParameter(2, str_TYPE)
                        .setParameter(3, commonparameter.statut_enable).getResultList();

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lst size " + lst.size());
        return lst;
    }
    // fin Liste des parametres generaux de l'application

    public boolean createParameter(String str_KEY, String str_VALUE, String str_DESCRIPTION, String str_TYPE) {
        boolean result = false;
        try {
            TParameters OTParameters = this.getParameter(str_KEY);
            OTParameters.setStrVALUE(str_VALUE);
            OTParameters.setStrTYPE(str_TYPE);
            OTParameters.setStrSTATUT(commonparameter.statut_enable);
            OTParameters.setStrDESCRIPTION(str_DESCRIPTION);
            this.persiste(OTParameters);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du paramétrage");
        }
        return result;
    }

    public void updateSpecialMovementDate() {
        TParameters OTParameters = null, OTParametersValue = null;
        Date jour = new Date();
        try {
            OTParameters = this.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            OTParametersValue = this.getParameter(Parameter.KEY_MOVEMENT_FALSE_VALUE);
            if (OTParameters != null && OTParametersValue != null && OTParametersValue.getStrISENKRYPTED() != null) {
                String systemeday = date.formatterShort.format(jour);// compare la date d'aujourd hui à celle dans la bd
                this.getOdataManager().BeginTransaction();
                if (!systemeday.equals(OTParameters.getStrISENKRYPTED())) {
                    OTParametersValue.setStrISENKRYPTED(OTParametersValue.getStrVALUE());
                    OTParametersValue.setDtUPDATED(jour);
                    OTParameters.setDtUPDATED(jour);
                    OTParameters.setStrISENKRYPTED(date.formatterShort.format(new Date()));
                    this.getOdataManager().getEm().merge(OTParametersValue);
                    this.getOdataManager().getEm().merge(OTParameters);
                }
                this.getOdataManager().CloseTransaction();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    // initialisation des jobs de la base de données
    public void setJobOfDatabase() {
        try {
            String qry = "SET GLOBAL event_scheduler = ON; DROP EVENT IF EXISTS `MANAGE_MOUVMENT_PRODUCT`;CREATE EVENT `MANAGE_MOUVMENT_PRODUCT` ON SCHEDULE EVERY 5 MINUTE STARTS CURRENT_TIMESTAMP DO BEGIN CALL proc_update_mouvement_product(); END;DROP EVENT IF EXISTS `MAJ_STOCK_REAPRO`; CREATE EVENT `MAJ_STOCK_REAPRO` ON SCHEDULE EVERY 2 HOUR STARTS CURRENT_TIMESTAMP DO BEGIN call UpdateStockReapro(); END;";
            // this.getOdataManager().getEm().createNativeQuery(qry).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    // fin initialisation des jobs de la base de données

}
