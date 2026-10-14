package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.CauseArret.Code;
import rest.service.impl.serveur.CauseArret.EvenementWindows;
import rest.service.impl.serveur.CauseArret.Indices;

class CauseArretTest {

    private static final LocalDateTime SIGNE = LocalDateTime.of(2026, 10, 14, 9, 30);
    private static final LocalDateTime REDEMARRAGE = LocalDateTime.of(2026, 10, 14, 9, 52);

    private static Indices indices() {
        Indices x = new Indices();
        x.dernierSigne = SIGNE;
        x.redemarrage = REDEMARRAGE;
        return x;
    }

    private static EvenementWindows ev(int id, String source, int minute, String donnees) {
        return new EvenementWindows(id, source, LocalDateTime.of(2026, 10, 14, 9, minute), donnees);
    }

    /** Sortie de « wevtutil qe System /f:xml » (Windows en francais : le XML, lui, n'est pas traduit). */
    static final String WEVTUTIL = "<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'><System>"
            + "<Provider Name='Microsoft-Windows-Kernel-Power' Guid='{331c}'/><EventID>41</EventID><Level>1</Level>"
            + "<TimeCreated SystemTime='2026-10-14T09:41:12.5000000Z'/></System><EventData><Data Name='BugcheckCode'>0</Data>"
            + "</EventData></Event><Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'><System>"
            + "<Provider Name='Microsoft-Windows-Kernel-General' Guid='{a68c}'/><EventID>12</EventID>"
            + "<TimeCreated SystemTime='2026-10-14T09:40:58.1234567Z'/></System><EventData><Data Name='MajorVersion'>10</Data>"
            + "</EventData></Event><Event><System><Provider Name='Service Control Manager'/><EventID Qualifiers='49152'>7034</EventID>"
            + "<TimeCreated SystemTime='2026-10-13T18:00:00.000Z'/></System><EventData><Data Name='param1'>Payara Server domain1</Data>"
            + "<Data Name='param2'>1</Data></EventData></Event>";

    @Test
    void lectureDuJournalWindows() {
        List<EvenementWindows> l = CauseArret.lireWevtutil(WEVTUTIL, ZoneId.of("UTC"));
        assertEquals(3, l.size());
        assertEquals(41, l.get(0).id);
        assertEquals("Microsoft-Windows-Kernel-Power", l.get(0).source);
        assertEquals(LocalDateTime.of(2026, 10, 14, 9, 41, 12, 500_000_000), l.get(0).quand);
        assertEquals(LocalDateTime.of(2026, 10, 14, 9, 40, 58, 123_000_000), l.get(1).quand);
        assertTrue(l.get(2).donnees.contains("Payara Server domain1"));
    }

    @Test
    void coupureDeCourant() {
        Indices x = indices();
        x.windows = CauseArret.lireWevtutil(WEVTUTIL, ZoneId.of("UTC"));
        CauseArret.Diagnostic d = CauseArret.diagnostiquer(x);
        assertEquals(Code.COUPURE_COURANT, d.code);
        assertEquals(LocalDateTime.of(2026, 10, 14, 9, 40, 58, 123_000_000), d.demarrageWindows);
        assertTrue(d.conseil.contains("onduleur"));
    }

    @Test
    void redemarragePourMisesAJour() {
        Indices x = indices();
        x.windows.add(ev(1074, "User32", 35, "TrustedInstaller.exe"));
        x.windows.add(ev(6005, "EventLog", 38, ""));
        assertEquals(Code.REDEMARRAGE_WINDOWS, CauseArret.diagnostiquer(x).code);
    }

    @Test
    void memoireEpuiseePrimeSurLeRedemarrage() {
        Indices x = indices();
        x.extraitLog = "[2026-10-14T09:29:58.123+0000] [Payara] [SEVERE] java.lang.OutOfMemoryError: Java heap space";
        x.windows.add(ev(6005, "EventLog", 38, ""));
        assertEquals(Code.MEMOIRE, CauseArret.diagnostiquer(x).code);
        x.rapportJvm = true;
        assertEquals(Code.PLANTAGE_JVM, CauseArret.diagnostiquer(x).code);
    }

    @Test
    void serviceArreteMachineToujoursAllumee() {
        Indices x = indices();
        x.windows.add(ev(7034, "Service Control Manager", 31, "Payara Server domain1 1"));
        assertEquals(Code.ARRET_SERVICE, CauseArret.diagnostiquer(x).code);
        /* un evenement d'un autre jour ne compte pas */
        Indices y = indices();
        y.windows = CauseArret.lireWevtutil(WEVTUTIL, ZoneId.of("UTC")).subList(2, 3);
        assertEquals(Code.ARRET_FORCE, CauseArret.diagnostiquer(y).code);
    }

    @Test
    void autresCauses() {
        Indices x = indices();
        x.memoirePct = 96;
        assertEquals(Code.MEMOIRE_PROBABLE, CauseArret.diagnostiquer(x).code);
        x = indices();
        x.disqueLibreMo = 120;
        assertEquals(Code.DISQUE_PLEIN, CauseArret.diagnostiquer(x).code);
        x = indices();
        x.extraitLog = "Too many connections";
        assertEquals(Code.BASE_SATUREE, CauseArret.diagnostiquer(x).code);
        x = indices();
        x.mariadbRedemarree = true;
        assertEquals(Code.MARIADB_ARRETEE, CauseArret.diagnostiquer(x).code);
        assertEquals(Code.ARRET_FORCE, CauseArret.diagnostiquer(indices()).code);
    }

    @Test
    void extraitDeLaSessionTombee() {
        String journal = "[2026-10-14T09:20:00.000+0000] [Payara] [INFO] avant\n"
                + "[2026-10-14T09:29:58.000+0000] [Payara] [SEVERE] java.lang.OutOfMemoryError\n"
                + "\tat com.exemple.Classe(Classe.java:1)\n"
                + "[2026-10-14T09:52:10.000+0000] [Payara] [INFO] redemarrage\n";
        String e = CauseArret.extrait(journal, SIGNE.minusMinutes(5), REDEMARRAGE);
        assertTrue(e.contains("OutOfMemoryError") && e.contains("Classe.java:1"), e);
        assertFalse(e.contains("avant") || e.contains("redemarrage"), e);
    }
}
