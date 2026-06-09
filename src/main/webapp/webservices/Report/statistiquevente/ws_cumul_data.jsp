<%@page import="java.time.LocalDate"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TUser"%>
<%@page import="dal.dataManager"%>
<%@page import="bll.report.StatisticSales"%>
<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>

<%
    LocalDate now = LocalDate.now();
    String dt_start = now.minusMonths(1).toString();
    String dt_end = LocalDate.now().toString();

    if (request.getParameter("dt_start_vente") != null && !"".equals(request.getParameter("dt_start_vente"))) {
        dt_start = request.getParameter("dt_start_vente");
    }

    if (request.getParameter("dt_end_vente") != null && !"".equals(request.getParameter("dt_end_vente"))) {
        dt_end = request.getParameter("dt_end_vente");
    }
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    dataManager OManager = new dataManager();
    OManager.initEntityManager();
    StatisticSales statisticSales = new StatisticSales(OManager);
    JSONArray stats = statisticSales.getSalesStatistics(dt_start, dt_end, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

    JSONArray data = new JSONArray();
    int id = 0;
    // du mois le plus recent au plus ancien, comme l'affichage historique du graphe
    for (int i = stats.length() - 1; i >= 0; i--) {
        JSONObject stat = stats.getJSONObject(i);
        JSONObject json = new JSONObject();
        json.put("id", ++id);
        json.put("month", stat.getString("month"));
        json.put("N Clients Cumul", stat.getInt("NB_CLIENTCUMUL"));
        json.put("M BrutTTC Cumul", stat.getDouble("MONTANT_BRUTCUMUL"));
        json.put("Remise Cumul", stat.getDouble("MONTANT_REMISECUMUL"));
        json.put("M NetTTC Cumul", stat.getDouble("MONTANT_NETCUMUL"));
        json.put("Pan MoyOrd Cumul", stat.getLong("PANIER_MOYEN_M_VO_CUMUL"));
        json.put("Pan MoyNo Cumul", stat.getLong("PANIER_MOYEN_M_VNO_CUMUL"));
        json.put("Vente Ord Cumul", stat.getDouble("MONTANT_VOCUMUL"));
        json.put("Vente No Cumul", stat.getDouble("MONTANT_VNOCUMUL"));
        data.put(json);
    }

    JSONObject jSONObject = new JSONObject();
    jSONObject.put("data", data);
    jSONObject.put("total", data.length());

%>

<%= jSONObject%>
