package rest.report.excel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.AbstractList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;

/**
 * Rapport du centre de support du 26/10, § 21, L24 : l'export Excel du fichier journal sur une longue periode a epuise
 * la memoire du serveur (OutOfMemoryError le 30/10, tas de 4 Go), apres 24 s passees a ajuster la largeur des colonnes.
 * Le classeur etait construit entierement en memoire. Un gros export doit tenir dans un petit tas.
 */
class ClasseurExcelVolumeTest {

    private static final class Trace {
        final int n;

        Trace(int n) {
            this.n = n;
        }
    }

    /** Lignes produites a la demande : seule la construction du classeur occupe la memoire. */
    private static List<Trace> lignes(int nombre) {
        return new AbstractList<Trace>() {
            @Override
            public Trace get(int i) {
                return new Trace(i);
            }

            @Override
            public int size() {
                return nombre;
            }
        };
    }

    @Test
    void unGrosExportTientDansUnPetitTas() throws Exception {
        // environ cinq fois ce que le tas permettrait en memoire (plusieurs centaines d'octets par cellule)
        int nombre = (int) Math.min(400_000, Runtime.getRuntime().maxMemory() / 400);
        LocalDateTime t0 = LocalDateTime.of(2026, 1, 1, 8, 0);
        byte[] fichier = new ClasseurExcel<Trace>("Fichier journal").titre("FICHIER JOURNAL")
                .critere("Période", "01/01/2025 au 31/10/2026").dateHeure("Date", t -> t0.plusMinutes(t.n))
                .texte("Opérateur", t -> "Opérateur " + (t.n % 40)).texte("Type", t -> "Modification de prix")
                .texte("Description",
                        t -> "Ligne de journal numéro " + t.n
                                + " : modification de la fiche article, ancien et nouveau prix, poste de caisse")
                .nombre("Montant", t -> t.n * 25).texte("Poste", t -> "CAISSE" + (t.n % 7)).construire(lignes(nombre));

        int lignesEcrites = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(fichier))) {
            for (ZipEntry e = zip.getNextEntry(); e != null; e = zip.getNextEntry()) {
                if (e.getName().startsWith("xl/worksheets/sheet")) {
                    lignesEcrites = compterLignes(zip);
                }
            }
        }
        // titre, critere, ligne vide non ecrite, en-tete, puis les lignes
        assertEquals(nombre + 3, lignesEcrites, "toutes les lignes sont dans le fichier");
        assertTrue(fichier.length > 0);
    }

    /** Compte les balises <row du XML de la feuille, lu par morceaux. */
    private static int compterLignes(InputStream in) throws Exception {
        byte[] tampon = new byte[1 << 16];
        String reste = "";
        int lignes = 0;
        for (int lu = in.read(tampon); lu > 0; lu = in.read(tampon)) {
            String morceau = reste + new String(tampon, 0, lu, StandardCharsets.ISO_8859_1);
            for (int i = morceau.indexOf("<row "); i >= 0; i = morceau.indexOf("<row ", i + 1)) {
                lignes++;
            }
            reste = morceau.substring(Math.max(0, morceau.length() - 4));
        }
        return lignes;
    }
}
