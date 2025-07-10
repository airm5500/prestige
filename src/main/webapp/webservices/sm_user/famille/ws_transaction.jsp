<%@page import="org.apache.commons.lang3.StringUtils"%>
<%@page import="dal.TPrivilege"%>
<%@page import="bll.common.Parameter"%>
<%@page import="dal.TFamille"%>
<%@page import="bll.configManagement.familleManagement"%>
<%@page import="dal.TGroupeFamille"%>
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

<% String str_NAME = "", lg_CODE_ACTE_ID = "0", lg_CODE_GESTION_ID = "", lg_CODE_TVA_ID = "", lg_FORME_ARTICLE_ID = "", lg_FABRIQUANT_ID = "",
            lg_TYPEETIQUETTE_ID = "2", str_CODE_TAUX_REMBOURSEMENT = "0", lg_ZONE_GEO_ID = Parameter.DEFAUL_ZONE_GEOGRAPHIQUE, lg_REMISE_ID = "",
            int_CIP2 = "", int_CIP3 = "", int_CIP4 = "", lg_FAMILLEARTICLE_ID = "", str_DESCRIPTION = "", lg_FAMILLE_PARENT_ID = "", dt_Peremtion = "",
            lg_FAMILLE_ID = "", lg_GROSSISTE_ID = "", int_CIP = "", int_EAN13 = "", str_CODE_REMISE = "", int_T = "";
    int int_PRICE = 0, int_STOCK_REAPROVISONEMENT = 0, int_PAF = 0, int_PAT = 0, int_S = 0, int_PRICE_TIPS = 0,
            int_TAUX_MARQUE = 0, int_SEUIL_MIN = 0, int_NUMBER_AVAILABLE = 0, int_QTEDETAIL = 0,
            int_PRICE_DETAIL = 0, int_SEUIL_RESERVE = 0, int_QTE_REAPPROVISIONNEMENT = 0, int_QUANTITY_STOCK = 0;
    String laboratoireId = "", gammeId = "";
    Translate oTranslate = new Translate();
    TFamille OFamille = null;
    Integer cmuPrice=null;
    dataManager OdataManager = new dataManager();

    short bool_DECONDITIONNE = 0;

    boolean bool_RESERVE = false;

%>




<%   
    
     if (StringUtils.isNotEmpty(request.getParameter("cmu_price"))) {
        cmuPrice = Integer.valueOf(request.getParameter("cmu_price"));
    }
    
    if (request.getParameter("str_NAME") != null && !"".equals(request.getParameter("str_NAME"))) {
        str_NAME = request.getParameter("str_NAME");
        new logger().OCategory.info("str_NAME " + str_NAME);
    }
    if (request.getParameter("gammeId") != null && !"".equals(request.getParameter("gammeId"))) {
        gammeId = request.getParameter("gammeId");
    }
    if (request.getParameter("laboratoireId") != null && !"".equals(request.getParameter("laboratoireId"))) {
        laboratoireId = request.getParameter("laboratoireId");
    }

    if (request.getParameter("str_DESCRIPTION") != null && !"".equals(request.getParameter("str_DESCRIPTION"))) {
        str_DESCRIPTION = request.getParameter("str_DESCRIPTION");
        new logger().OCategory.info("str_DESCRIPTION " + str_DESCRIPTION);
    }
    if (request.getParameter("lg_FAMILLE_ID") != null && !"".equals(request.getParameter("lg_FAMILLE_ID"))) {
        lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");
        new logger().OCategory.info("lg_FAMILLE_ID ----" + lg_FAMILLE_ID);
    }

    if (request.getParameter("lg_GROSSISTE_ID") != null && !"".equals(request.getParameter("lg_GROSSISTE_ID"))) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
    }
    if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && !"".equals(request.getParameter("lg_FAMILLEARTICLE_ID"))) {
        lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
        new logger().OCategory.info("lg_FAMILLEARTICLE_ID ****" + lg_FAMILLEARTICLE_ID);
    }
    if (request.getParameter("int_NUMBER_AVAILABLE") != null && !"".equals(request.getParameter("int_NUMBER_AVAILABLE"))) {
        int_NUMBER_AVAILABLE = Integer.parseInt(request.getParameter("int_NUMBER_AVAILABLE"));
        new logger().OCategory.info("int_NUMBER_AVAILABLE " + int_NUMBER_AVAILABLE);
    }

    if (request.getParameter("int_QUANTITY_STOCK") != null && !"".equals(request.getParameter("int_NUMBER_AVAILABLE"))) {
        int_QUANTITY_STOCK = Integer.parseInt(request.getParameter("int_QUANTITY_STOCK"));
        new logger().OCategory.info("int_QUANTITY_STOCK " + int_QUANTITY_STOCK);
    }

    if (request.getParameter("int_CIP") != null && !"".equals(request.getParameter("int_CIP"))) {
        new logger().OCategory.info("int_CIP   " + request.getParameter("int_CIP"));
        int_CIP = request.getParameter("int_CIP");

    }
    if (request.getParameter("dt_Peremtion") != null && !"".equals(request.getParameter("dt_Peremtion"))) {
        new logger().OCategory.info("dt_Peremtion   " + request.getParameter("dt_Peremtion"));
        dt_Peremtion = request.getParameter("dt_Peremtion");

    }

    if (request.getParameter("lg_FORME_ARTICLE_ID") != null && !"".equals(request.getParameter("lg_FORME_ARTICLE_ID"))) {
        new logger().OCategory.info("lg_FORME_ARTICLE_ID   " + request.getParameter("lg_FORME_ARTICLE_ID"));
        lg_FORME_ARTICLE_ID = request.getParameter("lg_FORME_ARTICLE_ID");

    }
    if (request.getParameter("lg_FABRIQUANT_ID") != null && !"".equals(request.getParameter("lg_FABRIQUANT_ID"))) {
        new logger().OCategory.info("lg_FABRIQUANT_ID   " + request.getParameter("lg_FABRIQUANT_ID"));
        lg_FABRIQUANT_ID = request.getParameter("lg_FABRIQUANT_ID");

    }

    if (request.getParameter("bool_RESERVE") != null && !"".equals(request.getParameter("bool_RESERVE"))) {
        bool_RESERVE = Boolean.parseBoolean(request.getParameter("bool_RESERVE"));
        new logger().OCategory.info("bool_RESERVE   " + request.getParameter("bool_RESERVE"));
    }
    if (request.getParameter("int_EAN13") != null && !"".equals(request.getParameter("int_EAN13"))) {
        int_EAN13 = request.getParameter("int_EAN13");
        new logger().OCategory.info("int_EAN13   " + int_EAN13);
    }
    if (request.getParameter("int_PRICE") != null && !"".equals(request.getParameter("int_PRICE"))) {
        new logger().OCategory.info("int_PRICE   " + request.getParameter("int_PRICE"));
        int_PRICE = Integer.parseInt(request.getParameter("int_PRICE"));

    }
    if (request.getParameter("int_SEUIL_MIN") != null && !"".equals(request.getParameter("int_SEUIL_MIN"))) {
        new logger().OCategory.info("int_SEUIL_MIN   " + request.getParameter("int_SEUIL_MIN"));
        int_SEUIL_MIN = Integer.parseInt(request.getParameter("int_SEUIL_MIN"));

    }
    if (request.getParameter("int_STOCK_REAPROVISONEMENT") != null && !"".equals(request.getParameter("int_STOCK_REAPROVISONEMENT"))) {
        new logger().OCategory.info("int_STOCK_REAPROVISONEMENT   " + request.getParameter("int_STOCK_REAPROVISONEMENT"));
        int_STOCK_REAPROVISONEMENT = Integer.parseInt(request.getParameter("int_STOCK_REAPROVISONEMENT"));

    }
    if (request.getParameter("int_PAF") != null && !"".equals(request.getParameter("int_PAF"))) {
        new logger().OCategory.info("int_PAF   " + request.getParameter("int_PAF"));
        int_PAF =  Integer.valueOf(request.getParameter("int_PAF"));

    }
    if (request.getParameter("int_PAT") != null && !"".equals(request.getParameter("int_PAT"))) {
        new logger().OCategory.info("int_PAT   " + request.getParameter("int_PAT"));
        int_PAT = Integer.parseInt(request.getParameter("int_PAT"));
    }

    if (request.getParameter("int_SEUIL_RESERVE") != null && !"".equals(request.getParameter("int_SEUIL_RESERVE"))) {
        int_SEUIL_RESERVE = Integer.parseInt(request.getParameter("int_SEUIL_RESERVE"));
        new logger().OCategory.info("int_SEUIL_RESERVE   " + request.getParameter("int_SEUIL_RESERVE"));
    }

    if (request.getParameter("bool_DECONDITIONNE") != null && !"".equals(request.getParameter("bool_DECONDITIONNE"))) {
        new logger().OCategory.info("bool_DECONDITIONNE   " + request.getParameter("bool_DECONDITIONNE"));
        bool_DECONDITIONNE = Short.parseShort(request.getParameter("bool_DECONDITIONNE"));
        new logger().OCategory.info("bool_DECONDITIONNE convertit  " + bool_DECONDITIONNE);
    }

    if (request.getParameter("int_S") != null && !"".equals(request.getParameter("int_S"))) {
        new logger().OCategory.info("int_S   " + request.getParameter("int_S"));
        int_S = Integer.parseInt(request.getParameter("int_S"));

    }
    if (request.getParameter("int_T") != null) {
        int_T = request.getParameter("int_T");
        new logger().OCategory.info("int_T " + int_T);
    }
    if (request.getParameter("int_PRICE_TIPS") != null && !"".equals(request.getParameter("int_PRICE_TIPS"))) {
        new logger().OCategory.info("int_PRICE_TIPS   " + request.getParameter("int_PRICE_TIPS"));
        int_PRICE_TIPS = Integer.parseInt(request.getParameter("int_PRICE_TIPS"));

    }

    if (request.getParameter("int_QTE_REAPPROVISIONNEMENT") != null && !"".equals(request.getParameter("int_QTE_REAPPROVISIONNEMENT"))) {
        int_QTE_REAPPROVISIONNEMENT = Integer.parseInt(request.getParameter("int_QTE_REAPPROVISIONNEMENT"));
        new logger().OCategory.info("int_QTE_REAPPROVISIONNEMENT   " + int_QTE_REAPPROVISIONNEMENT);
    }

    if (request.getParameter("int_TAUX_MARQUE") != null && !"".equals(request.getParameter("int_TAUX_MARQUE"))) {
        new logger().OCategory.info("int_TAUX_MARQUE   " + request.getParameter("int_TAUX_MARQUE"));
        int_TAUX_MARQUE = Integer.parseInt(request.getParameter("int_TAUX_MARQUE"));

    }

    if (request.getParameter("int_PRICE_DETAIL") != null && !"".equals(request.getParameter("int_PRICE_DETAIL"))) {
        new logger().OCategory.info("int_PRICE_DETAIL   " + request.getParameter("int_PRICE_DETAIL"));
        int_PRICE_DETAIL = Integer.parseInt(request.getParameter("int_PRICE_DETAIL"));

    }

    if (request.getParameter("int_QTEDETAIL") != null && !"".equals(request.getParameter("int_QTEDETAIL"))) {
        new logger().OCategory.info("int_QTEDETAIL   " + request.getParameter("int_QTEDETAIL"));
        int_QTEDETAIL = Integer.parseInt(request.getParameter("int_QTEDETAIL"));

    }
    if (request.getParameter("lg_FAMILLE_PARENT_ID") != null && !"".equals(request.getParameter("lg_FAMILLE_PARENT_ID"))) {
        lg_FAMILLE_PARENT_ID = request.getParameter("lg_FAMILLE_PARENT_ID");
        new logger().OCategory.info("lg_FAMILLE_PARENT_ID   " + lg_FAMILLE_PARENT_ID);
    }

    if (request.getParameter("lg_CODE_ACTE_ID") != null && !"".equals(request.getParameter("lg_CODE_ACTE_ID"))) {
        lg_CODE_ACTE_ID = request.getParameter("lg_CODE_ACTE_ID");
    }
    if (request.getParameter("lg_CODE_GESTION_ID") != null && !"".equals(request.getParameter("lg_CODE_GESTION_ID"))) {
        lg_CODE_GESTION_ID = request.getParameter("lg_CODE_GESTION_ID");
    }

    if (request.getParameter("lg_CODE_TVA_ID") != null && !"".equals(request.getParameter("lg_CODE_TVA_ID"))) {
        lg_CODE_TVA_ID = request.getParameter("lg_CODE_TVA_ID");
        new logger().OCategory.info("lg_CODE_TVA_ID " + lg_CODE_TVA_ID);
    }

    if (request.getParameter("lg_TYPEETIQUETTE_ID") != null && !"".equals(request.getParameter("lg_TYPEETIQUETTE_ID"))) {
        lg_TYPEETIQUETTE_ID = request.getParameter("lg_TYPEETIQUETTE_ID");
        new logger().OCategory.info("lg_TYPEETIQUETTE_ID " + lg_TYPEETIQUETTE_ID);
    }
    if (request.getParameter("lg_REMISE_ID") != null && !"".equals(request.getParameter("lg_REMISE_ID"))) {
        lg_REMISE_ID = request.getParameter("lg_REMISE_ID");
        new logger().OCategory.info("lg_REMISE_ID " + lg_REMISE_ID);
    }

    if (request.getParameter("str_CODE_REMISE") != null && !"".equals(request.getParameter("str_CODE_REMISE"))) {
        str_CODE_REMISE = request.getParameter("str_CODE_REMISE");
        new logger().OCategory.info("str_CODE_REMISE " + str_CODE_REMISE);
    }

    if (request.getParameter("str_CODE_TAUX_REMBOURSEMENT") != null && !"".equals(request.getParameter("str_CODE_TAUX_REMBOURSEMENT"))) {
        str_CODE_TAUX_REMBOURSEMENT = request.getParameter("str_CODE_TAUX_REMBOURSEMENT");
    }
    if (request.getParameter("lg_ZONE_GEO_ID") != null && !"".equalsIgnoreCase(request.getParameter("lg_ZONE_GEO_ID"))) {
        lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
        new logger().OCategory.info("lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID);
    }

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
    TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);
    ObllBase.setDetailmessage("PAS D'ACTION");
    familleManagement OfamilleManagement = new familleManagement(OdataManager, user);
    OfamilleManagement.setUsersPrivileges((List<TPrivilege>) session.getAttribute(commonparameter.USER_LIST_PRIVILEGE));
    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").equals("create")) {

            if (bool_DECONDITIONNE == 1) {
                if (!OfamilleManagement.isDeconditionExist(int_CIP)) {
                    OFamille = OfamilleManagement.createProduct(str_DESCRIPTION, str_DESCRIPTION, int_PRICE, int_PRICE_TIPS, int_TAUX_MARQUE, int_PAF, int_PAT, int_S, int_T, int_CIP, int_EAN13, lg_GROSSISTE_ID, lg_FAMILLEARTICLE_ID, lg_CODE_ACTE_ID, lg_CODE_GESTION_ID, str_CODE_REMISE, str_CODE_TAUX_REMBOURSEMENT, lg_ZONE_GEO_ID, int_NUMBER_AVAILABLE, int_QTEDETAIL, lg_FORME_ARTICLE_ID, lg_FABRIQUANT_ID, bool_DECONDITIONNE, lg_TYPEETIQUETTE_ID, lg_REMISE_ID, lg_CODE_TVA_ID, bool_RESERVE, int_SEUIL_RESERVE, "", int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT, int_QUANTITY_STOCK, dt_Peremtion, gammeId, laboratoireId,cmuPrice);
                }
            } else {
                OFamille = OfamilleManagement.createProduct(str_DESCRIPTION, str_DESCRIPTION, int_PRICE, int_PRICE_TIPS, int_TAUX_MARQUE, int_PAF, int_PAT, int_S, int_T, int_CIP, int_EAN13, lg_GROSSISTE_ID, lg_FAMILLEARTICLE_ID, lg_CODE_ACTE_ID, lg_CODE_GESTION_ID, str_CODE_REMISE, str_CODE_TAUX_REMBOURSEMENT, lg_ZONE_GEO_ID, int_NUMBER_AVAILABLE, int_QTEDETAIL, lg_FORME_ARTICLE_ID, lg_FABRIQUANT_ID, bool_DECONDITIONNE, lg_TYPEETIQUETTE_ID, lg_REMISE_ID, lg_CODE_TVA_ID, bool_RESERVE, int_SEUIL_RESERVE, "", int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT, int_QUANTITY_STOCK, dt_Peremtion, gammeId, laboratoireId,cmuPrice);
            }

            try {
                lg_FAMILLE_ID = OFamille.getLgFAMILLEID();
            } catch (Exception e) {

            }
            ObllBase.setMessage(OfamilleManagement.getMessage());
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());

        } else if (request.getParameter("mode").equals("update")) {
            int_CIP2 = "";
            int_CIP3 = "";
            int_CIP4 = "";

            OfamilleManagement.update(lg_FAMILLE_ID, str_DESCRIPTION, int_CIP2, int_CIP3, int_CIP4, str_DESCRIPTION, int_PRICE, int_PRICE_TIPS, int_TAUX_MARQUE, int_PAF, int_PAT, int_S, int_T, int_CIP, int_EAN13, lg_GROSSISTE_ID, lg_FAMILLEARTICLE_ID, lg_CODE_ACTE_ID, lg_CODE_GESTION_ID, str_CODE_REMISE, str_CODE_TAUX_REMBOURSEMENT, lg_ZONE_GEO_ID, int_QTEDETAIL, int_PRICE_DETAIL, lg_TYPEETIQUETTE_ID, lg_REMISE_ID, lg_CODE_TVA_ID, bool_RESERVE, int_SEUIL_RESERVE, int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT, dt_Peremtion, gammeId, laboratoireId,cmuPrice);
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            ObllBase.setMessage(OfamilleManagement.getMessage());

        } else if (request.getParameter("mode").equals("decondition")) {
            int_CIP2 = "";
            int_CIP3 = "";
            int_CIP4 = "";
            int_CIP = int_CIP.trim() + "D";
            OfamilleManagement.createProductDecondition(lg_FAMILLE_ID, str_DESCRIPTION + " DET", str_DESCRIPTION + " DET", int_PRICE, int_PRICE_TIPS, int_TAUX_MARQUE, int_PAF, int_PAT, int_S, "", int_CIP, int_EAN13, lg_GROSSISTE_ID, lg_FAMILLEARTICLE_ID, lg_CODE_ACTE_ID, lg_CODE_GESTION_ID, str_CODE_REMISE, str_CODE_TAUX_REMBOURSEMENT, lg_ZONE_GEO_ID, int_QTEDETAIL, lg_FORME_ARTICLE_ID, lg_FABRIQUANT_ID, bool_DECONDITIONNE, lg_TYPEETIQUETTE_ID, lg_REMISE_ID, bool_RESERVE, int_SEUIL_RESERVE, int_STOCK_REAPROVISONEMENT, int_QTE_REAPPROVISIONNEMENT, int_QUANTITY_STOCK);
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            ObllBase.setMessage(OfamilleManagement.getMessage());

        } else if (request.getParameter("mode").equals("delete")) {

            if (OfamilleManagement.delete(lg_FAMILLE_ID)) {
                ObllBase.setMessage("1");
                ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            } else {
                ObllBase.setDetailmessage("Impossible de supprimer un article qui a déjà été utilisé dans le système");
            }

            // ObllBase.setMessage(OfamilleManagement.getMessage());
            //  new logger().oCategory.info("Suppression OTFamille " + request.getParameter("lg_FAMILLE_ID").toString());
        } else if (request.getParameter("mode").equals("deconditionarticle")) {

            OfamilleManagement.doDeconditionnement(lg_FAMILLE_PARENT_ID, lg_FAMILLE_ID, int_NUMBER_AVAILABLE);
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            ObllBase.setMessage(OfamilleManagement.getMessage());

        } else if (request.getParameter("mode").equals("deconditionarticleToVente")) {
            OfamilleManagement.doDeconditionnement(lg_FAMILLE_ID, int_NUMBER_AVAILABLE);
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            ObllBase.setMessage(OfamilleManagement.getMessage());

        } else if (request.getParameter("mode").equals("disable")) {

            OfamilleManagement.disable(lg_FAMILLE_ID);
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            ObllBase.setMessage(OfamilleManagement.getMessage());

        } else if (request.getParameter("mode").equals("enable")) {

            OfamilleManagement.enable(lg_FAMILLE_ID, commonparameter.statut_disable);
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            ObllBase.setMessage(OfamilleManagement.getMessage());
        } else if (request.getParameter("mode").equals("updateonlyzonegeo")) {
            String lg_EMPLACEMENT_ID = "";
            if (request.getParameter("lg_EMPLACEMENT_ID") != null) {
                lg_EMPLACEMENT_ID = request.getParameter("lg_EMPLACEMENT_ID");
                new logger().OCategory.info("lg_EMPLACEMENT_ID " + lg_EMPLACEMENT_ID);
            }
            OfamilleManagement.updateFamilleZone(lg_FAMILLE_ID, lg_ZONE_GEO_ID);
            ObllBase.setDetailmessage(OfamilleManagement.getDetailmessage());
            ObllBase.setMessage(OfamilleManagement.getMessage());
        }
    }

    String result;
    if (ObllBase.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors_code: \"" + ObllBase.getMessage() + "\", ref:\"" + lg_FAMILLE_ID + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";

    } else {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors_code: \"" + ObllBase.getMessage() + "\", ref:\"" + lg_FAMILLE_ID + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }
    new logger().OCategory.info("JSON " + result);

%>
<%=result%>