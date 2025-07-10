<%-- 
    Document   : ws_zone
    Created on : 29 juin 2017, 00:27:26
    Author     : KKOFFI
--%>


<%@page import="org.apache.commons.lang3.StringUtils"%>
<%@page import="dal.TPrivilege"%>
<%@page import="dal.TEmplacement"%>
<%@page import="bll.configManagement.familleManagement"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TUser"%>
<%@page import="java.util.Date"%>
<%@page import="toolkits.utils.date"%>
<%@page import="dal.dataManager"%>
<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>
<%@page import="java.util.ArrayList"%>
<%@page import="java.util.List"%>

<%
    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    familleManagement OfamilleManagement = new familleManagement(OdataManager, user);
    OfamilleManagement.setUsersPrivileges((List<TPrivilege>) session.getAttribute(commonparameter.USER_LIST_PRIVILEGE));
    String search_value = "";
    String lg_DCI_ID = "",
            str_TYPE_TRANSACTION = "";
    String produitId = request.getParameter("produitId");
    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    if (request.getParameter("str_TYPE_TRANSACTION") != null && !request.getParameter("str_TYPE_TRANSACTION").equals("")) {
        str_TYPE_TRANSACTION = request.getParameter("str_TYPE_TRANSACTION");
    }
    if (request.getParameter("lg_DCI_ID") != null && !request.getParameter("lg_DCI_ID").equals("")) {
        lg_DCI_ID = request.getParameter("lg_DCI_ID");
    }
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    TEmplacement empl = OTUser.getLgEMPLACEMENTID(); 
    JSONArray arrayObj = OfamilleManagement.getAllArticle(produitId, search_value, lg_DCI_ID, empl, str_TYPE_TRANSACTION, false, limit, start);
    int count = OfamilleManagement.allCount(produitId, search_value, lg_DCI_ID, str_TYPE_TRANSACTION, empl);
    JSONObject data = new JSONObject();
    data.put("results", arrayObj);
    data.put("total", count);
%>

<%= data%>