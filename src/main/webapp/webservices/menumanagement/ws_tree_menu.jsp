<%@page import="util.Constant"%>
<%@page import="dal.TMenu"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TRoleUser"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="toolkits.web.json"  %>
<%@page import="org.json.JSONObject"  %>
<%@page import="org.json.JSONArray"  %>
<%@page import="toolkits.utils.jdom"  %>
<%@page import="toolkits.utils.logger"  %>
<%@page import="java.text.SimpleDateFormat"  %>
<%@page import="dal.TPrivilege"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="dal.TSousMenu"  %>

<jsp:useBean id="Os_Search_poste" class="services.Search"  scope="session"/>
<jsp:useBean id="Os_Search_poste_data" class="services.ShowDataBean" scope="session" />



<%  Translate OTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    String strLASTNAME = "%%", strFIRSTNAME = "%%", strLOGIN = "%%", lg_ROLE_ID = "", lg_USER_ID = "";
    date key = new date();
    privilege Oprivilege = new privilege();
    json Ojson = new json();
    List<TMenu> lstTMenu = new ArrayList<>();
%>

<%
    TUser OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
    new logger().OCategory.info(" ws tree_menu TUser  " + OTUser.getStrLOGIN());
    OdataManager.initEntityManager();
    Oprivilege.LoadDataManger(OdataManager);
    Oprivilege.LoadMultilange(OTranslate);
    Oprivilege.setOTUser(OTUser);

    lstTMenu = OdataManager.getEm().createQuery("SELECT t FROM TMenu t  WHERE t.strStatus LIKE ?1 AND t.lgMODULEID.lgMODULEID LIKE ?2 ORDER BY t.intPRIORITY ASC").
            setParameter(1, Constant.STATUT_ENABLE).
            setParameter(2, "1").
            getResultList();
    new logger().OCategory.info(" lstTMenu " + lstTMenu.size());

    JSONArray arrayObj = new JSONArray();

    for (int i = 0; i < lstTMenu.size(); i++) {

        OdataManager.getEm().refresh(lstTMenu.get(i));

        boolean isValid = privilege.hasAuthorityByName((List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE), lstTMenu.get(i).getPKey());
        if (isValid) {
//    if (Oprivilege.isAvalaible(lstTMenu.get(i).getPKey())) {
            List<TSousMenu> lstTSousMenu = new ArrayList<>();
            lstTSousMenu = OdataManager.getEm().createQuery("SELECT t FROM TSousMenu t WHERE t.lgMENUID.lgMENUID = ?1  AND t.strStatus = ?2 ORDER BY t.intPRIORITY ASC")
                    .setParameter(1, lstTMenu.get(i).getLgMENUID())
                    .setParameter(2, Constant.STATUT_ENABLE)
                    .getResultList();

            JSONObject json = new JSONObject();
            //affichage des menus
            json.put("text", lstTMenu.get(i).getStrDESCRIPTION());
            if (lstTMenu.get(i).getStrIMAGECSS() != null) { // a decommenter si bonne image trouvée
                json.put("iconCls", lstTMenu.get(i).getStrIMAGECSS());
            }
            //json.put("expanded", "false");
            JSONArray arrayObj_sub = new JSONArray();
            for (int j = 0; j < lstTSousMenu.size(); j++) {
                TSousMenu OTSousMenu = lstTSousMenu.get(j);
                OdataManager.getEm().refresh(OTSousMenu);
                JSONObject json_sub = new JSONObject();

                boolean isValid2 = privilege.hasAuthorityByName((List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE), lstTSousMenu.get(j).getPKey());
                //if (Oprivilege.isAvalaible(lstTSousMenu.get(j).getPKey())) {
                if (isValid2) {
                    json_sub.put("id", OTSousMenu.getStrCOMPOSANT());
                    json_sub.put("text", OTSousMenu.getStrDESCRIPTION());//leaf:true
                    json_sub.put("leaf", "true");
                    if (OTSousMenu.getStrIMAGECSS() != null) { // a decommenter si bonne image trouvée
                        json.put("iconCls", OTSousMenu.getStrIMAGECSS());
                    }
                    //json_sub.put("iconCls", "export_csv_icon");
                    arrayObj_sub.put(json_sub);

                }
                json.put("children", arrayObj_sub);
            }

            arrayObj.put(json);
        }
    }


%>

<%= arrayObj.toString()%>