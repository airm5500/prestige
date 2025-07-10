<%@page import="bll.configManagement.grossisteManagement"%>
<%@page import="org.json.JSONArray"%>
<%@page import="bll.common.Parameter"%>
<%@page import="dal.TOrder"%>
<%@page import="dal.TFamilleStock"%>
<%@page import="dal.TSuggestionOrderDetails"%>
<%@page import="bll.commandeManagement.suggestionManagement"%>
<%@page import="bll.commandeManagement.orderManagement"%> 
<%@page import="dal.TFamille"%>
<%@page import="dal.TGrossiste"%>
<%@page import="dal.TSuggestionOrder"%>
<%@page import="bll.warehouse.WarehouseManager"%>
<%@page import="dal.TCodeGestion"%>
<%@page import="dal.TOptimisationQuantite"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="java.math.BigInteger"  %>
<%@page import="bll.configManagement.familleManagement"  %>

<%
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    date key = new date();

    TSuggestionOrderDetails OTSuggestionOrderDetails = null;
    TSuggestionOrder OTSuggestionOrder = null;
    TFamille OTFamille = null;
    TGrossiste OTGrossiste = null;

    List<TSuggestionOrderDetails> lstTSuggestionOrderDetails = new ArrayList<>();


%>




<%    int int_TOTAL_VENTE = 0, int_TOTAL_ACHAT = 0;
    String lg_FAMILLE_ID = "", lg_SUGGESTION_ORDER_DETAILS_ID = "", lg_SUGGESTION_ORDER_ID = "", lg_GROSSISTE_ID = "", str_STATUT = "";
    String str_ref = "", code_statut = "", desc_statut = "", str_ACTION = "Suggestion de réappro";
    String modedisplay = "", str_Date_Debut = date.DateToString(new Date(), date.formatterMysqlShort), str_Date_Fin = str_Date_Debut,
            h_debut = "00:00", h_fin = "23:59", search_value = "", lg_USER_ID = "%%", str_TYPE_TRANSACTION = Parameter.LESS;

    int ALL = 0;
    int int_NUMBER = 0;
    JSONArray listFactureDeatils = new JSONArray();
    JSONArray uncheckedlist = new JSONArray();
    String SUGG_ORDER = "SUGGESTION", ID_SUGG_ORDER = "", listProductSelected = "";

    int int_PRIX_REFERENCE = 0, int_PAF = 0, lg_FAMILLE_PRIX_ACHAT = 0, lg_FAMILLE_PRIX_VENTE = 0;

    if (request.getParameter("lg_FAMILLE_ID") != null) {
        lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");
        new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID);
    }

    if (request.getParameter("int_PRIX_REFERENCE") != null) {
        int_PRIX_REFERENCE = Integer.parseInt(request.getParameter("int_PRIX_REFERENCE"));
        new logger().OCategory.info("int_PRIX_REFERENCE " + int_PRIX_REFERENCE);
    }

    if (request.getParameter("int_PAF") != null) {
        int_PAF = Integer.parseInt(request.getParameter("int_PAF"));
        new logger().OCategory.info("int_PAF " + int_PAF);
    }

    if (request.getParameter("lg_FAMILLE_PRIX_ACHAT") != null) {
        lg_FAMILLE_PRIX_ACHAT = Integer.parseInt(request.getParameter("lg_FAMILLE_PRIX_ACHAT"));
        new logger().OCategory.info("lg_FAMILLE_PRIX_ACHAT " + lg_FAMILLE_PRIX_ACHAT);
    }

    if (request.getParameter("lg_FAMILLE_PRIX_VENTE") != null) {
        lg_FAMILLE_PRIX_VENTE = Integer.parseInt(request.getParameter("lg_FAMILLE_PRIX_VENTE"));
        new logger().OCategory.info("lg_FAMILLE_PRIX_VENTE " + lg_FAMILLE_PRIX_VENTE);
    }
    //search_value
    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().oCategory.info("search_value  " + search_value);
    }

    if (request.getParameter("lg_SUGGESTION_ORDER_DETAILS_ID") != null) {
        lg_SUGGESTION_ORDER_DETAILS_ID = request.getParameter("lg_SUGGESTION_ORDER_DETAILS_ID");
        new logger().oCategory.info("lg_SUGGESTION_ORDER_DETAILS_ID  " + lg_SUGGESTION_ORDER_DETAILS_ID);
    }
    if (request.getParameter("lg_SUGGESTION_ORDER_ID") != null) {
        lg_SUGGESTION_ORDER_ID = request.getParameter("lg_SUGGESTION_ORDER_ID");
        new logger().oCategory.info("lg_SUGGESTION_ORDER_ID : " + lg_SUGGESTION_ORDER_ID);
    }
    if (request.getParameter("lg_GROSSISTE_ID") != null && !"".equals(request.getParameter("lg_GROSSISTE_ID"))) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().oCategory.info("lg_GROSSISTE_ID : " + lg_GROSSISTE_ID);
    }
    if (request.getParameter("str_STATUT") != null) {
        str_STATUT = request.getParameter("str_STATUT");
        new logger().oCategory.info("str_STATUT : " + str_STATUT);
    }
    if (request.getParameter("checkedList") != null && !"".equals(request.getParameter("checkedList"))) {
        uncheckedlist = new JSONArray(request.getParameter("checkedList").toString());

    }
    if (request.getParameter("listassuggerer") != null && !"".equals(request.getParameter("listassuggerer"))) {
        listFactureDeatils = new JSONArray(request.getParameter("listassuggerer"));

    }
    if (request.getParameter("ALL") != null && !"".equals(request.getParameter("ALL"))) {
        ALL = Integer.valueOf(request.getParameter("ALL"));

    }

    if (request.getParameter("int_NUMBER") != null && !request.getParameter("int_NUMBER").equalsIgnoreCase("")) {
        int_NUMBER = Integer.parseInt(request.getParameter("int_NUMBER"));
        new logger().OCategory.info("int_NUMBER " + int_NUMBER);
    }
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
    TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);

    ObllBase.setDetailmessage("PAS D'ACTION RETOUR");
    new logger().oCategory.info("le mode : " + request.getParameter("mode"));
    new logger().oCategory.info("ID  Famille  " + request.getParameter("lg_FAMILLE_ID"));

    WarehouseManager OWarehouseManager = new WarehouseManager(OdataManager, user);

    suggestionManagement OsuggestionManagement = new suggestionManagement(OdataManager, user);
    grossisteManagement OgrossisteManagement = new grossisteManagement(OdataManager);
    boolean answer_fusion = false;

    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").equals("onEdit")) {
            OTFamille = new familleManagement(OdataManager).getTFamille(lg_FAMILLE_ID);
            OTSuggestionOrder = OdataManager.getEm().find(TSuggestionOrder.class, lg_SUGGESTION_ORDER_ID);
            str_ref = lg_SUGGESTION_ORDER_ID;
            OTSuggestionOrderDetails = OsuggestionManagement.addToTSuggestionOrderDetails(OTFamille, OTSuggestionOrder, int_NUMBER, commonparameter.statut_is_Process);
            lstTSuggestionOrderDetails = OWarehouseManager.getSuggestionOrderDetails(lg_SUGGESTION_ORDER_ID);
            int_TOTAL_ACHAT = OWarehouseManager.getPriceTotalAchat(lstTSuggestionOrderDetails);
            int_TOTAL_VENTE = OWarehouseManager.getPriceTotalVente(lstTSuggestionOrderDetails);
            code_statut = "2";
            desc_statut = "Ce grossiste a déjà une suggestion. Cet article ira dans la liste des articles de cette suggestion";

            ObllBase.setMessage(code_statut);
            ObllBase.setDetailmessage(desc_statut);
        } else if (request.getParameter("mode").equals("create")) {

            OTGrossiste = OgrossisteManagement.getGrossiste(lg_GROSSISTE_ID);
            OTFamille = new familleManagement(OdataManager).getTFamille(lg_FAMILLE_ID);
            OTSuggestionOrder = OsuggestionManagement.isGrosssiteExistInSuggestion(OTGrossiste.getLgGROSSISTEID());
            if (OTSuggestionOrder != null) { // si un grossiste a deja une suggestion en cours
                OTSuggestionOrderDetails = OsuggestionManagement.CreateTSuggestionOrderDetails(OTSuggestionOrder, OTFamille, OTGrossiste, int_NUMBER, commonparameter.code_action_commande);
                if (OTSuggestionOrderDetails != null) {

                    code_statut = "2";
                    desc_statut = "Ce grossiste a déjà une suggestion. Cet article ira dans la liste des articles de cette suggestion";

                }
            } else { //si un grossiste n'a pas encore une suggestion créée
                OTSuggestionOrder = OdataManager.getEm().find(TSuggestionOrder.class, lg_SUGGESTION_ORDER_ID);
                if (OTSuggestionOrder != null) {
                    OTSuggestionOrderDetails = OsuggestionManagement.CreateTSuggestionOrderDetails(OTSuggestionOrder, OTFamille, OTGrossiste, int_NUMBER, commonparameter.code_action_commande);
                } else {
                    OTSuggestionOrderDetails = OsuggestionManagement.AddToTSuggestionOrderDetails(OTFamille, OTGrossiste, OTSuggestionOrder, int_NUMBER, commonparameter.statut_is_Process);
                }

            }
            if (OTSuggestionOrderDetails != null) {
                OsuggestionManagement.persiste(OTSuggestionOrderDetails);
                str_ref = OTSuggestionOrderDetails.getLgSUGGESTIONORDERID().getLgSUGGESTIONORDERID();
            }
            lstTSuggestionOrderDetails = OWarehouseManager.getTSuggestionOrderDetails(str_ref);
            int_TOTAL_ACHAT = OWarehouseManager.getPriceTotalAchat(lstTSuggestionOrderDetails);
            int_TOTAL_VENTE = OWarehouseManager.getPriceTotalVente(lstTSuggestionOrderDetails);

            ObllBase.setMessage(code_statut);
            ObllBase.setDetailmessage(desc_statut);

        } else if (request.getParameter("mode").equals("update")) {

            //mise a jour des prix
            OsuggestionManagement.updatePriceArticleByDuringCommand(lg_FAMILLE_ID, lg_FAMILLE_PRIX_VENTE, int_PRIX_REFERENCE, int_PAF, lg_FAMILLE_PRIX_ACHAT, str_ACTION, "", "");
            /*ObllBase.setMessage(OsuggestionManagement.getMessage());
             ObllBase.setDetailmessage(OsuggestionManagement.getDetailmessage());*/
            //fin mise a jour des prix 

            OTSuggestionOrderDetails = OsuggestionManagement.UpdateTSuggestionOrderDetails(lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, str_STATUT, int_PAF, lg_FAMILLE_PRIX_VENTE);
            str_ref = OTSuggestionOrderDetails.getLgSUGGESTIONORDERID().getLgSUGGESTIONORDERID();

            lstTSuggestionOrderDetails = OWarehouseManager.getTSuggestionOrderDetails(str_ref);
            int_TOTAL_ACHAT = OWarehouseManager.getPriceTotalAchat(lstTSuggestionOrderDetails);
            int_TOTAL_VENTE = OWarehouseManager.getPriceTotalVente(lstTSuggestionOrderDetails);

            ObllBase.setMessage(OsuggestionManagement.getMessage());
            ObllBase.setDetailmessage(OsuggestionManagement.getDetailmessage());
        } else if (request.getParameter("mode").equals("sendRuptureToSuggestion")) {
            if (request.getParameter("listProductSelected") != null) {
                listProductSelected = request.getParameter("listProductSelected");
                new logger().oCategory.info("listProductSelected  " + listProductSelected);
            }
            OsuggestionManagement.sendRuptureToSuggestion(listProductSelected);
            ObllBase.setMessage(OsuggestionManagement.getMessage());
            ObllBase.setDetailmessage(OsuggestionManagement.getDetailmessage());

        } else if (request.getParameter("mode").equals("doSuggestion")) {
            OsuggestionManagement.sendRuptureToSuggestion_V2(uncheckedlist, listFactureDeatils, search_value, ALL, lg_GROSSISTE_ID);
            ObllBase.setMessage(OsuggestionManagement.getMessage());
            ObllBase.setDetailmessage(OsuggestionManagement.getDetailmessage());

        }  
    }

    String result;
    if (ObllBase.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{ref:\"" + str_ref + "\",int_TOTAL_ACHAT:\"" + int_TOTAL_ACHAT + "\",int_TOTAL_VENTE:\"" + int_TOTAL_VENTE + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    } else {
        result = "{ref:\"" + str_ref + "\",answer_fusion:\"" + answer_fusion + "\",int_TOTAL_ACHAT:\"" + int_TOTAL_ACHAT + "\",int_TOTAL_VENTE:\"" + int_TOTAL_VENTE + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }


%>
<%=result%>