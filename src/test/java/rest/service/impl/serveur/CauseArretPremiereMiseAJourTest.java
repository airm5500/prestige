package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.CauseArret.Code;
import rest.service.impl.serveur.CauseArret.EvenementWindows;
import rest.service.impl.serveur.CauseArret.Indices;
import util.BoiteNoire;

/**
 * Journal support du 26/11, capitale (J26-6) : pendant la pose de la version du 24/11, CAISSE31 et DESKTOP-EONHOTA ont
 * leve chacun une alerte WARN « Arret brutal du serveur : Arret force, sans erreur visible ». La regle N6 (appaul,
 * 21/11) reconnait une mise a jour quand les versions avant et apres sont connues et differentes ; mais capitale
 * tournait sur un WAR d'avant le 22/11, dont le fichier temoin ne notait pas sa version : la premiere pose d'une
 * version recente n'etait donc jamais reconnue.
 * <p>
 * Regle ajoutee : un temoin LISIBLE (ancien format, ou « cle=valeur » avec son horodatage) sans version a ete ecrit par
 * une version anterieure a celle qui redemarre, des que celle-ci connait la sienne. Un temoin vide ou illisible ne dit
 * rien : le diagnostic reste celui d'avant.
 */
class CauseArretPremiereMiseAJourTest {

    private static final LocalDateTime SIGNE = LocalDateTime.of(2026, 11, 25, 0, 26);
    private static final LocalDateTime REDEMARRAGE = LocalDateTime.of(2026, 11, 25, 0, 27);
    private static final String V24 = "2026-11-24 02:30 UTC";

    private static final Set<Code> REMPLACABLES = EnumSet.of(Code.ARRET_SERVICE, Code.MEMOIRE_PROBABLE,
            Code.BASE_SATUREE, Code.MARIADB_ARRETEE, Code.ARRET_FORCE);

    /**
     * Temoins laisses par les versions anterieures au 22/11 : ancien format (une date) et « cle=valeur » sans version.
     */
    private static final String TEMOIN_DATE = "2026-11-25 00:26:00\n";
    private static final String TEMOIN_SANS_VERSION = "horodatage=2026-11-25 00:26:00\nmemoireUtiliseeMo=300\n"
            + "memoireMaxMo=1024\ndisqueLibreMo=80000\nrequetesEnCours=0\n";

    private static Indices capitale(String temoin) {
        Indices x = new Indices();
        x.dernierSigne = SIGNE;
        x.redemarrage = REDEMARRAGE;
        x.memoirePct = 29;
        x.disqueLibreMo = 80_000;
        x.versionAvant = BoiteNoire.lire(temoin, null).version;
        x.temoinSansVersion = BoiteNoire.ecritSansVersion(temoin);
        x.versionApres = V24;
        return x;
    }

    /** Les deux postes de capitale : premiere pose d'une version recente, temoin d'un ancien WAR. */
    @Test
    void premierePoseDepuisUnAncienWar() {
        for (String temoin : new String[] { TEMOIN_DATE, TEMOIN_SANS_VERSION }) {
            CauseArret.Diagnostic d = CauseArret.diagnostiquer(capitale(temoin));
            assertEquals(Code.MISE_A_JOUR, d.code, temoin);
            assertEquals("INFO", d.code.niveau);
            assertTrue(d.explication.contains(V24) && d.explication.contains("ne notait pas"), d.explication);
        }
    }

    /** Lecture du temoin : seul un temoin lisible et sans version compte. */
    @Test
    void lectureDuTemoin() {
        assertTrue(BoiteNoire.ecritSansVersion(TEMOIN_DATE));
        assertTrue(BoiteNoire.ecritSansVersion(TEMOIN_SANS_VERSION));
        assertFalse(BoiteNoire.ecritSansVersion(TEMOIN_SANS_VERSION + "version=" + V24 + "\n"));
        assertFalse(BoiteNoire.ecritSansVersion(TEMOIN_SANS_VERSION + "version=\n"), "cle presente mais vide");
        for (String illisible : new String[] { null, "", "   \n", "n'importe quoi", "horodatage=hier\n",
                "memoireMaxMo=1024\n", "\u0000\u0001" }) {
            assertFalse(BoiteNoire.ecritSansVersion(illisible), String.valueOf(illisible));
        }
        // le temoin ecrit par la version d'aujourd'hui porte la sienne : relu, il n'est pas « sans version »
        String ecrit = BoiteNoire.formater(new BoiteNoire.Instantane(SIGNE, 1, 2, 3, 0, null, -1, V24));
        assertFalse(BoiteNoire.ecritSansVersion(ecrit));
        assertEquals(V24, BoiteNoire.lire(ecrit, null).version);
    }

    /** Version qui redemarre inconnue (construction sans version) ou temoin illisible : rien ne change. */
    @Test
    void sansPreuveRienNeChange() {
        Indices x = capitale(TEMOIN_SANS_VERSION);
        x.versionApres = "";
        assertEquals(Code.ARRET_FORCE, CauseArret.diagnostiquer(x).code);
        x = capitale(TEMOIN_SANS_VERSION);
        x.versionApres = null;
        assertEquals(Code.ARRET_FORCE, CauseArret.diagnostiquer(x).code);
        x = capitale("");
        assertEquals(Code.ARRET_FORCE, CauseArret.diagnostiquer(x).code);
    }

    /** Un indice fort garde la main, comme pour N6. */
    @Test
    void lesIndicesFortsGardentLaMain() {
        Indices x = capitale(TEMOIN_SANS_VERSION);
        x.rapportJvm = true;
        assertEquals(Code.PLANTAGE_JVM, CauseArret.diagnostiquer(x).code);
        x = capitale(TEMOIN_DATE);
        x.windows.add(new EvenementWindows(41, "Microsoft-Windows-Kernel-Power", SIGNE.plusMinutes(1), ""));
        x.windows.add(new EvenementWindows(12, "Microsoft-Windows-Kernel-General", SIGNE.plusMinutes(1), ""));
        assertEquals(Code.COUPURE_COURANT, CauseArret.diagnostiquer(x).code);
    }

    /**
     * 20 000 jeux d'indices tires au hasard (graine fixe). Avec un temoin sans version et une version connue au
     * redemarrage : MISE_A_JOUR si et seulement si la cause sans version etait remplacable, sinon la meme. Sans le
     * temoin sans version, ou sans version au redemarrage : exactement le diagnostic d'avant.
     */
    @Test
    void indicesAuHasard() {
        Random r = new Random(20261126L);
        int misesAJour = 0, gardees = 0;
        for (int i = 0; i < 20_000; i++) {
            long graine = r.nextLong();
            Code avant = CauseArret.diagnostiquer(tirer(new Random(graine), false, null)).code;
            assertEquals(avant, CauseArret.diagnostiquer(tirer(new Random(graine), false, V24)).code, "cas " + i);
            assertEquals(avant, CauseArret.diagnostiquer(tirer(new Random(graine), true, "")).code, "cas " + i);
            CauseArret.Diagnostic d = CauseArret.diagnostiquer(tirer(new Random(graine), true, V24));
            if (REMPLACABLES.contains(avant)) {
                assertEquals(Code.MISE_A_JOUR, d.code, "cas " + i + " : " + avant);
                misesAJour++;
            } else {
                assertEquals(avant, d.code, "cas " + i);
                assertNotEquals(Code.MISE_A_JOUR, avant);
                gardees++;
            }
            assertTrue(d.explication != null && !d.explication.isEmpty() && d.conseil != null);
        }
        assertTrue(misesAJour > 2_000 && gardees > 2_000, misesAJour + " / " + gardees);
    }

    private static Indices tirer(Random r, boolean temoinSansVersion, String apres) {
        Indices x = new Indices();
        x.dernierSigne = SIGNE;
        x.redemarrage = REDEMARRAGE;
        x.temoinSansVersion = temoinSansVersion;
        x.versionApres = apres;
        x.rapportJvm = r.nextInt(12) == 0;
        x.vidageMemoire = r.nextInt(15) == 0;
        x.mariadbRedemarree = r.nextInt(6) == 0;
        x.memoirePct = r.nextInt(5) == 0 ? 90 + r.nextInt(11) : r.nextInt(90);
        x.disqueLibreMo = r.nextInt(10) == 0 ? r.nextInt(300) : 300 + r.nextInt(200_000);
        String[] logs = { "", "", "", "java.lang.OutOfMemoryError: Metaspace", "Too many connections",
                "No space left on device", "INFO demarrage" };
        x.extraitLog = logs[r.nextInt(logs.length)];
        int[] ids = { 41, 6008, 1074, 6006, 7031, 7034, 6005, 12, 9999 };
        String[] donnees = { "", "Payara Server domain1", "MariaDB", "TrustedInstaller.exe", "explorer.exe" };
        for (int k = r.nextInt(4); k > 0; k--) {
            int id = ids[r.nextInt(ids.length)];
            x.windows.add(new EvenementWindows(id, id == 12 ? "Microsoft-Windows-Kernel-General" : "X",
                    SIGNE.plusMinutes(r.nextInt(12) - 4), donnees[r.nextInt(donnees.length)]));
        }
        return x;
    }
}
