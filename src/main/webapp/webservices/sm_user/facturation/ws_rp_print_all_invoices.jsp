<%-- 
    Document   : ws_rp_print_all_invoices
    Created on : 8 dï¿½c. 2015, 10:21:33
    Author     : KKOFFI
--%>

<%@page import="bll.configManagement.GroupeTierspayantController"%>
<%@page import="org.json.JSONObject"%>
<%@page import="bll.report.JsonDataSourceApp"%>
<%@page import="org.json.JSONArray"%>
<%@page import="toolkits.filesmanagers.FilesType.PdfFiles"%>
<%@page import="java.io.FileOutputStream"%>
<%@page import="java.io.OutputStream"%>
<%@page import="java.io.FileInputStream"%>
<%@page import="java.io.InputStream"%>
<%@page import="bll.facture.factureManagement"%>
<%@page import="bll.entity.EntityData"%>
<%@page import="dal.TTypeMvtCaisse"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TFacture"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.commandeManagement.orderManagement"%>
<%@page import="dal.TOrderDetail"%>
<%@page import="java.awt.print.PageFormat"%>
<%@page import="java.awt.print.Paper"%>
<%@page import="dal.TPreenregistrementCompteClient"%>
<%@page import="dal.TOfficine"%>
<%@page import="cust_barcode.barecodeManager"%>
<%@page import="dal.TParameters"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="dal.TTypeReglement"%>
<%@page import="dal.TCashTransaction"%>
<%@page import="dal.TPreenregistrement"%>
<%@page import="dal.TPreenregistrementDetail"%>
<%@page import="bll.preenregistrement.Preenregistrement"%>
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

<%
    Translate OTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    List<EntityData> entityDatas = new ArrayList<>();

    bllBase ObllBase = new bllBase();
    factureManagement facManagement = null;
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    String CODEREGROUPEMENT = "";
    if (request.getParameter("CODEREGROUPEMENT") != null && !"".equals(request.getParameter("CODEREGROUPEMENT"))) {
        CODEREGROUPEMENT = request.getParameter("CODEREGROUPEMENT");

    }
    JsonDataSourceApp app = null;

    if (request.getParameter("printAll") != null) {
        Set<TFacture> invoicesToPrint = new HashSet<>();
        List<InputStream> inputPdfList = new ArrayList<>();
        jdom Ojdom = new jdom();
        Ojdom.InitRessource();
        Ojdom.LoadRessource();
        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        date key = new date();
        reportManager OreportManager = new reportManager();
        bllBase obllBase = new bllBase();
        obllBase.checkDatamanager();
        TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");
        String footer = "";
        String CODEFATUREGROUPE = "FACTURE N° :";
        invoicesToPrint = (HashSet<TFacture>) session.getAttribute("invoicesToPrint");
        Iterator<TFacture> it = invoicesToPrint.iterator();
        long P_ATT_AMOUNTGROUPE = 0l;
        facManagement = new factureManagement(OdataManager, OTUser);
        TParameters recapParam = null;
        try {
            recapParam = obllBase.getOdataManager().getEm().find(dal.TParameters.class, "KEY_IMPRESSION_RECAP_FACTURE");
        } catch (Exception e) {
        }
        while (it.hasNext()) {
            String report_generate_file = key.GetNumberRandom();
            String tauxpath = "";
            TFacture OFacture = it.next();
            CODEFATUREGROUPE += OFacture.getStrCODEFACTURE() + ",";
            TTiersPayant OTiersPayant = obllBase.getOdataManager().getEm().find(TTiersPayant.class, OFacture.getStrCUSTOMER());
            TTypeMvtCaisse OTypeMvtCaisse = obllBase.getOdataManager().getEm().find(TTypeMvtCaisse.class, OFacture.getLgTYPEFACTUREID().getLgTYPEFACTUREID());
            String scr_report_file = "rp_facturerecap";
            String codeModelFacture = OTiersPayant.getLgMODELFACTUREID().getLgMODELFACTUREID();
            int codeFACT =  Integer.parseInt(codeModelFacture);
            //31102017
            Map<String, Object> parameters = new HashMap();
            String recap = "";

            if (7 == codeFACT) {
                scr_report_file = "rp_facturerecapClient";
                parameters.put("P_DATEFAC", date.FULDATE.format(OFacture.getDtCREATED()));
                parameters.put("P_TOTAL_IN_LETTERS", conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID())).toUpperCase() + " (" + conversion.AmountFormat(facManagement.getAmount(OFacture.getLgFACTUREID()).intValue()) + " FCFA)");
            }
            /* Ceation du recap debut  */
        Double montantRecap=facManagement.getAmount(OFacture.getLgFACTUREID());
            report_generate_file = report_generate_file + ".pdf";
            OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
            OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_facturerecap" + report_generate_file);
            recap = "rp_facturerecap" + report_generate_file;
            String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
            String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
            String P_H_CLT_INFOS = "PERIODE DU " + date.formatterShort.format(OFacture.getDtDEBUTFACTURE()) + " AU " + date.formatterShort.format(OFacture.getDtFINFACTURE());
            String P_H_LOGO = jdom.scr_report_file_logo;
          
            parameters.put("P_H_LOGO", P_H_LOGO);
            parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
            parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
            parameters.put("P_PRINTED_BY", " ");

            parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
            parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
            parameters.put("P_LG_FACTURE_ID", OFacture.getLgFACTUREID());
            parameters.put("P_LG_TIERS_PAYANT_ID", OTiersPayant.getLgTIERSPAYANTID());
            parameters.put("P_CODE_FACTURE", "FACTURE N° " + OFacture.getStrCODEFACTURE() + " (" + OTiersPayant.getStrNAME() + ")");
            parameters.put("P_TIERS_PAYANT_NAME", OTiersPayant.getStrFULLNAME());
            parameters.put("P_CODE_COMPTABLE", "CODE COMPTABLE : " + OTypeMvtCaisse.getStrCODECOMPTABLE());
             parameters.put("P_TOTAL_IN_LETTERS", conversion.GetNumberTowords(montantRecap).toUpperCase() + " (" + conversion.AmountFormat(montantRecap.intValue()) + " FCFA)");
            String P_FOOTER_RC = "";

            if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
                P_FOOTER_RC += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
            }

            if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
                P_FOOTER_RC += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
            }
            if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
                P_FOOTER_RC += " - Régime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
            }
            if (oTOfficine.getStrCENTREIMPOSITION() != null) {
                P_FOOTER_RC += " - Centre des Impôts: " + oTOfficine.getStrCENTREIMPOSITION();
            }

            if (oTOfficine.getStrPHONE() != null) {
                String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
                if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                    String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                    for (String va  : phone) {
                        finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                    }
                }

                P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
               
            }
            if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
                P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
            }
            if (oTOfficine.getStrNUMCOMPTABLE() != null) {
                P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
            }

            parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
            parameters.put("P_FOOTER_RC", P_FOOTER_RC);

            parameters.put("P_CODE_POSTALE", (OTiersPayant.getStrADRESSE() != null && !"".equals(OTiersPayant.getStrADRESSE())) ? OTiersPayant.getStrADRESSE() : "");
            parameters.put("P_COMPTE_CONTRIBUABLE", (OTiersPayant.getStrCOMPTECONTRIBUABLE() != null && !"".equals(OTiersPayant.getStrCOMPTECONTRIBUABLE())) ? OTiersPayant.getStrCOMPTECONTRIBUABLE() : "");
            parameters.put("P_CODE_OFFICINE", (OTiersPayant.getStrCODEOFFICINE() != null && !"".equals(OTiersPayant.getStrCODEOFFICINE())) ? OTiersPayant.getStrCODEOFFICINE() : "");
            parameters.put("P_REGISTRE_COMMERCE", (OTiersPayant.getStrREGISTRECOMMERCE() != null && !"".equals(OTiersPayant.getStrREGISTRECOMMERCE())) ? OTiersPayant.getStrREGISTRECOMMERCE() : "");

            /* fin du recap */
            if (recapParam != null && Integer.valueOf(recapParam.getStrVALUE()) == 1) {
                OreportManager.BuildReport(parameters, Ojconnexion);
                inputPdfList.add(new FileInputStream(Ojdom.scr_report_pdf + recap));
            }

          
            long P_ATT_AMOUNT = 0;
            String finalpath = "";

            switch (codeFACT) {
                case 9:
                    GroupeTierspayantController controller = new GroupeTierspayantController(OdataManager.getEmf());
                    String Path = "";
                    app = new JsonDataSourceApp();
                    parameters.put("P_TOTAL_IN_LETTERS", conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID())).toUpperCase() + " (" + conversion.AmountFormat(facManagement.getAmount(OFacture.getLgFACTUREID()).intValue()) + " FCFA)");

                    Path = app.fill(parameters, controller.generateInvoices(OFacture.getLgFACTUREID()), Ojdom.scr_report_file + "rp_groupbycompany.jrxml", "rp_groupbycompany_" + date.FILENAME.format(new Date()) + ".pdf");

                    String _outputStreamFile = Ojdom.scr_report_pdf + Path;
                

                    finalpath = _outputStreamFile;

                    break;

                case 8:
                    String complementairePath = "";
                    app = new JsonDataSourceApp();
                    parameters.put("P_TOTAL_IN_LETTERS", conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID())).toUpperCase() + " (" + conversion.AmountFormat(facManagement.getAmount(OFacture.getLgFACTUREID()).intValue()) + " FCFA)");
                    complementairePath = app.fill(OFacture, parameters);

                    String str_file = "rp_facture_" + date.FILENAME.format(new Date()) + ".pdf";
                    String outputStreamFile = Ojdom.scr_report_pdf + str_file;
                    
                    finalpath = outputStreamFile;

                    break;
                case 6:
                    List taux = facManagement.getFacturePercent(OFacture.getLgFACTUREID());

                    for (int i = 0; i < taux.size(); i++) {
                        int tauxValue = Integer.valueOf(taux.get(i) + "");

                        entityDatas = facManagement.getFactureReportDataPercent(OFacture.getLgFACTUREID(), OTiersPayant.getLgTIERSPAYANTID(), tauxValue);
                        long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_REMISEFORFAITAIRE = 0, P_MONTANTBRUTTP = 0;

                        for (EntityData OtEntityData : entityDatas) {
                            if (!OtEntityData.getStr_value6().equals("null")) {
                                P_MONTANTBRUTTP = Double.valueOf(OtEntityData.getStr_value6()).longValue();
                            }
                            if (!OtEntityData.getStr_value5().equals("null")) {
                                P_REMISEFORFAITAIRE = Double.valueOf(OtEntityData.getStr_value5()).longValue();
                            }
                            if (!OtEntityData.getStr_value7().equals("null")) {
                                P_ATT_AMOUNT = Double.valueOf(OtEntityData.getStr_value7()).longValue();
                            }

                            if (!OtEntityData.getStr_value2().equals("null")) {
                                P_ADHER_AMOUNT += Long.valueOf(OtEntityData.getStr_value2());
                            }
                            if (!OtEntityData.getStr_value4().equals("null")) {
                                P_TOTAL_AMOUNT += Long.valueOf(OtEntityData.getStr_value4());
                            }
                            if (!OtEntityData.getStr_value1().equals("null")) {

                                P_REMISE_AMOUNT = Double.valueOf(OtEntityData.getStr_value1()).intValue();
                            }

                        }
                        P_ATT_AMOUNTGROUPE += P_ATT_AMOUNT;

                        parameters.put("P_TAUXCOUVERTURE", tauxValue + "%");

                        scr_report_file = "rp_facture_percentage";
                        if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                            scr_report_file = "rp_facture_withremise_percentage";
                        }

                        report_generate_file = key.GetNumberRandom();

                        report_generate_file = report_generate_file + ".pdf";
                        OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
                        OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_facture_percentage_" + report_generate_file);
                        parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                        parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                        parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                        parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                        parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                        parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + tauxValue + "% ( NOMBRE DE BONS=" + facManagement.getDetailsFactureCount(OFacture.getLgFACTUREID(), tauxValue) + " )");

                        parameters.put("P_TOTAL_IN_LETTERS", conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " (" + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                        OreportManager.BuildReport(parameters, Ojconnexion);
                        
                        finalpath = Ojdom.scr_report_pdf + "rp_facture_percentage_" + report_generate_file;
                        tauxpath += finalpath + "@";
                    }
                    break;
                case 7:
                    JSONArray clientsfacture = facManagement.getCmpt(OFacture.getLgFACTUREID());
                    String dateFact = date.FULDATE.format(OFacture.getDtCREATED());
                    for (int idx = 0; idx < clientsfacture.length(); idx++) {
                        JSONObject idCMP = clientsfacture.getJSONObject(idx);
                        report_generate_file = key.GetNumberRandom();

                        report_generate_file = report_generate_file + ".pdf";
                        parameters.put("LGCMP", idCMP.get("idcmp"));
                        parameters.put("DATEFACT", dateFact);
                        parameters.put("P_CODE_FACTURE", "FACTURE N° " + OFacture.getStrCODEFACTURE() + "/" + ((idx + 1) < 10 ? "0" : "") + (idx + 1) + "/" + date.getAnnee(OFacture.getDtDATEFACTURE()));
                        parameters.put("P_CLIENT_NAME", idCMP.get("strFIRSTNAME"));
                        parameters.put("P_NUMEROS", idCMP.get("strNUMEROSECURITESOCIAL"));
                        OreportManager.setPath_report_src(Ojdom.scr_report_file + "rp_facture_Client" + ".jrxml");
                        OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_facture_" + report_generate_file);
                        parameters.put("P_TOTAL_IN_LETTERS", conversion.GetNumberTowords(idCMP.getDouble("Montant")).toUpperCase() + " (" + conversion.AmountFormat(Double.valueOf(idCMP.getDouble("Montant")).intValue()) + " FCFA)");
                        OreportManager.BuildReport(parameters, Ojconnexion);
                 
                        finalpath = Ojdom.scr_report_pdf + "rp_facture_" + report_generate_file;
                    }
                    break;

                default:
                    entityDatas = facManagement.getFactureReportData(OFacture.getLgFACTUREID(), OTiersPayant.getLgTIERSPAYANTID());
                    long P_TOTAL_AMOUNT = 0,
                     P_ADHER_AMOUNT = 0,
                     P_REMISE_AMOUNT = 0,
                     P_REMISEFORFAITAIRE = 0,
                     P_MONTANTBRUTTP = 0,
                     P_REMISE_VENTE = 0,
                     P_TVA_VENTE = 0;

                    for (EntityData OtEntityData : entityDatas) {
                        P_REMISE_VENTE += Double.valueOf(OtEntityData.getStr_value8()).intValue();
                        P_TVA_VENTE += Double.valueOf(OtEntityData.getStr_value9()).intValue();
                        if (!OtEntityData.getStr_value6().equals("null")) {
                            P_MONTANTBRUTTP = Double.valueOf(OtEntityData.getStr_value6()).longValue();
                        }
                        if (!OtEntityData.getStr_value5().equals("null")) {
                            P_REMISEFORFAITAIRE = Double.valueOf(OtEntityData.getStr_value5()).longValue();
                        }
                        if (!OtEntityData.getStr_value3().equals("null")) {
                            P_ATT_AMOUNT = Double.valueOf(OtEntityData.getStr_value3()).longValue();
                        }

                        if (!OtEntityData.getStr_value2().equals("null")) {
                            P_ADHER_AMOUNT += Long.valueOf(OtEntityData.getStr_value2());
                        }
                        if (!OtEntityData.getStr_value4().equals("null")) {
                            P_TOTAL_AMOUNT += Long.valueOf(OtEntityData.getStr_value4());
                        }
                        if (!OtEntityData.getStr_value1().equals("null")) {

                            P_REMISE_AMOUNT = Double.valueOf(OtEntityData.getStr_value1()).intValue();
                        }

                    }

                    P_ATT_AMOUNTGROUPE += P_ATT_AMOUNT;

                    parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                    parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                    parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                    parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                    parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                    parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TVA_VENTE", P_TVA_VENTE);
                    parameters.put("P_REMISE_VENTE", P_REMISE_VENTE);
                    parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + OTiersPayant.getStrNAME() + " ( NOMBRE DE BONS=" + entityDatas.size() + " )");
                    parameters.put("P_TOTAL_IN_LETTERS", conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " (" + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                    scr_report_file = "rp_facture_" + OTiersPayant.getLgMODELFACTUREID().getStrVALUE();

                    if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                        scr_report_file = "rp_facture_withremise_" + OTiersPayant.getLgMODELFACTUREID().getStrVALUE();
                    }

                    report_generate_file = key.GetNumberRandom();

                    new logger().OCategory.info("scr_report_file " + scr_report_file);
                    report_generate_file = report_generate_file + ".pdf";
                    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
                    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_facture_" + report_generate_file);
                    OreportManager.BuildReport(parameters, Ojconnexion);
                    finalpath = Ojdom.scr_report_pdf + "rp_facture_" + report_generate_file;
                    break;

            }
            inputPdfList.add(new FileInputStream(finalpath));

            if (!"".equals(CODEREGROUPEMENT)) {
                parameters.put("P_CODEREGROUPEMENT", CODEREGROUPEMENT);
                parameters.put("P_CODEFACTUREFOOTER", CODEFATUREGROUPE.substring(0, CODEFATUREGROUPE.length() - 1));
                parameters.put("P_TOTAL_INGROUPE_LETTERS", conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNTGROUPE + "")).toUpperCase() + " (" + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNTGROUPE + "")) + " FCFA)");
                parameters.put("P_DATE", date.formatterMysqlShort.format(new Date()));

                String ofile = "rp_facturerefooter";
                String footerid = key.GetNumberRandom();
                OreportManager.setPath_report_src(Ojdom.scr_report_file + ofile + ".jrxml");
                OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_facturerefooter" + footerid + ".pdf");
                footer = "rp_facturerefooter" + footerid + ".pdf";

            }

            OreportManager.BuildReport(parameters, Ojconnexion);
            for (int j = 1; j < OTiersPayant.getIntNBREEXEMPLAIREBORD(); j++) {
                if (recapParam != null && Integer.valueOf(recapParam.getStrVALUE()) == 1) {
                    inputPdfList.add(new FileInputStream(Ojdom.scr_report_pdf + recap));
                }

                if (!"".equals(tauxpath)) {
                    if (tauxpath.indexOf("@") >= 0) {
                        String[] stringarray = tauxpath.split("@");
                        for (int i = 0; i < stringarray.length; i++) {
                            String string = stringarray[i];
                            inputPdfList.add(new FileInputStream(string));
                        }
                    }
                } else {
                    inputPdfList.add(new FileInputStream(finalpath));
                }

            }
        }
        if (!"".equals(CODEREGROUPEMENT)) {
            inputPdfList.add(new FileInputStream(Ojdom.scr_report_pdf + footer));
        }

        String str_file = "rp_facture_" + date.FILENAME.format(new Date()) + ".pdf";
        String outputStreamFile = Ojdom.scr_report_pdf + str_file;
        OutputStream outputStream = new FileOutputStream(outputStreamFile);
        PdfFiles.mergePdfFiles(inputPdfList, outputStream);
        ObllBase.setKey(new date());
        ObllBase.setOTranslate(OTranslate);
        ObllBase.setOTUser(OTUser);
        Ojconnexion.CloseConnexion();
        session.removeAttribute("invoicesToPrint");
        response.sendRedirect(request.getContextPath() + "/data/reports/pdf/" + str_file);

    }

%>


