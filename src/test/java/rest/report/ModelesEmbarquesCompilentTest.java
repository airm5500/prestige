package rest.report;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import net.sf.jasperreports.engine.JasperCompileManager;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

/**
 * Chaque modele .jrxml embarque dans l'application doit compiler.
 *
 * <p>
 * Une erreur de schema - un element au mauvais endroit, une bande dans le mauvais ordre - ne se voit pas a la lecture
 * et ne se manifeste qu'au clic sur « Imprimer », par un PDF absent. Le defaut a ete rencontre en ecrivant le modele du
 * recapitulatif par compte organisme : le controle est fait ici, sans deploiement.
 */
class ModelesEmbarquesCompilentTest {

    @TestFactory
    List<DynamicTest> tousLesModelesCompilent() throws Exception {
        Path dossier = Paths.get("src/main/resources/reports");
        try (Stream<Path> fichiers = Files.list(dossier)) {
            return fichiers.filter(f -> f.getFileName().toString().endsWith(".jrxml")).sorted()
                    .map(f -> DynamicTest.dynamicTest(f.getFileName().toString(), () -> {
                        String nom = f.getFileName().toString().replace(".jrxml", "");
                        try (InputStream in = getClass().getResourceAsStream("/reports/" + nom + ".jrxml")) {
                            assertNotNull(in, "modele absent du classpath : " + nom);
                            try {
                                JasperCompileManager.compileReport(in);
                            } catch (Exception e) {
                                fail("le modele " + nom + " ne compile pas : " + e.getMessage());
                            }
                        }
                    })).collect(Collectors.toList());
        }
    }
}
