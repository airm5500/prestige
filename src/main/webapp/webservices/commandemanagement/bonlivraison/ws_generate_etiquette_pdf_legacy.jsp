<%@page import="bll.entity.EntityData"%>
<%@page import="toolkits.utils.StringComplexUtils.DataStringManager"%>
<%@page import="java.io.FileOutputStream"%>
<%@page import="java.io.OutputStream"%>
<%@page import="java.io.FileInputStream"%>
<%@page import="java.io.InputStream"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="toolkits.filesmanagers.FilesType.PdfFiles"%>
<%@page import="bll.stockManagement.StockManager"%>
<%@page import="bll.printer.PrintManangement"%>
<%@page import="bll.configManagement.PrinterManager"%>
<%@page import="bll.warehouse.WarehouseManager"%>
<%@page import="dal.TBonLivraison"%>
<%@page import="dal.TOfficine"%>
<%@page import="cust_barcode.barecodeManager"%>
<%@page import="dal.TParameters"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="dal.TTypeReglement"%>
<%@page import="dal.TCashTransaction"%>
<%@page import="dal.TEtiquette"%>
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
<%@page import="java.math.BigInteger"  %>

<%
    dataManager OdataManager = new dataManager();
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    String lg_BON_LIVRAISON_ID = "", lg_FAMILLE_ID = "%%";
    int k = 1, j = 0;
    if (request.getParameter("lg_BON_LIVRAISON_ID") != null) {
        lg_BON_LIVRAISON_ID = request.getParameter("lg_BON_LIVRAISON_ID");
        new logger().OCategory.info("lg_BON_LIVRAISON_ID " + lg_BON_LIVRAISON_ID);
    }
    
    if (request.getParameter("int_NUMBER") != null && !request.getParameter("int_NUMBER").equals("")) {
        k = Integer.parseInt(request.getParameter("int_NUMBER"));
        new logger().OCategory.info("int_NUMBER " + k);
    }

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    date key = new date();
    reportManager OreportManager = new reportManager();
    String scr_report_file = "rp_etiquette";

    OdataManager.initEntityManager();
    WarehouseManager OWarehouseManager = new WarehouseManager(OdataManager, OTUser);

    String str_final_file = "";

    List<EntityData> lstEntityData = new ArrayList<>();
    List<InputStream> inputPdfList = new ArrayList<>();

    TBonLivraison OTBonLivraison = OdataManager.getEm().find(TBonLivraison.class, lg_BON_LIVRAISON_ID);
    lstEntityData = OWarehouseManager.generateDataForEtiquette(lg_FAMILLE_ID, OTBonLivraison.getStrREFLIVRAISON());

    Map parameters;

    String str_file = "", report_generate_file = key.GetNumberRandom();
    parameters = new HashMap();
    for (int i = 0; i < lstEntityData.size(); i++) {
        parameters.put("P_H_INSTITUTION_"+k, lstEntityData.get(i).getStr_value1());
        parameters.put("P_INSTITUTION_ADRESSE_" + k, lstEntityData.get(i).getStr_value2());
        parameters.put("P_BARE_CODE_" + k, lstEntityData.get(i).getStr_value3());
        parameters.put("P_RICE_" + k, lstEntityData.get(i).getStr_value4());
        parameters.put("P_OTHER_" + k, lstEntityData.get(i).getStr_value5());
        parameters.put("P_CIP_" + k, lstEntityData.get(i).getStr_value6());
        if (k == 65) {
            report_generate_file = report_generate_file + ".pdf";
            OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
            OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "etiquette_" + report_generate_file);
            OreportManager.BuildReportEmptyDs(parameters);
            str_final_file = Ojdom.scr_report_pdf + "etiquette_" + report_generate_file;
            new logger().OCategory.info("str_file_name ********" + str_final_file);
            inputPdfList.add(new FileInputStream(str_final_file));
            parameters = new HashMap();
            k = 1;
            j=0;
        } else {
            k++;
            j++;
        }
        
    }

    if (lstEntityData.size() < 65) {
        report_generate_file = report_generate_file + ".pdf";
        OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
        OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "etiquette_" + report_generate_file);
        OreportManager.BuildReportEmptyDs(parameters);
        str_final_file = Ojdom.scr_report_pdf + "etiquette_" + report_generate_file;
        new logger().OCategory.info("str_file_name ********" + str_final_file);
        inputPdfList.add(new FileInputStream(str_final_file));
    } else {
        if(j>0) {
             report_generate_file = report_generate_file + ".pdf";
            OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
            OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "etiquette_" + report_generate_file);
            OreportManager.BuildReportEmptyDs(parameters);
            str_final_file = Ojdom.scr_report_pdf + "etiquette_" + report_generate_file;
            new logger().OCategory.info("str_file_name ********" + str_final_file);
            inputPdfList.add(new FileInputStream(str_final_file));
        }
    }

    str_file = "etiquette_" + key.GetNumberRandom() + ".pdf";
    String outputStreamFile = Ojdom.scr_report_pdf + str_file;
    OutputStream outputStream = new FileOutputStream(outputStreamFile);
    PdfFiles.mergePdfFiles(inputPdfList, outputStream);
    //response.sendRedirect(str_file_name);
    response.sendRedirect("../../../data/reports/pdf/" + str_file);
%>


