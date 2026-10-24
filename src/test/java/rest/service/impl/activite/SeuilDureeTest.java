package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Critere de duree des ventes (retour du 24/10 : operateur et valeur au choix, 10 min par defaut). */
class SeuilDureeTest {

    @Test
    void parDefautPlusDeDixMinutes() {
        SeuilDuree s = SeuilDuree.de(null, null);
        assertEquals("GT", s.getOperateur());
        assertEquals(10, s.getMinutes());
        assertEquals("Ventes de plus de 10 min", s.libelle());
        assertFalse(s.retient(600), "10 min pile : pas plus de 10 min");
        assertTrue(s.retient(601));
    }

    @Test
    void lesQuatreOperateurs() {
        assertTrue(SeuilDuree.de("GE", 5).retient(300));
        assertEquals("Ventes de 5 min ou plus", SeuilDuree.de("GE", 5).libelle());
        assertTrue(SeuilDuree.de("LT", 2).retient(119));
        assertFalse(SeuilDuree.de("LT", 2).retient(120));
        assertEquals("Ventes de moins de 2 min", SeuilDuree.de("LT", 2).libelle());
        assertTrue(SeuilDuree.de("LE", 2).retient(120));
        assertEquals("Ventes de 2 min ou moins", SeuilDuree.de("LE", 2).libelle());
    }

    @Test
    void valeursHorsBornesRameneesAuDefaut() {
        assertEquals("GT", SeuilDuree.de("DROP TABLE", 10).getOperateur());
        assertEquals(10, SeuilDuree.de("GT", 0).getMinutes());
        assertEquals(10, SeuilDuree.de("GT", 100000).getMinutes());
        assertEquals(240, SeuilDuree.de("GT", 240).getMinutes());
    }

    @Test
    void longueOuCourte() {
        assertTrue(SeuilDuree.de("GT", 10).versLeHaut());
        assertTrue(SeuilDuree.de("GE", 10).versLeHaut());
        assertFalse(SeuilDuree.de("LT", 10).versLeHaut());
    }
}
