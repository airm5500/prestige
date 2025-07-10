<%@page import="dal.TParameters"%>
<%@page import="bll.utils.TparameterManager"%>
<%@page import="bll.stockManagement.StockManager"%>
<%@page import="dal.TTypeStockFamille"%>
<%@page import="bll.teller.tellerManagement"%>
<%@page import="bll.configManagement.familleManagement"%>
<%@page import="bll.bllBase"%>
<%@page import="dal.TFamilleStock"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TFamille"  %>
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

   
    List<dal.TFamille> lstTFamille = new ArrayList<dal.TFamille>();


%>

<%    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data famille jdbc ");
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

<%    String lg_FAMILLE_ID = "%%", str_TYPE_TRANSACTION = "%%", lg_TYPE_STOCK_ID = "1";
    if (request.getParameter("search_value") != null) {
        //Os_Search_poste.setOvalue("%" + request.getParameter("search_value") + "%");
        Os_Search_poste.setOvalue(request.getParameter("search_value") + "%");
        new logger().OCategory.info("Search book " + request.getParameter("search_value"));
    } else {
        Os_Search_poste.setOvalue("%%");
    }

    if (request.getParameter("search_cip") != null) {
        Os_Search_poste.setOdata("%" + request.getParameter("search_cip") + "%");
        new logger().OCategory.info("search_cip " + request.getParameter("search_cip"));
    } else {
        Os_Search_poste.setOdata("%%");

    }

    if (request.getParameter("str_TYPE_TRANSACTION") != null) {
        str_TYPE_TRANSACTION = request.getParameter("str_TYPE_TRANSACTION");
        new logger().OCategory.info("str_TYPE_TRANSACTION " + str_TYPE_TRANSACTION);
    }

    // new logger().OCategory.info("search_value  = " + Os_Search_poste.getOvalue());
    //  new logger().OCategory.info("search_cip  = " + Os_Search_poste.getOdata());
    if (request.getParameter("lg_FAMILLE_ID") != null) {
        if (request.getParameter("lg_FAMILLE_ID").toString().equals("ALL")) {
            lg_FAMILLE_ID = "%%";
        } else {
            lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID").toString();
        }

    }

    String search_value = Os_Search_poste.getOvalue();

    OdataManager.initEntityManager();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
      TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    familleManagement OfamilleManagement = new familleManagement(OdataManager, user);
    // TparameterManager OTparameterManager = new TparameterManager(OdataManager);
    // TParameters OTParameters = OTparameterManager.getParameter(str_KEY);

    /*if(!OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
     lg_TYPE_STOCK_ID = "3";
     }*/
    if (request.getParameter("lg_TYPE_STOCK_ID") != null) {
        lg_TYPE_STOCK_ID = request.getParameter("lg_TYPE_STOCK_ID");
        new logger().OCategory.info("lg_TYPE_STOCK_ID " + lg_TYPE_STOCK_ID);
    }

    lstTFamille = OfamilleManagement.getListArticleInit(search_value, lg_FAMILLE_ID);

%>

<%//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstTFamille.size()) {
            DATA_PER_PAGE = lstTFamille.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTFamille.size() - (DATA_PER_PAGE * (pgInt)));
        pgInt_Last = (DATA_PER_PAGE * (pgInt) + pgInt_Last);
        if (pgInt_Last > (DATA_PER_PAGE * (pgInt + 1))) {
            pgInt_Last = DATA_PER_PAGE * (pgInt + 1);
        }
        pgInt = ((DATA_PER_PAGE) * (pgInt));
    }

%>


<%    JSONArray arrayObj = new JSONArray();

    for (int i = pgInt; i < pgInt_Last; i++) {

        String Role = "";

        JSONObject json = new JSONObject();
        // System.out.println("178");
        json.put("lg_FAMILLE_ID", lstTFamille.get(i).getLgFAMILLEID());
        json.put("str_NAME", lstTFamille.get(i).getStrNAME());
        json.put("str_DESCRIPTION", lstTFamille.get(i).getStrDESCRIPTION());
        // json.put("str_DESCRIPTION_int_NUMBER_AVAILABLE_int_NUMBER", lstTFamille.get(i).getStrDESCRIPTION()+"@@"+ lstTFamille.get(i).getTFamilleStockCollection().iterator().next().getIntNUMBERAVAILABLE()); a decommenter en cas de probleme
        json.put("int_PRICE", lstTFamille.get(i).getIntPRICE());
        json.put("CIP", lstTFamille.get(i).getIntCIP());
        //   json.put("str_DESCRIPTION_PLUS",lstTFamille.get(i).getIntCIP() +"   "+ lstTFamille.get(i).getStrDESCRIPTION()+"   " +lstTFamille.get(i).getIntPRICE());
        json.put("str_DESCRIPTION_PLUS", lstTFamille.get(i).getIntCIP() + " " + lstTFamille.get(i).getStrDESCRIPTION() + " (" + lstTFamille.get(i).getIntPRICE() + ")");
        json.put("int_NUMBER_AVAILABLE", lstTFamille.get(i).getTFamilleStockCollection().iterator().next().getIntNUMBERAVAILABLE());
        json.put("int_NUMBER", lstTFamille.get(i).getTFamilleStockCollection().iterator().next().getIntNUMBER());

        arrayObj.put(json);
    }
 
    String result = "({\"total\":\"" + lstTFamille.size() + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);
    lstTFamille = null;
    OdataManager = null;
    Os_Search_poste = null;
    Os_Search_poste_data = null;
%>

<%= result%>