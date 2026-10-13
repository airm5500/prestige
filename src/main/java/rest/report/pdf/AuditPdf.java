package rest.report.pdf;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Edition d'un rapport d'audit (AUDIT & RAPPROCHEMENTS) : synthese par controle, puis le detail des ecarts de chaque
 * controle en ecart (MAX_LIGNES lignes au plus par controle ; l'export Excel les reprend toutes).
 */
public final class AuditPdf {

    public static final int MAX_LIGNES = 200;
    private static final BaseColor BLEU = new BaseColor(31, 58, 95), VERT = new BaseColor(30, 132, 73),
            ROUGE = new BaseColor(192, 57, 43), GRIS = new BaseColor(95, 107, 120), FOND = new BaseColor(244, 246, 248);

    private AuditPdf() {
    }

    private static Font police(float taille, int style, BaseColor c) {
        return new Font(Font.FontFamily.HELVETICA, taille, style, c);
    }

    private static PdfPCell cellule(String texte, Font f, BaseColor fond, int alignement) {
        PdfPCell c = new PdfPCell(new Phrase(texte == null ? "" : texte, f));
        c.setPadding(3.5f);
        c.setBorderColor(new BaseColor(213, 219, 225));
        c.setHorizontalAlignment(alignement);
        if (fond != null) {
            c.setBackgroundColor(fond);
        }
        return c;
    }

    static String nombre(long v) {
        String s = String.valueOf(Math.abs(v)).replaceAll("\\B(?=(\\d{3})+(?!\\d))", " ");
        return (v < 0 ? "−" : "") + s;
    }

    /**
     * @param colonnes
     *            par code de controle : {champ, titre, "1" si numerique}
     */
    public static byte[] rapport(String pharmacie, String entete, JSONObject r,
            java.util.Map<String, String[][]> colonnes) throws DocumentException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4.rotate(), 28, 28, 28, 28);
        PdfWriter.getInstance(d, out);
        d.open();
        d.add(new Paragraph(pharmacie, police(10, Font.NORMAL, GRIS)));
        d.add(new Paragraph("Audit & rapprochements", police(16, Font.BOLD, BLEU)));
        Paragraph p = new Paragraph(entete, police(9, Font.NORMAL, GRIS));
        p.setSpacingAfter(10);
        d.add(p);

        Font fe = police(9, Font.BOLD, BaseColor.WHITE), f = police(9, Font.NORMAL, BaseColor.BLACK);
        PdfPTable synthese = new PdfPTable(new float[] { 40, 12, 48 });
        synthese.setWidthPercentage(100);
        for (String h : new String[] { "Contrôle", "Écarts", "Ce que signifie un écart" }) {
            synthese.addCell(cellule(h, fe, BLEU, Element.ALIGN_LEFT));
        }
        JSONArray sections = r.optJSONArray("sections");
        for (int i = 0; sections != null && i < sections.length(); i++) {
            JSONObject s = sections.getJSONObject(i);
            int nb = s.optInt("nb");
            synthese.addCell(
                    cellule(s.optString("titre"), police(9, Font.BOLD, BaseColor.BLACK), null, Element.ALIGN_LEFT));
            synthese.addCell(cellule(s.has("erreur") ? "non calculé" : nb == 0 ? "concorde" : nombre(nb),
                    police(9, Font.BOLD, s.has("erreur") ? GRIS : nb == 0 ? VERT : ROUGE), null, Element.ALIGN_CENTER));
            synthese.addCell(cellule(s.has("erreur") ? s.optString("erreur") : s.optString("explication"), f, null,
                    Element.ALIGN_LEFT));
        }
        d.add(synthese);

        for (int i = 0; sections != null && i < sections.length(); i++) {
            JSONObject s = sections.getJSONObject(i);
            JSONArray lignes = s.optJSONArray("lignes");
            String[][] cols = colonnes.getOrDefault(s.optString("code"), new String[0][]);
            if (s.optInt("nb") == 0 || lignes == null || lignes.length() == 0 || cols.length == 0) {
                continue;
            }
            int montrees = Math.min(lignes.length(), MAX_LIGNES);
            Paragraph t = new Paragraph(
                    s.optString("titre") + " — " + nombre(s.optInt("nb")) + " écart(s)"
                            + (montrees < s.optInt("nb") ? " (" + montrees + " premiers)" : ""),
                    police(11, Font.BOLD, BLEU));
            t.setSpacingBefore(14);
            t.setSpacingAfter(4);
            d.add(t);
            PdfPTable table = new PdfPTable(cols.length);
            table.setWidthPercentage(100);
            table.setHeaderRows(1);
            for (String[] c : cols) {
                table.addCell(cellule(c[1], fe, BLEU, Element.ALIGN_LEFT));
            }
            for (int k = 0; k < montrees; k++) {
                JSONObject l = lignes.getJSONObject(k);
                for (String[] c : cols) {
                    boolean num = "1".equals(c[2]);
                    String v = !l.has(c[0]) ? "" : num ? nombre(l.optLong(c[0])) : l.optString(c[0]);
                    table.addCell(
                            cellule(v, f, k % 2 == 1 ? FOND : null, num ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT));
                }
            }
            d.add(table);
        }
        d.close();
        return out.toByteArray();
    }
}
