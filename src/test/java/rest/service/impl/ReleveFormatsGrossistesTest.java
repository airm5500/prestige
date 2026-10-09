package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
import java.io.File;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rest.service.impl.ReleveModele.Champ;
import rest.service.impl.ReleveModele.Colonne;
import rest.service.impl.ReleveModele.LigneBrute;

/**
 * Releves de grossistes presentes chacun a sa maniere (exemples du 09/10) : colonnes proposees automatiquement et
 * operations lues. Les PDF sont reconstruits ici (memes colonnes, memes ecritures de montants).
 */
class ReleveFormatsGrossistesTest {

    private static final Font PETIT = new Font(Font.FontFamily.HELVETICA, 9);

    private static PdfPTable tableau(String[] entetes, String[][] lignes, int premierMontant, String total)
            throws Exception {
        PdfPTable t = new PdfPTable(entetes.length);
        t.setWidthPercentage(100);
        if (entetes.length == 8) {
            t.setWidths(new float[] { 1, 2.2f, 1.4f, 1.2f, 1.4f, 1.2f, 1.2f, 1.1f });
        }
        for (String h : entetes) {
            PdfPCell c = new PdfPCell(new Phrase(h, PETIT));
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setVerticalAlignment(Element.ALIGN_MIDDLE);
            t.addCell(c);
        }
        for (String[] r : lignes) {
            for (int i = 0; i < r.length; i++) {
                PdfPCell c = new PdfPCell(new Phrase(r[i], PETIT));
                c.setBorder(0);
                c.setHorizontalAlignment(i >= premierMontant ? Element.ALIGN_RIGHT
                        : i == 0 || i == premierMontant - 1 ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
                t.addCell(c);
            }
        }
        if (total != null) {
            PdfPCell c = new PdfPCell(new Phrase(total));
            c.setColspan(entetes.length);
            t.addCell(c);
        }
        return t;
    }

    /** DPCI : sections Factures / Avoirs, milliers avec « . », avoirs suffixes « - », en-tetes sur deux lignes. */
    static byte[] dpci() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4);
        PdfWriter.getInstance(d, out);
        d.open();
        d.add(new Paragraph(
                "RELEVE   100002026092-00405      du 14/09/2026 au 30/09/2026      N° Client   10000      Page 1"));
        String[] ent = { "Date", "Référence facture", "Montant TTC", "Montant\nTVA", "Montant Net\nHT",
                "Remise sur\nfacture", "Brut HT", "Echéance\ndifférée" };
        d.add(new Paragraph("Factures D.P.C.I. REPARTITION          Echéance principale au 14/10/2026"));
        d.add(tableau(ent,
                new String[][] { { "14/09/26", "FAC R11398400", "24.813", "3.785", "21.028", "", "21.028", "" },
                        { "14/09/26", "FAC R20262786", "42.537", "6.489", "36.048", "", "36.048", "" },
                        { "16/09/26", "FAC R30254405", "68.435", "", "68.435", "", "68.435", "" },
                        { "16/09/26", "FAC R30254348", "562.251", "70.501", "491.750", "", "491.750", "" },
                        { "30/09/26", "FAC R30256365", "107.556", "810", "106.746", "", "106.746", "" } },
                2, "Total Factures   805.592"));
        d.add(new Paragraph("Avoirs D.P.C.I. REPARTITION          Echéance principale au 14/10/2026"));
        d.add(tableau(ent,
                new String[][] { { "14/09/26", "AVO R11398365", "328.071-", "47.775-", "280.296-", "", "280.296-", "" },
                        { "18/09/26", "AVO R30254742", "68.435-", "", "68.435-", "", "68.435-", "" } },
                2, "Total Avoirs   396.506-"));
        d.close();
        return out.toByteArray();
    }

    /** Releve « listing » : police a chasse fixe, filets « | » ecrits en texte, colonne Sequence, montants bruts. */
    static byte[] listing() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(d, out);
        d.open();
        Font f = new Font(Font.FontFamily.COURIER, 9);
        d.add(new Paragraph("                         RELEVE DE FACTURES N° 00-22390 du 30/09/2026", f));
        d.add(new Paragraph(" ", f));
        d.add(new Paragraph(
                "|  N° de Facture  | Séquence | Date facture |  Date due  |    Montant  |      Pointage      |", f));
        String[][] l = { { "20-350112-00", "100", "14/09/2026", "11255" },
                { "20-363630-00", "101", "18/09/2026", "11255" }, { "10-284600-00", "357", "14/09/2026", "5275" },
                { "10-297902-00", "374", "30/09/2026", "118600" } };
        for (String[] r : l) {
            d.add(new Paragraph(String.format("|  %-14s |   %4s   |  %10s  |            | %11s |                    |",
                    r[0], r[1], r[2], r[3]), f));
        }
        d.close();
        return out.toByteArray();
    }

    /** BL avec HT brut, ristourne, HT net, TVA et TTC ; N° BL suffixe de l'agence. */
    static byte[] htNetTtc() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(d, out);
        d.open();
        d.add(tableau(new String[] { "Type", "N° BL", "Date", "HT Brut", "Ristourne", "HT Net", "TVA", "Montant TTC" },
                new String[][] { { "BL", "2616748427-GNA", "16/06/2026", "61 212", "0", "61 212", "11 018", "72 230" },
                        { "BL", "2616748764-GNA", "16/06/2026", "20 523", "0", "20 523", "0", "20 523" },
                        { "BL", "2617443924-VRI", "23/06/2026", "32 700", "0", "32 700", "5 886", "38 586" },
                        { "BL", "2618058293-GNA", "29/06/2026", "257 616", "1 000", "256 616", "23 185", "280 801" } },
                3, "Nbre de lignes :  4        TOTAL BL :   372 051"));
        d.close();
        return out.toByteArray();
    }

    private static List<ReleveGrossiste.Ligne> lire(byte[] pdf, Map<Champ, Integer> attendu) throws Exception {
        List<LigneBrute> l = ReleveModeleTest.lignes(pdf);
        List<Colonne> cols = ReleveModele.colonnes(l);
        Map<Champ, Integer> p = ReleveModele.deviner(l, cols);
        assertEquals(attendu, p, "colonnes proposées");
        return ReleveModele.lire(l, ReleveModele.modele(p, cols, null));
    }

    @Test
    void dpciFacturesEtAvoirs() throws Exception {
        List<ReleveGrossiste.Ligne> r = lire(dpci(), Map.of(Champ.DATE, 0, Champ.NUMERO, 1, Champ.MONTANT, 4));
        assertEquals(7, r.size(), "5 factures + 2 avoirs, titres et totaux ignorés");
        assertEquals("11398400", r.get(0).numeroBl);
        assertEquals(LocalDate.of(2026, 9, 14), r.get(0).date);
        assertEquals(21028L, r.get(0).montantHt);
        assertEquals(491750L, r.get(3).montantHt);
        assertEquals(ReleveGrossiste.Type.AVOIR, r.get(5).type);
        assertEquals("11398365", r.get(5).numeroBl);
        assertEquals(-280296L, r.get(5).montantHt);
        assertEquals(-68435L, r.get(6).montantHt);
    }

    @Test
    void listingAvecSequence() throws Exception {
        List<ReleveGrossiste.Ligne> r = lire(listing(),
                Map.of(Champ.NUMERO, 0, Champ.SEQUENCE, 1, Champ.DATE, 2, Champ.MONTANT, 3));
        assertEquals(4, r.size());
        assertEquals("350112", r.get(0).numeroBl);
        assertEquals("100", r.get(0).sequence);
        assertEquals(11255L, r.get(0).montantHt);
        assertEquals(118600L, r.get(3).montantHt);
        assertEquals(LocalDate.of(2026, 9, 30), r.get(3).date);
    }

    @Test
    void htNetRetenuPlutotQueTtc() throws Exception {
        List<ReleveGrossiste.Ligne> r = lire(htNetTtc(),
                Map.of(Champ.TYPE, 0, Champ.NUMERO, 1, Champ.DATE, 2, Champ.MONTANT, 5));
        assertEquals(4, r.size(), "ligne de total ignorée");
        assertEquals("2616748427", r.get(0).numeroBl);
        assertEquals(61212L, r.get(0).montantHt);
        assertEquals(256616L, r.get(3).montantHt);
    }

    /** Fixtures des tests de bout en bout (ecran) : regenerees a la demande. */
    public static void main(String[] args) throws Exception {
        File dir = new File(args[0]);
        Files.write(new File(dir, "releve-e2e-modele-dpci.pdf").toPath(), dpci());
        Files.write(new File(dir, "releve-e2e-modele-listing.pdf").toPath(), listing());
    }
}
