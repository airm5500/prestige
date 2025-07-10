/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package bll.userManagement;

import bll.bllBase;

import dal.JdbConnexion;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.List;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class institution extends bllBase {

    // private TCustomer oTCustomer;
    //
    // public institution() {
    // }
    //
    // public void loadCustomer(TCustomer oTCustomer) {
    // this.setOTCustomer(oTCustomer);
    // }
    //
    //
    //
    //
    //
    // public List<TInstitutions> GetAllInstitutionAuthorize_To_Customer(String lg_CUSTOMER_ID) {
    //
    // List<TInstitutions> LstTInstitutions = new ArrayList<TInstitutions>();
    // try {
    // JdbConnexion Ojconnexion = new JdbConnexion();
    // Ojconnexion.initConnexion();
    // Ojconnexion.OpenConnexion();
    // String qry = "SELECT lg_INSTITUTION_ID,str_STATUT,str_NAME FROM t_institutions WHERE
    // t_institutions.lg_INSTITUTION_ID IN (SELECT t_customer_institutions.lg_INSTITUTION_ID FROM
    // t_customer_institutions WHERE t_customer_institutions.lg_CUSTOMER_ID LIKE '" + lg_CUSTOMER_ID + "') ORDER BY
    // str_NAME";
    // new logger().OCategory.info(qry);
    // Ojconnexion.set_Request(qry);
    // ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
    // while (Ojconnexion.get_resultat().next()) {
    // TInstitutions OTInstitutions= new TInstitutions();
    // OTInstitutions.setLgINSTITUTIONID(Ojconnexion.get_resultat().getString("lg_INSTITUTION_ID"));
    // OTInstitutions.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
    // OTInstitutions.setStrSTATUT(Ojconnexion.get_resultat().getString("str_STATUT"));
    // LstTInstitutions.add(OTInstitutions);
    // }
    // Ojconnexion.CloseConnexion();
    // } catch (Exception ex) {
    // new logger().OCategory.fatal(ex.getMessage());
    // }
    //
    // return LstTInstitutions;
    // }
    //
    //
    // public List<TInstitutions> GetAllInstitutionUnAuthorize_To_Customer(String lg_CUSTOMER_ID) {
    //
    // List<TInstitutions> LstTInstitutions = new ArrayList<TInstitutions>();
    // try {
    // JdbConnexion Ojconnexion = new JdbConnexion();
    // Ojconnexion.initConnexion();
    // Ojconnexion.OpenConnexion();
    // String qry = "SELECT lg_INSTITUTION_ID,str_STATUT,str_NAME FROM t_institutions WHERE
    // t_institutions.lg_INSTITUTION_ID NOT IN (SELECT t_customer_institutions.lg_INSTITUTION_ID FROM
    // t_customer_institutions WHERE t_customer_institutions.lg_CUSTOMER_ID LIKE '" + lg_CUSTOMER_ID + "') ORDER BY
    // str_NAME";
    // new logger().OCategory.info(qry);
    // Ojconnexion.set_Request(qry);
    // ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
    // while (Ojconnexion.get_resultat().next()) {
    // TInstitutions OTInstitutions= new TInstitutions();
    // OTInstitutions.setLgINSTITUTIONID(Ojconnexion.get_resultat().getString("lg_INSTITUTION_ID"));
    // OTInstitutions.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
    // OTInstitutions.setStrSTATUT(Ojconnexion.get_resultat().getString("str_STATUT"));
    // LstTInstitutions.add(OTInstitutions);
    // }
    // Ojconnexion.CloseConnexion();
    // } catch (Exception ex) {
    // new logger().OCategory.fatal(ex.getMessage());
    // }
    //
    // return LstTInstitutions;
    // }
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    // public TCustomer getOTCustomer() {
    // return oTCustomer;
    // }
    //
    // /**
    // * @param oTUser the oTUser to set
    // */
    // public void setOTCustomer(TCustomer oTCustomer) {
    // this.oTCustomer = oTCustomer;
    // }
}
