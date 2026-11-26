package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Journal support du 26/11 (capitale), J26-3 : « Job planifie en retard : Archivage PDF de la valorisation (aucun
 * passage trouve (le job n'a peut-etre jamais tourne)) », ecrit le 25/11 a 00:10 sans version. Ce texte a disparu du
 * code le 14/10, et la colonne version_app est remplie par toute version posterieure au 28/10 : un Payara branche sur
 * la base tournait encore avec un WAR d'avant le 14/10, et rien ne le disait. L'auto-diagnostic doit lever une ANOMALIE
 * « Version des postes » des qu'un evenement recent a ete ecrit sans version (hors maintenance).
 * <p>
 * Test de COHERENCE sur 5 000 journaux tires au hasard (graine fixe). Regles : anomalie si et seulement si au moins un
 * evenement de moins de 48 h, hors maintenance, est sans version, et que ce poste connait sa propre version ; le nombre
 * annonce est celui de ces evenements ; la date annoncee est celle du plus ancien ; un evenement plus vieux, d'une
 * maintenance ou porteur d'une version n'est jamais compte.
 * </p>
 */
class VersionPostesPreflightTest {

    private static final LocalDateTime MAINTENANT = LocalDateTime.of(2026, 11, 26, 1, 22);
    private static final String VERSION = "2026-11-24 02:30 UTC";

    private static SupportPreflight.EvenementSansVersion ev(LocalDateTime quand, String url, String message,
            String version) {
        return new SupportPreflight.EvenementSansVersion(quand, url, message, version);
    }

    @Test
    @DisplayName("Le journal du 26/11 rejoue : l'alerte de job sans version est une anomalie, la purge ne l'est pas")
    void journalDu26() {
        List<SupportPreflight.EvenementSansVersion> l = new ArrayList<>();
        l.add(ev(LocalDateTime.of(2026, 11, 25, 0, 10), "serveur:job-VALORISATION_PDF-2026-11-25",
                "Job planifie en retard : Archivage PDF de la valorisation", null));
        l.add(ev(LocalDateTime.of(2026, 11, 24, 23, 57), "maintenance:PURGE_EVENEMENTS", "Purge manuelle du journal",
                null));
        l.add(ev(LocalDateTime.of(2026, 11, 25, 9, 30), "serveur:memoire-CAISSE5-2026-11-25", "Memoire JVM elevee",
                VERSION));
        SupportPreflight.Controle c = SupportPreflight.evaluerVersionsPostes(VERSION, l, MAINTENANT);
        assertFalse(c.ok, c.detail);
        assertEquals("VERSION_POSTES", c.code);
        assertTrue(c.detail.startsWith("1 evenement(s)"), c.detail);
        assertTrue(c.detail.contains("25/11/2026 00:10"), c.detail);
        assertTrue(c.detail.contains("Archivage PDF"), c.detail);
        assertTrue(c.detail.contains(VERSION), c.detail);

        l.remove(0);
        SupportPreflight.Controle sansAncien = SupportPreflight.evaluerVersionsPostes(VERSION, l, MAINTENANT);
        assertTrue(sansAncien.ok, "la purge seule ne vient pas d'un ancien WAR : " + sansAncien.detail);
    }

    @Test
    @DisplayName("Version de ce poste inconnue : rien a comparer, jamais d'anomalie")
    void versionLocaleInconnue() {
        List<SupportPreflight.EvenementSansVersion> l = new ArrayList<>();
        l.add(ev(MAINTENANT.minusHours(1), "serveur:x", "x", null));
        assertTrue(SupportPreflight.evaluerVersionsPostes("", l, MAINTENANT).ok);
        assertTrue(SupportPreflight.evaluerVersionsPostes(null, l, MAINTENANT).ok);
        assertTrue(SupportPreflight.evaluerVersionsPostes(VERSION, null, MAINTENANT).ok);
    }

    @Test
    @DisplayName("5 000 journaux au hasard : compte, date du plus ancien, fenetre de 48 h, maintenance et versions exclues")
    void journauxAuHasard() {
        Random h = new Random(20261126L);
        String[] urls = { "serveur:job-X", "maintenance:PURGE_EVENEMENTS", "controle:LOT", "/prestige/api/v1/vente",
                "maintenance:AUTRE" };
        String[] versions = { null, "", "  ", VERSION, "2026-11-16 03:45 UTC" };
        for (int i = 0; i < 5_000; i++) {
            List<SupportPreflight.EvenementSansVersion> l = new ArrayList<>();
            int n = h.nextInt(12);
            int attendus = 0;
            LocalDateTime plusAncien = null;
            for (int k = 0; k < n; k++) {
                // de 4 jours avant a 1 heure apres (horloge d'un poste en avance)
                LocalDateTime quand = MAINTENANT.minusMinutes(h.nextInt(4 * 24 * 60)).plusMinutes(h.nextInt(60));
                String url = urls[h.nextInt(urls.length)];
                String version = versions[h.nextInt(versions.length)];
                l.add(ev(quand, url, "message " + k, version));
                boolean compte = !quand.isBefore(MAINTENANT.minusHours(48)) && !url.startsWith("maintenance:")
                        && (version == null || version.trim().isEmpty());
                if (compte) {
                    attendus++;
                    plusAncien = plusAncien == null || quand.isBefore(plusAncien) ? quand : plusAncien;
                }
            }
            String locale = i % 10 == 0 ? "" : VERSION;
            SupportPreflight.Controle c = SupportPreflight.evaluerVersionsPostes(locale, l, MAINTENANT);
            boolean attendue = attendus > 0 && !locale.isEmpty();
            assertEquals(attendue, !c.ok, "journal " + i + " : " + c.detail);
            if (attendue) {
                assertTrue(c.detail.startsWith(attendus + " evenement(s)"), "journal " + i + " : " + c.detail);
                assertTrue(c.detail.contains(plusAncien.format(SupportPreflight.FORMAT_VERSION_POSTES)),
                        "journal " + i + " : " + c.detail);
            }
        }
    }
}
