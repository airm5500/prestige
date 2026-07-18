<%@page contentType="application/json" pageEncoding="UTF-8"%>
<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="dal.dataManager"%>
<%@page import="org.json.JSONArray"%>
<%--
    Statut 'Check' (inventorie / non inventorie) A LA DEMANDE pour les lignes
    de la page actuellement affichee (parametre 'ids' = cles primaires separees
    par des virgules). Appele uniquement au clic du bouton 'Afficher Check' :
    le chargement pagine normal ne calcule plus rien, les changements de page
    restent aussi rapides qu'avant.
--%>
<%
    String ids = request.getParameter("ids");

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    InventaireManager OInventaireManager = new InventaireManager(OdataManager);
    JSONArray arrayObj = OInventaireManager.listTouchedStatus(ids);
    String result = "({\"total\":\"" + arrayObj.length() + "\",\"results\":" + arrayObj.toString() + "})";
%>
<%= result%>
