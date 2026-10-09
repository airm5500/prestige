package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.ColumnText;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rest.service.impl.RapprochementBL.Piece;
import rest.service.impl.RapprochementBL.Resultat;

/**
 * Releve grossiste en PDF (format du 09/10 : Type | Numero BL / Seq client | Date BL | Montant HT) et rapprochement.
 */
class ReleveGrossisteTest {

    private static final String[][] RELEVE = { { "BL", "BKE 754695 / 48", "25/09/26", "12 491" },
            { "BL", "BKE 755523 / 49", "28/09/26", "65 343" }, { "AV/BL", "GNA 793187 1 / 57", "15/09/26", "-20 323" },
            { "BL", "GNA 803308 / 58", "24/09/26", "15 759" }, { "AV/BL", "VRI 683562 1 / 399", "14/09/26", "-730" },
            { "AV/BL", "VRI 683562 2 / 403", "17/09/26", "-45 610" },
            { "BL", "VRI 684842 / 395", "13/09/26", "1 471 576" },
            { "AV/BL", "VRI 684842 1 / 402", "17/09/26", "-562 561" },
            { "AV/BL", "YOP 36074 2 / 1009", "12/09/26", "-6 934" },
            { "BL", "YOP 80157 / 1028", "23/09/26", "6 731" } };

    private static byte[] pdf() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4);
        PdfWriter w = PdfWriter.getInstance(d, out);
        d.open();
        PdfPTable t = new PdfPTable(new float[] { 1, 3, 2, 2 });
        for (String h : new String[] { "Type", "Numéro BL / Séq client", "Date BL", "Montant HT" }) {
            t.addCell(new Phrase(h));
        }
        for (String[] r : RELEVE) {
            for (int i = 0; i < 4; i++) {
                PdfPCell c = new PdfPCell(new Phrase(r[i]));
                c.setBorder(0);
                c.setHorizontalAlignment(i == 3 ? Element.ALIGN_RIGHT : Element.ALIGN_CENTER);
                t.addCell(c);
            }
        }
        d.add(t);
        ColumnText.showTextAligned(w.getDirectContentUnder(), Element.ALIGN_CENTER,
                new Phrase("DUPLICATA", new Font(Font.FontFamily.HELVETICA, 90, Font.BOLD, BaseColor.LIGHT_GRAY)), 300,
                400, 55);
        d.close();
        return out.toByteArray();
    }

    @Test
    void lectureDuPdf() throws Exception {
        List<ReleveGrossiste.Ligne> l = ReleveGrossiste.lire(ReleveGrossistePdf.texte(new ByteArrayInputStream(pdf())));
        assertEquals(10, l.size());
        ReleveGrossiste.Ligne av = l.get(5);
        assertEquals(ReleveGrossiste.Type.AVOIR, av.type);
        assertEquals("683562", av.numeroBl);
        assertEquals("2", av.indiceAvoir);
        assertEquals("403", av.sequence);
        assertEquals(-45610, av.montantHt);
        assertEquals(LocalDate.of(2026, 9, 17), av.date);
        assertEquals(1471576, l.get(6).montantHt);
        assertEquals("VRI", l.get(6).agence);
    }

    @Test
    void lignesTexte() {
        assertEquals(17514, ReleveGrossiste.lire("BL  YOP 61734 / 1010   13/09/2026   17.514").get(0).montantHt);
        assertTrue(ReleveGrossiste.lire("Type Numero BL / Seq client Date BL Montant HT\nTotal 2 345 678\nDUPLICATA")
                .isEmpty());
        assertTrue(ReleveGrossiste.lire(null).isEmpty());
        assertTrue(ReleveGrossiste.lire("BL ABC 123456 / 4 31/02/26 100").isEmpty()); // date impossible
    }

    @Test
    void rapprochement() throws Exception {
        List<ReleveGrossiste.Ligne> l = ReleveGrossiste.lire(ReleveGrossistePdf.texte(new ByteArrayInputStream(pdf())));
        List<Piece> p = new ArrayList<>();
        p.add(new Piece("p1", false, "754695", null, null, LocalDate.of(2026, 9, 25), 12491));
        p.add(new Piece("p2", false, "BKE-755523", null, "49", LocalDate.of(2026, 9, 28), 65000));
        p.add(new Piece("p3", false, "684842", null, null, LocalDate.of(2026, 9, 13), 1471576));
        p.add(new Piece("a1", true, "684842", null, null, LocalDate.of(2026, 9, 17), 562561));
        p.add(new Piece("a2", true, "683562", "VRI 6835622", null, LocalDate.of(2026, 9, 17), 45610));
        p.add(new Piece("p9", false, "999999", null, null, LocalDate.of(2026, 9, 20), 5000));
        Map<String, String> st = new HashMap<>();
        for (Resultat x : RapprochementBL.rapprocher(l, p, 1)) {
            st.put(x.releve != null ? x.releve.numero : "P:" + x.piece.id,
                    x.statut + (x.piece != null ? ":" + x.piece.id : "") + ":" + x.ecart);
        }
        assertEquals("RAPPROCHE:p1:0", st.get("BKE 754695"));
        assertEquals("ECART:p2:343", st.get("BKE 755523"));
        assertEquals("RAPPROCHE:a1:0", st.get("VRI 684842 1"));
        assertEquals("RAPPROCHE:a2:0", st.get("VRI 683562 2"));
        assertEquals("ABSENT_PRESTIGE:0", st.get("VRI 683562 1"));
        assertEquals("ABSENT_PRESTIGE:0", st.get("YOP 80157"));
        assertEquals("ABSENT_RELEVE:p9:0", st.get("P:p9"));
        long[] t = RapprochementBL.totaux(l, p);
        assertEquals(1571900, t[0]);
        assertEquals(-636158, t[1]);
        assertEquals(1554067, t[2]);
        assertEquals(-608171, t[3]);
    }

    @Test
    void numeroDuBl() {
        assertEquals("754695", RapprochementBL.numero("BKE-754695"));
        assertEquals("754695", RapprochementBL.numero("BL 0754695 / 12"));
        assertEquals("", RapprochementBL.numero(null));
    }
}
