<%@page import="bll.userManagement.user"%>
<%@page import="bll.utils.TparameterManager"%>
<%@page import="dal.TParameters"%>
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
    TUser OTUser = null;
    List<TParameters> lstTParameters = new ArrayList<TParameters>();
    TRole OTRole = null;
%>

<%
    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data parameter");
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
    String str_KEY = "", search_value = "", str_TYPE = commonparameter.PARAMETER_CUSTOMER;
    if (request.getParameter("str_KEY") != null) {
        str_KEY = request.getParameter("str_KEY").toString();
        new logger().OCategory.info("str_KEY  = " + str_KEY);
    }

    /*  if (request.getParameter("str_TYPE") != null) {
     str_TYPE = request.getParameter("str_TYPE").toString();
     new logger().OCategory.info("str_TYPE  = " + str_TYPE);
     }*/
    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value").toString();
        new logger().OCategory.info("search_value  = " + search_value);
    }

    OdataManager.initEntityManager();
    user Ouser = new user(OdataManager);
    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OTRole = Ouser.getTRoleUser(OTUser.getLgUSERID()).getLgROLEID();
    // Les profils Administrateur et Super Administrateur voient tous les
    // parametres (y compris SYSTEME). Detection par prefixe de nom (gere les
    // variantes "Administrateur du systeme" / "Super Administrateur du systeme")
    // ou par type de role 'ADMIN'.
    // Faille de droits du 31/10 : profils reconnus a leur droit P_PROFIL_*, plus a leur nom
    if (OTRole != null && (user.estSuperAdmin(OTUser) || user.estRoleAdmin(OTRole)
            || commonparameter.PARAMETER_ADMIN.equalsIgnoreCase(OTRole.getStrTYPE()))) {
        str_TYPE = "%%";
    }
    new logger().OCategory.info("str_TYPE:" + str_TYPE);
    TparameterManager OTparameterManager = new TparameterManager(OdataManager, OTUser);
    lstTParameters = OTparameterManager.listeParameter(search_value, str_TYPE);
%>



<%//Filtre de pagination 
    try {
        if (DATA_PER_PAGE > lstTParameters.size()) {
            DATA_PER_PAGE = lstTParameters.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTParameters.size() - (DATA_PER_PAGE * (pgInt)));
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
            OdataManager.getEm().refresh(lstTParameters.get(i));
        } catch (Exception er) {
        }

        JSONObject json = new JSONObject();

        json.put("str_KEY", lstTParameters.get(i).getStrKEY());
        json.put("str_VALUE", lstTParameters.get(i).getStrVALUE());
        json.put("str_DESCRIPTION", lstTParameters.get(i).getStrDESCRIPTION());
        json.put("str_TYPE", lstTParameters.get(i).getStrTYPE());
        json.put("str_STATUT", lstTParameters.get(i).getStrSTATUT());
        try {
            json.put("str_SECTION_KEY", lstTParameters.get(i).getStrSECTIONKEY());
        } catch (Exception e) {
        }

        arrayObj.put(json);

    }
    String result = "({\"total\":\"" + lstTParameters.size() + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);

%>

<%= result%>