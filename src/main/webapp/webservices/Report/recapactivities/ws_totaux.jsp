<%-- 
    Document   : ws_zone
    Created on : 29 juin 2017, 00:27:26
    Author     : KKOFFI
--%>


<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TUser"%>
<%@page import="dal.TPreenregistrementCompteClientTiersPayent"%>
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

    OdataManager.initEntityManager();
    GroupeTierspayantController groupeCtl = new GroupeTierspayantController(OdataManager.getEmf());
    String dt_start = date.formatterMysqlShort.format(new Date()), dt_end = dt_start;
    String search_value = "";
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    if (request.getParameter("dt_end") != null && !"".equals(request.getParameter("dt_end"))) {
        dt_end = request.getParameter("dt_end");
    }

    if (request.getParameter("dt_start") != null && !"".equals(request.getParameter("dt_start"))) {
        dt_start = request.getParameter("dt_start");
    }
    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    
    String empl = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();

    // Le pied de page doit parler du MEME perimetre que la grille au-dessus, sans quoi les deux se contredisent.
    java.util.List<dal.TPrivilege> lstPrivileges =
            (java.util.List<dal.TPrivilege>) session.getAttribute(util.Constant.USER_LIST_PRIVILEGE);
    boolean toutesActivites = lstPrivileges != null
            && util.DateConverter.hasAuthorityByName(lstPrivileges, util.Constant.P_SHOW_ALL_ACTIVITY);
    JSONArray arrayObj = groupeCtl.creditsAccordeTotax(dt_start, dt_end, search_value, empl, toutesActivites);
    
    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", 1);
%>

<%= data%>