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


<%
    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data balance agee detaill\u00e9e");
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();

    date key = new date();

    json Ojson = new json();
  List<EntityData> lstTTiersPayant = new ArrayList<EntityData>();
    TUser OTUser;
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
    Date dtFin;
    String lg_COMPTE_CLIENT_ID = "%%", lg_TIERS_PAYANT_ID = "%%", search_value = "", lg_PREENREGISTREMENT_ID = "%%", lg_TYPE_TIERS_PAYANT_ID = "%%", lg_USER_ID = "%%", lg_EMPLACEMENT_ID = "%%", lg_GROUPE_ID = "%%";

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }

    if (request.getParameter("lg_COMPTE_CLIENT_ID") != null && request.getParameter("lg_COMPTE_CLIENT_ID") != "") {
        lg_COMPTE_CLIENT_ID = request.getParameter("lg_COMPTE_CLIENT_ID");
        new logger().OCategory.info("lg_COMPTE_CLIENT_ID " + lg_COMPTE_CLIENT_ID);
    }
    if (request.getParameter("lg_TIERS_PAYANT_ID") != null && request.getParameter("lg_TIERS_PAYANT_ID") != "") {
        lg_TIERS_PAYANT_ID = request.getParameter("lg_TIERS_PAYANT_ID");
        new logger().OCategory.info("lg_TIERS_PAYANT_ID " + lg_TIERS_PAYANT_ID);
    }
    if (request.getParameter("lg_TYPE_TIERS_PAYANT_ID") != null) {
        lg_TYPE_TIERS_PAYANT_ID = request.getParameter("lg_TYPE_TIERS_PAYANT_ID");
        new logger().OCategory.info("lg_TYPE_TIERS_PAYANT_ID " + lg_TYPE_TIERS_PAYANT_ID);
    }
    if (request.getParameter("lg_GROUPE_ID") != null) {
        lg_GROUPE_ID = request.getParameter("lg_GROUPE_ID");
        new logger().OCategory.info("lg_GROUPE_ID " + lg_GROUPE_ID);
    }
    if (request.getParameter("lg_USER_ID") != null) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
        new logger().OCategory.info("lg_USER_ID " + lg_USER_ID);
    }
    if (request.getParameter("lg_EMPLACEMENT_ID") != null) {
        lg_EMPLACEMENT_ID = request.getParameter("lg_EMPLACEMENT_ID");
        new logger().OCategory.info("lg_EMPLACEMENT_ID " + lg_EMPLACEMENT_ID);
    }
    if (request.getParameter("datedebut") != null) {
        new logger().OCategory.info("datedebut " + request.getParameter("datedebut"));
        dt_DEBUT = request.getParameter("datedebut");
    }
    if (request.getParameter("datefin") != null) {
        new logger().OCategory.info("datefin " + request.getParameter("datefin"));
        dt_FIN = request.getParameter("datefin");
    }

    if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
        dt_DEBUT = "2015-04-20";
    }
    if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
        dtFin = new Date();
    } else {
        dtFin = key.stringToDate(dt_FIN, key.formatterMysqlShort);
        String Odate = key.DateToString(dtFin, key.formatterMysqlShort2);

        dtFin = key.getDate(Odate, "23:59");
    }
    Date dtDEBUT = key.stringToDate(dt_DEBUT, key.formatterMysqlShort);
    new logger().OCategory.info("search_value  = " + search_value + "   dt_FIN  " + dt_FIN + "  dt_DEBUT  " + dt_DEBUT + " dtFin:" + dtFin);

    OdataManager.initEntityManager();
    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    new logger().OCategory.info("user connect\u00e9   " + OTUser.getStrFIRSTNAME());
   
    Preenregistrement OPreenregistrement = new Preenregistrement(OdataManager, OTUser);
 lstTTiersPayant = OPreenregistrement.getBalanceDetailsTiersPayant(search_value,lg_TIERS_PAYANT_ID,lg_COMPTE_CLIENT_ID, lg_TYPE_TIERS_PAYANT_ID, lg_GROUPE_ID );

%>

<%//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstTTiersPayant.size()) {
            DATA_PER_PAGE = lstTTiersPayant.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTTiersPayant.size() - (DATA_PER_PAGE * (pgInt)));
        pgInt_Last = (DATA_PER_PAGE * (pgInt) + pgInt_Last);
        if (pgInt_Last > (DATA_PER_PAGE * (pgInt + 1))) {
            pgInt_Last = DATA_PER_PAGE * (pgInt + 1);
        }
        pgInt = ((DATA_PER_PAGE) * (pgInt));
    }

%>


<%    JSONArray arrayObj = new JSONArray();
    for (int i = pgInt; i < pgInt_Last; i++) {
      JSONObject json = new JSONObject();
      long amount=0l,amount1=0l,amount2=0l,amount3=0l,amount4=0l,amount5=0l,amount6=0l,amount7=0l; 
         
        json.put("lg_TIERS_PAYANT_ID", lstTTiersPayant.get(i).getStr_value1());
        json.put("str_TIERS_PAYANT", lstTTiersPayant.get(i).getStr_value2());
       json.put("int_NUMBER_TRANSACTION", OPreenregistrement.getBalanceCount(search_value, lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1()));
        try {
          amount1=  OPreenregistrement.getBalanceInvoiceDetailsAmount(search_value, new Date(), lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }
        try {
         // amount=  OPreenregistrement.getBalanceHalfYearMonthIncludeAmount(search_value, lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }try {
          amount2=  OPreenregistrement.getBalanceInvoiceDetailsAmount(search_value, date.getPreviousMonth(1), lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }try {
          amount3=  OPreenregistrement.getBalanceInvoiceDetailsAmount(search_value, date.getPreviousMonth(2), lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }
        try {
          amount4=  OPreenregistrement.getBalanceInvoiceDetailsAmount(search_value, date.getPreviousMonth(3), lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }
        try {
          amount5=  OPreenregistrement.getBalanceInvoiceDetailsAmount(search_value, date.getPreviousMonth(4), lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }
        try {
          amount6=  OPreenregistrement.getBalanceInvoiceDetailsAmount(search_value, date.getPreviousMonth(5), lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }try {
          amount7=  OPreenregistrement.getBalanceHalfYearAmount(search_value, lg_COMPTE_CLIENT_ID,  lstTTiersPayant.get(i).getStr_value1());
        } catch (Exception e) {
        }
        json.put("int_MONTANT", amount);
        //json.put("dt_DEBUT", date.DateToString(dtDEBUT, key.formatterMysqlShort));
        //json.put("dt_FIN", date.DateToString(dtFin, date.formatterMysqlShort));
        json.put("int_VALUE1", amount1); 
        json.put("int_VALUE2", amount2);
        json.put("int_VALUE3", amount3);
        json.put("int_VALUE4", amount4);
        json.put("int_VALUE5", amount5);
        json.put("int_VALUE6", amount6);
        json.put("int_VALUE7", amount7);
        arrayObj.put(json);

    }
    String result = "({\"total\":\"" + lstTTiersPayant.size() + " \",\"results\":" + arrayObj.toString() + "})";
   

%>

<%= result%>