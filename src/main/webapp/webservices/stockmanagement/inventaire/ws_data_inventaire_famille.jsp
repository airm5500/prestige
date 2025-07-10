<%@page import="bll.utils.TparameterManager"%>
<%@page import="dal.TParameters"%>
<%@page import="bll.userManagement.privilege"%>
<%@page import="dal.TInventaireFamille"%>
<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="bll.stockManagement.StockManager"%>
<%@page import="bll.bllBase"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TInventaireFamille"  %>
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
    dataManager OdataManager = new dataManager();
    List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
    TParameters OTParameters = null;
%>

<%    int DATA_PER_PAGE = 10, count = 0, pages_curr = 0;
  
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

<%    String lg_INVENTAIRE_ID = "%%", search_value = "", lg_USER_ID = "%%", lg_ZONE_GEO_ID = "%%", lg_FAMILLEARTICLE_ID = "%%", lg_GROSSISTE_ID = "%%", str_TYPE = "";
    String MANQUANT = "MANQUANT", SURPLUS = "SURPLUS", MANQUANTSURPLUS = "MANQUANTSURPLUS", ALERTE = "ALERTE";
    int int_ALERTE = 0;
    long total=0l;
 int    start = Integer.valueOf(request.getParameter("start")); 
     int    limit = Integer.valueOf(request.getParameter("limit")); 
    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }

    if (request.getParameter("lg_INVENTAIRE_ID") != null && !request.getParameter("lg_INVENTAIRE_ID").equalsIgnoreCase("")) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
        new logger().OCategory.info("lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
    }

    if (request.getParameter("lg_ZONE_GEO_ID") != null && !request.getParameter("lg_ZONE_GEO_ID").equalsIgnoreCase("")) {
        lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
        new logger().OCategory.info("lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID);
    }

    if (request.getParameter("lg_USER_ID") != null && !request.getParameter("lg_USER_ID").equalsIgnoreCase("")) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
        new logger().OCategory.info("lg_USER_ID " + lg_USER_ID);
    }
    
    if (request.getParameter("lg_GROSSISTE_ID") != null && !request.getParameter("lg_GROSSISTE_ID").equalsIgnoreCase("")) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
    }

    if (request.getParameter("str_TYPE") != null && request.getParameter("str_TYPE") != "") {
        str_TYPE = request.getParameter("str_TYPE");
        new logger().OCategory.info("str_TYPE " + str_TYPE);
    }

    if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && request.getParameter("lg_FAMILLEARTICLE_ID") != "") {
        lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
        new logger().OCategory.info("lg_FAMILLEARTICLE_ID " + lg_FAMILLEARTICLE_ID);
    }

    OdataManager.initEntityManager();
    InventaireManager OInventaireManager = new InventaireManager(OdataManager);
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    privilege Oprivilege = new privilege(OdataManager, OTUser);
    TparameterManager OTparameterManager = new TparameterManager(OdataManager);
    OTParameters = OTparameterManager.getParameter("KEY_MAX_VALUE_INVENTAIRE");

    if (OTParameters != null) {
        int_ALERTE = Integer.parseInt(OTParameters.getStrVALUE());
    }
   
   boolean result_show_col_stock = Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.P_SHOW_INVENTAIRE);

    if (str_TYPE.equalsIgnoreCase(MANQUANT)) {
      
        total=OInventaireManager.getInventaireManquantCount(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, lg_USER_ID);
        lstTInventaireFamille = OInventaireManager.listEcartInventaireManquant(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID,start, limit, lg_USER_ID);
    } else if (str_TYPE.equalsIgnoreCase(SURPLUS)) {
        total=OInventaireManager.getCountInventaireSurplus(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, lg_USER_ID);
        lstTInventaireFamille = OInventaireManager.listEcartInventaireSurplus(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID,start, limit, lg_USER_ID);
    } else if (str_TYPE.equalsIgnoreCase(MANQUANTSURPLUS)) {
        total=OInventaireManager.getCountEcartInventaireSurplus(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, lg_USER_ID);
        lstTInventaireFamille = OInventaireManager.allEcartInventaireSurplus(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID,start, limit, lg_USER_ID);
    } else if (str_TYPE.equalsIgnoreCase(ALERTE)) {
      total=OInventaireManager.getCountAlertInventaire(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, int_ALERTE);
        lstTInventaireFamille = OInventaireManager.listAlertInventaire(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, int_ALERTE,start, limit);
    } else {
          total=OInventaireManager.getCountByInventaire(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, true, lg_USER_ID); 
        lstTInventaireFamille = OInventaireManager.listTFamilleByInventaire(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, true,start, limit, lg_USER_ID);
     
    
    }

    

%>



<%    JSONArray arrayObj = new JSONArray();
for(TInventaireFamille OTInventaireFamille:lstTInventaireFamille){
    
        JSONObject json = new JSONObject();

        json.put("lg_INVENTAIRE_FAMILLE_ID", OTInventaireFamille.getLgINVENTAIREFAMILLEID());
        json.put("lg_INVENTAIRE_ID", OTInventaireFamille.getLgINVENTAIREID().getLgINVENTAIREID());
        json.put("lg_FAMILLE_ID", OTInventaireFamille.getLgFAMILLEID().getLgFAMILLEID());
        json.put("int_CIP", OTInventaireFamille.getLgFAMILLEID().getIntCIP());
        json.put("str_NAME", OTInventaireFamille.getLgFAMILLEID().getStrNAME());
        json.put("str_DESCRIPTION", OTInventaireFamille.getLgFAMILLEID().getStrDESCRIPTION());
       String CODE=OTInventaireFamille.getLgFAMILLEID().getLgZONEGEOID().getStrCODE(),groupField=OTInventaireFamille.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE();
       if(OTInventaireFamille.getLgINVENTAIREID().getStrTYPE().equals("famille")){
        CODE=OTInventaireFamille.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrCODEFAMILLE();
        groupField=OTInventaireFamille.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE();
       }
       else if(OTInventaireFamille.getLgINVENTAIREID().getStrTYPE().equals("grossiste")){
        CODE=OTInventaireFamille.getLgFAMILLEID().getLgGROSSISTEID().getStrCODE();
         groupField=OTInventaireFamille.getLgFAMILLEID().getLgGROSSISTEID().getStrLIBELLE();
       }
      
        json.put("str_CODE",CODE.trim() );
        json.put("groupeby",groupField );
        //json.put("groupeby",CODE );
        try {
            json.put("lg_ZONE_GEO_ID", OTInventaireFamille.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE());
        } catch (Exception e) {

        }
        try {
            json.put("lg_FAMILLEARTICLE_ID", OTInventaireFamille.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE());
        } catch (Exception e) {

        }
        try {
            json.put("lg_GROSSISTE_ID", OTInventaireFamille.getLgFAMILLEID().getLgGROSSISTEID().getStrLIBELLE());
        } catch (Exception e) {

        }
        json.put("int_PRICE", OTInventaireFamille.getLgFAMILLEID().getIntPRICE());
        json.put("int_PRICE_REF", OTInventaireFamille.getLgFAMILLEID().getIntPRICE());
        json.put("int_PAF", OTInventaireFamille.getLgFAMILLEID().getIntPAF());
        json.put("int_PAT", OTInventaireFamille.getLgFAMILLEID().getIntPAT());
        json.put("int_MOY_VENTE", (OTInventaireFamille.getLgFAMILLEID().getDblPRIXMOYENPONDERE() * OTInventaireFamille.getIntNUMBERINIT()));
        json.put("int_TAUX_MARQUE", OTInventaireFamille.getIntNUMBERINIT());
        int ecart = OTInventaireFamille.getIntNUMBER() - OTInventaireFamille.getIntNUMBERINIT();
        //  new logger().OCategory.info("ecart "+ecart);
        json.put("int_QTE_SORTIE", ecart);
        json.put("int_QTE_REAPPROVISIONNEMENT", ecart * OTInventaireFamille.getLgFAMILLEID().getIntPRICE());

       json.put("is_AUTHORIZE_STOCK", result_show_col_stock);
              //json.put("is_AUTHORIZE_STOCK",true);
        json.put("int_NUMBER_AVAILABLE", OTInventaireFamille.getIntNUMBER());

        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + total + " \",\"results\":" + arrayObj.toString() + "})";
    

%>

<%= result%>