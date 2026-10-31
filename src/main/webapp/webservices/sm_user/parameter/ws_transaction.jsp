<%@page import="bll.utils.TparameterManager"%>
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

<%  String str_KEY = "", str_VALUE = "", str_DESCRIPTION = "";
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    date key = new date();


%>




<%
    if (request.getParameter("str_VALUE") != null) {
        str_VALUE = request.getParameter("str_VALUE");
        new logger().oCategory.info("str_VALUE " + str_VALUE);
    }
    if (request.getParameter("str_KEY") != null) {
        str_KEY = request.getParameter("str_KEY");
        new logger().oCategory.info("str_KEY " + str_KEY);
    }
    if (request.getParameter("str_DESCRIPTION") != null) {
        str_DESCRIPTION = request.getParameter("str_DESCRIPTION");
        new logger().oCategory.info("str_DESCRIPTION " + str_DESCRIPTION);
    }
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
    TparameterManager OTparameterManager = new TparameterManager(OdataManager);

    new logger().oCategory.info("le mode : " + request.getParameter("mode"));
    new logger().oCategory.info("ID " + request.getParameter("str_KEY"));

    /* Faille de droits du 31/10 : une session ne suffit plus. Les deux reglages des ecrans de stock (jours de stock,
       mois avant peremption) restent ouverts a qui ouvre ces ecrans ; toute autre cle exige le droit du menu « Gestion
       des parametrages », une cle qui n'est pas de type CUSTOMER l'administrateur, l'acces de depannage le super
       administrateur (memes regles que v1/app-params, que l'ecran des parametres utilise). */
    String refusParametre = null;
    if (!"KEY_DAY_STOCK".equals(str_KEY) && !"KEY_MONTH_PERIME".equals(str_KEY)
            && !bll.userManagement.user.estSuperAdmin(OTUser)) {
        dal.TParameters existantParam = OTparameterManager.getParameter(str_KEY);
        if (!rest.Droits.a(request, util.Constant.P_SM_PARAMETER_MANAGER)) {
            refusParametre = "Droit manquant : Gestion des parametrages";
        } else if ("ACCES_DEPANNAGE_ACTIF".equalsIgnoreCase(str_KEY.trim())) {
            refusParametre = "Reserve au super administrateur";
        } else if (existantParam != null && !commonparameter.PARAMETER_CUSTOMER.equalsIgnoreCase(existantParam.getStrTYPE())
                && !bll.userManagement.user.estAdminOuSuperAdmin(OTUser)) {
            refusParametre = "Parametre reserve a l'administrateur";
        }
    }
    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").toString().equals("create")) {
        } else if (request.getParameter("mode").toString().equals("update") && refusParametre != null) {
            OTparameterManager.setMessage(commonparameter.PROCESS_FAILED);
            OTparameterManager.setDetailmessage(refusParametre);
        } else if (request.getParameter("mode").toString().equals("update")) {

            OTparameterManager.updateParameter(str_KEY, str_VALUE, str_DESCRIPTION);
            // Exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT : si l'un passe a 1, l'autre est force a 0
            String _v = str_VALUE != null ? str_VALUE.trim() : "";
            if ("SEMOIS_ABC".equals(str_KEY) && "1".equals(_v)) {
                dal.TParameters _other = OTparameterManager.getParameter("SEMOIS_PAR_PRODUIT");
                if (_other != null) { OTparameterManager.updateParameter("SEMOIS_PAR_PRODUIT", "0", _other.getStrDESCRIPTION()); }
            } else if ("SEMOIS_PAR_PRODUIT".equals(str_KEY) && "1".equals(_v)) {
                dal.TParameters _other = OTparameterManager.getParameter("SEMOIS_ABC");
                if (_other != null) { OTparameterManager.updateParameter("SEMOIS_ABC", "0", _other.getStrDESCRIPTION()); }
            }

        } else if (request.getParameter("mode").toString().equals("delete")) {

            } else {
        }

    }

    String result;
    if (OTparameterManager.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + OTparameterManager.getMessage() + "\", errors: \"" + OTparameterManager.getDetailmessage() + "\"}";
    } else {
        result = "{success:\"" + OTparameterManager.getMessage() + "\", errors: \"" + OTparameterManager.getDetailmessage() + "\"}";
    }
    new logger().OCategory.info("JSON " + result);
%>
<%=result%>