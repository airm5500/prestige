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

    /** Parametre : code des etiquettes par defaut (CODE128, QR ou DATAMATRIX). */
    static final String KEY_CODE = "KEY_ETIQUETTE_CODE";
    /** Retours du 11/10 : 1 = chaque produit selon son type d'etiquette (defaut), 0 = le code choisi pour tous. */
    static final String KEY_PAR_PRODUIT = "KEY_ETIQUETTE_CODE_PAR_PRODUIT";
    private static final ThreadLocal<String> codeDemande = new ThreadLocal<>();
    /** Reglages de l'apercu avant impression (onglet d'Etiquettage Pro) : priorite sur la configuration. */
    private static final ThreadLocal<HttpServletRequest> demande = new ThreadLocal<>();
    static final String[] REGLAGES = { LabelSheetPdf.KEY_NB_COLONNES, LabelSheetPdf.KEY_NB_LIGNES,
            LabelSheetPdf.KEY_LARGEUR_MM, LabelSheetPdf.KEY_HAUTEUR_MM, LabelSheetPdf.KEY_ESPACE_H_MM,
            LabelSheetPdf.KEY_ESPACE_V_MM, LabelSheetPdf.KEY_MARGE_GAUCHE_MM, LabelSheetPdf.KEY_MARGE_HAUT_MM,
            LabelSheetPdf.KEY_DECALAGE_X_MM, LabelSheetPdf.KEY_DECALAGE_Y_MM, LabelSheetPdf.KEY_ECHELLE_POURCENT };
    @EJB
    private rest.service.impl.EtiquetteTypeService typeService;

    /** Valeur d'un reglage : celle envoyee par l'apercu si elle est donnee, sinon la configuration. */
    private String reglage(String cle) {
        HttpServletRequest r = demande.get();
        if (r != null) {
            for (String k : REGLAGES) {
                if (k.equals(cle) && StringUtils.isNotBlank(r.getParameter(k))) {
                    return r.getParameter(k).trim();
                }
            }
        }
        return reportUtil.findParameterValue(cle);
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, Exception {
        codeDemande.set(request.getParameter("code"));
        demande.set(request);
        try {
            traiter(request, response);
        } finally {
            codeDemande.remove();
            demande.remove();
        }
    }

    private void traiter(HttpServletRequest request, HttpServletResponse response) throws ServletException, Exception {

        String modele = request.getParameter("modele_ETIQUETTE");
        if (StringUtils.isBlank(modele)) {
            modele = reportUtil.findParameterValue(LabelSheetPdf.KEY_MODELE);
        }
        LabelSheetPdf.SheetFormat format = LabelSheetPdf.formatFor(modele, this::reglage);

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
        /*
         * retours du 10/10 (point 5) : code de l'etiquette, choisi a l'ecran (code=...) ou parametre KEY_ETIQUETTE_CODE
         */
        String type = LabelSheetPdf.typeCode(StringUtils.isNotBlank(codeDemande.get()) ? codeDemande.get()
                : reportUtil.findParameterValue(KEY_CODE));
        HttpServletRequest r = demande.get();
        /* date d'edition choisie dans l'apercu (sinon la date du jour) */
        if (r != null && r.getParameter("date") != null) {
            for (LabelSheetPdf.LabelData l : labels) {
                l.dateEdition(r.getParameter("date"));
            }
        }
        /*
         * retours du 11/10 : selon le type d'etiquette de chaque produit (parametre KEY_ETIQUETTE_CODE_PAR_PRODUIT, 1
         * par defaut, ou choix de l'apercu) ; un produit sans type a code (anciens types) garde le code ci-dessus, donc
         * exactement l'impression d'avant
         */
        String demandeParProduit = r == null ? null : r.getParameter("parProduit");
        boolean parProduit = demandeParProduit != null ? "1".equals(demandeParProduit)
                : !"0".equals(StringUtils.trimToEmpty(reportUtil.findParameterValue(KEY_PAR_PRODUIT)));
        java.util.Map<String, String> codes = new java.util.HashMap<>();
        if (parProduit) {
            List<String> familles = new ArrayList<>();
            for (LabelSheetPdf.LabelData l : labels) {
                familles.add(l.getFamilleId());
            }
            codes = typeService.codesDesProduits(familles);
        }
        java.util.Map<String, List<LabelSheetPdf.LabelData>> parType = new java.util.LinkedHashMap<>();
        for (LabelSheetPdf.LabelData l : labels) {
            String t = codes.getOrDefault(StringUtils.defaultString(l.getFamilleId()), type);
            parType.computeIfAbsent(t, k -> new ArrayList<>()).add(l);
        }
        float[] dim = LabelSheetPdf.dimension(format);
        for (java.util.Map.Entry<String, List<LabelSheetPdf.LabelData>> e : parType.entrySet()) {
            if (!LabelSheetPdf.CODE_BARRES.equals(e.getKey())) {
                etiquetteEditionService.completerGs1(e.getValue(), e.getKey());
            }
            if (LabelSheetPdf.QR_PLUS.equals(e.getKey()) || LabelSheetPdf.DATAMATRIX_PLUS.equals(e.getKey())) {
                /* code etendu : refuse sur un format ou il ne serait pas lisible */
                etiquetagepro.disposition.Disposition d = etiquetteEditionService.dispositionEnregistree(e.getKey(),
                        dim[0], dim[1]);
                try {
                    etiquetagepro.MoteurEtiquettes.controlerLisible(d != null ? d
                            : etiquetagepro.disposition.Disposition.parDefaut(e.getKey(), dim[0], dim[1]));
                } catch (IllegalArgumentException illisible) {
                    response.setContentType("text/html; charset=UTF-8");
                    response.getOutputStream()
                            .write(("<!doctype html><html><head><meta charset=\"utf-8\"><title>Étiquettes"
                                    + "</title></head><body style=\"font-family:sans-serif;padding:24px\"><h3>Étiquettes</h3><p>"
                                    + StringUtils.defaultString(illisible.getMessage()).replace("&", "&amp;")
                                            .replace("<", "&lt;")
                                    + "</p></body></html>").getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    return;
                }
            }
        }
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", contentDisposition() + "; filename=\"etiquettes.pdf\"");
        /*
         * personnalisation : une disposition enregistree s'applique aux etiquettes QR et DataMatrix (et etendues) ; le
         * code-barres classique garde son dessin
         */
        LabelSheetPdf.write(response.getOutputStream(), labels, startPosition, format,
                (t, l, h) -> LabelSheetPdf.CODE_BARRES.equals(t) ? null
                        : etiquetteEditionService.dispositionEnregistree(t, l, h));
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
                            famille.getIntCIP(), prix, dateToday).codeGeo(EtiquetteEditionService.codeGeo(famille))
                                    .source(famille.getLgFAMILLEID(), EtiquetteEditionService.ean(famille),
                                            EtiquetteEditionService.jour(famille.getDtPEREMPTION()),
                                            bonItem.getLgBONLIVRAISONID() == null ? null
                                                    : bonItem.getLgBONLIVRAISONID().getStrREFLIVRAISON()));
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
