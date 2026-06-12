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



<%
    dataManager OdataManager = new dataManager();
    List<TMenu> lstTMenu;
%>

<%
    TUser OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
    OdataManager.initEntityManager();
    try {
        List<TPrivilege> lstPrivileges = (List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE);

        lstTMenu = OdataManager.getEm().createQuery("SELECT t FROM TMenu t  WHERE t.strStatus LIKE ?1 AND t.lgMODULEID.lgMODULEID LIKE ?2 ORDER BY t.intPRIORITY ASC").
                setParameter(1, Constant.STATUT_ENABLE).
                setParameter(2, "1").
                getResultList();

        // Tous les sous-menus actifs en une seule requete (au lieu d'une requete + refresh par menu),
        // regroupes par menu parent.
        List<TSousMenu> lstAllSousMenu = OdataManager.getEm().createQuery(
                "SELECT t FROM TSousMenu t WHERE t.strStatus = ?1 AND t.lgMENUID.strStatus = ?2 AND t.lgMENUID.lgMODULEID.lgMODULEID = ?3 ORDER BY t.intPRIORITY ASC")
                .setParameter(1, Constant.STATUT_ENABLE)
                .setParameter(2, Constant.STATUT_ENABLE)
                .setParameter(3, "1")
                .getResultList();

        Map<String, List<TSousMenu>> sousMenusByMenu = new HashMap<>();
        for (TSousMenu OTSousMenu : lstAllSousMenu) {
            String menuId = OTSousMenu.getLgMENUID().getLgMENUID();
            List<TSousMenu> children = sousMenusByMenu.get(menuId);
            if (children == null) {
                children = new ArrayList<>();
                sousMenusByMenu.put(menuId, children);
            }
            children.add(OTSousMenu);
        }

        JSONArray arrayObj = new JSONArray();

        for (TMenu OTMenu : lstTMenu) {

            boolean isValid = privilege.hasAuthorityByName(lstPrivileges, OTMenu.getPKey());
            if (isValid) {
                List<TSousMenu> lstTSousMenu = sousMenusByMenu.get(OTMenu.getLgMENUID());
                if (lstTSousMenu == null) {
                    lstTSousMenu = Collections.emptyList();
                }

                JSONObject json = new JSONObject();
                //affichage des menus
                json.put("text", OTMenu.getStrDESCRIPTION());
                if (OTMenu.getStrIMAGECSS() != null) {
                    json.put("iconCls", OTMenu.getStrIMAGECSS());
                }
                JSONArray arrayObj_sub = new JSONArray();
                for (TSousMenu OTSousMenu : lstTSousMenu) {

                    boolean isValid2 = privilege.hasAuthorityByName(lstPrivileges, OTSousMenu.getPKey());
                    if (isValid2) {
                        JSONObject json_sub = new JSONObject();
                        json_sub.put("id", OTSousMenu.getStrCOMPOSANT());
                        json_sub.put("text", OTSousMenu.getStrDESCRIPTION());
                        json_sub.put("leaf", "true");
                        if (OTSousMenu.getStrIMAGECSS() != null) {
                            json_sub.put("iconCls", OTSousMenu.getStrIMAGECSS());
                        }
                        arrayObj_sub.put(json_sub);
                    }
                }
                json.put("children", arrayObj_sub);

                arrayObj.put(json);
            }
        }


%>

<%= arrayObj.toString()%>
<%
    } finally {
        OdataManager.closeEntityManager();
    }
%>
