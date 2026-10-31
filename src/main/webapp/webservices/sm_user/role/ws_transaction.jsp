<%@page import="bll.userManagement.user"%>
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

<%
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();

%>




<%    String str_NAME = "", lg_ROLE_ID = "", str_DESIGNATION = "", str_TYPE = commonparameter.PARAMETER_CUSTOMER;
    if (request.getParameter("str_NAME") != null) {
        str_NAME = request.getParameter("str_NAME");
        new logger().oCategory.info("str_NAME " + str_NAME);
    }
    if (request.getParameter("lg_ROLE_ID") != null) {
        lg_ROLE_ID = request.getParameter("lg_ROLE_ID");
        new logger().oCategory.info("lg_ROLE_ID " + lg_ROLE_ID);
    }
    if (request.getParameter("str_DESIGNATION") != null) {
        str_DESIGNATION = request.getParameter("str_DESIGNATION");
        new logger().oCategory.info("str_DESIGNATION " + str_DESIGNATION);
    }

    if (request.getParameter("str_TYPE") != null && !request.getParameter("str_TYPE").equals("")) {
        str_TYPE = request.getParameter("str_TYPE");
        new logger().oCategory.info("str_TYPE " + str_TYPE);
    }
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
    user Ouser = new user(OdataManager);

    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(OTUser);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);
    new logger().oCategory.info("le mode : " + request.getParameter("mode"));
    new logger().oCategory.info("ID " + request.getParameter("lg_ROLE_ID"));

    /* Faille de droits du 31/10 : plus aucun ecran n'appelle cette page (les profils passent par v1/roles, qui applique
       les regles) ; elle reste appelable directement, donc reservee au super administrateur. */
    if (request.getParameter("mode") != null && !bll.userManagement.user.estSuperAdmin(OTUser)) {
        ObllBase.setDetailmessage("Reserve au super administrateur");
    } else if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").toString().equals("create")) {
            Ouser.createRole(str_NAME, str_DESIGNATION, str_TYPE);
            ObllBase.setMessage(Ouser.getMessage());
            ObllBase.setDetailmessage(Ouser.getDetailmessage());
        } else if (request.getParameter("mode").toString().equals("update")) {

            Ouser.updateRole(lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE);
            ObllBase.setMessage(Ouser.getMessage());
            ObllBase.setDetailmessage(Ouser.getDetailmessage());
        } else if (request.getParameter("mode").toString().equals("delete")) {

            Ouser.deleteRole(lg_ROLE_ID);
            ObllBase.setMessage(Ouser.getMessage());
            ObllBase.setDetailmessage(Ouser.getDetailmessage());
        } else {
        }

    }

    String result;

    if (ObllBase.getMessage()
            .equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";

    } else {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }

    new logger().OCategory.info("JSON " + result);


%>
<%=result%>