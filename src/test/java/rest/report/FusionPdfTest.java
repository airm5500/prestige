package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfWriter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * L'edition d'une facture laissait TROIS fichiers dans le dossier des editions : le recapitulatif seul, la facture
 * seule, et les deux assembles. Seul le troisieme part au navigateur ; les deux autres s'accumulaient a chaque
 * impression.
 */
class FusionPdfTest {

    /** Un PDF minimal mais valide, de <code>pages</code> pages. */
    private static Path pdf(Path racine, String nom, int pages) throws Exception {
        Path chemin = racine.resolve(nom);
        Document document = new Document();
        try (OutputStream sortie = new FileOutputStream(chemin.toFile())) {
            PdfWriter.getInstance(document, sortie);
            document.open();
            for (int i = 0; i < pages; i++) {
                document.add(new Paragraph("page " + (i + 1) + " de " + nom));
                if (i + 1 < pages) {
                    document.newPage();
                }
            }
            document.close();
        }
        return chemin;
    }

    private static int pages(Path pdf) throws Exception {
        PdfReader lecteur = new PdfReader(pdf.toString());
        try {
            return lecteur.getNumberOfPages();
        } finally {
            lecteur.close();
        }
    }

    @Test
    @DisplayName("Les morceaux sont assembles dans l'ordre et le fichier final les contient tous")
    void assembleDansLOrdre(@TempDir Path racine) throws Exception {
        Path recap = pdf(racine, "recap.pdf", 1);
        Path facture = pdf(racine, "facture.pdf", 3);
        Path finale = racine.resolve("Facture_ASCOMA.pdf");

        FusionPdf.assembler(Arrays.asList(recap.toString(), facture.toString()), finale.toString());

        assertTrue(Files.exists(finale), "le document final doit exister");
        assertEquals(4, pages(finale), "le final porte le recapitulatif puis la facture");
    }

    @Test
    @DisplayName("Les fichiers de travail sont effaces : il ne reste que le document final")
    void neLaissePasDeFichiersDeTravail(@TempDir Path racine) throws Exception {
        Path recap = pdf(racine, "recap.pdf", 1);
        Path facture = pdf(racine, "facture.pdf", 2);
        Path finale = racine.resolve("Facture_ASCOMA.pdf");

        FusionPdf.assembler(Arrays.asList(recap.toString(), facture.toString()), finale.toString());

        assertFalse(Files.exists(recap), "le recapitulatif seul n'a plus lieu d'etre");
        assertFalse(Files.exists(facture), "la facture seule n'a plus lieu d'etre");
        try (java.util.stream.Stream<Path> restants = Files.list(racine)) {
            assertEquals(1, restants.count(), "un seul document doit subsister");
        }
    }

    @Test
    @DisplayName("Un seul morceau : le document final est produit, le morceau est efface")
    void unSeulMorceau(@TempDir Path racine) throws Exception {
        Path facture = pdf(racine, "facture.pdf", 2);
        Path finale = racine.resolve("Facture_MUGEFCI.pdf");

        FusionPdf.assembler(new ArrayList<>(Arrays.asList(facture.toString())), finale.toString());

        assertEquals(2, pages(finale));
        assertFalse(Files.exists(facture));
    }

    @Test
    @DisplayName("Aucun morceau : on le dit, plutot que de livrer un PDF vide")
    void aucunMorceau(@TempDir Path racine) {
        List<String> rien = new ArrayList<>();
        assertThrows(IllegalArgumentException.class,
                () -> FusionPdf.assembler(rien, racine.resolve("vide.pdf").toString()));
    }

    @Test
    @DisplayName("Si l'assemblage echoue, les morceaux sont conserves")
    void echecConserveLesMorceaux(@TempDir Path racine) throws Exception {
        Path bon = pdf(racine, "facture.pdf", 1);
        Path abime = racine.resolve("abime.pdf");
        Files.write(abime, "ceci n'est pas un PDF".getBytes(java.nio.charset.StandardCharsets.UTF_8));

        assertThrows(Exception.class, () -> FusionPdf.assembler(Arrays.asList(bon.toString(), abime.toString()),
                racine.resolve("final.pdf").toString()));

        assertTrue(Files.exists(bon), "en cas d'echec, les morceaux restent : c'est la seule trace");
        assertTrue(Files.exists(abime));
    }
}
