<%@page contentType="application/json" pageEncoding="UTF-8"%>
<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="dal.dataManager"%>
<%@page import="org.json.JSONArray"%>
<%--
    'Check EMPLACEMENT' : produits non encore comptes d'un emplacement
    (dt_UPDATED IS NULL). Code CIP, nom, prix d'achat, prix de vente.
--%>
<%
    String lg_INVENTAIRE_ID = "";
    if (request.getParameter("lg_INVENTAIRE_ID") != null) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
    }
    String str_CODE = "";
    if (request.getParameter("str_CODE") != null) {
        str_CODE = request.getParameter("str_CODE");
    }

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    InventaireManager OInventaireManager = new InventaireManager(OdataManager);
    JSONArray arrayObj = OInventaireManager.listCheckEmplacementRestants(lg_INVENTAIRE_ID, str_CODE);
    String result = "({\"total\":\"" + arrayObj.length() + "\",\"results\":" + arrayObj.toString() + "})";
%>
<%= result%>
