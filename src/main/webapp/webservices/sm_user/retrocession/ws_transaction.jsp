<%@page import="bll.retrocessionManagement.RetrocessionManagement"%>
<%@page import="bll.preenregistrement.Preenregistrement"%>
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

<%   String lg_RETROCESSION_ID = "%%", str_REF = "%%", lg_USER_ID = "%%", dt_CREATED = "%%", lg_FAMILLE_ID = "%%",
            lg_NATURE_VENTE_ID = "%%", str_Medecin = "%%";
    Integer int_PRICE_RESUME;
    Integer int_QUANTITY;
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    date key = new date();
    //privilege Oprivilege = new privilege();
    TUser OTUser = null;
    int int_total_vente = 0;

%>




<%
    if (request.getParameter("str_REF") != null) {
        str_REF = request.getParameter("str_REF");
    }
    if (request.getParameter("lg_RETROCESSION_ID") != null) {
        lg_RETROCESSION_ID = request.getParameter("lg_RETROCESSION_ID");
    }

    if (request.getParameter("lg_FAMILLE_ID") != null) {
        lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");

    }

    if (request.getParameter("int_QUANTITY") != null) {
        int_QUANTITY = new Integer(request.getParameter("int_QUANTITY"));

    }

    if (request.getParameter("int_PRICE_RESUME") != null) {
        int_PRICE_RESUME = new Integer(request.getParameter("int_PRICE_RESUME"));
    }

    if (request.getParameter("str_Medecin") != null) {
        str_Medecin = request.getParameter("str_Medecin");
    }

    if (request.getParameter("lg_NATURE_VENTE_ID") != null) {
        lg_NATURE_VENTE_ID = request.getParameter("lg_NATURE_VENTE_ID");
    }

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
OTUser=OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(OTUser);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);

    ObllBase.setDetailmessage("PAS D'ACTION");
    new logger().oCategory.info("le mode : " + request.getParameter("mode"));
    new logger().oCategory.info("ID " + request.getParameter("lg_RETROCESSION_ID"));

    RetrocessionManagement ORetrocessionManagement = new RetrocessionManagement(OdataManager, OTUser);

    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").toString().equals("delete")) {
            new logger().oCategory.info("lg_RETROCESSION_ID " + lg_RETROCESSION_ID);

            ORetrocessionManagement.removeRetrocession(lg_RETROCESSION_ID);
            ObllBase.setDetailmessage(ORetrocessionManagement.getDetailmessage());
            ObllBase.setMessage(ORetrocessionManagement.getMessage());
        }
    } else {
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