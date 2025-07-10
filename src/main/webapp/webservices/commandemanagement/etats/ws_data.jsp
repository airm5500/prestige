<%@page import="bll.common.Parameter"%>
<%@page import="util.DateConverter"%>
<%@page import="dal.TPrivilege"%>
<%@page import="bll.commandeManagement.bonLivraisonManagement"%>
<%@page import="dal.TBonLivraisonDetail"%>
<%@page import="bll.entity.EntityData"%>
<%@page import="bll.warehouse.WarehouseManager"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="bll.teller.SnapshotManager"%>
<%@page import="java.text.NumberFormat"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TWarehouse"%>
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

<%@page import=" org.json.JSONObject"  %>
<%@page import="org.json.JSONArray"  %>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.TUser"  %>
<%@page import="java.text.SimpleDateFormat"  %>


<%  dataManager OdataManager = new dataManager();
    List<Object[]> lstEntityData = new ArrayList<>();
    JSONArray arrayObj = new JSONArray();
    JSONObject json = null;
    Object[] OObject = null;
      TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
       List<TPrivilege> LstTPrivilege = (List<TPrivilege>) session.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
       
%>


<%
    new logger().OCategory.info("dans ws data etat controle achat");

    String lg_GROSSISTE_ID = "%%", search_value = "", dt_DEBUT = date.DateToString(new Date(), date.formatterMysqlShort), dt_FIN = dt_DEBUT;
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

    if (request.getParameter("lg_GROSSISTE_ID") != null && !request.getParameter("lg_GROSSISTE_ID").equals("")) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
    }

    if (request.getParameter("datedebut") != null && !request.getParameter("datedebut").equals("")) {
        dt_DEBUT = request.getParameter("datedebut");
        new logger().OCategory.info("dt_DEBUT " + dt_DEBUT);
    }
    if (request.getParameter("datefin") != null && !request.getParameter("datefin").equals("")) {
        dt_FIN = request.getParameter("datefin");
        new logger().OCategory.info("dt_FIN " + dt_FIN);
    }


    OdataManager.initEntityManager();
      TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    WarehouseManager OWarehouseManager = new WarehouseManager(OdataManager,user);
    bonLivraisonManagement ObonLivraisonManagement = new bonLivraisonManagement(OdataManager,user);

    lstEntityData = OWarehouseManager.listeEtatControleAchat(search_value, dt_DEBUT, dt_FIN, lg_GROSSISTE_ID, start, limit);
    total = OWarehouseManager.listeEtatControleAchat(search_value, dt_DEBUT, dt_FIN, lg_GROSSISTE_ID).size();
     boolean asAuthority =DateConverter .hasAuthorityByName(LstTPrivilege, Parameter.ACTION_RETURN_FULL_BL);
%>

<%
    for (int i = 0; i < (lstEntityData.size() < limit ? lstEntityData.size() : limit); i++) {
        json = new JSONObject();
        OObject = lstEntityData.get(i);
        boolean status= asAuthority;
   
        if( OObject[13].toString().equals(DateConverter.STATUT_DELETE) || Integer.parseInt(OObject[4].toString()) <0){
        status=false;
    }
  
         json.put("RETURN_FULL_BL", status);
        json.put("str_ORDER_REF", OObject[5]);
        json.put("str_BL_REF", OObject[0]);
        json.put("int_ORDER_PRICE", Integer.parseInt(OObject[2].toString()));
        //json.put("int_BL_PRICE", OObject[4]);  //a decommenter en cas de probleme
        json.put("int_BL_PRICE", Integer.parseInt(OObject[4].toString()) );
        json.put("int_AMOUNT_AVOIR", Integer.parseInt(OObject[11].toString()) );
        json.put("IDGROSSISTE", OObject[12].toString() );
        
        json.put("dt_DATE_LIVRAISON", date.DateToString(date.stringToDate(OObject[1].toString()), date.formatterShort));
        json.put("int_TVA", OObject[3]);
        json.put("dt_UPDATED", (OObject[7] != null ? date.DateToString(date.stringToDate(OObject[7].toString()), date.formatterShort) : ""));
        json.put("str_LIBELLE", OObject[6]);
        json.put("lg_USER_ID", OObject[8] + " " + OObject[9]);
        json.put("lg_BON_LIVRAISON_ID", OObject[10]);

        List<TBonLivraisonDetail> lstTBonLivraisonDetail = new ArrayList<>();
        lstTBonLivraisonDetail = ObonLivraisonManagement.getTBonLivraisonDetail(OObject[10].toString(), commonparameter.statut_is_Closed);
        String str_Product = "";
        for (int k = 0; k < lstTBonLivraisonDetail.size(); k++) {
            str_Product = "<b><span style='display:inline-block;width: 7%;'>" + lstTBonLivraisonDetail.get(k).getLgFAMILLEID().getIntCIP() + "</span><span style='display:inline-block;width: 25%;'>" + lstTBonLivraisonDetail.get(k).getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 15%;'>Qte Cmdée: (" + lstTBonLivraisonDetail.get(k).getIntQTECMDE() + ")</span><span style='display:inline-block;width: 15%;'>Qte Livrée: (" + (lstTBonLivraisonDetail.get(k).getIntQTERECUE() - lstTBonLivraisonDetail.get(k).getIntQTEUG()) + ")</span><span style='display:inline-block;width: 15%;'>Unité gratuite: (" + lstTBonLivraisonDetail.get(k).getIntQTEUG() + ")</span><span style='display:inline-block;width: 15%;'>Avoir (" + (lstTBonLivraisonDetail.get(k).getIntQTERETURN() != null ? lstTBonLivraisonDetail.get(k).getIntQTERETURN() : 0) + ")</span></b><br> " + str_Product;
        }
        json.put("str_FAMILLE_ITEM", str_Product);
        arrayObj.put(json);
    }

    String result = "({\"total\":\"" + total + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);

%>

<%= result%>