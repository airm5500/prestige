package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * La ville imprimee en pied de recapitulatif doit sortir par TOUS les chemins d'impression.
 *
 * <p>
 * Le defaut corrige ici : la ville se saisit dans « Gestion des parametrages », et elle sortait bien sur le
 * recapitulatif imprime par le service REST, mais pas sur celui imprime depuis l'ecran des factures. La raison est
 * qu'il y a plusieurs chemins d'impression et que chacun construit SA propre liste de parametres ; celui de l'ecran des
 * factures ne posait pas la ville, l'etat imprimait donc « le &lt;date&gt; » tout court.
 * </p>
 *
 * <p>
 * Ce controle relit les pages concernees : si un nouveau chemin d'impression du recapitulatif apparait sans poser la
 * ville, il echoue.
 * </p>
 */
class VilleDuRecapitulatifTest {

    /** Les pages qui impriment un recapitulatif de facture. */
    private static final List<String> PAGES_RECAPITULATIF = Arrays.asList(
            "src/main/webapp/webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp",
            "src/main/webapp/webservices/sm_user/facturation/ws_rp_print_all_invoices.jsp",
            "src/main/webapp/webservices/configmanagement/groupe/group_invoice_pdf.jsp");

    /** Ces pages sont encodees en latin-1 : les relire en UTF-8 les rendrait illisibles. */
    private static String contenu(String chemin) throws IOException {
        Path fichier = Paths.get(chemin);
        assertTrue(Files.exists(fichier), "page introuvable : " + chemin);
        return new String(Files.readAllBytes(fichier), StandardCharsets.ISO_8859_1);
    }

    @Test
    @DisplayName("Chaque page qui imprime un recapitulatif transmet la ville a l'etat")
    void toutesLesPagesTransmettentLaVille() throws IOException {
        for (String page : PAGES_RECAPITULATIF) {
            String source = contenu(page);
            assertTrue(source.contains("rp_facturerecap"),
                    page + " : cette page n'imprime plus de recapitulatif, le controle est a mettre a jour");
            assertTrue(source.contains("LieuEdition.PARAMETRE") && source.contains("LieuEdition.valeur("),
                    page + " : la ville saisie dans les parametrages ne sera pas imprimee sur le recapitulatif");
        }
    }

    @Test
    @DisplayName("Le nom du parametre est celui que les modeles .jrxml attendent")
    void nomDuParametre() {
        assertEquals("P_LIEU_EDITION", LieuEdition.PARAMETRE);
    }

    @Test
    @DisplayName("Sans acces aux donnees, la ville est vide et l'edition continue")
    void sansAccesAuxDonnees() {
        // Une edition ne doit jamais echouer parce que la ville n'a pas pu etre lue : elle imprime
        // « le <date> » sans ville, ce qui vaut mieux qu'un PDF qui ne sort pas.
        assertEquals("", LieuEdition.valeur(null));
    }

    @Test
    @DisplayName("Le service REST transmet lui aussi la ville")
    void serviceRest() throws IOException {
        String source = new String(Files.readAllBytes(Paths.get("src/main/java/rest/report/ReportUtil.java")),
                StandardCharsets.UTF_8);
        assertTrue(source.contains("parameters.put(\"P_LIEU_EDITION\", lieuEdition())"),
                "officineData doit poser la ville : c'est par la que passent les editions REST");
    }
}
