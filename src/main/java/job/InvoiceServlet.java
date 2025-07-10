/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import bll.configManagement.GroupeTierspayantController;
import bll.entity.EntityData;
import bll.facture.factureManagement;
import bll.report.ReportDataSource;
import dal.TFacture;
import dal.TModelFacture;
import dal.TOfficine;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TUser;
import dal.dataManager;
import dal.JdbConnexion;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.export.ooxml.JRDocxExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.engine.query.JsonQueryExecuterFactory;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimpleXlsxReportConfiguration;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.jdom;
import util.Constant;

/**
 *
 * @author KKOFFI
 */
public class InvoiceServlet extends HttpServlet {

    static final DateFormat DATEFORMAT = new SimpleDateFormat("dd/MM/yyyy");
    static final DateFormat DATEFORMATYYYY = new SimpleDateFormat("yyyy-MM-dd");
    SimpleDateFormat FULDATE = new SimpleDateFormat("EE d MMMM yyyy");
    DateFormat df = new SimpleDateFormat("dd_MM_YYYY_HH_mm_ss");
    factureManagement facManagement = null;
    dataManager OdataManager = null;
    List<JasperPrint> inputPdfList = null;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, JRException {

        jdom.InitRessource();
        jdom.LoadRessource();
        JdbConnexion Ojconnexion = new JdbConnexion();

        Ojconnexion.openConnexion();
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        OdataManager = new dataManager();
        OdataManager.initEntityManager();
        inputPdfList = new ArrayList<>();
        TFacture OFacture;

        TTiersPayant OTiersPayant;
        TTypeMvtCaisse OTypeMvtCaisse;

        facManagement = new factureManagement(OdataManager, OTUser);
        String lg_FACTURE_ID = "", action = "", modeId = null;

        if (request.getParameter("lg_FACTURE_ID") != null && !"".equals(request.getParameter("lg_FACTURE_ID"))) {
            lg_FACTURE_ID = request.getParameter("lg_FACTURE_ID");

        }
        if (request.getParameter("modeId") != null && !"".equals(request.getParameter("modeId"))) {
            modeId = request.getParameter("modeId");

        }
        if (request.getParameter("action") != null) {
            action = request.getParameter("action");
        }
        if (null != action) {
            OFacture = OdataManager.getEm().find(TFacture.class, lg_FACTURE_ID);

            OTiersPayant = OdataManager.getEm().find(TTiersPayant.class, OFacture.getStrCUSTOMER());
            OTypeMvtCaisse = OdataManager.getEm().find(TTypeMvtCaisse.class,
                    OFacture.getLgTYPEFACTUREID().getLgTYPEFACTUREID());
            TModelFacture modelFacture = OTiersPayant.getLgMODELFACTUREID();
            String codeModelFacture = modelFacture.getLgMODELFACTUREID();
            if (modeId != null) {
                codeModelFacture = modeId;
                modelFacture = OdataManager.getEm().find(TModelFacture.class, modeId);
            }
            Map<String, Object> parameters = getParametters(OFacture, OTUser, codeModelFacture, OTiersPayant,
                    OTypeMvtCaisse);
            JasperPrint jasperPrint;
            File destFile;
            int codeFACT = Integer.parseInt(codeModelFacture);
            switch (action) {
            case "exls":
                switch (codeFACT) {
                case 9:
                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + "rp_facturerecap.jrxml");
                    inputPdfList.add(jasperPrint);
                    GroupeTierspayantController controller = new GroupeTierspayantController(OdataManager.getEmf());
                    parameters
                            .put("P_TOTAL_IN_LETTERS",
                                    conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID()))
                                            .toUpperCase()
                                            + " ("
                                            + conversion.AmountFormat(
                                                    facManagement.getAmount(OFacture.getLgFACTUREID()).intValue())
                                            + " FCFA)");
                    jasperPrint = fillJson(parameters, controller.generateInvoices(OFacture.getLgFACTUREID()),
                            jdom.scr_report_file + "rp_groupbycompany.jrxml");
                    inputPdfList.add(jasperPrint);
                    destFile = xlsx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".xlsx");
                    exportToxlsx(response, destFile);
                    break;
                case 8:
                    jasperPrint = fill(OFacture, parameters, jdom.scr_report_file + "rp_complementaire.jrxml");
                    inputPdfList.add(jasperPrint);
                    destFile = xlsx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".xlsx");
                    exportToxlsx(response, destFile);
                    break;
                case 6:
                    List taux = facManagement.getFacturePercent(lg_FACTURE_ID);
                    for (int i = 0; i < taux.size(); i++) {
                        int tauxValue = Integer.parseInt(taux.get(i) + "");
                        List<EntityData> entityDatas = facManagement.getFactureReportDataPercent(lg_FACTURE_ID,
                                OTiersPayant.getLgTIERSPAYANTID(), tauxValue);
                        long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_ATT_AMOUNT = 0,
                                P_REMISEFORFAITAIRE = 0, P_MONTANTBRUTTP = 0;
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

                        parameters.put("P_TAUXCOUVERTURE", tauxValue + "%");

                        String scr_report_file = "rp_facture_percentage";
                        if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                            scr_report_file = "rp_facture_withremise_percentage";
                        }

                        parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                        parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                        parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                        parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                        parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                        parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + tauxValue + "% ( NOMBRE DE BONS="
                                + facManagement.getDetailsFactureCount(lg_FACTURE_ID, tauxValue) + " )");

                        parameters.put("P_TOTAL_IN_LETTERS",
                                conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " ("
                                        + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                        jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                                jdom.scr_report_file + scr_report_file + ".jrxml");
                        inputPdfList.add(jasperPrint);
                    }
                    destFile = xlsx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".xlsx");
                    exportToxlsx(response, destFile);
                    break;

                case 7:
                    JSONArray clientsfacture = facManagement.getCmpt(lg_FACTURE_ID);
                    String dateFact = FULDATE.format(OFacture.getDtCREATED());
                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + "rp_facturerecapClient.jrxml");
                    inputPdfList.add(jasperPrint);
                    for (int idx = 0; idx < clientsfacture.length(); idx++) {
                        try {
                            JSONObject idCMP = clientsfacture.getJSONObject(idx);
                            parameters.put("LGCMP", idCMP.get("idcmp"));
                            parameters.put("DATEFACT", dateFact);
                            parameters.put("P_CODE_FACTURE",
                                    "FACTURE N° " + OFacture.getStrCODEFACTURE() + "/" + ((idx + 1) < 10 ? "0" : "")
                                            + (idx + 1) + "/" + date.getAnnee(OFacture.getDtDATEFACTURE()));
                            parameters.put("P_CLIENT_NAME", idCMP.get("strFIRSTNAME"));
                            parameters.put("P_NUMEROS", idCMP.get("strNUMEROSECURITESOCIAL"));
                            parameters
                                    .put("P_TOTAL_IN_LETTERS",
                                            conversion.GetNumberTowords(idCMP.getDouble("Montant")).toUpperCase() + " ("
                                                    + conversion.AmountFormat(
                                                            Double.valueOf(idCMP.getDouble("Montant")).intValue())
                                                    + " FCFA)");
                            jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                                    jdom.scr_report_file + "rp_facture_Client.jrxml");
                            inputPdfList.add(jasperPrint);
                        } catch (JSONException ex) {
                            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
                        }
                    }
                    destFile = xlsx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".xlsx");
                    exportToxlsx(response, destFile);
                    break;

                default:
                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + "rp_facturerecap.jrxml");
                    inputPdfList.add(jasperPrint);
                    List<EntityData> entityDatas = facManagement.getFactureReportData(lg_FACTURE_ID,
                            OTiersPayant.getLgTIERSPAYANTID());
                    long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_ATT_AMOUNT = 0,
                            P_REMISEFORFAITAIRE = 0, P_MONTANTBRUTTP = 0;
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
                    }
                    String scr_report_file = "rp_facture_" + modelFacture.getStrVALUE();

                    if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                        scr_report_file = "rp_facture_withremise_" + modelFacture.getStrVALUE();
                    }

                    parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                    parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                    parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                    parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                    parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                    parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + OTiersPayant.getStrNAME()
                            + " ( NOMBRE DE BONS=" + OFacture.getTFactureDetailCollection().size() + " )");

                    parameters.put("P_TOTAL_IN_LETTERS",
                            conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " ("
                                    + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + scr_report_file + ".jrxml");
                    inputPdfList.add(jasperPrint);
                    destFile = xlsx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".xlsx");
                    exportToxlsx(response, destFile);

                    break;
                }

                break;
            case "docx":

                switch (codeFACT) {
                case 9:

                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + "rp_facturerecap.jrxml");
                    inputPdfList.add(jasperPrint);
                    GroupeTierspayantController controller = new GroupeTierspayantController(OdataManager.getEmf());

                    parameters
                            .put("P_TOTAL_IN_LETTERS",
                                    conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID()))
                                            .toUpperCase()
                                            + " ("
                                            + conversion.AmountFormat(
                                                    facManagement.getAmount(OFacture.getLgFACTUREID()).intValue())
                                            + " FCFA)");

                    jasperPrint = fillJson(parameters, controller.generateInvoices(OFacture.getLgFACTUREID()),
                            jdom.scr_report_file + "rp_groupbycompany.jrxml");

                    inputPdfList.add(jasperPrint);
                    destFile = docx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".docx");
                    exportTodocx(response, destFile);

                    break;

                case 8:
                    jasperPrint = fill(OFacture, parameters, jdom.scr_report_file + "rp_complementaire.jrxml");
                    inputPdfList.add(jasperPrint);
                    destFile = docx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".docx");
                    exportTodocx(response, destFile);

                    break;
                case 6:
                    List taux = facManagement.getFacturePercent(lg_FACTURE_ID);
                    for (int i = 0; i < taux.size(); i++) {
                        int tauxValue = Integer.valueOf(taux.get(i) + "");

                        List<EntityData> entityDatas = facManagement.getFactureReportDataPercent(lg_FACTURE_ID,
                                OTiersPayant.getLgTIERSPAYANTID(), tauxValue);
                        long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_ATT_AMOUNT = 0,
                                P_REMISEFORFAITAIRE = 0, P_MONTANTBRUTTP = 0;

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

                        parameters.put("P_TAUXCOUVERTURE", tauxValue + "%");

                        String scr_report_file = "rp_facture_percentage";
                        if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                            scr_report_file = "rp_facture_withremise_percentage";
                        }

                        parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                        parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                        parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                        parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                        parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                        parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                        parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + tauxValue + "% ( NOMBRE DE BONS="
                                + facManagement.getDetailsFactureCount(lg_FACTURE_ID, tauxValue) + " )");

                        parameters.put("P_TOTAL_IN_LETTERS",
                                conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " ("
                                        + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                        jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                                jdom.scr_report_file + scr_report_file + ".jrxml");
                        inputPdfList.add(jasperPrint);
                    }
                    destFile = docx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".docx");
                    exportTodocx(response, destFile);
                    break;

                case 7:
                    JSONArray clientsfacture = facManagement.getCmpt(lg_FACTURE_ID);
                    String dateFact = FULDATE.format(OFacture.getDtCREATED());
                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + "rp_facturerecapClient.jrxml");
                    inputPdfList.add(jasperPrint);
                    for (int idx = 0; idx < clientsfacture.length(); idx++) {
                        try {
                            JSONObject idCMP = clientsfacture.getJSONObject(idx);

                            parameters.put("LGCMP", idCMP.get("idcmp"));
                            parameters.put("DATEFACT", dateFact);
                            parameters.put("P_CODE_FACTURE",
                                    "FACTURE N° " + OFacture.getStrCODEFACTURE() + "/" + ((idx + 1) < 10 ? "0" : "")
                                            + (idx + 1) + "/" + date.getAnnee(OFacture.getDtDATEFACTURE()));
                            parameters.put("P_CLIENT_NAME", idCMP.get("strFIRSTNAME"));
                            parameters.put("P_NUMEROS", idCMP.get("strNUMEROSECURITESOCIAL"));
                            parameters
                                    .put("P_TOTAL_IN_LETTERS",
                                            conversion.GetNumberTowords(idCMP.getDouble("Montant")).toUpperCase() + " ("
                                                    + conversion.AmountFormat(
                                                            Double.valueOf(idCMP.getDouble("Montant")).intValue())
                                                    + " FCFA)");
                            jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                                    jdom.scr_report_file + "rp_facture_Client.jrxml");
                            inputPdfList.add(jasperPrint);

                        } catch (JSONException ex) {
                            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
                        }
                    }
                    destFile = docx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".docx");
                    exportTodocx(response, destFile);
                    break;

                default:
                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + "rp_facturerecap.jrxml");
                    inputPdfList.add(jasperPrint);
                    List<EntityData> entityDatas = facManagement.getFactureReportData(lg_FACTURE_ID,
                            OTiersPayant.getLgTIERSPAYANTID());

                    long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_ATT_AMOUNT = 0,
                            P_REMISEFORFAITAIRE = 0, P_MONTANTBRUTTP = 0;

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
                    }
                    String scr_report_file = "rp_facture_" + modelFacture.getStrVALUE();

                    if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                        scr_report_file = "rp_facture_withremise_" + modelFacture.getStrVALUE();
                    }

                    parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                    parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                    parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                    parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                    parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                    parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                    parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + OTiersPayant.getStrNAME()
                            + " ( NOMBRE DE BONS=" + OFacture.getTFactureDetailCollection().size() + " )");

                    parameters.put("P_TOTAL_IN_LETTERS",
                            conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " ("
                                    + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                    jasperPrint = fill(Ojconnexion.getConnection(), parameters,
                            jdom.scr_report_file + scr_report_file + ".jrxml");
                    inputPdfList.add(jasperPrint);
                    destFile = docx(jdom.scr_report_pdf + "rp_facture_" + df.format(new Date()) + ".docx");
                    exportTodocx(response, destFile);

                    break;
                }

                break;

            }
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JRException ex) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JRException ex) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    private void prepareDownload(final HttpServletResponse response, final String filename) {
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment;filename=" + filename);
        response.setHeader("Expires", "0");
        response.setHeader("Pragma", "cache");
        response.setHeader("Cache-Control", "private");
    }

    enum ArticleHeader {
        LOCATION, GROSSISTE, DESCRIPTION, CIP, AEN, QTE, PU, PA
    }

    public JasperPrint fillJson(Map<String, Object> params, JSONObject json, String scr_report_file) {

        String pathName = "";
        JasperPrint jasperPrint = null;
        try {

            long start = System.currentTimeMillis();

            params.put(JsonQueryExecuterFactory.JSON_DATE_PATTERN, "yyyy-MM-dd");
            // params.put(JsonQueryExecuterFactory.JSON_NUMBER_PATTERN, "#,##0.##");
            params.put(JsonQueryExecuterFactory.JSON_LOCALE, Locale.FRANCE);
            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            InputStream iostream = new ByteArrayInputStream(json.toString().getBytes(StandardCharsets.UTF_8));
            params.put(JsonQueryExecuterFactory.JSON_INPUT_STREAM, iostream);
            JasperReport jasperReport = JasperCompileManager.compileReport(scr_report_file);
            // pathName = jdom.scr_report_pdf + fileName;
            jasperPrint = JasperFillManager.fillReport(jasperReport, params);
            // JasperExportManager.exportReportToPdfFile(jasperPrint, pathName);
            // JasperFillManager.fillReportToFile(scr_report_file, params);

            System.err.println("Filling time : " + (System.currentTimeMillis() - start));
        } catch (JRException ex) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
        return jasperPrint;
    }

    public Map<String, Object> getParametters(TFacture OFacture, TUser OTUser, String codeModelFacture,
            TTiersPayant OTiersPayant, TTypeMvtCaisse OTypeMvtCaisse) {

        Map<String, Object> parameters = new HashMap<>();
        try {

            TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");
            String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
            String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();

            String P_H_CLT_INFOS = "PERIODE DU " + DATEFORMAT.format(OFacture.getDtDEBUTFACTURE()) + " AU "
                    + DATEFORMAT.format(OFacture.getDtFINFACTURE());
            String P_H_LOGO = jdom.scr_report_file_logo;
            System.out.println("P_H_LOGO    ***************  " + P_H_LOGO);
            parameters.put("P_H_LOGO", P_H_LOGO);
            parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

            parameters.put("P_PRINTED_BY", " LE PHARMACIEN ");
            parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
            parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);

            parameters.put("P_LG_FACTURE_ID", OFacture.getLgFACTUREID());

            parameters.put("P_LG_TIERS_PAYANT_ID", OTiersPayant.getLgTIERSPAYANTID());
            parameters.put("P_CODE_FACTURE",
                    "FACTURE N° " + OFacture.getStrCODEFACTURE() + " (" + OTiersPayant.getStrNAME() + ")");
            parameters.put("P_TIERS_PAYANT_NAME", OTiersPayant.getStrFULLNAME());
            parameters.put("P_CODE_COMPTABLE", "CODE COMPTABLE : " + OTypeMvtCaisse.getStrCODECOMPTABLE());
            int codeFACT = new Integer(codeModelFacture);

            switch (codeFACT) {
            case 7:
                parameters.put("P_DATEFAC", FULDATE.format(OFacture.getDtCREATED()));
                parameters.put("P_TOTAL_IN_LETTERS",
                        conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID())).toUpperCase()
                                + " ("
                                + conversion.AmountFormat(facManagement.getAmount(OFacture.getLgFACTUREID()).intValue())
                                + " FCFA)");

                break;
            case 9:
                parameters.put("P_TOTAL_IN_LETTERS",
                        conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID())).toUpperCase()
                                + " ("
                                + conversion.AmountFormat(facManagement.getAmount(OFacture.getLgFACTUREID()).intValue())
                                + " FCFA)");
                break;
            case 8:
                parameters.put("P_TOTAL_IN_LETTERS",
                        conversion.GetNumberTowords(facManagement.getAmount(OFacture.getLgFACTUREID())).toUpperCase()
                                + " ("
                                + conversion.AmountFormat(facManagement.getAmount(OFacture.getLgFACTUREID()).intValue())
                                + " FCFA)");
                break;
            case 6:

                break;

            default:
                List<EntityData> entityDatas = facManagement.getFactureReportData(OFacture.getLgFACTUREID(),
                        OTiersPayant.getLgTIERSPAYANTID());

                long P_TOTAL_AMOUNT = 0, P_ADHER_AMOUNT = 0, P_REMISE_AMOUNT = 0, P_ATT_AMOUNT = 0,
                        P_REMISEFORFAITAIRE = 0, P_MONTANTBRUTTP = 0;

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
                }

                parameters.put("P_REMISEFORFAITAIRE", conversion.AmountFormat((int) P_REMISEFORFAITAIRE, ' '));

                parameters.put("P_MONTANTBRUTTP", conversion.AmountFormat((int) P_MONTANTBRUTTP, ' '));
                parameters.put("P_TOTAL_AMOUNT", conversion.AmountFormat((int) P_TOTAL_AMOUNT, ' '));
                parameters.put("P_REMISE_AMOUNT", conversion.AmountFormat((int) P_REMISE_AMOUNT, ' '));
                parameters.put("P_ADHER_AMOUNT", conversion.AmountFormat((int) P_ADHER_AMOUNT, ' '));
                parameters.put("P_ATT_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                parameters.put("P_TOTALNET_AMOUNT", conversion.AmountFormat((int) P_ATT_AMOUNT, ' '));
                parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + OTiersPayant.getStrNAME() + " ( NOMBRE DE BONS="
                        + OFacture.getTFactureDetailCollection().size() + " )");

                parameters.put("P_TOTAL_IN_LETTERS",
                        conversion.GetNumberTowords(Double.parseDouble(P_ATT_AMOUNT + "")).toUpperCase() + " ("
                                + conversion.AmountFormat(Integer.valueOf(P_ATT_AMOUNT + "")) + " FCFA)");
                break;

            }
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
                                    ? "N ° CC :" + OTiersPayant.getStrCOMPTECONTRIBUABLE() : "");
            parameters.put("P_CODE_OFFICINE",
                    (OTiersPayant.getStrCODEOFFICINE() != null && !"".equals(OTiersPayant.getStrCODEOFFICINE()))
                            ? "N ° CO :" + OTiersPayant.getStrCODEOFFICINE() : "");
            parameters.put("P_REGISTRE_COMMERCE",
                    (OTiersPayant.getStrREGISTRECOMMERCE() != null && !"".equals(OTiersPayant.getStrREGISTRECOMMERCE()))
                            ? "N ° RC :" + OTiersPayant.getStrREGISTRECOMMERCE() : "");

        } catch (NumberFormatException e) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, e);
        }
        return parameters;
    }

    public String exTopdf(JasperPrint jasperPrint, String pathName) throws JRException {
        // String fileName = rp_complementaire_" + DATEFORMAT.format(new Date()) + ".pdf";
        long start = System.currentTimeMillis();
        // String pathName = jdom.scr_report_pdf + fileName;

        JasperExportManager.exportReportToPdfFile(jasperPrint, pathName);
        System.err.println(
                "PDF creation time :  pathName  " + pathName + " ---> " + (System.currentTimeMillis() - start));
        return pathName;
    }

    private void addPdfList(JasperPrint jasperPrint) {

        inputPdfList.add(jasperPrint);

    }

    public File xlsx(String destFile) throws JRException {
        File mydestFile = new File(destFile);
        JRXlsxExporter exporter = new JRXlsxExporter();
        exporter.setExporterInput(SimpleExporterInput.getInstance(inputPdfList));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(mydestFile));
        SimpleXlsxReportConfiguration configuration = new SimpleXlsxReportConfiguration();
        configuration.setOnePagePerSheet(true);
        exporter.setConfiguration(configuration);
        exporter.exportReport();
        return mydestFile;
    }

    public File docx(String destFile) throws JRException {
        File mydestFile = new File(destFile);
        JRDocxExporter exporter = new JRDocxExporter();
        exporter.setExporterInput(SimpleExporterInput.getInstance(inputPdfList));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(mydestFile));
        exporter.exportReport();
        return mydestFile;
    }

    private void exportToxlsx(HttpServletResponse response, File filetoExport) {
        OutputStream out = null;
        FileInputStream inStream = null;
        try {
            out = response.getOutputStream();
            inStream = new FileInputStream(filetoExport);
            String filename = "facture_" + df.format(new Date()) + ".xlsx";
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setContentLengthLong(filetoExport.length());
            response.setHeader("Content-disposition", "inline; filename=" + filename);
            OutputStream outStream = response.getOutputStream();

            byte[] buffer = new byte[4096];
            int bytesRead;

            while ((bytesRead = inStream.read(buffer)) != -1) {
                outStream.write(buffer, 0, bytesRead);
            }

        } catch (IOException ex) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        } finally {
            if (inStream != null) {
                try {
                    if (out != null) {
                        out.flush();
                    }
                    inStream.close();
                } catch (IOException ex) {
                    Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
                }
            }

        }
    }

    private void exportTodocx(HttpServletResponse response, File filetoExport) {
        OutputStream out = null;
        FileInputStream inStream = null;
        try {
            out = response.getOutputStream();
            inStream = new FileInputStream(filetoExport);
            String filename = "facture_" + df.format(new Date()) + ".docx";
            response.setContentType("application/msword");
            response.setContentLengthLong(filetoExport.length());
            response.setHeader("Content-disposition", "inline; filename=" + filename);
            OutputStream outStream = response.getOutputStream();

            byte[] buffer = new byte[4096];
            int bytesRead;

            while ((bytesRead = inStream.read(buffer)) != -1) {
                outStream.write(buffer, 0, bytesRead);
            }

        } catch (IOException ex) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        } finally {
            if (inStream != null) {
                try {
                    if (out != null) {
                        out.flush();
                    }
                    inStream.close();
                } catch (IOException ex) {
                    Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
                }
            }

        }
    }

    public JasperPrint fill(Connection Ojconnexion, Map<String, Object> params, String scr_report_file) {

        JasperPrint jasperPrint = null;
        try {

            long start = System.currentTimeMillis();

            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            JasperReport jasperReport = JasperCompileManager.compileReport(scr_report_file);
            // pathName = jdom.scr_report_pdf + fileName;
            jasperPrint = JasperFillManager.fillReport(jasperReport, params, Ojconnexion);
            // JasperExportManager.exportReportToPdfFile(jasperPrint, pathName);
            // JasperFillManager.fillReportToFile(scr_report_file, params);

            System.err.println("Filling time : " + (System.currentTimeMillis() - start));
        } catch (JRException ex) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
        return jasperPrint;
    }

    public JasperPrint fill(TFacture idInvoice, Map<String, Object> params, String scr_report_file) throws JRException {
        // String fileName = "rp_complementaire_" + DATEFORMAT.format(new Date()) + ".pdf";
        JasperPrint jasperPrint = null;
        try {
            JSONObject json = ReportDataSource.generateJSON(idInvoice);
            JSONObject data = json.getJSONObject("invoice");
            String TPSHORTNAME = json.getString("TPSHORTNAME");
            String seconLabel = json.getString("seconLabel");

            params.put(JsonQueryExecuterFactory.JSON_DATE_PATTERN, "yyyy-MM-dd");
            // params.put(JsonQueryExecuterFactory.JSON_NUMBER_PATTERN, "#,##0.##");
            params.put(JsonQueryExecuterFactory.JSON_LOCALE, Locale.FRANCE);
            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            InputStream iostream = new ByteArrayInputStream(data.toString().getBytes(StandardCharsets.UTF_8));
            params.put(JsonQueryExecuterFactory.JSON_INPUT_STREAM, iostream);
            params.put("TPSHORTNAME", TPSHORTNAME);
            params.put("seconLabel", seconLabel);

            // jdom.scr_report_file + "rp_complementaire.jrxml"
            JasperReport jasperReport = JasperCompileManager.compileReport(scr_report_file);
            jasperPrint = JasperFillManager.fillReport(jasperReport, params);
        } catch (JSONException ex) {
            Logger.getLogger(InvoiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
        return jasperPrint;
    }
}
