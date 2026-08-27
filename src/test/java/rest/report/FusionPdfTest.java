package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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

    /**
     * Nombre de pages, lu SANS ouvrir le fichier.
     *
     * PdfReader construit a partir d'un nom de fichier garde le descripteur ouvert meme apres close() : sous Windows,
     * le fichier devient alors impossible a supprimer et JUnit echoue en nettoyant son dossier temporaire ("Le
     * processus ne peut pas acceder au fichier car ce fichier est utilise par un autre processus"). Sous Linux
     * l'incident ne se voit pas, un fichier ouvert pouvant etre efface. On lit donc les octets et on les passe au
     * lecteur : plus aucun descripteur n'est en jeu, sur aucun systeme.
     */
    private static int pages(Path pdf) throws Exception {
        PdfReader lecteur = new PdfReader(Files.readAllBytes(pdf));
        try {
            return lecteur.getNumberOfPages();
        } finally {
            lecteur.close();
        }
    }

    /**
     * Verifie qu'AUCUN fichier du dossier n'est reste ouvert.
     *
     * Un descripteur oublie ne se voit pas sous Linux - on peut y effacer un fichier ouvert - mais rend le fichier
     * indestructible sous Windows, ou tourne l'officine. Le poste de developpement lisait donc vert pendant que le
     * poste client echouait. Ce controle rend le defaut visible des ici, en lisant les descripteurs du processus.
     */
    private static void aucunFichierOuvert(Path racine) throws Exception {
        if (!Files.isDirectory(Paths.get("/proc/self"))) {
            return; // systeme sans /proc : le controle ne s'applique pas
        }
        List<String> retenus = new ArrayList<>();

        // 1. descripteurs ouverts : un flux qu'on a oublie de refermer
        try (java.util.stream.Stream<Path> fd = Files.list(Paths.get("/proc/self/fd"))) {
            for (Path lien : fd.collect(java.util.stream.Collectors.toList())) {
                try {
                    Path cible = Files.readSymbolicLink(lien);
                    if (cible.startsWith(racine)) {
                        retenus.add("descripteur ouvert : " + cible);
                    }
                } catch (Exception ignore) {
                    // descripteur disparu entre-temps : sans importance
                }
            }
        }

        // 2. projections en memoire : PdfReader construit sur un NOM DE FICHIER projette le
        // fichier (mapping). Cela ne se voit dans aucun descripteur, et Windows refuse alors
        // d'effacer le fichier tant que la projection n'est pas liberee - ce que close() ne
        // fait pas. C'est precisement l'echec constate sur le poste de l'officine.
        for (String ligne : Files.readAllLines(Paths.get("/proc/self/maps"),
                java.nio.charset.StandardCharsets.ISO_8859_1)) {
            int espace = ligne.lastIndexOf(' ');
            if (espace < 0) {
                continue;
            }
            String chemin = ligne.substring(espace + 1).trim();
            if (!chemin.isEmpty() && chemin.startsWith(racine.toString())) {
                retenus.add("fichier projete en memoire : " + chemin);
            }
        }

        assertTrue(retenus.isEmpty(),
                "fichier(s) encore retenus, donc impossibles a effacer sous Windows : " + retenus);
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
        aucunFichierOuvert(racine);
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
        aucunFichierOuvert(racine);
    }

    @Test
    @DisplayName("Un seul morceau : le document final est produit, le morceau est efface")
    void unSeulMorceau(@TempDir Path racine) throws Exception {
        Path facture = pdf(racine, "facture.pdf", 2);
        Path finale = racine.resolve("Facture_MUGEFCI.pdf");

        FusionPdf.assembler(new ArrayList<>(Arrays.asList(facture.toString())), finale.toString());

        assertEquals(2, pages(finale));
        assertFalse(Files.exists(facture));
        aucunFichierOuvert(racine);
    }

    @Test
    @DisplayName("Aucun morceau : on le dit, plutot que de livrer un PDF vide")
    void aucunMorceau(@TempDir Path racine) {
        List<String> rien = new ArrayList<>();
        assertThrows(IllegalArgumentException.class,
                () -> FusionPdf.assembler(rien, racine.resolve("vide.pdf").toString()));
    }

    @Test
    @DisplayName("Un etat qui n'a rien produit est NOMME, au lieu d'un « fichier introuvable »")
    void ditQuelEtatManque(@TempDir Path racine) throws Exception {
        Path recap = pdf(racine, "recap.pdf", 1);
        String absent = racine.resolve("rp_facture_7544.pdf").toString();

        Exception echec = assertThrows(Exception.class, () -> FusionPdf
                .assembler(Arrays.asList(recap.toString(), absent), racine.resolve("final.pdf").toString()));

        assertTrue(echec.getMessage().contains("rp_facture_7544.pdf"),
                "le message doit nommer l'etat qui n'a rien produit, sinon le support cherche a l'aveugle");
        assertTrue(echec.getMessage().contains("journal"), "il doit dire ou trouver la cause exacte");
        assertTrue(Files.exists(recap), "rien n'est efface tant que l'assemblage n'a pas abouti");
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
