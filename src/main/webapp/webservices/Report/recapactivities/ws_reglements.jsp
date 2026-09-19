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
    // La pagination est FACULTATIVE : appelee sans start ni limit - une edition, un appel direct, un store
    // sans barre de pagination - cette page rendait une erreur 500 (conversion d'une valeur absente), et la
    // grille restait vide sans que rien ne dise pourquoi. On retombe alors sur la premiere page.
    int start = 0, limit = 50;
    try {
        if (request.getParameter("start") != null && !"".equals(request.getParameter("start"))) {
            start = Integer.parseInt(request.getParameter("start"));
        }
        if (request.getParameter("limit") != null && !"".equals(request.getParameter("limit"))) {
            limit = Integer.parseInt(request.getParameter("limit"));
        }
    } catch (NumberFormatException e) {
        start = 0;
        limit = 50;
    }
   // String empl = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();

    JSONArray arrayObj = groupeCtl.recapReglement(false, dt_start, dt_end, search_value, start, limit);
    int count = groupeCtl.recapReglement(dt_start, dt_end, search_value);
    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", count);
%>

<%= data%>