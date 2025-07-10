<%@page import="dal.TFamille"%>
<%@page import="dal.TInventaire"%>
<%@page import="bll.stockManagement.InventaireManager"%>
<%@page import="java.io.File"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="java.io.File"%>
<%@page import="java.io.File"%>
<%@page import="org.apache.commons.fileupload.FileItem"%>
<%@page import="org.apache.commons.fileupload.DiskFileUpload"%>
<%@page import="org.apache.commons.fileupload.FileUpload"%>
<%@page import="java.io.File"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TOptimisationQuantite"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="java.math.BigInteger"  %>
<%@page import="bll.configManagement.familleManagement"  %>

<%
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    date key = new date();


%>



<%    TInventaire OTInventaire = null;
    String search_value = "", liste_article = "", str_BEGIN = "", str_END = "";
    String str_NAME = "%%", str_DESCRIPTION = "%%", lg_ZONE_GEO_ID = "%%", lg_FAMILLEARTICLE_ID = "%%", int_CIP = "%%", lg_FAMILLE_ID = "%%", lg_INVENTAIRE_ID = "%%", lg_GROSSISTE_ID = "%%", lg_INVENTAIRE_FAMILLE_ID = "%%", str_TYPE_TRANSACTION = "", lg_TYPE_STOCK_ID = "1";
    int int_PRICE = 0, int_NUMBER = 0, int_QTE_REAPPROVISIONNEMENT = 0;
    boolean bool_INVENTAIRE = true;
    List<TFamille> lstTFamille = new ArrayList<>();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
    TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);

    ObllBase.setDetailmessage("PAS D'ACTION");

    if (request.getParameter("str_NAME") != null) {
        str_NAME = request.getParameter("str_NAME");
        new logger().OCategory.info("str_NAME " + str_NAME);
    }

    if (request.getParameter("int_PRICE") != null) {
        int_PRICE = Integer.parseInt(request.getParameter("int_PRICE"));
        new logger().OCategory.info("int_PRICE " + int_PRICE);
    }
    if (request.getParameter("int_QTE_REAPPROVISIONNEMENT") != null) {
        int_QTE_REAPPROVISIONNEMENT = Integer.parseInt(request.getParameter("int_QTE_REAPPROVISIONNEMENT"));
        new logger().OCategory.info("int_QTE_REAPPROVISIONNEMENT " + int_QTE_REAPPROVISIONNEMENT);
    }

    if (request.getParameter("bool_INVENTAIRE") != null) {
        bool_INVENTAIRE = Boolean.valueOf(request.getParameter("bool_INVENTAIRE"));
        new logger().OCategory.info("bool_INVENTAIRE " + bool_INVENTAIRE);
    }

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }
    if (request.getParameter("str_END") != null) {
        str_END = request.getParameter("str_END");
        new logger().OCategory.info("str_END " + str_END);
    }
    if (request.getParameter("str_BEGIN") != null) {
        str_BEGIN = request.getParameter("str_BEGIN");
        new logger().OCategory.info("str_BEGIN " + str_BEGIN);
    }

    if (request.getParameter("liste_article") != null && !request.getParameter("liste_article").equalsIgnoreCase("")) {
        liste_article = request.getParameter("liste_article");
        new logger().OCategory.info("liste_article " + liste_article);
    }

    if (request.getParameter("int_NUMBER") != null) {
        int_NUMBER = Integer.parseInt(request.getParameter("int_NUMBER"));
        new logger().OCategory.info("int_NUMBER " + int_NUMBER);
    }

    if (request.getParameter("str_DESCRIPTION") != null) {
        str_DESCRIPTION = request.getParameter("str_DESCRIPTION");
        new logger().OCategory.info("str_DESCRIPTION " + str_DESCRIPTION);
    }

    if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && !request.getParameter("lg_FAMILLEARTICLE_ID").equalsIgnoreCase("") && !request.getParameter("lg_FAMILLEARTICLE_ID").equalsIgnoreCase("Sectionner une famille article...")) {
        lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
        new logger().OCategory.info("lg_FAMILLEARTICLE_ID " + lg_FAMILLEARTICLE_ID);
    }
    if (request.getParameter("lg_FAMILLE_ID") != null) {
        lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");
        new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID);
    }
    if (request.getParameter("int_CIP") != null) {
        int_CIP = request.getParameter("int_CIP");
        new logger().OCategory.info("int_CIP " + int_CIP);
    }
    if (request.getParameter("lg_ZONE_GEO_ID") != null && !request.getParameter("lg_ZONE_GEO_ID").equalsIgnoreCase("") && !request.getParameter("lg_ZONE_GEO_ID").equalsIgnoreCase("Sectionner un emplacement...")) {
        lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
        new logger().OCategory.info("lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID);
    }

    if (request.getParameter("lg_INVENTAIRE_ID") != null) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
        new logger().OCategory.info("lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
    }

    if (request.getParameter("lg_INVENTAIRE_FAMILLE_ID") != null) {
        lg_INVENTAIRE_FAMILLE_ID = request.getParameter("lg_INVENTAIRE_FAMILLE_ID");
        new logger().OCategory.info("lg_INVENTAIRE_FAMILLE_ID " + lg_INVENTAIRE_FAMILLE_ID);
    }

    if (request.getParameter("lg_GROSSISTE_ID") != null && !request.getParameter("lg_GROSSISTE_ID").equalsIgnoreCase("") && !request.getParameter("lg_GROSSISTE_ID").equalsIgnoreCase("Sectionner un grossiste...")) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
    }
    if (request.getParameter("str_TYPE_TRANSACTION") != null) {
        str_TYPE_TRANSACTION = request.getParameter("str_TYPE_TRANSACTION");
        new logger().OCategory.info("str_TYPE_TRANSACTION " + str_TYPE_TRANSACTION);
    }

    if (!user.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
        lg_TYPE_STOCK_ID = "3";
    }

    new logger().oCategory.info("le mode : " + request.getParameter("mode"));

    InventaireManager OInventaireManager = new InventaireManager(OdataManager, user);
    familleManagement OfamilleManagement = new familleManagement(OdataManager, user);
    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").toString().equals("create")) {
            OTInventaire = OInventaireManager.createInventaire(str_NAME, str_DESCRIPTION, str_TYPE_TRANSACTION);
            lstTFamille = OfamilleManagement.showAllOrOneArticleInterval(lg_FAMILLE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, str_BEGIN, str_END, OTInventaire.getStrTYPE());
            OInventaireManager.createInventaireFamille(OTInventaire, lstTFamille, bool_INVENTAIRE);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());

        } else if (request.getParameter("mode").toString().equals("createInventaireArticle")) {
            OInventaireManager.createInventaireFamille(lg_INVENTAIRE_ID, lg_FAMILLE_ID, bool_INVENTAIRE);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("createInventaireArticle")) {
            OInventaireManager.createInventaireFamille(lg_INVENTAIRE_ID, lg_FAMILLE_ID, bool_INVENTAIRE);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("updateInventaireUnitaireFamille")) {
            OInventaireManager.updateInventaireUnitaireFamille(lg_INVENTAIRE_ID, lg_FAMILLE_ID, bool_INVENTAIRE);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("deleteInventaireFamilleBis")) {
            OInventaireManager.deleteInventaireFamille(lg_INVENTAIRE_ID, lg_FAMILLE_ID);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("delete")) {
            OInventaireManager.deleteInventaire(lg_INVENTAIRE_ID);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("deleteInventaireFamille")) {
            OInventaireManager.deleteInventaireFamille(lg_INVENTAIRE_FAMILLE_ID);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("updateinventairefamille")) {

            OInventaireManager.updateInventaireFamille(lg_INVENTAIRE_FAMILLE_ID, lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_CIP, str_DESCRIPTION, lg_ZONE_GEO_ID, lg_FAMILLEARTICLE_ID, lg_GROSSISTE_ID, int_PRICE, int_NUMBER);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("cloturer")) {

            OInventaireManager.closureInventaire(lg_INVENTAIRE_ID, lg_TYPE_STOCK_ID);
            ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
            ObllBase.setMessage(OInventaireManager.getMessage());
        } else if (request.getParameter("mode").toString().equals("createbis")) {

            new logger().OCategory.info("final lg_FAMILLEARTICLE_ID " + lg_FAMILLEARTICLE_ID + " lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID + " lg_GROSSISTE_ID " + lg_GROSSISTE_ID);

            try {

                OTInventaire = OInventaireManager.createInventaire(str_NAME, str_DESCRIPTION, str_TYPE_TRANSACTION);

                if (lg_GROSSISTE_ID.equalsIgnoreCase("0") || lg_FAMILLEARTICLE_ID.equalsIgnoreCase("0") || lg_ZONE_GEO_ID.equalsIgnoreCase("0")) {
                    if (lg_GROSSISTE_ID.equalsIgnoreCase("0")) {
                        lg_GROSSISTE_ID = "%%";
                    }
                    if (lg_FAMILLEARTICLE_ID.equalsIgnoreCase("0")) {
                        lg_FAMILLEARTICLE_ID = "%%";
                    }
                    if (lg_ZONE_GEO_ID.equalsIgnoreCase("0")) {
                        lg_ZONE_GEO_ID = "%%";
                    }

                }
                lstTFamille = OfamilleManagement.showAllOrOneArticleInterval(lg_FAMILLE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, str_BEGIN, str_END, OTInventaire.getStrTYPE());

                OInventaireManager.createInventaireFamille(OTInventaire, lstTFamille, bool_INVENTAIRE);
                ObllBase.setDetailmessage(OInventaireManager.getDetailmessage());
                ObllBase.setMessage(OInventaireManager.getMessage());
            } catch (Exception e) {
                e.printStackTrace();
                ObllBase.buildErrorTraceMessage("Echec de création de l'inventaitre");
            }

        } else {

        }

    }

    String result;
    if (ObllBase.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";

    } else {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }
    new logger().OCategory.info("JSON " + result);


%>
<%=result%>