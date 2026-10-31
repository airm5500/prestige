<%@page import="bll.common.Parameter"%>
<%@page import="bll.preenregistrement.Preenregistrement"%>
<%@page import="bll.utils.TparameterManager"%>
<%@page import="dal.TOfficine"%>
<%@page import="bll.configManagement.EmplacementManagement"%>
<%@page import="dal.TRoleUser"%>
<%@page import="dal.TRole"%>
<%@page import="bll.userManagement.user"%>
<%@page import="dal.TUser"%>
<%@page import="bll.userManagement.authentification"%>

<%@page import="bll.stockManagement.StockManager"%>
<%@page import="dal.dataManager"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>

<%@page import="org.json.JSONObject"  %>
<%@page import="org.json.JSONArray"  %>
<%@page import="toolkits.utils.jdom"  %>
<%@page import="toolkits.utils.logger"  %>
<%@page import="java.text.SimpleDateFormat"  %>

<%@page import="dal.TPrivilege"  %>
<%@page import="bll.userManagement.privilege"  %>


<jsp:useBean id="Os_Search_poste" class="services.Search"  scope="session"/>
<jsp:useBean id="Os_Search_poste_data" class="services.ShowDataBean" scope="session" />


<%
    String Str_PASSWORD = "", str_LOGIN = "", xtypeuser = "mainmenumanager";
    privilege Oprivilege = new privilege();


%>


<%    if ((request.getParameter("Str_PASSWORD") != null)) {
        Str_PASSWORD = request.getParameter("Str_PASSWORD").toString();
    }

    if ((request.getParameter("str_LOGIN") != null)) {
        str_LOGIN = request.getParameter("str_LOGIN").toString();
    }

    TUser connectedUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    if (connectedUser != null && connectedUser.getStrLOGIN() != null
            && !connectedUser.getStrLOGIN().trim().equalsIgnoreCase(str_LOGIN.trim())) {
        JSONObject conflict = new JSONObject();
        conflict.put("code_statut", "0");
        conflict.put("errorCode", "DIFFERENT_USER_ALREADY_CONNECTED");
        conflict.put("desc_statut", "Un autre utilisateur est deja connecte dans ce navigateur. Deconnectez-le avant de changer de compte.");
        JSONArray conflicts = new JSONArray();
        conflicts.put(conflict);
        response.setStatus(HttpServletResponse.SC_CONFLICT);
        response.setContentType("application/json");
        out.print(conflicts.toString());
        return;
    }

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();

    authentification Oauthentification = new authentification(OdataManager);
    EmplacementManagement OEmplacementManagement = new EmplacementManagement(OdataManager);
    TparameterManager OTparameterManager = new TparameterManager(OdataManager);
    TOfficine OTOfficine = OEmplacementManagement.getOfficine();
    user Ouser = new user(OdataManager);

    JSONObject json = new JSONObject();
    JSONArray arrayObj = new JSONArray();

    if (!Oauthentification.loginUser(Str_PASSWORD, str_LOGIN)) {
    } else {
        TUser OTUser = Oauthentification.getOTUser();
        json.put("str_LOGIN", OTUser.getStrLOGIN());
        json.put("str_USER_ID", OTUser.getLgUSERID());
        json.put("str_FIRST_NAME", OTUser.getStrFIRSTNAME());
        json.put("str_LAST_NAME", OTUser.getStrLASTNAME());
        json.put("str_PHONE", OTUser.getStrPHONE());

        TRoleUser OTRoleUser = Ouser.getTRoleUser(OTUser.getLgUSERID());
        if (OTRoleUser != null && OTRoleUser.getLgROLEID() != null) { //a remettre apres optimisation du dashbord
            xtypeuser = (OTRoleUser.getLgROLEID().getStrNAME().equalsIgnoreCase(commonparameter.ROLE_PHARMACIEN) || OTRoleUser.getLgROLEID().getStrNAME().equalsIgnoreCase(commonparameter.ROLE_SUPERADMIN) || OTRoleUser.getLgROLEID().getStrNAME().equalsIgnoreCase(commonparameter.ROLE_ADMIN) ? "dashboard" : "mainmenumanager");
        }
        json.put("xtypeuser", xtypeuser);

        json.put("str_PIC", "../general/resources/images/photo_personne/" + OTUser.getStrPIC());
        json.put("lg_EMPLACEMENT_ID", OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        json.put("OFFICINE", OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS) ? OTOfficine.getStrNOMABREGE() : OTUser.getLgEMPLACEMENTID().getStrDESCRIPTION());

        //Login ok
        //Chargement des privilege en session
        Oprivilege.LoadMultilange(new Translate());
        Oprivilege.LoadDataManger(OdataManager);

        List<TPrivilege> LstTPrivilege = Oprivilege.GetAllPrivilege(Oauthentification.getOTUser());
        // OStockManager.updateStockFamille(); // 17/06/2016
        OTparameterManager.updateSpecialMovementDate();
        // OTparameterManager.setJobOfDatabase(); //code ajouté 26/03/2017
        /* OStockManager.updateStockFamille();
         OfamilleManagement.updateSeuil();*/
        Oprivilege.setOTUser(Oauthentification.getOTUser());
        boolean bool_UPDATE_PRICE = Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_BT_UPDATE_PRICE_EDIT);
        OdataManager.getEm().refresh(Oauthentification.getOTUser());
        session.setAttribute(commonparameter.AIRTIME_USER, Oauthentification.getOTUser());
        session.setAttribute(commonparameter.USER_LIST_PRIVILEGE, LstTPrivilege);
        session.setAttribute(commonparameter.UPDATE_PRICE, bool_UPDATE_PRICE);
      

        //affichage des données de bienvenue sur l'afficheur de caisse
        new Preenregistrement(OdataManager, Oauthentification.getOTUser()).reinitializeDisplay(OTOfficine.getStrNOMABREGE(), "Caisse: " + Oauthentification.getOTUser().getStrFIRSTNAME());

        //fin affichage des données de bienvenue sur l'afficheur de caisse
    }

    json.put("desc_statut", Oauthentification.getDetailmessage());
    json.put("code_statut", Oauthentification.getMessage());

    arrayObj.put(json);

    String result = arrayObj.toString();

%>

<%= result%>