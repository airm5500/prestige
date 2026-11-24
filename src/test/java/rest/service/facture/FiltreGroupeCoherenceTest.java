package rest.service.facture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;

import org.junit.jupiter.api.Test;

/**
 * Retour du 22/11 : le parametre « groupe » de la liste des factures (liste, pagination, releve imprime, export Excel)
 * est lu de la meme facon partout : un identifiant de groupe, ou null (tous les groupes) s'il est vide ou illisible.
 */
class FiltreGroupeCoherenceTest {

    @Test
    void identifiantLuOuTousLesGroupes() {
        Random r = new Random(2211L);
        int lus = 0, vides = 0;
        for (int i = 0; i < 20000; i++) {
            int g = r.nextInt(100000);
            String espaces = r.nextBoolean() ? " " : "";
            switch (r.nextInt(4)) {
            case 0:
                assertEquals(Integer.valueOf(g), FiltreGroupe.lire(espaces + g + espaces));
                lus++;
                break;
            case 1:
                assertNull(FiltreGroupe.lire(espaces), "vide = tous les groupes");
                vides++;
                break;
            case 2:
                assertNull(FiltreGroupe.lire("G" + g), "illisible = tous les groupes");
                vides++;
                break;
            default:
                assertNull(FiltreGroupe.lire(g + ".5"));
                vides++;
            }
        }
        assertTrue(lus > 4000 && vides > 12000, lus + " / " + vides);
        assertNull(FiltreGroupe.lire(null));
        assertNull(FiltreGroupe.lire("undefined"));
        assertEquals(Integer.valueOf(7), FiltreGroupe.lire("7"));
    }
}
