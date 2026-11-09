package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.securite.RotationMotDePasse.Resultat;

/** Cas 4, lot 4.B : ordre des etapes de la rotation et retour arriere, sans MariaDB ni Payara. */
class RotationMotDePasseTest {

    private static final String ANCIEN = "Ancien12#motdepasse", NOUVEAU = "Nouveau12#motdepasse";

    /** Etapes simulees : journal des appels (sans la valeur) et pannes a declencher. */
    static class Simulation implements RotationMotDePasse.Etapes {
        final List<String> appels = new ArrayList<>();
        String mariadb = ANCIEN, payara = ANCIEN;
        boolean pannePayara, panneTest, panneRetablir, panneAlterInverse;

        @Override
        public void alterUser(String motDePasse) throws Exception {
            appels.add("alterUser:" + (motDePasse.equals(NOUVEAU) ? "nouveau" : "ancien"));
            if (panneAlterInverse && motDePasse.equals(ANCIEN)) {
                throw new IllegalStateException("MariaDB injoignable");
            }
            mariadb = motDePasse;
        }

        @Override
        public void majPayara(String motDePasse) throws Exception {
            appels.add("majPayara");
            if (pannePayara) {
                throw new IllegalStateException("asadmin set : refus");
            }
            payara = motDePasse;
        }

        @Override
        public void tester() throws Exception {
            appels.add("tester");
            if (panneTest || !mariadb.equals(payara)) {
                throw new IllegalStateException("Access denied for user (using password: YES)");
            }
        }

        @Override
        public void retablirPayara() throws Exception {
            appels.add("retablirPayara");
            if (panneRetablir) {
                throw new IllegalStateException("asadmin ne répond plus");
            }
            payara = ANCIEN;
        }

        void coherent(String attendu) {
            assertEquals(attendu, mariadb, "MariaDB");
            assertEquals(attendu, payara, "Payara");
        }
    }

    private static void sansValeur(Resultat r) {
        String tout = r.message + " " + r.detail();
        assertFalse(tout.contains(ANCIEN) || tout.contains(NOUVEAU), "aucune valeur dans le resultat : " + tout);
    }

    @Test
    void succes() {
        Simulation s = new Simulation();
        Resultat r = RotationMotDePasse.executer(ANCIEN, NOUVEAU, s);
        assertTrue(r.ok);
        assertFalse(r.retourArriere || r.incoherent);
        assertEquals(List.of("alterUser:nouveau", "majPayara", "tester"), s.appels);
        s.coherent(NOUVEAU);
        sansValeur(r);
    }

    @Test
    void payaraRefuse_alterUserInverse() {
        Simulation s = new Simulation();
        s.pannePayara = true;
        Resultat r = RotationMotDePasse.executer(ANCIEN, NOUVEAU, s);
        assertFalse(r.ok);
        assertTrue(r.retourArriere);
        assertFalse(r.incoherent);
        assertEquals(List.of("alterUser:nouveau", "majPayara", "retablirPayara", "alterUser:ancien", "tester"),
                s.appels, "Payara retabli meme si sa mise a jour a echoue : la valeur a pu etre posee avant l'echec");
        s.coherent(ANCIEN);
        assertTrue(r.message.contains("revenu"), r.message);
        sansValeur(r);
    }

    @Test
    void testDeConnexionEchoue_toutRetabli() {
        Simulation s = new Simulation();
        s.panneTest = true;
        Resultat r = RotationMotDePasse.executer(ANCIEN, NOUVEAU, s);
        assertFalse(r.ok);
        assertTrue(r.retourArriere);
        assertEquals(
                List.of("alterUser:nouveau", "majPayara", "tester", "retablirPayara", "alterUser:ancien", "tester"),
                s.appels);
        s.coherent(ANCIEN);
        assertTrue(r.detail().contains("Payara rétabli") && r.detail().contains("ancien mot de passe remis"),
                r.detail());
        sansValeur(r);
    }

    @Test
    void mariadbRefuse_rienChange() {
        Simulation s = new Simulation() {
            @Override
            public void alterUser(String motDePasse) {
                appels.add("alterUser");
                throw new IllegalStateException("Access denied; you need the CREATE USER privilege");
            }
        };
        Resultat r = RotationMotDePasse.executer(ANCIEN, NOUVEAU, s);
        assertFalse(r.ok || r.retourArriere || r.incoherent);
        assertEquals(List.of("alterUser"), s.appels);
        s.coherent(ANCIEN);
        assertTrue(r.message.startsWith("Rien n'a été changé"), r.message);
    }

    @Test
    void retourArriereIncomplet_signale() {
        Simulation s = new Simulation();
        s.panneTest = true;
        s.panneAlterInverse = true;
        Resultat r = RotationMotDePasse.executer(ANCIEN, NOUVEAU, s);
        assertFalse(r.ok);
        assertFalse(r.retourArriere);
        assertTrue(r.incoherent);
        assertTrue(r.message.contains("incomplet"), r.message);
        assertEquals(NOUVEAU, s.mariadb);
        assertEquals(ANCIEN, s.payara);
        sansValeur(r);
    }

    @Test
    void ancienInconnu_aliasNonRetabli() {
        Simulation s = new Simulation();
        s.panneTest = true;
        s.panneRetablir = true;
        Resultat r = RotationMotDePasse.executer(null, NOUVEAU, s);
        assertFalse(r.ok);
        assertTrue(r.incoherent);
        assertEquals(List.of("alterUser:nouveau", "majPayara", "tester", "retablirPayara"), s.appels,
                "pas d'ALTER USER inverse sans l'ancien");
        assertTrue(r.detail().contains("Ancien mot de passe inconnu"), r.detail());
        sansValeur(r);
    }
}
