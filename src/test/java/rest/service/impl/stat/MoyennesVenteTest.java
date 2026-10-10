package rest.service.impl.stat;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class MoyennesVenteTest {

    @Test
    void quatreVingtDixJoursGlissants() {
        // 180 boites en 90 jours : 2 par jour, 14 par semaine, 60 par mois
        assertEquals(2.0, MoyennesVente.parJour(180), 1e-9);
        assertEquals(14.0, MoyennesVente.parSemaine(180), 1e-9);
        assertEquals(60.0, MoyennesVente.parMois(180), 1e-9);
    }

    @Test
    void arrondis() {
        // 10 boites : 0,11 / jour ; 0,8 / semaine ; 3,3 / mois
        assertEquals(0.11, MoyennesVente.parJour(10), 1e-9);
        assertEquals(0.8, MoyennesVente.parSemaine(10), 1e-9);
        assertEquals(3.3, MoyennesVente.parMois(10), 1e-9);
    }

    @Test
    void aucuneVenteOuNegatif() {
        assertEquals(0.0, MoyennesVente.parJour(0), 1e-9);
        assertEquals(0.0, MoyennesVente.parMois(-5), 1e-9);
        assertEquals(90, MoyennesVente.json(0).getInt("jours"));
        assertEquals(0, MoyennesVente.json(-3).getLong("total"));
    }
}
