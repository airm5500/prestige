package rest.service.impl.campagne;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 6 : etat d'un message de campagne et totaux (journal, indicateur « Envoi », suivi), WhatsApp
 * comme SMS. Regles verifiees sur des milliers de campagnes tirees au hasard (graine fixe) :
 * <ul>
 * <li>chaque ligne a un et un seul etat ; envoyes + echecs + en attente + exclus = nombre de lignes ;</li>
 * <li>lus &lt;= distribues &lt;= envoyes ; exclus = lignes non retenues ; repondus = lignes repondues ;</li>
 * <li>un SMS « DELIVERED_TO_TERMINAL » est distribue (avant : jamais compte au journal) ; un WhatsApp envoye compte
 * dans les envoyes (avant : « Partis » ne comptait que les SMS).</li>
 * </ul>
 */
class IndicateurEnvoiCoherenceTest {

    private static final String[] WSTATUTS = { "", "", "LU", "DELIVRE", "ENVOYE", "SIMULE", "ECHEC", "EN_ATTENTE" };
    private static final String[] NCSTATUTS = { "", "", "SENT", "FAILED", "PENDING" };
    private static final String[] LIVRAISONS = { "", "DELIVERED_TO_TERMINAL", "DELIVERY_IMPOSSIBLE",
            "MESSAGE_WAITING" };

    @Test
    void totauxParLeursRegles() {
        Random h = new Random(6_0811L);
        for (int cas = 0; cas < 5000; cas++) {
            CampagneService.Totaux t = new CampagneService.Totaux();
            int n = h.nextInt(40), nonRetenus = 0, repondus = 0, lus = 0, distribues = 0, envoyes = 0, echecs = 0;
            for (int i = 0; i < n; i++) {
                boolean retenu = h.nextInt(8) != 0, sms = h.nextBoolean();
                String w = sms ? "" : WSTATUTS[h.nextInt(WSTATUTS.length)];
                String nc = NCSTATUTS[h.nextInt(NCSTATUTS.length)], liv = LIVRAISONS[h.nextInt(LIVRAISONS.length)];
                boolean repondu = !sms && h.nextInt(5) == 0;
                String etat = CampagneService.etatMessage(retenu, w, nc, liv);
                t.compter(etat, repondu);
                nonRetenus += retenu ? 0 : 1;
                repondus += repondu ? 1 : 0;
                /* attendu, ligne par ligne */
                if (retenu) {
                    if ("ECHEC".equals(w)) {
                        echecs++;
                    } else if ("LU".equals(w)) {
                        lus++;
                        distribues++;
                        envoyes++;
                    } else if ("DELIVRE".equals(w) || (w.isEmpty() && "DELIVERED_TO_TERMINAL".equals(liv))) {
                        distribues++;
                        envoyes++;
                    } else if ("ENVOYE".equals(w) || "SIMULE".equals(w) || "SENT".equals(nc)) {
                        envoyes++;
                    }
                }
            }
            assertEquals(n, t.envoyes + t.echecs + t.attente + t.exclus, "cas " + cas + " : un etat par ligne");
            assertTrue(t.lus <= t.distribues && t.distribues <= t.envoyes, "cas " + cas);
            assertEquals(nonRetenus, t.exclus, "cas " + cas);
            assertEquals(repondus, t.repondus, "cas " + cas);
            assertEquals(lus, t.lus, "cas " + cas);
            assertEquals(distribues, t.distribues, "cas " + cas);
            assertEquals(envoyes, t.envoyes, "cas " + cas);
            assertEquals(echecs, t.echecs, "cas " + cas);
        }
    }

    @Test
    void casDuSmsEtDuWhatsApp() {
        assertEquals("Distribué", CampagneService.etatMessage(true, "", "SENT", "DELIVERED_TO_TERMINAL"),
                "SMS distribue");
        assertEquals("Envoyé", CampagneService.etatMessage(true, "", "SENT", ""), "SMS parti");
        assertEquals("En attente", CampagneService.etatMessage(true, "", "", ""), "SMS pas encore parti");
        assertEquals("Envoyé", CampagneService.etatMessage(true, "ENVOYE", "", ""), "WhatsApp parti");
        assertEquals("Lu", CampagneService.etatMessage(true, "LU", "", ""));
        assertEquals("Échec", CampagneService.etatMessage(true, "ECHEC", "SENT", "DELIVERED_TO_TERMINAL"));
        assertEquals("Exclu", CampagneService.etatMessage(false, "LU", "SENT", "DELIVERED_TO_TERMINAL"));
        assertEquals("En attente", CampagneService.etatMessage(true, null, null, null), "valeurs absentes");
    }
}
