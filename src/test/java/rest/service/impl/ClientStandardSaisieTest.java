package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 3 : un client standard se cree avec un nom, des prenoms et un numero de telephone, et le numero
 * est normalise avant enregistrement pour que l'unicite ait un sens.
 */
public class ClientStandardSaisieTest {

    @Test
    public void uneSaisieCompleteEstAcceptee() {
        ClientStandardSaisie s = ClientStandardSaisie.controler("  KOFFI  ", " Jean Marc ", "07 08 47 37 50");
        assertTrue(s.estValide(), s.message());
        assertEquals("KOFFI", s.getNom());
        assertEquals("Jean Marc", s.getPrenoms());
        assertEquals("0708473750", s.getTelephone());
        assertEquals("", s.message());
    }

    @Test
    public void leNumeroEstNormaliseQuelQueSoitLeFormatDeSaisie() {
        // Sans cette normalisation, le meme client pourrait etre enregistre plusieurs fois sous des
        // ecritures differentes du meme numero, et l'unicite ne voudrait rien dire.
        for (String saisie : new String[] { "0708473750", "07 08 47 37 50", "07.08.47.37.50", "07-08-47-37-50",
                "+225 07 08 47 37 50", "00225 0708473750", "2250708473750", "(07) 08 47 37 50" }) {
            ClientStandardSaisie s = ClientStandardSaisie.controler("KOFFI", "Jean", saisie);
            assertTrue(s.estValide(), saisie + " : " + s.message());
            assertEquals("0708473750", s.getTelephone(), saisie);
        }
    }

    @Test
    public void leNomEtLesPrenomsSontObligatoires() {
        assertTrue(ClientStandardSaisie.controler("", "Jean", "0708473750").getErreurs()
                .contains("Le nom est obligatoire."));
        assertTrue(ClientStandardSaisie.controler("   ", "Jean", "0708473750").getErreurs()
                .contains("Le nom est obligatoire."));
        assertTrue(ClientStandardSaisie.controler("KOFFI", "", "0708473750").getErreurs()
                .contains("Les prénoms sont obligatoires."));
    }

    @Test
    public void unNumeroInvalideEstRefuseAvecSonMotif() {
        for (String saisie : new String[] { "", "   ", null, "12345", "pas un numero", "0208473750", "070847375" }) {
            ClientStandardSaisie s = ClientStandardSaisie.controler("KOFFI", "Jean", saisie);
            assertFalse(s.estValide(), String.valueOf(saisie));
            assertTrue(s.message().startsWith("Numéro de téléphone invalide"), s.message());
            assertTrue(s.message().contains("01, 05 ou 07"), s.message());
            assertEquals("", s.getTelephone(), String.valueOf(saisie));
        }
    }

    @Test
    public void toutesLesErreursSontRenduesEnUneFois() {
        // L'operateur ne doit pas decouvrir la deuxieme erreur apres avoir corrige la premiere.
        ClientStandardSaisie s = ClientStandardSaisie.controler("", "", "abc");
        assertEquals(3, s.getErreurs().size(), s.message());
    }

    @Test
    public void unNumeroAyantPerduSonZeroDeTeteDansUnTableurEstRattrape() {
        // Un tableur traite « 0708473750 » comme un nombre et enregistre 708473750 : sans cette
        // reparation, TOUTES les lignes d'un import depuis un classeur seraient rejetees pour
        // « nombre de chiffres incorrect (9) ».
        for (String saisie : new String[] { "708473750", "508473751", "108473752" }) {
            ClientStandardSaisie s = ClientStandardSaisie.controler("KOFFI", "Jean", saisie);
            assertTrue(s.estValide(), saisie + " : " + s.message());
            assertEquals("0" + saisie, s.getTelephone(), saisie);
        }
        assertEquals("0708473750", ClientStandardSaisie.retablirZeroDeTete("708473750"));
        assertEquals("0708473750", ClientStandardSaisie.retablirZeroDeTete("70 84 73 750"));
    }

    @Test
    public void laReparationNeSappliqueQuAuCasSansAmbiguite() {
        // Huit chiffres (ancien format), dix chiffres deja complets, ou un premier chiffre qui n'est
        // pas un prefixe mobile : on ne touche a rien.
        assertEquals("0708473750", ClientStandardSaisie.retablirZeroDeTete("0708473750"));
        assertEquals("08473750", ClientStandardSaisie.retablirZeroDeTete("08473750"));
        assertEquals("208473750", ClientStandardSaisie.retablirZeroDeTete("208473750"));
        assertEquals("2250708473750", ClientStandardSaisie.retablirZeroDeTete("2250708473750"));
        assertFalse(ClientStandardSaisie.controler("KOFFI", "Jean", "208473750").estValide());
    }

    @Test
    public void leTypeDeClientStandardEstCeluiDeLaBase() {
        assertEquals("6", ClientStandardSaisie.TYPE_CLIENT_STANDARD);
    }
}
