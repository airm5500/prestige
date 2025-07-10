<%@page import="dal.TParameters"%>
<%@page import="dal.TFamilleGrossiste"%>
<%@page import="bll.configManagement.familleGrossisteManagement"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.commandeManagement.bonLivraisonManagement"%>
<%@page import="bll.commandeManagement.orderManagement"%>
<%@page import="dal.TFamilleStock"%>
<%@page import="bll.teller.tellerManagement"%>
<%@page import="bll.bllBase"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TBonLivraison"  %>
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


<% Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    TFamilleGrossiste OTFamilleGrossiste = null;
    date key = new date();
%>

<%
    int DATA_PER_PAGE = jdom.int_size_pagination, count = 0, pages_curr = 0;
    new logger().OCategory.info("dans webservices.commandemanagement.bonlivraison.ws_data");
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

<%    List<TBonLivraison> lstTBonLivraison = new ArrayList<>();
    String lg_BON_LIVRAISON_ID = "%%", str_REF_LIVRAISON = "%%", search_value = "", lg_GROSSISTE_ID = "%%", str_STATUT = commonparameter.statut_is_Process;

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();

    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(OTUser);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }
    if (request.getParameter("lg_BON_LIVRAISON_ID") != null) {
        lg_BON_LIVRAISON_ID = request.getParameter("lg_BON_LIVRAISON_ID").toString();
        new logger().OCategory.info("lg_BON_LIVRAISON_ID " + lg_BON_LIVRAISON_ID);
    }
    if (request.getParameter("str_STATUT") != null) {
        str_STATUT = request.getParameter("str_STATUT").toString();
        new logger().OCategory.info("str_STATUT " + str_STATUT);
    }
    

    OdataManager.initEntityManager();

    // str_STATUT = commonparameter.statut_enable;
    bonLivraisonManagement ObonLivraisonManagement = new bonLivraisonManagement(OdataManager);
    familleGrossisteManagement OfamilleGrossisteManagement = new familleGrossisteManagement(OdataManager);
    if (!str_STATUT.equalsIgnoreCase(commonparameter.statut_enable)) {
        lstTBonLivraison = ObonLivraisonManagement.getAllBL(search_value, lg_BON_LIVRAISON_ID, str_STATUT);
    } else {
        lstTBonLivraison = ObonLivraisonManagement.getAllBL(search_value, lg_BON_LIVRAISON_ID, commonparameter.statut_enable);
    }
    TParameters OParameters = OdataManager.getEm().find(TParameters.class, "KEY_ACTIVATE_PEREMPTION_DATE");
    OdataManager.getEm().refresh(OParameters);
    new logger().OCategory.info(lstTBonLivraison.size());
%>

<%
//Filtre de pagination
    try {
        if (DATA_PER_PAGE > lstTBonLivraison.size()) {
            DATA_PER_PAGE = lstTBonLivraison.size();
        }
    } catch (Exception E) {
    }

    int pgInt = pageAsInt - 1;
    int pgInt_Last = pageAsInt - 1;

    if (pgInt == 0) {
        pgInt_Last = DATA_PER_PAGE;
    } else {

        pgInt_Last = (lstTBonLivraison.size() - (DATA_PER_PAGE * (pgInt)));
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
            OdataManager.getEm().refresh(lstTBonLivraison.get(i));

        } catch (Exception er) {
        }

        List<dal.TBonLivraisonDetail> lstTBonLivraisonDetail;

        lg_BON_LIVRAISON_ID = lstTBonLivraison.get(i).getLgBONLIVRAISONID();

        lstTBonLivraisonDetail = ObonLivraisonManagement.getTBonLivraisonDetailBis("", lg_BON_LIVRAISON_ID);
        int int_NBRE_PRODUIT_BL_DETAIL = 0;
        int int_NBRE_LIGNE_BL_DETAIL = lstTBonLivraisonDetail.size();

        String NAME = "";

        String str_Product = "";
       

        for (int k = 0; k < lstTBonLivraisonDetail.size(); k++) {
            OTFamilleGrossiste = OfamilleGrossisteManagement.findFamilleGrossiste(lstTBonLivraisonDetail.get(k).getLgFAMILLEID().getLgFAMILLEID(), lstTBonLivraisonDetail.get(k).getLgBONLIVRAISONID().getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID());
            str_Product = "<b><span style='display:inline-block;width: 7%;'>" + (OTFamilleGrossiste != null ? OTFamilleGrossiste.getStrCODEARTICLE() : lstTBonLivraisonDetail.get(k).getLgFAMILLEID().getIntCIP()) + "</span><span style='display:inline-block;width: 25%;'>" + lstTBonLivraisonDetail.get(k).getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 10%;'>(" + lstTBonLivraisonDetail.get(k).getIntQTECMDE() + ")</span><span style='display:inline-block;width: 15%;'>" + conversion.AmountFormat(lstTBonLivraisonDetail.get(k).getIntPAF(), '.') + " F CFA " + "</span></b><br> " + str_Product;
            int_NBRE_PRODUIT_BL_DETAIL = int_NBRE_PRODUIT_BL_DETAIL + lstTBonLivraisonDetail.get(k).getIntQTECMDE();
        }

        //  new logger().OCategory.info(" PRIX_HORS_TAXE_OFFICINE " + PRIX_HORS_TAXE_OFFICINE);
        JSONObject json = new JSONObject();
//lstTBonLivraison.get(i).getLgORDERID()
        json.put("lg_BON_LIVRAISON_ID", lstTBonLivraison.get(i).getLgBONLIVRAISONID());
        json.put("str_REF_LIVRAISON", lstTBonLivraison.get(i).getStrREFLIVRAISON());
        json.put("int_NBRE_LIGNE_BL_DETAIL", int_NBRE_LIGNE_BL_DETAIL);
        json.put("lg_USER_ID", lstTBonLivraison.get(i).getLgUSERID().getStrFIRSTNAME() + " " + lstTBonLivraison.get(i).getLgUSERID().getStrLASTNAME());
        json.put("str_REF_ORDER", lstTBonLivraison.get(i).getLgORDERID().getStrREFORDER());
        json.put("lg_GROSSISTE_ID", lstTBonLivraison.get(i).getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID());
        json.put("str_GROSSISTE_LIBELLE", lstTBonLivraison.get(i).getLgORDERID().getLgGROSSISTEID().getStrLIBELLE());

        json.put("int_MHT", conversion.AmountFormat(lstTBonLivraison.get(i).getIntMHT(), '.'));
        json.put("int_TVA", conversion.AmountFormat(lstTBonLivraison.get(i).getIntTVA(), '.'));
        json.put("int_HTTC", conversion.AmountFormat(lstTBonLivraison.get(i).getIntHTTC(), '.'));

        json.put("str_FAMILLE_ITEM", str_Product);

        json.put("int_NBRE_PRODUIT", int_NBRE_PRODUIT_BL_DETAIL);

        json.put("PRIX_ACHAT_TOTAL", conversion.AmountFormat(ObonLivraisonManagement.getPrixAchatBonLivraisonMachine(lstTBonLivraisonDetail), '.'));
        json.put("DISPLAYFILTER", true);
       if ("1".equals(OParameters.getStrVALUE())) {
         json.put("DISPLAYFILTER", false);  
       }

        json.put("str_STATUT", lstTBonLivraison.get(i).getStrSTATUT());
        json.put("dt_DATE_LIVRAISON", key.DateToString(lstTBonLivraison.get(i).getDtDATELIVRAISON(), key.formatterShort));
        json.put("dt_CREATED", key.DateToString(lstTBonLivraison.get(i).getDtCREATED(), key.formatterOrange));
        json.put("dt_CREATED", key.DateToString(lstTBonLivraison.get(i).getDtUPDATED(), key.formatterOrange));

        arrayObj.put(json);
    }
    String result = "({\"total\":\"" + lstTBonLivraison.size() + " \" ,\"results\":" + arrayObj.toString() + "})";
   
%>

<%= result%>