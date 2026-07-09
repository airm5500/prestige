<%-- 
    Document   : list
    Created on : 25 oct. 2015, 08:07:30
    Author     : KKOFFI
--%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.configManagement.clientManagement"%>
<%@page import="dal.TPreenregistrementCompteClientTiersPayent"%>
<%@page import="dal.TPreenregistrement"%>
<%@page import="java.util.Date"%>
<%@page import="toolkits.utils.date"%>

<%@page import="dal.dataManager"%>
<%@page import="dal.TUser"%>

<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>

<%@page import="java.util.ArrayList"%>

<%@page import="java.util.List"%>

<%
    dataManager OdataManager = new dataManager();
    List<TPreenregistrementCompteClientTiersPayent> lstdetails = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
    String dt_start = date.formatterMysqlShort.format(new Date());
    String dt_end = date.formatterMysqlShort.format(new Date());
    String search_value = "%%", tierpayantClient = "%%", lg_COMPTE_CLIENT_ID = "";
    clientManagement m = new clientManagement(OdataManager);
    if (request.getParameter("tierpayantClient") != null && !"".equals(request.getParameter("tierpayantClient"))) {
        tierpayantClient = request.getParameter("tierpayantClient");

    }
    if (request.getParameter("lg_COMPTE_CLIENT_ID") != null && !"".equals(request.getParameter("lg_COMPTE_CLIENT_ID"))) {
        lg_COMPTE_CLIENT_ID = request.getParameter("lg_COMPTE_CLIENT_ID");

    }

    if (request.getParameter("dt_end_vente") != null && !"".equals(request.getParameter("dt_end_vente"))) {
        dt_end = request.getParameter("dt_end_vente");

    }
    if (request.getParameter("dt_start_vente") != null && !"".equals(request.getParameter("dt_start_vente"))) {
        dt_start = request.getParameter("dt_start_vente");

    }

    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    long count = m.getClientAchatsCount(lg_COMPTE_CLIENT_ID.trim(), dt_start, dt_end, tierpayantClient, search_value);
    // lstdetails = m.getClientAchats(lg_COMPTE_CLIENT_ID, dt_start, dt_end, tierpayantClient, search_value, start, limit);
    lstdetails = m.getClientAchats(lg_COMPTE_CLIENT_ID, dt_start, dt_end, tierpayantClient, search_value, start, limit);
   JSONObject clientData = m.getClientAchats(lg_COMPTE_CLIENT_ID, dt_start, dt_end, tierpayantClient, search_value);
   
   
   JSONArray arrayObj = new JSONArray();
    JSONObject data = new JSONObject();

    for (TPreenregistrementCompteClientTiersPayent OData : lstdetails) {
        JSONObject json = new JSONObject();

        json.put("REFVENTE", OData.getLgPREENREGISTREMENTID().getStrREF());
        json.put("IDVENTE", OData.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID());

        json.put("DATEVENTE", date.formatterShort.format(OData.getLgPREENREGISTREMENTID().getDtUPDATED()));
        json.put("MONTANTVENTE", conversion.AmountFormat(OData.getLgPREENREGISTREMENTID().getIntPRICE()));
        json.put("MONTANTCLIENT", OData.getLgPREENREGISTREMENTID().getIntCUSTPART());
        json.put("MONTANTTP", OData.getIntPRICE());

        json.put("POURCENTAGE", OData.getIntPERCENT());
        json.put("REFFACTURE", m.getFatucreRef(OData.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID()));
        json.put("TIERSPAYANT", OData.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME());
        json.put("REFBON", OData.getStrREFBON());
        json.put("TOTALVENTE", clientData.get("TOTALVENTE"));
        json.put("TOTALCLIENT", clientData.get("TOTALCLIENT"));
        json.put("TOTALTTP", clientData.get("TOTALTP"));

        arrayObj.put(json);

    }

    // clients standards : aucune ligne tiers payant -> on remonte les ventes
    // reliees directement au client (t_preenregistrement.lg_CLIENT_ID)
    if (count == 0) {
        count = m.getClientVentesStandardsCount(lg_COMPTE_CLIENT_ID.trim(), dt_start, dt_end, search_value);
        if (count > 0) {
            List<TPreenregistrement> ventesStandards = m.getClientVentesStandards(lg_COMPTE_CLIENT_ID, dt_start, dt_end, search_value, start, limit);
            JSONObject totauxStandards = m.getClientVentesStandardsTotaux(lg_COMPTE_CLIENT_ID, dt_start, dt_end, search_value);
            for (TPreenregistrement vente : ventesStandards) {
                JSONObject json = new JSONObject();
                json.put("REFVENTE", vente.getStrREF());
                json.put("IDVENTE", vente.getLgPREENREGISTREMENTID());
                json.put("DATEVENTE", date.formatterShort.format(vente.getDtUPDATED()));
                json.put("MONTANTVENTE", conversion.AmountFormat(vente.getIntPRICE()));
                json.put("MONTANTCLIENT", vente.getIntPRICE());
                json.put("MONTANTTP", 0);
                json.put("POURCENTAGE", 0);
                json.put("REFFACTURE", "");
                json.put("TIERSPAYANT", "");
                json.put("REFBON", "");
                json.put("TOTALVENTE", totauxStandards.get("TOTALVENTE"));
                json.put("TOTALCLIENT", totauxStandards.get("TOTALCLIENT"));
                json.put("TOTALTTP", totauxStandards.get("TOTALTP"));
                arrayObj.put(json);
            }
        }
    }
    data.put("data", arrayObj);
    data.put("total", count);
%>

<%= data%>