package rest.report.pdf;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Chunk;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.Image;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.BarcodeQRCode;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.itextpdf.text.pdf.qrcode.EncodeHintType;
import com.itextpdf.text.pdf.qrcode.ErrorCorrectionLevel;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Editions des avis clients : affiche du QR code, liste des avis, analyse. */
public final class AvisPdf {

    private static final BaseColor VERT = new BaseColor(15, 91, 79), VERT_CLAIR = new BaseColor(231, 243, 240),
            GRIS = new BaseColor(95, 107, 120), ROUGE = new BaseColor(192, 57, 43), OR = new BaseColor(245, 179, 1);
    private static final String[] STATUTS = { "NOUVEAU", "Nouveau", "LU", "Lu", "TRAITE", "Traité" };

    private AvisPdf() {
    }

    private static Font police(float taille, int style, BaseColor c) {
        return new Font(Font.FontFamily.HELVETICA, taille, style, c);
    }

    /** Image du QR code (correction M, sans perte a l'impression). */
    static Image qr(String lien, float cote) throws DocumentException {
        Map<EncodeHintType, Object> o = new HashMap<>();
        o.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        o.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        Image i = new BarcodeQRCode(lien, 1, 1, o).getImage();
        i.scaleAbsolute(cote, cote);
        return i;
    }

    /** Affiche A4 ou A5 a poser dans la pharmacie. */
    public static byte[] affiche(String pharmacie, String adresse, String lien, boolean a5) throws DocumentException {
        Rectangle page = a5 ? PageSize.A5 : PageSize.A4;
        float k = a5 ? 0.7071f : 1f;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(page, 40 * k, 40 * k, 0, 30 * k);
        PdfWriter w = PdfWriter.getInstance(d, out);
        d.open();
        PdfContentByte cb = w.getDirectContentUnder();
        cb.setColorFill(VERT);
        cb.rectangle(0, page.getHeight() - 150 * k, page.getWidth(), 150 * k);
        cb.fill();
        Paragraph nom = new Paragraph(pharmacie.toUpperCase(java.util.Locale.FRANCE),
                police(26 * k, Font.BOLD, BaseColor.WHITE));
        nom.setAlignment(Element.ALIGN_CENTER);
        nom.setSpacingBefore(48 * k);
        d.add(nom);
        Paragraph ad = new Paragraph(adresse, police(13 * k, Font.NORMAL, BaseColor.WHITE));
        ad.setAlignment(Element.ALIGN_CENTER);
        d.add(ad);
        Paragraph titre = new Paragraph("Votre avis nous intéresse", police(34 * k, Font.BOLD, VERT));
        titre.setAlignment(Element.ALIGN_CENTER);
        titre.setSpacingBefore(70 * k);
        d.add(titre);
        Paragraph sous = new Paragraph("Scannez ce code avec l'appareil photo de votre téléphone",
                police(15 * k, Font.NORMAL, GRIS));
        sous.setAlignment(Element.ALIGN_CENTER);
        sous.setSpacingBefore(46 * k);
        d.add(sous);
        float cote = 250 * k;
        Image code = qr(lien, cote);
        code.setAlignment(Element.ALIGN_CENTER);
        code.setSpacingBefore(14 * k);
        d.add(code);
        /* cinq etoiles sous le titre (Helvetica n'a pas le caractere : dessinees) */
        float y = page.getHeight() - 150 * k - 132 * k;
        PdfContentByte dessus = w.getDirectContent();
        dessus.setColorFill(OR);
        for (int i = 0; i < 5; i++) {
            etoile(dessus, page.getWidth() / 2 + (i - 2) * 30 * k, y, 11 * k);
        }
        Paragraph points = new Paragraph("1 minute  ·  anonyme si vous le souhaitez  ·  lu par la direction",
                police(13 * k, Font.BOLD, VERT));
        points.setAlignment(Element.ALIGN_CENTER);
        points.setSpacingBefore(10 * k);
        d.add(points);
        Paragraph merci = new Paragraph("Merci de nous aider à mieux vous servir.", police(13 * k, Font.ITALIC, GRIS));
        merci.setAlignment(Element.ALIGN_CENTER);
        merci.setSpacingBefore(18 * k);
        d.add(merci);
        Paragraph url = new Paragraph(lien.replaceAll("\\?t=.*", ""), police(8 * k, Font.NORMAL, GRIS));
        url.setAlignment(Element.ALIGN_CENTER);
        url.setSpacingBefore(26 * k);
        d.add(url);
        d.close();
        return out.toByteArray();
    }

    private static void etoile(PdfContentByte cb, float cx, float cy, float r) {
        for (int i = 0; i < 10; i++) {
            double a = Math.PI / 2 + i * Math.PI / 5;
            float rr = i % 2 == 0 ? r : r * 0.45f;
            float x = cx + (float) (rr * Math.cos(a)), y = cy + (float) (rr * Math.sin(a));
            if (i == 0) {
                cb.moveTo(x, y);
            } else {
                cb.lineTo(x, y);
            }
        }
        cb.closePath();
        cb.fill();
    }

    private static PdfPCell cellule(String t, Font f, BaseColor fond, int align) {
        PdfPCell c = new PdfPCell(new Phrase(t == null ? "" : t, f));
        c.setPadding(4);
        c.setBorderColor(new BaseColor(223, 229, 234));
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_TOP);
        if (fond != null) {
            c.setBackgroundColor(fond);
        }
        return c;
    }

    private static String statut(String s) {
        for (int i = 0; i < STATUTS.length; i += 2) {
            if (STATUTS[i].equals(s)) {
                return STATUTS[i + 1];
            }
        }
        return s;
    }

    private static Document entete(Document d, String pharmacie, String titre, String sousTitre)
            throws DocumentException {
        d.add(new Paragraph(pharmacie, police(9, Font.NORMAL, GRIS)));
        d.add(new Paragraph(titre, police(15, Font.BOLD, VERT)));
        Paragraph s = new Paragraph(
                sousTitre + "  —  édité le "
                        + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
                police(9, Font.NORMAL, GRIS));
        s.setSpacingAfter(10);
        d.add(s);
        return d;
    }

    /** Liste des avis filtres (paysage). */
    public static byte[] liste(String pharmacie, String periode, List<JSONObject> avis) throws DocumentException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4.rotate(), 28, 28, 28, 28);
        PdfWriter.getInstance(d, out);
        d.open();
        entete(d, pharmacie, "Avis clients", periode + "  —  " + avis.size() + " avis");
        PdfPTable t = new PdfPTable(new float[] { 11, 7, 14, 38, 11, 12, 7 });
        t.setWidthPercentage(100);
        t.setHeaderRows(1);
        Font fe = police(8.5f, Font.BOLD, BaseColor.WHITE), f = police(8.5f, Font.NORMAL, BaseColor.BLACK);
        for (String h : new String[] { "Date", "Note", "Critères", "Ressenti", "Employé cité", "Client", "Statut" }) {
            t.addCell(cellule(h, fe, VERT, Element.ALIGN_LEFT));
        }
        for (JSONObject a : avis) {
            int n = a.getInt("note");
            t.addCell(cellule(a.getString("date"), f, null, Element.ALIGN_LEFT));
            t.addCell(cellule(n + " / 5", police(9, Font.BOLD, n <= 2 ? ROUGE : n >= 4 ? VERT : GRIS), null,
                    Element.ALIGN_CENTER));
            StringBuilder c = new StringBuilder();
            JSONObject cr = a.getJSONObject("criteres");
            for (String k : cr.keySet()) {
                c.append(c.length() == 0 ? "" : "\n").append("PLUS".equals(cr.getString(k)) ? "+ " : "− ")
                        .append(avisclients.Analyse.LIBELLES_CRITERES.getOrDefault(k, k));
            }
            t.addCell(cellule(c.toString(), f, null, Element.ALIGN_LEFT));
            String texte = a.getString("texte") + (a.getString("reponse").isEmpty() ? ""
                    : "\n\nRéponse (" + a.getString("dateReponse") + ") : " + a.getString("reponse"));
            t.addCell(cellule(texte, f, null, Element.ALIGN_LEFT));
            t.addCell(cellule(a.getString("employe"), f,
                    a.getString("employe").isEmpty() ? null : new BaseColor(253, 236, 234), Element.ALIGN_LEFT));
            t.addCell(cellule(a.getBoolean("anonyme") ? "Anonyme"
                    : (a.getString("nom") + "\n" + a.getString("telephone") + "\n" + a.getString("email")).trim(), f,
                    null, Element.ALIGN_LEFT));
            t.addCell(cellule(statut(a.getString("statut")), f, null, Element.ALIGN_LEFT));
        }
        if (avis.isEmpty()) {
            PdfPCell vide = cellule("Aucun avis pour ces critères.", f, null, Element.ALIGN_CENTER);
            vide.setColspan(7);
            t.addCell(vide);
        }
        d.add(t);
        d.close();
        return out.toByteArray();
    }

    /** Analyse de la periode (portrait). */
    public static byte[] analyse(String pharmacie, String periode, JSONObject a) throws DocumentException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4, 32, 32, 30, 30);
        PdfWriter.getInstance(d, out);
        d.open();
        entete(d, pharmacie, "Analyse des avis clients", periode);
        JSONObject s = a.getJSONObject("synthese"), p = s.getJSONObject("precedent");
        PdfPTable k = new PdfPTable(4);
        k.setWidthPercentage(100);
        Font fv = police(18, Font.BOLD, VERT), fl = police(8, Font.NORMAL, GRIS);
        tuile(k, String.valueOf(s.getInt("nombre")), "avis (période précédente : " + p.getInt("nombre") + ")", fv, fl);
        tuile(k, s.getDouble("moyenne") + " / 5", "note moyenne (précédente : " + p.getDouble("moyenne") + ")", fv, fl);
        tuile(k, s.getDouble("satisfaits") + " %", "satisfaits (4-5 étoiles)", fv, fl);
        tuile(k, s.getDouble("mecontents") + " %", "mécontents (1-2 étoiles)", police(18, Font.BOLD, ROUGE), fl);
        d.add(k);

        titre(d, "Alertes");
        JSONArray al = a.getJSONArray("alertes");
        if (al.length() == 0) {
            d.add(new Paragraph("Aucune alerte.", police(9, Font.NORMAL, GRIS)));
        }
        for (int i = 0; i < al.length(); i++) {
            JSONObject x = al.getJSONObject(i);
            d.add(new Paragraph(("haute".equals(x.getString("niveau")) ? "● " : "○ ") + x.getString("texte"),
                    police(9.5f, Font.NORMAL, "haute".equals(x.getString("niveau")) ? ROUGE : BaseColor.BLACK)));
        }
        JSONObject b = a.getJSONObject("bilan");
        titre(d, "Points forts / à améliorer");
        PdfPTable bt = new PdfPTable(2);
        bt.setWidthPercentage(100);
        bt.addCell(cellule("Points forts\n" + puces(b.getJSONArray("forts")), police(9, Font.NORMAL, VERT), VERT_CLAIR,
                Element.ALIGN_LEFT));
        bt.addCell(cellule("À améliorer\n" + puces(b.getJSONArray("faibles")), police(9, Font.NORMAL, ROUGE),
                new BaseColor(253, 236, 234), Element.ALIGN_LEFT));
        d.add(bt);

        titre(d, "Critères");
        tableau(d, a.getJSONArray("criteres"), new String[] { "Critère", "Apprécié", "À améliorer", "Satisfaction %" },
                new String[] { "libelle", "plus", "moins", "satisfaction" }, new float[] { 40, 20, 20, 20 });
        titre(d, "Thèmes évoqués dans les textes");
        tableau(d, a.getJSONArray("themes"), new String[] { "Thème", "Avis", "Note moy.", "Négatifs", "Période préc." },
                new String[] { "theme", "nombre", "moyenne", "negatifs", "precedent" },
                new float[] { 36, 16, 16, 16, 16 });
        titre(d, "Employés cités");
        JSONArray em = a.getJSONArray("employes");
        PdfPTable te = new PdfPTable(new float[] { 22, 8, 9, 9, 22, 30 });
        te.setWidthPercentage(100);
        Font fe = police(8.5f, Font.BOLD, BaseColor.WHITE), f = police(8.5f, Font.NORMAL, BaseColor.BLACK);
        for (String h : new String[] { "Employé (variantes)", "Avis", "Note moy.", "Négatifs", "Critères en cause",
                "Mots associés" }) {
            te.addCell(cellule(h, fe, VERT, Element.ALIGN_LEFT));
        }
        for (int i = 0; i < em.length(); i++) {
            JSONObject e = em.getJSONObject(i);
            String nom = e.getString("employe")
                    + (e.isNull("correspondance") ? "" : "\n→ " + e.getString("correspondance"))
                    + (e.getJSONArray("variantes").length() > 1 ? "\n(" + join(e.getJSONArray("variantes")) + ")" : "");
            te.addCell(cellule(nom, f, null, Element.ALIGN_LEFT));
            te.addCell(cellule(String.valueOf(e.getInt("nombre")), f, null, Element.ALIGN_CENTER));
            te.addCell(cellule(String.valueOf(e.getDouble("moyenne")), f, null, Element.ALIGN_CENTER));
            te.addCell(cellule(String.valueOf(e.getInt("negatifs")),
                    e.getInt("negatifs") > 0 ? police(8.5f, Font.BOLD, ROUGE) : f, null, Element.ALIGN_CENTER));
            StringBuilder c = new StringBuilder();
            JSONObject cn = e.getJSONObject("criteresNegatifs");
            cn.keySet().forEach(
                    x -> c.append(c.length() == 0 ? "" : ", ").append(x).append(" (").append(cn.getInt(x)).append(')'));
            te.addCell(cellule(c.toString(), f, null, Element.ALIGN_LEFT));
            StringBuilder m = new StringBuilder();
            JSONArray mc = e.getJSONArray("motsCles");
            for (int j = 0; j < mc.length(); j++) {
                m.append(j == 0 ? "" : ", ").append(mc.getJSONObject(j).getString("mot"));
            }
            te.addCell(cellule(m.toString(), f, null, Element.ALIGN_LEFT));
        }
        if (em.length() == 0) {
            PdfPCell v = cellule("Aucun employé cité.", f, null, Element.ALIGN_CENTER);
            v.setColspan(6);
            te.addCell(v);
        }
        d.add(te);
        titre(d, "Mots clés");
        tableau(d, a.getJSONArray("motsCles"), new String[] { "Mot / expression", "Avis", "Note moy.", "Ton" },
                new String[] { "mot", "nombre", "moyenne", "ton" }, new float[] { 46, 18, 18, 18 });
        d.close();
        return out.toByteArray();
    }

    private static String join(JSONArray a) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < a.length(); i++) {
            b.append(i == 0 ? "" : ", ").append(a.getString(i));
        }
        return b.toString();
    }

    private static String puces(JSONArray a) {
        if (a.length() == 0) {
            return "—";
        }
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < a.length(); i++) {
            b.append("\n• ").append(a.getString(i));
        }
        return b.toString();
    }

    private static void tuile(PdfPTable t, String valeur, String libelle, Font fv, Font fl) {
        PdfPCell c = new PdfPCell();
        c.setPadding(8);
        c.setBorderColor(new BaseColor(223, 229, 234));
        c.addElement(new Paragraph(valeur, fv));
        c.addElement(new Paragraph(libelle, fl));
        t.addCell(c);
    }

    private static void titre(Document d, String t) throws DocumentException {
        Paragraph p = new Paragraph(t, police(11.5f, Font.BOLD, VERT));
        p.setSpacingBefore(12);
        p.setSpacingAfter(5);
        d.add(p);
    }

    private static void tableau(Document d, JSONArray l, String[] entetes, String[] cles, float[] largeurs)
            throws DocumentException {
        PdfPTable t = new PdfPTable(largeurs);
        t.setWidthPercentage(100);
        Font fe = police(8.5f, Font.BOLD, BaseColor.WHITE), f = police(8.5f, Font.NORMAL, BaseColor.BLACK);
        for (String h : entetes) {
            t.addCell(cellule(h, fe, VERT, Element.ALIGN_LEFT));
        }
        for (int i = 0; i < l.length(); i++) {
            JSONObject o = l.getJSONObject(i);
            for (int j = 0; j < cles.length; j++) {
                Object v = o.opt(cles[j]);
                t.addCell(cellule(v == null || v == JSONObject.NULL ? "—" : String.valueOf(v), f, null,
                        j == 0 ? Element.ALIGN_LEFT : Element.ALIGN_CENTER));
            }
        }
        if (l.length() == 0) {
            PdfPCell v = cellule("—", f, null, Element.ALIGN_CENTER);
            v.setColspan(cles.length);
            t.addCell(v);
        }
        d.add(t);
        d.add(new Chunk(" "));
    }
}
