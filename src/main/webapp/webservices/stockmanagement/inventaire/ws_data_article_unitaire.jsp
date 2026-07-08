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

<jsp:useBean id="Os_Search_poste" class="services.Search"  scope="session"/>
<jsp:useBean id="Os_Search_poste_data" class="services.ShowDataBean" scope="session" />


<% 
    dataManager OdataManager = new dataManager();
    List<TInventaireFamille> lstTInventaireFamille = new ArrayList<TInventaireFamille>();

%>

<%    int DATA_PER_PAGE = 20, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data edit famille inventaire");
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

<%    String lg_INVENTAIRE_ID = "%%", search_value = "", lg_ZONE_GEO_ID = "%%", lg_FAMILLEARTICLE_ID = "%%", lg_GROSSISTE_ID = "%%", str_TYPE = "";
    
    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }
    
    if (request.getParameter("lg_INVENTAIRE_ID") != null) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
        new logger().OCategory.info("lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
    }

    if (request.getParameter("lg_INVENTAIRE_ID") != null && !request.getParameter("lg_INVENTAIRE_ID").equalsIgnoreCase("")) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
        new logger().OCategory.info("lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
    }

    if (request.getParameter("lg_ZONE_GEO_ID") != null && !request.getParameter("lg_ZONE_GEO_ID").equalsIgnoreCase("")) {
        lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
        new logger().OCategory.info("lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID);
    }

    if (request.getParameter("lg_GROSSISTE_ID") != null && !request.getParameter("lg_GROSSISTE_ID").equalsIgnoreCase("")) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
    }

    if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && request.getParameter("lg_FAMILLEARTICLE_ID") != "") {
        lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
        new logger().OCategory.info("lg_FAMILLEARTICLE_ID " + lg_FAMILLEARTICLE_ID);
    }

    OdataManager.initEntityManager();
    InventaireManager OInventaireManager = new InventaireManager(OdataManager);
    
     lstTInventaireFamille = OInventaireManager.listTFamilleByInventaire(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID);

%>

<%//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstTInventaireFamille.size()) {
            DATA_PER_PAGE = lstTInventaireFamille.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTInventaireFamille.size() - (DATA_PER_PAGE * (pgInt)));
        pgInt_Last = (DATA_PER_PAGE * (pgInt) + pgInt_Last);
        if (pgInt_Last > (DATA_PER_PAGE * (pgInt + 1))) {
            pgInt_Last = DATA_PER_PAGE * (pgInt + 1);
        }
        pgInt = ((DATA_PER_PAGE) * (pgInt));
    }

%>


<%    JSONArray arrayObj = new JSONArray();
    for (int i = pgInt; i < pgInt_Last; i++) {
        // Optimisation : suppression des em.refresh() par ligne (2 requetes SQL redondantes
        // par produit affiche). Les entites sont deja chargees par la requete de liste et les
        // associations sont initialisees paresseusement a l'acces, ce qui donne le meme resultat
        // en supprimant ~40 requetes par page.

        JSONObject json = new JSONObject();
       json.put("lg_INVENTAIRE_FAMILLE_ID", lstTInventaireFamille.get(i).getLgINVENTAIREFAMILLEID());
        json.put("lg_FAMILLE_ID", lstTInventaireFamille.get(i).getLgFAMILLEID().getLgFAMILLEID());
        json.put("str_NAME", lstTInventaireFamille.get(i).getLgFAMILLEID().getStrNAME());
        json.put("str_DESCRIPTION", lstTInventaireFamille.get(i).getLgFAMILLEID().getStrDESCRIPTION());
        json.put("int_PRICE", lstTInventaireFamille.get(i).getLgFAMILLEID().getIntPRICE());
        json.put("int_CIP", lstTInventaireFamille.get(i).getLgFAMILLEID().getIntCIP());
        json.put("int_PAF", lstTInventaireFamille.get(i).getLgFAMILLEID().getIntPAF());
        json.put("int_PAT", lstTInventaireFamille.get(i).getLgFAMILLEID().getIntPAT());
        json.put("is_select", lstTInventaireFamille.get(i).getBoolINVENTAIRE());
        
        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + lstTInventaireFamille.size() + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);

%>

<%= result%>