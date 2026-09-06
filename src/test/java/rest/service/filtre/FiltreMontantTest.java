package rest.service.filtre;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Filtre de montant des points 10 et 21 : les six operateurs, et le comportement sur les bords. */
class FiltreMontantTest {

    @Test
    void lesSixOperateursSontHonores() {
        assertTrue(FiltreMontant.de("eq", "1000").accepte(1000));
        assertFalse(FiltreMontant.de("eq", "1000").accepte(1001));
        assertTrue(FiltreMontant.de("ne", "1000").accepte(1001));
        assertFalse(FiltreMontant.de("ne", "1000").accepte(1000));
        assertTrue(FiltreMontant.de("gt", "1000").accepte(1001));
        assertFalse(FiltreMontant.de("gt", "1000").accepte(1000));
        assertTrue(FiltreMontant.de("gte", "1000").accepte(1000));
        assertFalse(FiltreMontant.de("gte", "1000").accepte(999));
        assertTrue(FiltreMontant.de("lt", "1000").accepte(999));
        assertFalse(FiltreMontant.de("lt", "1000").accepte(1000));
        assertTrue(FiltreMontant.de("lte", "1000").accepte(1000));
        assertFalse(FiltreMontant.de("lte", "1000").accepte(1001));
    }

    @Test
    void sansOperateurOuSansValeurLeFiltreLaisseToutPasser() {
        assertTrue(FiltreMontant.de("", "1000").inactif());
        assertTrue(FiltreMontant.de("gt", "").inactif());
        assertTrue(FiltreMontant.de(null, null).inactif());
        assertTrue(FiltreMontant.de("", "").accepte("n'importe quoi"));
    }

    @Test
    void unOperateurInconnuNeFiltrePas() {
        assertTrue(FiltreMontant.de("entre", "1000").inactif());
    }

    @Test
    void leMontantEstLuQuelleQueSoitSonEcriture() {
        // tel que les ecrans l'affichent : separateur de milliers et virgule decimale
        assertTrue(FiltreMontant.de("eq", "1000").accepte("1.000"));
        assertTrue(FiltreMontant.de("eq", "1000000").accepte("1.000.000"));
        assertTrue(FiltreMontant.de("eq", "1000,5").accepte("1 000,50"));
        assertTrue(FiltreMontant.de("gt", "1000").accepte(1000.01d));
        // un point isole suivi d'autre chose que trois chiffres reste une decimale
        assertTrue(FiltreMontant.de("eq", "1,5").accepte("1.5"));
    }

    @Test
    void unMontantIllisibleEstEcarteQuandUnFiltreEstActif() {
        assertFalse(FiltreMontant.de("gt", "0").accepte("néant"));
        assertFalse(FiltreMontant.de("gt", "0").accepte(null));
    }

    @Test
    void lesMontantsNegatifsSontComparesCommeDesNombres() {
        assertTrue(FiltreMontant.de("lt", "0").accepte(-500));
        assertFalse(FiltreMontant.de("gt", "0").accepte(-500));
    }

    @Test
    void leCritereRetenuEstRappeleEnClair() {
        assertEquals("supérieur ou égal à 1000", FiltreMontant.de("gte", "1000").libelle());
        assertEquals("différent de 0", FiltreMontant.de("ne", "0").libelle());
        assertEquals("", FiltreMontant.de("", "").libelle());
    }
}
