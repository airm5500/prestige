package rest.report.pdf;

import bll.entity.EntityData;
import dal.TBonLivraisonDetail;
import dal.TFamille;
import dal.TOfficine;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import report.reportManager;
import rest.report.ReportUtil;
import rest.service.OrderService;
import toolkits.filesmanagers.FilesType.PdfFiles;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.jdom;
import util.DateConverter;
import util.IdGenerator;

/**
 *
 * @author koben
 */
@WebServlet(name = "Etiquete", urlPatterns = { "/Etiquete" })
public class Etiquete extends HttpServlet {

    private static final Logger LOG = Logger.getLogger(Etiquete.class.getName());

    @EJB
    private OrderService orderService;
    @EJB
    private ReportUtil reportUtil;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, Exception {

        jdom.InitRessource();

        response.setContentType("application/pdf");

        String refBon = request.getParameter("lg_BON_LIVRAISON_ID");
        int k = 1;
        int j = 0;

        if (StringUtils.isNotBlank(request.getParameter("int_NUMBER"))) {
            k = Integer.parseInt(request.getParameter("int_NUMBER"));
        }
        reportManager oreportManager = new reportManager();
        String scrReportFile = "rp_etiquette";
        String str_final_file = "";
        Map<String, Object> parameters = new HashMap<>();

        String str_file = "", report_generate_file = IdGenerator.getNumberRandom();
        List<InputStream> inputPdfList = new ArrayList<>();
        List<EntityData> lstEntityData = generateDataForEtiquette(refBon);

        for (int i = 0; i < lstEntityData.size(); i++) {
            parameters.put("P_H_INSTITUTION_" + k, lstEntityData.get(i).getStr_value1());
            parameters.put("P_INSTITUTION_ADRESSE_" + k, lstEntityData.get(i).getStr_value2());
            parameters.put("P_BARE_CODE_" + k, lstEntityData.get(i).getStr_value3());
            parameters.put("P_RICE_" + k, lstEntityData.get(i).getStr_value4());
            parameters.put("P_OTHER_" + k, lstEntityData.get(i).getStr_value5());
            parameters.put("P_CIP_" + k, lstEntityData.get(i).getStr_value6());
            if (k == 65) {
                report_generate_file = report_generate_file + ".pdf";
                oreportManager.setPath_report_src(jdom.scr_report_file + scrReportFile + ".jrxml");
                oreportManager.setPath_report_pdf(jdom.scr_report_pdf + "etiquette_" + report_generate_file);
                oreportManager.BuildReportEmptyDs(parameters);
                str_final_file = jdom.scr_report_pdf + "etiquette_" + report_generate_file;

                inputPdfList.add(new FileInputStream(str_final_file));
                parameters = new HashMap<>();
                k = 1;
                j = 0;
            } else {
                k++;
                j++;
            }

        }

        if (lstEntityData.size() < 65) {
            report_generate_file = report_generate_file + ".pdf";
            oreportManager.setPath_report_src(jdom.scr_report_file + scrReportFile + ".jrxml");
            oreportManager.setPath_report_pdf(jdom.scr_report_pdf + "etiquette_" + report_generate_file);
            oreportManager.BuildReportEmptyDs(parameters);
            str_final_file = jdom.scr_report_pdf + "etiquette_" + report_generate_file;

            inputPdfList.add(new FileInputStream(str_final_file));
        } else {
            if (j > 0) {
                report_generate_file = report_generate_file + ".pdf";
                oreportManager.setPath_report_src(jdom.scr_report_file + scrReportFile + ".jrxml");
                oreportManager.setPath_report_pdf(jdom.scr_report_pdf + "etiquette_" + report_generate_file);
                oreportManager.BuildReportEmptyDs(parameters);
                str_final_file = jdom.scr_report_pdf + "etiquette_" + report_generate_file;

                inputPdfList.add(new FileInputStream(str_final_file));
            }
        }

        str_file = "etiquette_" + IdGenerator.getNumberRandom() + ".pdf";
        String outputStreamFile = jdom.scr_report_pdf + str_file;
        OutputStream outputStream = new FileOutputStream(outputStreamFile);
        PdfFiles.mergePdfFiles(inputPdfList, outputStream);
        // response.sendRedirect(str_file_name);
        response.sendRedirect("../../../data/reports/pdf/" + str_file);

    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (Exception ex) {
            Logger.getLogger(Etiquete.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (Exception ex) {
            Logger.getLogger(Etiquete.class.getName()).log(Level.SEVERE, null, ex);
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

    private List<EntityData> generateDataForEtiquette(String idBon) {
        List<EntityData> lstEntityData = new ArrayList<>();

        List<String> data = new ArrayList<>();
        String fileBarecode;
        EntityData oEntityData;
        String dateToday = date.DateToString(new Date(), date.formatterShortBis);
        TOfficine oTOfficine = reportUtil.findOfficine();
        try {

            List<TBonLivraisonDetail> items = orderService.getBonItems(idBon);
            for (TBonLivraisonDetail bonItem : items) {
                TFamille famille = bonItem.getLgFAMILLEID();

                if (data.isEmpty()) {
                    for (int i = 0; i < bonItem.getIntQTERECUE(); i++) {
                        oEntityData = new EntityData();
                        data.add(famille.getLgFAMILLEID());
                        fileBarecode = DateConverter.buildbarcodeOther(famille.getIntCIP(),
                                jdom.barecode_file + IdGenerator.getNumberRandom() + ".gif");
                        oEntityData.setStr_value1(oTOfficine.getStrNOMABREGE());
                        oEntityData.setStr_value2(famille.getStrDESCRIPTION());
                        oEntityData.setStr_value3(fileBarecode);
                        oEntityData.setStr_value4(conversion.AmountFormat(famille.getIntPRICE(), ' ') + " CFA");
                        oEntityData.setStr_value5(dateToday);
                        oEntityData.setStr_value6(famille.getIntCIP());
                        lstEntityData.add(oEntityData);
                    }

                } else {
                    if (!data.get(0).equalsIgnoreCase(famille.getLgFAMILLEID())) {
                        DateConverter.buildbarcodeOther(famille.getIntCIP(),
                                jdom.barecode_file + IdGenerator.getNumberRandom() + ".gif");
                        data.clear();
                        data.add(famille.getLgFAMILLEID());
                    }

                    for (int i = 0; i < bonItem.getIntQTERECUE(); i++) {
                        oEntityData = new EntityData();
                        fileBarecode = DateConverter.buildbarcodeOther(famille.getIntCIP(),
                                jdom.barecode_file + IdGenerator.getNumberRandom() + ".gif");
                        oEntityData.setStr_value1(oTOfficine.getStrNOMABREGE());
                        oEntityData.setStr_value2(famille.getStrDESCRIPTION());
                        oEntityData.setStr_value3(fileBarecode);
                        oEntityData.setStr_value4(conversion.AmountFormat(famille.getIntPRICE(), ' ') + " CFA");
                        oEntityData.setStr_value5(dateToday);
                        oEntityData.setStr_value6(famille.getIntCIP());
                        lstEntityData.add(oEntityData);
                    }
                }
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        return lstEntityData;
    }
}
