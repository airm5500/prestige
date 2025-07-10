<%@page import="bll.report.JournalVente"%>
<%@page import="bll.common.Parameter"%>
<%@page import="bll.userManagement.privilege"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.entity.EntityData"%>
<%@page import="bll.preenregistrement.Preenregistrement"%>
<%@page import="bll.tierspayantManagement.tierspayantManagement"%>
<%@page import="java.util.ArrayList"%>
<%@page import="dal.TMotifReglement"%>
<%@page import="dal.TPreenregistrement"%>
<%@page import="dal.TPreenregistrementCompteClientTiersPayent"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TRole"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="toolkits.web.json"  %>
<%@page import="org.json.JSONObject"  %>
<%@page import="org.json.JSONArray"  %>
<%@page import="dal.TUser"  %>
<%@page import="toolkits.utils.jdom"  %>
<%@page import="toolkits.utils.logger"  %>
<%@page import="java.text.SimpleDateFormat"  %> 

<jsp:useBean id="Os_Search_poste" class="services.Search"  scope="session"/>
<jsp:useBean id="Os_Search_poste_data" class="services.ShowDataBean" scope="session" />


<%
    dataManager OdataManager = new dataManager();
     new logger().OCategory.info("dans ws data facture subrogatoire------------------------------");
    TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
    date key = new date();
%>

<%
    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data facture subrogatoire");
%>


<!-- logic de gestion des page -->
<%
    String action = request.getParameter("action"); //get parameter ?action=
    int pageAsInt = 0;

    try {
        if ((action != null) && action.equals("filltable")) {
        } else {

            String p = request.getParameter("start"); // get paramerer ?page=

            if (p != null) {
                int int_page = new Integer(p).intValue();
                int_page = (int_page / DATA_PER_PAGE) + 1;
                p = new Integer(int_page).toString();

                // Strip quotation marks
                StringBuffer buffer = new StringBuffer();
                for (int index = 0; index < p.length(); index++) {
                    char c = p.charAt(index);
                    if (c != '\\') {
                        buffer.append(c);
                    }
                }
                p = buffer.toString();
                Integer intTemp = new Integer(p);

                pageAsInt = intTemp.intValue();

            } else {
                pageAsInt = 1;
            }

        }
    } catch (Exception E) {
    }


%>
<!-- fin logic de gestion des page -->

<%    List<EntityData> listPreenregistrement = new ArrayList<>();
    List<TPreenregistrementCompteClientTiersPayent> listTPreenregistrementCompteClientTiersPayent = new ArrayList<>();
    Date today = new Date();
    String str_Date_Debut = key.DateToString(today, key.formatterMysqlShort), str_Date_Fin = key.DateToString(today, key.formatterMysqlShort), search_value = "",
            h_debut = "00:00", h_fin = "23:59", lg_PREENGISTREMENT_ID = "%%", str_TYPE_VENTE = "%%", lg_TIERS_PAYANT_ID = "%%";

    TUser OTUser = OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
boolean BTN_EDIT = false;
    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value :" + search_value);
    }

    if (request.getParameter("str_TYPE_VENTE") != null && !request.getParameter("str_TYPE_VENTE").equalsIgnoreCase("")) {
        str_TYPE_VENTE = request.getParameter("str_TYPE_VENTE");
        new logger().OCategory.info("str_TYPE_VENTE :" + str_TYPE_VENTE);
    }

    if (request.getParameter("h_debut") != null && !request.getParameter("h_debut").equalsIgnoreCase("")) {
        h_debut = request.getParameter("h_debut");
        new logger().OCategory.info("h_debut :" + h_debut);
    }
    if (request.getParameter("h_fin") != null && !request.getParameter("h_fin").equalsIgnoreCase("")) {
        h_fin = request.getParameter("h_fin");
        new logger().OCategory.info("h_fin :" + h_fin);
    }
    if (request.getParameter("dt_Date_Debut") != null && !request.getParameter("dt_Date_Debut").equalsIgnoreCase("")) {
        str_Date_Debut = request.getParameter("dt_Date_Debut");
        new logger().OCategory.info("str_Date_Debut :" + str_Date_Debut);
    }

    if (request.getParameter("dt_Date_Fin") != null && !request.getParameter("dt_Date_Fin").equalsIgnoreCase("")) {
        str_Date_Fin = request.getParameter("dt_Date_Fin");
        new logger().OCategory.info("str_Date_Fin :" + str_Date_Fin);
    }
    
    if (request.getParameter("lg_TIERS_PAYANT_ID") != null && !request.getParameter("lg_TIERS_PAYANT_ID").equalsIgnoreCase("")) {
        lg_TIERS_PAYANT_ID = request.getParameter("lg_TIERS_PAYANT_ID");
        new logger().OCategory.info("lg_TIERS_PAYANT_ID :" + lg_TIERS_PAYANT_ID);
    }
    
    

    Preenregistrement OPreenregistrement = new Preenregistrement(OdataManager, OTUser);
    privilege Oprivilege = new privilege(OdataManager, OTUser);
    BTN_EDIT = Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_BT_EDIT_NUMERO_BON);
    listPreenregistrement = OPreenregistrement.getListeVenteSansBon(search_value, str_Date_Debut, str_Date_Fin, h_debut, h_fin, lg_TIERS_PAYANT_ID);

%>

<%//Filtre de pagination
    try {
        if (DATA_PER_PAGE > listPreenregistrement.size()) {
            DATA_PER_PAGE = listPreenregistrement.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (listPreenregistrement.size() - (DATA_PER_PAGE * (pgInt)));
        pgInt_Last = (DATA_PER_PAGE * (pgInt) + pgInt_Last);
        if (pgInt_Last > (DATA_PER_PAGE * (pgInt + 1))) {
            pgInt_Last = DATA_PER_PAGE * (pgInt + 1);
        }
        pgInt = ((DATA_PER_PAGE) * (pgInt));
    }

%>


<%    JSONArray arrayObj = new JSONArray();

    if (listPreenregistrement == null || listPreenregistrement.isEmpty()) {
        JSONObject json = new JSONObject();
        json.put("ERROR", "PAS DONNEES");
    }

    for (int i = pgInt; i < pgInt_Last; i++) {

        String str_Product = "";

        listTPreenregistrementCompteClientTiersPayent = OPreenregistrement.getListeTPreenregistrementCompteClientTiersPayent(listPreenregistrement.get(i).getStr_value1(), commonparameter.statut_is_Closed);
        for (int k = 0; k < listTPreenregistrementCompteClientTiersPayent.size(); k++) {
            OTPreenregistrementCompteClientTiersPayent = listTPreenregistrementCompteClientTiersPayent.get(k);
            if (OTPreenregistrementCompteClientTiersPayent != null) {
                str_Product = "<span style='display: inline-block; width: 350px;'><b>Tiers payant</b>: " + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME() + "</span><span style='display: inline-block; width: 350px;'><b>Montant</b>: " + conversion.AmountFormat(OTPreenregistrementCompteClientTiersPayent.getIntPRICE(), '.') + "</span><span style='display: inline-block; width: 350px;'><b>Pourcentage</b>: " + OTPreenregistrementCompteClientTiersPayent.getIntPERCENT() + "</span><br>" + str_Product;
            }
        }

        JSONObject json = new JSONObject();
        json.put("lg_PREENREGISTREMENT_ID", listPreenregistrement.get(i).getStr_value1());
        json.put("str_REF", listPreenregistrement.get(i).getStr_value2());
        json.put("lg_USER_CAISSIER_ID", listPreenregistrement.get(i).getStr_value3());
        json.put("int_PRICE", listPreenregistrement.get(i).getStr_value5());
        json.put("dt_CREATED", date.DateToString(date.stringToDate(listPreenregistrement.get(i).getStr_value6(), date.formatterMysql), date.formatterShort));
        json.put("str_hour", date.DateToString(date.stringToDate(listPreenregistrement.get(i).getStr_value6(), date.formatterMysql), date.NomadicUiFormat_Time));
        
        json.put("str_FAMILLE_ITEM", str_Product);
        json.put("str_TYPE_VENTE", listPreenregistrement.get(i).getStr_value10());
        json.put("lg_USER_VENDEUR_ID", listPreenregistrement.get(i).getStr_value11());

        //a revoir apre
        
        json.put("int_PRICE_FORMAT", conversion.AmountFormat(Integer.parseInt(listPreenregistrement.get(i).getStr_value5()), '.'));
        json.put("str_REF_BON", listPreenregistrement.get(i).getStr_value17());
        json.put("int_PRICE_REMISE_FORMAT", conversion.AmountFormat(Integer.parseInt(listPreenregistrement.get(i).getStr_value13()), '.'));
        json.put("VENTE_NET_FORMAT", conversion.AmountFormat(Integer.parseInt(listPreenregistrement.get(i).getStr_value12()), '.'));
        json.put("int_PRICE_REMISE", Integer.parseInt(listPreenregistrement.get(i).getStr_value13()));
        json.put("VENTE_NET", Integer.parseInt(listPreenregistrement.get(i).getStr_value12()));
        json.put("BTN_ANNULATION", BTN_EDIT);

        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + listPreenregistrement.size() + " \",\"results\":" + arrayObj.toString() + "})";

   
%>

<%= result%>
