package rest.service.impl;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.Barcode128;
import com.itextpdf.text.pdf.ColumnText;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfTemplate;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.apache.commons.lang3.StringUtils;

/**
 * Retours du 13/10 (point 3) : cartes de badge au format carte bancaire (85,6 x 54 mm), dix par page A4, traits de
 * coupe. Bandeau de l'officine, nom et prenoms, poste, matricule, numero du badge en code-barres (lu par la pointeuse
 * ou une douchette), date d'expiration.
 */
public final class BadgePdf {

    private static final float MM = 72f / 25.4f;
    static final float LARGEUR = 85.6f * MM;
    static final float HAUTEUR = 54f * MM;
    private static final int COLONNES = 2;
    private static final int LIGNES = 5;
    private static final BaseColor BANDEAU = new BaseColor(0x1e, 0x3a, 0x5f);
    private static final BaseColor GRIS = new BaseColor(0x55, 0x60, 0x6b);

    private BadgePdf() {
    }

    /** Une carte de badge. */
    public static final class Carte {

        final String numero;
        final String nom;
        final String prenoms;
        final String poste;
        final String matricule;
        final LocalDate expiration;
        /** contenu du QR code (demande du 16/10) ; null : code-barres du numero */
        final String qr;

        public Carte(String numero, String nom, String prenoms, String poste, String matricule, LocalDate expiration) {
            this(numero, nom, prenoms, poste, matricule, expiration, null);
        }

        public Carte(String numero, String nom, String prenoms, String poste, String matricule, LocalDate expiration,
                String qr) {
            this.qr = qr;
            this.numero = numero;
            this.nom = nom;
            this.prenoms = prenoms;
            this.poste = poste;
            this.matricule = matricule;
            this.expiration = expiration;
        }
    }

    private static Font police(float taille, int style, BaseColor c) {
        return new Font(Font.FontFamily.HELVETICA, taille, style, c);
    }

    public static byte[] ecrire(List<Carte> cartes, String officine) throws Exception {
        return ecrire(cartes, officine, false);
    }

    /**
     * @param unParPage
     *            demande du 17/10 : une carte par page, page au format exact de la carte (85,6 x 54 mm), sans trait de
     *            coupe, pour une imprimante a cartes PVC (Evolis, Zebra...). Sinon planche A4 de dix.
     */
    public static byte[] ecrire(List<Carte> cartes, String officine, boolean unParPage) throws Exception {
        if (unParPage) {
            return ecrireUneParPage(cartes, officine);
        }
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 0, 0, 0, 0);
        PdfWriter w = PdfWriter.getInstance(doc, sortie);
        doc.open();
        float page = PageSize.A4.getWidth(), haut = PageSize.A4.getHeight();
        float ecartX = 8 * MM, ecartY = 4 * MM;
        float x0 = (page - COLONNES * LARGEUR - (COLONNES - 1) * ecartX) / 2;
        float y0 = haut - (haut - LIGNES * HAUTEUR - (LIGNES - 1) * ecartY) / 2;
        int parPage = COLONNES * LIGNES;
        for (int i = 0; i < cartes.size(); i++) {
            if (i > 0 && i % parPage == 0) {
                doc.newPage();
            }
            int k = i % parPage, col = k % COLONNES, lig = k / COLONNES;
            float x = x0 + col * (LARGEUR + ecartX), y = y0 - (lig + 1) * HAUTEUR - lig * ecartY;
            carte(w.getDirectContent(), cartes.get(i), StringUtils.defaultString(officine), x, y, true);
        }
        if (cartes.isEmpty()) {
            doc.add(new Phrase("Aucun badge actif à imprimer.", police(12, Font.NORMAL, BaseColor.BLACK)));
        }
        doc.close();
        return sortie.toByteArray();
    }

    private static byte[] ecrireUneParPage(List<Carte> cartes, String officine) throws Exception {
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        Document doc = new Document(new com.itextpdf.text.Rectangle(LARGEUR, HAUTEUR), 0, 0, 0, 0);
        PdfWriter w = PdfWriter.getInstance(doc, sortie);
        doc.open();
        for (int i = 0; i < cartes.size(); i++) {
            if (i > 0) {
                doc.newPage();
            }
            carte(w.getDirectContent(), cartes.get(i), StringUtils.defaultString(officine), 0, 0, false);
        }
        if (cartes.isEmpty()) {
            doc.add(new Phrase("Aucun badge actif à imprimer.", police(9, Font.NORMAL, BaseColor.BLACK)));
        }
        doc.close();
        return sortie.toByteArray();
    }

    private static void carte(PdfContentByte cb, Carte c, String officine, float x, float y, boolean traitDeCoupe)
            throws Exception {
        cb.saveState();
        if (traitDeCoupe) {
            /* trait de coupe (cadre fin, coins arrondis) */
            cb.setColorStroke(new BaseColor(0xb0, 0xb8, 0xc0));
            cb.setLineWidth(0.4f);
            cb.roundRectangle(x, y, LARGEUR, HAUTEUR, 3 * MM);
            cb.stroke();
        }
        /* bandeau de l'officine */
        float bandeau = 9 * MM;
        cb.setColorFill(BANDEAU);
        cb.rectangle(x, y + HAUTEUR - bandeau, LARGEUR, bandeau);
        cb.fill();
        cb.restoreState();
        float marge = 4 * MM, largeurTexte = LARGEUR - 2 * marge;
        /* QR code de 32 mm a droite (demande du 16/10) : le texte reste a sa gauche */
        float coteQr = 32 * MM;
        float largeurNom = c.qr == null ? largeurTexte : largeurTexte - coteQr - 2 * MM;
        texte(cb, StringUtils.abbreviate(officine.toUpperCase(), 40), police(9, Font.BOLD, BaseColor.WHITE), x + marge,
                y + HAUTEUR - bandeau + 3 * MM, largeurTexte, Element.ALIGN_LEFT);
        texte(cb, "BADGE", police(7, Font.BOLD, new BaseColor(0xcf, 0xe0, 0xf1)), x + marge,
                y + HAUTEUR - bandeau + 3 * MM, largeurTexte, Element.ALIGN_RIGHT);
        float ligne = y + HAUTEUR - bandeau - 6 * MM;
        texte(cb, StringUtils.abbreviate(StringUtils.defaultString(c.nom).toUpperCase(), c.qr == null ? 30 : 17),
                police(13, Font.BOLD, BaseColor.BLACK), x + marge, ligne, largeurNom, Element.ALIGN_LEFT);
        ligne -= 4.8f * MM;
        texte(cb, StringUtils.abbreviate(StringUtils.defaultString(c.prenoms), c.qr == null ? 40 : 24),
                police(10, Font.NORMAL, BaseColor.BLACK), x + marge, ligne, largeurNom, Element.ALIGN_LEFT);
        ligne -= 4.6f * MM;
        if (c.qr != null) {
            /* poste et matricule sur deux lignes, a gauche du QR */
            texte(cb, StringUtils.abbreviate(StringUtils.defaultString(c.poste), 28), police(8, Font.NORMAL, GRIS),
                    x + marge, ligne, largeurNom, Element.ALIGN_LEFT);
            if (StringUtils.isNotBlank(c.matricule)) {
                texte(cb, StringUtils.abbreviate("Matricule " + c.matricule, 28), police(8, Font.NORMAL, GRIS),
                        x + marge, ligne - 3.6f * MM, largeurNom, Element.ALIGN_LEFT);
            }
            java.util.Map<com.itextpdf.text.pdf.qrcode.EncodeHintType, Object> options = new java.util.HashMap<>();
            options.put(com.itextpdf.text.pdf.qrcode.EncodeHintType.ERROR_CORRECTION,
                    com.itextpdf.text.pdf.qrcode.ErrorCorrectionLevel.M);
            com.itextpdf.text.Image img = new com.itextpdf.text.pdf.BarcodeQRCode(c.qr, 1, 1, options).getImage();
            img.scaleAbsolute(coteQr, coteQr);
            /* centre verticalement dans la carte, sous le bandeau (demande du 16/10) */
            img.setAbsolutePosition(x + LARGEUR - marge - coteQr + 1 * MM, y + (HAUTEUR - bandeau - coteQr) / 2);
            cb.addImage(img);
            float gauche = largeurNom;
            texte(cb, c.numero, new Font(Font.FontFamily.COURIER, 10.5f, Font.BOLD, BaseColor.BLACK), x + marge,
                    y + 7 * MM, gauche, Element.ALIGN_LEFT);
            if (c.expiration != null) {
                texte(cb, "Expire le " + c.expiration.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                        police(7, Font.NORMAL, GRIS), x + marge, y + 2.5f * MM, gauche, Element.ALIGN_LEFT);
            }
            return;
        }
        String sous = StringUtils.defaultString(c.poste) + (StringUtils.isNotBlank(c.matricule)
                ? (StringUtils.isNotBlank(c.poste) ? "  ·  " : "") + "Matricule " + c.matricule : "");
        texte(cb, StringUtils.abbreviate(sous, 55), police(8, Font.NORMAL, GRIS), x + marge, ligne, largeurTexte,
                Element.ALIGN_LEFT);
        /* code-barres du numero, sous le texte */
        Barcode128 code = new Barcode128();
        code.setCode(c.numero);
        code.setFont(null);
        code.setBarHeight(9 * MM);
        code.setX(0.8f);
        PdfTemplate t = code.createTemplateWithBarcode(cb, BaseColor.BLACK, BaseColor.BLACK);
        float echelle = Math.min(1f, (LARGEUR * 0.62f) / t.getWidth());
        cb.addTemplate(t, echelle, 0, 0, 1, x + marge, y + 5.5f * MM);
        texte(cb, c.numero, police(8, Font.BOLD, BaseColor.BLACK), x + marge, y + 2 * MM, largeurTexte,
                Element.ALIGN_LEFT);
        if (c.expiration != null) {
            texte(cb, "Expire le " + c.expiration.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                    police(7, Font.NORMAL, GRIS), x + marge, y + 2 * MM, largeurTexte, Element.ALIGN_RIGHT);
        }
    }

    private static void texte(PdfContentByte cb, String s, Font f, float x, float y, float largeur, int align) {
        float ax = align == Element.ALIGN_RIGHT ? x + largeur : x;
        ColumnText.showTextAligned(cb, align, new Phrase(StringUtils.defaultString(s), f), ax, y, 0);
    }
}
