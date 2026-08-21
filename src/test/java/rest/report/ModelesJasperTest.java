package rest.report;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import net.sf.jasperreports.engine.JRField;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Compilation des modeles d'etat embarques dans l'application (src/main/resources/reports).
 *
 * Un modele mal forme ne se voit ni a la compilation Java ni au deploiement : il n'echoue qu'au moment ou l'utilisateur
 * clique sur « Imprimer », et JasperReports se contente alors de journaliser l'erreur — l'ecran, lui, ouvre un onglet
 * vide. Ces controles font remonter la faute a la construction.
 *
 * Le schema JasperReports impose notamment l'ordre des bandes : pageFooter precede summary. C'est l'erreur qui a ete
 * relevee sur une premiere version de ces deux modeles.
 */
class ModelesJasperTest {

    @Test
    @DisplayName("Analyse tiers payants : les deux modeles compilent")
    void modelesCompilent() {
        for (String nom : Arrays.asList("analyse_tiers_payant", "analyse_tiers_payant_produit", "ticket_support")) {
            assertNotNull(compiler(nom), "modele " + nom);
        }
    }

    @Test
    @DisplayName("Analyse tiers payants : les champs attendus correspondent aux donnees fournies a l'etat")
    void champsAlignesSurLesDonnees() {
        // Les etats sont alimentes par AnalyseTiersPayantDTO : un champ mal nomme s'imprimerait vide,
        // sans la moindre erreur, et le total en pied serait fausse sans que rien ne le signale.
        Set<String> proprietes = new HashSet<>(
                Arrays.asList("tiersPayantId", "tiersPayant", "cip", "designation", "nbVentes", "quantite", "caTtc",
                        "caHt", "montantAchat", "marge", "partTiersPayant", "partClient", "tauxMarge"));

        for (String nom : Arrays.asList("analyse_tiers_payant", "analyse_tiers_payant_produit")) {
            JasperReport rapport = compiler(nom);
            for (JRField champ : rapport.getFields()) {
                assertTrue(proprietes.contains(champ.getName()), "le modele " + nom + " attend le champ '"
                        + champ.getName() + "', que AnalyseTiersPayantDTO ne fournit pas");
            }
        }
    }

    @Test
    @DisplayName("Analyse tiers payants : les parametres d'entete sont ceux que fournit la ressource")
    void parametresAttendus() {
        List<String> fournis = Arrays.asList("P_H_INSTITUTION", "P_INSTITUTION_ADRESSE", "P_H_CLT_INFOS", "P_PERIODE",
                "P_PRINTED_BY", "P_FOOTER_RC");

        for (String nom : Arrays.asList("analyse_tiers_payant", "analyse_tiers_payant_produit")) {
            JasperReport rapport = compiler(nom);
            for (net.sf.jasperreports.engine.JRParameter parametre : rapport.getParameters()) {
                if (parametre.isSystemDefined()) {
                    continue;
                }
                assertTrue(fournis.contains(parametre.getName()), "le modele " + nom + " attend le parametre '"
                        + parametre.getName() + "', que la ressource ne renseigne pas");
            }
        }
    }

    private JasperReport compiler(String nom) {
        try (InputStream in = ModelesJasperTest.class.getResourceAsStream("/reports/" + nom + ".jrxml")) {
            assertNotNull(in, "modele introuvable dans le classpath : " + nom);
            return JasperCompileManager.compileReport(in);
        } catch (Exception e) {
            throw new AssertionError("le modele " + nom + " ne compile pas : " + e.getMessage(), e);
        }
    }
}
