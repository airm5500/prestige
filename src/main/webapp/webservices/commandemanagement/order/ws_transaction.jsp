<%@page import="bll.stock.impl.StockImpl"%>
<%@page import="bll.stock.Stock"%>
<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>

<%@page import="toolkits.utils.jdom"%>
<%@page import="java.io.File"%>
<%@page import="org.apache.commons.fileupload.FileItem"%>
<%@page import="org.apache.commons.fileupload.DiskFileUpload"%>
<%@page import="org.apache.commons.fileupload.FileUpload"%>
<%@page import="bll.commandeManagement.suggestionManagement"%>

<%@page import="dal.TOrderDetail"%>
<%@page import="bll.commandeManagement.bonLivraisonManagement"%>
<%@page import="dal.TFamille"%>

<%@page import="bll.commandeManagement.orderManagement"%>

<%@page import="dal.TOrder"%>

<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>

<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>

<%@page import="toolkits.parameters.commonparameter"  %>


<%
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    date key = new date();
    //privilege Oprivilege = new privilege();
    //TRole OTRole = null;

    TOrder OTOrder = null;
    TOrderDetail OTOrderDetail = null;

    Date dt_DATE_LIVRAISON = null;


%>


<%    List<TOrderDetail> lstTOrderDetail = new ArrayList<>();
    int PRIX_ACHAT_TOTAL = 0, PRIX_VENTE_TOTAL = 0, total_lineproduct = 0;

    String SUGG_ORDER = "COMMANDE", ID_SUGG_ORDER = "", str_STATUT = commonparameter.statut_is_Process,
            lg_ORDER_ID = "", str_REF_ORDER = "", str_REF = "0",
            lg_GROSSISTE_ID = "", lg_USER_ID = "", mode = "",
            lg_FAMILLE_ID = "", str_ACTION = "Commande en cours";

    // ORDER DETAIL
    String lg_ORDERDETAIL_ID = "";
    int int_NUMBER = 0, int_QTE_MANQUANT = 0;

    // BON DE LIVRAISON
    int int_MHT = 0, int_TVA = 0, int_HTTC = 0;
    String str_REF_LIVRAISON = "";

    String modeimport = "", format = "";

    int int_PRIX_REFERENCE = 0, int_PAF = 0, lg_FAMILLE_PRIX_ACHAT = 0, lg_FAMILLE_PRIX_VENTE = 0;

    if (request.getParameter("lg_ORDER_ID") != null) {
        lg_ORDER_ID = request.getParameter("lg_ORDER_ID");
        new logger().oCategory.info("lg_ORDER_ID : " + lg_ORDER_ID);
    }

    if (request.getParameter("format") != null) {
        format = request.getParameter("format");
        new logger().oCategory.info("format : " + format);
    }

    if (request.getParameter("modeimport") != null) {
        modeimport = request.getParameter("modeimport");
        new logger().oCategory.info("modeimport : " + modeimport);
    }

    if (request.getParameter("str_REF_ORDER") != null) {
        str_REF_ORDER = request.getParameter("str_REF_ORDER");
        new logger().oCategory.info("str_REF_ORDER : " + str_REF_ORDER);
    }

    if (request.getParameter("str_STATUT") != null) {
        str_STATUT = request.getParameter("str_STATUT");
        new logger().oCategory.info("str_STATUT : " + str_STATUT);
    }

    if (request.getParameter("int_PRIX_REFERENCE") != null) {
        int_PRIX_REFERENCE = Integer.parseInt(request.getParameter("int_PRIX_REFERENCE"));
        new logger().OCategory.info("int_PRIX_REFERENCE " + int_PRIX_REFERENCE);
    }

    if (request.getParameter("int_PAF") != null) {
        int_PAF = Integer.parseInt(request.getParameter("int_PAF"));
        new logger().OCategory.info("int_PAF " + int_PAF);
    }

    if (request.getParameter("lg_FAMILLE_PRIX_ACHAT") != null) {
        lg_FAMILLE_PRIX_ACHAT = Integer.parseInt(request.getParameter("lg_FAMILLE_PRIX_ACHAT"));
        new logger().OCategory.info("lg_FAMILLE_PRIX_ACHAT " + lg_FAMILLE_PRIX_ACHAT);
    }

    if (request.getParameter("lg_FAMILLE_PRIX_VENTE") != null) {
        lg_FAMILLE_PRIX_VENTE = Integer.parseInt(request.getParameter("lg_FAMILLE_PRIX_VENTE"));
        new logger().OCategory.info("lg_FAMILLE_PRIX_VENTE " + lg_FAMILLE_PRIX_VENTE);
    }
    // int_MHT = 0, int_TVA = 0, int_HTTC = 0;
    if (request.getParameter("int_MHT") != null) {
        int_MHT = Integer.parseInt(request.getParameter("int_MHT"));
        new logger().oCategory.info("int_MHT : " + int_MHT);
    }
    if (request.getParameter("int_TVA") != null) {
        int_TVA = Integer.parseInt(request.getParameter("int_TVA"));
        new logger().oCategory.info("int_TVA : " + int_TVA);
    }
    if (request.getParameter("int_HTTC") != null) {
        int_HTTC = Integer.parseInt(request.getParameter("int_HTTC"));
        new logger().oCategory.info("int_HTTC : " + int_HTTC);
    }

    if (request.getParameter("lg_GROSSISTE_ID") != null) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().oCategory.info("lg_GROSSISTE_ID : " + lg_GROSSISTE_ID);
    }
    if (request.getParameter("lg_ORDERDETAIL_ID") != null) {
        lg_ORDERDETAIL_ID = request.getParameter("lg_ORDERDETAIL_ID");
        new logger().oCategory.info("lg_ORDERDETAIL_ID : " + lg_ORDERDETAIL_ID);
    }
    if (request.getParameter("lg_FAMILLE_ID") != null) {
        lg_FAMILLE_ID = request.getParameter("lg_FAMILLE_ID");
        new logger().oCategory.info("lg_FAMILLE_ID : " + lg_FAMILLE_ID);
    }
    if (request.getParameter("str_STATUT") != null && !request.getParameter("str_STATUT").equals("")) {
        str_STATUT = request.getParameter("str_STATUT");
        new logger().oCategory.info("str_STATUT : " + str_STATUT);
    }
    if (request.getParameter("int_NUMBER") != null) {
        int_NUMBER = Integer.parseInt(request.getParameter("int_NUMBER"));
        new logger().oCategory.info("int_NUMBER : " + int_NUMBER);
    }
    if (request.getParameter("int_QTE_MANQUANT") != null) {
        int_QTE_MANQUANT = Integer.parseInt(request.getParameter("int_QTE_MANQUANT"));
        new logger().oCategory.info("int_QTE_MANQUANT : " + int_QTE_MANQUANT);
    }
    // dt_DATE_LIVRAISON
    if (request.getParameter("dt_DATE_LIVRAISON") != null) {
        new logger().oCategory.info("dt_DATE_LIVRAISON ---- : " + request.getParameter("dt_DATE_LIVRAISON"));
        dt_DATE_LIVRAISON = date.getDate(request.getParameter("dt_DATE_LIVRAISON"), "08:00");
        new logger().oCategory.info("dt_DATE_LIVRAISON : " + dt_DATE_LIVRAISON);
    }

    if (request.getParameter("mode") != null) {
        mode = request.getParameter("mode");
        new logger().oCategory.info("mode : " + mode);
    }
    if (request.getParameter("str_REF_LIVRAISON") != null) {
        str_REF_LIVRAISON = request.getParameter("str_REF_LIVRAISON");
        new logger().oCategory.info("str_REF_LIVRAISON : " + str_REF_LIVRAISON);
    }

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
    TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);

    ObllBase.setDetailmessage("SUGGESTION WS TRANSACTION");

    orderManagement OorderManagement = new orderManagement(OdataManager, user);
    suggestionManagement OsuggestionManagement = new suggestionManagement(OdataManager, user);

    if (request.getParameter("mode") != null) {

        // OTOrder = OorderManagement.FindOrder(lg_ORDER_ID);
        //MODE CREATION
        if (request.getParameter("mode").equals("create")) {

            if (request.getParameter("lg_ORDER_ID").equals("0")) {
                //OTOrder = OorderManagement.createOrder(lg_GROSSISTE_ID, str_STATUT);
                JSONObject json = OorderManagement.addOrder(lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, str_STATUT, int_NUMBER);

                if (json != null) {
                    PRIX_ACHAT_TOTAL = Integer.valueOf(json.get("PRIX_ACHAT_TOTAL").toString());
                    PRIX_VENTE_TOTAL = Integer.valueOf(json.get("PRIX_VENTE_TOTAL").toString());
                    str_REF = json.getString("LGORDERID");
                    total_lineproduct = json.getInt("COUNT");
                }
            } else {
                JSONObject json = OorderManagement.addOrUpdateOrderItem(lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER);
                if (json != null) {
                    PRIX_ACHAT_TOTAL = Integer.valueOf(json.get("PRIX_ACHAT_TOTAL").toString());
                    PRIX_VENTE_TOTAL = Integer.valueOf(json.get("PRIX_VENTE_TOTAL").toString());
                    str_REF = json.getString("LGORDERID");
                    total_lineproduct = json.getInt("COUNT");
                }
                //OTOrder = OorderManagement.UpdateOrder(lg_ORDER_ID, lg_GROSSISTE_ID);
            }

            ObllBase.setDetailmessage(OorderManagement.getDetailmessage());
            ObllBase.setMessage(OorderManagement.getMessage());

            ObllBase.setMessage(OorderManagement.getMessage());
            ObllBase.setDetailmessage(OorderManagement.getDetailmessage());
            //MODE MODIFICATION
        } else if (request.getParameter("mode").equals("update")) {
            //mise a jour des prix
            OTOrder = OorderManagement.FindOrder(lg_ORDER_ID);
            OsuggestionManagement.updateItemPriceWhenOrdering(lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_FAMILLE_PRIX_VENTE, int_PRIX_REFERENCE, int_PAF, lg_FAMILLE_PRIX_ACHAT, str_ACTION, OTOrder.getStrREFORDER(), "");
            ObllBase.setMessage(OsuggestionManagement.getMessage());
            ObllBase.setDetailmessage(OsuggestionManagement.getDetailmessage());
            //fin mise a jour des prix 

            OTOrderDetail = OorderManagement.UpdateTOrderDetail(lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, str_STATUT, lg_FAMILLE_PRIX_VENTE, int_PAF);

            lstTOrderDetail = OorderManagement.getTOrderDetail(OTOrder.getLgORDERID(), OTOrder.getStrSTATUT());
            PRIX_ACHAT_TOTAL = OorderManagement.getPriceTotalAchat(lstTOrderDetail);
            PRIX_VENTE_TOTAL = OorderManagement.getPriceTotalVente(lstTOrderDetail);

            str_REF = OTOrder.getStrREFORDER();

            ObllBase.setMessage(OorderManagement.getMessage());
            ObllBase.setDetailmessage(OorderManagement.getDetailmessage());
            //MODE SUPPRESSION
        } else if (request.getParameter("mode").equals("delete")) {
            Stock stock = new StockImpl(OdataManager.getEm());
            try {
                stock.deleteOrder(lg_ORDER_ID);
                ObllBase.setMessage("1");
                ObllBase.setDetailmessage("Opération effectuée avec success");
            } catch (Exception e) {
                ObllBase.setMessage("0");
                ObllBase.setDetailmessage("Echec " + e.getLocalizedMessage());
            }

            
        } else if (request.getParameter("mode").equals("deleteItem")) {
            String lgFAMILLEID = request.getParameter("lg_FAMILLE_ID");
            String strREFLIVRAISON = request.getParameter("str_REF_LIVRAISON");
            OorderManagement.deleteUg(strREFLIVRAISON, lgFAMILLEID);
            ObllBase.setMessage(OorderManagement.getMessage());
            ObllBase.setDetailmessage(OorderManagement.getDetailmessage());
        } else if (request.getParameter("mode").equals("deleteDetail")) {

            Stock stock = new StockImpl(OdataManager.getEm());
            OTOrderDetail = ObllBase.getOdataManager().getEm().find(dal.TOrderDetail.class, lg_ORDERDETAIL_ID);

            TFamille Of = OTOrderDetail.getLgFAMILLEID();
            ObllBase.delete(OTOrderDetail);
            stock.setStatusInOrder(Of.getLgFAMILLEID());
            lstTOrderDetail = null;

            lstTOrderDetail = OorderManagement.getTOrderDetail("", lg_ORDER_ID, OTOrderDetail.getLgORDERID().getStrSTATUT());
            PRIX_ACHAT_TOTAL = OorderManagement.getPriceTotalAchat(lstTOrderDetail);
            PRIX_VENTE_TOTAL = OorderManagement.getPriceTotalVente(lstTOrderDetail);
            total_lineproduct = lstTOrderDetail.size();

            str_REF = OTOrderDetail.getLgORDERID().getLgORDERID();

        } else if (request.getParameter("mode").equals("updateBL")) {

        } else if (request.getParameter("mode").equals("createBL")) {
            bonLivraisonManagement ObonLivraisonManagement = new bonLivraisonManagement(OdataManager, OTUser);
            ObonLivraisonManagement.MakeOrderToBonLivraison(lg_ORDER_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
            ObllBase.setMessage(ObonLivraisonManagement.getMessage());
            ObllBase.setDetailmessage(ObonLivraisonManagement.getDetailmessage());
        } else if (request.getParameter("mode").equals("rupture")) {
            OTOrderDetail = OdataManager.getEm().find(dal.TOrderDetail.class, lg_ORDERDETAIL_ID);
            OorderManagement.addToruptureProduct(OTOrderDetail);
            ObllBase.setMessage(OorderManagement.getMessage());
            ObllBase.setDetailmessage(OorderManagement.getDetailmessage());
            //OfamilleGrossisteManagement.soldOutMakingON(lg_ORDERDETAIL_ID); ancien code
            //familleGrossisteManagement OfamilleGrossisteManagement = new familleGrossisteManagement(OdataManager);
        } else if (request.getParameter("mode").equals("importfile")) {
            try {

                //code gestion uoload
                boolean isMultipart = FileUpload.isMultipartContent(request);
                if (!isMultipart) {
                    //request.setAttribute("msg", "Request was not multipart!");
                    //request.getRequestDispatcher("msg.jsp").forward(request, response);
                    new logger().OCategory.info("Erreur d'imporation");
                    return;
                }
                DiskFileUpload upload = new DiskFileUpload();
                List items = upload.parseRequest(request);
                Iterator itr = items.iterator();
                while (itr.hasNext()) {
                    FileItem item = (FileItem) itr.next();
                    if (item.isFormField()) {
                        String fieldName = item.getFieldName();
                        new logger().OCategory.info("fieldName " + fieldName + "value " + item.getString());
                        if (fieldName.equalsIgnoreCase("lg_GROSSISTE_ID")) {
                            lg_GROSSISTE_ID = item.getString();
                        }
                    } else {
                        String fileName = "";   // The file name the user entered.
                        String extension = "";  // The extension.

                        fileName = item.getName();
                        int dotPos = fileName.lastIndexOf(".");
                        extension = fileName.substring(dotPos);
                        if (extension.equals(".csv") || extension.equals(".xls") || extension.equals(".xlsx")) {
                            try {
                                File fullFile = new File(item.getName());
                                String New_Name_Of_File = fullFile.getName();
                                new logger().OCategory.info("nom fichier " + jdom.path_file_generate_absolute_imported + "csv\\" + New_Name_Of_File);
                                File savedFile = new File(jdom.path_file_generate_absolute_imported + "csv\\", New_Name_Of_File);
                                item.write(savedFile);
                                String file_final_name = jdom.path_file_generate_absolute_imported + "csv\\" + New_Name_Of_File;

                                OorderManagement.ImportOrder(file_final_name, lg_ORDER_ID, modeimport, lg_GROSSISTE_ID, format, extension);
                                ObllBase.setDetailmessage(OorderManagement.getDetailmessage());
                                ObllBase.setMessage(OorderManagement.getMessage());
                            } catch (Exception e) {
                                ObllBase.setDetailmessage("Erreur lors du deplacement du fichier");
                                new logger().OCategory.info("Erreur lors du deplacement du fichier");
                                e.printStackTrace();
                                ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                            }
                        } else {
                            new logger().OCategory.info("Extension du fichier  " + extension);
                        }
                    }
                }

            } catch (Exception e) {

                new logger().OCategory.info("Error  : " + e.toString());

            }

        }
    }

    String result;
    if (ObllBase.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\", PRIX_VENTE_TOTAL: \"" + PRIX_VENTE_TOTAL + "\", PRIX_ACHAT_TOTAL: \"" + PRIX_ACHAT_TOTAL + "\", total_lineproduct: \"" + total_lineproduct + "\", ref: \"" + str_REF + "\"}";

    } else {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\", PRIX_VENTE_TOTAL: \"" + PRIX_VENTE_TOTAL + "\", PRIX_ACHAT_TOTAL: \"" + PRIX_ACHAT_TOTAL + "\", total_lineproduct: \"" + total_lineproduct + "\", ref: \"" + str_REF + "\"}";
    }


    /* OdataManager = null;
     ObllBase = null;*/

%>
<%=result%>