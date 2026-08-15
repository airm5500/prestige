package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.util.JRLoader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Chargement d'un etat Jasper.
 *
 * Incident constate a l'impression du releve des factures clients : "Error loading object from InputStream / Caused by:
 * java.io.InvalidClassException: JRBaseReport; incompatible types for field columnCount". Un .jasper est un objet Java
 * SERIALISE : il n'est relisible que par la version de JasperReports qui l'a produit. Le code ne rattrapait que le
 * fichier ABSENT, pas le fichier illisible, alors que le .jrxml a cote suffisait a reproduire l'etat.
 *
 * Ces tests reproduisent le fichier illisible et verifient que l'impression aboutit quand meme.
 */
class ChargementEtatJasperTest {

    /** Etat minimal mais valide : un titre et rien d'autre. */
    private static final String JRXML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
            + "<jasperReport xmlns=\"http://jasperreports.sourceforge.net/jasperreports\""
            + " name=\"rp_releve_facture\" pageWidth=\"595\" pageHeight=\"842\" columnWidth=\"555\""
            + " leftMargin=\"20\" rightMargin=\"20\" topMargin=\"20\" bottomMargin=\"20\">\n"
            + "  <title><band height=\"20\">\n"
            + "    <staticText><reportElement x=\"0\" y=\"0\" width=\"200\" height=\"20\"/>\n"
            + "    <text><![CDATA[Releve des factures]]></text></staticText>\n" + "  </band></title>\n"
            + "</jasperReport>\n";

    private static String dossier(Path racine) {
        return racine.toString() + File.separator;
    }

    private static void ecrireJrxml(Path racine, String nom) throws IOException {
        Files.write(racine.resolve(nom + ".jrxml"), JRXML.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Reproduit un .jasper produit par une AUTRE version de JasperReports : un flux d'objet Java serialise valide en
     * apparence, mais que la version courante ne sait pas relire. Un contenu quelconque suffit a obtenir l'echec de
     * deserialisation constate en production.
     */
    private static void ecrireJasperIllisible(Path racine, String nom) throws IOException {
        Files.write(racine.resolve(nom + ".jasper"),
                new byte[] { (byte) 0xAC, (byte) 0xED, 0x00, 0x05, 0x73, 0x72, 0x00, 0x04, 'v', 'i', 'e', 'i' });
    }

    @Test
    @DisplayName("Un .jasper illisible ne fait plus echouer l'impression : l'etat est recompile")
    void jasperIllisibleRecompile(@TempDir Path racine) throws Exception {
        ecrireJrxml(racine, "rp_releve_facture");
        ecrireJasperIllisible(racine, "rp_releve_facture");

        // le fichier en place est bien illisible : c'est l'echec de production
        try (InputStream flux = new FileInputStream(racine.resolve("rp_releve_facture.jasper").toFile())) {
            assertThrows(Exception.class, () -> JRLoader.loadObject(flux),
                    "le .jasper de depart doit etre illisible, sinon le test ne prouve rien");
        }

        JasperReport etat = new ReportUtil().getReport("rp_releve_facture", dossier(racine));

        assertNotNull(etat, "l'etat doit etre produit malgre le .jasper illisible");
        assertEquals("rp_releve_facture", etat.getName());
    }

    @Test
    @DisplayName("Le .jasper est reecrit : l'incident ne se reproduit pas a l'impression suivante")
    void jasperReecrit(@TempDir Path racine) throws Exception {
        ecrireJrxml(racine, "rp_releve_facture");
        ecrireJasperIllisible(racine, "rp_releve_facture");

        new ReportUtil().getReport("rp_releve_facture", dossier(racine));

        // deuxieme impression : le fichier repare se relit directement
        try (InputStream flux = new FileInputStream(racine.resolve("rp_releve_facture.jasper").toFile())) {
            assertNotNull(JRLoader.loadObject(flux));
        }
    }

    @Test
    @DisplayName("Sans .jasper du tout, l'etat est compile depuis le .jrxml (comportement d'origine)")
    void sansJasper(@TempDir Path racine) throws Exception {
        ecrireJrxml(racine, "rp_releve_facture");

        assertNotNull(new ReportUtil().getReport("rp_releve_facture", dossier(racine)));
        assertTrue(Files.exists(racine.resolve("rp_releve_facture.jasper")));
    }

    @Test
    @DisplayName("Aucun fichier exploitable : l'erreur remonte, elle n'est pas masquee")
    void aucunFichier(@TempDir Path racine) {
        assertThrows(Exception.class, () -> new ReportUtil().getReport("etat_inexistant", dossier(racine)));
    }

    @Test
    @DisplayName("Aucun fichier temporaire ne subsiste apres compilation")
    void pasDeFichierTemporaire(@TempDir Path racine) throws Exception {
        ecrireJrxml(racine, "rp_releve_facture");
        new ReportUtil().getReport("rp_releve_facture", dossier(racine));

        try (java.util.stream.Stream<Path> fichiers = Files.list(racine)) {
            assertTrue(fichiers.noneMatch(f -> f.getFileName().toString().contains(".tmp")),
                    "le fichier temporaire de compilation doit etre efface");
        }
    }
}
