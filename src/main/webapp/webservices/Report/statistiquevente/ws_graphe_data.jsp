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
        json.put("N Clients", stat.getInt("NB_CLIENT"));
        json.put("M BrutTTC", stat.getDouble("BRUT_TTC"));
        json.put("Remise", stat.getDouble("REMISE"));
        json.put("M NetTTC", stat.getDouble("NET_TTC"));
        json.put("Pan MoyOrd", stat.getLong("PANIER_MOYEN_M_VO"));
        json.put("Pan MoyNo", stat.getLong("PANIER_MOYEN_M_VNO"));
        json.put("Vente Ord", stat.getDouble("AMOUT_VO"));
        json.put("Vente No", stat.getDouble("AMOUT_VNO"));
        data.put(json);
    }

    JSONObject jSONObject = new JSONObject();
    jSONObject.put("data", data);
    jSONObject.put("total", data.length());

%>

<%= jSONObject%>
