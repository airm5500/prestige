<%-- 
    Document   : ws_zone
    Created on : 29 juin 2017, 00:27:26
    Author     : KKOFFI
--%>


<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TUser"%>

<%@page import="bll.configManagement.GroupeTierspayantController"%>

<%@page import="dal.dataManager"%>

<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>

<%
    dataManager OdataManager = new dataManager();
   
    OdataManager.initEntityManager();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    GroupeTierspayantController groupeCtl = new GroupeTierspayantController(OdataManager.getEmf());
    String search_value = "";

    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    String empl = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    JSONArray arrayObj = groupeCtl.orderData(false, search_value, empl, start, limit);
    int count = groupeCtl.orderData(search_value, empl);
  if(count==0){
      count=1;
      JSONObject json = new JSONObject();
       json.put("lg_FAMILLE_ID", "0");
       json.put("CIP", "0");
        json.put("str_DESCRIPTION", "Ajouter un nouvel article");
        json.put("str_DESCRIPTION_PLUS", "Ajouter un nouvel article");
        arrayObj.put( json);
        
  }
    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", count);
%>

<%= data%>