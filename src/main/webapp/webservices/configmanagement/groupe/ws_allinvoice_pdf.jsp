<%-- 
    Document   : ws_rp_print_all_invoices
    Created on : 8 déc. 2015, 10:21:33
    Author     : KKOFFI
--%>

<%@page import="java.util.concurrent.atomic.LongAdder"%>
<%@page import="java.time.format.DateTimeFormatter"%>
<%@page import="java.time.LocalDateTime"%>
<%@page import="dal.TGroupeFactures"%>
<%@page import="bll.configManagement.GroupeTierspayantController"%>
<%@page import="dal.TGroupeTierspayant"%>
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
   OdataManager.initEntityManager();
   
    factureManagement facManagement = null;
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    Map<String, LinkedHashSet<TFacture>> invoicesToPrint = new HashMap<>();
    List<InputStream> inputPdfList = new ArrayList<>();

    jdom.InitRessource();
    jdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();
     OTUser=OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    facManagement = new factureManagement(OdataManager, OTUser);
    GroupeTierspayantController controller = new GroupeTierspayantController(OdataManager.getEmf());
    TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");
    String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();

    String P_H_LOGO = jdom.scr_report_file_logo;
    invoicesToPrint = (Map<String, LinkedHashSet<TFacture>>) session.getAttribute("groupeinvoicesToPrint");
    /* les factures à imprimer */
    long P_ATT_AMOUNTGROUPE = 0l;
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
        // P_INSTITUTION_ADRESSE += " - Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE());
    }
    if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
        P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
    }
    if (oTOfficine.getStrNUMCOMPTABLE() != null) {
        P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
    }
    Map parameters = new HashMap();
    parameters.put("P_H_LOGO", P_H_LOGO);
    parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_PRINTED_BY", " LE PHARMACIEN ");
    // parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_FOOTER_RC", P_FOOTER_RC);
    TParameters recapParam = null;
    try {
        recapParam = OdataManager.getEm().find(dal.TParameters.class, "KEY_IMPRESSION_RECAP_FACTURE");
    } catch (Exception e) {
    }
    for (Map.Entry<String, LinkedHashSet<TFacture>> en : invoicesToPrint.entrySet()) {
        LinkedHashSet<TFacture> factures = en.getValue();

        String codeFac = en.getKey();

        TGroupeTierspayant g = controller.getGroupByCODEFACT(codeFac);
        TGroupeFactures gp = controller.getgroupeFactureByCodeFacture(codeFac);
        String footer = "";
        Integer AMOUTGRP = controller.groupeTiersPayantAmount(g.getLgGROUPEID(), codeFac);
        String P_H_CLT_INFOS = "PERIODE DU " + date.formatterShort.format(gp.getDtDEBUTFACTURE()) + " AU " + date.formatterShort.format(gp.getDtFINFACTURE());
        parameters.put("P_CODEREGROUPEMENT", g.getStrLIBELLE());
        parameters.put("P_ADRESSE", g.getStrADRESSE());
        parameters.put("P_GROUPETELEPHONE", g.getStrTELEPHONE());
        parameters.put("P_CODEFACTUREFOOTER", "");
        parameters.put("lg_GROUPE", g.getLgGROUPEID());
        parameters.put("P_CODEGRPUPEFACTURE", codeFac);
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);

        parameters.put("P_TOTAL_INGROUPE_LETTERS", conversion.GetNumberTowords(Double.parseDouble(AMOUTGRP + "")).toUpperCase() + " (" + conversion.AmountFormat(Integer.valueOf(AMOUTGRP + "")) + " FCFA)");
        parameters.put("P_DATE", "");

        String ofile = "rp_groupe_invoice";
        String footerid = key.GetNumberRandom();
        OreportManager.setPath_report_src(jdom.scr_report_file + ofile + ".jrxml");
        OreportManager.setPath_report_pdf(jdom.scr_report_pdf + "rp_groupe_invoice" + footerid + ".pdf");
        footer = "rp_groupe_invoice" + footerid + ".pdf";
        OreportManager.BuildReport(parameters, Ojconnexion);
        inputPdfList.add(new FileInputStream(jdom.scr_report_pdf + footer));

        String CODEFATUREGROUPE = "FACTURE N° :";
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
        LongAdder count = new LongAdder();
        for (TFacture OFacture : factures) {
            count.increment();
            String factuteFileName = "rp_facture_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyy_MM_dd_H_mm_ss")) + count.intValue() + ".pdf";
            String tauxpath = "";
            CODEFATUREGROUPE += OFacture.getStrCODEFACTURE() + ",";
            String scr_report_file = "rp_facturerecap";
            TTiersPayant OTiersPayant = OdataManager.getEm().find(TTiersPayant.class, OFacture.getStrCUSTOMER());
            TTypeMvtCaisse OTypeMvtCaisse = OdataManager.getEm().find(TTypeMvtCaisse.class, OFacture.getLgTYPEFACTUREID().getLgTYPEFACTUREID());
            String report_generate_file = key.GetNumberRandom();
            report_generate_file = report_generate_file + ".pdf";
            if (recapParam != null && Integer.valueOf(recapParam.getStrVALUE()) == 1) {
                OreportManager.setPath_report_src(jdom.scr_report_file + scr_report_file + ".jrxml");
                OreportManager.setPath_report_pdf(jdom.scr_report_pdf + "rp_facturerecap" + report_generate_file);
            }

            String recap = "rp_facturerecap" + report_generate_file;

            parameters.put("P_LG_FACTURE_ID", OFacture.getLgFACTUREID());
            parameters.put("P_LG_TIERS_PAYANT_ID", OTiersPayant.getLgTIERSPAYANTID());
            parameters.put("P_CODE_FACTURE", "FACTURE N° " + OFacture.getStrCODEFACTURE() + " (" + OTiersPayant.getStrNAME() + ")");
            parameters.put("P_TIERS_PAYANT_NAME", OTiersPayant.getStrFULLNAME());
            parameters.put("P_CODE_COMPTABLE", "CODE COMPTABLE : " + OTypeMvtCaisse.getStrCODECOMPTABLE());

            // parameters.put("P_NUMBERPERPAGE", 12);
            parameters.put("P_CODE_POSTALE", (OTiersPayant.getStrADRESSE() != null && !"".equals(OTiersPayant.getStrADRESSE())) ? OTiersPayant.getStrADRESSE() : "");
            parameters.put("P_COMPTE_CONTRIBUABLE", (OTiersPayant.getStrCOMPTECONTRIBUABLE() != null && !"".equals(OTiersPayant.getStrCOMPTECONTRIBUABLE())) ? "N ° CC :" + OTiersPayant.getStrCOMPTECONTRIBUABLE() : "");
            parameters.put("P_CODE_OFFICINE", (OTiersPayant.getStrCODEOFFICINE() != null && !"".equals(OTiersPayant.getStrCODEOFFICINE())) ? "N ° CO :" + OTiersPayant.getStrCODEOFFICINE() : "");
            parameters.put("P_REGISTRE_COMMERCE", (OTiersPayant.getStrREGISTRECOMMERCE() != null && !"".equals(OTiersPayant.getStrREGISTRECOMMERCE())) ? "N ° RC :" + OTiersPayant.getStrREGISTRECOMMERCE() : "");
            /* fin du recap */
            if (recapParam != null && Integer.valueOf(recapParam.getStrVALUE()) == 1) {
                OreportManager.BuildReport(parameters, Ojconnexion);
            }

            String codeModelFacture = OTiersPayant.getLgMODELFACTUREID().getLgMODELFACTUREID();
            long P_ATT_AMOUNT = 0;
            String finalpath = "";
            if (!"6".equals(codeModelFacture)) {

                List<EntityData> entityDatas = facManagement.getFactureReportData(OFacture.getLgFACTUREID(), OTiersPayant.getLgTIERSPAYANTID());
                long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_REMISEFORFAITAIRE = 0, P_MONTANTBRUTTP = 0, P_REMISE_VENTE = 0, P_TVA_VENTE = 0;

                for (EntityData OtEntityData : entityDatas) {
                    P_REMISE_VENTE += Double.valueOf(OtEntityData.getStr_value8()).intValue();
                    System.out.println(" P_REMISE_VENTE --------------------- >>> " + P_REMISE_VENTE);
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

                OreportManager.setPath_report_src(jdom.scr_report_file + scr_report_file + ".jrxml");
                OreportManager.setPath_report_pdf(jdom.scr_report_pdf + factuteFileName);
                OreportManager.BuildReport(parameters, Ojconnexion);
                inputPdfList.add(new FileInputStream(OreportManager.getPath_report_pdf()));
                //inputPdfList.add(new FileInputStream(jdom.scr_report_pdf + factuteFileName));
                //   finalpath = jdom.scr_report_pdf + "rp_facture_" + report_generate_file;
            } else {

                List taux = facManagement.getFacturePercent(OFacture.getLgFACTUREID());

                for (int i = 0; i < taux.size(); i++) {
                    int tauxValue = Integer.valueOf(taux.get(i) + "");

                    List<EntityData> entityDatas = facManagement.getFactureReportDataPercent(OFacture.getLgFACTUREID(), OTiersPayant.getLgTIERSPAYANTID(), tauxValue);
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

                    }
                    P_ATT_AMOUNTGROUPE += P_ATT_AMOUNT;

                    parameters.put("P_TAUXCOUVERTURE", tauxValue + "%");

                    scr_report_file = "rp_facture_percentage";
                    if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                        scr_report_file = "rp_facture_withremise_percentage";
                    }
                    OreportManager.setPath_report_pdf(jdom.scr_report_pdf + factuteFileName);

                    OreportManager.setPath_report_src(jdom.scr_report_file + scr_report_file + ".jrxml");
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
                    inputPdfList.add(new FileInputStream(OreportManager.getPath_report_pdf()));
                    finalpath = OreportManager.getPath_report_pdf();
                    tauxpath += finalpath + "@";
                }

            }
            //  OreportManager.BuildReport(parameters, Ojconnexion);
            System.out.println("**** gg   >>>>  " + OreportManager.getPath_report_pdf());
            for (int j = 1; j < OTiersPayant.getIntNBREEXEMPLAIREBORD(); j++) {
                if (recapParam != null && Integer.valueOf(recapParam.getStrVALUE()) == 1) {
                    inputPdfList.add(new FileInputStream(jdom.scr_report_pdf + recap));
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

                    inputPdfList.add(new FileInputStream(OreportManager.getPath_report_pdf()));

                }

            }
        }

    }
    String rp_Invoices_ = "rp_facture_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyy_MM_dd_H_mm_ss")) + ".pdf";
    //  String str_file = "rp_Invoices_" + key.GetNumberRandom() + ".pdf";
    String outputStreamFile = jdom.scr_report_pdf + rp_Invoices_;
    OutputStream outputStream = new FileOutputStream(outputStreamFile);

    PdfFiles.mergePdfFiles(inputPdfList, outputStream);
    //response.sendRedirect(str_file_name);



    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + rp_Invoices_);


%>


