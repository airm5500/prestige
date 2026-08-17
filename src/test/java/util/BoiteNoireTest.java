package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Boite noire du watchdog. Le point sensible est la RELECTURE : ce fichier est lu une seule fois, au demarrage qui suit
 * un crash, au moment ou personne ne peut plus verifier quoi que ce soit. Une lecture fausse produit une
 * indisponibilite annoncee fantaisiste, et une lecture qui echoue fait perdre le seul etat connu d'avant l'arret.
 */
class BoiteNoireTest {

    private static final LocalDateTime REPLI = LocalDateTime.of(2000, 1, 1, 0, 0, 0);

    @Test
    @DisplayName("Aller-retour : toutes les mesures survivent a l'ecriture puis a la relecture")
    void allerRetour() {
        LocalDateTime instant = LocalDateTime.of(2026, 8, 17, 14, 32, 5);
        BoiteNoire.Instantane origine = new BoiteNoire.Instantane(instant, 512L, 2048L, 15234L, 3L,
                "GET /api/v1/ventes", 1200L);

        BoiteNoire.Instantane relu = BoiteNoire.lire(BoiteNoire.formater(origine), REPLI);

        assertEquals(instant, relu.horodatage);
        assertEquals(512L, relu.memoireUtiliseeMo);
        assertEquals(2048L, relu.memoireMaxMo);
        assertEquals(15234L, relu.disqueLibreMo);
        assertEquals(3L, relu.requetesEnCours);
        assertEquals("GET /api/v1/ventes", relu.requeteLaPlusLongue);
        assertEquals(1200L, relu.requeteLaPlusLongueMs);
    }

    @Test
    @DisplayName("Ancien format : un temoin ne contenant qu'une date reste lu correctement")
    void ancienFormat() {
        // C'est le fichier laisse sur le serveur par la version precedente : a la premiere montee de version, il est lu
        // avant d'etre reecrit. Mal interprete, il annoncerait une indisponibilite de plusieurs annees.
        BoiteNoire.Instantane relu = BoiteNoire.lire("2026-08-17 14:32:05", REPLI);

        assertEquals(LocalDateTime.of(2026, 8, 17, 14, 32, 5), relu.horodatage);
        assertTrue(relu.sansMesure(), "un ancien temoin ne porte aucune mesure");
        assertEquals(BoiteNoire.INCONNU, relu.memoireUtiliseeMo);
    }

    @Test
    @DisplayName("Temoin illisible ou vide : on retombe sur la date de repli, sans exception")
    void temoinIllisible() {
        assertEquals(REPLI, BoiteNoire.lire("", REPLI).horodatage);
        assertEquals(REPLI, BoiteNoire.lire(null, REPLI).horodatage);
        assertEquals(REPLI, BoiteNoire.lire("n'importe quoi", REPLI).horodatage);
        // Format reconnu mais date corrompue : les autres mesures restent exploitables.
        BoiteNoire.Instantane relu = BoiteNoire.lire("horodatage=xx\nmemoireUtiliseeMo=128\n", REPLI);
        assertEquals(REPLI, relu.horodatage);
        assertEquals(128L, relu.memoireUtiliseeMo);
    }

    @Test
    @DisplayName("Une mesure indisponible n'est pas ecrite plutot que d'etre ecrite fausse")
    void mesureInconnueNonEcrite() {
        BoiteNoire.Instantane partiel = new BoiteNoire.Instantane(LocalDateTime.of(2026, 8, 17, 14, 32, 5), 256L, 1024L,
                BoiteNoire.INCONNU, BoiteNoire.INCONNU, null, BoiteNoire.INCONNU);

        String texte = BoiteNoire.formater(partiel);

        assertFalse(texte.contains("disqueLibreMo"), "une mesure inconnue ne doit pas apparaitre dans le fichier");
        assertFalse(texte.contains("requetesEnCours"));
        BoiteNoire.Instantane relu = BoiteNoire.lire(texte, REPLI);
        assertEquals(BoiteNoire.INCONNU, relu.disqueLibreMo);
        assertNull(relu.requeteLaPlusLongue);
        assertEquals(256L, relu.memoireUtiliseeMo);
    }

    @Test
    @DisplayName("Une URL multiligne est ramenee sur une ligne : le format cle=valeur reste intact")
    void urlMultiligneNeCassePasLeFormat() {
        BoiteNoire.Instantane origine = new BoiteNoire.Instantane(LocalDateTime.of(2026, 8, 17, 14, 32, 5), 1L, 2L, 3L,
                1L, "GET /api/v1/x\ny\r\nz", 10L);

        BoiteNoire.Instantane relu = BoiteNoire.lire(BoiteNoire.formater(origine), REPLI);

        assertEquals("GET /api/v1/x y z", relu.requeteLaPlusLongue);
        assertEquals(10L, relu.requeteLaPlusLongueMs);
    }

    @Test
    @DisplayName("Pourcentage de memoire : calcule, et neutre quand la mesure manque")
    void pourcentageMemoire() {
        assertEquals(25L, new BoiteNoire.Instantane(REPLI, 512L, 2048L, 0L, 0L, null, 0L).pourcentageMemoire());
        assertEquals(BoiteNoire.INCONNU,
                new BoiteNoire.Instantane(REPLI, BoiteNoire.INCONNU, 2048L, 0L, 0L, null, 0L).pourcentageMemoire());
        // Un maximum a zero ne doit pas produire de division par zero.
        assertEquals(BoiteNoire.INCONNU,
                new BoiteNoire.Instantane(REPLI, 10L, 0L, 0L, 0L, null, 0L).pourcentageMemoire());
    }
}
