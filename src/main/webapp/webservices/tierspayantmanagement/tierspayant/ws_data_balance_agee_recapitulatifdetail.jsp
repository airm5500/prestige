<%@page import="bll.entity.EntityData"%>
<%@page import="bll.preenregistrement.Preenregistrement"%>
<%@page import="dal.dataManager"  %>

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



<% Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();

    date key = new date();

    json Ojson = new json();
    List<EntityData> lstentytidata = new ArrayList<EntityData>();
    TUser OTUser;

    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data balance agee recapitulatif detaill�e");

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

<%
    String dt_DEBUT = "", dt_FIN = "";
   
    String lg_COMPTE_CLIENT_ID = "%%", lg_TIERS_PAYANT_ID = "%%", search_value = "", lg_PREENREGISTREMENT_ID = "%%", lg_TYPE_TIERS_PAYANT_ID = "%%", lg_USER_ID = "%%", lg_EMPLACEMENT_ID = "%%";

    if (request.getParameter("datedebut") != null) {
        dt_DEBUT = request.getParameter("datedebut");

    }
    if (request.getParameter("datefin") != null) {
        dt_FIN = request.getParameter("datefin");

    }

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
       
    }

    if (request.getParameter("lg_COMPTE_CLIENT_ID") != null && request.getParameter("lg_COMPTE_CLIENT_ID") != "") {
        lg_COMPTE_CLIENT_ID = request.getParameter("lg_COMPTE_CLIENT_ID");
       
    }
    if (request.getParameter("lg_TIERS_PAYANT_ID") != null && request.getParameter("lg_TIERS_PAYANT_ID") != "") {
        lg_TIERS_PAYANT_ID = request.getParameter("lg_TIERS_PAYANT_ID");
       
    }
   
   

   

    OdataManager.initEntityManager();
    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    Preenregistrement OPreenregistrement = new Preenregistrement(OdataManager, OTUser);

   
     lstentytidata = OPreenregistrement.getBalancePreenregistrementDetails(search_value, lg_TIERS_PAYANT_ID, dt_DEBUT, dt_FIN);

%>

<%//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstentytidata.size()) {
            DATA_PER_PAGE = lstentytidata.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstentytidata.size() - (DATA_PER_PAGE * (pgInt)));
        pgInt_Last = (DATA_PER_PAGE * (pgInt) + pgInt_Last);
        if (pgInt_Last > (DATA_PER_PAGE * (pgInt + 1))) {
            pgInt_Last = DATA_PER_PAGE * (pgInt + 1);
        }
        pgInt = ((DATA_PER_PAGE) * (pgInt));
    }

%>


<%    JSONArray arrayObj = new JSONArray();
    for (int i = pgInt; i < pgInt_Last; i++) {
        try {
            OdataManager.getEm().refresh(lstentytidata.get(i));
        } catch (Exception er) {
        }

        JSONObject json = new JSONObject();

        json.put("lg_TIERS_PAYANT_ID", lstentytidata.get(i).getStr_value1());
        json.put("str_TIERS_PAYANT", lstentytidata.get(i).getStr_value2());
        json.put("int_NUMBER_PRODUCT", OPreenregistrement.getTierspayantProduitsVendus( lstentytidata.get(i).getStr_value1(), dt_DEBUT, dt_FIN)); 
        json.put("int_NUMBER_TRANSACTION",  lstentytidata.get(i).getStr_value3());
        json.put("int_MONTANT",  lstentytidata.get(i).getStr_value4()); 
        System.out.println(" str_TIERS_PAYANT   "+lstentytidata.get(i).getStr_value2()+"       "+lstentytidata.get(i).getStr_value4());

        arrayObj.put(json);

    }
    String result = "({\"total\":\"" + lstentytidata.size() + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);

%>

<%= result%>