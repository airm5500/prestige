<%-- 
    Document   : ws_zone
    Created on : 29 juin 2017, 00:27:26
    Author     : KKOFFI
--%>


<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TPreenregistrementCompteClientTiersPayent"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TGroupeTierspayant"%>
<%@page import="bll.configManagement.GroupeTierspayantController"%>
<%@page import="dal.TUser"%>
<%@page import="bll.Util"%>
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
    String CODEGROUPE = "";
    String search_value = "", dt_start = date.formatterMysqlShort.format(date.getPreviousMonth(new Date())), dt_end = date.formatterMysqlShort.format(new Date());

    if (request.getParameter("dt_start") != null && !"".equals(request.getParameter("dt_start"))) {
        dt_start = request.getParameter("dt_start");
    }

    if (request.getParameter("dt_end") != null && !"".equals(request.getParameter("dt_end"))) {
        dt_end = request.getParameter("dt_end");
    }
    if (request.getParameter("lg_GROUPE_ID") != null && !"".equals(request.getParameter("lg_GROUPE_ID"))) {
        lg_GROUPE_ID =  Integer.valueOf(request.getParameter("lg_GROUPE_ID"));
    }
    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("CODEGROUPE") != null && !"".equals(request.getParameter("CODEGROUPE")) && !"undefined".equals(request.getParameter("CODEGROUPE"))) {
        CODEGROUPE = request.getParameter("CODEGROUPE");
    }

    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
       TUser user=OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    boolean ACTION_REGLER_FACTURE = Util.isAllowed(OdataManager.getEm(), Util.ACTION_REGLER_FACTURE, user.getTRoleUserCollection().stream().findFirst().get().getLgROLEID().getLgROLEID());
    JSONArray arrayObj = groupeCtl.getGroupeInvoice(false, dt_start, dt_end, search_value, lg_GROUPE_ID, CODEGROUPE, ACTION_REGLER_FACTURE, start, limit);
    int count = groupeCtl.getGroupeInvoiceCount(dt_start, dt_end, search_value, lg_GROUPE_ID, CODEGROUPE);

    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", count);
%>

<%= data%>