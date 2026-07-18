<%@page contentType="application/json" pageEncoding="UTF-8"%>
<%@page import="bll.utils.TparameterManager"%>
<%@page import="dal.TParameters"%>
<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="dal.dataManager"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="org.json.JSONObject"%>
<%@page import="dal.TUser"%>
<%--
    Valorisation des ecarts (quantite, achat, vente) pour le filtre courant.
    Calcul serveur sur toutes les lignes du filtre, ecart signe = saisi - initial.
--%>
<%
    String lg_INVENTAIRE_ID = "%%", search_value = "", lg_USER_ID = "%%", lg_ZONE_GEO_ID = "%%",
            lg_FAMILLEARTICLE_ID = "%%", lg_GROSSISTE_ID = "%%", str_TYPE = "";
    int int_ALERTE = 0;

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("lg_INVENTAIRE_ID") != null && !request.getParameter("lg_INVENTAIRE_ID").equalsIgnoreCase("")) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
    }
    if (request.getParameter("lg_ZONE_GEO_ID") != null && !request.getParameter("lg_ZONE_GEO_ID").equalsIgnoreCase("")) {
        lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
    }
    if (request.getParameter("lg_USER_ID") != null && !request.getParameter("lg_USER_ID").equalsIgnoreCase("")) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
    }
    if (request.getParameter("lg_GROSSISTE_ID") != null && !request.getParameter("lg_GROSSISTE_ID").equalsIgnoreCase("")) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
    }
    if (request.getParameter("str_TYPE") != null && request.getParameter("str_TYPE") != "") {
        str_TYPE = request.getParameter("str_TYPE");
    }
    if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && request.getParameter("lg_FAMILLEARTICLE_ID") != "") {
        lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
    }

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    InventaireManager OInventaireManager = new InventaireManager(OdataManager);
    TparameterManager OTparameterManager = new TparameterManager(OdataManager);
    TParameters OTParameters = OTparameterManager.getParameter("KEY_MAX_VALUE_INVENTAIRE");
    if (OTParameters != null) {
        int_ALERTE = Integer.parseInt(OTParameters.getStrVALUE());
    }

    JSONObject json = OInventaireManager.getEcartValorisation(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID,
            lg_ZONE_GEO_ID, lg_GROSSISTE_ID, str_TYPE, int_ALERTE, lg_USER_ID);
%>
<%= json.toString()%>
