/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.userManagement;

import dal.TLanguage;
import dal.TSkin;
import dal.JdbConnexion;
import java.util.Date;
import toolkits.parameters.commonparameter;
import toolkits.security.Md5;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author customer
 */
public class customer extends bll.bllBase {

    // public void createUser(String lg_CUSTOMER_ID, String str_LOGIN, String str_PASSWORD, String str_FIRST_NAME,
    // String str_LAST_NAME, String lg_ROLE_ID, String FUNCTION) {
    // String Str_Password_MD5 = Md5.encode(str_PASSWORD);
    //
    // // TRole OTRole = getOdataManager().getEm().find(TRole.class, lg_ROLE_ID);
    // TSkin OTSkin = getOdataManager().getEm().find(TSkin.class, "3"); //default skin id
    // TLanguage OTLanguage = getOdataManager().getEm().find(TLanguage.class, 1); //default language id id
    //
    // TCustomer OTCustomer = new TCustomer();
    // OTCustomer.setLgCUSTOMERID(lg_CUSTOMER_ID);
    // OTCustomer.setStrLOGIN(str_LOGIN);
    // OTCustomer.setStrLASTNAME(str_LAST_NAME);
    // OTCustomer.setStrFIRSTNAME(str_FIRST_NAME);
    // OTCustomer.setStrPASSWORD(Str_Password_MD5);
    // OTCustomer.setFunction(FUNCTION);
    // OTCustomer.setStrSTATUT(commonparameter.statut_enable);
    // // OTUser.setLgSKINID(OTSkin);
    // OTCustomer.setLgLanguageID(OTLanguage);
    // // OTCustomer.setLgSKINID(OTSkin);
    // // TRoleUser OTRoleUser = new TRoleUser();
    // // OTRoleUser.setLgROLEID(OTRole);
    // // OTRoleUser.setLgUSERID(OTUser);
    // // OTRoleUser.setLgUSERROLEID(new date().gettimeid());
    //
    // getOdataManager().BeginTransaction();
    // getOdataManager().getEm().persist(OTCustomer);
    // // getOdataManager().getEm().persist(OTRoleUser);
    // getOdataManager().CloseTransaction();
    //
    //
    //
    // //creation tcustomer account
    //
    //
    // TCustomerAccount OTCustomerAccount = new TCustomerAccount();
    // OTCustomerAccount.setLgCUSTOMERACCOUNTID(this.getKey().getComplexId());
    // OTCustomerAccount.setDtCREATED(new Date());
    // OTCustomerAccount.setIntSOLDE(0);
    // OTCustomerAccount.setIntSOLDEMINIMAL(0);
    // OTCustomerAccount.setLgCUSTOMERID(OTCustomer);
    // OTCustomerAccount.setStrSTATUT(commonparameter.statut_enable);
    //
    //
    //
    // this.persiste(OTCustomerAccount);
    //
    //
    // JdbConnexion Ojconnexion = new JdbConnexion();
    // Ojconnexion.initConnexion();
    // Ojconnexion.OpenConnexion();
    // this.setOTCustomer(OTCustomer);
    // this.do_event_log(Ojconnexion, commonparameter.statut_is_not_assign, "Creation de customer " +
    // OTCustomer.getStrLOGIN(), jdom.APP_NAME, commonparameter.statut_enable, "t_customer", "customerManagement");
    // this.is_activity(Ojconnexion);
    // Ojconnexion.CloseConnexion();
    //
    // new logger().oCategory.warn("Creation de customer " + OTCustomer.getStrLOGIN() + " ");
    // this.setMessage("Operation Effectuer avec succes");
    // }
    //
    // public void updateUser(String lg_CUSTOMER_ID, String str_LOGIN, String str_PASSWORD, String str_FIRST_NAME,
    // String str_LAST_NAME, Object lg_ROLE_ID, String FUNCTION) {
    // String str_role_customer = "";
    // String Str_Password_MD5 = Md5.encode(str_PASSWORD);
    // TCustomer OTCustomer = null;
    // System.out.println("lg_ROLE_ID " + lg_ROLE_ID);
    //
    //
    // OTCustomer = getOdataManager().getEm().find(TCustomer.class, lg_CUSTOMER_ID);
    //
    // //OTUser.setLgUSERID(lg_USER_ID);
    // OTCustomer.setStrLOGIN(str_LOGIN);
    // OTCustomer.setStrLASTNAME(str_LAST_NAME);
    // OTCustomer.setStrFIRSTNAME(str_FIRST_NAME);
    // OTCustomer.setStrPASSWORD(Str_Password_MD5);
    // OTCustomer.setFunction(FUNCTION);
    //
    // getOdataManager().BeginTransaction();
    // getOdataManager().getEm().persist(OTCustomer);
    // getOdataManager().CloseTransaction();
    //
    //
    // this.setOTCustomer(OTCustomer);
    // JdbConnexion Ojconnexion = new JdbConnexion();
    // Ojconnexion.initConnexion();
    // Ojconnexion.OpenConnexion();
    // this.do_event_log(Ojconnexion, commonparameter.statut_is_not_assign, "Update de customer " +
    // OTCustomer.getStrLOGIN(), jdom.APP_NAME, commonparameter.statut_enable, "t_customer", "customerManagement");
    // this.is_activity(Ojconnexion);
    // Ojconnexion.CloseConnexion();
    //
    // new logger().oCategory.warn(" Update de customer " + OTCustomer.getStrLOGIN() + " ");
    // this.setMessage("Operation Effectuer avec succes");
    // }
    //
    // public void isconnected(TCustomer OTCustomer) {
    // OTCustomer.setStrLASTCONNECTIONDATE(new Date());
    // getOdataManager().BeginTransaction();
    // getOdataManager().getEm().persist(OTCustomer);
    // getOdataManager().CloseTransaction();
    // new logger().oCategory.warn("L'utilisateur " + OTCustomer.getStrLOGIN() + " ");
    // this.setMessage("Operation Effectuer avec succes");
    // }
    //
    // public Boolean ChangeStatus(String lg_CUSTOMER_ID, String Str_Statut) {
    // try {
    // TCustomer OTCustomer = this.getOdataManager().getEm().find(TCustomer.class, lg_CUSTOMER_ID);
    // OTCustomer.setStrSTATUT(Str_Statut);
    // getOdataManager().BeginTransaction();
    // getOdataManager().getEm().persist(OTCustomer);
    // getOdataManager().CloseTransaction();
    // new logger().oCategory.warn("le satut de L'utilisateur " + OTCustomer.getStrLOGIN() + " a ete modifier ");
    // this.setMessage("Operation Effectuer avec succes");
    // this.setDetailmessage("Operation Effectuer avec succes");
    // } catch (Exception ex) {
    // new logger().OCategory.error(ex.getMessage());
    // this.setDetailmessage(ex.getMessage());
    // this.setMessage("Impossible de modifier le statut");
    // }
    //
    // return false;
    // }
}
