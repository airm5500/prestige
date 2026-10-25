package rest.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class LimiteConnexionTest {

    private final AtomicLong t = new AtomicLong(1_000_000L);
    private final LimiteConnexion l = new LimiteConnexion(t::get);

    /* retour du 25/10 : 10 essais par identifiant (au lieu de 5) */
    @Test
    void neufEchecsNeBloquentPasLeDixiemeBloque30s() {
        for (int i = 0; i < 9; i++) {
            assertEquals(0, l.echec("caisse1", "10.0.0.5"));
        }
        assertEquals(30, l.echec("Caisse1 ", "10.0.0.5"));
        assertEquals(30, l.attenteSecondes("CAISSE1", "10.0.0.9"));
        t.addAndGet(30_000);
        assertEquals(0, l.attenteSecondes("caisse1", "10.0.0.5"));
    }

    /*
     * retour du 25/10 : apres l'attente, une faute de frappe ne rebloque plus aussitot : une nouvelle serie de 10
     * essais est permise ; le blocage suivant est seulement plus long.
     */
    @Test
    void apresLAttenteUneNouvelleSerieDeDixEssais() {
        for (int i = 0; i < 10; i++) {
            l.echec("a", "ip");
        }
        t.addAndGet(30_000);
        for (int i = 0; i < 9; i++) {
            assertEquals(0, l.echec("a", "ip"), "essai " + (i + 1) + " apres l'attente");
        }
        assertEquals(60, l.echec("a", "ip"));
        t.addAndGet(60_000);
        assertEquals(0, l.attenteSecondes("a", "ip"));
    }

    @Test
    void attentePlafonneeA15Minutes() {
        for (int serie = 0; serie < 12; serie++) {
            for (int i = 0; i < 10; i++) {
                l.echec("a", "ip");
            }
            long attente = l.attenteSecondes("a", "ip");
            assertTrue(attente <= 15 * 60);
            t.addAndGet(attente * 1000);
        }
        for (int i = 0; i < 10; i++) {
            l.echec("a", "ip");
        }
        assertEquals(15 * 60, l.attenteSecondes("a", "ip"));
    }

    @Test
    void succesRemetAZeroEtUnAutreCompteNestPasBloque() {
        for (int i = 0; i < 10; i++) {
            l.echec("a", "ip1");
        }
        assertEquals(0, l.attenteSecondes("b", "ip2"));
        l.succes("a", "ip1");
        assertEquals(0, l.attenteSecondes("a", "ip1"));
        assertEquals(0, l.echec("a", "ip1"));
    }

    /* plusieurs employes sur le meme poste : 50 echecs, tous comptes confondus */
    @Test
    void adresseBloqueeApresCinquanteEchecsSurDesComptesDifferents() {
        for (int i = 0; i < 49; i++) {
            l.echec("compte" + i, "ip");
        }
        assertEquals(0, l.attenteSecondes("nouveau", "ip"));
        l.echec("compte49", "ip");
        assertTrue(l.attenteSecondes("nouveau", "ip") > 0);
    }

    @Test
    void echecsAnciensOublies() {
        for (int i = 0; i < 9; i++) {
            l.echec("a", "ip");
        }
        t.addAndGet(16 * 60_000);
        assertEquals(0, l.echec("a", "ip"));
    }

    @Test
    void messageDitQueLeCompteEstBloque() {
        assertTrue(LimiteConnexion.message(30).startsWith("Trop d'essais"));
        assertTrue(LimiteConnexion.message(30).contains("30 s"));
        assertTrue(LimiteConnexion.message(900).contains("15 min"));
    }
}
