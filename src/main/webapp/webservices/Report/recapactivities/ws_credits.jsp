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
    String empl = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    // Perimetre : l'emplacement de l'operateur, SAUF s'il a le privilege « voir toutes les activites ». C'est la
    // regle deja appliquee par l'etat des ventes annulees et par la balance ; une officine qui saisit des ventes de
    // depot sous d'autres emplacements ne doit pas voir ces credits disparaitre de son recapitulatif.
    java.util.List<dal.TPrivilege> lstPrivileges =
            (java.util.List<dal.TPrivilege>) session.getAttribute(util.Constant.USER_LIST_PRIVILEGE);
    boolean toutesActivites = lstPrivileges != null
            && util.DateConverter.hasAuthorityByName(lstPrivileges, util.Constant.P_SHOW_ALL_ACTIVITY);

    JSONArray arrayObj = groupeCtl.creditsAccorde(false, dt_start, dt_end, search_value, empl, start, limit,
            toutesActivites);
    int count = groupeCtl.creditsAccorde(dt_start, dt_end, search_value, empl, toutesActivites);
    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", count);
%>

<%= data%>