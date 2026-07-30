<%@page import="bll.entity.EntityData"%>
<%@page import="org.json.JSONObject"%>
<%@page import="dal.TFabriquant"%>
<%@page import="org.json.JSONArray"%>
<%@page import="dal.TDossierFacture"%>
<%@page import="dal.TFactureDetail"%>
<%@page import="dal.TPreenregistrementCompteClientTiersPayent"%>
<%@page import="dal.TBonLivraison"%>
<%@page import="dal.TTypeFacture"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TFacture"%>
<%@page import="bll.facture.factureManagement"%>
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

<%
    date key = new date();

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();


%>




<%    String str_CODE_REGROUPEMENT = "%%", lg_TYPE_TIERS_PAYANT_ID = "%%", uncheckedList = "", recordsToSend = "", lg_FACTURE_ID = "", lg_TIERSPAYANT_ID = "%%";
    String dt_debut = date.formatterMysqlShort.format(new Date()), dt_fin = date.formatterMysql.format(new Date());
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    factureManagement OfactureManagement = new factureManagement(OdataManager, OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID()));
    List<EntityData> ListEntityData = new ArrayList<>();
    if (request.getParameter("recordsToSend") != null && !"".equals(request.getParameter("recordsToSend"))) {
        recordsToSend = request.getParameter("recordsToSend");

    }

    if (request.getParameter("dt_debut") != null && !"".equals(request.getParameter("dt_debut"))) {
        dt_debut = request.getParameter("dt_debut");

    }
    if (request.getParameter("lg_FACTURE_ID") != null && !"".equals(request.getParameter("lg_FACTURE_ID"))) {
        lg_FACTURE_ID = request.getParameter("lg_FACTURE_ID");

    }

    if (request.getParameter("dt_fin") != null && !"".equals(request.getParameter("dt_fin"))) {
        dt_fin = request.getParameter("dt_fin") + " 23:59:59";

    }
    if (request.getParameter("str_CODE_REGROUPEMENT") != null && !"".equals(request.getParameter("str_CODE_REGROUPEMENT"))) {
        str_CODE_REGROUPEMENT = request.getParameter("str_CODE_REGROUPEMENT");

    }
    if (request.getParameter("lg_TYPE_TIERS_PAYANT_ID") != null && !"".equals(request.getParameter("lg_TYPE_TIERS_PAYANT_ID"))) {
        lg_TYPE_TIERS_PAYANT_ID = request.getParameter("lg_TYPE_TIERS_PAYANT_ID");

    }

    if (request.getParameter("lg_TIERS_PAYANT") != null && !"".equals(request.getParameter("lg_TIERS_PAYANT"))) {
        lg_TIERSPAYANT_ID = request.getParameter("lg_TIERS_PAYANT");

    }

    if (request.getParameter("uncheckedList") != null && !"".equals(request.getParameter("uncheckedList"))) {
        uncheckedList = request.getParameter("uncheckedList");

    }

    bllBase ObllBase = new bllBase();
    LinkedHashSet<TFacture> invoicesToPrint = new LinkedHashSet<>();
    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").equals("create facture tiers")) {

            if (request.getParameter("MODE_SELECTION") != null && "ALL".equals(request.getParameter("MODE_SELECTION"))) {
                JSONArray array = new JSONArray(uncheckedList);

                ListEntityData = OfactureManagement.getVenteTiersPayant(dt_debut, dt_fin, str_CODE_REGROUPEMENT, lg_TYPE_TIERS_PAYANT_ID, lg_TIERSPAYANT_ID);
                if (array.length() > 0) {
                    for (int i = 0; i < array.length(); i++) {
                        for (int j = 0; j < ListEntityData.size(); j++) {

                            if (ListEntityData.get(j).getStr_value2().equals(array.getString(i))) {
                                ListEntityData.remove(j);
                            }
                        }

                    }
                    for (int j = 0; j < ListEntityData.size(); j++) {

                        List<TPreenregistrementCompteClientTiersPayent> list = OfactureManagement.getListVenteTiersPayantBIS(ListEntityData.get(j).getStr_value2(), date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), "%%", "%%");
                        LinkedList<TFacture> factures = OfactureManagement.createInvoices(list, date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), ListEntityData.get(j).getStr_value2());
                        if (!factures.isEmpty()) {
                            for (TFacture e : factures) {
                                invoicesToPrint.add(e);
                            }
                            ObllBase.setMessage(commonparameter.PROCESS_SUCCESS);
                        } else {

                            ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                        }

                    }

                } else {
                    for (EntityData OEntityData : ListEntityData) {
                        List<TPreenregistrementCompteClientTiersPayent> list = OfactureManagement.getListVenteTiersPayantBIS(OEntityData.getStr_value2(), date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), "%%", "%%");
                        LinkedList<TFacture> factures = OfactureManagement.createInvoices(list, date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), OEntityData.getStr_value2());
                        if (!factures.isEmpty()) {
                            for (TFacture e : factures) {
                                invoicesToPrint.add(e);
                            }
                            ObllBase.setMessage(commonparameter.PROCESS_SUCCESS);
                        } else {

                            ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                        }
                    }

                }

            } else if (request.getParameter("MODE_SELECTION") != null && "SELECTED".equals(request.getParameter("MODE_SELECTION"))) {
                JSONArray array = new JSONArray(uncheckedList);
                ListEntityData = OfactureManagement.getVenteTiersPayant(dt_debut, dt_fin, str_CODE_REGROUPEMENT, lg_TYPE_TIERS_PAYANT_ID, lg_TIERSPAYANT_ID);
                if (array.length() > 0) {
                    for (EntityData OEntityData : ListEntityData) {
                        for (int i = 0; i < array.length(); i++) {
                            if (!OEntityData.getStr_value2().equals(array.getString(i))) {
                                List<TPreenregistrementCompteClientTiersPayent> list = OfactureManagement.getListVenteTiersPayantBIS(OEntityData.getStr_value2(), date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), "%%", "%%");
                                LinkedList<TFacture> factures = OfactureManagement.createInvoices(list, date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), OEntityData.getStr_value2());

                                if (!factures.isEmpty()) {
                                    for (TFacture e : factures) {
                                        invoicesToPrint.add(e);
                                    }
                                    ObllBase.setMessage(commonparameter.PROCESS_SUCCESS);
                                } else {

                                    ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                                }
                            }
                        }

                    }
                } else {
                    JSONArray arrayselected = new JSONArray(recordsToSend);
                    for (int i = 0; i < arrayselected.length(); i++) {

                        List<TPreenregistrementCompteClientTiersPayent> list = OfactureManagement.getListVenteTiersPayantBIS(arrayselected.getString(i), date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), "%%", "%%");
                        LinkedList<TFacture> factures = OfactureManagement.createInvoices(list, date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), arrayselected.getString(i));

                        if (!factures.isEmpty()) {
                            for (TFacture e : factures) {
                                invoicesToPrint.add(e);
                            }
                            ObllBase.setMessage(commonparameter.PROCESS_SUCCESS);
                        } else {

                            ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                        }

                    }

                }

            } else if (request.getParameter("MODE_SELECTION") != null && "OTHERS".equals(request.getParameter("MODE_SELECTION"))) {

                ListEntityData = OfactureManagement.getVenteTiersPayant(dt_debut, dt_fin, str_CODE_REGROUPEMENT, lg_TYPE_TIERS_PAYANT_ID, lg_TIERSPAYANT_ID);

                for (EntityData OEntityData : ListEntityData) {
                    List<TPreenregistrementCompteClientTiersPayent> list = OfactureManagement.getListVenteTiersPayantBIS(OEntityData.getStr_value2(), date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), "%%", "%%");

                    LinkedList<TFacture> factures = OfactureManagement.createInvoices(list, date.formatterMysqlShort.parse(dt_debut), date.formatterMysql.parse(dt_fin), OEntityData.getStr_value2());
                    if (!factures.isEmpty()) {
                        for (TFacture e : factures) {
                            invoicesToPrint.add(e);
                        }
                        ObllBase.setMessage(commonparameter.PROCESS_SUCCESS);
                    } else {

                        ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                    }
                }
            }

        } else if (request.getParameter("mode").equals("delete")) {

            boolean result = OfactureManagement.deleteInvoice(lg_FACTURE_ID,OTUser);

            if (result == true) {
                ObllBase.setMessage(commonparameter.PROCESS_SUCCESS);
            } else {
                ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                // remonte le motif reel du refus (ex : facture certifiee FNE) au lieu d'un message generique
                if (OfactureManagement.getDetailmessage() != null) {
                    ObllBase.setDetailmessage(OfactureManagement.getDetailmessage().replace("\"", "'"));
                }
            }

        } else {
        }
        session.setAttribute("invoicesToPrint", invoicesToPrint);

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