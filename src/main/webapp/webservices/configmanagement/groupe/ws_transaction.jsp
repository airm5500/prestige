

<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TGroupeFactures"%>
<%@page import="bll.facture.factureManagement"%>
<%@page import="org.json.JSONArray"%>
<%@page import="dal.TGroupeTierspayant"%>
<%@page import="bll.configManagement.GroupeTierspayantController"%>
<%@page import="dal.TUser"%>


<%@page import="org.json.JSONException"%>

<%@page import="bll.bllBase"%>
<%@page import="dal.dataManager"  %>

<%@page import="java.util.*"  %>

<%@page import="toolkits.utils.date"  %>

<%@page import="org.json.JSONObject"  %>          

<%@page import="toolkits.utils.jdom"  %>



<%
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    dataManager OdataManager = new dataManager();

    OdataManager.initEntityManager();
    TUser user=OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    int lg_GROUPE_ID = 0, mode = 0;
    String str_LIBELLE = "", search_value = "%%", str_TELEPHONE = "", str_ADRESSE = "", CODEFACTURE = "", LGFACTURE = "";
    String str_MODE_TRI_FACTURE = "ALPHABETIQUE";
    boolean isOK = false;
    Integer MONTANTRESTANT = 0;
    TGroupeTierspayant gtp = null;
    JSONArray listtp = new JSONArray();
    if (request.getParameter("MONTANTRESTANT") != null && !"".equals(request.getParameter("MONTANTRESTANT"))) {
        MONTANTRESTANT =  Integer.valueOf(request.getParameter("MONTANTRESTANT"));
    }
    if (request.getParameter("LGFACTURE") != null && !"".equals(request.getParameter("LGFACTURE"))) {
        LGFACTURE = request.getParameter("LGFACTURE");
    }

    if (request.getParameter("CODEFACTURE") != null && !"".equals(request.getParameter("CODEFACTURE"))) {
        CODEFACTURE = request.getParameter("CODEFACTURE");
    }
    if (request.getParameter("lg_GROUPE_ID") != null && !"".equals(request.getParameter("lg_GROUPE_ID"))) {
        lg_GROUPE_ID = Integer.valueOf(request.getParameter("lg_GROUPE_ID"));
    }
    if (request.getParameter("mode") != null && !"".equals(request.getParameter("mode"))) {
        mode = Integer.valueOf(request.getParameter("mode"));
    }
    if (request.getParameter("listtp") != null && !"".equals(request.getParameter("listtp"))) {
        listtp = new JSONArray(request.getParameter("listtp"));
    }
    if (request.getParameter("str_LIBELLE") != null && !"".equals(request.getParameter("str_LIBELLE"))) {
        str_LIBELLE = request.getParameter("str_LIBELLE");
    }
    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }

    if (request.getParameter("str_ADRESSE") != null && !"".equals(request.getParameter("str_ADRESSE"))) {
        str_ADRESSE = request.getParameter("str_ADRESSE");
    }
    if (request.getParameter("str_TELEPHONE") != null && !"".equals(request.getParameter("str_TELEPHONE"))) {
        str_TELEPHONE = request.getParameter("str_TELEPHONE");
    }
    if (request.getParameter("str_MODE_TRI_FACTURE") != null && !"".equals(request.getParameter("str_MODE_TRI_FACTURE"))) {
        str_MODE_TRI_FACTURE = request.getParameter("str_MODE_TRI_FACTURE");
    }
    GroupeTierspayantController groupeCtl = new GroupeTierspayantController(OdataManager.getEmf());
    JSONObject data = new JSONObject();

    switch (mode) {
        case 0:
            gtp = new TGroupeTierspayant();
            gtp.setStrLIBELLE(str_LIBELLE);
            gtp.setStrADRESSE(str_ADRESSE);
            gtp.setStrTELEPHONE(str_TELEPHONE);
            gtp.setStrMODETRIFACTURE(GroupeTierspayantController.normalizeModeTri(str_MODE_TRI_FACTURE));
            isOK = groupeCtl.create(gtp);
            data.put("status", (isOK) ? 1 : 0);
            break;
        case 1:
            isOK = groupeCtl.edit(lg_GROUPE_ID, str_LIBELLE, str_ADRESSE, str_TELEPHONE, str_MODE_TRI_FACTURE);
            data.put("status", (isOK) ? 1 : 0);
            break;
        case 2:
            isOK = groupeCtl.destroy(lg_GROUPE_ID);
            data.put("status", (isOK) ? 1 : 0);
            break;
        case 3:
            data = groupeCtl.addTiersPayants2Groupe(listtp, lg_GROUPE_ID);
            break;
        case 4:
            data = groupeCtl.removeTiersPayants2Groupe(listtp, lg_GROUPE_ID);
            break;
        case 5:
            data = groupeCtl.addSelection2Groupe(lg_GROUPE_ID, search_value);
            break;
        case 6:
            data = groupeCtl.removeSelection2Groupe(lg_GROUPE_ID, search_value);
            break;
        case 7:
            boolean okDeleted = true; 
            factureManagement OfactureManagement = new factureManagement(OdataManager, user);
            List<TGroupeFactures> factureses = groupeCtl.getgroupeFacturesByCodeFacture(CODEFACTURE, lg_GROUPE_ID);
         
            for (TGroupeFactures obj : factureses) {
               
                if (!OfactureManagement.deleteInvoice(obj.getLgFACTURESID().getLgFACTUREID(),user)) {
                    okDeleted = false;
                }
            }
            if (okDeleted) {
                data.put("status", 1);
            } else {
                data.put("status", 0);
            }

            break;
        case 8:
            okDeleted = groupeCtl.updateGroupFactureAmount(LGFACTURE, MONTANTRESTANT);
            if (okDeleted) {
                data.put("status", 1);
            } else {
                data.put("status", 0);
            }
            break;
        default:
            break;
    }


%>

<%= data%>