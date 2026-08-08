/*
 * jdom.java
 *
 * Created on 08 October 2008, 10:11
 *
 * To change this template, choose Tools | Template Manager
 * and open the template in the editor.
 */
package toolkits.utils;

import java.io.*;
import org.jdom.*;
import org.jdom.input.*;
import java.util.List;
import java.util.Iterator;
import toolkits.security.Cryptages;

/**
 *
 * @author Administrator
 */
public class jdom {

    static org.jdom.Document document;
    static Element racine;

    public static String path_export_txt = "";
    public static String path_export_csv = "";
    public static String config_target = "";
    public static String ars_database_name = "";
    public static String ars_database_user_name = "";
    public static String ars_database_user_password = "";
    public static String ars_database_host = "";
    public static String name_sql_server = "";
    public static String user_sql_server = "";
    public static String password_sql_server = "";
    public static String host_sql_server = "";
    public static String url_Pretups_request = "";
    public static String url_topup = "";
    public static String AuthenticationService_ressource_wsdl = "";
    public static String SessionService_ressource_wsdl = "";
    public static String TransactionService_ressource_wsdl = "";
    public static String ars_database_port = "0";
    public static String topup_ressource_wsdl = "";
    public static String scr_report_file = "";
    public static String scr_report_pdf = "";
    public static String scr_report_xls = "";
    public static String path_file_generate_relatif = "";
    public static String path_file_generate_absolute = "";
    public static String path_file_generate_relatif_imported = "";
    public static String path_file_generate_absolute_imported = "";
    public static int int_size_pagination = 10;
    public static int intsizepagination = 20;
    public static String ORANGE_FILE_SEPERATOR = ",";
    public static String log_file = "";
    public static String APP_RELOAD_ALL = "0";
    public static String username_mail = "";
    public static String password_mail = "";
    public static String CUSTOMER = "";
    public static String database_type = "";
    public static String SID = "";
    public static String clickatell_IP = "3055579";
    public static String clickatell_phone_number = "99900125";
    public static String clickatell_User = "Soft-Tech";
    public static String clickatell_Password = "softtech1";
    public static String APP_NAME = "prestige";
    public static String com_port_displayer = "COM7";
    public static String APP_VERSION = "prestige2";
    public static int sms_size = 160;
    public static int notification_counter_expiration = 6;
    public static int notification_counter_resend = 6;
    public static String j2me_dest_port = "";
    public static String test_phone_number = "";
    public static String modem_phone_number = "";
    public static String modem_port = "";
    public static String kannel_ip = "";
    public static String kannel_port = "";
    public static String kannel_user = "";
    public static String kannel_pwd = "";
    public static String path_pari_file = "";
    public static String pmuc_account_number = "+23776043537";
    public static String paris_sms_service_number = "";
    public static int kannel_default_port = 0;
    public static String Parisservices_WSDL = "";
    public static String DEFAULT_SEPARATEUR = "-";
    public static String PAYTUS_SEPARATEUR = "@";
    public static String paytus_ressource_wsdl = "-";
    public static String orange_money_ressource_wsdl = "-";
    public static String paris_portal_link = "";
    public static String ce_files_folder = "";
    public static int nb_Max_in_Pool = 25;
    public static String BREAKER_SEPARATOR = "#";
    public static int BREAKER_PORT = 9632;
    public static String BREAKER_HOST = "localhost";
    public static String cp_files_folder = "";
    public static String scr_report_file_logo = "";
    public static String mail_account = "";
    public static String mail_password = "";
    public static String smtp_server = "";
    public static String paris_portal_backend_link = "";
    public static String path_of_config = "";
    public static String path_photo_absolute = "";
    public static String path_photo_relatif = "";
    public static String temp_folder = "";
    public static String barecode_file = "";
    public static String path_SVG_absolute = "";
    public static String GetColorBI_link_webservice = "";
    public static String GetColorBI_link_webserviceeducnat = "";
    public static String Type_bloc_groupe = "";
    public static String Type_bloc_simple = "";
    public static String sms_gateway_outbound = "";
    public static String Path_export = "";
    public static String path_pharmaml_client = "";
    public static String path_injecteur = "";
    public static String path_commande = "";
    public static String pharmaml_message;
     public static String pharmaml_reponse;

    public static void InitRessource() {

        SAXBuilder sxb = new SAXBuilder();
        try {
            path_of_config = "/home/prestige2/Documents/CONF/LABOREX/CONF/config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception ex) {
        }
        try {
            path_of_config = "C://CONF//LABOREX//CONF//config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }
        try {
            path_of_config = "C://CONF//CONF//config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }

        try {
            path_of_config = "D://CONF//LABOREX//CONF//config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }

        try {
            path_of_config = "E://CONF//LABOREX//CONF//config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }
        try {
            path_of_config = "G://CONF//LABOREX//CONF//config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }
        try {
            path_of_config = "H://CONF//LABOREX//CONF//config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }

        try {
            path_of_config = "I://CONF//LABOREX//CONF//config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }

        try {
            path_of_config = "/root/CONF/LABOREX/CONF/config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();

            return;
        } catch (Exception ex) {
        }
        try {
            path_of_config = "/home/set_user/CONF/LABOREX/CONF/config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();

            return;
        } catch (Exception ex) {
        }

        try {
            path_of_config = "/opt/CONF/LABOREX/CONF/config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception ex) {
        }

        try {
            path_of_config = "/home/administrator/CONF/LABOREX/CONF/config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception ex) {
        }

        try {
            path_of_config = "/home/prestige2/CONF/LABOREX/CONF/config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();

            return;
        } catch (Exception ex) {
        }

        try {
            path_of_config = "/var/prestige2/CONF/LABOREX/CONF/config_laborex_v1.xml";
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();

            return;
        } catch (Exception ex) {
        }


    }

    public static void LoadRessource() {
        Cryptages ocryptage = new Cryptages();

        List listars = racine.getChildren("config");

        Iterator i = listars.iterator();
        while (i.hasNext()) {
            Element courant = (Element) i.next();
            jdom.path_file_generate_absolute_imported = ocryptage.decryptage(courant.getChild("path_file_generate_absolute_imported").getText());
            jdom.path_file_generate_relatif_imported = ocryptage.decryptage(courant.getChild("path_file_generate_relatif_imported").getText());
            jdom.path_file_generate_absolute = ocryptage.decryptage(courant.getChild("path_file_generate_absolute").getText());
            jdom.path_file_generate_relatif = ocryptage.decryptage(courant.getChild("path_file_generate_relatif").getText());
            jdom.scr_report_file = ocryptage.decryptage(courant.getChild("scr_report_file").getText());
            jdom.scr_report_pdf = ocryptage.decryptage(courant.getChild("scr_report_pdf").getText());
            jdom.scr_report_xls = ocryptage.decryptage(courant.getChild("scr_report_xls").getText());
            jdom.ars_database_name = ocryptage.decryptage(courant.getChild("name").getText());
            jdom.topup_ressource_wsdl = ocryptage.decryptage(courant.getChild("topup_ressource_wsdl").getText());
            jdom.ars_database_user_password = ocryptage.decryptage(courant.getChild("password").getText());
            jdom.ars_database_host = ocryptage.decryptage(courant.getChild("host").getText());
            jdom.ars_database_user_name = ocryptage.decryptage(courant.getChild("user").getText());
            jdom.ars_database_port = ocryptage.decryptage(courant.getChild("port").getText());
            jdom.name_sql_server = ocryptage.decryptage(courant.getChild("name_sql_server").getText());
            jdom.user_sql_server = ocryptage.decryptage(courant.getChild("user_sql_server").getText());
            jdom.host_sql_server = ocryptage.decryptage(courant.getChild("host_sql_server").getText());
            jdom.database_type = ocryptage.decryptage(courant.getChild("database_type").getText());
            jdom.password_sql_server = ocryptage.decryptage(courant.getChild("password_sql_server").getText());
            jdom.int_size_pagination = Integer.parseInt(courant.getChild("int_size_pagination").getText());
            jdom.ORANGE_FILE_SEPERATOR = ocryptage.decryptage(courant.getChild("ORANGE_FILE_SEPERATOR").getText());
            jdom.log_file = ocryptage.decryptage(courant.getChild("log_file").getText());
            jdom.APP_NAME = ocryptage.decryptage(courant.getChild("APP_NAME").getText());
            jdom.com_port_displayer = ocryptage.decryptage(courant.getChild("com_port_displayer").getText());
            jdom.APP_VERSION = ocryptage.decryptage(courant.getChild("APP_VERSION").getText());
            jdom.test_phone_number = ocryptage.decryptage(courant.getChild("test_phone_number").getText());
            jdom.j2me_dest_port = ocryptage.decryptage(courant.getChild("j2me_dest_port").getText());
            jdom.modem_phone_number = ocryptage.decryptage(courant.getChild("j2me_dest_port").getText());
            jdom.modem_port = ocryptage.decryptage(courant.getChild("modem_port").getText());
            jdom.kannel_user = ocryptage.decryptage(courant.getChild("kannel_user").getText());
            jdom.kannel_port = ocryptage.decryptage(courant.getChild("kannel_port").getText());
            jdom.kannel_pwd = ocryptage.decryptage(courant.getChild("kannel_pwd").getText());
            jdom.kannel_ip = ocryptage.decryptage(courant.getChild("kannel_ip").getText());
            jdom.kannel_default_port = new Integer(courant.getChild("kannel_default_port").getText());
            jdom.path_pari_file = ocryptage.decryptage(courant.getChild("path_pari_file").getText());
            jdom.pmuc_account_number = ocryptage.decryptage(courant.getChild("pmuc_account_number").getText());
            jdom.AuthenticationService_ressource_wsdl = ocryptage.decryptage(courant.getChild("AuthenticationService_ressource_wsdl").getText());
            jdom.SessionService_ressource_wsdl = ocryptage.decryptage(courant.getChild("SessionService_ressource_wsdl").getText());
            jdom.TransactionService_ressource_wsdl = ocryptage.decryptage(courant.getChild("TransactionService_ressource_wsdl").getText());
            jdom.paris_sms_service_number = ocryptage.decryptage(courant.getChild("paris_sms_service_number").getText());
            jdom.Parisservices_WSDL = ocryptage.decryptage(courant.getChild("Parisservices_WSDL").getText());
            jdom.orange_money_ressource_wsdl = ocryptage.decryptage(courant.getChild("orange_money_ressource_wsdl").getText());
            jdom.DEFAULT_SEPARATEUR = ocryptage.decryptage(courant.getChild("DEFAULT_SEPARATEUR").getText());
            jdom.PAYTUS_SEPARATEUR = ocryptage.decryptage(courant.getChild("PAYTUS_SEPARATEUR").getText());
            jdom.paytus_ressource_wsdl = ocryptage.decryptage(courant.getChild("paytus_ressource_wsdl").getText());
            jdom.paris_portal_link = ocryptage.decryptage(courant.getChild("paris_portal_link").getText());
            jdom.ce_files_folder = ocryptage.decryptage(courant.getChild("ce_files_folder").getText());
            jdom.cp_files_folder = ocryptage.decryptage(courant.getChild("cp_files_folder").getText());
//            jdom.BREAKER_PORT = Integer.parseInt(ocryptage.decryptage(courant.getChild("BREAKER_PORT").getText()));
//            jdom.BREAKER_SEPARATOR = ocryptage.decryptage(courant.getChild("BREAKER_SEPARATOR").getText());
            jdom.BREAKER_HOST = ocryptage.decryptage(courant.getChild("BREAKER_HOST").getText());
            jdom.scr_report_file_logo = ocryptage.decryptage(courant.getChild("scr_report_file_logo").getText());
            jdom.mail_account = ocryptage.decryptage(courant.getChild("mail_account").getText());
            jdom.mail_password = ocryptage.decryptage(courant.getChild("mail_password").getText());
            jdom.smtp_server = ocryptage.decryptage(courant.getChild("smtp_server").getText());
            jdom.path_photo_absolute = ocryptage.decryptage(courant.getChild("path_photo_absolute").getText());
            jdom.path_photo_relatif = ocryptage.decryptage(courant.getChild("path_photo_relatif").getText());
            jdom.temp_folder = ocryptage.decryptage(courant.getChild("temp_folder").getText());
            jdom.paris_portal_backend_link = ocryptage.decryptage(courant.getChild("paris_portal_backend_link").getText());
            jdom.barecode_file = ocryptage.decryptage(courant.getChild("barecode_file").getText());
            jdom.path_SVG_absolute = ocryptage.decryptage(courant.getChild("path_SVG_absolute").getText());
            jdom.GetColorBI_link_webservice = ocryptage.decryptage(courant.getChild("GetColorBI_link_webservice").getText());
            jdom.Type_bloc_groupe = ocryptage.decryptage(courant.getChild("Type_bloc_groupe").getText());
            jdom.Type_bloc_simple = ocryptage.decryptage(courant.getChild("Type_bloc_simple").getText());
            jdom.sms_gateway_outbound = ocryptage.decryptage(courant.getChild("sms_gateway_outbound").getText());
            jdom.path_pharmaml_client = ocryptage.decryptage(courant.getChild("path_pharmaml_client").getText());
            jdom.path_injecteur = ocryptage.decryptage(courant.getChild("path_injecteur").getText());
            jdom.path_export_txt = ocryptage.decryptage(courant.getChild("path_export_txt").getText());
            jdom.path_export_csv = ocryptage.decryptage(courant.getChild("path_export_csv").getText());
            jdom.Path_export = ocryptage.decryptage(courant.getChild("path_file_generate_absolute_exported").getText());
            try {
                 jdom.pharmaml_message = ocryptage.decryptage(courant.getChild("pharmaml_message").getText());
                   jdom.pharmaml_reponse = ocryptage.decryptage(courant.getChild("pharmaml_reponse").getText());
            } catch (Exception e) {
            }
//             jdom.path_commande = ocryptage.decryptage(courant.getChild("path_commande").getText());

        }
    }
}
