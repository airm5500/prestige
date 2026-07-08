<%@page import="dal.Groupefournisseur"%>
<%@page import="bll.common.Parameter"%>
<%@page import="bll.userManagement.privilege"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.configManagement.grossisteManagement"%>
<%@page import="dal.TGrossiste"%>
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
    List<TGrossiste> lstTGrossiste = new ArrayList<TGrossiste>();

%>


<%    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans ws data grossiste ");
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

<%    String lg_GROSSISTE_ID = "%%", search_value = "";

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }

    if (request.getParameter("query") != null) {
        search_value = request.getParameter("query");
        new logger().OCategory.info("search_value " + search_value);
    }

    if (request.getParameter("lg_GROSSISTE_ID") != null && !request.getParameter("lg_GROSSISTE_ID").equalsIgnoreCase("")) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
    }

    OdataManager.initEntityManager();
    grossisteManagement OgrossisteManagement = new grossisteManagement(OdataManager);
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    privilege Oprivilege = new privilege(OdataManager, OTUser);
    lstTGrossiste = OgrossisteManagement.getListeGrossiste(search_value, lg_GROSSISTE_ID);
    boolean BTNDELETE = Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_BT_DELETE);


%>

<%//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstTGrossiste.size()) {
            DATA_PER_PAGE = lstTGrossiste.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTGrossiste.size() - (DATA_PER_PAGE * (pgInt)));
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
            OdataManager.getEm().refresh(lstTGrossiste.get(i));
        } catch (Exception er) {
        }

        String Role = "";

        JSONObject json = new JSONObject();

        json.put("lg_GROSSISTE_ID", lstTGrossiste.get(i).getLgGROSSISTEID());

        json.put("str_LIBELLE", lstTGrossiste.get(i).getStrLIBELLE());
        json.put("str_DESCRIPTION", lstTGrossiste.get(i).getStrDESCRIPTION());
        json.put("str_ADRESSE_RUE_1", lstTGrossiste.get(i).getStrADRESSERUE1());
        json.put("str_ADRESSE_RUE_2", lstTGrossiste.get(i).getStrADRESSERUE2());
        json.put("str_CODE_POSTAL", lstTGrossiste.get(i).getStrCODEPOSTAL());
        json.put("str_BUREAU_DISTRIBUTEUR", lstTGrossiste.get(i).getStrBUREAUDISTRIBUTEUR());
        json.put("str_MOBILE", lstTGrossiste.get(i).getStrMOBILE());
        json.put("str_TELEPHONE", lstTGrossiste.get(i).getStrTELEPHONE());
        json.put("int_DELAI_REGLEMENT_AUTORISE", lstTGrossiste.get(i).getIntDELAIREGLEMENTAUTORISE());
        json.put("str_CODE", lstTGrossiste.get(i).getStrCODE());
        Groupefournisseur gr=lstTGrossiste.get(i).getGroupeId();
        if(gr!=null){
           json.put("groupeId", gr.getId()+"");   
        }
       
        json.put("idrepartiteur", lstTGrossiste.get(i).getIdRepartiteur());
        json.put("str_URL_PHARMAML", lstTGrossiste.get(i).getStrURLPHARMAML());
        json.put("str_CODE_RECEPTEUR_PHARMA", lstTGrossiste.get(i).getStrCODERECEPTEURPHARMA());
        json.put("str_ID_RECEPTEUR_PHARMA", lstTGrossiste.get(i).getStrIDRECEPTEURPHARMA());
        json.put("str_OFFICINE_ID", lstTGrossiste.get(i).getStrOFFICINEID());
        json.put("dbl_CHIFFRE_DAFFAIRE", lstTGrossiste.get(i).getDblCHIFFREDAFFAIRE());

        json.put("lg_CUSTOMER_ID", lstTGrossiste.get(i).getLgGROSSISTEID());
        if (lstTGrossiste.get(i).getLgTYPEREGLEMENTID() != null) {
            json.put("lg_TYPE_REGLEMENT_ID", lstTGrossiste.get(i).getLgTYPEREGLEMENTID().getStrNAME());
        }

        if (lstTGrossiste.get(i).getLgVILLEID() != null) {
            json.put("lg_VILLE_ID", lstTGrossiste.get(i).getLgVILLEID().getStrName());
        }
        json.put("str_STATUT", lstTGrossiste.get(i).getStrSTATUT());
        json.put("int_DELAI_REAPPROVISIONNEMENT", lstTGrossiste.get(i).getIntDELAIREAPPROVISIONNEMENT());
        json.put("int_COEF_SECURITY", lstTGrossiste.get(i).getIntCOEFSECURITY());
        json.put("int_DATE_BUTOIR_ARTICLE", lstTGrossiste.get(i).getIntDATEBUTOIRARTICLE());

        if (lstTGrossiste.get(i).getDtCREATED() != null) {
            json.put("dt_CREATED", date.DateToString(lstTGrossiste.get(i).getDtCREATED(), date.formatterShort));
        }

        if (lstTGrossiste.get(i).getDtUPDATED() != null) {
            json.put("dt_UPDATED", date.DateToString(lstTGrossiste.get(i).getDtCREATED(), date.formatterShort));
        }
        json.put("BTNDELETE", BTNDELETE);
        arrayObj.put(json);
    }
    // String result = "({\"total\":\"" + lstTGrossiste.size() + " \",\"results\":" + arrayObj.toString() + "})";
    String result = "({\"total\":\"" + lstTGrossiste.size() + " \",\"results\":" + arrayObj.toString() + "})";

%>

<%= result%>