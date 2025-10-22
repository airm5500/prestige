<%-- 
    Document   : create
    Created on : 5 déc. 2015, 12:53:58
    Author     : KKOFFI
--%>




<%@page import="bll.commandeManagement.bonLivraisonManagement"%>
<%@page import="org.json.JSONObject"%>
<%@page import="dal.dataManager"%>


<%
    dataManager OdataManager = new dataManager();
    bonLivraisonManagement livraisonManagement = new bonLivraisonManagement(OdataManager);
    String lg_LOT_ID = "", int_NUMBER = "", int_SORTIE_USINE = "",
            str_PEREMPTION = "", lg_TYPEETIQUETTE_ID = "", int_NUM_LOT = "", int_QUANTITE_FREE = "";
    JSONObject json = new JSONObject();
    int success = 0;
    if (request.getParameter("str_PEREMPTION") != null && !"".equals(request.getParameter("str_PEREMPTION"))) {
        str_PEREMPTION = request.getParameter("str_PEREMPTION");
    }
    if (request.getParameter("int_NUMBER") != null && !"".equals(request.getParameter("int_NUMBER"))) {
        int_NUMBER = request.getParameter("int_NUMBER");
    }
    if (request.getParameter("int_SORTIE_USINE") != null && !"".equals(request.getParameter("int_SORTIE_USINE"))) {
        int_SORTIE_USINE = request.getParameter("int_SORTIE_USINE");
    }
    if (request.getParameter("int_QUANTITE_FREE") != null && !"".equals(request.getParameter("int_QUANTITE_FREE"))) {
        int_QUANTITE_FREE = request.getParameter("int_QUANTITE_FREE");
    }
    if (request.getParameter("int_NUM_LOT") != null && !"".equals(request.getParameter("int_NUM_LOT"))) {
        int_NUM_LOT = request.getParameter("int_NUM_LOT");
    }

    if (request.getParameter("lg_LOT_ID") != null && !"".equals(request.getParameter("lg_LOT_ID"))) {
        lg_LOT_ID = request.getParameter("lg_LOT_ID");
    }
    if (request.getParameter("lg_TYPEETIQUETTE_ID") != null && !"".equals(request.getParameter("lg_TYPEETIQUETTE_ID"))) {
        lg_TYPEETIQUETTE_ID = request.getParameter("lg_TYPEETIQUETTE_ID");
    }
    if (livraisonManagement.updateLot(lg_LOT_ID, int_NUM_LOT, 0, int_SORTIE_USINE, str_PEREMPTION, 0,
             lg_TYPEETIQUETTE_ID)) {
        success = 1;

    }
    json.put("success", success);
%>

<%= json%>