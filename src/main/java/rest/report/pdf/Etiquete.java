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
 * Trois sources d'etiquettes, selon les parametres recus :
 * <ul>
 * <li>lg_BON_LIVRAISON_ID (+ int_NUMBER) : les produits recus sur un bon de livraison ;</li>
 * <li>lg_ETIQUETTE_ID (+ begin) : une ligne de la grille Gestion etiquettes ;</li>
 * <li>etiquettes=EN_PREPARATION (+ int_NUMBER) : le panier de l'etiquettage massif.</li>
 * </ul>
 * int_NUMBER et begin designent la premiere position occupee sur la feuille (1..65), modele_ETIQUETTE le format de
 * planche (CARRE_38X21_2, ARRONDI_38X21, CARRE_38_1X21_2, PERSONNALISE ; a defaut la valeur du parametre de
 * configuration KEY_ETIQUETTE_MODELE est utilisee).
 *
 * Les trois sources passent par la meme bascule KEY_ETIQUETTE_MOTEUR : sur ANCIEN, la requete est renvoyee vers la page
 * JSP historique correspondante, avec ses parametres d'origine.
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

    /** Valeur de « etiquettes » demandant le panier de l'etiquettage massif. */
    private static final String SOURCE_EN_PREPARATION = "EN_PREPARATION";

    @EJB
    private OrderService orderService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private EtiquetteEditionService etiquetteEditionService;

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

        // Menu Gestion etiquettes : une ligne de la grille.
        String refEtiquette = request.getParameter("lg_ETIQUETTE_ID");
        if (StringUtils.isNotBlank(refEtiquette)) {
            int debut = LabelSheetPdf.positionDepart(request.getParameter("begin"));
            if (moteurAncien()) {
                response.sendRedirect(request.getContextPath()
                        + "/webservices/stockmanagement/etiquette/ws_generate_pdf.jsp?lg_ETIQUETTE_ID="
                        + URLEncoder.encode(refEtiquette, "UTF-8") + "&begin=" + debut);
                return;
            }
            ecrire(response, etiquetteEditionService.etiquettesDeLaLigne(refEtiquette), debut, format);
            // Comme le moteur ANCIEN : la ligne passe a l'etat « editee » une fois la planche produite.
            etiquetteEditionService.marquerImprimee(refEtiquette);
            return;
        }

        // Menu Gestion etiquettes : panier de l'etiquettage massif.
        if (SOURCE_EN_PREPARATION.equalsIgnoreCase(StringUtils.trimToEmpty(request.getParameter("etiquettes")))) {
            int debut = LabelSheetPdf.positionDepart(request.getParameter("int_NUMBER"));
            if (moteurAncien()) {
                response.sendRedirect(request.getContextPath()
                        + "/webservices/stockmanagement/etiquette/ws_generate_etiquette_pdf.jsp?int_NUMBER=" + debut);
                return;
            }
            ecrire(response, etiquetteEditionService.etiquettesEnPreparation(), debut, format);
            /*
             * Le panier est solde une fois la planche produite : sans cela on rouvre la creation groupee et on y
             * retrouve les articles qu'on vient d'imprimer, sans savoir s'ils l'ont ete. Meme regle que pour une ligne
             * editee a l'unite, quelques lignes plus haut.
             */
            etiquetteEditionService.solderPanier();
            return;
        }

        String refBon = request.getParameter("lg_BON_LIVRAISON_ID");
        if (StringUtils.isBlank(refBon)) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "lg_BON_LIVRAISON_ID manquant");
            return;
        }

        int startPosition = LabelSheetPdf.positionDepart(request.getParameter("int_NUMBER"));

        // bascule de securite : moteur ANCIEN = generation JasperReports historique
        if (moteurAncien()) {
            response.sendRedirect(request.getContextPath()
                    + "/webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf_legacy.jsp?lg_BON_LIVRAISON_ID="
                    + URLEncoder.encode(refBon, "UTF-8") + "&int_NUMBER=" + startPosition);
            return;
        }

        ecrire(response, buildLabels(refBon), startPosition, format);
    }

    /** Bascule de securite : ANCIEN renvoie vers la generation JasperReports historique. */
    private boolean moteurAncien() {
        return "ANCIEN".equalsIgnoreCase(StringUtils.trimToEmpty(reportUtil.findParameterValue(KEY_MOTEUR)));
    }

    private void ecrire(HttpServletResponse response, List<LabelSheetPdf.LabelData> labels, int startPosition,
            LabelSheetPdf.SheetFormat format) throws Exception {
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
        return "Edition des planches d'etiquettes A4 (bon de livraison, ligne d'etiquette, etiquettage massif)";
    }// </editor-fold>
}
