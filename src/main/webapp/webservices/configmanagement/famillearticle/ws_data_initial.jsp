<%@page import="org.apache.commons.lang3.StringUtils"%>
<%@page import="dal.TDci"%>
<%@page import="bll.configManagement.dciManagement"%>
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

    date key = new date();

    List<TDci> lstTDCI = new ArrayList<>();


%>

<%    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data dci ");
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

<%    String lg_FAMILLE_ID = "%%", lg_GROUPE_FAMILLE_ID = "%%", str_NAME = "%%", str_DESCRIPTION = "%%",
            str_TYPE_TRANSACTION = "%%";
    if (request.getParameter("search_value") != null) {
        //Os_Search_poste.setOvalue("%" + request.getParameter("search_value") + "%");
        Os_Search_poste.setOvalue(request.getParameter("search_value") + "%");
        new logger().OCategory.info("Search book " + request.getParameter("search_value"));
    } else {
        Os_Search_poste.setOvalue("%%");
    }

    new logger().OCategory.info("search_value  = " + Os_Search_poste.getOvalue());

    String search_value = Os_Search_poste.getOvalue();
    if (StringUtils.isNotEmpty(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    new logger().OCategory.info("search_value    " + search_value);
    OdataManager.initEntityManager();

    dciManagement OdciManagement = new dciManagement(OdataManager);

    lstTDCI = OdciManagement.showAllInitial(search_value);

    new logger().OCategory.info("lstDCI dans le ws " + lstTDCI.size());

%>

<%//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstTDCI.size()) {
            DATA_PER_PAGE = lstTDCI.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTDCI.size() - (DATA_PER_PAGE * (pgInt)));
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
            OdataManager.getEm().refresh(lstTDCI.get(i));
        } catch (Exception er) {
        }

        JSONObject json = new JSONObject();

        json.put("lg_DCI_ID", lstTDCI.get(i).getLgDCIID());
        json.put("str_NAME", lstTDCI.get(i).getStrNAME());
        json.put("str_CODE", lstTDCI.get(i).getStrCODE());

        json.put("str_STATUT", lstTDCI.get(i).getStrSTATUT());

        // dt_CREATED = lstTDCI.get(i).getDtCREATED();
        // if (dt_CREATED != null) {
        //      json.put("dt_CREATED", key.DateToString(dt_CREATED, key.formatterOrange));
        //  }
        // dt_UPDATED = lstTDCI.get(i).getDtUPDATED();
        // if (dt_UPDATED != null) {
        //   json.put("dt_UPDATED", key.DateToString(dt_UPDATED, key.formatterOrange));
        //}
        arrayObj.put(json);
    }
    String result = "({\"total\":\"" + lstTDCI.size() + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);
%>

<%= result%>