package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 14 : les accuses de Meta (sent, delivered, read, failed) arrivent dans le desordre ; le statut
 * d'un message ne recule jamais (ENVOYE < ECHEC < DELIVRE < LU). Regles verifiees :
 * <ul>
 * <li>la condition SQL et le rang Java donnent le meme ordre, statut par statut ;</li>
 * <li>sur 5 000 suites d'accuses tirees au hasard (graine fixe), le statut ne descend jamais et finit au plus avance
 * des statuts recus (ou a l'etat de depart s'il est plus avance) ;</li>
 * <li>un accuse inconnu ne change rien.</li>
 * </ul>
 */
class StatutWhatsAppOrdreTest {

    private static final String[] META = { "sent", "delivered", "read", "failed", "deleted", "" };
    private static final String[] DEPART = { "SIMULE", "ENVOYE", "DELIVRE", "LU", "ECHEC", null };

    /** Ce que fait la base : mise a jour seulement si le nouveau statut est plus avance. */
    private static String appliquer(String actuel, String nouveau) {
        if (nouveau == null) {
            return actuel;
        }
        return WhatsAppServiceImpl.rangStatut(actuel) < WhatsAppServiceImpl.rangStatut(nouveau) ? nouveau : actuel;
    }

    @Test
    void conditionSqlEtRangJavaOntLeMemeOrdre() {
        String sql = WhatsAppServiceImpl.rangSql("statut");
        Matcher m = Pattern.compile("WHEN '([A-Z]+)' THEN (\\d+)").matcher(sql);
        int vus = 0;
        while (m.find()) {
            assertEquals(WhatsAppServiceImpl.rangStatut(m.group(1)), Integer.parseInt(m.group(2)), m.group(1));
            vus++;
        }
        assertEquals(4, vus, sql);
        assertTrue(sql.endsWith("ELSE 0 END"), sql);
        assertEquals("(" + WhatsAppServiceImpl.rangSql("statut") + ") < (" + WhatsAppServiceImpl.rangSql("?1") + ")",
                WhatsAppServiceImpl.avanceSql("statut", "?1"));
        assertTrue(WhatsAppServiceImpl.rangStatut("ENVOYE") < WhatsAppServiceImpl.rangStatut("ECHEC"));
        assertTrue(WhatsAppServiceImpl.rangStatut("ECHEC") < WhatsAppServiceImpl.rangStatut("DELIVRE"));
        assertTrue(WhatsAppServiceImpl.rangStatut("DELIVRE") < WhatsAppServiceImpl.rangStatut("LU"));
        assertEquals(0, WhatsAppServiceImpl.rangStatut("SIMULE"));
        assertEquals(0, WhatsAppServiceImpl.rangStatut(null));
    }

    @Test
    void unStatutNeReculeJamais() {
        Random r = new Random(20261110L);
        for (int cas = 0; cas < 5000; cas++) {
            String depart = DEPART[r.nextInt(DEPART.length)];
            String actuel = depart;
            int plusAvance = WhatsAppServiceImpl.rangStatut(depart);
            String attendu = depart;
            int n = 1 + r.nextInt(8);
            StringBuilder suite = new StringBuilder(String.valueOf(depart));
            for (int i = 0; i < n; i++) {
                String nouveau = WhatsAppServiceImpl.statutJournal(META[r.nextInt(META.length)]);
                suite.append(" > ").append(nouveau);
                int avant = WhatsAppServiceImpl.rangStatut(actuel);
                actuel = appliquer(actuel, nouveau);
                assertTrue(WhatsAppServiceImpl.rangStatut(actuel) >= avant, "recul : " + suite);
                if (nouveau != null && WhatsAppServiceImpl.rangStatut(nouveau) > plusAvance) {
                    plusAvance = WhatsAppServiceImpl.rangStatut(nouveau);
                    attendu = nouveau;
                }
            }
            assertEquals(attendu, actuel, "fin : " + suite);
        }
    }

    @Test
    void casDuJournal() {
        assertEquals("LU", appliquer("LU", WhatsAppServiceImpl.statutJournal("sent")));
        assertEquals("DELIVRE", appliquer("DELIVRE", WhatsAppServiceImpl.statutJournal("sent")));
        assertEquals("DELIVRE", appliquer("ENVOYE", WhatsAppServiceImpl.statutJournal("delivered")));
        assertEquals("LU", appliquer(appliquer("ENVOYE", "LU"), WhatsAppServiceImpl.statutJournal("delivered")));
        assertEquals("ENVOYE", appliquer("SIMULE", WhatsAppServiceImpl.statutJournal("sent")));
        assertEquals("LU", appliquer("LU", WhatsAppServiceImpl.statutJournal("failed")));
        assertEquals("LU", appliquer("LU", WhatsAppServiceImpl.statutJournal("deleted")));
    }
}
