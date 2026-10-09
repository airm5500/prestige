package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.ColumnText;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rest.service.impl.ReleveModele.Champ;
import rest.service.impl.ReleveModele.Colonne;
import rest.service.impl.ReleveModele.LigneBrute;
import rest.service.impl.ReleveModele.Modele;

/**
 * Releve d'un grossiste presente autrement (Date | Piece | N° | Ref. client | Debit | Credit | Solde, dates jj.mm.aaaa,
 * montants avec decimales) : colonnes reconnues, proposition automatique, modele memorise et reapplique.
 */
class ReleveModeleTest {

    static final String[] ENTETES = { "Date", "Pièce", "N° document", "Réf. client", "Débit", "Crédit", "Solde" };

    static final String[][] AUTRE = { { "25.09.2026", "FACT", "754695", "48", "12 491,00", "", "12 491,00" },
            { "28.09.2026", "FACT", "755523", "49", "65 343,00", "", "77 834,00" },
            { "29.09.2026", "AVOIR", "793187-1", "57", "", "20 323,00", "57 511,00" },
            { "30.09.2026", "FACT", "803308", "58", "1 471 576,40", "", "1 529 087,40" } };

    /** meme presentation, autre mois, montants plus longs ou plus courts */
    static final String[][] AUTRE_MOIS = { { "02.10.2026", "FACT", "810001", "60", "730,00", "", "730,00" },
            { "03.10.2026", "AVOIR", "810001-1", "61", "", "125 000,00", "-124 270,00" },
            { "05.10.2026", "FACT", "810777", "62", "9 999 999,00", "", "9 875 729,00" } };

    static byte[] pdf(String[] entetes, String[][] lignes, boolean decor) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4.rotate());
        PdfWriter w = PdfWriter.getInstance(d, out);
        d.open();
        if (decor) {
            d.add(new Paragraph("GROSSISTE EXEMPLE - Relevé de compte client n° 41100235"));
            d.add(new Paragraph("Période du 01/09/2026 au 30/09/2026"));
        }
        PdfPTable t = new PdfPTable(entetes.length);
        t.setWidthPercentage(100);
        for (String h : entetes) {
            t.addCell(new Phrase(h));
        }
        for (String[] r : lignes) {
            for (int i = 0; i < r.length; i++) {
                PdfPCell c = new PdfPCell(new Phrase(r[i]));
                c.setBorder(0);
                c.setHorizontalAlignment(i >= 4 ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                t.addCell(c);
            }
        }
        if (decor) {
            PdfPCell total = new PdfPCell(new Phrase("Total période 30.09.2026"));
            total.setColspan(4);
            t.addCell(total);
            for (String v : new String[] { "1 549 410,40", "20 323,00", "1 529 087,40" }) {
                t.addCell(new Phrase(v));
            }
        }
        d.add(t);
        if (decor) {
            ColumnText.showTextAligned(w.getDirectContentUnder(), Element.ALIGN_CENTER,
                    new Phrase("DUPLICATA", new Font(Font.FontFamily.HELVETICA, 90, Font.BOLD, BaseColor.LIGHT_GRAY)),
                    420, 300, 35);
        }
        d.close();
        return out.toByteArray();
    }

    static List<LigneBrute> lignes(byte[] pdf) throws Exception {
        return ReleveGrossistePdf.lignes(new ByteArrayInputStream(pdf));
    }

    @Test
    void montants() {
        assertEquals(12491L, ReleveModele.montant("12 491"));
        assertEquals(12491L, ReleveModele.montant("12 491,00"));
        assertEquals(12491L, ReleveModele.montant("12.491"));
        assertEquals(1471576L, ReleveModele.montant("1.471.576,40"));
        assertEquals(125L, ReleveModele.montant("124,50"));
        assertEquals(-20323L, ReleveModele.montant("-20 323"));
        assertEquals(-20323L, ReleveModele.montant("- 20 323"));
        assertEquals(-20323L, ReleveModele.montant("20 323-"));
        assertEquals(-20323L, ReleveModele.montant("(20 323)"));
        assertEquals(1234567L, ReleveModele.montant("1'234'567"));
        assertNull(ReleveModele.montant("(20 323"));
        assertNull(ReleveModele.montant("BKE 754695"));
        assertNull(ReleveModele.montant(""));
        assertNull(ReleveModele.montant("25/09/26"));
    }

    @Test
    void dates() {
        assertEquals(LocalDate.of(2026, 9, 25), ReleveModele.date("25.09.2026"));
        assertEquals(LocalDate.of(2026, 9, 25), ReleveModele.date("25/09/26"));
        assertEquals(LocalDate.of(2026, 9, 5), ReleveModele.date("5-9-2026"));
        assertNull(ReleveModele.date("31/02/2026"));
        assertNull(ReleveModele.date("FACT"));
    }

    @Test
    void colonnesReconnuesEtPropositionAutomatique() throws Exception {
        List<LigneBrute> l = lignes(pdf(ENTETES, AUTRE, true));
        List<Colonne> cols = ReleveModele.colonnes(l);
        assertEquals(7, cols.size(), "7 colonnes");
        LigneBrute premiere = l.stream().filter(x -> x.cellules.stream().anyMatch(c -> c.texte.equals("754695")))
                .findFirst().get();
        String[] v = ReleveModele.ranger(premiere, cols);
        assertEquals("25.09.2026", v[0]);
        assertEquals("FACT", v[1]);
        assertEquals("754695", v[2]);
        assertEquals("48", v[3]);
        assertEquals("12 491,00", v[4]);
        assertEquals("", v[5]);

        Map<Champ, Integer> p = ReleveModele.deviner(l, cols);
        assertEquals(0, p.get(Champ.DATE));
        assertEquals(1, p.get(Champ.TYPE));
        assertEquals(2, p.get(Champ.NUMERO));
        assertEquals(4, p.get(Champ.MONTANT_BL));
        assertEquals(5, p.get(Champ.MONTANT_AVOIR));
        assertNull(p.get(Champ.MONTANT));
    }

    @Test
    void modeleMemoriseRelitLesReleves() throws Exception {
        List<LigneBrute> l = lignes(pdf(ENTETES, AUTRE, true));
        List<Colonne> cols = ReleveModele.colonnes(l);
        Map<Champ, Integer> choix = new EnumMap<>(ReleveModele.deviner(l, cols));
        choix.put(Champ.SEQUENCE, 3);
        Modele m = ReleveModele.modele(choix, cols, "AVOIR");
        assertNull(m.incomplet());

        List<ReleveGrossiste.Ligne> r = ReleveModele.lire(l, m);
        assertEquals(4, r.size(), "en-tetes, total et filigrane ignores");
        assertEquals(ReleveGrossiste.Type.BL, r.get(0).type);
        assertEquals("754695", r.get(0).numeroBl);
        assertEquals("48", r.get(0).sequence);
        assertEquals(LocalDate.of(2026, 9, 25), r.get(0).date);
        assertEquals(12491L, r.get(0).montantHt);
        assertEquals(ReleveGrossiste.Type.AVOIR, r.get(2).type);
        assertEquals("793187", r.get(2).numeroBl);
        assertEquals(-20323L, r.get(2).montantHt);
        assertEquals(1471576L, r.get(3).montantHt);

        /* memorise (JSON), puis applique a un autre releve du meme grossiste */
        Modele relu = Modele.lire(m.json().toString());
        List<ReleveGrossiste.Ligne> r2 = ReleveModele.lire(lignes(pdf(ENTETES, AUTRE_MOIS, false)), relu);
        assertEquals(3, r2.size());
        assertEquals("810001", r2.get(0).numeroBl);
        assertEquals(730L, r2.get(0).montantHt);
        assertEquals(ReleveGrossiste.Type.AVOIR, r2.get(1).type);
        assertEquals(-125000L, r2.get(1).montantHt);
        assertEquals("61", r2.get(1).sequence);
        assertEquals(9999999L, r2.get(2).montantHt);
    }

    @Test
    void formatStandardAussiReconnu() throws Exception {
        String[][] standard = { { "BL", "BKE 754695 / 48", "25/09/26", "12 491" },
                { "AV/BL", "GNA 793187 1 / 57", "15/09/26", "-20 323" },
                { "BL", "VRI 684842 / 395", "13/09/26", "1 471 576" } };
        List<LigneBrute> l = lignes(
                pdf(new String[] { "Type", "Numéro BL / Séq client", "Date BL", "Montant HT" }, standard, false));
        List<Colonne> cols = ReleveModele.colonnes(l);
        Map<Champ, Integer> p = ReleveModele.deviner(l, cols);
        assertEquals(0, p.get(Champ.TYPE));
        assertEquals(1, p.get(Champ.NUMERO));
        assertEquals(2, p.get(Champ.DATE));
        assertEquals(3, p.get(Champ.MONTANT));
        List<ReleveGrossiste.Ligne> r = ReleveModele.lire(l, ReleveModele.modele(p, cols, null));
        assertEquals(3, r.size());
        assertEquals("BKE 754695", r.get(0).numero);
        assertEquals("48", r.get(0).sequence);
        assertEquals("GNA 793187 1", r.get(1).numero);
        assertEquals("1", r.get(1).indiceAvoir);
        assertEquals(ReleveGrossiste.Type.AVOIR, r.get(1).type);
        assertEquals(-20323L, r.get(1).montantHt);
    }

    @Test
    void modeleIncompletOuInadapte() throws Exception {
        Modele m = new Modele();
        assertNotNull(m.incomplet());
        m.positions.put(Champ.NUMERO, 100f);
        m.positions.put(Champ.DATE, 50f);
        assertTrue(m.incomplet().contains("montant"));
        m.positions.put(Champ.MONTANT, 400f);
        assertNull(m.incomplet());
        /* positions tres eloignees de toute colonne : rien n'est lu (l'ecran propose alors la reconnaissance) */
        Modele loin = new Modele();
        loin.positions.put(Champ.NUMERO, 5000f);
        loin.positions.put(Champ.DATE, 6000f);
        loin.positions.put(Champ.MONTANT, 7000f);
        assertTrue(ReleveModele.lire(lignes(pdf(ENTETES, AUTRE, true)), loin).isEmpty());
    }
}
