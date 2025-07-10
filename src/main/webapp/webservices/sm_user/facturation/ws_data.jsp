<%@page import="org.apache.commons.lang3.StringUtils"%>
<%@page import="util.DateConverter"%>
<%@page import="dal.TPrivilege"%>
<%@page import="dal.TGroupeFactures"%>
<%@page import="bll.Util"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TTypeTiersPayant"%>
<%@page import="dal.TFacture"%>
<%@page import="bll.facture.factureManagement"%>
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



<%
    dataManager OdataManager = new dataManager();

    date key = new date();

    Date dt_debut, dt_fin;
    String lg_FACTURE_ID = "%%", lg_customer_id = "%%", lg_TYPE_FACTURE_ID = "%%", search_value = "", CODEGROUPE = "";
    String impayes = null;
    if (StringUtils.isNotEmpty(request.getParameter("impayes"))) {
        impayes = request.getParameter("impayes");

    }
    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");

    }
    if (request.getParameter("CODEGROUPE") != null && request.getParameter("CODEGROUPE") != "") {
        CODEGROUPE = request.getParameter("CODEGROUPE");

    }
    if (request.getParameter("lg_FACTURE_ID") != null && request.getParameter("lg_FACTURE_ID") != "") {
        lg_FACTURE_ID = request.getParameter("lg_FACTURE_ID");

    }

    if (request.getParameter("lg_TYPE_FACTURE_ID") != null && request.getParameter("lg_TYPE_FACTURE_ID") != "") {
        lg_TYPE_FACTURE_ID = request.getParameter("lg_TYPE_FACTURE_ID");

    }

    if (request.getParameter("lg_customer_id") != null && request.getParameter("lg_customer_id") != "") {
        lg_customer_id = request.getParameter("lg_customer_id");

    }

    if (request.getParameter("dt_fin") != null && request.getParameter("dt_fin") != "") {
        dt_fin = key.stringToDate(request.getParameter("dt_fin"), key.formatterMysqlShort);
    } else {
        dt_fin = key.GetNewDate(0);

    }

    if (request.getParameter("dt_debut") != null && request.getParameter("dt_debut") != "") {
        dt_debut = key.stringToDate(request.getParameter("dt_debut"), key.formatterMysqlShort);

    } else {

        dt_debut = date.getPreviousMonth(0);

    }
    if (request.getParameter("CODEGROUPE") != null && request.getParameter("CODEGROUPE") != "") {
        CODEGROUPE = request.getParameter("CODEGROUPE");

    }

    String OdateFin = key.DateToString(dt_fin, key.formatterMysqlShort2), OdateDebut = key.DateToString(dt_debut, key.formatterMysqlShort2);;
    dt_debut = key.getDate(OdateDebut, "00:00");
    dt_fin = key.getDate(OdateFin, "23:59");
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    OdataManager.initEntityManager();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    factureManagement OfactureManagement = new factureManagement(OdataManager, OTUser);
    List<TFacture> lstTFacture = OfactureManagement.getListFacture(search_value, lg_FACTURE_ID, lg_TYPE_FACTURE_ID, dt_debut, dt_fin, lg_customer_id, CODEGROUPE, impayes, start, limit);
    int count = OfactureManagement.getListFacturesCount(search_value, lg_FACTURE_ID, lg_TYPE_FACTURE_ID, dt_debut, dt_fin, lg_customer_id, CODEGROUPE, impayes);
    JSONArray arrayObj = new JSONArray();
    //   boolean isALLOWED = Util.isAllowed(OdataManager.getEm(), Util.ACTIONDELETEINVOICE, OTUser.getTRoleUserCollection().stream().findFirst().get().getLgROLEID().getLgROLEID());
    //  boolean ACTION_REGLER_FACTURE = Util.isAllowed(OdataManager.getEm(), Util.ACTION_REGLER_FACTURE, OTUser.getTRoleUserCollection().stream().findFirst().get().getLgROLEID().getLgROLEID());
    List<TPrivilege> LstTPrivilege = (List<TPrivilege>) session.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    boolean isALLOWED = DateConverter.hasAuthorityById(LstTPrivilege, Util.ACTIONDELETEINVOICE);
    boolean ACTION_REGLER_FACTURE = DateConverter.hasAuthorityById(LstTPrivilege, Util.ACTION_REGLER_FACTURE);

    for (TFacture of : lstTFacture) {
        TTiersPayant OTTiersPayant = (TTiersPayant) OfactureManagement.getgetOrganisme(of.getLgTYPEFACTUREID().getLgTYPEFACTUREID(), of.getStrCUSTOMER());
        JSONObject json = new JSONObject();
        json.put("lg_FACTURE_ID", of.getLgFACTUREID());
        json.put("str_CODE_FACTURE", of.getStrCODEFACTURE());
        json.put("int_NB_DOSSIER", of.getIntNBDOSSIER());
        json.put("dt_CREATED", key.DateToString(of.getDtDATEFACTURE(), key.formatterShort));
        String statut = of.getStrSTATUT();
        String codeGroupe = "";
        if ("enable".equals(statut)) {
            codeGroupe = OfactureManagement.getGroupeFacturesCodeByFacture(of.getLgFACTUREID());
            if (codeGroupe != null) {
                statut = "group";
            }
        }
        json.put("str_STATUT", statut);
        json.put("lg_TYPE_FACTURE_ID", of.getLgTYPEFACTUREID().getStrLIBELLE());
        json.put("str_CUSTOMER_NAME", OTTiersPayant.getStrFULLNAME());
        json.put("str_PERIODE", "Du " + key.DateToString(of.getDtDEBUTFACTURE(), key.formatterShort) + " Au " + key.DateToString(of.getDtFINFACTURE(), key.formatterShort));
        json.put("dbl_MONTANT_CMDE", of.getDblMONTANTCMDE());
        json.put("dbl_MONTANT_RESTANT", of.getDblMONTANTRESTANT());
        json.put("dbl_MONTANT_PAYE", of.getDblMONTANTPAYE());
        json.put("MONTANTREMISE", of.getDblMONTANTREMISE());
        json.put("MONTANTFORFETAIRE", of.getDblMONTANTFOFETAIRE());
        json.put("MONTANTBRUT", of.getDblMONTANTBrut());
        json.put("str_CUSTOMER", of.getStrCUSTOMER());
        json.put("CODEGROUPE", codeGroupe);
        json.put("lg_TYPE_TIERS_PAYANT_ID", OTTiersPayant.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT());
        json.put("isALLOWED", isALLOWED);
        json.put("ACTION_REGLER_FACTURE", ACTION_REGLER_FACTURE);
        arrayObj.put(json);
    }
    String result = "({\"total\":\"" + count + " \",\"results\":" + arrayObj.toString() + "})";
%>

<%= result%>