<%-- 
    Document   : ws_zone
    Created on : 29 juin 2017, 00:27:26
    Author     : KKOFFI
--%>


<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TGroupeTierspayant"%>
<%@page import="bll.configManagement.GroupeTierspayantController"%>

<%@page import="java.util.Date"%>
<%@page import="toolkits.utils.date"%>

<%@page import="dal.dataManager"%>


<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>

<%@page import="java.util.ArrayList"%>

<%@page import="java.util.List"%>

<%
    dataManager OdataManager = new dataManager();
    int lg_GROUPE_ID = -1;
    OdataManager.initEntityManager();
    GroupeTierspayantController groupeCtl = new GroupeTierspayantController(OdataManager.getEmf());
    String search_value = "";
    if (request.getParameter("lg_GROUPE_ID") != null && !"".equals(request.getParameter("lg_GROUPE_ID"))) {
        lg_GROUPE_ID =  Integer.valueOf(request.getParameter("lg_GROUPE_ID"));
    }
    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    String lg_TYPE_TIERS_PAYANT_ID=""; 
    
    if (request.getParameter("lg_TYPE_TIERS_PAYANT_ID") != null && !"".equals(request.getParameter("lg_TYPE_TIERS_PAYANT_ID"))) {
        search_value = request.getParameter("lg_TYPE_TIERS_PAYANT_ID");
    }
    
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    JSONArray arrayObj = new JSONArray();
    List<TTiersPayant> lis = groupeCtl.findTierspayant(false, search_value, lg_TYPE_TIERS_PAYANT_ID, lg_GROUPE_ID, start, limit);
    int count = groupeCtl.findTierspayantCount( search_value,lg_TYPE_TIERS_PAYANT_ID,lg_GROUPE_ID);
    for (TTiersPayant obj : lis) {
        JSONObject json = new JSONObject();
        json.put("lg_TIERS_PAYANT_ID", obj.getLgTIERSPAYANTID());
        json.put("str_FULLNAME", obj.getStrFULLNAME());
       
        arrayObj.put(json);

    }

    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", count);
%>

<%= data%>