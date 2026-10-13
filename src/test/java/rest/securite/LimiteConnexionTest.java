package rest.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class LimiteConnexionTest {

    private final AtomicLong t = new AtomicLong(1_000_000L);
    private final LimiteConnexion l = new LimiteConnexion(t::get);

    @Test
    void quatreEchecsNeBloquentPasLeCinquiemeBloque30s() {
        for (int i = 0; i < 4; i++) {
            assertEquals(0, l.echec("caisse1", "10.0.0.5"));
        }
        assertEquals(30, l.echec("Caisse1 ", "10.0.0.5"));
        assertEquals(30, l.attenteSecondes("CAISSE1", "10.0.0.9"));
        t.addAndGet(30_000);
        assertEquals(0, l.attenteSecondes("caisse1", "10.0.0.5"));
    }

    @Test
    void attenteDoubleeEtPlafonnee() {
        for (int i = 0; i < 5; i++) {
            l.echec("a", "ip");
        }
        assertEquals(60, l.echec("a", "ip"));
        assertEquals(120, l.echec("a", "ip"));
        for (int i = 0; i < 30; i++) {
            l.echec("a", "ip");
        }
        assertEquals(15 * 60, l.attenteSecondes("a", "ip"));
    }

    @Test
    void succesRemetAZeroEtUnAutreCompteNestPasBloque() {
        for (int i = 0; i < 5; i++) {
            l.echec("a", "ip1");
        }
        assertEquals(0, l.attenteSecondes("b", "ip2"));
        l.succes("a", "ip1");
        assertEquals(0, l.attenteSecondes("a", "ip1"));
    }

    @Test
    void adresseBloqueeApresVingtEchecsSurDesComptesDifferents() {
        for (int i = 0; i < 19; i++) {
            l.echec("compte" + i, "ip");
        }
        assertEquals(0, l.attenteSecondes("nouveau", "ip"));
        l.echec("compte19", "ip");
        assertTrue(l.attenteSecondes("nouveau", "ip") > 0);
    }

    @Test
    void echecsAnciensOublies() {
        for (int i = 0; i < 4; i++) {
            l.echec("a", "ip");
        }
        t.addAndGet(16 * 60_000);
        assertEquals(0, l.echec("a", "ip"));
    }
}
