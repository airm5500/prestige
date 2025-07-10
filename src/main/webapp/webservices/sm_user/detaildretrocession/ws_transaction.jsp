<%@page import="bll.configManagement.familleManagement"%>
<%@page import="dal.TFamille"%>
<%@page import="bll.retrocessionManagement.RetrocessionDetailManagement"%>
<%@page import="bll.retrocessionManagement.RetrocessionManagement"%>
<%@page import="dal.TRetrocessionDetail"%>
<%@page import="dal.TRetrocession"%>
<%@page import="dal.TTypeReglement"%>
<%@page import="dal.TCashTransaction"%>
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

<%   Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    TUser OTUser = null;
    TRetrocession OTRetrocession = null;
    TRetrocessionDetail OTRetrocessionDetail = null;

    int int_total_vente = 0;
    int int_total_product = 0;

%>




<%    String lg_RETROCESSION_ID = "%%", lg_CLIENT_CONFRERE_ID = "%%", lg_FAMILLE_ID = "%%", lg_TVA_ID = "%%", lg_RETROCESSIONDETAIL_ID = "%%";
    String str_COMMENTAIRE = "";
    boolean bool_T_F = false;
    Integer int_PRICE_DETAIL = 0;
    Integer int_QUANTITY = 0;
    Integer int_QUANTITY_SERVED = 0;
    int int_MONTANT_HT = 0, int_MONTANT_TTC = 0, int_REMISE = 0, int_ESCOMPTE_SOCIETE = 0, int_REMISE_DETAIL = 0;

    String str_ref = "";
    /*if (request.getParameter("str_REF") != null) {
     str_REF = request.getParameter("str_REF");
     }*/
    if (request.getParameter("lg_RETROCESSION_ID") != null) {
        lg_RETROCESSION_ID = request.getParameter("lg_RETROCESSION_ID");
    }
    if (request.getParameter("lg_TVA_ID") != null) {
        lg_TVA_ID = request.getParameter("lg_TVA_ID");
        new logger().OCategory.info("lg_TVA_ID " + lg_TVA_ID);
    }

    if (request.getParameter("lg_FAMILLE_ID") != null) {
        lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");
        new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID);
    }
    if (request.getParameter("lg_RETROCESSIONDETAIL_ID") != null) {
        lg_RETROCESSIONDETAIL_ID = request.getParameter("lg_RETROCESSIONDETAIL_ID");
        new logger().OCategory.info("lg_RETROCESSIONDETAIL_ID " + lg_RETROCESSIONDETAIL_ID);
    }

    /* if (request.getParameter("lg_FAMILLE_ID") != null) {
     lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");
     }
     */
    if (request.getParameter("int_QUANTITY") != null) {
        int_QUANTITY = new Integer(request.getParameter("int_QUANTITY"));
        new logger().OCategory.info("int_QUANTITY " + int_QUANTITY);
    }

    if (request.getParameter("int_QUANTITY_SERVED") != null) {
        int_QUANTITY_SERVED = new Integer(request.getParameter("int_QUANTITY_SERVED"));
        new logger().OCategory.info("int_QUANTITY_SERVED " + int_QUANTITY_SERVED);
    }

    if (request.getParameter("int_PRICE_DETAIL") != null) {
        new logger().OCategory.info("int_PRICE_DETAIL   " + request.getParameter("int_PRICE_DETAIL"));
        int_PRICE_DETAIL = new Integer(request.getParameter("int_PRICE_DETAIL"));

    }

    if (request.getParameter("int_REMISE_DETAIL") != null) {
        new logger().OCategory.info("int_REMISE_DETAIL   " + request.getParameter("int_REMISE_DETAIL"));
        int_REMISE_DETAIL = new Integer(request.getParameter("int_REMISE_DETAIL"));

    }


    if (request.getParameter("int_REMISE") != null) {
        new logger().OCategory.info("int_REMISE   " + request.getParameter("int_REMISE"));
        int_REMISE = Integer.parseInt(request.getParameter("int_REMISE"));
    }

    if (request.getParameter("int_ESCOMPTE_SOCIETE") != null) {
        new logger().OCategory.info("int_ESCOMPTE_SOCIETE   " + request.getParameter("int_ESCOMPTE_SOCIETE"));
        int_ESCOMPTE_SOCIETE = Integer.parseInt(request.getParameter("int_ESCOMPTE_SOCIETE"));

    }

    // Recupération du medecin et de la nature de la vente
    if (request.getParameter("lg_CLIENT_CONFRERE_ID") != null) {
        new logger().OCategory.info("lg_CLIENT_CONFRERE_ID   " + request.getParameter("lg_CLIENT_CONFRERE_ID"));
        lg_CLIENT_CONFRERE_ID = request.getParameter("lg_CLIENT_CONFRERE_ID");
    }

    if (request.getParameter("str_COMMENTAIRE") != null) {
        new logger().OCategory.info("str_COMMENTAIRE   " + request.getParameter("str_COMMENTAIRE"));
        str_COMMENTAIRE = request.getParameter("str_COMMENTAIRE");
    }

    /*if (request.getParameter("lg_REMISE_ID") != null) {
     new logger().OCategory.info("lg_REMISE_ID   " + request.getParameter("lg_REMISE_ID"));
     lg_REMISE_ID = request.getParameter("lg_REMISE_ID");

     }*/
    if (request.getParameter("bool_T_F") != null) {
        new logger().OCategory.info("bool_T_F   " + request.getParameter("bool_T_F"));
        bool_T_F = Boolean.valueOf(request.getParameter("bool_T_F"));
        new logger().OCategory.info("bool_T_F convertit  " + bool_T_F);
    }

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
  TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    new logger().oCategory.info("Utilisateur conecté : " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());

    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);

    ObllBase.setDetailmessage("PAS D'ACTION");
    new logger().oCategory.info("le mode : " + request.getParameter("mode"));
    new logger().oCategory.info("ID @" + request.getParameter("lg_RETROCESSION_ID") + "@");
    RetrocessionManagement ORetrocessionManagement = new RetrocessionManagement(OdataManager, user);
    RetrocessionDetailManagement ORetrocessionDetailManagement = new RetrocessionDetailManagement(OdataManager, user);
    str_ref = lg_RETROCESSION_ID;
    if (request.getParameter("mode") != null) {
        //  TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);
        if (request.getParameter("mode").toString().equals("create")) {
            new logger().OCategory.info("create");

            if (ORetrocessionDetailManagement.isStockAvailable(lg_FAMILLE_ID, int_QUANTITY_SERVED)) {
                if (request.getParameter("lg_RETROCESSION_ID").toString().equals("0")) {
                    new logger().OCategory.info("lg_RETROCESSION_ID initial  " + lg_RETROCESSION_ID);
                    // OTRetrocession = ORetrocessionManagement.createRetrocession(str_COMMENTAIRE, int_MONTANT_HT, int_MONTANT_TTC, lg_CLIENT_CONFRERE_ID, lg_REMISE_ID, lg_ESCOMPTE_SOCIETE_TRANCHE_ID, lg_TVA_ID);
                    OTRetrocession = ORetrocessionManagement.createRetrocession(str_COMMENTAIRE, int_MONTANT_HT, int_MONTANT_TTC, lg_CLIENT_CONFRERE_ID, int_REMISE, int_ESCOMPTE_SOCIETE);
                } else {
                    OTRetrocession = ORetrocessionManagement.updateRetrocession(lg_RETROCESSION_ID, str_COMMENTAIRE, lg_CLIENT_CONFRERE_ID, int_REMISE, int_ESCOMPTE_SOCIETE);
                    //OTRetrocession = ORetrocessionManagement.createRetrocession(str_COMMENTAIRE, int_MONTANT_HT, int_MONTANT_TTC, lg_CLIENT_CONFRERE_ID, lg_REMISE_ID, lg_ESCOMPTE_SOCIETE_TRANCHE_ID);
                }
                ORetrocessionDetailManagement.createRetrocessionDetail(int_QUANTITY_SERVED, bool_T_F, lg_FAMILLE_ID, OTRetrocession, int_REMISE_DETAIL);
                if(OTRetrocession != null) {
                    int_total_vente = OTRetrocession.getIntMONTANTHT();
                str_ref = OTRetrocession.getLgRETROCESSIONID();
                }
                
               // int_total_product = ORetrocessionDetailManagement.GetProductTotal(str_ref);
            }
            ObllBase.setDetailmessage(ORetrocessionDetailManagement.getDetailmessage());
            ObllBase.setMessage(ORetrocessionDetailManagement.getMessage());

        } else if (request.getParameter("mode").toString().equals("update")) {
            if (ORetrocessionDetailManagement.isStockAvailable(lg_FAMILLE_ID, int_QUANTITY)) {
                new logger().OCategory.info("lg_RETROCESSIONDETAIL_ID " + lg_RETROCESSIONDETAIL_ID + " lg_RETROCESSION_ID " + lg_RETROCESSION_ID);
                OTRetrocessionDetail = ORetrocessionDetailManagement.updateRetrocessionDetail(lg_RETROCESSIONDETAIL_ID, int_QUANTITY, bool_T_F, int_PRICE_DETAIL, int_REMISE_DETAIL);
                if(OTRetrocessionDetail != null) {
                    int_total_vente = OTRetrocessionDetail.getLgRETROCESSIONID().getIntMONTANTHT();
                }
                //int_total_product = ORetrocessionDetailManagement.GetProductTotal(lg_RETROCESSION_ID);
            }
            ObllBase.setDetailmessage(ORetrocessionDetailManagement.getDetailmessage());
            ObllBase.setMessage(ORetrocessionDetailManagement.getMessage());
        } else if (request.getParameter("mode").toString().equals("delete")) {
            OTRetrocession = ORetrocessionDetailManagement.removeRetrocessionDetail(lg_RETROCESSIONDETAIL_ID);
            if (OTRetrocession != null) {
                int_total_vente = OTRetrocession.getIntMONTANTHT();
                //int_total_product = ORetrocessionDetailManagement.GetProductTotal(OTRetrocession.getLgRETROCESSIONID());
            }

            ObllBase.setDetailmessage(ORetrocessionDetailManagement.getDetailmessage());
            ObllBase.setMessage(ORetrocessionDetailManagement.getMessage());
        } else if (request.getParameter("mode").toString().equals("cloturer")) {
            new logger().OCategory.info("lg_RETROCESSION_ID " + lg_RETROCESSION_ID + " int_REMISE " + int_REMISE + " int_ESCOMPTE_SOCIETE " + int_ESCOMPTE_SOCIETE + " str_COMMENTAIRE " + str_COMMENTAIRE);
            ORetrocessionManagement.closureRetrocession(lg_RETROCESSION_ID, int_REMISE, int_ESCOMPTE_SOCIETE, str_COMMENTAIRE);
            ObllBase.setMessage(ORetrocessionManagement.getMessage());
            ObllBase.setDetailmessage(ORetrocessionManagement.getDetailmessage());
        }
    } 

    String result;
    new logger().OCategory.info("ObllBase.getMessage() ---- " + ObllBase.getMessage());

    if (ObllBase.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{ref:\"" + str_ref + "\",total_vente:\"" + int_total_vente + "\", int_total_product: \"" + int_total_product + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    } else {
        result = "{ref:\"" + str_ref + "\",total_vente:\"" + int_total_vente + "\", int_total_product: \"" + int_total_product + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }
    new logger().OCategory.info("JSON " + result);

%>
<%=result%>