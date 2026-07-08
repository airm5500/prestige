<%@page import="dal.TGrossiste"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="java.math.BigInteger"  %>
<%@page import="bll.configManagement.grossisteManagement"  %>


<% Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();


%>

<%    String lg_GROSSISTE_ID = "", str_LIBELLE = "", str_DESCRIPTION = "",
            str_ADRESSE_RUE_1 = "", str_ADRESSE_RUE_2 = "", str_CODE_POSTAL = "",
            str_BUREAU_DISTRIBUTEUR = "", str_MOBILE = "", str_TELEPHONE = "",
            lg_TYPE_REGLEMENT_ID = "", lg_VILLE_ID = "", str_CODE = "", groupeId = null, idrepartiteur = null,
            str_URL_PHARMAML = null, str_CODE_RECEPTEUR_PHARMA = null, str_ID_RECEPTEUR_PHARMA = null,
            str_OFFICINE_ID = null;

    int int_DELAI_REGLEMENT_AUTORISE = 0, int_DELAI_REAPPROVISIONNEMENT = 0, int_COEF_SECURITY = 0, int_DATE_BUTOIR_ARTICLE = 0;

    double dbl_CHIFFRE_DAFFAIRE = 0.0;

    // lg_GROSSISTE_ID
    if (request.getParameter("lg_GROSSISTE_ID") != null) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
    }
    if (request.getParameter("str_CODE") != null) {
        str_CODE = request.getParameter("str_CODE");
        new logger().OCategory.info("str_CODE:" + str_CODE);
    }
    if (request.getParameter("idrepartiteur") != null) {
        idrepartiteur = request.getParameter("idrepartiteur");
    }
    if (request.getParameter("groupeId") != null) {
        groupeId = request.getParameter("groupeId");
    }
    if (request.getParameter("str_URL_PHARMAML") != null) {
        str_URL_PHARMAML = request.getParameter("str_URL_PHARMAML");
    }
    if (request.getParameter("str_CODE_RECEPTEUR_PHARMA") != null) {
        str_CODE_RECEPTEUR_PHARMA = request.getParameter("str_CODE_RECEPTEUR_PHARMA");
    }
    if (request.getParameter("str_ID_RECEPTEUR_PHARMA") != null) {
        str_ID_RECEPTEUR_PHARMA = request.getParameter("str_ID_RECEPTEUR_PHARMA");
    }
    if (request.getParameter("str_OFFICINE_ID") != null) {
        str_OFFICINE_ID = request.getParameter("str_OFFICINE_ID");
    }

    // str_LIBELLE
    if (request.getParameter("str_LIBELLE") != null) {
        str_LIBELLE = request.getParameter("str_LIBELLE");
    }
    // str_DESCRIPTION
    if (request.getParameter("str_DESCRIPTION") != null) {
        str_DESCRIPTION = request.getParameter("str_DESCRIPTION");
    }
    // str_ADRESSE_RUE_1
    if (request.getParameter("str_ADRESSE_RUE_1") != null) {
        str_ADRESSE_RUE_1 = request.getParameter("str_ADRESSE_RUE_1");
    }
    // str_ADRESSE_RUE_2
    if (request.getParameter("str_ADRESSE_RUE_2") != null) {
        str_ADRESSE_RUE_2 = request.getParameter("str_ADRESSE_RUE_2");
    }
    // str_CODE_POSTAL
    if (request.getParameter("str_CODE_POSTAL") != null) {
        str_CODE_POSTAL = request.getParameter("str_CODE_POSTAL");
    }
    // str_BUREAU_DISTRIBUTEUR
    if (request.getParameter("str_BUREAU_DISTRIBUTEUR") != null) {
        str_BUREAU_DISTRIBUTEUR = request.getParameter("str_BUREAU_DISTRIBUTEUR");
    }
    // str_MOBILE
    if (request.getParameter("str_MOBILE") != null) {
        str_MOBILE = request.getParameter("str_MOBILE");
    }
    // str_TELEPHONE
    if (request.getParameter("str_TELEPHONE") != null) {
        str_TELEPHONE = request.getParameter("str_TELEPHONE");
    }
    // dbl_CHIFFRE_DAFFAIRE
    if (request.getParameter("dbl_CHIFFRE_DAFFAIRE") != null && !request.getParameter("dbl_CHIFFRE_DAFFAIRE").equals("")) {
        dbl_CHIFFRE_DAFFAIRE = Double.parseDouble(request.getParameter("dbl_CHIFFRE_DAFFAIRE"));
    }
    // int_DELAI_REGLEMENT_AUTORISE
    if (request.getParameter("int_DELAI_REGLEMENT_AUTORISE") != null && !request.getParameter("int_DELAI_REGLEMENT_AUTORISE").equals("")) {
        int_DELAI_REGLEMENT_AUTORISE = Integer.parseInt(request.getParameter("int_DELAI_REGLEMENT_AUTORISE"));
    }
    // lg_TYPE_REGLEMENT_ID
    if (request.getParameter("lg_TYPE_REGLEMENT_ID") != null && !request.getParameter("lg_TYPE_REGLEMENT_ID").equals("")) {
        lg_TYPE_REGLEMENT_ID = request.getParameter("lg_TYPE_REGLEMENT_ID");
    }
    // lg_VILLE_ID
    if (request.getParameter("lg_VILLE_ID") != null) {
        lg_VILLE_ID = request.getParameter("lg_VILLE_ID");
    }

    if (request.getParameter("int_DELAI_REAPPROVISIONNEMENT") != null && !request.getParameter("int_DELAI_REAPPROVISIONNEMENT").equalsIgnoreCase("")) {
        int_DELAI_REAPPROVISIONNEMENT = Integer.parseInt(request.getParameter("int_DELAI_REAPPROVISIONNEMENT"));
        new logger().OCategory.info("int_DELAI_REAPPROVISIONNEMENT " + int_DELAI_REAPPROVISIONNEMENT);
    }

    if (request.getParameter("int_COEF_SECURITY") != null && !request.getParameter("int_COEF_SECURITY").equalsIgnoreCase("")) {
        int_COEF_SECURITY = Integer.parseInt(request.getParameter("int_COEF_SECURITY"));
        new logger().OCategory.info("int_COEF_SECURITY " + int_COEF_SECURITY);
    }

    if (request.getParameter("int_DATE_BUTOIR_ARTICLE") != null && !request.getParameter("int_DATE_BUTOIR_ARTICLE").equalsIgnoreCase("")) {
        int_DATE_BUTOIR_ARTICLE = Integer.parseInt(request.getParameter("int_DATE_BUTOIR_ARTICLE"));
        new logger().OCategory.info("int_DATE_BUTOIR_ARTICLE " + int_DATE_BUTOIR_ARTICLE);
    }

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
 TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);

    ObllBase.setDetailmessage("PAS D'ACTION");
    new logger().oCategory.info("le mode : " + request.getParameter("mode"));
    new logger().oCategory.info("ID " + request.getParameter("lg_GROSSISTE_ID"));

    grossisteManagement OgrossisteManagement = new grossisteManagement(OdataManager);

    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").equals("create")) {
            new logger().oCategory.info("Creation");

            OgrossisteManagement.create(str_LIBELLE, str_DESCRIPTION, str_ADRESSE_RUE_1, str_ADRESSE_RUE_2, str_CODE_POSTAL, str_BUREAU_DISTRIBUTEUR, str_MOBILE, str_TELEPHONE, int_DELAI_REGLEMENT_AUTORISE, lg_TYPE_REGLEMENT_ID, lg_VILLE_ID, dbl_CHIFFRE_DAFFAIRE, str_CODE, int_DELAI_REAPPROVISIONNEMENT, int_COEF_SECURITY, int_DATE_BUTOIR_ARTICLE, groupeId,  idrepartiteur, str_URL_PHARMAML, str_CODE_RECEPTEUR_PHARMA, str_ID_RECEPTEUR_PHARMA, str_OFFICINE_ID);
            ObllBase.setMessage(OgrossisteManagement.getMessage());
            ObllBase.setDetailmessage(OgrossisteManagement.getDetailmessage());

        } else if (request.getParameter("mode").equals("update")) {
            OgrossisteManagement.update(lg_GROSSISTE_ID, str_LIBELLE, str_DESCRIPTION, str_ADRESSE_RUE_1, str_ADRESSE_RUE_2, str_CODE_POSTAL, str_BUREAU_DISTRIBUTEUR, str_MOBILE, str_TELEPHONE, int_DELAI_REGLEMENT_AUTORISE, lg_TYPE_REGLEMENT_ID, lg_VILLE_ID, str_CODE, int_DELAI_REAPPROVISIONNEMENT, int_COEF_SECURITY, int_DATE_BUTOIR_ARTICLE, groupeId,  idrepartiteur, str_URL_PHARMAML, str_CODE_RECEPTEUR_PHARMA, str_ID_RECEPTEUR_PHARMA, str_OFFICINE_ID);
            ObllBase.setMessage(OgrossisteManagement.getMessage());
            ObllBase.setDetailmessage(OgrossisteManagement.getDetailmessage());

        } else if (request.getParameter("mode").equals("delete")) {

            //TGrossiste OTGrossiste = null;
            OgrossisteManagement.deleteGrossiste(lg_GROSSISTE_ID);

            ObllBase.setMessage(OgrossisteManagement.getMessage());
            ObllBase.setDetailmessage(OgrossisteManagement.getDetailmessage());

        } else {
        }

    }

    String result;
    if (ObllBase.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";

    } else {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }
    new logger().OCategory.info("JSON " + result);

%>
<%=result%>