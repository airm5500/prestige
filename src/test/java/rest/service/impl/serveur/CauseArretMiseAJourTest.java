package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.CauseArret.Code;
import rest.service.impl.serveur.CauseArret.EvenementWindows;
import rest.service.impl.serveur.CauseArret.Indices;

/**
 * Journal d'appaul du 21/11 (N6) : les redemarrages de la mise a jour du matin (07:04-07:19) ont produit 7 alertes WARN
 * « Arret brutal du serveur : Arret force, sans erreur visible », une par poste. La version de Prestige notee au
 * dernier battement (fichier temoin) et celle qui redemarre different : c'est une mise a jour, pas une panne.
 *
 * Regle : quand les deux versions sont connues et differentes, et qu'aucun indice plus fort (plantage de Java, memoire,
 * disque, machine arretee ou redemarree) n'explique l'arret, la cause est MISE_A_JOUR, de niveau INFO (historique du
 * serveur, sans incident). Sans changement de version, le diagnostic est exactement celui d'avant.
 */
class CauseArretMiseAJourTest {

    private static final LocalDateTime SIGNE = LocalDateTime.of(2026, 11, 21, 7, 6);
    private static final LocalDateTime REDEMARRAGE = LocalDateTime.of(2026, 11, 21, 7, 12);
    private static final String V16 = "2026-11-16 03:45 UTC", V21 = "2026-11-21 06:14 UTC";

    /** Causes qu'un changement de version remplace : aucune ne prouve une panne quand un operateur a mis a jour. */
    private static final Set<Code> REMPLACABLES = EnumSet.of(Code.ARRET_SERVICE, Code.MEMOIRE_PROBABLE,
            Code.BASE_SATUREE, Code.MARIADB_ARRETEE, Code.ARRET_FORCE);

    private static Indices appaul() {
        Indices x = new Indices();
        x.dernierSigne = SIGNE;
        x.redemarrage = REDEMARRAGE;
        x.memoirePct = 41;
        x.disqueLibreMo = 120_000;
        return x;
    }

    /** Les postes d'appaul : rien dans le journal de Windows, aucune erreur, mais une nouvelle version. */
    @Test
    void miseAJourDuMatin() {
        Indices x = appaul();
        x.versionAvant = V16;
        x.versionApres = V21;
        CauseArret.Diagnostic d = CauseArret.diagnostiquer(x);
        assertEquals(Code.MISE_A_JOUR, d.code);
        assertEquals("INFO", d.code.niveau);
        assertTrue(d.explication.contains(V16) && d.explication.contains(V21), d.explication);
    }

    /** Meme version (DESKTOP-CEPK07B restait sur le 16/11) : toujours un arret force, l'alerte reste. */
    @Test
    void memeVersionResteUnArretForce() {
        Indices x = appaul();
        x.versionAvant = V16;
        x.versionApres = V16;
        assertEquals(Code.ARRET_FORCE, CauseArret.diagnostiquer(x).code);
    }

    /** Temoin ecrit par une version qui ne notait pas la sienne : on ne sait pas, rien ne change. */
    @Test
    void versionInconnueRienNeChange() {
        for (String[] v : new String[][] { { null, V21 }, { "", V21 }, { V16, null }, { V16, "" }, { null, null } }) {
            Indices x = appaul();
            x.versionAvant = v[0];
            x.versionApres = v[1];
            assertEquals(Code.ARRET_FORCE, CauseArret.diagnostiquer(x).code, v[0] + " -> " + v[1]);
        }
    }

    /** Une vraie panne reste une panne, meme si la version a change ensuite. */
    @Test
    void lesIndicesFortsGardentLaMain() {
        Indices x = appaul();
        x.versionAvant = V16;
        x.versionApres = V21;
        x.extraitLog = "java.lang.OutOfMemoryError: Java heap space";
        assertEquals(Code.MEMOIRE, CauseArret.diagnostiquer(x).code);
        x = appaul();
        x.versionAvant = V16;
        x.versionApres = V21;
        x.windows.add(new EvenementWindows(41, "Microsoft-Windows-Kernel-Power", SIGNE.plusMinutes(2), ""));
        x.windows.add(new EvenementWindows(12, "Microsoft-Windows-Kernel-General", SIGNE.plusMinutes(3), ""));
        assertEquals(Code.COUPURE_COURANT, CauseArret.diagnostiquer(x).code);
    }

    /**
     * 20 000 jeux d'indices tires au hasard (graine fixe) : avec des versions differentes, la cause est MISE_A_JOUR si
     * et seulement si, a versions egales, elle aurait ete une cause remplacable ; sinon elle est identique. A versions
     * egales ou inconnues, le diagnostic est celui sans version (aucune regression).
     */
    @Test
    void indicesAuHasard() {
        Random r = new Random(20261122L);
        int misesAJour = 0, gardees = 0;
        for (int i = 0; i < 20_000; i++) {
            long graine = r.nextLong();
            Code sansVersion = CauseArret.diagnostiquer(tirer(new Random(graine), null, null)).code;
            Code memeVersion = CauseArret.diagnostiquer(tirer(new Random(graine), V16, V16)).code;
            Code inconnue = CauseArret.diagnostiquer(tirer(new Random(graine), r.nextBoolean() ? null : "", V21)).code;
            CauseArret.Diagnostic autre = CauseArret.diagnostiquer(tirer(new Random(graine), V16, V21));
            assertEquals(sansVersion, memeVersion, "cas " + i);
            assertEquals(sansVersion, inconnue, "cas " + i);
            if (REMPLACABLES.contains(sansVersion)) {
                assertEquals(Code.MISE_A_JOUR, autre.code, "cas " + i + " : " + sansVersion);
                misesAJour++;
            } else {
                assertEquals(sansVersion, autre.code, "cas " + i);
                assertNotEquals(Code.MISE_A_JOUR, sansVersion);
                gardees++;
            }
            assertTrue(autre.explication != null && !autre.explication.isEmpty() && autre.conseil != null);
        }
        assertTrue(misesAJour > 2_000 && gardees > 2_000, misesAJour + " / " + gardees);
    }

    private static Indices tirer(Random r, String avant, String apres) {
        Indices x = new Indices();
        x.dernierSigne = SIGNE;
        x.redemarrage = REDEMARRAGE;
        x.versionAvant = avant;
        x.versionApres = apres;
        x.rapportJvm = r.nextInt(12) == 0;
        x.vidageMemoire = r.nextInt(15) == 0;
        x.mariadbRedemarree = r.nextInt(6) == 0;
        x.memoirePct = r.nextInt(5) == 0 ? 90 + r.nextInt(11) : r.nextInt(90);
        x.disqueLibreMo = r.nextInt(10) == 0 ? r.nextInt(300) : 300 + r.nextInt(200_000);
        String[] logs = { "", "", "", "java.lang.OutOfMemoryError: Metaspace", "Too many connections",
                "-XX:+HeapDumpOnOutOfMemoryError", "No space left on device", "INFO demarrage" };
        x.extraitLog = logs[r.nextInt(logs.length)];
        List<EvenementWindows> w = new ArrayList<>();
        int[] ids = { 41, 6008, 1074, 6006, 7031, 7034, 6005, 12, 9999 };
        String[] donnees = { "", "Payara Server domain1", "MariaDB", "C:\\Windows\\system32\\TrustedInstaller.exe",
                "explorer.exe" };
        for (int k = r.nextInt(4); k > 0; k--) {
            int id = ids[r.nextInt(ids.length)];
            w.add(new EvenementWindows(id, id == 12 ? "Microsoft-Windows-Kernel-General" : "X",
                    SIGNE.plusMinutes(r.nextInt(12) - 4), donnees[r.nextInt(donnees.length)]));
        }
        x.windows = w;
        return x;
    }
}
