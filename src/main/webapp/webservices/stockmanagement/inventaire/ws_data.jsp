<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="bll.bllBase"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TInventaire"  %>
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
    
    date key = new date();
    List<TInventaire> lstTInventaire = new ArrayList<TInventaire>();


%>

<%
    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data inventaire ");
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

<%  
    String lg_INVENTAIRE_ID = "%%", search_value = "", str_TYPE = "";
    search_value = request.getParameter("search_value");
    if (search_value != null) {
       // Os_Search_poste.setOvalue("%" + request.getParameter("search_value") + "%");
        new logger().OCategory.info("Search book " + request.getParameter("search_value"));
        search_value = "%"+search_value+"%";
    } else {
        search_value = "";
        //Os_Search_poste.setOvalue("%%");
    }
   
    if (request.getParameter("lg_INVENTAIRE_ID") != null && request.getParameter("lg_INVENTAIRE_ID") != "") {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
        new logger().OCategory.info("lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
    } 
    if (request.getParameter("str_TYPE") != null && request.getParameter("str_TYPE") != "") {
        str_TYPE = request.getParameter("str_TYPE");
        
    } 

    

    OdataManager.initEntityManager();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    InventaireManager OInventaireManager = new InventaireManager(OdataManager, OTUser);
   
    // Filtre de zone (rayon / reserve), independant du filtre de statut deja en place.
    String str_ZONE = request.getParameter("str_ZONE");
    if (str_ZONE != null && !str_ZONE.trim().isEmpty() && !"ALL".equalsIgnoreCase(str_ZONE)) {
        lstTInventaire = OInventaireManager.listInventaireParZone(lg_INVENTAIRE_ID, str_TYPE, str_ZONE);
    } else if (str_TYPE != null && !str_TYPE.equalsIgnoreCase("")) {
        lstTInventaire = OInventaireManager.listInventaire(lg_INVENTAIRE_ID, str_TYPE);
    } else {
        lstTInventaire = OInventaireManager.listInventaire(lg_INVENTAIRE_ID);
    }
     

   
%>

<%
//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstTInventaire.size()) {
            DATA_PER_PAGE = lstTInventaire.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTInventaire.size() - (DATA_PER_PAGE * (pgInt)));
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
            OdataManager.getEm().refresh(lstTInventaire.get(i));
             OdataManager.getEm().refresh(lstTInventaire.get(i).getLgINVENTAIREID());
        } catch (Exception er) {
        }

        String Role = "";

        JSONObject json = new JSONObject();

        json.put("lg_INVENTAIRE_ID", lstTInventaire.get(i).getLgINVENTAIREID());       
        json.put("str_NAME", lstTInventaire.get(i).getStrNAME());
        json.put("str_DESCRIPTION", lstTInventaire.get(i).getStrDESCRIPTION());
        try {
           json.put("lg_USER_ID", lstTInventaire.get(i).getLgUSERID().getStrFIRSTNAME() + " " + lstTInventaire.get(i).getLgUSERID().getStrLASTNAME());
        } catch (Exception e) {
        }        
        String str_STATUT = "";
        if(lstTInventaire.get(i).getStrSTATUT().equalsIgnoreCase(commonparameter.statut_enable)) {
            str_STATUT = "En cours";
        } else if(lstTInventaire.get(i).getStrSTATUT().equalsIgnoreCase(commonparameter.statut_is_Closed)) {
            str_STATUT = "Clotur�";
        }
      
        json.put("str_STATUT", str_STATUT);
        json.put("etat", lstTInventaire.get(i).getStrSTATUT());
        json.put("str_TYPE", lstTInventaire.get(i).getStrTYPE());
  
        
        json.put("dt_CREATED", key.DateToString(lstTInventaire.get(i).getDtCREATED(), key.formatterShort));
        json.put("dt_UPDATED", key.DateToString(lstTInventaire.get(i).getDtUPDATED(), key.formatterShort));

        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + lstTInventaire.size() + " \",\"results\":" + arrayObj.toString() + "})";
   

%>

<%= result%>