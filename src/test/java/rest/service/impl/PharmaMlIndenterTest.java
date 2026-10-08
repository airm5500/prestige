package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;

class PharmaMlIndenterTest {

    @Test
    void reponseDpciSurUneLigneReindentee() throws Exception {
        String brut = new String(
                Files.readAllBytes(Paths.get("src/test/resources/pharmaml/R_DPCI_rep_commande_v1.xml")),
                StandardCharsets.UTF_8);
        String x = PharmaMlMessages.indenter(brut);
        assertTrue(x.startsWith("<?xml"), x);
        assertTrue(x.contains("\n    <MESSAGE_REPARTITEUR"), x);
        assertTrue(x.contains("\n        <REP_COMMANDE Ref_Cde_Client=\"08102026_000025927\""), x);
        assertTrue(x.contains("<LIVREUR Societe=\"D.P.C.I.  REPARTITION\" Etablissement="),
                "ordre des attributs garde : " + x);
        assertTrue(x.contains("<INDISPONIBILITE_N Code_Reponse=\"0005\" Additif=\"Manque Rayon\"/>"), x);
        assertTrue(!x.contains("\n\n") && !x.contains("\n \n"), "pas de ligne vide : " + x);
        /* meme contenu : la reponse relue donne les memes informations */
        assertEquals(PharmaMlMessages.lireEnveloppe(brut).enReponseA, PharmaMlMessages.lireEnveloppe(x).enReponseA);
        assertEquals(PharmaMlMessages.lireEnveloppe(brut).repCommande, PharmaMlMessages.lireEnveloppe(x).repCommande);
    }

    @Test
    void illisibleOuVideRenduTelQuel() {
        assertEquals("pas du xml <", PharmaMlMessages.indenter("pas du xml <"));
        assertEquals("", PharmaMlMessages.indenter(""));
        assertEquals(null, PharmaMlMessages.indenter(null));
    }

    /** Vidage reel DPCI du 08/10 : EN_REPONSE_A = reference du vidage ; rattachement par Ref_Cde_Client. */
    @Test
    void vidageDpciReelRefCdeClientLu() throws Exception {
        String x = new String(
                Files.readAllBytes(Paths.get("src/test/resources/pharmaml/RV_DPCI_vidage_rep_commande_v1.xml")),
                StandardCharsets.UTF_8);
        PharmaMlMessages.Enveloppe e = PharmaMlMessages.lireEnveloppe(x);
        assertEquals("261008091521007", e.enReponseA);
        assertEquals("08102026_00003", e.refCdeClient);
        assertTrue(e.repCommande);
        assertEquals("", PharmaMlMessages.lireEnveloppe(
                "<CSRP_ENVELOPPE><CORPS><ACTION>FIN_SERVICE</ACTION></CORPS></CSRP_ENVELOPPE>").refCdeClient);
    }
}
