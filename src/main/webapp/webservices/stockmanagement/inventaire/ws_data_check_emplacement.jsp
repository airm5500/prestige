<%@page contentType="application/json" pageEncoding="UTF-8"%>
<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="dal.dataManager"%>
<%@page import="org.json.JSONArray"%>
<%--
    'Check EMPLACEMENT' : statut de comptage par emplacement de l'inventaire.
    Non fait / En cours / Termine selon les dt_UPDATED des lignes incluses.
--%>
<%
    String lg_INVENTAIRE_ID = "";
    if (request.getParameter("lg_INVENTAIRE_ID") != null) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
    }

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    InventaireManager OInventaireManager = new InventaireManager(OdataManager);
    JSONArray arrayObj = OInventaireManager.listCheckEmplacement(lg_INVENTAIRE_ID);
    String result = "({\"total\":\"" + arrayObj.length() + "\",\"results\":" + arrayObj.toString() + "})";
%>
<%= result%>
