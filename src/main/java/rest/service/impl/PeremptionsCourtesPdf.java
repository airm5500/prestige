package rest.service.impl;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Demande mobile 36 D12 : rapport des peremptions courtes en PDF (A4 paysage), ecrit directement : il ne depend d'aucun
 * modele d'edition de l'officine.
 */
public final class PeremptionsCourtesPdf {

    private static final BaseColor ENTETE = new BaseColor(0x1e, 0x3a, 0x5f);
    static final String[] TITRES = { "Date", "BL", "CIP", "Produit", "Grossiste", "Lot", "Péremption", "Jours", "Qté",
            "Valeur", "Décision", "Motif", "Statut" };

    private PeremptionsCourtesPdf() {
    }

    public static String libelleStatut(String s) {
        return "RECLAME".equals(s) ? "Réclamé" : "AVOIR_RECU".equals(s) ? "Avoir reçu" : "À traiter";
    }

    public static String libelleDecision(String s) {
        return "ACCEPTE".equals(s) ? "Accepté" : "REFUSE".equals(s) ? "Refusé" : StringUtils.defaultString(s);
    }

    /** jj/mm/aaaa d'une date AAAA-MM-JJ (ou de son debut) */
    public static String jour(String iso) {
        String s = StringUtils.defaultString(iso);
        return s.length() >= 10 ? s.substring(8, 10) + "/" + s.substring(5, 7) + "/" + s.substring(0, 4) : s;
    }

    public static byte[] ecrire(JSONObject rapport, String officine, String periode) throws Exception {
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
        PdfWriter.getInstance(doc, sortie);
        doc.open();
        Font titre = new Font(Font.FontFamily.HELVETICA, 13, Font.BOLD, ENTETE);
        Font normal = new Font(Font.FontFamily.HELVETICA, 8, Font.NORMAL, BaseColor.BLACK);
        Font gras = new Font(Font.FontFamily.HELVETICA, 8, Font.BOLD, BaseColor.WHITE);
        doc.add(new Paragraph(StringUtils.defaultString(officine).toUpperCase(), normal));
        doc.add(new Paragraph("PÉREMPTIONS COURTES À LA RÉCEPTION — " + periode, titre));
        doc.add(new Paragraph(" ", normal));
        PdfPTable t = new PdfPTable(new float[] { 7, 7, 6, 18, 9, 6, 7, 4, 4, 7, 6, 13, 6 });
        t.setWidthPercentage(100);
        for (String s : TITRES) {
            PdfPCell c = new PdfPCell(new Phrase(s, gras));
            c.setBackgroundColor(ENTETE);
            t.addCell(c);
        }
        JSONArray data = rapport.optJSONArray("data");
        for (int i = 0; data != null && i < data.length(); i++) {
            JSONObject l = data.getJSONObject(i);
            String[] v = { jour(l.optString("le")), l.optString("bl"), l.optString("cip"), l.optString("produit"),
                    l.optString("grossiste"), l.optString("numLot"), jour(l.optString("datePeremption")),
                    String.valueOf(l.optLong("joursRestants")), String.valueOf(l.optLong("quantite")),
                    String.valueOf(l.optLong("valeur")), libelleDecision(l.optString("decision")), l.optString("motif"),
                    libelleStatut(l.optString("statut")) };
            for (int k = 0; k < v.length; k++) {
                PdfPCell c = new PdfPCell(new Phrase(v[k], normal));
                if (k == 7 || k == 8 || k == 9) {
                    c.setHorizontalAlignment(Element.ALIGN_RIGHT);
                }
                t.addCell(c);
            }
        }
        doc.add(t);
        doc.add(new Paragraph(
                rapport.optInt("total") + " ligne(s) — valeur totale " + rapport.optLong("valeur") + " F CFA",
                new Font(Font.FontFamily.HELVETICA, 9, Font.BOLD, BaseColor.BLACK)));
        doc.close();
        return sortie.toByteArray();
    }
}
