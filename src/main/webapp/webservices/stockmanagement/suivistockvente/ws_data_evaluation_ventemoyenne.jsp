<%@page import="dal.TTypeStockFamille"%>
<%@page import="bll.configManagement.familleManagement"%>
<%@page import="bll.teller.SnapshotManager"%>
<%@page import="dal.TFamille"%>
<%@page import="bll.stockManagement.StockManager"%>
<%@page import="dal.TSnapShopDalySortieFamille"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TTypeRisque"  %>
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
    List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
    TUser OTUser;
    JSONObject json = null;
%>

<%
    String lg_FAMILLE_ID = "%%", search_value = "", lg_USER_ID = "%%", lg_PREENREGISTREMENT_ID = "%%", OdateDebut = "";
    String dt_DEBUT = "", dt_FIN = "";
    Date dtDEBUT, dtFin;
    int start = 0, limit = jdom.int_size_pagination, total = 0,
            int_VALUE3 = 0, int_VALUE2 = 0, int_VALUE1 = 0, int_VALUE0 = 1;
    double totalvente = 0.0, ventemoyenne = 0.0;
    long diffJour = 0;
    new logger().OCategory.info("dans ws data evaluation vente moyenne ");
    
      if (request.getParameter("start") != null) {
        start = Integer.parseInt(request.getParameter("start"));
        new logger().OCategory.info("start " + start);
    }

    if (request.getParameter("limit") != null) {
        limit = Integer.parseInt(request.getParameter("limit"));
        new logger().OCategory.info("limit " + limit);
    }  if (request.getParameter("start") != null) {
        start = Integer.parseInt(request.getParameter("start"));
        new logger().OCategory.info("start " + start);
    }

    if (request.getParameter("limit") != null) {
        limit = Integer.parseInt(request.getParameter("limit"));
        new logger().OCategory.info("limit " + limit);
    }

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }

    if (request.getParameter("datedebut") != null) {
        new logger().OCategory.info("datedebut " + request.getParameter("datedebut"));
        dt_DEBUT = request.getParameter("datedebut");
    }
    if (request.getParameter("datefin") != null) {
        new logger().OCategory.info("datefin " + request.getParameter("datefin"));
        dt_FIN = request.getParameter("datefin");
    }

    if (request.getParameter("lg_FAMILLE_ID") != null && request.getParameter("lg_FAMILLE_ID") != "") {
        lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");
        new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID);
    }

    if (dt_DEBUT.equalsIgnoreCase("") || dt_DEBUT == null) {
        //dt_Date_Debut = date.GetNewDate(dt_Date_Fin, -7);
        dtDEBUT = date.GetDebutMois();
        OdateDebut = date.DateToString(dtDEBUT, date.formatterMysqlShort2);
    } else {
        dtDEBUT = date.stringToDate(dt_DEBUT, date.formatterMysqlShort);
        //OdateDebut = date.DateToString(dt_Date_Debut, date.formatterMysqlShort2);
    }
    dtDEBUT = date.getDate(OdateDebut, "00:00");
    if (dt_FIN.equalsIgnoreCase("") || dt_FIN == null) {
        dtFin = new Date();
    } else {
        dtFin = date.stringToDate(dt_FIN, date.formatterMysqlShort);
        String Odate = date.DateToString(dtFin, date.formatterMysqlShort2);

        dtFin = date.getDate(Odate, "23:59");
        //String dateJour = date.DateToString(date.getDate(dt_FIN, "00:00"), date.formatterMysqlShort); 
    }
    // Date dtDEBUT = date.stringToDate(dt_DEBUT, date.formatterMysqlShort);
    new logger().OCategory.info("search_value  = " + search_value + "   dt_FIN  " + dt_FIN + "  dt_DEBUT  " + dt_DEBUT + " lg_FAMILLE_ID " + lg_FAMILLE_ID + " dtFin:" + dtFin+ " dtDEBUT:" + dtDEBUT);

    OdataManager.initEntityManager();
    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    new logger().OCategory.info("user connecté   " + OTUser.getStrFIRSTNAME());
    SnapshotManager OSnapshotManager = new SnapshotManager(OdataManager, OTUser);
    familleManagement OfamilleManagement = new familleManagement(OdataManager, OTUser);
    lstTTypeStockFamille = OfamilleManagement.getListArticleBis(search_value, lg_FAMILLE_ID, "", "%%", start, limit);
    total = OfamilleManagement.getListArticleBis(search_value, lg_FAMILLE_ID, "", "%%").size();
    new logger().OCategory.info("total " + total);
%>

<%    JSONArray arrayObj = new JSONArray();
    for (TTypeStockFamille OTTypeStockFamille : lstTTypeStockFamille) {
        //totalvente = OSnapshotManager.getQauntityVenteByArticle(OTTypeStockFamille.getLgFAMILLEID().getIntCIP(), date.DateToString(dtDEBUT, date.formatterMysqlShort), date.DateToString(dtFin, date.formatterMysqlShort), OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID(), lg_USER_ID, lg_PREENREGISTREMENT_ID);
        /*diffJour = date.getDifferenceBetweenDate(dtDEBUT, dtFin);
        ventemoyenne = totalvente / (diffJour == 0 ? 1 : diffJour);*/

        json = new JSONObject();
        json.put("lg_FAMILLE_ID", OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID());
        json.put("str_NAME", OTTypeStockFamille.getLgFAMILLEID().getStrNAME());
        json.put("lg_FAMILLEARTICLE_ID", OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE());
        json.put("int_CIP", OTTypeStockFamille.getLgFAMILLEID().getIntCIP());
        json.put("int_STOCK",  OSnapshotManager.getStockProduitByIdProduitAndEmplacement( OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID()) );

        
        int_VALUE3 = OSnapshotManager.getQauntityVenteByArticle(OTTypeStockFamille.getLgFAMILLEID().getIntCIP(), date.DateToString(date.getFirstDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (3 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), date.DateToString(date.getLastDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (3 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID(), lg_USER_ID, lg_PREENREGISTREMENT_ID);
        int_VALUE2 = OSnapshotManager.getQauntityVenteByArticle(OTTypeStockFamille.getLgFAMILLEID().getIntCIP(), date.DateToString(date.getFirstDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (2 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), date.DateToString(date.getLastDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (2 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID(), lg_USER_ID, lg_PREENREGISTREMENT_ID);
        int_VALUE1 = OSnapshotManager.getQauntityVenteByArticle(OTTypeStockFamille.getLgFAMILLEID().getIntCIP(), date.DateToString(date.getFirstDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (1 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), date.DateToString(date.getLastDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (1 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID(), lg_USER_ID, lg_PREENREGISTREMENT_ID);
        int_VALUE0 = OSnapshotManager.getQauntityVenteByArticle(OTTypeStockFamille.getLgFAMILLEID().getIntCIP(), date.DateToString(date.getFirstDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (0 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), date.DateToString(date.getLastDayofSomeMonth(Integer.parseInt(date.getoMois(dtDEBUT)) - (0 + Integer.parseInt(date.getoMois(dtDEBUT)))), date.formatterMysqlShort), OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID(), lg_USER_ID, lg_PREENREGISTREMENT_ID);
        
        totalvente = int_VALUE3 + int_VALUE2 + int_VALUE1+int_VALUE0 ;
        ventemoyenne = (int_VALUE3 + int_VALUE2 + int_VALUE1)/3; 
         
        json.put("int_STOCK_REAPROVISONEMENT", totalvente);
        json.put("int_NUMBER", ventemoyenne);
        json.put("int_NUMBER_SORTIE", totalvente * OTTypeStockFamille.getLgFAMILLEID().getIntPRICE());
        json.put("int_VALUE3", int_VALUE3);
        json.put("int_VALUE2", int_VALUE2);
        json.put("int_VALUE1", int_VALUE1);
        json.put("int_VALUE0", int_VALUE0);
        json.put("dt_UPDATED", date.DateToString(dtDEBUT, date.formatterShort) + " au " + date.DateToString(dtFin, date.formatterShort));
        arrayObj.put(json);

    }

    String result = "({\"total\":\"" + total + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);

%>

<%= result%>