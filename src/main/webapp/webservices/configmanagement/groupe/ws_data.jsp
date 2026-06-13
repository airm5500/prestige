<%-- 
    Document   : ws_zone
    Created on : 29 juin 2017, 00:27:26
    Author     : KKOFFI
--%>


<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TUser"%>
<%@page import="bll.Util"%>
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
    String search_value = "%%";
    OdataManager.initEntityManager();
    GroupeTierspayantController groupeCtl = new GroupeTierspayantController(OdataManager.getEmf());

    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    JSONArray arrayObj = new JSONArray();
    boolean ACTION_REGLER_FACTURE = Util.isAllowed(OdataManager.getEm(), Util.ACTION_REGLER_FACTURE, OTUser.getTRoleUserCollection().stream().findFirst().get().getLgROLEID().getLgROLEID());
    List<TGroupeTierspayant> list = groupeCtl.findTGroupeTierspayantEntities(limit, start, search_value);
    int count = groupeCtl.getTGroupeTierspayantCount(search_value);
    for (TGroupeTierspayant obj : list) {
        JSONObject json = new JSONObject();
        json.put("lg_GROUPE_ID", obj.getLgGROUPEID()).put("str_LIBELLE", obj.getStrLIBELLE()).put("str_ADRESSE", obj.getStrADRESSE()).put("str_TELEPHONE", obj.getStrTELEPHONE());
        json.put("str_MODE_TRI_FACTURE", GroupeTierspayantController.normalizeModeTri(obj.getStrMODETRIFACTURE()));
        json.put("ACTION_REGLER_FACTURE", ACTION_REGLER_FACTURE);
        arrayObj.put(json);

    }

    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", count);
%>

<%= data%>