<%@page contentType="application/json" pageEncoding="UTF-8"%>
<%@page import="bll.userManagement.privilege"%>
<%@page import="dal.dataManager"%>
<%@page import="dal.TUser"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%--
    Controle unique (a l'ouverture de l'ecran d'inventaire) du privilege du
    bouton 'Cloturer'. Deliberement HORS du chemin de donnees pagine
    (ws_data_inventaire_famille.jsp) pour ne pas relancer une requete de
    privilege a chaque changement de page.
--%>
<%
    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    privilege Oprivilege = new privilege(OdataManager, OTUser);
    boolean authorize = Oprivilege.isColonneStockMachineIsAuthorize("P_CLOTURER_INVENTAIRE");
%>
{"authorize": <%= authorize %>}
