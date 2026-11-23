package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Retours du 22/11 (lot 10, points 1 et 3) : regles de l'envoi des messages d'avoir d'un bon (a la main, a la fermeture
 * de la fenetre) et du renvoi d'un echec depuis le journal, verifiees sur des milliers de cas tires au hasard (graine
 * fixe).
 */
class AvoirsEnvoiCoherenceTest {

    private static final String[] PARAMETRES = { "SMS", "WHATSAPP", "SMS_WHATSAPP", null, "", "pigeon", "whatsapp" };

    /** Un message d'avoir simule : deja parti (avant la fenetre), decide (ligne avoir_envoi), envois effectifs. */
    private static final class Message {
        boolean parti;
        String decideCanal;
        String decideMode;
        int envois;
    }

    /** Meme algorithme que AvoirsEnvoiService.envoyer, sur une base simulee. */
    private static int envoyer(List<Message> messages, boolean manuel, String choisi, String parametre,
            boolean immediat) {
        String canal = AvoirsEnvoiService.canalEffectif(manuel, choisi, parametre, immediat);
        if (canal == null) {
            return -1;
        }
        int n = 0;
        for (Message m : messages) {
            if (AvoirsEnvoiService.aEnvoyer(m.parti, m.decideCanal != null)) {
                m.decideCanal = canal;
                m.decideMode = manuel ? AvoirsEnvoiService.MANUEL : AvoirsEnvoiService.AUTO;
                m.envois++;
                n++;
            }
        }
        return n;
    }

    @Test
    void canalEffectifSelonLeModeLeChoixEtLeParametre() {
        assertEquals("SMS", AvoirsEnvoiService.canalEffectif(true, "sms", "WHATSAPP", false));
        assertEquals("WHATSAPP", AvoirsEnvoiService.canalEffectif(true, "WhatsApp", "SMS", false));
        assertNull(AvoirsEnvoiService.canalEffectif(true, "SMS_WHATSAPP", "SMS", true));
        assertNull(AvoirsEnvoiService.canalEffectif(true, "", "SMS", true));
        assertEquals("WHATSAPP", AvoirsEnvoiService.canalEffectif(false, "SMS", "WHATSAPP", false));
        assertEquals("SMS_WHATSAPP", AvoirsEnvoiService.canalEffectif(false, null, "SMS_WHATSAPP", false));
        assertEquals("SMS", AvoirsEnvoiService.canalEffectif(false, null, "SMS", true));
        assertNull(AvoirsEnvoiService.canalEffectif(false, null, "SMS", false));
        assertEquals("SMS", AvoirsEnvoiService.canalEffectif(false, null, "pigeon", true));
        assertNull(AvoirsEnvoiService.canalEffectif(false, null, null, false));
    }

    @Test
    void unMessageNePartQuUneFoisEtLeChoixDeLUtilisateurPrimeSurLaFermeture() {
        Random r = new Random(20261122L);
        for (int cas = 0; cas < 5000; cas++) {
            int nb = r.nextInt(6);
            List<Message> messages = new ArrayList<>();
            for (int i = 0; i < nb; i++) {
                Message m = new Message();
                m.parti = r.nextInt(4) == 0;
                messages.add(m);
            }
            int partisAvant = (int) messages.stream().filter(m -> m.parti).count();
            String parametre = PARAMETRES[r.nextInt(PARAMETRES.length)];
            boolean immediat = r.nextBoolean();
            /* 0 a 3 envois a la main (canal au hasard, parfois invalide), puis la fermeture */
            int manuels = r.nextInt(4);
            String premierCanal = null;
            int envoyes = 0;
            for (int k = 0; k < manuels; k++) {
                String choix = r.nextInt(5) == 0 ? "FAX" : r.nextBoolean() ? "SMS" : "WHATSAPP";
                int n = envoyer(messages, true, choix, parametre, immediat);
                if ("FAX".equals(choix)) {
                    assertEquals(-1, n, "canal invalide refuse, rien d'envoye");
                    continue;
                }
                if (premierCanal == null) {
                    premierCanal = choix;
                    assertEquals(nb - partisAvant, n, "le premier envoi a la main envoie tout ce qui n'est pas parti");
                } else {
                    assertEquals(0, n, "un second envoi a la main ne renvoie rien");
                }
                envoyes += n;
            }
            int auto = envoyer(messages, false, null, parametre, immediat);
            String canalFermeture = AvoirsEnvoiService.canalEffectif(false, null, parametre, immediat);
            if (canalFermeture == null) {
                assertEquals(-1, auto, "SMS sans envoi immediat : laisse au passage planifie, comme avant");
                assertTrue("SMS".equals(AvoirMessage.canal(parametre)) && !immediat);
            } else if (premierCanal != null) {
                assertEquals(0, auto, "deja envoye a la main : rien a la fermeture");
            } else {
                assertEquals(nb - partisAvant, auto, "a la fermeture : tout ce qui n'est pas parti");
                envoyes += auto;
            }
            /* invariants : chaque message au plus une fois ; partis + envoyes (+ laisses au passage) = total */
            int laisses = 0;
            for (Message m : messages) {
                assertTrue(m.envois <= 1, "jamais deux envois du meme message");
                if (m.parti) {
                    assertEquals(0, m.envois, "un message deja parti n'est pas renvoye");
                    assertNull(m.decideCanal);
                } else if (m.envois == 0) {
                    laisses++;
                    assertNull(m.decideCanal);
                } else if (premierCanal != null) {
                    assertEquals(premierCanal, m.decideCanal, "canal choisi par l'utilisateur");
                    assertEquals(AvoirsEnvoiService.MANUEL, m.decideMode);
                } else {
                    assertEquals(canalFermeture, m.decideCanal, "canal par defaut a la fermeture");
                    assertEquals(AvoirsEnvoiService.AUTO, m.decideMode);
                    assertFalse("SMS".equals(m.decideCanal) && !immediat);
                }
            }
            assertEquals(nb, partisAvant + envoyes + laisses, "partis + envoyes + laisses = total");
            if (laisses > 0) {
                assertTrue(premierCanal == null && canalFermeture == null);
            }
        }
    }

    @Test
    void seuleUneLigneDUnClientEnEchecSeRenvoie() {
        Random r = new Random(20261122L);
        String[] prefixes = { "W", "S", "A", "", "X", "w" };
        String[] etats = { AvoirMessage.ECHEC, AvoirMessage.ENVOYE, AvoirMessage.DISTRIBUE, AvoirMessage.LU,
                AvoirMessage.EN_ATTENTE, null };
        int oui = 0;
        for (int cas = 0; cas < 5000; cas++) {
            String p = prefixes[r.nextInt(prefixes.length)];
            String id = p + (r.nextInt(3) == 0 ? "" : Integer.toHexString(r.nextInt()));
            String etat = etats[r.nextInt(etats.length)];
            boolean attendu = ("W".equals(p) || "S".equals(p)) && id.length() > 1 && AvoirMessage.ECHEC.equals(etat);
            assertEquals(attendu, JournalRenvoiService.renvoyable(id, etat), id + " / " + etat);
            oui += attendu ? 1 : 0;
        }
        assertTrue(oui > 100, "jeu varie : assez de lignes renvoyables");
        assertFalse(JournalRenvoiService.renvoyable(null, AvoirMessage.ECHEC));
    }
}
