package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Dans cette base, les colonnes de nom sont nommees A L'ENVERS de leur contenu : str_FIRST_NAME porte le NOM de
 * famille, str_LAST_NAME porte les PRENOMS.
 *
 * Incident constate en production : le tri alphabetique demande sur la fiche du tiers payant donnait une facture qui
 * paraissait NON TRIEE. Elle l'etait pourtant - mais sur str_LAST_NAME, c'est-a-dire sur le PRENOM. Sur une facture
 * reelle, les blocs sortaient dans l'ordre BOUALY GADIEL, BRIGITTE, BROU, CLA LAURA BENEDICTE : parfaitement classe par
 * prenom, illisible pour qui cherche un nom.
 *
 * Ces controles figent la convention a sa source - la fiche client de l'application - pour qu'une relecture distraite
 * des noms de colonnes ne la reperde pas.
 */
class ConventionNomPrenomTest {

    private static String lire(String chemin) throws IOException {
        Path p = Paths.get(chemin);
        assertTrue(Files.exists(p), "fichier introuvable : " + chemin);
        return new String(Files.readAllBytes(p), StandardCharsets.ISO_8859_1);
    }

    /** Le libelle place juste avant un champ dans un formulaire ExtJS. */
    private static String libelleDuChamp(String source, String champ) {
        Matcher m = Pattern.compile("fieldLabel:\\s*'([^']+)'[^}]*?name:\\s*'" + champ + "'", Pattern.DOTALL)
                .matcher(source);
        assertTrue(m.find(), "champ " + champ + " introuvable dans le formulaire client");
        return m.group(1);
    }

    @Test
    @DisplayName("La fiche client dit que strFIRSTNAME est le NOM et strLASTNAME le PRENOM")
    void laFicheClientFaitFoi() throws IOException {
        String formulaire = lire("src/main/webapp/general/app/view/vente/user/ClientLambda.js");

        assertEquals("Nom", libelleDuChamp(formulaire, "strFIRSTNAME"),
                "si ce libelle change, tout le tri des factures doit etre revu");
        assertTrue(libelleDuChamp(formulaire, "strLASTNAME").startsWith("Pr"),
                "strLASTNAME doit rester le champ « Prénom »");
    }

    @Test
    @DisplayName("TriFacture nomme les colonnes conformement a la fiche client")
    void triFactureSuitLaFiche() {
        assertEquals("str_FIRST_NAME", TriFacture.COLONNE_NOM);
        assertEquals("str_LAST_NAME", TriFacture.COLONNE_PRENOM);
    }

    @Test
    @DisplayName("Le createur de modeles trie par NOM avant PRENOM, pas l'inverse")
    void leCreateurTriePargNomDabord() throws IOException {
        String source = lire("src/main/java/rest/report/JrxmlFactureBuilder.java");
        int nom = source.indexOf("String nom = \"p.str_FIRST_NAME_CUSTOMER\"");
        assertTrue(nom > 0, "le createur doit designer str_FIRST_NAME_CUSTOMER comme le NOM");

        // aucun ORDER BY ne doit citer le prenom avant le nom
        Matcher m = Pattern.compile("ordre = [^;]+;", Pattern.DOTALL).matcher(source);
        while (m.find()) {
            String ordre = m.group();
            int prenom = ordre.indexOf("str_LAST_NAME_CUSTOMER");
            int deNom = ordre.indexOf("nom");
            assertTrue(prenom < 0 || deNom < 0 || deNom < prenom,
                    "cet ordre classe par prenom avant le nom : " + ordre);
        }
    }

    @Test
    @DisplayName("L'apercu du createur compose le nom complet NOM puis PRENOM")
    void lApercuComposeDansLeBonOrdre() throws IOException {
        String source = lire("src/main/java/rest/ModelFactureDynamiqueRessource.java");
        int debut = source.indexOf("private static String nomCompletNormalise");
        assertTrue(debut > 0, "methode nomCompletNormalise introuvable");
        String corps = source.substring(debut, source.indexOf("}", source.indexOf("return", debut)));

        assertTrue(corps.indexOf("getStrFIRSTNAMECUSTOMER") < corps.indexOf("getStrLASTNAMECUSTOMER"),
                "le nom complet se compose du NOM (FIRSTNAME) puis des PRENOMS (LASTNAME)");
    }

    @Test
    @DisplayName("L'edition manuelle d'une facture trie par NOM avant PRENOM")
    void laJspTriePargNomDabord() throws IOException {
        String jsp = lire("src/main/webapp/webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp");
        int debut = jsp.indexOf("String triFacture =");
        assertTrue(debut > 0, "le tri de la JSP est introuvable");
        String bloc = jsp.substring(debut, jsp.indexOf("parameters.put(\"P_ORDER_BY\"", debut));

        assertTrue(bloc.indexOf("c.str_FIRST_NAME") < bloc.indexOf("c.str_LAST_NAME"),
                "la JSP classait par prenom : str_FIRST_NAME (le NOM) doit venir en premier");
    }
}
