package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.dto.AnalyseTiersPayantDTO;

/**
 * Mise en forme du fichier exporte depuis l'analyse tiers payants. Un libelle mal echappe decale toutes les colonnes du
 * tableur, et un separateur decimal inattendu fait lire les taux comme des entiers.
 */
class AnalyseTiersPayantCsvTest {

    @Test
    @DisplayName("CSV : un libelle contenant le separateur ne decale pas les colonnes")
    void csvEchappement() {
        assertEquals("OLEA CI", AnalyseTiersPayantRessource.champ("OLEA CI"));
        assertEquals("\"MUTUELLE; SANTE\"", AnalyseTiersPayantRessource.champ("MUTUELLE; SANTE"));
        assertEquals("\"GUILLEMET \"\"A\"\"\"", AnalyseTiersPayantRessource.champ("GUILLEMET \"A\""));
        assertEquals("", AnalyseTiersPayantRessource.champ(null));
    }

    @Test
    @DisplayName("CSV : virgule decimale, attendue par un tableur en francais")
    void csvNombre() {
        assertEquals("34,03", AnalyseTiersPayantRessource.nombre(34.03d));
        assertEquals("0,0", AnalyseTiersPayantRessource.nombre(0d));
    }

    @Test
    @DisplayName("CSV : une entete par niveau, et une ligne par resultat")
    void csvContenu() {
        AnalyseTiersPayantDTO tp = new AnalyseTiersPayantDTO();
        tp.setTiersPayant("OLEA CI");
        tp.setNbVentes(35L);
        tp.setQuantite(74L);
        tp.setCaTtc(307440L);
        tp.setCaHt(307440L);
        tp.setMontantAchat(202839L);
        tp.setMarge(104601L);
        tp.setPartTiersPayant(307440L);

        String csv = AnalyseTiersPayantRessource.csv(Collections.singletonList(tp), false);
        List<String> lignes = Arrays.asList(csv.split("\n"));

        assertEquals(2, lignes.size(), "une entete et une ligne");
        assertTrue(lignes.get(0).startsWith("TIERS PAYANT;"));
        assertTrue(lignes.get(1).startsWith("OLEA CI;35;74;307440;307440;0;"), lignes.get(1));

        // Niveau produit : entete differente, et pas de colonne propre au tiers payant.
        String csvProduits = AnalyseTiersPayantRessource.csv(Collections.singletonList(tp), true);
        assertTrue(csvProduits.startsWith("CIP;DESIGNATION;"));
    }

    @Test
    @DisplayName("CSV : aucune ligne, l'entete seule plutot qu'un fichier vide")
    void csvSansResultat() {
        // Un fichier vide laisse croire a un echec ; l'entete seule dit « rien sur cette periode ».
        assertEquals("TIERS PAYANT;VENTES;QUANTITE;CA TTC;PART TIERS PAYANT;PART CLIENT;CA HT;ACHAT;MARGE;"
                + "MARGE/CA HT (%)\n", AnalyseTiersPayantRessource.csv(Collections.emptyList(), false));
    }
}
