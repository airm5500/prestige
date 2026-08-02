package rest.report.pdf;

import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TFamille;
import dal.TGrossiste;
import dal.TOfficine;
import dal.TOrder;
import java.io.IOException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import rest.report.ReportUtil;
import rest.service.OrderService;
import toolkits.utils.conversion;
import toolkits.utils.date;

/**
 * Edition des etiquettes d'un bon de livraison sur planche A4 de 65 etiquettes. Le PDF est genere en memoire
 * (vectoriel, cotes en millimetres) et streame directement au navigateur.
 *
 * Parametres : lg_BON_LIVRAISON_ID (identifiant du bon), int_NUMBER (premiere position sur la feuille, 1..65),
 * modele_ETIQUETTE (CARRE_38X21_2, ARRONDI_38X21, CARRE_38_1X21_2, PERSONNALISE ; a defaut la valeur du parametre de
 * configuration KEY_ETIQUETTE_MODELE est utilisee).
 *
 * @author koben
 */
@WebServlet(name = "Etiquete", urlPatterns = { "/Etiquete" })
public class Etiquete extends HttpServlet {

    private static final Logger LOG = Logger.getLogger(Etiquete.class.getName());
    /** NOUVEAU (defaut) = PDF vectoriel ; ANCIEN = generation JasperReports historique. */
    private static final String KEY_MOTEUR = "KEY_ETIQUETTE_MOTEUR";
    /** 1 = telechargement force du PDF (ouverture dans l'application PDF par defaut du poste). */
    private static final String KEY_TELECHARGEMENT = "KEY_ETIQUETTE_TELECHARGEMENT";

    @EJB
    private OrderService orderService;
    @EJB
    private ReportUtil reportUtil;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, Exception {

        String modele = request.getParameter("modele_ETIQUETTE");
        if (StringUtils.isBlank(modele)) {
            modele = reportUtil.findParameterValue(LabelSheetPdf.KEY_MODELE);
        }
        LabelSheetPdf.SheetFormat format = LabelSheetPdf.formatFor(modele, reportUtil::findParameterValue);

        // page de test de calibrage : contours des etiquettes, sans donnees (toujours nouveau moteur)
        if ("1".equals(request.getParameter("test")) || "true".equalsIgnoreCase(request.getParameter("test"))) {
            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", contentDisposition() + "; filename=\"etiquettes_test.pdf\"");
            LabelSheetPdf.writeTestPage(response.getOutputStream(), format);
            return;
        }

        String refBon = request.getParameter("lg_BON_LIVRAISON_ID");
        if (StringUtils.isBlank(refBon)) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "lg_BON_LIVRAISON_ID manquant");
            return;
        }

        int startPosition = 1;
        if (StringUtils.isNotBlank(request.getParameter("int_NUMBER"))) {
            try {
                startPosition = Integer.parseInt(request.getParameter("int_NUMBER").trim());
            } catch (NumberFormatException e) {
                startPosition = 1;
            }
        }

        // bascule de securite : moteur ANCIEN = generation JasperReports historique
        String moteur = reportUtil.findParameterValue(KEY_MOTEUR);
        if ("ANCIEN".equalsIgnoreCase(StringUtils.trimToEmpty(moteur))) {
            response.sendRedirect(request.getContextPath()
                    + "/webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf_legacy.jsp?lg_BON_LIVRAISON_ID="
                    + URLEncoder.encode(refBon, "UTF-8") + "&int_NUMBER=" + startPosition);
            return;
        }

        List<LabelSheetPdf.LabelData> labels = buildLabels(refBon);

        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", contentDisposition() + "; filename=\"etiquettes.pdf\"");
        LabelSheetPdf.write(response.getOutputStream(), labels, startPosition, format);
    }

    /**
     * En telechargement force (KEY_ETIQUETTE_TELECHARGEMENT = 1), le navigateur enregistre le PDF au lieu de l'afficher
     * dans son visionneur : l'utilisateur l'ouvre avec son application PDF par defaut (Adobe, Foxit...), dont les
     * reglages d'impression sont fiables et memorises.
     */
    private String contentDisposition() {
        return "1".equals(reportUtil.findParameterValue(KEY_TELECHARGEMENT)) ? "attachment" : "inline";
    }

    private List<LabelSheetPdf.LabelData> buildLabels(String idBon) {
        List<LabelSheetPdf.LabelData> labels = new ArrayList<>();
        String dateToday = date.DateToString(new Date(), date.formatterShortBis);
        try {
            TOfficine officine = reportUtil.findOfficine();
            String nomOfficine = officine != null ? officine.getStrNOMABREGE() : "";
            List<TBonLivraisonDetail> items = orderService.getBonItems(idBon);
            String grossiste = findGrossiste(items);
            for (TBonLivraisonDetail bonItem : items) {
                TFamille famille = bonItem.getLgFAMILLEID();
                if (famille == null) {
                    continue;
                }
                int quantite = bonItem.getIntQTERECUE() != null ? bonItem.getIntQTERECUE() : 0;
                String prix = conversion.AmountFormat(famille.getIntPRICE(), ' ') + " CFA";
                for (int i = 0; i < quantite; i++) {
                    labels.add(new LabelSheetPdf.LabelData(nomOfficine, grossiste, famille.getStrDESCRIPTION(),
                            famille.getIntCIP(), prix, dateToday));
                }
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return labels;
    }

    private String findGrossiste(List<TBonLivraisonDetail> items) {
        try {
            for (TBonLivraisonDetail item : items) {
                TBonLivraison bonLivraison = item.getLgBONLIVRAISONID();
                if (bonLivraison == null) {
                    continue;
                }
                TOrder order = bonLivraison.getLgORDERID();
                if (order == null) {
                    continue;
                }
                TGrossiste grossiste = order.getLgGROSSISTEID();
                if (grossiste != null && StringUtils.isNotBlank(grossiste.getStrLIBELLE())) {
                    return grossiste.getStrLIBELLE();
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, null, e);
        }
        return "";
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
        return "Edition des etiquettes A4 (65 etiquettes) d'un bon de livraison";
    }// </editor-fold>
}
