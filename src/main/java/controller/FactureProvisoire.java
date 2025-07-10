/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import bll.configManagement.GroupeTierspayantController;
import bll.entity.EntityData;
import bll.facture.factureManagement;
import bll.report.JsonDataSourceApp;
import commonTasks.dto.CodeFactureDTO;
import dal.TFacture;
import dal.TModelFacture;
import dal.TOfficine;
import dal.TParameters;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.LongAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import net.sf.jasperreports.engine.JRException;
import org.json.JSONArray;
import org.json.JSONObject;
import report.reportManager;
import toolkits.filesmanagers.FilesType.PdfFiles;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.jdom;

/**
 *
 * @author kkoffi
 */
public class FactureProvisoire extends HttpServlet {

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, JRException {
        SimpleDateFormat FULDATE = new SimpleDateFormat("EE d MMMM yyyy");
        DateFormat DF = new SimpleDateFormat("dd_MM_YYYY_HH_mm_ss");
        LongAdder longAdder = new LongAdder();
        response.setContentType("application/pdf");
        List<EntityData> entityDatas;
        String modeId = null, mode = "ALL";

        if (request.getParameter("modeId") != null && !"".equals(request.getParameter("modeId"))) {
            modeId = request.getParameter("modeId");

        }
        if (request.getParameter("mode") != null && !"".equals(request.getParameter("mode"))) {
            mode = request.getParameter("mode");

        }

        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        List<InputStream> inputPdfList = new ArrayList<>();
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        reportManager OreportManager = new reportManager();
        dataManager OdataManager = new dataManager();
        OdataManager.initEntityManager();
        TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");

        // String CODEFATUREGROUPE = "FACTURE N° :";
        // String CODEFATUREGROUPE = " ";
        factureManagement facManagement = new factureManagement(OdataManager, OTUser);
        JsonDataSourceApp app;
        TParameters recapParam = null;
        try {
            recapParam = OdataManager.getEm().find(dal.TParameters.class, "KEY_IMPRESSION_RECAP_FACTURE");
        } catch (Exception e) {
        }
        if (mode.contains("ALL")) {
            List<CodeFactureDTO> code = (List<CodeFactureDTO>) session.getAttribute("codefacturedto");
            TModelFacture modelFacture = OdataManager.getEm().find(TModelFacture.class, modeId);

            String codeModelFacture = modeId;
            int codeFACT = Integer.parseInt(codeModelFacture);
            for (CodeFactureDTO ob : code) {
                // String tauxpath = "";
                TFacture facture = OdataManager.getEm().find(TFacture.class, ob.getFactureId());
                TTypeMvtCaisse OTypeMvtCaisse = OdataManager.getEm().find(TTypeMvtCaisse.class,
                        facture.getLgTYPEFACTUREID().getLgTYPEFACTUREID());
                // CODEFATUREGROUPE += facture.getStrCODEFACTURE() + ",";

                TTiersPayant OTiersPayant = facture.getTiersPayant();
                String scr_report_file = "", report_generate_file = "";
                // String scr_report_file = "rp_facturerecap";
                Map<String, Object> parameters = new HashMap<>();

                String recap = "";

                if (7 == codeFACT) {
                    scr_report_file = "rp_facturerecapClient";
                    parameters.put("P_DATEFAC", date.FULDATE.format(facture.getDtCREATED()));
                    parameters.put("P_TOTAL_IN_LETTERS",
                            conversion.GetNumberTowords(facManagement.getAmount(facture.getLgFACTUREID())).toUpperCase()
                                    + " (" + conversion.AmountFormat(
                                            facManagement.getAmount(facture.getLgFACTUREID()).intValue())
                                    + " FCFA)");
                }
                /* Ceation du recap debut */

                report_generate_file = report_generate_file + ".pdf";
                OreportManager.setPath_report_src(jdom.scr_report_file + scr_report_file + ".jrxml");
                OreportManager.setPath_report_pdf(jdom.scr_report_pdf + "rp_facturerecap" + report_generate_file);
                recap = "rp_facturerecap" + report_generate_file;
                String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
                String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
                String P_H_CLT_INFOS = "PERIODE DU " + date.formatterShort.format(facture.getDtDEBUTFACTURE()) + " AU "
                        + date.formatterShort.format(facture.getDtFINFACTURE());
                String P_H_LOGO = jdom.scr_report_file_logo;
                // Map parameters = new HashMap();
                parameters.put("P_H_LOGO", P_H_LOGO);
                parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
                parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
                parameters.put("P_PRINTED_BY", " ");
                // parameters.put("P_PRINTED_BY", " LE PHARMACIEN ");
                // parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
                parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
                parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
                parameters.put("P_LG_FACTURE_ID", facture.getLgFACTUREID());
                parameters.put("P_LG_TIERS_PAYANT_ID", OTiersPayant.getLgTIERSPAYANTID());
                parameters.put("P_CODE_FACTURE",
                        "FACTURE N° " + facture.getStrCODEFACTURE() + " (" + OTiersPayant.getStrNAME() + ")");
                parameters.put("P_TIERS_PAYANT_NAME", OTiersPayant.getStrFULLNAME());
                parameters.put("P_CODE_COMPTABLE", "CODE COMPTABLE : " + OTypeMvtCaisse.getStrCODECOMPTABLE());
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
                    String finalphonestring = oTOfficine.getStrPHONE() != null
                            ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
                    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                        for (String va : phone) {
                            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                        }
                    }

                    P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
                    // P_INSTITUTION_ADRESSE += " - Tel: " + conversion.PhoneNumberFormat("+225",
                    // oTOfficine.getStrPHONE());
                }
                if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
                    P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
                }
                if (oTOfficine.getStrNUMCOMPTABLE() != null) {
                    P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
                }

                parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
                parameters.put("P_FOOTER_RC", P_FOOTER_RC);

                parameters.put("P_CODE_POSTALE",
                        (OTiersPayant.getStrADRESSE() != null && !"".equals(OTiersPayant.getStrADRESSE()))
                                ? OTiersPayant.getStrADRESSE() : "");
                parameters.put("P_COMPTE_CONTRIBUABLE",
                        (OTiersPayant.getStrCOMPTECONTRIBUABLE() != null
                                && !"".equals(OTiersPayant.getStrCOMPTECONTRIBUABLE()))
                                        ? OTiersPayant.getStrCOMPTECONTRIBUABLE() : "");
                parameters.put("P_CODE_OFFICINE",
                        (OTiersPayant.getStrCODEOFFICINE() != null && !"".equals(OTiersPayant.getStrCODEOFFICINE()))
                                ? OTiersPayant.getStrCODEOFFICINE() : "");
                parameters.put("P_REGISTRE_COMMERCE",
                        (OTiersPayant.getStrREGISTRECOMMERCE() != null
                                && !"".equals(OTiersPayant.getStrREGISTRECOMMERCE()))
                                        ? OTiersPayant.getStrREGISTRECOMMERCE() : "");

                /* fin du recap */
                if (recapParam != null && Integer.parseInt(recapParam.getStrVALUE()) == 1) {
                    OreportManager.BuildReport(parameters, Ojconnexion);
                    inputPdfList.add(new FileInputStream(jdom.scr_report_pdf + recap));
                }

                long P_ATT_AMOUNT = 0;
                String finalpath = "";

                switch (codeFACT) {
                case 9:
                    GroupeTierspayantController controller = new GroupeTierspayantController(OdataManager.getEmf());
                    String Path;
                    app = new JsonDataSourceApp();
                    parameters.put("P_TOTAL_IN_LETTERS",
                            conversion.GetNumberTowords(facManagement.getAmount(facture.getLgFACTUREID())).toUpperCase()
                                    + " (" + conversion.AmountFormat(
                                            facManagement.getAmount(facture.getLgFACTUREID()).intValue())
                                    + " FCFA)");

                    Path = app.fill(parameters, controller.generateInvoices(facture.getLgFACTUREID()),
                            jdom.scr_report_file + "rp_groupbycompany.jrxml",
                            "rp_groupbycompany_" + DF.format(new Date()) + ".pdf");

                    String _outputStreamFile = jdom.scr_report_pdf + Path;

                    // String _str_file = "rp_facture_" + DF.format(new Date()) + ".pdf";
                    finalpath = _outputStreamFile;

                    break;

                case 8:
                    String complementairePath = "";
                    app = new JsonDataSourceApp();
                    parameters.put("P_TOTAL_IN_LETTERS",
                            conversion.GetNumberTowords(facManagement.getAmount(facture.getLgFACTUREID())).toUpperCase()
                                    + " (" + conversion.AmountFormat(
                                            facManagement.getAmount(facture.getLgFACTUREID()).intValue())
                                    + " FCFA)");
                    complementairePath = app.fill(facture, parameters);
                    String str_file = DF.format(new Date()) + "_" + longAdder.intValue() + ".pdf";
                    longAdder.increment();
                    // String str_file = "rp_facture_" + DF.format(new Date()) + ".pdf";
                    String outputStreamFile = jdom.scr_report_pdf + str_file;
                    // inputPdfList.add(new FileInputStream(complementairePath));
                    finalpath = outputStreamFile;

                    break;
                case 6:
                    List taux = facManagement.getFacturePercent(facture.getLgFACTUREID());

                    for (int i = 0; i < taux.size(); i++) {
                        int tauxValue = Integer.valueOf(taux.get(i) + "");

                        entityDatas = facManagement.getFactureReportDataPercent(facture.getLgFACTUREID(),
                                OTiersPayant.getLgTIERSPAYANTID(), tauxValue);
                        long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_REMISEFORFAITAIRE = 0,
                                P_MONTANTBRUTTP = 0;

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

                        parameters.put("P_TAUXCOUVERTURE", tauxValue + "%");

                        scr_report_file = "rp_facture_percentage";
                        if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                            scr_report_file = "rp_facture_withremise_percentage";
                        }

                        report_generate_file = DF.format(new Date()) + "_" + longAdder.intValue();
                        longAdder.increment();

                        report_generate_file = report_generate_file + ".pdf";
                        finalpath = jdom.scr_report_pdf + "rp_facture_percentage_" + report_generate_file;
                        OreportManager.setPath_report_src(jdom.scr_report_file + scr_report_file + ".jrxml");
                        OreportManager.setPath_report_pdf(finalpath);
                        parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                        parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                        parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                        parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                        parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                        parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + tauxValue + "% ( NOMBRE DE BONS="
                                + facManagement.getDetailsFactureCount(facture.getLgFACTUREID(), tauxValue) + " )");

                        parameters.put("P_TOTAL_IN_LETTERS",
                                conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " ("
                                        + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                        OreportManager.BuildReport(parameters, Ojconnexion);
                        // inputPdfList.add(new FileInputStream(Ojdom.scr_report_pdf + "rp_facture_percentage_" +
                        // report_generate_file));

                        // tauxpath += finalpath + "@";
                    }
                    break;
                case 7:
                    JSONArray clientsfacture = facManagement.getCmpt(facture.getLgFACTUREID());
                    String dateFact = FULDATE.format(facture.getDtCREATED());
                    for (int idx = 0; idx < clientsfacture.length(); idx++) {
                        JSONObject idCMP = clientsfacture.getJSONObject(idx);
                        report_generate_file = DF.format(new Date()) + "_" + longAdder.intValue();
                        longAdder.increment();

                        report_generate_file = report_generate_file + ".pdf";
                        finalpath = jdom.scr_report_pdf + "rp_facture_" + report_generate_file;
                        parameters.put("LGCMP", idCMP.get("idcmp"));
                        parameters.put("DATEFACT", dateFact);
                        // parameters.put("P_CODE_FACTURE", "FACTURE N° " + facture.getStrCODEFACTURE() + "/" + ((idx +
                        // 1) < 10 ? "0" : "") + (idx + 1) + "/" + date.getAnnee(facture.getDtDATEFACTURE()));
                        parameters.put("P_CODE_FACTURE", "");
                        parameters.put("P_CLIENT_NAME", idCMP.get("strFIRSTNAME"));
                        parameters.put("P_NUMEROS", idCMP.get("strNUMEROSECURITESOCIAL"));
                        OreportManager.setPath_report_src(jdom.scr_report_file + "rp_facture_Client" + ".jrxml");
                        OreportManager.setPath_report_pdf(finalpath);
                        parameters.put("P_TOTAL_IN_LETTERS",
                                conversion.GetNumberTowords(idCMP.getDouble("Montant")).toUpperCase() + " ("
                                        + conversion.AmountFormat(Double.valueOf(idCMP.getDouble("Montant")).intValue())
                                        + " FCFA)");
                        OreportManager.BuildReport(parameters, Ojconnexion);
                        // inputPdfList.add(new FileInputStream(Ojdom.scr_report_pdf + "rp_facture_" +
                        // report_generate_file));

                    }
                    break;

                default:
                    entityDatas = facManagement.getFactureReportData(facture.getLgFACTUREID(),
                            OTiersPayant.getLgTIERSPAYANTID());
                    long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_REMISEFORFAITAIRE = 0,
                            P_MONTANTBRUTTP = 0, P_REMISE_VENTE = 0, P_TVA_VENTE = 0;

                    for (EntityData OtEntityData : entityDatas) {
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

                        P_REMISE_VENTE += Double.valueOf(OtEntityData.getStr_value8()).intValue();
                        P_TVA_VENTE += Double.valueOf(OtEntityData.getStr_value9()).intValue();
                    }

                    parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                    parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                    parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                    parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                    parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                    parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TVA_VENTE", P_TVA_VENTE);
                    parameters.put("P_REMISE_VENTE", P_REMISE_VENTE);
                    parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + OTiersPayant.getStrNAME()
                            + " ( NOMBRE DE BONS=" + entityDatas.size() + " )");

                    parameters.put("P_TOTAL_IN_LETTERS",
                            conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " ("
                                    + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                    scr_report_file = "rp_facture_" + modelFacture.getStrVALUE();

                    if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                        scr_report_file = "rp_facture_withremise_" + modelFacture.getStrVALUE();
                    }

                    report_generate_file = DF.format(new Date()) + "_" + longAdder.intValue();
                    longAdder.increment();
                    report_generate_file = report_generate_file + ".pdf";
                    finalpath = jdom.scr_report_pdf + "rp_facture_" + report_generate_file;

                    OreportManager.setPath_report_src(jdom.scr_report_file + scr_report_file + ".jrxml");
                    OreportManager.setPath_report_pdf(finalpath);
                    OreportManager.BuildReport(parameters, Ojconnexion);
                    // inputPdfList.add(new FileInputStream(Ojdom.scr_report_pdf + "rp_facture_" +
                    // report_generate_file));

                    break;

                }
                inputPdfList.add(new FileInputStream(finalpath));
                OreportManager.BuildReport(parameters, Ojconnexion);
                if (recapParam != null && Integer.valueOf(recapParam.getStrVALUE()) == 1) {
                    inputPdfList.add(new FileInputStream(jdom.scr_report_pdf + recap));
                }
            }

            String str_file = "facture_" + DF.format(new Date()) + "_" + longAdder.intValue() + ".pdf";

            String outputStreamFile = jdom.scr_report_pdf + str_file;

            OutputStream outputStream = new FileOutputStream(outputStreamFile);
            try {
                PdfFiles.mergePdfFiles(inputPdfList, outputStream);

            } catch (Exception ex) {
                Logger.getLogger(FactureProvisoire.class.getName()).log(Level.SEVERE, null, ex);
            }

            Ojconnexion.CloseConnexion();
            session.removeAttribute("codefacturedto");
            response.sendRedirect(request.getContextPath() + "/data/reports/pdf/" + str_file);

        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JRException ex) {
            Logger.getLogger(FactureProvisoire.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request
     *            servlet request
     * @param response
     *            servlet response
     *
     * @throws ServletException
     *             if a servlet-specific error occurs
     * @throws IOException
     *             if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JRException ex) {
            Logger.getLogger(FactureProvisoire.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}
