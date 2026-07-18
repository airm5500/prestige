<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@page import="bll.utils.TparameterManager"%>
<%@page import="dal.TParameters"%>
<%@page import="bll.userManagement.privilege"%>
<%@page import="dal.TInventaire"%>
<%@page import="dal.TInventaireFamille"%>
<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="dal.dataManager"%>
<%@page import="java.util.*"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TUser"%>
<%@page import="java.text.SimpleDateFormat"%>
<%--
    Impression navigateur de la liste d'inventaire pour le filtre courant.
    Contrairement a la grille paginee, toutes les lignes du filtre sont
    rendues ici afin que l'impression soit complete.
--%>
<%
    String lg_INVENTAIRE_ID = "%%", search_value = "", lg_USER_ID = "%%", lg_ZONE_GEO_ID = "%%",
            lg_FAMILLEARTICLE_ID = "%%", lg_GROSSISTE_ID = "%%", str_TYPE = "";
    String MANQUANT = "MANQUANT", SURPLUS = "SURPLUS", MANQUANTSURPLUS = "MANQUANTSURPLUS", ALERTE = "ALERTE",
            TOUCHE = "TOUCHE", NONTOUCHE = "NONTOUCHE";
    int int_ALERTE = 0;

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("lg_INVENTAIRE_ID") != null && !request.getParameter("lg_INVENTAIRE_ID").equalsIgnoreCase("")) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
    }
    if (request.getParameter("lg_ZONE_GEO_ID") != null && !request.getParameter("lg_ZONE_GEO_ID").equalsIgnoreCase("")) {
        lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
    }
    if (request.getParameter("lg_USER_ID") != null && !request.getParameter("lg_USER_ID").equalsIgnoreCase("")) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
    }
    if (request.getParameter("lg_GROSSISTE_ID") != null && !request.getParameter("lg_GROSSISTE_ID").equalsIgnoreCase("")) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
    }
    if (request.getParameter("str_TYPE") != null && request.getParameter("str_TYPE") != "") {
        str_TYPE = request.getParameter("str_TYPE");
    }
    if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && request.getParameter("lg_FAMILLEARTICLE_ID") != "") {
        lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
    }

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    InventaireManager OInventaireManager = new InventaireManager(OdataManager);
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    privilege Oprivilege = new privilege(OdataManager, OTUser);
    TparameterManager OTparameterManager = new TparameterManager(OdataManager);
    TParameters OTParameters = OTparameterManager.getParameter("KEY_MAX_VALUE_INVENTAIRE");
    if (OTParameters != null) {
        int_ALERTE = Integer.parseInt(OTParameters.getStrVALUE());
    }
    boolean result_show_col_stock = Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.P_SHOW_INVENTAIRE);

    int start = 0, limit = Integer.MAX_VALUE;
    List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();
    String libelleFiltre = "Tous les articles";
    if (str_TYPE.equalsIgnoreCase(MANQUANT)) {
        libelleFiltre = "Articles manquants";
        lstTInventaireFamille = OInventaireManager.listEcartInventaireManquant(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, start, limit, lg_USER_ID);
    } else if (str_TYPE.equalsIgnoreCase(SURPLUS)) {
        libelleFiltre = "Articles surplus";
        lstTInventaireFamille = OInventaireManager.listEcartInventaireSurplus(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, start, limit, lg_USER_ID);
    } else if (str_TYPE.equalsIgnoreCase(MANQUANTSURPLUS)) {
        libelleFiltre = "Tous les écarts";
        lstTInventaireFamille = OInventaireManager.allEcartInventaireSurplus(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, start, limit, lg_USER_ID);
    } else if (str_TYPE.equalsIgnoreCase(ALERTE)) {
        libelleFiltre = "Articles alertes";
        lstTInventaireFamille = OInventaireManager.listAlertInventaire(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, int_ALERTE, start, limit);
    } else if (str_TYPE.equalsIgnoreCase(TOUCHE)) {
        libelleFiltre = "Articles touchés";
        lstTInventaireFamille = OInventaireManager.listInventaireTouche(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, true, start, limit, lg_USER_ID);
    } else if (str_TYPE.equalsIgnoreCase(NONTOUCHE)) {
        libelleFiltre = "Articles non touchés";
        lstTInventaireFamille = OInventaireManager.listInventaireTouche(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, false, start, limit, lg_USER_ID);
    } else {
        lstTInventaireFamille = OInventaireManager.listTFamilleByInventaire(search_value, lg_INVENTAIRE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, true, start, limit, lg_USER_ID);
    }

    TInventaire OTInventaire = null;
    if (!"%%".equals(lg_INVENTAIRE_ID)) {
        OTInventaire = OdataManager.getEm().find(TInventaire.class, lg_INVENTAIRE_ID);
    }
    SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm");
%>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8"/>
        <title>Liste d'inventaire - <%= libelleFiltre%></title>
        <style>
            body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin: 20px; color: #222; }
            h1 { font-size: 16px; margin: 0 0 2px 0; }
            h2 { font-size: 13px; margin: 0 0 12px 0; font-weight: normal; color: #555; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #999; padding: 3px 6px; }
            th { background: #eee; text-align: left; }
            td.num { text-align: right; }
            td.center { text-align: center; }
            tr.total td { font-weight: bold; background: #f5f5f5; }
            .ecart-neg { color: #B02A37; font-weight: bold; }
            .ecart-pos { color: #1E7E34; font-weight: bold; }
            .noprint { margin-bottom: 12px; }
            @media print { .noprint { display: none; } }
        </style>
    </head>
    <body>
        <div class="noprint">
            <button onclick="window.print();">Imprimer</button>
            <button onclick="window.close();">Fermer</button>
        </div>
        <h1>Liste d'inventaire<%= OTInventaire != null ? " : " + OTInventaire.getStrNAME() : ""%></h1>
        <h2>Filtre : <%= libelleFiltre%> &mdash; <%= lstTInventaireFamille.size()%> ligne(s) &mdash; imprimé le <%= sdf.format(new Date())%></h2>
        <table>
            <thead>
                <tr>
                    <th>CIP</th>
                    <th>Désignation</th>
                    <th>Emplacement</th>
                    <% if (result_show_col_stock) {%><th>Stock machine</th><% }%>
                    <th>Stock rayon</th>
                    <% if (result_show_col_stock) {%><th>Écart</th><% }%>
                    <th>Touché</th>
                </tr>
            </thead>
            <tbody>
                <%
                    long totalEcart = 0, totalEcartAchat = 0, totalEcartVente = 0;
                    for (TInventaireFamille o : lstTInventaireFamille) {
                        int ecart = o.getIntNUMBER() - o.getIntNUMBERINIT();
                        totalEcart += ecart;
                        totalEcartAchat += (long) ecart * o.getLgFAMILLEID().getIntPAF();
                        totalEcartVente += (long) ecart * o.getLgFAMILLEID().getIntPRICE();
                        String zone = "";
                        try {
                            zone = o.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE();
                        } catch (Exception e) {
                        }
                        String ecartCls = ecart < 0 ? "ecart-neg" : (ecart > 0 ? "ecart-pos" : "");
                %>
                <tr>
                    <td><%= o.getLgFAMILLEID().getIntCIP()%></td>
                    <td><%= o.getLgFAMILLEID().getStrDESCRIPTION()%></td>
                    <td><%= zone%></td>
                    <% if (result_show_col_stock) {%><td class="num"><%= o.getIntNUMBERINIT()%></td><% }%>
                    <td class="num"><%= o.getIntNUMBER()%></td>
                    <% if (result_show_col_stock) {%><td class="num <%= ecartCls%>"><%= ecart%></td><% }%>
                    <td class="center"><%= o.getDtUPDATED() != null ? "Oui" : "Non"%></td>
                </tr>
                <% }%>
                <% if (result_show_col_stock) {%>
                <tr class="total">
                    <td colspan="4">Totaux (écart signé = saisi &minus; initial)</td>
                    <td class="num">Écart qté : <%= totalEcart%></td>
                    <td class="num" colspan="2">Écart achat : <%= totalEcartAchat%> / Écart vente : <%= totalEcartVente%></td>
                </tr>
                <% }%>
            </tbody>
        </table>
    </body>
</html>
