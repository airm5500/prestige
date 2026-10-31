<%@page import="bll.common.Parameter"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TRoleUser"  %>
<%@page import="bll.userManagement.user"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="toolkits.web.json"  %>
<%@page import=" org.json.JSONObject"  %>
<%@page import="org.json.JSONArray"  %>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.TUser"  %>
<%@page import="java.text.SimpleDateFormat"  %>

<jsp:useBean id="Os_Search_poste" class="services.Search"  scope="session"/>
<jsp:useBean id="Os_Search_poste_data" class="services.ShowDataBean" scope="session" />


<% 
    dataManager OdataManager = new dataManager();
    List<TRoleUser> lstTRoleUser = new ArrayList<TRoleUser>();
    boolean P_BT_MODIFICATION_USER = false;
    TRole OTRole = null;
     JSONArray arrayObj = new JSONArray();
     JSONObject json = null;
%>


<%   
    new logger().OCategory.info("dans ws data utilisateur");
    String lg_USER_ID = "%%", search_value = "", role = "";
       boolean etat = false;
       int start = 0, limit = jdom.int_size_pagination, total = 0;

    if (request.getParameter("start") != null) {
        start = Integer.parseInt(request.getParameter("start"));
        new logger().OCategory.info("start " + start);
    }

    if (request.getParameter("limit") != null) {
        limit = Integer.parseInt(request.getParameter("limit"));
        new logger().OCategory.info("limit " + limit);
    }
    
    

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }
    
    if (request.getParameter("etat") != null) {
        etat = Boolean.parseBoolean(request.getParameter("etat"));
        new logger().OCategory.info("etat " + etat);
    }
    
    
    if (request.getParameter("query") != null) {
        search_value = request.getParameter("query");
        new logger().OCategory.info("search_value query " + search_value);
    }

    if (request.getParameter("lg_USER_ID") != null) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
        new logger().OCategory.info("lg_USER_ID " + lg_USER_ID);
    }

    OdataManager.initEntityManager();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    user Ouser = new user(OdataManager);

    privilege Oprivilege = new privilege(OdataManager, OTUser);
    P_BT_MODIFICATION_USER = Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_BT_MODIFICATION_USER);
    OTRole = Ouser.getTRoleUser(OTUser.getLgUSERID()).getLgROLEID();
    role = (OTRole != null ? OTRole.getStrNAME() : "");
    lstTRoleUser = Ouser.showAllOrOneEmplacement(search_value, lg_USER_ID, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), OTRole, etat, start, limit);
    total = Ouser.showAllOrOneEmplacement(search_value, lg_USER_ID, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), OTRole, etat).size();

%>


<%       
    for(int i = 0; i < (lstTRoleUser.size() < limit ? lstTRoleUser.size() : limit); i++) {

        json = new JSONObject();
        json.put("lg_USER_ID", lstTRoleUser.get(i).getLgUSERID().getLgUSERID());
        json.put("str_IDS", lstTRoleUser.get(i).getLgUSERID().getStrIDS());
        json.put("str_LOGIN", lstTRoleUser.get(i).getLgUSERID().getStrLOGIN());
        // str_PASSWORD (empreinte du mot de passe) n'est plus envoye au navigateur : aucun ecran ne le lit
        json.put("str_FIRST_NAME", lstTRoleUser.get(i).getLgUSERID().getStrFIRSTNAME());
        json.put("str_LAST_NAME", lstTRoleUser.get(i).getLgUSERID().getStrLASTNAME());
        if(lstTRoleUser.get(i).getLgUSERID().getStrLASTCONNECTIONDATE() != null) {
            json.put("str_LAST_CONNECTION_DATE", date.DateToString(lstTRoleUser.get(i).getLgUSERID().getStrLASTCONNECTIONDATE(), date.formatterShort));
            json.put("str_LAST_CONNECTION_TIME", date.DateToString(lstTRoleUser.get(i).getLgUSERID().getStrLASTCONNECTIONDATE(), date.NomadicUiFormat_Time));
        } else {
            json.put("str_LAST_CONNECTION_DATE", "<span style='color: blue;'>Jamais</span>");
            json.put("str_LAST_CONNECTION_TIME", "<span style='color: blue;'>Jamais</span>");
        
        }
        
        
       
        json.put("str_STATUT", lstTRoleUser.get(i).getLgUSERID().getStrSTATUT());
        json.put("str_LIEU_TRAVAIL", lstTRoleUser.get(i).getLgUSERID().getLgEMPLACEMENTID().getStrDESCRIPTION());
        json.put("str_FIRST_LAST_NAME", lstTRoleUser.get(i).getLgUSERID().getStrFIRSTNAME() + " " +lstTRoleUser.get(i).getLgUSERID().getStrLASTNAME());
        json.put("lg_Language_ID", lstTRoleUser.get(i).getLgUSERID().getLgLanguageID().getStrDescription());
         json.put("lg_ROLE_ID", lstTRoleUser.get(i).getLgROLEID().getStrDESIGNATION());
         json.put("P_BT_MODIFICATION_USER", P_BT_MODIFICATION_USER);
        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + total + " \",\"results\":" + arrayObj.toString() + "})";


%>

<%= result%> 
