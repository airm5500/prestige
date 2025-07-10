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


<% Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    String strLASTNAME = "%%",str_IDS = "%%", strFIRSTNAME = "%%", strLOGIN = "%%", lg_ROLE_ID = "", lg_USER_ID = "%%", lg_SKIN_ID = "%%", lg_Language_ID = "%%", str_PASSWORD = "%%";
    date key = new date();
    date str_LAST_CONNECTION_DATE;
    privilege Oprivilege = new privilege();
    json Ojson = new json();
    List<TUser> lstTUser = new ArrayList<>();

%>



<%

    new logger().OCategory.info("dans ws data utilisateur");

    if (request.getParameter("search_value") != null) {
        Os_Search_poste.setOvalue("%" + request.getParameter("search_value") + "%");
        new logger().OCategory.info("Search book " + request.getParameter("search_value"));
    } else {
        Os_Search_poste.setOvalue("%%");
    }
    new logger().OCategory.info("search_value  = " + request.getParameter("search_value"));

    if (request.getParameter("lg_USER_ID") != null) {
        if (request.getParameter("lg_USER_ID").toString().equals("ALL")) {
            lg_USER_ID = "%%";
        } else {
            lg_USER_ID = request.getParameter("lg_USER_ID").toString();
        }

    }

    OdataManager.initEntityManager();
    lstTUser = OdataManager.getEm().createQuery("SELECT t FROM TUser t WHERE t.strLOGIN LIKE ?1 AND t.strFIRSTNAME LIKE ?2 AND t.strLASTNAME LIKE ?3  AND  t.lgUSERID LIKE ?4 AND t.strSTATUT LIKE ?5").setParameter(1, strLOGIN).setParameter(2, Os_Search_poste.getOvalue()).setParameter(3, strLASTNAME).setParameter(4, lg_USER_ID).setParameter(5, commonparameter.statut_enable).getResultList();

    JSONArray arrayObj = new JSONArray();
    for (int i = 0; i < lstTUser.size(); i++) {

        String Role = "";

        try {
            OdataManager.getEm().refresh(lstTUser.get(i));

            Iterator iteraror = lstTUser.get(i).getTRoleUserCollection().iterator();
            while (iteraror.hasNext()) {

                Object el = iteraror.next();
                OdataManager.getEm().refresh((TRoleUser) el);
                OdataManager.getEm().refresh(((TRoleUser) el).getLgROLEID());

                Role = Role + " " + ((TRoleUser) el).getLgROLEID().getStrDESIGNATION();
                
                 OdataManager.getEm().refresh(Role);
            }

        } catch (Exception er) {
        }

        JSONObject json = new JSONObject();
        json.put("lg_USER_ID", lstTUser.get(i).getLgUSERID());
        // str_IDS
        json.put("str_IDS", lstTUser.get(i).getStrIDS());
        json.put("str_LOGIN", lstTUser.get(i).getStrLOGIN());
        json.put("str_PASSWORD", lstTUser.get(i).getStrPASSWORD());
        json.put("str_FIRST_NAME", lstTUser.get(i).getStrFIRSTNAME());
        json.put("str_LAST_NAME", lstTUser.get(i).getStrLASTNAME());
        json.put("str_LAST_CONNECTION_DATE", date.DateToString(lstTUser.get(i).getStrLASTCONNECTIONDATE(), new SimpleDateFormat("yyyy/MM/dd")));
        json.put("str_STATUT", lstTUser.get(i).getStrSTATUT());
        json.put("lg_Language_ID", lstTUser.get(i).getLgLanguageID().getStrDescription());
        json.put("lg_ROLE_ID", Role);
        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + lstTUser.size() + " \",\"results\":" + arrayObj.toString() + "})";


%>

<%= result%>
