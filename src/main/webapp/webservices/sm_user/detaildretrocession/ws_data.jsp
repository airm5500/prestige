<%@page import="toolkits.utils.jdom"%>
<%@page import="bll.retrocessionManagement.RetrocessionDetailManagement"%>
<%@page import="dal.TRetrocessionDetail"%>
<%@page import="dal.TRetrocessionDetail"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TRoleUser"  %>
<%@page import="bll.userManagement.user"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="toolkits.web.json"  %>
<%@page import=" org.json.JSONObject"  %>
<%@page import="org.json.JSONArray"  %>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.TUser"  %>
<%@page import="java.text.SimpleDateFormat"  %>

<jsp:useBean id="Os_Search_poste" class="services.Search"  scope="session"/>
<jsp:useBean id="Os_Search_poste_data" class="services.ShowDataBean" scope="session" />


<%
    dataManager OdataManager = new dataManager();
    List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<>();
    JSONArray arrayObj = new JSONArray();
    JSONObject json = null;
%>



<%    String lg_RETROCESSION_ID = "", search_value = "", str_STATUT = commonparameter.statut_enable;
    int start = 0, limit = jdom.int_size_pagination, total = 0;

    if (request.getParameter("start") != null) {
        start = Integer.parseInt(request.getParameter("start"));
        new logger().OCategory.info("start " + start);
    }

    if (request.getParameter("limit") != null) {
        limit = Integer.parseInt(request.getParameter("limit"));
        new logger().OCategory.info("limit " + limit);
    }

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value :" + search_value);
    }

    if (request.getParameter("str_STATUT") != null) {
        str_STATUT = request.getParameter("str_STATUT");
        new logger().OCategory.info("str_STATUT :" + str_STATUT);
    }

    if (request.getParameter("lg_RETROCESSION_ID") != null) {
        lg_RETROCESSION_ID = request.getParameter("lg_RETROCESSION_ID");
        new logger().OCategory.info("lg_RETROCESSION_ID :" + lg_RETROCESSION_ID);
    }

    OdataManager.initEntityManager();
    RetrocessionDetailManagement ORetrocessionDetailManagement = new RetrocessionDetailManagement(OdataManager);
    lstTRetrocessionDetail = ORetrocessionDetailManagement.showOneOrAllRetrocessionDetailByRetrocession(search_value, lg_RETROCESSION_ID, str_STATUT, start, limit);
    total = ORetrocessionDetailManagement.showOneOrAllRetrocessionDetailByRetrocession(search_value, lg_RETROCESSION_ID, str_STATUT).size();
%>

<%
    
    for(int i = 0; i < (lstTRetrocessionDetail.size() < limit ? lstTRetrocessionDetail.size() : limit); i++) {
        json = new JSONObject();
        json.put("lg_RETROCESSIONDETAIL_ID", lstTRetrocessionDetail.get(i).getLgRETROCESSIONDETAILID());
        json.put("lg_RETROCESSION_ID", lstTRetrocessionDetail.get(i).getLgRETROCESSIONID().getLgRETROCESSIONID());
        json.put("int_CIP", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getIntCIP());
        json.put("lg_FAMILLE_ID", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getLgFAMILLEID());
        json.put("int_FAMILLE_PRICE", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getIntPRICE());
        json.put("str_FAMILLE_NAME", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getStrDESCRIPTION());
        json.put("int_QUANTITY", lstTRetrocessionDetail.get(i).getIntQtefacture());
        json.put("int_REMISE_DETAIL", lstTRetrocessionDetail.get(i).getIntREMISE());
        json.put("int_S", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getIntS());
        json.put("int_T", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getIntT());
        json.put("int_PRICE_DETAIL", lstTRetrocessionDetail.get(i).getIntPRICE() * lstTRetrocessionDetail.get(i).getIntQtefacture());
        json.put("int_PAF", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getIntPAF());
        json.put("int_PAT", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getIntPAT());
        json.put("int_EAN13", lstTRetrocessionDetail.get(i).getLgFAMILLEID().getIntEAN13());
        //json.put("dt_CREATED", date.DateToString(lstTRetrocessionDetail.get(i).getDtCREATED(), key.formatterMysql));
        json.put("str_STATUT", lstTRetrocessionDetail.get(i).getStrSTATUT());
        json.put("str_REF", lstTRetrocessionDetail.get(i).getLgRETROCESSIONID().getStrREFERENCE());

        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + lstTRetrocessionDetail.size() + " \",\"results\":" + arrayObj.toString() + "})";


%>

<%= result%>
